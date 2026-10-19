// Ankle monitors, for police and dispatch: they put one on a person (their Roblox account), draw where that person may go and any
// places they must keep out of (like Boundaries, on the same map), and can set a last day. Dispatch and police are alerted the moment
// the person leaves their area or walks into a no-go zone, and again when they are back; every change is kept in the monitor's log.
// Positions are ER:LC map coordinates, like Boundaries and Safe zones. Monitors and their logs are tables.
import { db } from './db.mjs';
import { postalNear } from './police.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS monitors (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, rid TEXT NOT NULL, name TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '', zones TEXT NOT NULL DEFAULT '[]', nogo TEXT NOT NULL DEFAULT '[]', by_name TEXT, created INTEGER NOT NULL, ends INTEGER, removed INTEGER,
  removed_by TEXT, state TEXT NOT NULL DEFAULT '', state_at INTEGER, x REAL, z REAL, seen INTEGER);
CREATE INDEX IF NOT EXISTS monitors_c ON monitors (community_id, removed);
CREATE TABLE IF NOT EXISTS monitor_log (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL, monitor_id INTEGER NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL DEFAULT '',
  x REAL, z REAL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS monitor_log_m ON monitor_log (monitor_id, at);`);
const q = sql => db.prepare(sql);

export const MAX_MONITORS = 25, MAX_AREAS = 8, MAX_POINTS = 120;
const SIZE = 5355;
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
const rid0 = v => (/^\d{1,20}$/.test(String(v || '')) ? String(v) : '');
const areas = a => (Array.isArray(a) ? a : []).slice(0, MAX_AREAS).map(p => (Array.isArray(p) ? p : []).slice(0, MAX_POINTS).filter(x => Array.isArray(x) && x.length >= 2).map(x => [num(x[0]), num(x[1])])).filter(p => p.length >= 3);
const parse = t => { try { return JSON.parse(t || '[]'); } catch (e) { return []; } };
const inside = (pts, x, z) => { let a = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j];
  if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) a = !a; } return a; };
const where = (x, z) => postalNear(x, z) || '';

// ── monitors ──
const mon = m => m && { id: m.id, rid: m.rid, name: m.name, reason: m.reason, zones: parse(m.zones), nogo: parse(m.nogo), by: m.by_name, created: m.created, ends: m.ends, state: m.state || '',
  state_at: m.state_at, x: m.x, z: m.z, seen: m.seen, where: m.x != null ? where(m.x, m.z) : '' };
const active = cid => q('SELECT * FROM monitors WHERE community_id = ? AND removed IS NULL ORDER BY created DESC').all(cid);
export const monitors = c => { expire(c); return active(c.id).map(mon); };
const log = (cid, m, kind, text, x = null, z = null) => q('INSERT INTO monitor_log (community_id, monitor_id, kind, text, x, z, at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(cid, m.id, kind, text, x, z, Date.now());
export const history = (c, id) => q('SELECT kind, text, x, z, at FROM monitor_log WHERE community_id = ? AND monitor_id = ? ORDER BY at DESC LIMIT 60').all(c.id, +id);
export const saveMonitor = (c, by, j) => { const zones = areas(j.zones), nogo = areas(j.nogo), name = T(j.name, 40), rid = rid0(j.rid);
  if (!rid || !name) return { error: 'Pick the person from the list.' };
  if (!zones.length && !nogo.length) return { error: 'Draw where they may go, or a place they must keep out of.' };
  const ends = j.ends ? Math.round(+j.ends) : null; if (ends != null && (!Number.isFinite(ends) || ends < Date.now())) return { error: 'The last day has to be in the future.' };
  const reason = T(j.reason, 200), now = Date.now();
  if (j.id) { const m = q('SELECT * FROM monitors WHERE id = ? AND community_id = ? AND removed IS NULL').get(+j.id, c.id); if (!m) return { error: 'That monitor was taken off.' };
    q('UPDATE monitors SET zones = ?, nogo = ?, reason = ?, ends = ?, state = ? WHERE id = ?').run(JSON.stringify(zones), JSON.stringify(nogo), reason, ends, '', m.id);
    log(c.id, m, 'changed', `Areas changed by ${by}`); return { ok: true, monitor: mon(q('SELECT * FROM monitors WHERE id = ?').get(m.id)) }; }
  if (q('SELECT 1 FROM monitors WHERE community_id = ? AND rid = ? AND removed IS NULL').get(c.id, rid)) return { error: `${name} already has a monitor. Change that one instead.` };
  if (active(c.id).length >= MAX_MONITORS) return { error: `A server can have ${MAX_MONITORS} monitors at once. Take one off first.` };
  const id = q('INSERT INTO monitors (community_id, rid, name, reason, zones, nogo, by_name, created, ends) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, rid, name, reason, JSON.stringify(zones), JSON.stringify(nogo), T(by, 40), now, ends).lastInsertRowid;
  const m = q('SELECT * FROM monitors WHERE id = ?').get(id); log(c.id, m, 'added', `Put on by ${by}${reason ? ': ' + reason : ''}`); return { ok: true, monitor: mon(m) }; };
export const removeMonitor = (c, by, id) => { const m = q('SELECT * FROM monitors WHERE id = ? AND community_id = ? AND removed IS NULL').get(+id, c.id); if (!m) return { error: 'That monitor was already taken off.' };
  q('UPDATE monitors SET removed = ?, removed_by = ? WHERE id = ?').run(Date.now(), T(by, 40), m.id); log(c.id, m, 'removed', `Taken off by ${by}`); return { ok: true }; };
const expire = c => { for (const m of q('SELECT * FROM monitors WHERE community_id = ? AND removed IS NULL AND ends IS NOT NULL AND ends < ?').all(c.id, Date.now())) {
  q("UPDATE monitors SET removed = ?, removed_by = 'Oversite' WHERE id = ?").run(Date.now(), m.id); log(c.id, m, 'removed', 'Its last day passed'); } };

// ── one reading of the server: where each monitored person is, against their areas. alert(data) goes to dispatch, police and bots ──
const LAST = new Map(), POS = new Map();   // community -> last reading; community -> where everyone is (for the map)
export const positions = cid => POS.get(cid) || new Map();
export const observe = (c, body, alert) => { const now = Date.now(); if (now - (LAST.get(c.id) || 0) < 8000) return; LAST.set(c.id, now);
  let j; try { j = JSON.parse(body); } catch (e) { return; }
  const byRid = new Map();
  for (const p of j.Players || []) { const [name, id] = String(p.Player || '').split(':'), L = p.Location; if (!name || !id || !L || !Number.isFinite(+L.LocationX)) continue;
    byRid.set(id, { name, rid: id, x: +L.LocationX, z: +L.LocationZ }); }
  POS.set(c.id, byRid); expire(c);
  for (const m of active(c.id)) { const p = byRid.get(m.rid), was = m.state || '';
    if (!p) { if (was && was !== 'offline') { q('UPDATE monitors SET state = ?, state_at = ? WHERE id = ?').run('offline', now, m.id); log(c.id, m, 'offline', 'Left the game'); } continue; }
    const zones = parse(m.zones), nogo = parse(m.nogo), bad = nogo.some(a => inside(a, p.x, p.z)), ok = !zones.length || zones.some(a => inside(a, p.x, p.z));
    const st = bad ? 'nogo' : ok ? 'in' : 'out', w = where(p.x, p.z), back = was === 'out' || was === 'nogo';
    if (st !== was) { q('UPDATE monitors SET state = ?, state_at = ?, x = ?, z = ?, seen = ? WHERE id = ?').run(st, now, p.x, p.z, now, m.id);
      const text = st === 'out' ? `Left their area${w ? ', ' + w : ''}` : st === 'nogo' ? `Went into a no-go zone${w ? ', ' + w : ''}` : back ? `Back in their area${w ? ', ' + w : ''}` : `In the game${w ? ', ' + w : ''}`;
      log(c.id, m, st === 'in' && !back ? 'online' : st, text, p.x, p.z);
      if (st !== 'in' || back) alert({ id: m.id, name: m.name, roblox_id: m.rid, state: st, text, where: w, x: p.x, z: p.z, at: now }); }
    else if (now - (m.seen || 0) > 30000) q('UPDATE monitors SET x = ?, z = ?, seen = ? WHERE id = ?').run(p.x, p.z, now, m.id); } };
