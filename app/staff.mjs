// Staff tools for one community: a staff view of the ER:LC server (players, mod calls, command and kill logs, bans) and in-game
// moderation through the API's command endpoint, with every warning, kick and ban written to the community's records.
import { staffRecords, staffSent, commandLog, communities, users } from './db.mjs';

// who did something, by the account behind it rather than the name saved at the time: once someone links Roblox their past
// actions show their Roblox name; an account with nothing linked is marked, with its number, so it can still be told apart
export const display = (uid, saved) => { const u = uid ? users.byId(uid) : null; if (!u) return saved || 'Unknown';
  if (u.roblox_name) return u.roblox_name; if (u.discord_id) return u.name; return `${u.name || saved || 'Account'} #${u.id} (not linked)`; };
const named = rows => rows.map(r => ({ ...r, by_name: display(r.by_user, r.by_name) }));

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
  for (const r of staffRecords.since(cid, from)) if (r.result === 'sent' && COMMANDS[r.kind]) sent.push({ by_user: r.by_user, by_name: r.by_name, key: norm(COMMANDS[r.kind](r.name, r.reason, r.roblox_id)), at: r.created / 1000 });   // older actions, before sends were logged
  for (const m of logs) { if (!/^remote server$/i.test(m.by.name.trim())) continue; const key = norm(m.command); let best = null;
    for (const s of sent) if (!s.used && s.key === key && Math.abs(s.at - m.at) <= 120 && (!best || Math.abs(s.at - m.at) < Math.abs(best.at - m.at))) best = s;
    if (best) { best.used = true; m.sentBy = display(best.by_user, best.by_name); } }
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
  if (!s.view || now - s.viewAt > VIEW_TTL) { s.viewing ||= get(key, VIEW).then(r => { if (r.ok && r.j) { s.view = r.j; s.viewAt = Date.now(); keep(c.id, r.j.CommandLogs); } else if (!s.view) s.err = r.j?.message || `ER:LC answered ${r.status}`; }).catch(e => { if (!s.view) s.err = e.message; }).finally(() => { s.viewing = null; }); await s.viewing; }
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
    staff: v.Staff || null, counts, records: named(staffRecords.recent(c.id, 60)),
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
  return Object.entries(bans || {}).map(([id, name]) => { name = String(name); const r = by.get(id) || by.get('n:' + name.toLowerCase()); return { id, name, by: r ? display(r.by_user, r.by_name) : null, at: r ? r.created : null }; }).sort((a, b) => a.name.localeCompare(b.name)); };

// ── the command history: every command ER:LC reports goes into command_log for good ──
const keep = (cid, logs) => { if (!Array.isArray(logs) || !logs.length) return; of(cid).keptAt = Date.now();
  try { commandLog.add(cid, logs.map(m => { const p = split(m.Player); return { player: p.name, player_id: p.id, command: String(m.Command || ''), at: +m.Timestamp || 0 }; }).filter(r => r.player && r.command && r.at)); } catch (e) { console.log('command log save failed:', e.message); } };

// ER:LC only hands back recent commands, so read every connected server's log once a minute even when no one has the Staff MDT open
export const startHistory = () => { let busy = false;
  const pass = async () => { if (busy) return; busy = true;
    try { for (const c of communities.all()) { const key = communities.key(c.id); if (!key || Date.now() - (of(c.id).keptAt || 0) < 55000) continue;
      try { const r = await get(key, '/v2/server?CommandLogs=true'); if (r.ok && r.j) keep(c.id, r.j.CommandLogs); } catch (e) {} } }
    finally { busy = false; } };
  setTimeout(pass, 5000); setInterval(pass, 60000); };

// one person's history: the commands they ran (in game, or through Oversite as staff) and the commands run on them
const ON = name => new RegExp(`(^|[\\s,])${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s,])`, 'i');
// every staff account that has acted here, under the name it shows as now
const actors = cid => { const out = new Map();
  for (const r of [...staffSent.actors(cid), ...staffRecords.actors(cid)]) { const name = display(r.by_user, r.by_name), k = name.toLowerCase(), a = out.get(k) || { name, ids: new Set(), n: 0 };
    if (r.by_user) a.ids.add(r.by_user); a.n += r.n; out.set(k, a); }
  return out; };
export const lookup = (c, q) => { const name = String(q || '').trim().slice(0, 60);
  const staffBy = actors(c.id);
  if (!name) return { names: [...commandLog.names(c.id).filter(r => !/^remote server$/i.test(r.name)).map(r => ({ name: r.name, id: r.player_id || r.id || '', n: r.n })), ...[...staffBy.values()].map(a => ({ name: a.name, id: '', n: a.n, staff: true }))] };
  const game = commandLog.byPlayer(c.id, name).filter(r => !/^remote server$/i.test(r.player));
  const me = staffBy.get(name.toLowerCase()), ids = me ? [...me.ids] : [], firstSent = staffSent.first(c.id) || Infinity;
  const viaOv = me ? [...staffSent.byActors(c.id, ids, name).map(r => ({ command: r.command, at: Math.floor(r.created / 1000) })),
    ...staffRecords.sentByActors(c.id, ids, name).filter(r => r.created < firstSent && COMMANDS[r.kind]).map(r => ({ command: COMMANDS[r.kind](r.name, r.reason, r.roblox_id), at: Math.floor(r.created / 1000) }))] : [];
  const used = [...game.map(r => ({ command: r.command, at: r.at, via: 'game' })), ...viaOv.map(r => ({ ...r, via: 'oversite' }))].sort((a, b) => b.at - a.at);
  const id = game[0]?.player_id || commandLog.byPlayer(c.id, name)[0]?.player_id || staffRecords.idFor(c.id, name) || (ids.length === 1 && users.byId(ids[0])?.roblox_id) || '';
  const seen = new Set(), mentions = [];                                       // by name, and by Roblox ID (unbans go by ID)
  for (const t of [name, id].filter(Boolean)) { const re = ON(t); for (const r of commandLog.mentioning(c.id, t)) if (re.test(r.command) && !seen.has(r.id)) { seen.add(r.id); mentions.push(r); } }
  const on = attribute(c.id, mentions.sort((a, b) => b.at - a.at).map(r => ({ by: { name: r.player, id: r.player_id }, command: r.command, at: r.at })));
  const real = game[0]?.player || me?.name || name;
  const kinds = {}; for (const u of used) { const k = (u.command.match(/^:?\S+/) || [''])[0].toLowerCase(); if (k) kinds[k] = (kinds[k] || 0) + 1; }
  return { name: real, id, used, on, kinds }; };

export const records = (c, q) => named(q.id || q.name ? staffRecords.forPlayer(c.id, q.id, q.name) : q.q ? staffRecords.search(c.id, q.q) : staffRecords.recent(c.id, 100));
export const removeRecord = (c, id) => staffRecords.remove(c.id, +id);
