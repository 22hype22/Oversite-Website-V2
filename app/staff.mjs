// Staff tools for one community: a staff view of the ER:LC server (players, mod calls, command and kill logs, bans) and in-game
// moderation through the API's command endpoint, with every warning, kick and ban written to the community's records.
import { staffRecords, staffSent } from './db.mjs';

const UPSTREAM = process.env.ERLC_UPSTREAM || 'https://api.erlc.gg';
const VIEW = '/v2/server?Players=true&Staff=true&ModCalls=true&CommandLogs=true&KillLogs=true';
const VIEW_TTL = 5000, BANS_TTL = 30000, GAP = 5300;                          // ER:LC allows one command per 5 s per server
const NAME = /^[A-Za-z0-9_]{3,20}$/;
const clean = t => String(t || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 180);
const split = s => { const [name, id] = String(s || '').split(':'); return { name: name || '', id: id || '' }; };
const norm = t => String(t || '').replace(/\s+/g, ' ').trim().toLowerCase();

// ER:LC logs our commands as "Remote Server"; pair each with the Oversite send of the same command closest in time (within two minutes)
const attribute = (cid, logs) => { const oldest = Math.min(...logs.map(m => m.at || Infinity)); if (!isFinite(oldest)) return logs;
  const from = oldest * 1000 - 120000, sent = staffSent.since(cid, from).map(s => ({ ...s, key: norm(s.command), at: s.created / 1000 }));
  for (const r of staffRecords.since(cid, from)) if (r.result === 'sent' && COMMANDS[r.kind]) sent.push({ by_name: r.by_name, key: norm(COMMANDS[r.kind](r.name, r.reason, r.roblox_id)), at: r.created / 1000 });   // older actions, before sends were logged
  for (const m of logs) { if (!/^remote server$/i.test(m.by.name.trim())) continue; const key = norm(m.command); let best = null;
    for (const s of sent) if (!s.used && s.key === key && Math.abs(s.at - m.at) <= 120 && (!best || Math.abs(s.at - m.at) < Math.abs(best.at - m.at))) best = s;
    if (best) { best.used = true; m.sentBy = best.by_name || 'Oversite user'; } }
  return logs; };

// what each action sends in game; null = recorded only
const COMMANDS = {
  warn: (n, r) => `:pm ${n} Warning from staff: ${r}`,
  pm: (n, r) => `:pm ${n} ${r}`,
  kick: (n, r) => `:kick ${n} ${r}`.trim(),
  ban: n => `:ban ${n}`,
  unban: (n, r, id) => `:unban ${id || n}`,
  announce: (n, r) => `:m ${r}`,
  note: null,
};
export const KINDS = Object.keys(COMMANDS);
const NEEDS_REASON = new Set(['warn', 'pm', 'kick', 'ban', 'announce', 'note']);

const state = new Map();                                                     // community id -> { view, bans, queue, lastCmd }
const of = cid => { if (!state.has(cid)) state.set(cid, { view: null, viewAt: 0, viewing: null, bans: null, bansAt: 0, queue: Promise.resolve(), lastCmd: 0 }); return state.get(cid); };

const get = async (key, path) => { const r = await fetch(UPSTREAM + path, { headers: { 'server-key': key } }); const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch (e) {}
  return { ok: r.ok, status: r.status, j, retry: +r.headers.get('retry-after') || 0 }; };

// the staff view, refreshed at most every few seconds however many staff have it open
export const view = async (c, key) => {
  const s = of(c.id), now = Date.now();
  if (!key) return { error: 'This server has no ER:LC key yet. An admin can add it in Settings.' };
  if (!s.view || now - s.viewAt > VIEW_TTL) { s.viewing ||= get(key, VIEW).then(r => { if (r.ok && r.j) { s.view = r.j; s.viewAt = Date.now(); } else if (!s.view) s.err = r.j?.message || `ER:LC answered ${r.status}`; }).catch(e => { if (!s.view) s.err = e.message; }).finally(() => { s.viewing = null; }); await s.viewing; }
  if (!s.bans || now - s.bansAt > BANS_TTL) { const gen = s.bansGen || 0;                      // a read that overlaps a ban or unban is used once, then read again
    try { const r = await get(key, '/v1/server/bans'); if (r.ok && r.j && typeof r.j === 'object') { s.bans = r.j; s.bansAt = (s.bansGen || 0) === gen ? Date.now() : 0; } } catch (e) {} }
  if (!s.view) return { error: s.err || 'Could not reach ER:LC.' };
  const v = s.view, counts = {};
  for (const row of staffRecords.counts(c.id)) (counts[row.roblox_id] ||= {})[row.kind] = row.n;
  return {
    at: s.viewAt, server: { name: v.Name, players: v.CurrentPlayers, max: v.MaxPlayers },
    players: (v.Players || []).map(p => ({ ...split(p.Player), team: p.Team || '', callsign: p.Callsign || '', permission: p.Permission || 'Normal', postal: p.Location?.PostalCode || '', street: p.Location?.StreetName || '', wanted: p.WantedStars || 0, x: p.Location?.LocationX ?? null, z: p.Location?.LocationZ ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    modCalls: (v.ModCalls || []).slice(-40).reverse().map(m => ({ caller: split(m.Caller), moderator: m.Moderator ? split(m.Moderator) : null, at: m.Timestamp })),
    commands: attribute(c.id, (v.CommandLogs || []).slice(-60).reverse().map(m => ({ by: split(m.Player), command: m.Command, at: m.Timestamp }))),
    kills: (v.KillLogs || []).slice(-30).reverse().map(m => ({ killer: split(m.Killer), killed: split(m.Killed), at: m.Timestamp })),
    bans: banList(c.id, s.bans),
    staff: v.Staff || null, counts, records: staffRecords.recent(c.id, 60),
  };
};

// one command at a time per server, spaced to the API's command limit; waits out a 429 once
const run = (c, key, command, by) => { const s = of(c.id);
  const job = s.queue.then(async () => {
    const wait = s.lastCmd + GAP - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const send = () => fetch(UPSTREAM + '/v2/server/command', { method: 'POST', headers: { 'server-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ command }) });
    let r = await send(); s.lastCmd = Date.now();
    let j = {}; try { j = await r.json(); } catch (e) {}
    for (let tries = 0; r.status === 429 && tries < 3; tries++) {                // another app on the same key can use up the slot; wait it out
      const ra = Math.min(30, Math.max(1, +r.headers.get('retry-after') || +j.retry_after || 6)); await new Promise(res => setTimeout(res, ra * 1000 + 300));
      r = await send(); s.lastCmd = Date.now(); j = {}; try { j = await r.json(); } catch (e) {} }
    if (!r.ok) console.log(`ER:LC command refused for community ${c.id}: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    if (r.ok) { if (by) staffSent.add(c.id, command, by); return { ok: true, message: j.message || 'Sent' }; }
    return { ok: false, message: r.status === 422 ? 'The server is offline or empty, so the command could not run.' : (j.message || `ER:LC answered ${r.status}`) };
  });
  s.queue = job.catch(() => {}); return job; };

// a staff action: validate, run it in game if it has a command, and record it either way
export const act = async (c, key, by, body) => {
  const kind = String(body.kind || ''); if (!KINDS.includes(kind)) return { error: 'Unknown action.' };
  const name = String(body.name || '').trim(), id = String(body.id || '').replace(/\D/g, '').slice(0, 20), reason = clean(body.reason);
  if (kind !== 'announce' && !NAME.test(name)) return { error: 'Pick a player first.' };
  if (NEEDS_REASON.has(kind) && !reason) return { error: kind === 'pm' || kind === 'announce' ? 'Write the message first.' : 'Give a reason.' };
  const make = COMMANDS[kind]; let result = { ok: true, message: 'Recorded' };
  if (make) { if (!key) return { error: 'This server has no ER:LC key yet.' }; result = await run(c, key, make(name, reason, id), by); if (!result.ok && kind !== 'warn') return { error: result.message }; }
  const rec = kind === 'pm' || kind === 'announce' ? null : staffRecords.add({ community_id: c.id, roblox_id: id || null, name: kind === 'announce' ? 'Server' : name, kind, reason, by_user: by.id, by_name: by.name, result: result.ok ? 'sent' : 'not delivered: ' + result.message });
  if (kind === 'ban' || kind === 'unban') { const st = of(c.id); st.bansAt = 0; st.bansGen = (st.bansGen || 0) + 1; }   // re-read the ban list next time
  return { ok: true, id: rec, delivered: result.ok, message: result.ok ? result.message : `Saved, but the in-game message failed: ${result.message}` };
};

// the ban list, with who banned each player through Oversite and when, so a run of mistaken bans can be found and undone together
const banList = (cid, bans) => { const by = new Map(); for (const r of staffRecords.lastBans(cid)) { if (r.roblox_id && !by.has(r.roblox_id)) by.set(r.roblox_id, r); if (!by.has('n:' + r.lname)) by.set('n:' + r.lname, r); }
  return Object.entries(bans || {}).map(([id, name]) => { name = String(name); const r = by.get(id) || by.get('n:' + name.toLowerCase()); return { id, name, by: r ? r.by_name : null, at: r ? r.created : null }; }).sort((a, b) => a.name.localeCompare(b.name)); };

export const records = (c, q) => q.id || q.name ? staffRecords.forPlayer(c.id, q.id, q.name) : q.q ? staffRecords.search(c.id, q.q) : staffRecords.recent(c.id, 100);
