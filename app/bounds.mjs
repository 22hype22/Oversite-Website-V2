// Jurisdiction boundaries: the owner draws areas on the map for the whole server and for each in-game team. A player who leaves
// theirs gets a private message in game, and is loaded (respawned) if they aren't back inside before the grace time runs out.
// Areas live in presets ("save slots"); one preset is live at a time. Points are ER:LC map coordinates (LocationX, LocationZ),
// so checking a player needs no conversion. Settings: c.settings.bounds = { on, grace, exemptStaff, active, presets: [{ id, name, zones }] }
// where zones maps '*' (everyone) or an in-game team name to a list of polygons, each a list of [x, z] points.
import { communities, siteSettings } from './db.mjs';
import { command } from './staff.mjs';

export const MAX_PRESETS = 8, MAX_ZONES = 16, MAX_POINTS = 240, GRACE = [15, 30, 45, 60, 90, 120, 180, 300], ALL = '*';
const SIZE = 5355;                                                           // ER:LC's map, in the units its API reports
const id = () => Math.random().toString(36).slice(2, 9);
const blank = () => ({ id: id(), name: 'Preset 1', zones: {} });
export const of = c => { const b = communities.byId(c.id)?.settings.bounds || {}, presets = Array.isArray(b.presets) && b.presets.length ? b.presets : [blank()];
  return { on: !!b.on, grace: GRACE.includes(+b.grace) ? +b.grace : 60, exemptStaff: b.exemptStaff !== false, active: presets.some(p => p.id === b.active) ? b.active : presets[0].id, presets }; };

// everything the editor sends is checked and trimmed here: names, team keys, point counts, coordinates inside the map
const num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
const cleanZones = z => { const out = {}; if (!z || typeof z !== 'object') return out;
  for (const [k, polys] of Object.entries(z).slice(0, 40)) { const key = k === ALL ? ALL : String(k).trim().slice(0, 40); if (!key || !Array.isArray(polys)) continue;
    const list = polys.slice(0, MAX_ZONES).filter(Array.isArray).map(p => p.slice(0, MAX_POINTS).filter(q => Array.isArray(q) && q.length >= 2).map(q => [num(q[0]), num(q[1])])).filter(p => p.length >= 3);
    if (list.length) out[key] = list; }
  return out; };
export const save = (c, j) => { const presets = (Array.isArray(j.presets) ? j.presets : []).slice(0, MAX_PRESETS).map((p, i) => ({ id: /^[a-z0-9]{3,12}$/.test(p?.id) ? p.id : id(), name: String(p?.name || '').trim().slice(0, 32) || `Preset ${i + 1}`, zones: cleanZones(p?.zones) }));
  if (!presets.length) presets.push(blank());
  const active = presets.some(p => p.id === j.active) ? j.active : presets[0].id;
  const s = communities.byId(c.id).settings; s.bounds = { on: !!j.on, grace: GRACE.includes(+j.grace) ? +j.grace : 60, exemptStaff: j.exemptStaff !== false, active, presets };
  communities.saveSettings(c.id, s); const st = state(c.id); st.out.clear(); keep(c.id, st); return { ok: true, bounds: of(c), log: st.log }; };

// ── checking players ──
const inside = (x, z, poly) => { let hit = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j];
  if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit; } return hit; };
const within = (x, z, polys) => !polys?.length || polys.some(p => inside(x, z, p));
// the areas a player has to stay in: the whole-server area, and their team's (either can be empty, meaning no limit)
const limits = (zones, team) => [zones[ALL], zones[team]].filter(p => p?.length);
// who is outside since when, and the recent activity, kept in the database too so a restart or deploy doesn't reset anyone's clock
const STATE = new Map(), KEY = cid => 'bounds_state_' + cid;
const state = cid => { let st = STATE.get(cid); if (st) return st; let saved = {}; try { saved = JSON.parse(siteSettings.get(KEY(cid)) || '{}'); } catch (e) {}
  st = { out: new Map(Object.entries(saved.out || {})), log: Array.isArray(saved.log) ? saved.log : [] }; STATE.set(cid, st); return st; };
const keep = (cid, st) => { try { siteSettings.set(KEY(cid), JSON.stringify({ out: Object.fromEntries(st.out), log: st.log })); } catch (e) {} };
const note = (cid, st, e) => { st.log.unshift({ ...e, at: Date.now() }); st.log.length = Math.min(st.log.length, 40); console.log(`bounds ${cid}: ${e.name} ${e.kind}${e.where ? ' (' + e.where + ')' : ''}${e.why ? ': ' + e.why : ''}`); };
// send a command, and put it in the activity list if ER:LC refuses it, so the owner can see why nothing happened in game
const send = (c, key, st, cmd, e) => command(c, key, cmd).then(r => { if (r && r.ok === false) { note(c.id, st, { ...e, kind: 'failed', why: String(r.message || 'ER:LC refused the command').slice(0, 200) }); keep(c.id, st); } });
export const log = c => state(c.id).log;
const nameOf = p => String(p.Player || '').split(':')[0];
const label = (zones, team) => zones[team]?.length ? `the ${team} area` : 'the server area';

// one pass over a snapshot of the server: warn whoever just left, load whoever is still out when their time is up
export const check = (c, key, body) => { const b = of(c); if (!b.on || !key) return; const zones = b.presets.find(p => p.id === b.active)?.zones || {};
  if (!Object.keys(zones).length) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const st = state(c.id), now = Date.now(), seen = new Set(); let dirty = false;
  for (const p of j.Players || []) { const L = p.Location, name = nameOf(p); if (!name || !L || !Number.isFinite(L.LocationX)) continue; seen.add(p.Player);
    if (b.exemptStaff && p.Permission && p.Permission !== 'Normal') { if (st.out.delete(p.Player)) dirty = true; continue; }
    const team = p.Team || '', lim = limits(zones, team); if (!lim.length) { if (st.out.delete(p.Player)) dirty = true; continue; }
    const ok = lim.every(polys => within(L.LocationX, L.LocationZ, polys)), o = st.out.get(p.Player);
    if (ok) { if (o) { st.out.delete(p.Player); dirty = true; if (o.warned && !o.loads) note(c.id, st, { kind: 'back', name, team }); dirty = true; } continue; }
    const where = zones[ALL]?.length && !within(L.LocationX, L.LocationZ, zones[ALL]) ? 'the server area' : label(zones, team);
    if (!o) { st.out.set(p.Player, { since: now, team, warned: true, loads: 0 }); const e = { kind: 'left', name, team, where }; note(c.id, st, e); dirty = true;
      send(c, key, st, `:pm ${name} You left ${where}. Go back within ${b.grace} seconds or you will be loaded.`, { ...e, cmd: 'pm' }); continue; }
    if (o.team !== team) { st.out.set(p.Player, { since: now, team, warned: true, loads: 0 }); dirty = true; continue; }   // changed team: start over with the new rules
    if (o.loads >= 2 || now - o.since < b.grace * 1000) continue;            // two loads in a row and still out: their spawn is outside, so stop
    o.loads++; o.since = now; const e = { kind: 'loaded', name, team, where }; note(c.id, st, e); dirty = true; send(c, key, st, `:load ${name}`, { ...e, cmd: 'load' }); }
  for (const k of st.out.keys()) if (!seen.has(k)) { st.out.delete(k); dirty = true; }   // left the server
  if (dirty) keep(c.id, st); };

// enforcement runs whether or not anyone has the CAD open: every few seconds, servers with boundaries switched on are read
// (the live feed's latest answer when it has a fresh one, otherwise one request) and checked
export const start = (feedFor, keyOf) => setInterval(async () => {
  for (const c of communities.all()) { if (!c.settings.bounds?.on || c.suspended) continue; const key = keyOf(c.id); if (!key) continue;
    try { const s = await feedFor(c).snapshot(); if (s.status === 200) check(c, key, s.body); } catch (e) {} } }, 5000);
