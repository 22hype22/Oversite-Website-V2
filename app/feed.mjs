// One live feed per community: polls that community's ER:LC server as fast as its rate limit allows and fans each answer out
// to every open dashboard of that community over server-sent events. A feed only runs while someone is watching.
const UPSTREAM = process.env.ERLC_UPSTREAM || 'https://api.erlc.gg';
const QUERY = '/v2/server?Players=true&Vehicles=true&EmergencyCalls=true&JoinLogs=true';
const QUERY_FAST = '/v2/server?Players=true&Vehicles=true&EmergencyCalls=true';   // join logs only change on joins: fetched every 20th request and reused
const IDLE_STOP = 30000, FLOOR = +(process.env.FEED_FLOOR_MS || 250);
const RL = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'retry-after'];
const pickRL = h => { const out = {}; for (const k of RL) if (h.get(k)) out[k] = h.get(k); return out; };
export const NOKEY = '{"code":2000,"message":"This community has not connected its ER:LC server yet. An admin can add the server key in Settings."}';

export class Feed {
  constructor(id, getKey) { Object.assign(this, { id, getKey, snap: null, clients: new Set(), timer: null, inflight: 0, lastClient: 0, nextAt: 0, seq: 0, shown: 0, rl: null, rlSeq: 0,
    holdUntil: 0, penaltyUntil: 0, n: 0, joins: null, sent: [], n429: 0, reverts: 0, hist: new Map(), track: new Map(), pending: new Map(), lastAt: new Map() }); this.key = getKey(); }
  bcast(ev, data, id) { const msg = `event: ${ev}\n${id ? `id: ${id}\n` : ''}data: ${data}\n\n`; for (const c of this.clients) c.write(msg); }
  // time between requests: spread what the rate limit has left evenly until it resets, keep a reserve, count requests still in flight
  pace() { let g = 700; const h = this.rl, keep = Date.now() < this.penaltyUntil ? 10 : 4;
    if (h && Number.isFinite(h.left) && Number.isFinite(h.reset) && h.reset > 0) { const left = h.left - this.inflight, win = Math.max(0, (h.reset > 1e12 ? h.reset : h.reset * 1000) - Date.now()) + (left <= keep ? 1200 : 300); g = left <= keep ? win : win / (left - keep); }
    return Math.min(15000, Math.max(FLOOR, g)); }
  takeRL(headers, seq) { if (seq < this.rlSeq) return; this.rlSeq = seq; this.rl = { left: +headers['x-ratelimit-remaining'], reset: +headers['x-ratelimit-reset'] }; }
  setKey(k) { this.key = k; this.snap = null; this.joins = null; this.hist.clear(); this.nextAt = 0; this.holdUntil = 0; if (this.clients.size) this.wake(); }
  wake() { if (!this.timer) this.timer = setTimeout(() => this.tick(), Math.max(0, this.nextAt - Date.now())); }
  async tick() {
    this.timer = null; const now = Date.now();
    if (!this.clients.size && now - this.lastClient > IDLE_STOP) return;
    if (!this.key) { this.bcast('err', NOKEY); this.timer = setTimeout(() => this.tick(), 5000); return; }
    if (now < this.holdUntil) { this.timer = setTimeout(() => this.tick(), this.holdUntil - now); return; }
    if (this.inflight >= 2) { this.timer = setTimeout(() => this.tick(), 40); return; }
    const seq = ++this.seq, full = !this.joins || this.n++ % 20 === 0, key = this.key;
    this.inflight++; this.nextAt = now + this.pace(); this.timer = setTimeout(() => this.tick(), this.nextAt - now);
    this.sent.push(now); while (this.sent.length && now - this.sent[0] > 60000) this.sent.shift();
    try {
      const up = await fetch(UPSTREAM + (full ? QUERY : QUERY_FAST), { headers: { 'server-key': key } }); const body = await up.text(), headers = pickRL(up.headers);
      if (key !== this.key) return;                                       // the key changed while this was in flight
      const taken = Math.round((now + Date.now()) / 2); this.takeRL(headers, seq);
      if (up.status === 429) { this.holdUntil = Date.now() + Math.max(1, +headers['retry-after'] || 30) * 1000; this.penaltyUntil = Date.now() + 180000; this.n429++; this.bcast('err', JSON.stringify({ status: 429, retry_after: +headers['retry-after'] || 30 })); }
      else if (up.ok) { if (seq > this.shown) { this.shown = seq; let out = body;
          if (full) { try { this.joins = JSON.parse(body).JoinLogs || []; } catch (e) {} } else if (this.joins) out = body.replace(/}\s*$/, `,"JoinLogs":${JSON.stringify(this.joins)}}`);
          out = this.steady(out, taken);
          if (out) { this.snap = { t: Date.now(), taken, status: up.status, body: out, headers }; this.bcast('server', out, taken); } } }
      else { let j = {}; try { j = JSON.parse(body); } catch (e) {} this.bcast('err', JSON.stringify({ status: up.status, ...j })); this.holdUntil = Date.now() + (up.status === 403 || up.status === 401 ? 15000 : 3000); }
    } catch (e) { this.bcast('err', JSON.stringify({ status: 502, message: 'could not reach api.erlc.gg: ' + e.message })); this.holdUntil = Date.now() + 3000; }
    finally { this.inflight--; } }
  // drop answers from an old API cache: a player back at a spot they already left, or (for updates under 2 s apart) suddenly behind a moving car
  steady(body, taken) { let j; try { j = JSON.parse(body); } catch (e) { return body; } let stale = false; const adds = [];
    for (const p of j.Players || []) { const L = p.Location; if (!L || !Number.isFinite(L.LocationX)) continue; const h = this.hist.get(p.Player) || [], cur = [L.LocationX, L.LocationZ];
      const same = q => Math.abs(q[0] - cur[0]) < 0.01 && Math.abs(q[1] - cur[1]) < 0.01;
      if (h.length && same(h[h.length - 1])) continue;
      if (h.slice(0, -1).some(same)) { stale = true; break; }
      if (h.length >= 2 && taken - (this.lastAt.get(p.Player) || 0) < 2000) { const a = h[h.length - 2], b = h[h.length - 1], mv = [b[0] - a[0], b[1] - a[1]], d = [cur[0] - b[0], cur[1] - b[1]], lm = Math.hypot(...mv), ld = Math.hypot(...d);
        if (lm > 3 && ld > 1 && (mv[0] * d[0] + mv[1] * d[1]) < -0.3 * lm * ld) { const pend = this.pending.get(p.Player);
          if (!(pend && Math.hypot(cur[0] - pend[0], cur[1] - pend[1]) < ld + 40 && (cur[0] - pend[0]) * d[0] + (cur[1] - pend[1]) * d[1] >= 0)) { this.pending.set(p.Player, cur); stale = true; break; } } }
      this.pending.delete(p.Player); adds.push([p, h, cur, L]); }
    if (stale) { this.reverts++; return null; }
    for (const [p, h, cur, L] of adds) { this.lastAt.set(p.Player, taken); h.push(cur); if (h.length > 12) h.shift(); this.hist.set(p.Player, h);
      const tr = this.track.get(p.Player) || []; tr.push([taken, +cur[0].toFixed(2), +cur[1].toFixed(2), L.PostalCode || '']); while (tr.length && taken - tr[0][0] > 900000) tr.shift(); this.track.set(p.Player, tr); }
    return body; }
  stream(req, res, cal) {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write('retry: 2000\n\n'); res.write(`event: cal\ndata: ${JSON.stringify(cal)}\n\n`);
    if (this.snap && Date.now() - this.snap.t < 10000) res.write(`event: server\nid: ${this.snap.taken}\ndata: ${this.snap.body}\n\n`); else if (!this.key) res.write(`event: err\ndata: ${NOKEY}\n\n`);
    this.clients.add(res); this.lastClient = Date.now();
    const ka = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => { clearInterval(ka); this.clients.delete(res); this.lastClient = Date.now(); });
    this.wake(); }
  // one-off answer for a dashboard whose stream dropped: the feed's latest snapshot, or a direct request if nobody is streaming
  async snapshot() { if (this.snap && Date.now() - this.snap.t < 5000) return this.snap; if (!this.key) return { status: 401, body: NOKEY, headers: {} };
    try { const up = await fetch(UPSTREAM + QUERY, { headers: { 'server-key': this.key } }); const body = await up.text(), headers = pickRL(up.headers); this.takeRL(headers, this.seq); const out = { t: Date.now(), taken: Date.now(), status: up.status, body, headers }; if (up.ok) this.snap = out; return out; }
    catch (e) { return { status: 502, body: JSON.stringify({ message: 'could not reach api.erlc.gg: ' + e.message }), headers: {} }; } }
  stats() { return { watching: this.clients.size, perMin: this.sent.length, left: this.rl?.left ?? null, limited: this.n429, stale: this.reverts }; }
}
// test a key once without starting a feed: { ok, name, players } or { ok:false, message }
export const testKey = async key => { try { const r = await fetch(UPSTREAM + '/v2/server', { headers: { 'server-key': key } }); const j = await r.json().catch(() => ({}));
  if (r.ok) return { ok: true, name: j.Name, players: j.CurrentPlayers, max: j.MaxPlayers };
  const msg = { 2000: 'No key was sent.', 2001: 'That key is not in the right format.', 2002: 'That key is invalid or has expired. Copy a fresh one from your ER:LC private server settings.', 2004: 'That key is banned from the API.' }[j.code] || j.message || `ER:LC answered ${r.status}.`;
  return { ok: false, message: msg }; } catch (e) { return { ok: false, message: 'Could not reach api.erlc.gg right now. Try again in a moment.' }; } };
