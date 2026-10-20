// Roleplay characters. A server owner picks how people are named in the CAD (Civilian → Settings): by Roblox username, the
// way ER:LC shows them, or by roleplay characters each player makes in the Civilian tab. With characters on, a player can have
// several (up to the server's limit), each with its own police record, licenses and cars, and picks the one they are playing;
// police lookups, the plate reader and linked bots then see that character instead of the username. Money, homes and jobs stay
// with the player. With usernames, a player has one character (their civilian ID) and a person is their Roblox account.
// A character is keyed 'c<id>' wherever a person is keyed (pd_records.subject_rid, pd_licenses.who).
import { db, now, communities } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS civ_characters (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  first TEXT NOT NULL DEFAULT '', last TEXT NOT NULL DEFAULT '', dob TEXT NOT NULL DEFAULT '', address TEXT NOT NULL DEFAULT '', phone TEXT NOT NULL DEFAULT '',
  occupation TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS civ_characters_u ON civ_characters (community_id, user_id);
CREATE TABLE IF NOT EXISTS civ_active (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL, char_id INTEGER NOT NULL,
  PRIMARY KEY (community_id, user_id));`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

// the one civilian ID everyone had before characters (civ_chars): moved over once, then that table stays empty
export const carryOver = () => { db.exec('BEGIN'); try {
  db.exec(`INSERT INTO civ_characters (community_id, user_id, first, last, dob, address, phone, occupation, created, updated)
    SELECT o.community_id, o.user_id, o.first, o.last, o.dob, o.address, o.phone, o.occupation, o.updated, o.updated FROM civ_chars o
    WHERE NOT EXISTS (SELECT 1 FROM civ_characters n WHERE n.community_id = o.community_id AND n.user_id = o.user_id)`);
  db.exec('DELETE FROM civ_chars'); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); console.log('characters carry over:', e.message); } };

// ── the server's choice ──
export const MAX = 10;
export const roleplay = c => c?.settings?.civ?.names === 'roleplay';
export const limit = c => roleplay(c) ? Math.min(MAX, Math.max(1, Math.round(+c.settings.civ.maxchars || 3))) : 1;
// by server id, for the police side, which only has the id; read again every 10 seconds at most
const mode = new Map();
export const rp = cid => { const m = mode.get(cid); if (m && now() - m.at < 10000) return m.on; const on = roleplay(communities.byId(cid)); mode.set(cid, { on, at: now() }); return on; };
export const forget = cid => mode.delete(cid);

// ── characters ──
export const FIELDS = { first: 30, last: 30, dob: 10, address: 80, phone: 20, occupation: 40 };
export const KEY = /^c(\d{1,12})$/;
export const key = ch => ch ? 'c' + ch.id : '';
export const nameOf = ch => ch ? [ch.first, ch.last].filter(Boolean).join(' ') : '';
const row = r => r && { id: r.id, key: 'c' + r.id, user_id: r.user_id, ...Object.fromEntries(Object.keys(FIELDS).map(k => [k, r[k]])), name: nameOf(r) };
export const list = (cid, uid) => q('SELECT * FROM civ_characters WHERE community_id = ? AND user_id = ? ORDER BY id').all(cid, uid).map(row);
export const byId = (cid, id) => row(q('SELECT * FROM civ_characters WHERE community_id = ? AND id = ?').get(cid, +id || 0));
export const byKey = (cid, k) => { const m = KEY.exec(String(k || '')); return m ? byId(cid, m[1]) : null; };
// the character a player is playing: the one they picked, else their first
export const active = (cid, uid) => { const a = q('SELECT c.* FROM civ_active a JOIN civ_characters c ON c.id = a.char_id WHERE a.community_id = ? AND a.user_id = ?').get(cid, uid);
  return row(a || q('SELECT * FROM civ_characters WHERE community_id = ? AND user_id = ? ORDER BY id LIMIT 1').get(cid, uid)); };
// the character someone in game is playing, by their Roblox ID
export const playing = (cid, rid) => { const u = /^\d{1,20}$/.test(String(rid || '')) && q('SELECT id FROM users WHERE roblox_id = ? ORDER BY id DESC LIMIT 1').get(String(rid)); return u ? active(cid, u.id) : null; };
// characters by their full name, exactly; and by part of it, for a search
export const named = (cid, name) => q("SELECT * FROM civ_characters WHERE community_id = ? AND lower(first || ' ' || last) = lower(?)").all(cid, T(name, 61)).map(row);
export const search = (cid, text) => { const s = T(text, 40).replace(/[%_]/g, ''); if (!s) return [];
  return q("SELECT * FROM civ_characters WHERE community_id = ? AND (first || ' ' || last) LIKE ? ORDER BY updated DESC LIMIT 15").all(cid, `%${s}%`).map(row); };
// the player behind a character: { rid, name } of their Roblox account
export const player = ch => { const u = ch && q('SELECT roblox_id, roblox_name, name FROM users WHERE id = ?').get(ch.user_id); return u ? { rid: u.roblox_id ? String(u.roblox_id) : '', name: u.roblox_name || u.name || '' } : null; };
export const set = (ch, field, value) => { if (ch && FIELDS[field]) q(`UPDATE civ_characters SET ${field} = ?, updated = ? WHERE id = ?`).run(T(value, FIELDS[field]), now(), ch.id); };

// make one, or change one of yours; with usernames there is only the one, so a save always changes it
export const save = (c, user, j) => { const v = Object.fromEntries(Object.entries(FIELDS).map(([k, n]) => [k, T(j[k], n)]));
  if (!v.first || !v.last) return { error: 'Give your character a first and last name.' };
  if (v.dob && !/^\d{4}-\d{2}-\d{2}$/.test(v.dob)) return { error: 'Pick a date of birth.' };
  const mine = list(c.id, user.id), id = roleplay(c) ? +j.id || 0 : active(c.id, user.id)?.id || 0;
  if (id && !mine.some(x => x.id === id)) return { error: 'That character is not yours.' };
  // with characters on, a name check has to find one person
  if (roleplay(c) && named(c.id, `${v.first} ${v.last}`).some(x => x.id !== id)) return { error: `Someone on this server already has a character called ${v.first} ${v.last}.` };
  const t = now();
  if (id) { q('UPDATE civ_characters SET first = ?, last = ?, dob = ?, address = ?, phone = ?, occupation = ?, updated = ? WHERE id = ?').run(v.first, v.last, v.dob, v.address, v.phone, v.occupation, t, id);
    return { ok: true, id }; }
  const max = limit(c); if (mine.length >= max) return { error: `This server allows ${max} character${max > 1 ? 's' : ''} each.` };
  const r = q('INSERT INTO civ_characters (community_id, user_id, first, last, dob, address, phone, occupation, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, user.id, v.first, v.last, v.dob, v.address, v.phone, v.occupation, t, t);
  if (!mine.length || j.use) use(c, user, r.lastInsertRowid);
  return { ok: true, id: Number(r.lastInsertRowid) }; };
// pick who you are playing
export const use = (c, user, id) => { const ch = byId(c.id, id); if (!ch || ch.user_id !== user.id) return { error: 'That character is not yours.' };
  q('INSERT INTO civ_active (community_id, user_id, char_id) VALUES (?, ?, ?) ON CONFLICT(community_id, user_id) DO UPDATE SET char_id = excluded.char_id').run(c.id, user.id, ch.id);
  // the cars out in game now follow who they are playing, unless they were given to a character on purpose
  q('UPDATE pd_vehicles SET char_id = ? WHERE community_id = ? AND char_pin = 0 AND owner_rid <> \'\' AND owner_rid = ?').run(ch.id, c.id, String(user.roblox_id || '-'));
  return { ok: true }; };
// delete one: never one with an active warrant, so nobody can walk away from it
export const remove = (c, user, id) => { const ch = byId(c.id, id); if (!ch || ch.user_id !== user.id) return { error: 'That character is not yours.' };
  if (q("SELECT 1 FROM pd_records WHERE community_id = ? AND kind = 'warrant' AND status IN ('Pending', 'Active') AND subject_rid = ?").get(c.id, ch.key)) return { error: `${ch.name} has a warrant. It has to be served or recalled first.` };
  q('DELETE FROM civ_characters WHERE id = ?').run(ch.id); q('DELETE FROM civ_active WHERE community_id = ? AND char_id = ?').run(c.id, ch.id);
  q('UPDATE pd_vehicles SET char_id = NULL, char_pin = 0 WHERE community_id = ? AND char_id = ?').run(c.id, ch.id);
  return { ok: true }; };
// give one of your cars to one of your characters (it stays theirs until changed), or back to whoever you are playing (id 0)
export const giveCar = (c, user, plate, id) => { const v = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND plate = ?').get(c.id, String(plate || '').toUpperCase());
  if (!v || !user.roblox_id || String(v.owner_rid) !== String(user.roblox_id)) return { error: 'That is not your car.' };
  if (!+id) { q('UPDATE pd_vehicles SET char_id = ?, char_pin = 0 WHERE community_id = ? AND plate = ?').run(active(c.id, user.id)?.id ?? null, c.id, v.plate); return { ok: true }; }
  const ch = byId(c.id, id); if (!ch || ch.user_id !== user.id) return { error: 'That character is not yours.' };
  q('UPDATE pd_vehicles SET char_id = ?, char_pin = 1 WHERE community_id = ? AND plate = ?').run(ch.id, c.id, v.plate); return { ok: true }; };
