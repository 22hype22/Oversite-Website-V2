// Person markers: officers put a marker on someone's profile, like FI (Firearms) or VI (Violent), so every officer who looks them up
// sees it highlighted and hears an alert. A marker has a short code, a label, an optional note and who added it; the officer who
// added it or a Sergeant and up can take it off. Markers stay until someone takes them off.
import { db, now } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS pd_markers (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, rid TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL, code TEXT NOT NULL, label TEXT NOT NULL, note TEXT, by_name TEXT, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS pd_markers_r ON pd_markers (community_id, rid);
CREATE INDEX IF NOT EXISTS pd_markers_n ON pd_markers (community_id, name COLLATE NOCASE);`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

// the markers officers pick from; danger ones show red, the rest amber. Any other is typed in (code and label).
export const TYPES = [['FI', 'Firearms', 'danger'], ['AD', 'Armed and dangerous', 'danger'], ['VI', 'Violent', 'danger'], ['AP', 'Assaults police', 'danger'], ['ES', 'Escape risk', 'warn'],
  ['GA', 'Gang member', 'warn'], ['DR', 'Drugs', 'warn'], ['MH', 'Mental health', 'warn'], ['SU', 'Suicide risk', 'warn'], ['MED', 'Medical condition', 'warn']];
const levelOf = code => TYPES.find(t => t[0] === code)?.[2] || 'warn';
const row = r => ({ id: r.id, code: r.code, label: r.label, level: levelOf(r.code), note: r.note || '', by: r.by_name || '', at: r.at });

// someone's markers: by Roblox ID (or a character's key) when there is one, else by name
const who = (rid, name) => /^\S+$/.test(String(rid || '')) && rid ? ['rid = ?', String(rid)] : ['rid = \'\' AND lower(name) = lower(?)', T(name, 40)];
export const forPerson = (cid, rid, name) => { if (!rid && !name) return []; const [w, v] = who(rid, name);
  return q(`SELECT * FROM pd_markers WHERE community_id = ? AND ${w} ORDER BY at`).all(cid, v).map(row); };
export const codesFor = (cid, rid, name) => forPerson(cid, rid, name).map(m => ({ code: m.code, label: m.label, level: m.level }));

export const add = (cid, by, b) => { const rid = T(b.rid, 40), name = T(b.name, 40); if (!rid && !name) return { error: 'Whose profile?' };
  const t = TYPES.find(x => x[0] === String(b.code || '').toUpperCase()), code = t ? t[0] : T(b.code, 4).toUpperCase().replace(/[^A-Z0-9]/g, ''), label = t ? t[1] : T(b.label, 30);
  if (!code || !label) return { error: 'Give the marker a short code and a name, like FI and Firearms.' };
  if (forPerson(cid, rid, name).some(m => m.code === code)) return { error: `${name || 'This person'} already has the ${code} marker.` };
  if (forPerson(cid, rid, name).length >= 12) return { error: 'Someone can have up to 12 markers.' };
  q('INSERT INTO pd_markers (community_id, rid, name, code, label, note, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(cid, rid, name, code, label, T(b.note, 160) || null, T(by.name, 40), now());
  return { ok: true, markers: forPerson(cid, rid, name) }; };
export const remove = (cid, by, id) => { const r = q('SELECT * FROM pd_markers WHERE community_id = ? AND id = ?').get(cid, +id || 0); if (!r) return { error: 'That marker is gone.' };
  if (!by.supervisor && r.by_name !== by.name) return { error: 'Only the officer who added it or a Sergeant and up can take a marker off.' };
  q('DELETE FROM pd_markers WHERE id = ?').run(r.id); return { ok: true, markers: forPerson(cid, r.rid, r.name) }; };
