// Duty shifts from the MDT: someone in a department (Police, Fire, DOT) starts and ends their shift from the menu under their
// name, for when they forget the Discord bot's /shift. They can fix their own shifts afterwards (the times, or delete one made by
// mistake): never in the future, never overlapping another of theirs, at most 12 hours. Every change is kept with what it was
// before and after, and the department's supervisors see that list. A linked Oversite bot reads the shifts
// (GET /api/bot/v1/duty-shifts) and counts them with its own Discord shifts, once: time on both at the same moment counts once.
import { db } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS duty_shifts (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, dept TEXT NOT NULL, started INTEGER NOT NULL, ended INTEGER, deleted INTEGER NOT NULL DEFAULT 0, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS duty_shifts_u ON duty_shifts (community_id, user_id, started);
CREATE INDEX IF NOT EXISTS duty_shifts_up ON duty_shifts (community_id, updated);
CREATE TABLE IF NOT EXISTS duty_shift_log (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, shift_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL, dept TEXT NOT NULL, action TEXT NOT NULL, before TEXT, after TEXT, by_user INTEGER, by_name TEXT, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS duty_shift_log_c ON duty_shift_log (community_id, dept, at);`);
const q = sql => db.prepare(sql);

export const DEPTS = ['pd', 'fd', 'dot'];
const NAMES = { pd: 'Law Enforcement', fd: 'Fire Department', dot: 'Department of Transportation' };
export const deptName = (c, d) => c.settings.depts?.[d]?.name || NAMES[d] || d;
const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
export const MAX = 12 * HOUR;        // a shift is at most this long; one left open ends itself here
const BACK = 30 * DAY;               // how far back a shift can be moved or added
const nameOf = u => u ? (u.roblox_name || u.name || 'Unknown') : 'Unknown';
const snap = s => s && JSON.stringify({ dept: s.dept, started: s.started, ended: s.ended ?? null });
const note = (c, s, action, before, after, by) => q('INSERT INTO duty_shift_log (community_id, shift_id, user_id, dept, action, before, after, by_user, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  .run(c.id, s.id, s.user_id, s.dept, action, snap(before), snap(after), by?.id ?? null, by ? nameOf(by) : 'Oversite', Date.now());
const get = (c, id) => q('SELECT * FROM duty_shifts WHERE id = ? AND community_id = ?').get(+id, c.id);
const openOf = (cid, uid) => q('SELECT * FROM duty_shifts WHERE community_id = ? AND user_id = ? AND ended IS NULL AND deleted = 0').get(cid, uid);

// a shift left open past 12 hours ends at 12 hours (checked on every read; bots read every minute)
const settle = c => { const now = Date.now();
  for (const s of q('SELECT * FROM duty_shifts WHERE community_id = ? AND ended IS NULL AND deleted = 0 AND started <= ?').all(c.id, now - MAX)) {
    q('UPDATE duty_shifts SET ended = ?, updated = ? WHERE id = ?').run(s.started + MAX, now, s.id); note(c, s, 'auto_end', s, { ...s, ended: s.started + MAX }, null); } };

// another of their shifts that would share time with [a, b)
const clash = (c, uid, a, b, skip = 0) => q('SELECT id FROM duty_shifts WHERE community_id = ? AND user_id = ? AND deleted = 0 AND id != ? AND started < ? AND COALESCE(ended, ?) > ?')
  .get(c.id, uid, skip, b, Date.now(), a);

export const start = (c, user, dept) => { if (!DEPTS.includes(dept)) return { error: 'Pick your department.' }; settle(c);
  const o = openOf(c.id, user.id); if (o) return { error: `You’re already on shift with ${deptName(c, o.dept)}. End that one first.` };
  const now = Date.now(); if (clash(c, user.id, now, now + 1)) return { error: 'You already have a shift at this time.' };
  const id = q('INSERT INTO duty_shifts (community_id, user_id, dept, started, updated) VALUES (?, ?, ?, ?, ?)').run(c.id, user.id, dept, now, now).lastInsertRowid;
  const s = get(c, id); note(c, s, 'start', null, s, user); return { ok: true, shift: s }; };

export const end = (c, user) => { settle(c); const o = openOf(c.id, user.id); if (!o) return { error: 'You’re not on shift.' };
  const now = Date.now(); q('UPDATE duty_shifts SET ended = ?, updated = ? WHERE id = ?').run(now, now, o.id); const s = get(c, o.id); note(c, s, 'end', o, s, user); return { ok: true, shift: s }; };

// fixing your own shift: new start and end times (an open shift only takes a new start)
export const edit = (c, user, id, j) => { settle(c); const s = get(c, id); if (!s || s.deleted || s.user_id !== user.id) return { error: 'That shift isn’t yours, or is gone.' };
  const now = Date.now(), a = Math.round(+j.started), b = s.ended == null ? null : Math.round(+j.ended);
  if (!Number.isFinite(a) || (s.ended != null && !Number.isFinite(b))) return { error: 'Pick the start and end times.' };
  if (a > now + MIN || (b != null && b > now + MIN)) return { error: 'A shift can’t be in the future.' };
  if (a < now - BACK) return { error: 'Shifts can only be fixed for the last 30 days.' };
  if (b != null && b <= a) return { error: 'The end has to be after the start.' };
  if ((b ?? now) - a > MAX) return { error: 'A shift can be at most 12 hours.' };
  if (clash(c, user.id, a, b ?? now, s.id)) return { error: 'That would overlap another of your shifts.' };
  if (a === s.started && b === s.ended) return { ok: true, shift: s };
  q('UPDATE duty_shifts SET started = ?, ended = ?, updated = ? WHERE id = ?').run(Math.min(a, now), b == null ? null : Math.min(b, now), now, s.id);
  const after = get(c, s.id); note(c, after, 'edit', s, after, user); return { ok: true, shift: after }; };

// adding a shift you forgot to start: a finished one, with the same rules
export const add = (c, user, j) => { if (!DEPTS.includes(j.dept)) return { error: 'Pick your department.' }; settle(c);
  const now = Date.now(), a = Math.round(+j.started), b = Math.round(+j.ended);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { error: 'Pick the start and end times.' };
  if (a > now + MIN || b > now + MIN) return { error: 'A shift can’t be in the future.' };
  if (a < now - BACK) return { error: 'Shifts can only be added for the last 30 days.' };
  if (b <= a) return { error: 'The end has to be after the start.' }; if (b - a > MAX) return { error: 'A shift can be at most 12 hours.' };
  if (clash(c, user.id, a, b)) return { error: 'That would overlap another of your shifts.' };
  const id = q('INSERT INTO duty_shifts (community_id, user_id, dept, started, ended, updated) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, user.id, j.dept, a, Math.min(b, now), now).lastInsertRowid;
  const s = get(c, id); note(c, s, 'add', null, s, user); return { ok: true, shift: s }; };

export const remove = (c, user, id) => { const s = get(c, id); if (!s || s.deleted || s.user_id !== user.id) return { error: 'That shift isn’t yours, or is gone.' };
  const now = Date.now(); q('UPDATE duty_shifts SET deleted = 1, ended = COALESCE(ended, ?), updated = ? WHERE id = ?').run(now, now, s.id); note(c, s, 'delete', s, null, user); return { ok: true }; };

// what the MDT shows you: your open shift, your recent ones, and this week's time per department
const weekStart = (t = Date.now()) => { const d = new Date(t), day = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day); };
const out = (c, s) => ({ id: s.id, dept: s.dept, dept_name: deptName(c, s.dept), started: s.started, ended: s.ended ?? null });
export const mine = (c, user) => { settle(c); const now = Date.now(), wk = weekStart(now);
  const L = q('SELECT * FROM duty_shifts WHERE community_id = ? AND user_id = ? AND deleted = 0 ORDER BY started DESC LIMIT 20').all(c.id, user.id);
  const week = {}; for (const s of q('SELECT * FROM duty_shifts WHERE community_id = ? AND user_id = ? AND deleted = 0 AND COALESCE(ended, ?) > ?').all(c.id, user.id, now, wk))
    week[s.dept] = (week[s.dept] || 0) + Math.max(0, (s.ended ?? now) - Math.max(s.started, wk));
  const o = L.find(s => s.ended == null); return { open: o ? out(c, o) : null, shifts: L.map(s => out(c, s)), week, max: MAX, linked: !!user.discord_id }; };

// the changes to a department's shifts, newest first, for its supervisors
const parse = t => { try { return t ? JSON.parse(t) : null; } catch (e) { return null; } };
export const changes = (c, depts) => { if (!depts.length) return [];
  return q(`SELECT l.*, u.roblox_name, u.name FROM duty_shift_log l LEFT JOIN users u ON u.id = l.user_id WHERE l.community_id = ? AND l.dept IN (${depts.map(() => '?').join(',')}) AND l.action IN ('edit', 'add', 'delete', 'auto_end') ORDER BY l.at DESC LIMIT 100`)
    .all(c.id, ...depts).map(l => ({ id: l.id, shift: l.shift_id, who: l.roblox_name || l.name || 'Unknown', dept: l.dept, dept_name: deptName(c, l.dept), action: l.action, before: parse(l.before), after: parse(l.after), by: l.by_name, at: l.at })); };

// for a linked bot: every shift changed since a time (deleted ones too, so the bot drops them), newest change last
export const forBots = (c, depts, since) => { settle(c); const now = Date.now(), from = Math.max(+since || 0, now - 35 * DAY);
  const L = q(`SELECT s.*, u.discord_id, u.roblox_id, u.roblox_name, u.name FROM duty_shifts s JOIN users u ON u.id = s.user_id WHERE s.community_id = ? AND s.updated >= ? AND s.dept IN (${depts.map(() => '?').join(',')}) ORDER BY s.updated LIMIT 1000`)
    .all(c.id, from, ...depts);
  return { now, shifts: L.map(s => ({ id: s.id, department: s.dept, department_name: deptName(c, s.dept), discord_id: s.discord_id || null, roblox_id: s.roblox_id ? String(s.roblox_id) : null,
    name: s.roblox_name || s.name || null, started: s.started, ended: s.ended ?? null, deleted: !!s.deleted, updated: s.updated })) }; };
