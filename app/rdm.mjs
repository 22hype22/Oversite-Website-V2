// RDM watch: random deathmatch (killing without a roleplay reason) spotted in ER:LC's kill log, for the Server Staff panel.
// Every few seconds the kill log is read with the live feed, and each new kill is weighed:
//   a kill streak: the same player killing several people in a few minutes;
//   targeting: killing the same person again and again;
//   the wrong team: Fire or DOT killing anyone, or an officer killing another officer.
// Payback (killing someone who killed you a few minutes ago) doesn't count, except in a streak. A flag lists the killer, who they
// killed and why it was flagged; staff warn, kick or ban from it, or dismiss it. The server can also have Oversite message the
// killer, or kick them on a streak, :pm the staff who are in the server, and a bot can post each flag in Discord (rdm.flagged).
// Settings: c.settings.rdm = { on, kills, mins, repeat, teams, action: 'flag' | 'warn' | 'kick', pmStaff }
import { db, now, communities, staffRecords } from './db.mjs';
import { commandAs } from './staff.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS rdm_flags (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, killer TEXT NOT NULL,
  killer_id TEXT, team TEXT, victims TEXT NOT NULL DEFAULT '[]', reasons TEXT NOT NULL DEFAULT '[]', first_at INTEGER NOT NULL, last_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', auto TEXT, done_by TEXT, done_at INTEGER);
CREATE INDEX IF NOT EXISTS rdm_flags_c ON rdm_flags (community_id, status, id);`);
const q = sql => db.prepare(sql);
export const ACTIONS = ['flag', 'warn', 'kick'], KEEP = 300;
const REPEAT_MIN = 10, PAYBACK_MIN = 5, NAME = 'Oversite RDM watch';

// kills: how many in `mins` minutes make a streak; repeat: how many kills of the same person in 10 minutes (0: don't watch); teams: watch
// Fire, DOT and officer-on-officer kills; pmStaff: message the staff in the server about each new flag
const norm = (s = {}) => ({ on: s.on !== false, kills: Math.max(2, Math.min(10, Math.round(+s.kills || 3))), mins: Math.max(1, Math.min(15, Math.round(+s.mins || 3))),
  repeat: s.repeat === 0 || s.repeat === '0' ? 0 : Math.max(2, Math.min(5, Math.round(+s.repeat || 2))), teams: s.teams !== false, action: ACTIONS.includes(s.action) ? s.action : 'flag', pmStaff: !!s.pmStaff });
export const of = c => norm((communities.byId(c.id) || c).settings.rdm);
export const save = (c, j) => { const s = norm({ ...j, on: !!j.on, teams: !!j.teams, pmStaff: !!j.pmStaff });
  const st = communities.byId(c.id).settings; st.rdm = s; communities.saveSettings(c.id, st); c.settings.rdm = s; return { ok: true, settings: s }; };

const row = r => ({ id: r.id, killer: r.killer, killer_id: r.killer_id || '', team: r.team || '', victims: JSON.parse(r.victims), reasons: JSON.parse(r.reasons), first_at: r.first_at, last_at: r.last_at,
  status: r.status, auto: r.auto || '', done_by: r.done_by || '', done_at: r.done_at || null });
export const list = c => q("SELECT * FROM rdm_flags WHERE community_id = ? ORDER BY (status = 'open') DESC, last_at DESC LIMIT 60").all(c.id).map(row);
export const openCount = c => q("SELECT COUNT(*) n FROM rdm_flags WHERE community_id = ? AND status = 'open'").get(c.id).n;
export const resolve = (c, id, status, by) => { if (!['dismissed', 'handled', 'open'].includes(status)) return { error: 'Unknown choice.' };
  const n = q('UPDATE rdm_flags SET status = ?, done_by = ?, done_at = ? WHERE community_id = ? AND id = ?').run(status, status === 'open' ? null : by.name || '', status === 'open' ? null : now(), c.id, +id || 0).changes;
  return n ? { ok: true } : { error: 'That flag is gone.' }; };

// what the server's teams are for: police may have reasons to kill, fire and DOT never do (c.settings.teams maps a team to pd, fd or dot)
const deptOf = (c, team) => { const T = c.settings.teams || {}; if (team in T) return T[team] || ''; return /police|sheriff|trooper|state/i.test(team) ? 'pd' : /fire|ems|medic/i.test(team) ? 'fd' : /dot|transport/i.test(team) ? 'dot' : ''; };
const split = v => { const [name, id] = String(v || '').split(':'); return { name: name || '', id: /^\d+$/.test(id || '') ? id : '' }; };

// per server: the newest kill already weighed, every kill of the last 15 minutes, and everyone's team on the last reading
const STATE = new Map(); const state = cid => { let st = STATE.get(cid); if (!st) STATE.set(cid, st = { last: null, recent: [], teams: new Map(), staff: [] }); return st; };
let emit = () => {}; export const onFlag = fn => { emit = fn; };

// one reading: the players (for teams) and the kill log
export const check = (c, key, body, kills) => { const s = of(c); if (!s.on) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const st = state(c.id); st.staff = []; for (const p of j.Players || []) { const { name } = split(p.Player); if (!name) continue; st.teams.set(name.toLowerCase(), p.Team || ''); if (p.Permission && p.Permission !== 'Normal') st.staff.push(name); }
  const K = (Array.isArray(kills) ? kills : []).filter(k => Number.isFinite(+k.Timestamp)).sort((a, b) => a.Timestamp - b.Timestamp);
  if (st.last == null) { st.last = K.length ? +K[K.length - 1].Timestamp : 0; return; }   // the first look after a restart only learns where the log is up to
  for (const k of K) { const at = +k.Timestamp; if (at <= st.last) continue; st.last = at;
    const killer = split(k.Killer), victim = split(k.Killed); if (!killer.name || !victim.name || killer.name.toLowerCase() === victim.name.toLowerCase()) continue;
    const kt = st.teams.get(killer.name.toLowerCase()) || '', vt = st.teams.get(victim.name.toLowerCase()) || '', same = (a, b) => a.toLowerCase() === b.toLowerCase();
    st.recent = st.recent.filter(r => at - r.at < 15 * 60); const kill = { killer: killer.name, victim: victim.name, vid: victim.id, vt, at }; st.recent.push(kill);
    const payback = st.recent.some(r => same(r.killer, victim.name) && same(r.victim, killer.name) && at - r.at <= PAYBACK_MIN * 60 && r !== kill);
    const streak = st.recent.filter(r => same(r.killer, killer.name) && at - r.at <= s.mins * 60), again = st.recent.filter(r => same(r.killer, killer.name) && same(r.victim, victim.name) && at - r.at <= REPEAT_MIN * 60);
    const why = [], kd = deptOf(c, kt), vd = deptOf(c, vt);
    if (streak.length >= s.kills) why.push(`${streak.length} kills in ${Math.max(1, Math.ceil((at - streak[0].at) / 60))} min`);
    if (!payback && s.repeat && again.length >= s.repeat) why.push(`Killed ${victim.name} ${again.length} times in ${REPEAT_MIN} min`);
    if (!payback && s.teams && (kd === 'fd' || kd === 'dot')) why.push(`${kt} player killed someone`);
    if (!payback && s.teams && kd === 'pd' && vd === 'pd') why.push('Officer killed another officer');
    // the kills behind the flag: the whole streak and every kill of the same person, not just this one
    const behind = [...(streak.length >= s.kills ? streak : []), ...(why.some(w => w.startsWith('Killed ')) ? again : []), kill].filter((r, i, A) => A.indexOf(r) === i).sort((a, b) => a.at - b.at);
    if (why.length) flag(c, key, s, { killer, team: kt, victims: behind.map(r => ({ name: r.victim, id: r.vid || '', team: r.vt || '', at: r.at })), why, streak: streak.length >= s.kills }, st.staff); } };

// a flag per killer and spree: kills close together add to the open flag instead of making new ones
const flag = (c, key, s, f, staffIn = []) => { const open = q("SELECT * FROM rdm_flags WHERE community_id = ? AND status = 'open' AND lower(killer) = lower(?) AND last_at > ? ORDER BY id DESC LIMIT 1").get(c.id, f.killer.name, now() - Math.max(s.mins, REPEAT_MIN) * 60000);
  let id, fresh = !open, auto = '';
  if (open) { const V = JSON.parse(open.victims), R = [...new Set([...JSON.parse(open.reasons).filter(r => !/^\d+ kills in/.test(r) || !f.why.some(w => /^\d+ kills in/.test(w))), ...f.why])];
    for (const v of f.victims) if (!V.some(x => x.name === v.name && x.at === v.at)) V.push(v); q('UPDATE rdm_flags SET victims = ?, reasons = ?, last_at = ?, killer_id = coalesce(killer_id, ?) WHERE id = ?').run(JSON.stringify(V.slice(-25)), JSON.stringify(R.slice(0, 8)), now(), f.killer.id || null, open.id); id = open.id; }
  else { id = Number(q('INSERT INTO rdm_flags (community_id, killer, killer_id, team, victims, reasons, first_at, last_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, f.killer.name, f.killer.id || null, f.team, JSON.stringify(f.victims.slice(-25)), JSON.stringify(f.why), now(), now()).lastInsertRowid);
    q("DELETE FROM rdm_flags WHERE community_id = ? AND id NOT IN (SELECT id FROM rdm_flags WHERE community_id = ? ORDER BY id DESC LIMIT ?)").run(c.id, c.id, KEEP); }
  // the server's own choice of what Oversite does: message the killer once per flag, and kick on a streak
  const r = q('SELECT auto FROM rdm_flags WHERE id = ?').get(id)?.auto || '';
  if (key && s.action !== 'flag') { const msg = `:pm ${f.killer.name} Staff have been alerted to possible RDM (${f.why[0]}). Killing without a roleplay reason breaks the rules.`.slice(0, 200);
    if (!r.includes('warned')) { commandAs(c, key, msg, NAME); auto = 'warned';
      staffRecords.add({ community_id: c.id, roblox_id: f.killer.id || null, name: f.killer.name, kind: 'warn', reason: 'Possible RDM: ' + f.why.join(', '), by_user: null, by_name: NAME, result: 'sent' }); }
    if (s.action === 'kick' && f.streak && !r.includes('kicked')) { commandAs(c, key, `:kick ${f.killer.name} RDM: ${f.why[0]}`.slice(0, 200), NAME); auto = auto ? auto + ', kicked' : 'kicked';
      staffRecords.add({ community_id: c.id, roblox_id: f.killer.id || null, name: f.killer.name, kind: 'kick', reason: 'RDM: ' + f.why.join(', '), by_user: null, by_name: NAME, result: 'sent' }); }
    if (auto) q('UPDATE rdm_flags SET auto = ? WHERE id = ?').run([r, auto].filter(Boolean).join(', '), id); }
  // the staff in game hear about each new flag (not every kill added to it), up to 6 of them, never the killer
  if (key && s.pmStaff && fresh) for (const n of staffIn.filter(n => n.toLowerCase() !== f.killer.name.toLowerCase()).slice(0, 6))
    commandAs(c, key, `:pm ${n} RDM watch: ${f.killer.name}${f.team ? ' (' + f.team + ')' : ''} - ${f.why.join(', ')}. See Server Staff in the CAD.`.slice(0, 200), NAME);
  console.log(`rdm: ${c.slug} ${fresh ? 'flagged' : 'added to'} ${f.killer.name}: ${f.why.join(', ')}${auto ? ' (' + auto + ')' : ''}`);
  const v = f.victims[f.victims.length - 1]; emit(c, { id, killer: f.killer.name, killer_id: f.killer.id, team: f.team, victim: v.name, victim_id: v.id, victims: f.victims.map(x => x.name), reasons: f.why, new: fresh, auto }); };

export const wantsKills = c => !!c && of(c).on && ok(c);
let ok = () => false;
// runs whether or not anyone has the CAD open: servers with RDM watch on (and allowed it, see `allowed`) are read every 6 seconds
// with their kill log, the live feed's latest answer when it is fresh
export const start = (feedFor, keyOf, allowed) => { ok = allowed; setInterval(async () => {
  for (const c of communities.all()) { if (c.suspended || !ok(c) || !of(c).on) continue; const key = keyOf(c.id); if (!key) continue;
    try { const f = feedFor(c), s = await f.snapshot(); if (s.status === 200) check(c, key, s.body, f.kills); } catch (e) {} } }, 6000); };
