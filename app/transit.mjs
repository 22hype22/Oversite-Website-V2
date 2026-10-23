// Transit: the bus service as a job. A driver starts a shift in the Civilian tab (bus number, a route the server drew, the pre-trip
// checklist), follows the route on the map, charges fares in the server's Civilian economy, files reports (incidents, crashes, lost
// property) and can call transit police or hit panic: a 911 call at the bus with the five nearest officers sent to it. Admins draw
// the routes and stops, write the checklist, set the fare and what happens when a bus goes off its route (Oversite can :pm the
// driver). Every member can see where the buses are (the Bus tracker on the phone).
// Points are ER:LC map pixels (5355 across), like the other map tools. Settings: c.settings.transit (see conf).
import { db, now, communities, users } from './db.mjs';
import * as civ from './civ.mjs';
import { commandAs } from './staff.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS transit_routes (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, name TEXT NOT NULL,
  color TEXT NOT NULL, path TEXT NOT NULL DEFAULT '[]', stops TEXT NOT NULL DEFAULT '[]', updated INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS transit_shifts (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER NOT NULL,
  name TEXT NOT NULL, rid TEXT, bus TEXT NOT NULL, route_id INTEGER, status TEXT NOT NULL DEFAULT 'in service', started INTEGER NOT NULL, ended INTEGER, fares INTEGER NOT NULL DEFAULT 0, takings INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS transit_shifts_c ON transit_shifts (community_id, ended);
CREATE TABLE IF NOT EXISTS transit_reports (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, kind TEXT NOT NULL, title TEXT NOT NULL,
  body TEXT, location TEXT, bus TEXT, by_user INTEGER, by_name TEXT, at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', closed_by TEXT);
CREATE INDEX IF NOT EXISTS transit_reports_c ON transit_reports (community_id, id);`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, n);
const SIZE = 5355, num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
export const KINDS = { incident: 'Incident', crash: 'Crash', lost: 'Lost property', complaint: 'Passenger complaint', other: 'Other' };
export const STATUSES = ['in service', 'out of service', 'on break', 'emergency'];
export const MAX_ROUTES = 20, MAX_PATH = 400, MAX_STOPS = 40, OFF = { strict: 50, normal: 100, loose: 200 };

// fare: what one ride costs; autoFare: charge players who ride along by themselves; checklist: what a driver ticks before a shift;
// off: { on, how far (OFF), msg }: a bus off its route; police: drivers can call transit police (police get it as a CAD alert)
export const conf = c => { const s = (communities.byId(c.id) || c).settings.transit || {};
  return { fare: Math.max(0, Math.min(10000, Math.round(+s.fare >= 0 && s.fare !== '' && s.fare != null ? +s.fare : 5))), autoFare: !!s.autoFare,
    checklist: Array.isArray(s.checklist) ? s.checklist : ['Walk around the bus: lights, mirrors, tyres', 'Doors open and close', 'Route sign set', 'Seats and floor clear'],
    off: { on: s.off?.on !== false, how: OFF[s.off?.how] ? s.off.how : 'normal', msg: T(s.off?.msg, 150) || 'You are off your bus route. Head back to it when it is safe.' }, police: s.police !== false }; };
export const saveConf = (c, j) => { const s = { fare: Math.max(0, Math.min(10000, Math.round(+j.fare || 0))), autoFare: !!j.autoFare,
    checklist: (Array.isArray(j.checklist) ? j.checklist : []).map(x => T(x, 90)).filter(Boolean).slice(0, 15),
    off: { on: !!j.off?.on, how: OFF[j.off?.how] ? j.off.how : 'normal', msg: T(j.off?.msg, 150) }, police: !!j.police };
  const st = communities.byId(c.id).settings; st.transit = s; communities.saveSettings(c.id, st); c.settings.transit = s; return { ok: true }; };

// ── routes ──
const route = r => ({ id: r.id, name: r.name, color: r.color, path: JSON.parse(r.path), stops: JSON.parse(r.stops) });
export const routes = c => q('SELECT * FROM transit_routes WHERE community_id = ? ORDER BY name COLLATE NOCASE').all(c.id).map(route);
export const saveRoute = (c, j) => { const name = T(j.name, 40); if (!name) return { error: 'Name the route.' };
  const path = (Array.isArray(j.path) ? j.path : []).filter(p => Array.isArray(p) && Number.isFinite(+p[0]) && Number.isFinite(+p[1])).slice(0, MAX_PATH).map(p => [num(p[0]), num(p[1])]);
  if (path.length < 2) return { error: 'Draw the route on the map: click along the roads it takes.' };
  const stops = (Array.isArray(j.stops) ? j.stops : []).filter(s => Number.isFinite(+s?.x) && Number.isFinite(+s?.z)).slice(0, MAX_STOPS).map((s, i) => ({ name: T(s.name, 40) || `Stop ${i + 1}`, x: num(s.x), z: num(s.z) }));
  const color = /^#[0-9a-f]{6}$/i.test(j.color || '') ? j.color : '#3FBF8A', v = [name, color, JSON.stringify(path), JSON.stringify(stops), now()];
  if (j.id) { const n = q('UPDATE transit_routes SET name = ?, color = ?, path = ?, stops = ?, updated = ? WHERE community_id = ? AND id = ?').run(...v, c.id, +j.id || 0).changes; return n ? { ok: true, id: +j.id } : { error: 'That route is gone.' }; }
  if (q('SELECT COUNT(*) n FROM transit_routes WHERE community_id = ?').get(c.id).n >= MAX_ROUTES) return { error: `A server can have ${MAX_ROUTES} routes.` };
  return { ok: true, id: Number(q('INSERT INTO transit_routes (community_id, name, color, path, stops, updated) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, ...v).lastInsertRowid) }; };
export const dropRoute = (c, id) => { q('UPDATE transit_shifts SET route_id = NULL WHERE community_id = ? AND route_id = ?').run(c.id, +id || 0); q('DELETE FROM transit_routes WHERE community_id = ? AND id = ?').run(c.id, +id || 0); return { ok: true }; };

// distance from a point to a route's line, and the stop it reaches next (the nearest stop ahead along the line)
const segDist = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L)); return [Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz), t]; };
const along = (path, p) => { let best = [Infinity, 0], acc = 0; for (let i = 1; i < path.length; i++) { const [d, t] = segDist(p, path[i - 1], path[i]), seg = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    if (d < best[0]) best = [d, acc + t * seg]; acc += seg; } return best; };   // [distance from the line, how far along it]
const nextStop = (r, p) => { if (!r.stops.length) return null; const at = along(r.path, p)[1], S = r.stops.map(s => ({ ...s, k: along(r.path, [s.x, s.z])[1] })).sort((a, b) => a.k - b.k);
  return S.find(s => s.k > at + 15) || S[0]; };

// ── live: where each driver is, from the last reading of the server ──
const LIVE = new Map(); const live = cid => { let L = LIVE.get(cid); if (!L) LIVE.set(cid, L = { pos: new Map(), players: [], off: new Map(), told: new Map(), rode: new Map(), at: 0 }); return L; };
const shiftRow = s => ({ id: s.id, user_id: s.user_id, name: s.name, rid: s.rid || '', bus: s.bus, route_id: s.route_id, status: s.status, started: s.started, ended: s.ended, fares: s.fares, takings: s.takings });
const open = cid => q('SELECT * FROM transit_shifts WHERE community_id = ? AND ended IS NULL').all(cid);
export const mine = (c, user) => q('SELECT * FROM transit_shifts WHERE community_id = ? AND user_id = ? AND ended IS NULL').get(c.id, user.id);
// every bus in service with where it is, its route, the next stop and whether it's off route: for drivers, admins and the tracker
export const buses = c => { const L = live(c.id), R = new Map(routes(c).map(r => [r.id, r]));
  return open(c.id).map(s => { const p = L.pos.get(s.name.toLowerCase()), r = R.get(s.route_id); const n = p && r ? nextStop(r, [p.x, p.z]) : null;
    return { ...shiftRow(s), x: p?.x ?? null, z: p?.z ?? null, postal: p?.postal || '', street: p?.street || '', route: r ? { id: r.id, name: r.name, color: r.color } : null, next: n ? n.name : '', off: !!L.off.get(s.id)?.since && now() - L.off.get(s.id).since > 8000 }; }); };

export const start = (c, user, j) => { if (!user.roblox_name) return { error: 'Link your Roblox account first, so the bus can be found on the map.' };
  if (mine(c, user)) return { error: 'You are already on a shift.' }; const bus = T(j.bus, 12); if (!bus) return { error: 'Which bus are you driving? Give its number.' };
  const cf = conf(c), ticks = Array.isArray(j.checklist) ? j.checklist : []; if (cf.checklist.some((_, i) => !ticks[i])) return { error: 'Finish the pre-trip checklist first.' };
  const r = j.route ? q('SELECT id FROM transit_routes WHERE community_id = ? AND id = ?').get(c.id, +j.route || 0) : null;
  const id = Number(q('INSERT INTO transit_shifts (community_id, user_id, name, rid, bus, route_id, started) VALUES (?, ?, ?, ?, ?, ?, ?)').run(c.id, user.id, user.roblox_name, user.roblox_id || null, bus, r?.id || null, now()).lastInsertRowid);
  civ.ensure(c, user.id); return { ok: true, id }; };
export const update = (c, user, j) => { const s = mine(c, user); if (!s) return { error: 'You are not on a shift.' };
  if (j.status != null) { if (!STATUSES.includes(j.status)) return { error: 'Unknown status.' }; q('UPDATE transit_shifts SET status = ? WHERE id = ?').run(j.status, s.id); }
  if (j.route !== undefined) { const r = j.route ? q('SELECT id FROM transit_routes WHERE community_id = ? AND id = ?').get(c.id, +j.route || 0) : null; q('UPDATE transit_shifts SET route_id = ? WHERE id = ?').run(r?.id || null, s.id); live(c.id).off.delete(s.id); }
  return { ok: true }; };
export const end = (c, user) => { const s = mine(c, user); if (!s) return { error: 'You are not on a shift.' }; q('UPDATE transit_shifts SET ended = ? WHERE id = ?').run(now(), s.id); live(c.id).off.delete(s.id);
  return { ok: true, summary: { fares: s.fares, takings: s.takings, mins: Math.round((now() - s.started) / 60000) } }; };

// ── fares: from the passenger's bank account (the Civilian economy) to the driver's ──
const near = (c, s, radius = 70) => { const L = live(c.id), me = L.pos.get(s.name.toLowerCase()); if (!me) return [];
  return L.players.filter(p => p.name.toLowerCase() !== s.name.toLowerCase() && Math.hypot(p.x - me.x, p.z - me.z) <= radius).map(p => ({ name: p.name, id: p.id, team: p.team, dist: Math.round(Math.hypot(p.x - me.x, p.z - me.z)) })).sort((a, b) => a.dist - b.dist); };
export const nearby = (c, user) => { const s = mine(c, user); return s ? near(c, s) : []; };
const charge = (c, key, s, who, auto) => { const cf = conf(c); if (!cf.fare) return { error: 'This server’s buses are free.' };
  const u = (who.id && q('SELECT id FROM users WHERE roblox_id = ?').get(String(who.id))) || q('SELECT id FROM users WHERE lower(roblox_name) = lower(?)').get(who.name);
  if (!u) return { error: `${who.name} has no Oversite account here, so there is nothing to charge.` };
  const m = q('SELECT 1 FROM members WHERE community_id = ? AND user_id = ?').get(c.id, u.id); if (!m) return { error: `${who.name} isn’t a member of this server’s CAD.` };
  civ.ensure(c, u.id); civ.ensure(c, s.user_id); const r = civ.move(c.id, u.id, -cf.fare, 'transit', `Bus fare, bus ${s.bus}`); if (r.error) return { error: `${who.name} can’t pay: ${r.error}` };
  civ.move(c.id, s.user_id, cf.fare, 'transit', `Fare from ${who.name}, bus ${s.bus}`); q('UPDATE transit_shifts SET fares = fares + 1, takings = takings + ? WHERE id = ?').run(cf.fare, s.id);
  live(c.id).rode.set(`${s.id}:${who.name.toLowerCase()}`, now());
  if (key) commandAs(c, key, `:pm ${who.name} You paid a ${civ.money(cf.fare)} bus fare${auto ? ' as you boarded' : ''} (bus ${s.bus}). Thanks for riding.`.slice(0, 200), 'Oversite Transit');
  return { ok: true, name: who.name, amount: cf.fare }; };
export const fare = (c, key, user, j) => { const s = mine(c, user); if (!s) return { error: 'Start a shift first.' };
  const list = near(c, s), names = (Array.isArray(j.names) ? j.names : [j.name]).map(n => String(n || '').toLowerCase()).filter(Boolean);
  const pick = j.all ? list.filter(p => now() - (live(c.id).rode.get(`${s.id}:${p.name.toLowerCase()}`) || 0) > 15 * 60000) : list.filter(p => names.includes(p.name.toLowerCase()));
  if (!pick.length) return { error: j.all ? 'Nobody new is on or next to the bus.' : 'That player isn’t next to the bus.' };
  const done = [], failed = []; for (const p of pick) { const r = charge(c, key, s, p, false); r.ok ? done.push(p.name) : failed.push(r.error); }
  return done.length ? { ok: true, charged: done, failed, amount: conf(c).fare } : { error: failed[0] || 'Nobody could be charged.' }; };

// ── reports ──
const rep = r => ({ id: r.id, kind: r.kind, title: r.title, body: r.body || '', location: r.location || '', bus: r.bus || '', by: r.by_name || '', at: r.at, status: r.status, closed_by: r.closed_by || '' });
export const reports = c => q('SELECT * FROM transit_reports WHERE community_id = ? ORDER BY (status = \'open\') DESC, id DESC LIMIT 80').all(c.id).map(rep);
export const report = (c, user, j) => { const kind = KINDS[j.kind] ? j.kind : 'other', title = T(j.title, 80); if (!title) return { error: 'Give the report a title.' };
  const s = mine(c, user), p = s && live(c.id).pos.get(s.name.toLowerCase());
  const id = Number(q('INSERT INTO transit_reports (community_id, kind, title, body, location, bus, by_user, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, kind, title, T(j.body, 3000), T(j.location, 80) || (p ? [p.postal && 'Postal ' + p.postal, p.street].filter(Boolean).join(', ') : ''), T(j.bus, 12) || s?.bus || '', user.id, user.roblox_name || user.name || '', now()).lastInsertRowid);
  return { ok: true, id }; };
export const closeReport = (c, by, id, reopen) => q('UPDATE transit_reports SET status = ?, closed_by = ? WHERE community_id = ? AND id = ?').run(reopen ? 'open' : 'closed', reopen ? null : by, c.id, +id || 0).changes ? { ok: true } : { error: 'That report is gone.' };

// ── help: transit police (a CAD alert for police) and panic (a 911 call at the bus, the nearest five officers sent to it) ──
const where = p => p ? [p.postal && 'Postal ' + p.postal, p.street].filter(Boolean).join(', ') || 'Unknown location' : 'Unknown location';
export const police = (c, user, j) => { const s = mine(c, user); if (!s) return { error: 'Start a shift first.' }; const text = T(j.text, 280); if (!text) return { error: 'Say what you need.' };
  const p = live(c.id).pos.get(s.name.toLowerCase()); return { ok: true, alert: { depts: ['pd'], title: `Transit police: bus ${s.bus}`, text: `${text} (${s.name}, ${where(p)})` } }; };
const gap = new Map();
export const panic = (c, user) => { const s = mine(c, user); if (!s) return { error: 'Start a shift first.' }; if (now() - (gap.get(s.id) || 0) < 60000) return { error: 'Panic was just sent. Help is on the way.' }; gap.set(s.id, now());
  const L = live(c.id), p = L.pos.get(s.name.toLowerCase()); q("UPDATE transit_shifts SET status = 'emergency' WHERE id = ?").run(s.id);
  const T2 = c.settings.teams || {}, short = c.settings.depts?.pd?.short || 'LE';
  const cops = p ? L.players.filter(x => (T2[x.team] ?? (/police|sheriff/i.test(x.team) ? 'pd' : '')) === 'pd').map(x => ({ ...x, d: Math.hypot(x.x - p.x, x.z - p.z) })).sort((a, b) => a.d - b.d).slice(0, 5) : [];
  const id = civ.autoCall(c, 'pd', where(p), `TRANSIT PANIC: bus ${s.bus}, driver ${s.name} needs help now`, p ? [p.x, p.z] : null).lastInsertRowid, call = `CIV${id}@${Math.floor(q('SELECT at FROM civ_calls WHERE id = ?').get(id).at / 1000)}`;   // the call's key on the board
  return { ok: true, call, units: cops.map(x => `${short} ${x.callsign || x.name}`), alert: { depts: ['pd'], title: `Transit panic: bus ${s.bus}`, text: `${s.name} pressed panic at ${where(p)}. ${cops.length ? cops.length + ' nearest officers sent.' : 'No officers in the server.'}` } }; };

// ── each reading of the server: where everyone is, off-route buses, and riders who board (when the server charges by itself) ──
const split = v => { const [name, id] = String(v || '').split(':'); return { name: name || '', id: /^\d+$/.test(id || '') ? id : '' }; };
export const observe = (c, key, body) => { const shifts = open(c.id); if (!shifts.length) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const L = live(c.id), cf = conf(c), t = now(), was = L.pos; L.at = t; L.pos = new Map(); L.players = [];
  for (const p of j.Players || []) { const { name, id } = split(p.Player), at = p.Location; if (!name || !at || !Number.isFinite(at.LocationX)) continue;
    const row = { name, id, team: p.Team || '', callsign: p.Callsign || '', x: at.LocationX, z: at.LocationZ, postal: at.PostalCode || '', street: at.StreetName || '' }; L.pos.set(name.toLowerCase(), row); L.players.push(row); }
  const R = new Map(routes(c).map(r => [r.id, r]));
  for (const s of shifts) { const me = L.pos.get(s.name.toLowerCase()), r = R.get(s.route_id); if (!me) continue;
    // off route: farther than the server allows from the line for a few readings in a row; one message, again only after 3 minutes
    if (cf.off.on && r && s.status === 'in service') { const d = along(r.path, [me.x, me.z])[0], o = L.off.get(s.id) || {};
      if (d > OFF[cf.off.how]) { if (!o.since) L.off.set(s.id, { since: t }); else if (t - o.since > 8000 && key && t - (L.told.get(s.id) || 0) > 180000) { L.told.set(s.id, t); commandAs(c, key, `:pm ${s.name} ${cf.off.msg}`.slice(0, 200), 'Oversite Transit'); } }
      else L.off.delete(s.id); }
    // boarding: someone who stays right next to the moving bus for two readings rides it; charged once per 15 minutes
    if (cf.autoFare && cf.fare) { const prev = was.get(s.name.toLowerCase()), moving = prev && Math.hypot(me.x - prev.x, me.z - prev.z) > 15;
      for (const p of L.players) { if (p === me || Math.hypot(p.x - me.x, p.z - me.z) > 25) continue; const k = `${s.id}:${p.name.toLowerCase()}`, b = L.rode.get('b' + k) || 0;
        if (!moving) continue; if (!b) { L.rode.set('b' + k, t); continue; } if (t - b > 30000) { L.rode.set('b' + k, t); continue; }   // the second reading in a row, still riding
        if (t - (L.rode.get(k) || 0) > 15 * 60000) charge(c, key, s, p, true); } } } };

// what the Transit app shows: settings, routes, the buses, your shift, reports
export const view = (c, user, admin) => { const s = mine(c, user);
  return { conf: conf(c), routes: routes(c), buses: buses(c), shift: s ? { ...shiftRow(s), near: near(c, s) } : null, reports: reports(c), kinds: KINDS, statuses: STATUSES, admin: !!admin, linked: !!user.roblox_name }; };
export const tracker = c => ({ routes: routes(c), buses: buses(c).map(b => ({ bus: b.bus, x: b.x, z: b.z, route: b.route, next: b.next, status: b.status, off: b.off, postal: b.postal })) });
