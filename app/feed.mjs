// One live feed per community: polls that community's ER:LC server as fast as its rate limit allows and fans each answer out
// to every open dashboard of that community over server-sent events. A feed only runs while someone is watching.
import { siteSettings, unseal, dutySince } from './db.mjs';
const UPSTREAM = process.env.ERLC_UPSTREAM || 'https://api.erlc.gg';
const QUERY = '/v2/server?Players=true&Vehicles=true&EmergencyCalls=true&JoinLogs=true';
const QUERY_FAST = '/v2/server?Players=true&Vehicles=true&EmergencyCalls=true';   // join logs only change on joins: fetched every 20th request and reused
const IDLE_STOP = 30000, FLOOR = +(process.env.FEED_FLOOR_MS || 250);
const RL = ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset', 'x-ratelimit-bucket', 'retry-after'];
// ER:LC refuses a service that speaks for several servers unless it is a registered public application sending its Global API Key
// in the Authorization header (error 2005). Every request carries it next to that server's own key. Its rate limit is one budget
// shared by every server (bucket "global"), so the live feeds split it between them instead of each spending all of it.
// The key comes from the ERLC_API_KEY variable, or else from the site admin page (sealed in the database).
let appCache = { at: 0, key: '' };
export const appKey = () => { const env = (process.env.ERLC_API_KEY || '').trim(); if (env) return env;
  if (Date.now() - appCache.at > 5000) appCache = { at: Date.now(), key: unseal(siteSettings.get('erlc_app_key')) }; return appCache.key; };
export const appKeyChanged = () => { appCache.at = 0; };
export const appId = () => (process.env.ERLC_APP_ID || siteSettings.get('erlc_app_id') || '').trim();
export const erlcHeaders = (key, extra = {}) => { const k = appKey(); return { 'server-key': key, ...(k ? { authorization: k } : {}), ...extra }; };
// a server key is "<secret>-<internal server id>"; with the app's id that makes the link where the owner lets Oversite run in-game commands
export const authLink = serverKey => { const i = String(serverKey || '').indexOf('-'), sid = i > 0 ? serverKey.slice(i + 1) : '', id = appId();
  return sid && /^[A-Za-z0-9]+$/.test(sid) && /^[A-Za-z0-9_-]+$/.test(id) ? `https://api.erlc.gg/server-owners/server/${sid}/authorize/${id}` : ''; };
const GL = { left: NaN, reset: 0, at: 0 }, ACTIVE = new Set();
// Without Oversite's ER:LC application key, ER:LC blocks every server as soon as one machine reads more than one ("multiple servers", 2005).
// So until the key is added, only one server's feed reads ER:LC at a time; a server run by a site admin goes first, the rest wait their turn.
const SOLO = { feed: null };
const SOLO_WAIT = JSON.stringify({ status: 403, code: 2005, message: 'Waiting for Oversite to finish its ER:LC application setup. Until then ER:LC only lets Oversite read one server at a time.' });
const holderLive = f => !!f && (f.clients.size > 0 || Date.now() - Math.max(f.lastClient || 0, f.lastUse || 0) < 20000);   // someone has its CAD open, or it read ER:LC in the last 20 s
export const soloBusy = key => !appKey() && SOLO.feed && holderLive(SOLO.feed) && SOLO.feed.key !== key;   // another server holds the one slot
const pickRL = h => { const out = {}; for (const k of RL) if (h.get(k)) out[k] = h.get(k); return out; };
export const NOKEY = '{"code":2000,"message":"This community has not connected its ER:LC server yet. An admin can add the server key in Settings."}';

export class Feed {
  constructor(id, getKey, prio = () => false) { Object.assign(this, { id, getKey, prio, snap: null, clients: new Set(), timer: null, inflight: 0, lastClient: 0, nextAt: 0, seq: 0, shown: 0, rl: null, rlSeq: 0,
    holdUntil: 0, penaltyUntil: 0, n: 0, joins: null, sent: [], n429: 0, reverts: 0, rtt: 0, gapEv: 0, lastEv: 0, moveEv: 0, lastMove: 0, hist: new Map(), track: new Map(), pending: new Map(), lastAt: new Map() }); this.key = getKey(); }
  bcast(ev, data, id) { const msg = `event: ${ev}\n${id ? `id: ${id}\n` : ''}data: ${data}\n\n`; for (const c of this.clients) c.write(msg); }
  // time between requests: spread what the rate limit has left evenly until it resets, keep a reserve, count requests still in flight
  pace() { let g = 700; const shared = this.rl?.bucket === 'global', h = shared ? GL : this.rl, n = shared ? Math.max(1, ACTIVE.size) : 1, keep = (Date.now() < this.penaltyUntil ? 10 : 4) * n;
    if (h && Number.isFinite(h.left) && Number.isFinite(h.reset) && h.reset > 0) { const left = h.left - (shared ? [...ACTIVE].reduce((a, f) => a + f.inflight, 0) : this.inflight), win = Math.max(0, (h.reset > 1e12 ? h.reset : h.reset * 1000) - Date.now()) + (left <= keep ? 1200 : 300); g = left <= keep ? win : win / (left - keep) * n; }   // shared: each feed takes its turn in the one budget
    return Math.min(15000, Math.max(FLOOR, g)); }
  takeRL(headers, seq) { const b = headers['x-ratelimit-bucket'] || '', left = +headers['x-ratelimit-remaining'], reset = +headers['x-ratelimit-reset'];
    if (b === 'global' && Number.isFinite(left)) { GL.left = left; GL.reset = reset; GL.at = Date.now(); }
    if (seq < this.rlSeq) return; this.rlSeq = seq; this.rl = { left, reset, bucket: b }; }
  setKey(k) { this.key = k; this.snap = null; this.failSnap = null; this.joins = null; this.hist.clear(); this.nextAt = 0; this.holdUntil = 0; if (this.clients.size) this.wake(); }
  // the holder keeps the slot while it's in use; a site admin's server can take it from anyone else's, never from another of theirs
  soloOk() { const h = SOLO.feed; if (h && h !== this && holderLive(h) && !(this.prio() && !h.prio())) return false;
    if (h !== this) { console.log(`feed ${this.id}: has the one ER:LC slot${h ? ` (was feed ${h.id})` : ''} until Oversite's application key is added`); SOLO.feed = this; } this.lastUse = Date.now(); return true; }
  wake() { if (!this.timer) this.timer = setTimeout(() => this.tick(), Math.max(0, this.nextAt - Date.now())); }
  async tick() {
    this.timer = null; const now = Date.now();
    if (!this.clients.size && now - this.lastClient > IDLE_STOP) { ACTIVE.delete(this); return; }
    ACTIVE.add(this);
    if (!this.key) { this.bcast('err', NOKEY); this.timer = setTimeout(() => this.tick(), 5000); return; }
    if (!appKey() && !this.soloOk()) { this.bcast('err', SOLO_WAIT); this.timer = setTimeout(() => this.tick(), 8000); return; }
    if (now < this.holdUntil) { this.timer = setTimeout(() => this.tick(), this.holdUntil - now); return; }
    if (this.inflight >= 2) { this.timer = setTimeout(() => this.tick(), 40); return; }
    const seq = ++this.seq, full = !this.joins || this.n++ % 20 === 0, key = this.key;
    this.inflight++; this.nextAt = now + this.pace(); this.timer = setTimeout(() => this.tick(), this.nextAt - now);
    this.sent.push(now); while (this.sent.length && now - this.sent[0] > 60000) this.sent.shift();
    try {
      const up = await fetch(UPSTREAM + (full ? QUERY : QUERY_FAST), { headers: erlcHeaders(key) }); const body = await up.text(), headers = pickRL(up.headers);
      if (key !== this.key) return;                                       // the key changed while this was in flight
      const taken = Math.round((now + Date.now()) / 2); this.takeRL(headers, seq); const ema = (a, v) => a ? a * 0.9 + v * 0.1 : v; this.rtt = ema(this.rtt, Date.now() - now);   // timing, for /health
      if (up.ok) this.lastErr = null;
      if (up.status === 429) { this.holdUntil = Date.now() + Math.max(1, +headers['retry-after'] || 30) * 1000; this.penaltyUntil = Date.now() + 180000; this.n429++; this.bcast('err', JSON.stringify({ status: 429, retry_after: +headers['retry-after'] || 30 })); }
      else if (up.ok) { if (seq > this.shown) { this.shown = seq; let out = body;
          if (full) { try { this.joins = JSON.parse(body).JoinLogs || []; } catch (e) {} } else if (this.joins) out = body.replace(/}\s*$/, `,"JoinLogs":${JSON.stringify(this.joins)}}`);
          out = this.steady(out, taken); if (out) out = this.withDuty(out, taken); if (out && this.withExtra) { try { out = this.withExtra(out) || out; } catch (e) {} }
          if (out) { this.snap = { t: Date.now(), taken, status: up.status, body: out, headers }; this.bcast('server', out, taken); try { this.onSnap?.(out); } catch (e) {} if (this.lastEv) this.gapEv = ema(this.gapEv, taken - this.lastEv); this.lastEv = taken;
            if (this.moved) { if (this.lastMove && taken - this.lastMove < 10000) this.moveEv = ema(this.moveEv, taken - this.lastMove); this.lastMove = taken; } } } }
      else { let j = {}; try { j = JSON.parse(body); } catch (e) {} this.bcast('err', JSON.stringify({ status: up.status, ...j })); this.noteErr(up.status, j); this.holdUntil = Date.now() + (up.status === 403 || up.status === 401 ? 15000 : 3000); }
    } catch (e) { this.bcast('err', JSON.stringify({ status: 502, message: 'could not reach api.erlc.gg: ' + e.message })); this.holdUntil = Date.now() + 3000; }
    finally { this.inflight--; } }
  // what ER:LC last refused, for /health and the logs (once a minute per server, so a refusal is easy to spot without flooding)
  noteErr(status, j) { const now = Date.now(); this.lastErr = { status, code: j.code ?? null, message: String(j.message || '').slice(0, 160), at: now };
    if (now - (this.errLogged || 0) > 60000) { this.errLogged = now; console.log(`feed ${this.id}: ER:LC refused (${status}${j.code != null ? ', code ' + j.code : ''}): ${this.lastErr.message}`); } }
  // when each player joined the team they are on now (a team change restarts it; rejoining the server after leaving does too), sent
  // with every update as OversiteDuty { "Name:id": ms }. Kept in the database, so a reload or restart doesn't zero everyone's clock.
  withDuty(body, taken) { let j; try { j = JSON.parse(body); } catch (e) { return body; }
    if (!this.duty) this.duty = new Map(dutySince.all(this.id).map(r => [r.player, r]));
    const joined = new Map(); for (const l of j.JoinLogs || []) if (l.Join && l.Player) joined.set(l.Player, Math.max(joined.get(l.Player) || 0, l.Timestamp * 1000));
    const out = {}, dirty = [], flush = taken - (this.dutySaved || 0) > 60000;
    for (const p of j.Players || []) { if (!p.Player) continue; const team = p.Team || '', jt = joined.get(p.Player) || 0; let r = this.duty.get(p.Player);
      if (!r || r.team !== team || (jt && jt > r.seen + 5000)) { r = { player: p.Player, team, since: r && r.team !== team ? taken : Math.min(taken, jt || taken), seen: taken }; this.duty.set(p.Player, r); dirty.push(r); }
      else { r.seen = taken; if (flush) dirty.push(r); }
      out[p.Player] = r.since; }
    if (dirty.length) { try { dutySince.save(this.id, dirty); } catch (e) {} if (flush) this.dutySaved = taken; }
    return body.replace(/}\s*$/, `,"OversiteDuty":${JSON.stringify(out)}}`); }
  // drop answers from an old API cache: a player back at a spot they already left, or (for updates under 2 s apart) suddenly behind a moving car
  steady(body, taken) { this.moved = false; let j; try { j = JSON.parse(body); } catch (e) { return body; } let stale = false; const adds = [];
    for (const p of j.Players || []) { const L = p.Location; if (!L || !Number.isFinite(L.LocationX)) continue; const h = this.hist.get(p.Player) || [], cur = [L.LocationX, L.LocationZ];
      const same = q => Math.abs(q[0] - cur[0]) < 0.01 && Math.abs(q[1] - cur[1]) < 0.01;
      if (h.length && same(h[h.length - 1])) continue;
      if (h.slice(0, -1).some(same)) { stale = true; break; }
      if (h.length >= 2 && taken - (this.lastAt.get(p.Player) || 0) < 2000) { const a = h[h.length - 2], b = h[h.length - 1], mv = [b[0] - a[0], b[1] - a[1]], d = [cur[0] - b[0], cur[1] - b[1]], lm = Math.hypot(...mv), ld = Math.hypot(...d);
        if (lm > 3 && ld > 1 && (mv[0] * d[0] + mv[1] * d[1]) < -0.3 * lm * ld) { const pend = this.pending.get(p.Player);
          if (!(pend && Math.hypot(cur[0] - pend[0], cur[1] - pend[1]) < ld + 40 && (cur[0] - pend[0]) * d[0] + (cur[1] - pend[1]) * d[1] >= 0)) { this.pending.set(p.Player, cur); stale = true; break; } } }
      this.pending.delete(p.Player); adds.push([p, h, cur, L]); }
    if (stale) { this.reverts++; return null; }
    if (adds.length) this.moved = true;
    for (const [p, h, cur, L] of adds) { this.lastAt.set(p.Player, taken); h.push(cur); if (h.length > 12) h.shift(); this.hist.set(p.Player, h);
      const tr = this.track.get(p.Player) || []; tr.push([taken, +cur[0].toFixed(2), +cur[1].toFixed(2), L.PostalCode || '']); while (tr.length && taken - tr[0][0] > 900000) tr.shift(); this.track.set(p.Player, tr); }
    return body; }
  stream(req, res, cal, cleared = [], uid = null) { res.uid = uid; const panics = this.activePanics();
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write('retry: 2000\n\n'); res.write(`event: cal\ndata: ${JSON.stringify(cal)}\n\n`); res.write(`event: callclears\ndata: ${JSON.stringify(cleared)}\n\n`); if (panics.length) res.write(`event: panics\ndata: ${JSON.stringify(panics)}\n\n`); try { this.onStream?.(res); } catch (e) {}   // anyone opening the CAD sees panics still going   // calls someone already cleared stay off this board
    if (this.snap && Date.now() - this.snap.t < 10000) res.write(`event: server\nid: ${this.snap.taken}\ndata: ${this.snap.body}\n\n`); else if (!this.key) res.write(`event: err\ndata: ${NOKEY}\n\n`);
    if (uid != null) { const mine = [...this.clients].filter(r => r.uid === uid); for (const r of mine.slice(0, Math.max(0, mine.length - 3))) { this.clients.delete(r); clearInterval(r.ka); r.end(); } }   // 4 open CADs per person at most: the oldest closes
    this.clients.add(res); this.lastClient = Date.now();
    const ka = res.ka = setInterval(() => { if (!res.writableEnded) res.write(': ping\n\n'); }, 15000);
    req.on('close', () => { clearInterval(ka); this.clients.delete(res); this.lastClient = Date.now(); });
    this.wake(); }
  // one-off answer for a dashboard whose stream dropped: the feed's latest snapshot, or a direct request if nobody is streaming
  // reload the open CADs of one person (suspended), or of everyone on this server (server suspended)
  // panic buttons pressed on this server: kept until someone clears them (or an hour passes)
  activePanics() { const P = this.panics || (this.panics = new Map()); for (const [k, p] of P) if (Date.now() - p.at > 3600000) P.delete(k); return [...P.values()]; }
  panic(p) { this.activePanics(); this.panics.set(p.id, p); this.bcast('panic', JSON.stringify(p)); }
  panicClear(id, by) { this.activePanics(); const p = this.panics.get(id); if (!p) return false; this.panics.delete(id); this.bcast('panicclear', JSON.stringify({ id, by })); return true; }
  kick(uid = null) { for (const r of this.clients) if (uid == null || r.uid === uid) r.write('event: reload\ndata: {}\n\n'); }
  // one request at a time per server, and a failed answer is reused for a few seconds, so many callers can't multiply requests to ER:LC
  snapshot() { if (this.snap && Date.now() - this.snap.t < 5000) return Promise.resolve(this.snap); if (this.failSnap && Date.now() - this.failSnap.t < 4000) return Promise.resolve(this.failSnap);
    return this.snapP || (this.snapP = this.snapshotNow().then(s => { if (s.status !== 200) this.failSnap = { ...s, t: Date.now() }; return s; }).finally(() => { this.snapP = null; })); }   // snapP, not inflight: that one counts the live feed's own requests
  async snapshotNow() { if (!this.key) return { status: 401, body: NOKEY, headers: {} };
    if (!appKey() && !this.soloOk()) return { status: 403, body: SOLO_WAIT, headers: {} };
    try { const up = await fetch(UPSTREAM + QUERY, { headers: erlcHeaders(this.key) }); const body = await up.text(), headers = pickRL(up.headers); this.takeRL(headers, this.seq); const out = { t: Date.now(), taken: Date.now(), status: up.status, body, headers }; if (up.ok) { this.snap = out; try { this.onSnap?.(body); } catch (e) {} } return out; }
    catch (e) { return { status: 502, body: JSON.stringify({ message: 'could not reach api.erlc.gg: ' + e.message }), headers: {} }; } }
  stats() { return { watching: this.clients.size, perMin: this.sent.length, left: this.rl?.left ?? null, limited: this.n429, stale: this.reverts, rtt: Math.round(this.rtt), every: Math.round(this.gapEv), moves: Math.round(this.moveEv), err: this.lastErr && Date.now() - this.lastErr.at < 120000 ? this.lastErr.code ?? this.lastErr.status : null }; }
}
// test a key once without starting a feed: { ok, name, players } or { ok:false, message }
// ER:LC refusing because of Oversite's own application key (not the owner's server key): codes 2003/2005, or that message
export const appSide = j => j && (j.code === 2005 || j.code === 2003 || /multiple servers|application|global api key/i.test(String(j.message || '')));
export const testKey = async key => { if (soloBusy(key)) return { ok: false, keep: true, message: 'Your server key is saved. Oversite is waiting for its ER:LC application setup before it can check more servers, so the CAD connects once that is done.' }; try { const r = await fetch(UPSTREAM + '/v2/server', { headers: erlcHeaders(key) }); const j = await r.json().catch(() => ({}));
  if (!r.ok && appSide(j)) return { ok: false, appSide: true, message: "Your server key is saved. ER:LC is holding the live data until Oversite finishes its ER:LC application setup. Nothing to do on your side: it starts by itself once that's done." };
  if (r.ok) return { ok: true, name: j.Name, players: j.CurrentPlayers, max: j.MaxPlayers };
  const msg = { 2000: 'No key was sent.', 2001: "ER:LC says that isn't a server key. In your private server open Settings, then the ER:LC API section, and copy the Server Key (not an application key).",
    2003: "ER:LC turned down Oversite's application key. This is on our side: we've been told and the connection will work again shortly.",
    2005: "ER:LC needs Oversite's application key before it will connect more servers. This is on our side, not yours: try again in a little while.", 2002: 'That key is invalid or has expired. Copy a fresh one from your ER:LC private server settings.', 2004: 'That key is banned from the API.' }[j.code] || j.message || `ER:LC answered ${r.status}.`;
  // only a key ER:LC says is wrong is turned away; anything else (rate limit, ER:LC down, server offline) is ER:LC's moment, not the key's, so it's kept
  if ([2001, 2002, 2004].includes(j.code)) return { ok: false, message: msg };
  return { ok: false, keep: true, message: `Your server key is saved. ER:LC didn't confirm it just now (${String(msg).replace(/\.$/, '')}), so the CAD will connect as soon as it answers.` }; }
  catch (e) { return { ok: false, keep: true, message: "Your server key is saved. Oversite couldn't reach ER:LC to check it just now, so the CAD will connect as soon as it can." }; } };
