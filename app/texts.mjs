// Texting on the Civilian phone (Messages): people in the same server send each other texts. A conversation is between two
// members of one server; only those two can read it. The phone checks for new texts every few seconds while Messages is open,
// and for the unread count (the red badge) now and then.
import { db, members, users } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS texts (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  from_uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, to_uid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, at INTEGER NOT NULL, read_at INTEGER);
CREATE INDEX IF NOT EXISTS texts_to ON texts (community_id, to_uid, read_at);
CREATE INDEX IF NOT EXISTS texts_pair ON texts (community_id, from_uid, to_uid, id);`);
const q = sql => db.prepare(sql);
const nameOf = u => u ? (u.roblox_name || u.name || 'Someone') : 'Someone';
const SENT = new Map();   // user -> times they sent lately, so nobody floods

// everyone they've texted with, newest first, with the last text and how many are unread
export const threads = (c, me) => {
  const rows = q(`SELECT CASE WHEN from_uid = ? THEN to_uid ELSE from_uid END AS other, MAX(id) AS last FROM texts WHERE community_id = ? AND (from_uid = ? OR to_uid = ?) GROUP BY other ORDER BY last DESC LIMIT 50`)
    .all(me.id, c.id, me.id, me.id);
  return rows.map(r => { const t = q('SELECT * FROM texts WHERE id = ?').get(r.last), u = users.byId(r.other);
    return { with: r.other, name: nameOf(u), avatar: u?.avatar || null, last: t.body.slice(0, 120), mine: t.from_uid === me.id, at: t.at,
      unread: q('SELECT COUNT(*) n FROM texts WHERE community_id = ? AND from_uid = ? AND to_uid = ? AND read_at IS NULL').get(c.id, r.other, me.id).n }; }); };
export const unread = (c, me) => q('SELECT COUNT(*) n FROM texts WHERE community_id = ? AND to_uid = ? AND read_at IS NULL').get(c.id, me.id).n;
// one conversation (texts after `after`), which marks theirs as read
export const thread = (c, me, other, after = 0) => { other = +other; if (!members.role(c.id, other)) return { error: 'They are not in this server.' };
  const L = q('SELECT id, from_uid, body, at, read_at FROM texts WHERE community_id = ? AND ((from_uid = ? AND to_uid = ?) OR (from_uid = ? AND to_uid = ?)) AND id > ? ORDER BY id DESC LIMIT 200')
    .all(c.id, me.id, other, other, me.id, +after || 0).reverse();
  q('UPDATE texts SET read_at = ? WHERE community_id = ? AND from_uid = ? AND to_uid = ? AND read_at IS NULL').run(Date.now(), c.id, other, me.id);
  const u = users.byId(other), seen = q('SELECT MAX(id) id FROM texts WHERE community_id = ? AND from_uid = ? AND to_uid = ? AND read_at IS NOT NULL').get(c.id, me.id, other).id || 0;
  return { with: other, name: nameOf(u), avatar: u?.avatar || null, seen, texts: L.map(t => ({ id: t.id, mine: t.from_uid === me.id, body: t.body, at: t.at })) }; };
export const send = (c, me, to, body) => { to = +to; body = String(body || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 1000);
  if (!body) return { error: 'Type a message first.' }; if (to === me.id) return { error: 'You can’t text yourself.' };
  if (!members.role(c.id, to)) return { error: 'They are not in this server.' };
  const now = Date.now(), t = (SENT.get(me.id) || []).filter(x => now - x < 60000); if (t.length >= 30) return { error: 'Slow down a little: 30 texts a minute.' }; t.push(now); SENT.set(me.id, t);
  const id = q('INSERT INTO texts (community_id, from_uid, to_uid, body, at) VALUES (?, ?, ?, ?, ?)').run(c.id, me.id, to, body, now).lastInsertRowid; return { ok: true, id }; };
// people in the server to start a text with, by name
export const people = (c, me, text) => { const s = String(text || '').trim().toLowerCase();
  return members.list(c.id).filter(m => m.id !== me.id && (!s || nameOf(m).toLowerCase().includes(s))).slice(0, 25).map(m => ({ id: m.id, name: nameOf(m), avatar: m.avatar || null })); };
