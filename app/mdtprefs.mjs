// A Premium person's own MDT setup: alert sounds, the tablet's look and the map style. Saved on the account, so it follows
// them to every server's CAD and every device. Without Premium the CAD just uses the defaults.
import { db } from './db.mjs';

try { db.exec('ALTER TABLE users ADD COLUMN mdt_prefs TEXT'); } catch (e) {}
// their own sound files for the call alert and the panic alarm, one of each
db.exec(`CREATE TABLE IF NOT EXISTS user_sounds (user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL,
  mime TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', data BLOB NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (user_id, kind))`);
const q = sql => db.prepare(sql);

export const OPTIONS = {
  call: ['station', 'pager', 'chime', 'soft', 'custom'], panic: ['erlc', 'siren', 'klaxon', 'custom'],   // custom: their own uploaded file
  accent: ['dept', 'blue', 'teal', 'violet', 'amber', 'gold', 'rose'], wall: ['none', 'grid', 'topo', 'carbon', 'glow'], frame: ['graphite', 'silver', 'gold', 'white'],
  map: ['', '2d-light', '2d-dark'] };   // the 3D map and the 2D Labels map were removed: a saved choice of either falls back to the default
export const DEFAULTS = { call: 'station', panic: 'erlc', vol: 90, accent: 'dept', wall: 'none', frame: 'graphite', map: '' };

const pick = (k, v) => OPTIONS[k].includes(v) ? v : DEFAULTS[k];
export const clean = b => { const o = {}; for (const k of Object.keys(OPTIONS)) o[k] = pick(k, b?.[k]);
  o.vol = Number.isFinite(+b?.vol) ? Math.round(Math.max(0, Math.min(100, +b.vol))) : DEFAULTS.vol; return o; };
// with `files`, where the CAD finds their own sounds; "custom" without a file to play falls back to the default sound
const withFiles = (uid, o) => { const f = files(uid); for (const k of SOUND_KINDS) if (o[k] === 'custom' && !f[k]) o[k] = DEFAULTS[k]; o.files = f; return o; };
export const get = uid => { let o; try { o = clean(JSON.parse(q('SELECT mdt_prefs FROM users WHERE id = ?').get(uid)?.mdt_prefs || '{}')); } catch (e) { o = { ...DEFAULTS }; } return withFiles(uid, o); };
// a partial save (the CAD only sends the map style) keeps everything else
export const save = (uid, b) => { const o = clean({ ...get(uid), ...(b || {}) }); q('UPDATE users SET mdt_prefs = ? WHERE id = ?').run(JSON.stringify(o), uid); return withFiles(uid, o); };

// ── their own sound files ──
// An mp3, wav, ogg, m4a or webm of up to 1 MB. What it is comes from the file's own first bytes, never from what the browser called
// it, and that is the type it is served as. It plays only for them, so it isn't put through a check the way a server's pictures are.
export const SOUND_KINDS = ['call', 'panic'];
export const SOUND_MAX = 1000000;
const soundType = b => {
  if (b.length < 12) return '';
  if (b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE') return 'audio/wav';
  if (b.toString('latin1', 0, 4) === 'OggS') return 'audio/ogg';
  if (b.toString('latin1', 0, 3) === 'ID3' || (b[0] === 0xFF && (b[1] & 0xE6) === 0xE2)) return 'audio/mpeg';   // a tag, or an MPEG audio frame
  if (b[0] === 0xFF && (b[1] & 0xF6) === 0xF0) return 'audio/aac';   // ADTS
  if (b.toString('latin1', 4, 8) === 'ftyp') return 'audio/mp4';
  if (b.readUInt32BE(0) === 0x1A45DFA3) return 'audio/webm';
  return ''; };
export const files = uid => Object.fromEntries(q('SELECT kind, name, updated FROM user_sounds WHERE user_id = ?').all(uid)
  .filter(r => SOUND_KINDS.includes(r.kind)).map(r => [r.kind, { url: `/api/me/sound/${r.kind}?v=${r.updated}`, name: r.name }]));
export const sound = (uid, kind) => SOUND_KINDS.includes(kind) ? q('SELECT mime, data, updated FROM user_sounds WHERE user_id = ? AND kind = ?').get(uid, kind) : null;
export const saveSound = (uid, kind, dataUrl, name) => {
  if (!SOUND_KINDS.includes(kind)) return { error: 'Pick the call alert or the panic alarm.' };
  const m = /^data:[^;,]*;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return { error: 'That file couldn’t be read. Pick it again.' };
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length > SOUND_MAX) return { error: 'That sound is over 1 MB. Use a shorter clip.' };
  const mime = soundType(buf); if (!mime) return { error: 'That isn’t a sound file we can play. Use an mp3, wav, ogg, m4a or webm.' };
  const nm = String(name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 80) || 'Your sound';
  q('INSERT INTO user_sounds (user_id, kind, mime, name, data, updated) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id, kind) DO UPDATE SET mime = excluded.mime, name = excluded.name, data = excluded.data, updated = excluded.updated')
    .run(uid, kind, mime, nm, buf, Date.now());
  return { ok: true, setup: save(uid, { [kind]: 'custom' }) }; };
export const removeSound = (uid, kind) => {
  if (!SOUND_KINDS.includes(kind)) return { error: 'Pick the call alert or the panic alarm.' };
  q('DELETE FROM user_sounds WHERE user_id = ? AND kind = ?').run(uid, kind);
  return { ok: true, setup: save(uid, {}) }; };
