// Plate cameras (like Flock cameras): fixed readers staff place on the map in the CAD's Server Staff panel, under Mapping. Once a
// server has cameras switched on, the plate reader stops watching the whole map: a flagged car (stolen, a BOLO, its owner wanted,
// bad papers) only sets off an alert when it passes within range of a camera, and the alert says which camera saw it. ER:LC
// doesn't say where a car is, so a car is where its owner is (the same as the plate reader). Checked on every live reading, so a
// car driving past isn't missed. Settings: c.settings.cameras = { on, range: 'short' | 'normal' | 'long', list: [{ id, name, x, z }] }
import { communities } from './db.mjs';
import { flagReasons, postalNear, G2M, PLATE } from './police.mjs';

export const MAX = 60, RANGES = { short: 35, normal: 55, long: 90 };   // ER:LC map pixels (about 0.45 m each): roughly 15, 25 and 40 metres
const SIZE = 5355, id = () => Math.random().toString(36).slice(2, 9);
const num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
export const of = c => { const s = (communities.byId(c.id) || c).settings.cameras || {};
  return { on: !!s.on, range: RANGES[s.range] ? s.range : 'normal', list: Array.isArray(s.list) ? s.list : [] }; };
export const active = c => { const s = c?.settings?.cameras; return !!(s && s.on && Array.isArray(s.list) && s.list.length); };
export const save = (c, j) => {
  const list = (Array.isArray(j.list) ? j.list : []).slice(0, MAX).filter(k => Number.isFinite(+k?.x) && Number.isFinite(+k?.z))
    .map((k, i) => ({ id: typeof k.id === 'string' && /^[a-z0-9]{3,12}$/.test(k.id) ? k.id : id(), name: T(k.name, 32) || `Camera ${i + 1}`, x: num(k.x), z: num(k.z) }));
  const s = { on: !!j.on, range: RANGES[j.range] ? j.range : 'normal', list };
  if (s.on && !list.length) return { error: 'Place at least one camera, or switch cameras off.' };
  const st = communities.byId(c.id).settings; st.cameras = s; communities.saveSettings(c.id, st); c.settings.cameras = s; return { ok: true }; };

// per server: when each car was last reported at each camera (so one pass is one alert), and the latest hits for the panel
const seen = new Map(), recent = new Map();
export const log = c => recent.get(c.id) || [];
// one live reading: every car on the server whose owner is within range of a camera, checked against the records
export const check = (c, body) => { if (!active(c)) return []; let j; try { j = JSON.parse(body); } catch (e) { return []; }
  const s = of(c), R = RANGES[s.range], at = new Map((j.Players || []).map(p => [String(p.Player || '').split(':')[0].toLowerCase(), p.Location])), hits = [], t = Date.now();
  for (const v of j.Vehicles || []) { const plate = PLATE(v.Plate), L = at.get(String(v.Owner || '').toLowerCase()); if (!plate || !L || !Number.isFinite(+L.LocationX)) continue;
    const x = +L.LocationX, z = +L.LocationZ; let cam = null, d = Infinity;
    for (const k of s.list) { const e = Math.hypot(k.x - x, k.z - z); if (e <= R && e < d) { d = e; cam = k; } } if (!cam) continue;
    const key = `${c.id}:${plate}:${cam.id}`; if (t - (seen.get(key) || 0) < 600000) continue;   // a flagged car at the same camera: one alert every ten minutes
    const f = flagReasons(c.id, plate); if (!f || !f.why.length) continue; seen.set(key, t); if (seen.size > 5000) seen.clear();
    const h = { plate, vehicle: [f.car.color, f.car.model].filter(Boolean).join(' '), owner: f.car.owner || '', owner_rid: f.car.owner_rid || '', reasons: f.why.join(', '),
      camera: cam.name, where: `${cam.name}${postalNear(x, z) ? ', ' + postalNear(x, z) : ''}`, x: x * G2M, y: z * G2M };
    hits.push(h); const L2 = recent.get(c.id) || []; L2.unshift({ at: t, plate, vehicle: h.vehicle, owner: h.owner, reasons: h.reasons, camera: cam.name, cam: cam.id }); recent.set(c.id, L2.slice(0, 30)); }
  return hits; };
