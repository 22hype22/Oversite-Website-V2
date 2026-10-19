// Staff management for a server: shifts (clocked in and out on the site, or started and ended automatically while staff are
// in the ER:LC server, on Premium servers), a weekly target and leaderboard, staff infractions and promotions, leave requests
// and applications. Staff are members ranked Mod or above. Everything that happens is also sent to events.mjs, for the
// server's own bots later. Settings: c.settings.staff = { quota (minutes a week, 0 = none), auto, types: [shift type names] }.
import { db, communities, members, users } from './db.mjs';
import { isPremium } from './premium.mjs';
import { emit } from './events.mjs';
import { on as featureOn } from './features.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS staff_shifts (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL DEFAULT 'General', started INTEGER NOT NULL, ended INTEGER,
  break_ms INTEGER NOT NULL DEFAULT 0, break_at INTEGER, auto INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS staff_shifts_c ON staff_shifts (community_id, started);
CREATE INDEX IF NOT EXISTS staff_shifts_u ON staff_shifts (community_id, user_id, ended);
CREATE TABLE IF NOT EXISTS staff_actions (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, title TEXT NOT NULL, reason TEXT NOT NULL DEFAULT '',
  rank_from TEXT, rank_to TEXT, by_user INTEGER, by_name TEXT, created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS staff_actions_u ON staff_actions (community_id, user_id, created);
CREATE TABLE IF NOT EXISTS staff_leave (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, starts INTEGER NOT NULL, ends INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', by_name TEXT, decided INTEGER, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS staff_forms (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title TEXT NOT NULL, about TEXT NOT NULL DEFAULT '', questions TEXT NOT NULL, open INTEGER NOT NULL DEFAULT 1, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS staff_apps (id INTEGER PRIMARY KEY, form_id INTEGER NOT NULL REFERENCES staff_forms(id) ON DELETE CASCADE,
  community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', by_name TEXT, note TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, decided INTEGER);
CREATE INDEX IF NOT EXISTS staff_apps_f ON staff_apps (form_id, status);`);
const q = sql => db.prepare(sql);
// leave can be from server staff (dept '') or from a department (LOA from Police, Fire or DOT, asked for in the MDT)
try { db.exec("ALTER TABLE staff_leave ADD COLUMN dept TEXT NOT NULL DEFAULT ''"); } catch (e) {}
export const LEAVE_DEPTS = ['pd', 'fd', 'dot'];
const deptName = (c, d) => d ? (c.settings.depts?.[d]?.name || { pd: 'Law Enforcement', fd: 'Fire Department', dot: 'Department of Transportation' }[d]) : 'Server staff';

export const RANK = { member: 1, mod: 2, admin: 3, co_owner: 4, owner: 5 };
export const INFRACTIONS = ['Warning', 'Strike', 'Demotion', 'Suspension', 'Termination'];
const QTYPES = ['short', 'long', 'choice', 'yesno'];
const DAY = 864e5, GAP = 3 * 60000, MIN_SHIFT = 60000;
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
const TL = (v, n) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f]+/g, '').trim().slice(0, n);   // long text keeps its line breaks
const nameOf = u => u ? (u.roblox_name || u.name || 'Unknown') : 'Unknown';
const isStaff = (cid, uid) => (RANK[members.role(cid, uid)] || 0) >= RANK.mod;

// ── settings ──
export const conf = c => { const s = communities.byId(c.id)?.settings.staff || {};
  const types = Array.isArray(s.types) ? s.types.map(t => T(t, 24)).filter(Boolean).slice(0, 8) : [];
  return { quota: Math.max(0, Math.min(10080, Math.round(+s.quota || 0))), auto: !!s.auto, types: types.length ? types : ['General'] }; };
export const saveConf = (c, j) => { const st = communities.byId(c.id).settings;
  st.staff = { quota: Math.max(0, Math.min(10080, Math.round(+j.quota || 0))), auto: !!j.auto,
    types: [...new Set((Array.isArray(j.types) ? j.types : []).map(t => T(t, 24)).filter(Boolean))].slice(0, 8) };
  if (!st.staff.types.length) st.staff.types = ['General'];
  communities.saveSettings(c.id, st); return conf(c); };

// ── time ──
export const weekStart = (t = Date.now()) => { const d = new Date(t), day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day); };   // Monday 00:00 UTC
// time worked inside [from, to): breaks are taken out (spread evenly over the shift, plus a break running now)
const worked = (r, from, to, now = Date.now()) => { const end = r.ended ?? now, s = Math.max(r.started, from), e = Math.min(end, to); if (e <= s) return 0;
  let ms = e - s; const full = Math.max(1, end - r.started); ms -= (r.break_ms || 0) * (e - s) / full;
  if (r.break_at && r.ended == null) ms -= Math.max(0, Math.min(e, now) - Math.max(r.break_at, s));
  return Math.max(0, ms); };
const totals = (cid, from, to) => { const out = new Map();
  for (const r of q('SELECT * FROM staff_shifts WHERE community_id = ? AND started < ? AND (ended IS NULL OR ended > ?)').all(cid, to, from)) out.set(r.user_id, (out.get(r.user_id) || 0) + worked(r, from, to));
  return out; };
const openShift = (cid, uid) => q('SELECT * FROM staff_shifts WHERE community_id = ? AND user_id = ? AND ended IS NULL ORDER BY id DESC LIMIT 1').get(cid, uid) || null;
const shiftView = r => r && { id: r.id, type: r.type, started: r.started, onBreak: !!r.break_at, breakAt: r.break_at || 0, breakMs: r.break_ms || 0, auto: !!r.auto };
const close = (cid, r, at, by) => { let br = r.break_ms || 0; if (r.break_at) br += Math.max(0, at - r.break_at);
  if (at - r.started < MIN_SHIFT) { q('DELETE FROM staff_shifts WHERE id = ?').run(r.id); return 0; }
  q('UPDATE staff_shifts SET ended = ?, break_ms = ?, break_at = NULL WHERE id = ?').run(at, br, r.id);
  const mins = Math.round((at - r.started - br) / 60000); emit(cid, 'shift.end', { user: r.user_id, name: nameOf(users.byId(r.user_id)), type: r.type, minutes: mins, auto: !!r.auto, by }); return mins; };

// ── clocking in and out on the site ──
export const clock = (c, user, action, type) => { if (!isStaff(c.id, user.id)) return { error: 'Only staff (Mod and up) have shifts.' };
  const o = openShift(c.id, user.id), now = Date.now(), C = conf(c);
  if (action === 'start') { if (o) return { error: 'You are already on shift.' };
    const t = C.types.includes(type) ? type : C.types[0];
    q('INSERT INTO staff_shifts (community_id, user_id, type, started) VALUES (?, ?, ?, ?)').run(c.id, user.id, t, now);
    emit(c.id, 'shift.start', { user: user.id, name: nameOf(user), type: t, auto: false }); return { ok: true }; }
  if (!o) return { error: 'You are not on shift.' };
  if (action === 'break') { if (o.break_at) return { error: 'You are already on break.' }; q('UPDATE staff_shifts SET break_at = ? WHERE id = ?').run(now, o.id); emit(c.id, 'shift.break', { user: user.id, name: nameOf(user) }); return { ok: true }; }
  if (action === 'resume') { if (!o.break_at) return { error: 'You are not on break.' }; q('UPDATE staff_shifts SET break_ms = break_ms + ?, break_at = NULL WHERE id = ?').run(now - o.break_at, o.id); emit(c.id, 'shift.resume', { user: user.id, name: nameOf(user) }); return { ok: true }; }
  if (action === 'end') { const mins = close(c.id, o, now, nameOf(user)); return { ok: true, minutes: mins }; }
  return { error: 'Unknown action.' }; };
// an admin ends someone's shift that was left running
export const endFor = (c, actor, uid) => { const o = openShift(c.id, +uid); if (!o) return { error: 'They are not on shift.' }; close(c.id, o, Date.now(), nameOf(actor)); return { ok: true }; };

// ── automatic shifts: staff in the ER:LC server are on shift (Premium servers that switched it on) ──
const LAST = new Map(), SEEN = new Map();
export const observe = (cid, body) => { const now = Date.now(); if (now - (LAST.get(cid) || 0) < 15000) return; LAST.set(cid, now);
  const c = communities.byId(cid); if (!c || !conf(c).auto || !isPremium(c)) return;
  let j; try { j = JSON.parse(body); } catch (e) { return; }
  const here = new Set((j.Players || []).map(p => (String(p.Player || '').match(/(\d{3,20})\s*$/) || [])[1]).filter(Boolean));
  const seen = SEEN.get(cid) || new Map(); SEEN.set(cid, seen);
  for (const s of members.staffOf(cid)) { if (!s.roblox_id) continue; const o = openShift(cid, s.id);
    if (here.has(String(s.roblox_id))) { seen.set(s.id, now);
      if (!o) { q('INSERT INTO staff_shifts (community_id, user_id, type, started, auto) VALUES (?, ?, ?, ?, 1)').run(cid, s.id, 'In game', now); emit(cid, 'shift.start', { user: s.id, name: nameOf(s), type: 'In game', auto: true }); } }
    else if (o && o.auto) { if (!seen.has(s.id)) seen.set(s.id, now);                       // after a restart: give them the usual grace from now
      if (now - seen.get(s.id) > GAP) { close(cid, o, seen.get(s.id), 'auto'); seen.delete(s.id); } } } };

// ── the board: who is on shift, hours this week against the target, who is on leave ──
const onLeave = (cid, from, to) => { const m = new Map(); for (const l of q("SELECT user_id, starts, ends FROM staff_leave WHERE community_id = ? AND dept = '' AND status = 'approved' AND starts < ? AND ends >= ?").all(cid, to, from)) m.set(l.user_id, l); return m; };
export const board = c => { const now = Date.now(), wk = weekStart(now), C = conf(c), week = totals(c.id, wk, now), month = totals(c.id, now - 30 * DAY, now), leave = onLeave(c.id, wk, now + 7 * DAY);
  const open = new Map(q('SELECT * FROM staff_shifts WHERE community_id = ? AND ended IS NULL').all(c.id).map(r => [r.user_id, r]));
  return members.staffOf(c.id).map(s => { const l = leave.get(s.id), wMs = week.get(s.id) || 0;
    return { id: s.id, name: nameOf(s), rid: s.roblox_id || '', role: s.role, week: Math.round(wMs / 60000), month: Math.round((month.get(s.id) || 0) / 60000),
      shift: shiftView(open.get(s.id)), leave: l ? { starts: l.starts, ends: l.ends, now: l.starts <= now && l.ends >= now } : null,
      met: !C.quota || wMs / 60000 >= C.quota || !!l }; }).sort((a, b) => b.week - a.week || a.name.localeCompare(b.name)); };

// one staff member: their record, recent shifts and leave
export const person = (c, uid) => { const u = users.byId(+uid), role = members.role(c.id, +uid); if (!u || !role) return { error: 'They are not in this server.' };
  const now = Date.now();
  return { id: u.id, name: nameOf(u), rid: u.roblox_id || '', role, total: Math.round([...totals(c.id, 0, now).entries()].filter(([k]) => k === u.id).reduce((a, [, v]) => a + v, 0) / 60000),
    actions: q('SELECT id, kind, title, reason, rank_from, rank_to, by_name, created FROM staff_actions WHERE community_id = ? AND user_id = ? ORDER BY created DESC LIMIT 100').all(c.id, u.id),
    shifts: q('SELECT * FROM staff_shifts WHERE community_id = ? AND user_id = ? ORDER BY started DESC LIMIT 20').all(c.id, u.id).map(r => ({ type: r.type, started: r.started, ended: r.ended, auto: !!r.auto, minutes: Math.round(worked(r, 0, Infinity) / 60000) })),
    leave: q('SELECT id, starts, ends, reason, status, by_name, dept FROM staff_leave WHERE community_id = ? AND user_id = ? ORDER BY starts DESC LIMIT 20').all(c.id, u.id).map(l => ({ ...l, dept_name: deptName(c, l.dept) })) }; };

// ── infractions and promotions ──
const canActOn = (c, actorId, actorRole, uid) => { if (+uid === actorId) return 'You can’t add a record to yourself.';
  const tr = members.role(c.id, +uid); if (!tr) return 'They are not in this server.';
  if (actorRole !== 'owner' && (RANK[tr] || 0) >= (RANK[actorRole] || 0)) return 'You can only add records for staff ranked below you.';
  return null; };
export const addAction = (c, actor, actorRole, j) => { if ((RANK[actorRole] || 0) < RANK.admin) return { error: 'Only admins and up can add staff records.' };
  const err = canActOn(c, actor.id, actorRole, j.user); if (err) return { error: err };
  const kind = j.kind === 'promotion' ? 'promotion' : 'infraction';
  const title = kind === 'infraction' ? (INFRACTIONS.includes(j.title) ? j.title : null) : T(j.title, 60) || 'Promotion';
  if (!title) return { error: 'Pick the kind of infraction.' };
  const reason = TL(j.reason, 1000); if (!reason) return { error: 'Write the reason.' };
  const from = members.role(c.id, +j.user); let to = null;
  if (j.rank && j.rank !== from) {   // optionally change their Oversite rank too, never to your own rank or above
    if (!['member', 'mod', 'admin', 'co_owner'].includes(j.rank) || (RANK[j.rank] >= RANK[actorRole] && actorRole !== 'owner')) return { error: 'You can’t give that rank.' };
    if (+j.user === c.owner_id) return { error: 'The server’s creator keeps their rank.' };
    members.setRole(c.id, +j.user, j.rank); to = j.rank; }
  const id = q('INSERT INTO staff_actions (community_id, user_id, kind, title, reason, rank_from, rank_to, by_user, by_name, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, +j.user, kind, title, reason, to ? from : null, to, actor.id, nameOf(actor), Date.now()).lastInsertRowid;
  emit(c.id, kind === 'promotion' ? 'staff.promotion' : 'staff.infraction', { id, user: +j.user, name: nameOf(users.byId(+j.user)), title, reason, rankFrom: to ? from : null, rankTo: to, by: nameOf(actor) });
  return { ok: true, id }; };
export const delAction = (c, actorRole, id) => { if ((RANK[actorRole] || 0) < RANK.co_owner) return { error: 'Only the owner and co-owners can delete staff records.' };
  q('DELETE FROM staff_actions WHERE id = ? AND community_id = ?').run(+id, c.id); return { ok: true }; };

// ── leave ──
const day = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '')); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
export const requestLeave = (c, user, j) => { const dept = LEAVE_DEPTS.includes(j.dept) ? j.dept : '';
  if (!dept && !isStaff(c.id, user.id)) return { error: 'Only staff can request staff leave. Pick your department instead.' };
  if (dept && !members.role(c.id, user.id)) return { error: 'Join this server first.' };
  const s = day(j.starts), e = day(j.ends); if (!Number.isFinite(s) || !Number.isFinite(e)) return { error: 'Pick the first and last day.' };
  if (e < s) return { error: 'The last day is before the first.' }; if (s < weekStart() - 7 * DAY) return { error: 'Leave can’t start that far in the past.' };
  if (e - s > 90 * DAY) return { error: 'Leave can be up to 90 days. Ask again after that.' };
  const reason = TL(j.reason, 500); if (!reason) return { error: 'Say why you need the time off.' };
  if (q("SELECT COUNT(*) AS n FROM staff_leave WHERE community_id = ? AND user_id = ? AND status = 'pending'").get(c.id, user.id).n >= 3) return { error: 'You already have requests waiting. Wait for those first.' };
  const id = q('INSERT INTO staff_leave (community_id, user_id, starts, ends, reason, created, dept) VALUES (?, ?, ?, ?, ?, ?, ?)').run(c.id, user.id, s, e + DAY - 1, reason, Date.now(), dept).lastInsertRowid;
  emit(c.id, 'leave.request', { id, user: user.id, name: nameOf(user), discord_id: user.discord_id || null, roblox_id: user.roblox_id ? String(user.roblox_id) : null, dept: dept || 'staff', dept_name: deptName(c, dept), starts: s, ends: e + DAY - 1, reason }); return { ok: true, id }; };
export const decideLeave = (c, actor, actorRole, id, approve) => { if ((RANK[actorRole] || 0) < RANK.admin) return { error: 'Only admins and up can approve leave.' };
  const l = q('SELECT * FROM staff_leave WHERE id = ? AND community_id = ?').get(+id, c.id); if (!l) return { error: 'No such request.' };
  if (l.user_id === actor.id && actorRole !== 'owner') return { error: 'Someone else has to approve your own leave.' };
  if (l.status !== 'pending') return { error: 'That request was already answered.' };
  const status = approve ? 'approved' : 'denied'; q('UPDATE staff_leave SET status = ?, by_name = ?, decided = ? WHERE id = ?').run(status, nameOf(actor), Date.now(), l.id);
  const who = users.byId(l.user_id); emit(c.id, 'leave.decided', { id: l.id, user: l.user_id, name: nameOf(who), discord_id: who?.discord_id || null, roblox_id: who?.roblox_id ? String(who.roblox_id) : null, dept: l.dept || 'staff', dept_name: deptName(c, l.dept), starts: l.starts, ends: l.ends, status, by: nameOf(actor) }); return { ok: true }; };
export const cancelLeave = (c, user, id) => { const l = q('SELECT * FROM staff_leave WHERE id = ? AND community_id = ? AND user_id = ?').get(+id, c.id, user.id); if (!l) return { error: 'No such request.' };
  if (l.status === 'approved' && l.ends < Date.now()) return { error: 'That leave is over.' };
  q("UPDATE staff_leave SET status = 'cancelled', decided = ? WHERE id = ?").run(Date.now(), l.id); return { ok: true }; };
export const leaveList = c => q(`SELECT l.id, l.user_id, l.starts, l.ends, l.reason, l.status, l.by_name, l.created, l.dept, u.roblox_name, u.name FROM staff_leave l JOIN users u ON u.id = l.user_id
  WHERE l.community_id = ? AND (l.status = 'pending' OR l.ends > ?) AND l.status != 'cancelled' ORDER BY l.status = 'pending' DESC, l.starts LIMIT 200`).all(c.id, Date.now() - 30 * DAY)
  .map(l => ({ id: l.id, user: l.user_id, name: l.roblox_name || l.name, starts: l.starts, ends: l.ends, reason: l.reason, status: l.status, by: l.by_name, created: l.created, dept: l.dept || '', dept_name: deptName(c, l.dept) }));
// someone's own leave requests, for the MDT
export const myLeave = (c, user) => q("SELECT id, starts, ends, reason, status, by_name, dept FROM staff_leave WHERE community_id = ? AND user_id = ? AND status != 'cancelled' ORDER BY created DESC LIMIT 10").all(c.id, user.id)
  .map(l => ({ id: l.id, starts: l.starts, ends: l.ends, reason: l.reason, status: l.status, by: l.by_name, dept: l.dept || '', dept_name: deptName(c, l.dept) }));
// pending and recent requests, for bots that read them instead of being sent events
export const leaveForBots = (c, status) => q(`SELECT l.*, u.roblox_name, u.name, u.discord_id, u.roblox_id FROM staff_leave l JOIN users u ON u.id = l.user_id WHERE l.community_id = ? ${status === 'pending' ? "AND l.status = 'pending'" : "AND l.status != 'cancelled'"} ORDER BY l.created DESC LIMIT 50`).all(c.id)
  .map(l => ({ id: l.id, name: l.roblox_name || l.name, discord_id: l.discord_id || null, roblox_id: l.roblox_id ? String(l.roblox_id) : null, dept: l.dept || 'staff', dept_name: deptName(c, l.dept), starts: l.starts, ends: l.ends, reason: l.reason, status: l.status, by: l.by_name || null, created: l.created }));

// ── applications ──
const cleanQs = qs => (Array.isArray(qs) ? qs : []).slice(0, 25).map(x => ({ q: T(x?.q, 200), type: QTYPES.includes(x?.type) ? x.type : 'short', req: x?.req !== false,
  options: x?.type === 'choice' ? [...new Set((Array.isArray(x.options) ? x.options : []).map(o => T(o, 60)).filter(Boolean))].slice(0, 10) : undefined })).filter(x => x.q);
const formOut = f => f && { id: f.id, title: f.title, about: f.about, questions: JSON.parse(f.questions), open: !!f.open, created: f.created };
export const forms = c => q('SELECT * FROM staff_forms WHERE community_id = ? ORDER BY id').all(c.id).map(f => ({ ...formOut(f),
  pending: q("SELECT COUNT(*) AS n FROM staff_apps WHERE form_id = ? AND status = 'pending'").get(f.id).n, total: q('SELECT COUNT(*) AS n FROM staff_apps WHERE form_id = ?').get(f.id).n }));
export const form = (c, id) => formOut(q('SELECT * FROM staff_forms WHERE id = ? AND community_id = ?').get(+id, c.id));
export const saveForm = (c, actorRole, j) => { if ((RANK[actorRole] || 0) < RANK.admin) return { error: 'Only admins and up can edit applications.' };
  const title = T(j.title, 60); if (!title) return { error: 'Give the application a title.' };
  const qs = cleanQs(j.questions); if (!qs.length) return { error: 'Add at least one question.' };
  if (qs.some(x => x.type === 'choice' && (!x.options || x.options.length < 2))) return { error: 'Multiple choice questions need at least two answers.' };
  const about = TL(j.about, 800), open = j.open !== false ? 1 : 0;
  if (j.id) { const r = q('UPDATE staff_forms SET title = ?, about = ?, questions = ?, open = ? WHERE id = ? AND community_id = ?').run(title, about, JSON.stringify(qs), open, +j.id, c.id); if (!r.changes) return { error: 'No such application.' }; return { ok: true, id: +j.id }; }
  if (q('SELECT COUNT(*) AS n FROM staff_forms WHERE community_id = ?').get(c.id).n >= 20) return { error: 'A server can have up to 20 applications.' };
  return { ok: true, id: q('INSERT INTO staff_forms (community_id, title, about, questions, open, created) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, title, about, JSON.stringify(qs), open, Date.now()).lastInsertRowid }; };
export const delForm = (c, actorRole, id) => { if ((RANK[actorRole] || 0) < RANK.co_owner) return { error: 'Only the owner and co-owners can delete an application and its answers.' };
  q('DELETE FROM staff_forms WHERE id = ? AND community_id = ?').run(+id, c.id); return { ok: true }; };
export const apply = (c, user, id, answers) => { const f = form(c, id); if (!f || !f.open) return { error: 'This application is closed.' };
  if (!user.roblox_id) return { error: 'Link your Roblox account first, so the server knows who is applying.' };
  if (q("SELECT COUNT(*) AS n FROM staff_apps WHERE form_id = ? AND user_id = ? AND status = 'pending'").get(f.id, user.id).n) return { error: 'You already applied. Wait for an answer before applying again.' };
  if (q('SELECT COUNT(*) AS n FROM staff_apps WHERE form_id = ? AND user_id = ? AND created > ?').get(f.id, user.id, Date.now() - DAY).n >= 2) return { error: 'You can apply twice a day at most.' };
  const A = Array.isArray(answers) ? answers : [], out = [];
  for (let i = 0; i < f.questions.length; i++) { const qq = f.questions[i]; let a = qq.type === 'long' ? TL(A[i], 3000) : T(A[i], qq.type === 'short' ? 300 : 60);
    if (qq.type === 'choice' && a && !qq.options.includes(a)) a = ''; if (qq.type === 'yesno' && a && !['Yes', 'No'].includes(a)) a = '';
    if (qq.req && !a) return { error: `Answer question ${i + 1}: ${qq.q}` }; out.push(a); }
  const aid = q('INSERT INTO staff_apps (form_id, community_id, user_id, answers, created) VALUES (?, ?, ?, ?, ?)').run(f.id, c.id, user.id, JSON.stringify(out), Date.now()).lastInsertRowid;
  emit(c.id, 'application.new', { id: aid, form: f.id, title: f.title, user: user.id, name: nameOf(user) }); return { ok: true, id: aid }; };
export const apps = (c, formId, status) => q(`SELECT a.*, u.roblox_name, u.name, u.roblox_id, u.discord_id FROM staff_apps a JOIN users u ON u.id = a.user_id WHERE a.community_id = ? AND a.form_id = ?
  ${['pending', 'accepted', 'denied'].includes(status) ? 'AND a.status = ?' : ''} ORDER BY a.status = 'pending' DESC, a.created DESC LIMIT 200`).all(c.id, +formId, ...(['pending', 'accepted', 'denied'].includes(status) ? [status] : []))
  .map(a => ({ id: a.id, user: a.user_id, name: a.roblox_name || a.name, rid: a.roblox_id || '', discord: !!a.discord_id, answers: JSON.parse(a.answers), status: a.status, by: a.by_name, note: a.note, created: a.created, decided: a.decided,
    member: members.role(c.id, a.user_id) }));
export const decideApp = (c, actor, actorRole, id, accept, note, makeMod) => { if ((RANK[actorRole] || 0) < RANK.admin) return { error: 'Only admins and up can answer applications.' };
  const a = q('SELECT * FROM staff_apps WHERE id = ? AND community_id = ?').get(+id, c.id); if (!a) return { error: 'No such application.' };
  if (a.status !== 'pending') return { error: 'That application was already answered.' };
  const status = accept ? 'accepted' : 'denied';
  q('UPDATE staff_apps SET status = ?, by_name = ?, note = ?, decided = ? WHERE id = ?').run(status, nameOf(actor), TL(note, 1000), Date.now(), a.id);
  if (accept && makeMod) members.raise(c.id, a.user_id, 'mod');   // joins the server if needed, and becomes a Mod (never lowers anyone)
  emit(c.id, 'application.decided', { id: a.id, form: a.form_id, user: a.user_id, name: nameOf(users.byId(a.user_id)), status, by: nameOf(actor), madeMod: !!(accept && makeMod) }); return { ok: true }; };
export const myApps = (c, user) => q('SELECT a.id, a.form_id, a.status, a.note, a.created, a.decided, f.title FROM staff_apps a JOIN staff_forms f ON f.id = a.form_id WHERE a.community_id = ? AND a.user_id = ? ORDER BY a.created DESC LIMIT 20').all(c.id, user.id);

// everything the staff page needs in one request
export const state = (c, user, role) => { const r = RANK[role] || 0, C = conf(c), b = board(c);
  return { me: { id: user.id, role, shift: shiftView(openShift(c.id, user.id)) }, conf: C, premium: isPremium(c), board: b, weekStart: weekStart(), infractions: INFRACTIONS,
    leave: leaveList(c).filter(l => r >= RANK.admin || l.user === user.id || l.status === 'approved'),
    forms: r >= RANK.admin ? forms(c) : [], courses: featureOn(c, 'courses'), can: { manage: r >= RANK.admin, settings: r >= RANK.co_owner, owner: role === 'owner' } }; };
