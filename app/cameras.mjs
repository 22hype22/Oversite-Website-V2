// Plate cameras (Flock cameras): the plate readers that stand in ER:LC's Liberty County, in the places the game has them (FIXED,
// below), so nobody places or moves them. Admins can switch them off and pick how far they see. While they are on, the plate reader stops watching the whole map: a flagged car (stolen, a BOLO, its owner wanted,
// bad papers) only sets off an alert when it passes within range of a camera, and the alert says which camera saw it. ER:LC
// doesn't say where a car is, so a car is where its owner is (the same as the plate reader). Checked on every live reading, so a
// car driving past isn't missed. Settings: c.settings.cameras = { on, range: 'short' | 'normal' | 'long' } (on unless switched off)
import { communities } from './db.mjs';
import { flagReasons, postalNear, G2M, PLATE } from './police.mjs';

export const MAX = 60, RANGES = { short: 35, normal: 55, long: 90 };   // ER:LC map pixels (about 0.45 m each): roughly 15, 25 and 40 metres
// where the game's cameras stand (ER:LC map pixels), read off the in-game map; each is named after the postal it's nearest
// ("Postal 214 camera", and "Postal 214 camera 2" for a second one there)
const SPOTS = [
  [2903.3, 602.3],
  [1230.1, 1009.6],
  [1261.5, 931.1],
  [1337.5, 915.4],
  [1662.1, 899.9],
  [3751.3, 1027.0],
  [3835.1, 1021.9],
  [2062.5, 1219.6],
  [2405.5, 1214.6],
  [3080.9, 1199.4],
  [3903.0, 1215.7],
  [3942.2, 1299.5],
  [4099.3, 1346.7],
  [4180.5, 1310.1],
  [3533.8, 1367.3],
  [4096.5, 1634.7],
  [2986.3, 1780.5],
  [1546.2, 1983.8],
  [1629.9, 2072.8],
  [3342.1, 2131.6],
  [3499.2, 2068.9],
  [2147.8, 2832.4],
  [2514.4, 2728.0],
  [2535.2, 2937.4],
  [3362.5, 2938.0],
  [3988.2, 2948.9],
  [3990.9, 2907.0],
  [1102.7, 3423.4],
  [1626.4, 3340.0],
  [1985.1, 3408.3],
  [2498.4, 3188.7],
  [2880.5, 3398.4],
  [1346.1, 3612.1],
  [1652.4, 3612.3],
  [1741.4, 3722.3],
  [2862.0, 3571.2],
  [2909.1, 3623.6],
  [1233.4, 3758.6],
  [1469.0, 3894.9],
  [1678.4, 3889.8],
  [2963.9, 3848.8],
  [3021.6, 3780.8],
  [1481.9, 4073.0],
  [1515.8, 4324.3],
  [1780.3, 4156.9]];
const named = new Map();
export const FIXED = SPOTS.map(([x, z], i) => { const p = /(\d+)$/.exec(postalNear(x, z))?.[1], base = p ? `Postal ${p} camera` : `Camera ${i + 1}`, n = (named.get(base) || 0) + 1; named.set(base, n);
  return { id: 'c' + String(i + 1).padStart(2, '0'), name: n > 1 ? `${base} ${n}` : base, x, z }; });
// they're placed on the map picture; a server whose map is calibrated (off: how far the picture sits from ER:LC's positions) gets
// them moved by the same amount, so they stand where the game has them
export const of = (c, off = [0, 0]) => { const s = (communities.byId(c.id) || c).settings.cameras || {};
  return { on: s.on !== false, range: RANGES[s.range] ? s.range : 'normal', list: off[0] || off[1] ? FIXED.map(k => ({ ...k, x: k.x - off[0], z: k.z - off[1] })) : FIXED, fixed: true }; };
export const active = c => of(c).on;
// only whether they're on and how far they see can change; the cameras themselves are the game's
export const save = (c, j) => { const s = { on: !!j.on, range: RANGES[j.range] ? j.range : 'normal' };
  const st = communities.byId(c.id).settings; st.cameras = s; communities.saveSettings(c.id, st); c.settings.cameras = s; return { ok: true }; };

// per server: when each car was last reported at each camera (so one pass is one alert), and the latest hits for the panel
const seen = new Map(), recent = new Map();
export const log = c => recent.get(c.id) || [];
// one live reading: every car on the server whose owner is within range of a camera, checked against the records
export const check = (c, body, off) => { if (!active(c)) return []; let j; try { j = JSON.parse(body); } catch (e) { return []; }
  const s = of(c, off), R = RANGES[s.range], at = new Map((j.Players || []).map(p => [String(p.Player || '').split(':')[0].toLowerCase(), p.Location])), hits = [], t = Date.now();
  for (const v of j.Vehicles || []) { const plate = PLATE(v.Plate), L = at.get(String(v.Owner || '').toLowerCase()); if (!plate || !L || !Number.isFinite(+L.LocationX)) continue;
    const x = +L.LocationX, z = +L.LocationZ; let cam = null, d = Infinity;
    for (const k of s.list) { const e = Math.hypot(k.x - x, k.z - z); if (e <= R && e < d) { d = e; cam = k; } } if (!cam) continue;
    const key = `${c.id}:${plate}:${cam.id}`; if (t - (seen.get(key) || 0) < 600000) continue;   // a flagged car at the same camera: one alert every ten minutes
    const f = flagReasons(c.id, plate); if (!f || !f.why.length) continue; seen.set(key, t); if (seen.size > 5000) seen.clear();
    const h = { plate, vehicle: [f.car.color, f.car.model].filter(Boolean).join(' '), owner: f.car.owner || '', owner_rid: f.car.owner_rid || '', reasons: f.why.join(', '),
      camera: cam.name, where: postalNear(x, z) || cam.name, x: x * G2M, y: z * G2M };
    hits.push(h); const L2 = recent.get(c.id) || []; L2.unshift({ at: t, plate, vehicle: h.vehicle, owner: h.owner, reasons: h.reasons, camera: cam.name, cam: cam.id }); recent.set(c.id, L2.slice(0, 30)); }
  return hits; };
