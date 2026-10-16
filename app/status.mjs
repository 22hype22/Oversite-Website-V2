// Status & Updates: each server's real health, checked every minute, a 90-day history per part, problems opened and
// resolved by themselves, Oversite's changelog, and announcements a server's owner posts for its members.
//
// A part is ok, deg (degraded) or down while it can be checked; idle when nobody has the CAD open and Explore isn't
// reading the server either, and off when the server hasn't set it up. Only ok, deg and down count toward uptime.
import { db, now, communities } from './db.mjs';
import { CHANGELOG } from './changelog.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS status_days (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, comp TEXT NOT NULL, day TEXT NOT NULL,
  ok INTEGER NOT NULL DEFAULT 0, deg INTEGER NOT NULL DEFAULT 0, down INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (community_id, comp, day));
CREATE TABLE IF NOT EXISTS status_incidents (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, comp TEXT NOT NULL,
  title TEXT NOT NULL, sev INTEGER NOT NULL, started INTEGER NOT NULL, resolved INTEGER, log TEXT NOT NULL DEFAULT '[]');
CREATE TABLE IF NOT EXISTS server_posts (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, title TEXT NOT NULL,
  body TEXT NOT NULL, tag TEXT NOT NULL, author TEXT NOT NULL, at INTEGER NOT NULL);`);
const q = sql => db.prepare(sql);
const DAY = 864e5, dayOf = t => new Date(t).toISOString().slice(0, 10);

// the parts, in the order the tab shows them; what a problem with each is called
export const PARTS = [
  ['cad', 'Oversite CAD', 'this site'], ['erlc', 'ER:LC connection', 'your server key'], ['live', 'Live positions', 'units and players on the map'],
  ['discord', 'Discord link', 'roles and sign-in'], ['voice', 'Proximity voice', 'voice by distance'], ['db', 'Records and economy', 'saved data']];
const TROUBLE = { erlc: { down: 'ER:LC isn’t answering', deg: 'ER:LC is slow to answer' }, live: { down: 'Positions stopped updating', deg: 'Positions are updating slowly' },
  discord: { down: 'Discord can’t be reached', deg: 'Discord is slow' }, voice: { down: 'Proximity voice is down', deg: 'Proximity voice is degraded' }, db: { down: 'Saving isn’t working', deg: 'Saving is slow' }, cad: { down: 'The CAD is down', deg: 'The CAD is slow' } };

// what a check found right now, per server: { part: { s: 'ok'|'deg'|'down'|'idle'|'off', why } }, filled in by the monitor
const current = new Map(), streak = new Map();   // community id -> parts; `${cid}:${part}` -> { bad, good }
const record = (cid, part, s) => { if (!['ok', 'deg', 'down'].includes(s)) return;
  q(`INSERT INTO status_days (community_id, comp, day, ${s}) VALUES (?, ?, ?, 1) ON CONFLICT (community_id, comp, day) DO UPDATE SET ${s} = ${s} + 1`).run(cid, part, dayOf(now())); };
const openOf = (cid, part) => q('SELECT * FROM status_incidents WHERE community_id = ? AND comp = ? AND resolved IS NULL').get(cid, part);
const log = (id, msg) => { const r = q('SELECT log FROM status_incidents WHERE id = ?').get(id); const L = JSON.parse(r.log); L.push([now(), msg]); q('UPDATE status_incidents SET log = ? WHERE id = ?').run(JSON.stringify(L.slice(-20)), id); };
// two bad checks in a row open a problem; two good ones resolve it, so one slow answer never makes noise
const track = (cid, part, st) => { const k = `${cid}:${part}`, z = streak.get(k) || { bad: 0, good: 0, last: '' }; const bad = st.s === 'deg' || st.s === 'down';
  z.bad = bad ? z.bad + 1 : 0; z.good = st.s === 'ok' ? z.good + 1 : 0; const open = openOf(cid, part);
  if (bad && z.bad >= 2) { const title = TROUBLE[part]?.[st.s] || 'Something isn’t working', sev = st.s === 'down' ? 1 : 2;
    if (!open) { const id = q('INSERT INTO status_incidents (community_id, comp, title, sev, started) VALUES (?, ?, ?, ?, ?)').run(cid, part, title, sev, now() - 60000).lastInsertRowid; log(id, st.why || title); }
    else if (open.sev !== sev || z.last !== st.why) { q('UPDATE status_incidents SET title = ?, sev = ? WHERE id = ?').run(title, sev, open.id); if (z.last !== st.why) log(open.id, st.why || title); } }
  if (open && z.good >= 2) { q('UPDATE status_incidents SET resolved = ? WHERE id = ?').run(now(), open.id); log(open.id, 'Resolved: working normally again.'); }
  if (bad) z.last = st.why || ''; streak.set(k, z); };

// every minute, for every server: probe(c) returns what each part looks like
export const check = (c, P) => { current.set(c.id, P); for (const [part] of PARTS) { const st = P[part] || { s: 'idle' }; record(c.id, part, st.s); if (st.s !== 'idle' && st.s !== 'off') track(c.id, part, st); } };
export const start = probe => { const pass = () => { for (const c of communities.all()) { if (c.suspended) continue; let P; try { P = probe(c); } catch (e) { continue; } check(c, P); }
    q('DELETE FROM status_days WHERE day < ?').run(dayOf(now() - 95 * DAY)); q('DELETE FROM status_incidents WHERE resolved IS NOT NULL AND resolved < ?').run(now() - 30 * DAY); };
  setTimeout(pass, 15000); setInterval(pass, 60000); };

// the tab: every part with its state now and 90 days of history, problems (open, and resolved in the last day), and updates
export const view = (c, canPost) => { const P = current.get(c.id) || {}, from = dayOf(now() - 89 * DAY);
  const days = q('SELECT comp, day, ok, deg, down FROM status_days WHERE community_id = ? AND day >= ?').all(c.id, from);
  const parts = PARTS.map(([k, name, note]) => { const D = days.filter(d => d.comp === k), by = new Map(D.map(d => [d.day, d])), ok = D.reduce((n, d) => n + d.ok, 0), all = D.reduce((n, d) => n + d.ok + d.deg + d.down, 0);
    const hist = Array.from({ length: 90 }, (_, i) => { const d = by.get(dayOf(now() - (89 - i) * DAY)); return !d ? 'n' : d.down >= 5 ? 'x' : d.deg + d.down >= 5 ? 'd' : 'o'; }).join('');
    const st = P[k] || { s: 'idle' }; return { key: k, name, note, status: st.s, why: st.why || '', uptime: all ? Math.round(ok / all * 10000) / 100 : null, hist }; });
  const problems = q('SELECT * FROM status_incidents WHERE community_id = ? AND (resolved IS NULL OR resolved > ?) ORDER BY started DESC LIMIT 10').all(c.id, now() - DAY)
    .map(x => ({ title: x.title, part: PARTS.find(p => p[0] === x.comp)?.[1] || '', sev: x.sev, started: x.started, resolved: x.resolved, log: JSON.parse(x.log) }));
  const posts = q('SELECT * FROM server_posts WHERE community_id = ? ORDER BY at DESC LIMIT 30').all(c.id).map(p => ({ id: p.id, server: true, tag: p.tag, title: p.title, body: p.body, by: p.author, at: p.at, items: [] }));
  const oversite = CHANGELOG.map(u => ({ ...u, at: Date.parse(u.date + 'T00:00:00Z'), by: 'Oversite' }));
  return { checked: now(), parts, problems, updates: [...posts, ...oversite].sort((a, b) => b.at - a.at), canPost }; };

// a server's own announcements, written by its owner or co-owners
const TAGS = ['news', 'event', 'change', 'notice'];
export const post = (c, user, j) => { const title = String(j.title || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 90), body = String(j.body || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 2000);
  if (!title) return { error: 'Give the update a title.' }; if (body.length < 3) return { error: 'Write a little about it.' };
  if (q('SELECT COUNT(*) n FROM server_posts WHERE community_id = ? AND at > ?').get(c.id, now() - DAY).n >= 10) return { error: 'That’s ten updates today. Post more tomorrow.' };
  q('INSERT INTO server_posts (community_id, title, body, tag, author, at) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, title, body, TAGS.includes(j.tag) ? j.tag : 'news', user.roblox_name || user.name || '', now()); return { ok: true }; };
export const unpost = (c, id) => { q('DELETE FROM server_posts WHERE community_id = ? AND id = ?').run(c.id, +id || 0); return { ok: true }; };
