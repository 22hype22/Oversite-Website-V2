// A Premium person's own MDT setup: alert sounds, the tablet's look and the map style. Saved on the account, so it follows
// them to every server's CAD and every device. Without Premium the CAD just uses the defaults.
import { db } from './db.mjs';

try { db.exec('ALTER TABLE users ADD COLUMN mdt_prefs TEXT'); } catch (e) {}
const q = sql => db.prepare(sql);

export const OPTIONS = {
  call: ['station', 'pager', 'chime', 'soft'], panic: ['erlc', 'siren', 'klaxon'],
  accent: ['dept', 'blue', 'teal', 'violet', 'amber', 'gold', 'rose'], wall: ['none', 'grid', 'topo', 'carbon', 'glow'], frame: ['graphite', 'silver', 'gold', 'white'],
  map: ['', '3d-light', '2d-light', '2d-dark'] };   // 3D has one look (3D Dark was dropped); a saved '3d-dark' falls back to the default
export const DEFAULTS = { call: 'station', panic: 'erlc', vol: 90, accent: 'dept', wall: 'none', frame: 'graphite', map: '' };

const pick = (k, v) => OPTIONS[k].includes(v) ? v : DEFAULTS[k];
export const clean = b => { const o = {}; for (const k of Object.keys(OPTIONS)) o[k] = pick(k, b?.[k]);
  o.vol = Number.isFinite(+b?.vol) ? Math.round(Math.max(0, Math.min(100, +b.vol))) : DEFAULTS.vol; return o; };
export const get = uid => { try { return clean(JSON.parse(q('SELECT mdt_prefs FROM users WHERE id = ?').get(uid)?.mdt_prefs || '{}')); } catch (e) { return { ...DEFAULTS }; } };
// a partial save (the CAD only sends the map style) keeps everything else
export const save = (uid, b) => { const o = clean({ ...get(uid), ...(b || {}) }); q('UPDATE users SET mdt_prefs = ? WHERE id = ?').run(JSON.stringify(o), uid); return o; };
