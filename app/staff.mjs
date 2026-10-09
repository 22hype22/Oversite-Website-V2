// Staff tools for one community: a staff view of the ER:LC server (players, mod calls, command and kill logs, bans) and in-game
// moderation through the API's command endpoint, with every warning, kick and ban written to the community's records.
import { staffRecords } from './db.mjs';

const UPSTREAM = process.env.ERLC_UPSTREAM || 'https://api.erlc.gg';
const VIEW = '/v2/server?Players=true&Staff=true&ModCalls=true&CommandLogs=true&KillLogs=true';
const VIEW_TTL = 5000, BANS_TTL = 30000, GAP = 5300;                          // ER:LC allows one command per 5 s per server
const NAME = /^[A-Za-z0-9_]{3,20}$/;
const clean = t => String(t || '').replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 180);
const split = s => { const [name, id] = String(s || '').split(':'); return { name: name || '', id: id || '' }; };

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
  if (!s.bans || now - s.bansAt > BANS_TTL) { try { const r = await get(key, '/v1/server/bans'); if (r.ok && r.j && typeof r.j === 'object') { s.bans = r.j; s.bansAt = Date.now(); } } catch (e) {} }
  if (!s.view) return { error: s.err || 'Could not reach ER:LC.' };
  const v = s.view, counts = {};
  for (const row of staffRecords.counts(c.id)) (counts[row.roblox_id] ||= {})[row.kind] = row.n;
  return {
    at: s.viewAt, server: { name: v.Name, players: v.CurrentPlayers, max: v.MaxPlayers },
    players: (v.Players || []).map(p => ({ ...split(p.Player), team: p.Team || '', callsign: p.Callsign || '', permission: p.Permission || 'Normal', postal: p.Location?.PostalCode || '', street: p.Location?.StreetName || '', wanted: p.WantedStars || 0, x: p.Location?.LocationX ?? null, z: p.Location?.LocationZ ?? null }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    modCalls: (v.ModCalls || []).slice(-40).reverse().map(m => ({ caller: split(m.Caller), moderator: m.Moderator ? split(m.Moderator) : null, at: m.Timestamp })),
    commands: (v.CommandLogs || []).slice(-60).reverse().map(m => ({ by: split(m.Player), command: m.Command, at: m.Timestamp })),
    kills: (v.KillLogs || []).slice(-30).reverse().map(m => ({ killer: split(m.Killer), killed: split(m.Killed), at: m.Timestamp })),
    bans: Object.entries(s.bans || {}).map(([id, name]) => ({ id, name: String(name) })).sort((a, b) => a.name.localeCompare(b.name)),
    staff: v.Staff || null, counts, records: staffRecords.recent(c.id, 60),
  };
};

// one command at a time per server, spaced to the API's command limit; waits out a 429 once
const run = (c, key, command) => { const s = of(c.id);
  const job = s.queue.then(async () => {
    const wait = s.lastCmd + GAP - Date.now(); if (wait > 0) await new Promise(r => setTimeout(r, wait));
    const send = () => fetch(UPSTREAM + '/v2/server/command', { method: 'POST', headers: { 'server-key': key, 'content-type': 'application/json' }, body: JSON.stringify({ command }) });
    let r = await send(); s.lastCmd = Date.now();
    if (r.status === 429) { const ra = Math.min(30, +r.headers.get('retry-after') || 6); await new Promise(res => setTimeout(res, ra * 1000)); r = await send(); s.lastCmd = Date.now(); }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok) console.log(`ER:LC command refused for community ${c.id}: ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
    if (r.ok) return { ok: true, message: j.message || 'Sent' };
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
  if (make) { if (!key) return { error: 'This server has no ER:LC key yet.' }; result = await run(c, key, make(name, reason, id)); if (!result.ok && kind !== 'warn') return { error: result.message }; }
  const rec = kind === 'pm' || kind === 'announce' ? null : staffRecords.add({ community_id: c.id, roblox_id: id || null, name: kind === 'announce' ? 'Server' : name, kind, reason, by_user: by.id, by_name: by.name, result: result.ok ? 'sent' : 'not delivered: ' + result.message });
  if (kind === 'ban' || kind === 'unban') of(c.id).bansAt = 0;                // re-read the ban list next time
  return { ok: true, id: rec, delivered: result.ok, message: result.ok ? result.message : `Saved, but the in-game message failed: ${result.message}` };
};

export const records = (c, q) => q.id || q.name ? staffRecords.forPlayer(c.id, q.id, q.name) : q.q ? staffRecords.search(c.id, q.q) : staffRecords.recent(c.id, 100);
export const removeRecord = (c, id) => staffRecords.remove(c.id, +id);
