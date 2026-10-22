// Location notes: information pinned to a place on the map for whoever responds there. Not a CAD record about a person; a note about
// a building or spot. A fire pre-incident plan marks the exits, hydrants, the connection for the sprinklers, where to park the
// engines, the key box and shutoffs; a police premise note says what to know before going in. Each note has a pin and covers either
// a circle around it or an area drawn on the map (a whole town like High Rock): a 911 call inside it brings the note up for the units. Fire notes are for the fire department, police notes for police,
// and "everyone" notes for every department; dispatch (not in game) and staff see them all, players on the civilian team none.
// Points are ER:LC map pixels (5355 across), like the other map tools.
import { db, now } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS premises (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, dept TEXT NOT NULL,
  kind TEXT NOT NULL, title TEXT NOT NULL, address TEXT, x REAL NOT NULL, z REAL NOT NULL, radius REAL NOT NULL, body TEXT, points TEXT NOT NULL DEFAULT '[]',
  by_user INTEGER, by_name TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL, updated_by TEXT);
CREATE INDEX IF NOT EXISTS premises_c ON premises (community_id);`);
// area: an outline drawn on the map, [[x, z], ...] (null: the circle)
if (!db.prepare('PRAGMA table_info(premises)').all().some(c => c.name === 'area')) db.exec('ALTER TABLE premises ADD COLUMN area TEXT');
const q = sql => db.prepare(sql);
export const DEPTS = ['fd', 'pd', 'all'];
export const KINDS = { preplan: 'Pre-incident plan', premise: 'Premise note', hazard: 'Hazard', access: 'Access and parking' };
export const POINTS = { exit: 'Exit', entry: 'Entry', hydrant: 'Hydrant', fdc: 'Fire dept. connection', staging: 'Staging / parking', knox: 'Key box', shutoff: 'Utility shutoff', hazard: 'Hazard', stairs: 'Stairs', camera: 'Camera', note: 'Note' };
export const RADII = { small: 40, medium: 80, large: 150 };
export const MAX = 200, MAX_POINTS = 40, MAX_AREA = 120;
const SIZE = 5355, num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, n);
const row = r => ({ id: r.id, dept: r.dept, kind: r.kind, title: r.title, address: r.address || '', x: r.x, z: r.z, radius: r.radius, area: r.area ? JSON.parse(r.area) : null, body: r.body || '', points: JSON.parse(r.points || '[]'),
  by: r.by_name || '', created: r.created, updated: r.updated, updated_by: r.updated_by || '' });

// which notes someone sees: side is their side in game ('pd' | 'fd' | 'dot' | 'civ'), null/undefined when not in game; staff see all
export const visible = (side, staff) => staff || side == null ? DEPTS : side === 'civ' ? [] : side === 'pd' ? ['pd', 'all'] : side === 'fd' ? ['fd', 'all'] : ['all'];
export const list = (c, depts) => depts.length ? q(`SELECT * FROM premises WHERE community_id = ? AND dept IN (${depts.map(() => '?').join(',')}) ORDER BY title COLLATE NOCASE`).all(c.id, ...depts).map(row) : [];

// add or change one: j = { id?, dept, kind, title, address, x, z, radius, area: [[x, z], ...] | null, body, points: [{ type, x, z, label }] }; may = departments this person may write to
export const save = (c, by, may, j) => { const dept = DEPTS.includes(j.dept) ? j.dept : ''; if (!dept || !may.includes(dept)) return { error: 'You can’t write notes for that department.' };
  const title = T(j.title, 60); if (!title) return { error: 'Give the place a name.' }; if (!Number.isFinite(+j.x) || !Number.isFinite(+j.z)) return { error: 'Put it on the map.' };
  const kind = KINDS[j.kind] ? j.kind : 'premise', ar = Array.isArray(j.area) ? j.area.filter(a => Array.isArray(a) && Number.isFinite(+a[0]) && Number.isFinite(+a[1])).slice(0, MAX_AREA).map(a => [num(a[0]), num(a[1])]) : [];
  if (Array.isArray(j.area) && j.area.length && ar.length < 3) return { error: 'Draw the area again: drag all the way around it.' };
  const area = ar.length >= 3 ? ar : null, radius = area ? Math.round(Math.max(20, ...area.map(a => Math.hypot(a[0] - num(j.x), a[1] - num(j.z))))) : Math.max(20, Math.min(400, Math.round(+j.radius || RADII.medium)));   // for an area: how far it reaches from the pin
  const points = (Array.isArray(j.points) ? j.points : []).slice(0, MAX_POINTS).filter(p => POINTS[p?.type] && Number.isFinite(+p.x) && Number.isFinite(+p.z)).map(p => ({ type: p.type, x: num(p.x), z: num(p.z), label: T(p.label, 60) }));
  const v = [dept, kind, title, T(j.address, 80), num(j.x), num(j.z), radius, area && JSON.stringify(area), T(j.body, 3000), JSON.stringify(points)], t = now();
  if (j.id) { const old = q('SELECT * FROM premises WHERE community_id = ? AND id = ?').get(c.id, +j.id || 0); if (!old) return { error: 'That note is gone.' }; if (!may.includes(old.dept)) return { error: 'You can’t change that note.' };
    q('UPDATE premises SET dept = ?, kind = ?, title = ?, address = ?, x = ?, z = ?, radius = ?, area = ?, body = ?, points = ?, updated = ?, updated_by = ? WHERE id = ?').run(...v, t, T(by.name, 40), old.id); return { ok: true, id: old.id }; }
  if (q('SELECT COUNT(*) n FROM premises WHERE community_id = ?').get(c.id).n >= MAX) return { error: `A server can have ${MAX} location notes. Delete old ones first.` };
  const id = q('INSERT INTO premises (community_id, dept, kind, title, address, x, z, radius, area, body, points, by_user, by_name, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, ...v, by.id || null, T(by.name, 40), t, t).lastInsertRowid;
  return { ok: true, id: Number(id) }; };
export const remove = (c, may, id) => { const old = q('SELECT dept FROM premises WHERE community_id = ? AND id = ?').get(c.id, +id || 0); if (!old) return { error: 'That note is gone.' };
  if (!may.includes(old.dept)) return { error: 'You can’t delete that note.' }; q('DELETE FROM premises WHERE id = ?').run(+id); return { ok: true }; };
