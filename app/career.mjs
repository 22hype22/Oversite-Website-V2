// A player's career across every Oversite server: their on-duty shifts (time on a team that belongs to a department,
// per server), the 911 calls they responded to, and the police records they wrote. Shifts are read from ER:LC's player
// list: from the live feed while a CAD is open, and from a light once-a-minute read otherwise. The page is Premium.
import { db, users, communities } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS shifts (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, rid TEXT NOT NULL, name TEXT,
  team TEXT, dept TEXT, start INTEGER NOT NULL, end INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS shifts_r ON shifts (rid, start);
CREATE TABLE IF NOT EXISTS call_resp (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, call TEXT NOT NULL, rid TEXT NOT NULL, team TEXT, at INTEGER NOT NULL,
  PRIMARY KEY (community_id, call, rid));
CREATE INDEX IF NOT EXISTS call_resp_r ON call_resp (rid);`);
const q = sql => db.prepare(sql);

const GAP = 3 * 60000, EVERY = 15000, FLUSH = 45000, MIN_SHIFT = 60000;
const OPEN = new Map(), LAST = new Map();   // community -> (Roblox ID -> open shift), community -> last read
const close = (open, rid, end) => { const s = open.get(rid); if (!s) return; open.delete(rid);
  if (end - s.start < MIN_SHIFT) q('DELETE FROM shifts WHERE id = ?').run(s.id); else q('UPDATE shifts SET end = ? WHERE id = ?').run(end, s.id); };
const idOf = v => { const m = String(v?.Player ?? v?.UserId ?? v?.Id ?? v ?? '').match(/(\d{3,20})\s*$/); return m ? m[1] : ''; };

// one read of a server's player list (at most every 15 seconds): open, extend or close shifts, and note who is on each call
export const observe = (cid, body) => { const now = Date.now(); if (now - (LAST.get(cid) || 0) < EVERY) return; LAST.set(cid, now);
  const c = communities.byId(cid); if (!c) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const teams = c.settings.teams || {}, open = OPEN.get(cid) || new Map(), seen = new Set(); OPEN.set(cid, open);
  for (const p of j.Players || []) { const [name] = String(p.Player || '').split(':'), rid = idOf(p.Player); if (!rid) continue;
    const team = p.Team || '', dept = teams[team] || ''; if (!dept) { close(open, rid, now); continue; }   // civilians aren't on duty
    seen.add(rid); let s = open.get(rid);
    if (s && (s.team !== team || now - s.last > GAP)) { close(open, rid, s.last); s = null; }   // changed team, or was gone a while: a new shift
    if (!s) { const id = q('INSERT INTO shifts (community_id, rid, name, team, dept, start, end) VALUES (?, ?, ?, ?, ?, ?, ?)').run(cid, rid, name, team, dept, now, now).lastInsertRowid;
      open.set(rid, { id, team, start: now, last: now, flushed: now }); continue; }
    s.last = now; if (now - s.flushed > FLUSH) { q('UPDATE shifts SET end = ? WHERE id = ?').run(now, s.id); s.flushed = now; } }   // saved as it goes, so a restart loses a minute at most
  for (const [rid, s] of open) if (!seen.has(rid) && now - s.last > GAP) close(open, rid, s.last);
  const add = q('INSERT OR IGNORE INTO call_resp (community_id, call, rid, team, at) VALUES (?, ?, ?, ?, ?)');
  for (const k of j.EmergencyCalls || []) for (const p of k.Players || []) { const rid = idOf(p); if (rid) add.run(cid, `${k.CallNumber}:${k.StartedAt}`, rid, k.Team || '', now); } };

// servers nobody has the CAD open for are read once a minute, so shifts count either way
export const start = (feedFor, keyOf) => setInterval(async () => {
  for (const c of communities.all()) { if (c.suspended || !keyOf(c.id) || Date.now() - (LAST.get(c.id) || 0) < 55000) continue;
    try { const s = await feedFor(c).snapshot(); if (s.status === 200) observe(c.id, s.body); } catch (e) {} } }, 60000);

// everything the career page shows, for one person (every account on their Roblox)
export const stats = user => { if (!user?.roblox_id) return null; const rid = String(user.roblox_id), now = Date.now();
  const rows = q('SELECT s.community_id AS cid, c.name AS server, c.slug, s.team, s.dept, s.start, s.end FROM shifts s JOIN communities c ON c.id = s.community_id WHERE s.rid = ? ORDER BY s.start DESC').all(rid);
  const len = r => Math.max(0, r.end - r.start), month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0);
  const byDept = { pd: 0, fd: 0, dot: 0 }, byServer = new Map(), months = [];
  for (let i = 5; i >= 0; i--) { const d = new Date(month); d.setMonth(d.getMonth() - i); months.push({ key: d.getFullYear() * 12 + d.getMonth(), label: d.toLocaleString('en-US', { month: 'short' }), ms: 0 }); }
  let total = 0, thisMonth = 0, longest = 0;
  for (const r of rows) { const ms = len(r); total += ms; longest = Math.max(longest, ms); if (r.start >= +month) thisMonth += ms; byDept[r.dept] = (byDept[r.dept] || 0) + ms;
    const sv = byServer.get(r.cid) || { name: r.server, slug: r.slug, ms: 0, last: 0 }; sv.ms += ms; sv.last = Math.max(sv.last, r.end); byServer.set(r.cid, sv);
    const d = new Date(r.start), m = months.find(x => x.key === d.getFullYear() * 12 + d.getMonth()); if (m) m.ms += ms; }
  const uids = (users.allByRoblox(rid) || []).map(x => x.id), recs = { arrest: 0, citation: 0, warning: 0, warrant: 0 };
  if (uids.length) for (const r of q(`SELECT kind, COUNT(*) AS n FROM pd_records WHERE by_uid IN (${uids.map(() => '?').join(',')}) GROUP BY kind`).all(...uids)) recs[r.kind] = r.n;
  return { total, thisMonth, longest, shifts: rows.length, calls: q('SELECT COUNT(*) AS n FROM call_resp WHERE rid = ?').get(rid).n, recs, byDept, months,
    servers: [...byServer.values()].sort((a, b) => b.ms - a.ms), recent: rows.slice(0, 12).map(r => ({ server: r.server, team: r.team, dept: r.dept, start: r.start, end: r.end, live: now - r.end < GAP })) }; };
