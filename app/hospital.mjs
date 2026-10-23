// Hospital: EMS and the hospital, in the Fire Department MDT. A crew taking a patient in sends the hospital a pre-alert: who the
// patient is, what happened, their condition and vitals, what they've been given, what they'll need on arrival and how to treat
// them, and the response code. The hospital board lists every ambulance on its way with a live ETA (from where the crew is in game)
// and each side can message the other about the patient. The hospital marks the patient arrived and handed over.
// Hospitals are places on the map the server's admins set (ER:LC map pixels, 5355 across). Settings: c.settings.hospital = { list }
import { db, now, communities } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS hospital_inbound (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, hospital TEXT,
  unit TEXT, by_user INTEGER, by_name TEXT NOT NULL, patient TEXT, complaint TEXT NOT NULL, condition TEXT NOT NULL, vitals TEXT, treatment TEXT, needs TEXT, advice TEXT,
  code INTEGER NOT NULL DEFAULT 2, status TEXT NOT NULL DEFAULT 'enroute', ack_by TEXT, ack_at INTEGER, done_by TEXT, created INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS hospital_inbound_c ON hospital_inbound (community_id, status, id);
CREATE TABLE IF NOT EXISTS hospital_msgs (id INTEGER PRIMARY KEY, inbound_id INTEGER NOT NULL REFERENCES hospital_inbound(id) ON DELETE CASCADE, side TEXT NOT NULL, name TEXT, text TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS hospital_msgs_i ON hospital_msgs (inbound_id, id);`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f<>]/g, '').trim().slice(0, n);
const SIZE = 5355, num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
export const CONDITIONS = { stable: 'Stable', serious: 'Serious', critical: 'Critical', deceased: 'Deceased' }, CODES = { 1: 'Code 1: no lights', 2: 'Code 2: urgent', 3: 'Code 3: lights and sirens' };
export const STATUS = { enroute: 'On the way', arrived: 'Arrived', handed: 'Handed over', cancelled: 'Cancelled' };

export const hospitals = c => { const L = (communities.byId(c.id) || c).settings.hospital?.list; return Array.isArray(L) ? L : []; };
export const saveHospitals = (c, j) => { const list = (Array.isArray(j.list) ? j.list : []).slice(0, 6).map((h, i) => ({ id: /^[a-z0-9]{3,12}$/.test(h?.id || '') ? h.id : Math.random().toString(36).slice(2, 9),
    name: T(h?.name, 40) || `Hospital ${i + 1}`, x: num(h?.x), z: num(h?.z) })).filter(h => Number.isFinite(h.x) && Number.isFinite(h.z));
  const st = communities.byId(c.id).settings; st.hospital = { ...(st.hospital || {}), list }; communities.saveSettings(c.id, st); c.settings.hospital = st.hospital; return { ok: true }; };

// where every crew is and how fast it's going, from the last readings of the server
const LIVE = new Map(); const live = cid => { let L = LIVE.get(cid); if (!L) LIVE.set(cid, L = new Map()); return L; };
export const observe = (c, body) => { if (!q("SELECT 1 FROM hospital_inbound WHERE community_id = ? AND status = 'enroute' LIMIT 1").get(c.id)) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const L = live(c.id), t = now();
  for (const p of j.Players || []) { const name = String(p.Player || '').split(':')[0].toLowerCase(), at = p.Location; if (!name || !at || !Number.isFinite(at.LocationX)) continue;
    const was = L.get(name), hist = (was?.hist || []).filter(h => t - h.t < 25000); hist.push({ t, x: at.LocationX, z: at.LocationZ });
    L.set(name, { x: at.LocationX, z: at.LocationZ, postal: at.PostalCode || '', street: at.StreetName || '', hist, seen: t }); } };
// a live ETA: the road is about a third longer than a straight line; the crew's own speed when it's moving, otherwise what its code
// usually drives at (map pixels a second: about 0.6 mph each)
const PACE = { 1: 50, 2: 65, 3: 80 };
const eta = (c, r) => { const h = hospitals(c).find(x => x.id === r.hospital) || hospitals(c)[0], p = live(c.id).get(String(r.by_name || '').toLowerCase());
  if (!h || !p || now() - p.seen > 60000) return { eta: null, dist: null, where: p ? [p.postal && 'Postal ' + p.postal, p.street].filter(Boolean).join(', ') : '' };
  const d = Math.hypot(p.x - h.x, p.z - h.z) * 1.3, H = p.hist, sp = H.length > 1 ? Math.hypot(H.at(-1).x - H[0].x, H.at(-1).z - H[0].z) / Math.max(1, (H.at(-1).t - H[0].t) / 1000) : 0;
  const pace = sp > 20 ? (sp + PACE[r.code]) / 2 : PACE[r.code];
  return { eta: d < 60 ? 0 : Math.max(1, Math.round(d / pace)), dist: Math.round(d * 0.28), where: [p.postal && 'Postal ' + p.postal, p.street].filter(Boolean).join(', '), x: p.x, z: p.z }; };   // dist in metres (1 px ≈ 0.28 m)

const row = (c, r) => ({ id: r.id, hospital: r.hospital || '', unit: r.unit || '', by: r.by_name, by_user: r.by_user, patient: r.patient || '', complaint: r.complaint, condition: r.condition, vitals: r.vitals || '', treatment: r.treatment || '',
  needs: r.needs || '', advice: r.advice || '', code: r.code, status: r.status, ack_by: r.ack_by || '', ack_at: r.ack_at, done_by: r.done_by || '', created: r.created, updated: r.updated,
  msgs: q('SELECT side, name, text, at FROM hospital_msgs WHERE inbound_id = ? ORDER BY id').all(r.id), ...(r.status === 'enroute' ? eta(c, r) : {}) });
export const list = c => q("SELECT * FROM hospital_inbound WHERE community_id = ? AND (status IN ('enroute', 'arrived') OR updated > ?) ORDER BY (status = 'enroute') DESC, (status = 'arrived') DESC, code DESC, id DESC LIMIT 40").all(c.id, now() - 6 * 3600000).map(r => row(c, r));
const get = (c, id) => q('SELECT * FROM hospital_inbound WHERE community_id = ? AND id = ?').get(c.id, +id || 0);

// a pre-alert from a crew (one patient on the way per person at a time; sending again updates it)
export const send = (c, user, j) => { const complaint = T(j.complaint, 160); if (!complaint) return { error: 'Say what happened to the patient.' };
  if (!user.roblox_name) return { error: 'Link your Roblox account first, so the hospital can see where you are.' };
  const H = hospitals(c), hosp = H.find(h => h.id === j.hospital)?.id || H[0]?.id || '', cond = CONDITIONS[j.condition] ? j.condition : 'serious', code = [1, 2, 3].includes(+j.code) ? +j.code : 2;
  const v = [hosp, T(j.unit, 40), T(j.patient, 120), complaint, cond, T(j.vitals, 300), T(j.treatment, 600), T(j.needs, 400), T(j.advice, 800), code, now()];
  const old = j.id && get(c, j.id); if (old) { if (old.by_user !== user.id) return { error: 'Only the crew that sent it can change it.' };
    q('UPDATE hospital_inbound SET hospital = ?, unit = ?, patient = ?, complaint = ?, condition = ?, vitals = ?, treatment = ?, needs = ?, advice = ?, code = ?, updated = ? WHERE id = ?').run(...v, old.id); return { ok: true, id: old.id }; }
  const id = Number(q('INSERT INTO hospital_inbound (community_id, hospital, unit, patient, complaint, condition, vitals, treatment, needs, advice, code, updated, by_user, by_name, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, ...v, user.id, user.roblox_name, now()).lastInsertRowid); return { ok: true, id, fresh: true }; };
export const say = (c, user, j, side) => { const r = get(c, j.id); if (!r) return { error: 'That patient is gone.' }; const text = T(j.text, 500); if (!text) return { error: 'Write a message.' };
  q('INSERT INTO hospital_msgs (inbound_id, side, name, text, at) VALUES (?, ?, ?, ?, ?)').run(r.id, side === 'ems' ? 'ems' : 'hospital', T(user.roblox_name || user.name, 40), text, now()); q('UPDATE hospital_inbound SET updated = ? WHERE id = ?').run(now(), r.id); return { ok: true, row: r }; };
// ack: the hospital has seen it; arrived / handed / cancelled: where the patient is
export const act = (c, user, j) => { const r = get(c, j.id); if (!r) return { error: 'That patient is gone.' }; const who = T(user.roblox_name || user.name, 40), a = String(j.action || '');
  if (a === 'ack') q('UPDATE hospital_inbound SET ack_by = ?, ack_at = ?, updated = ? WHERE id = ?').run(who, now(), now(), r.id);
  else if (STATUS[a] && a !== 'enroute') { if (a === 'cancelled' && r.by_user !== user.id) return { error: 'Only the crew that sent it can cancel it.' }; q('UPDATE hospital_inbound SET status = ?, done_by = ?, updated = ? WHERE id = ?').run(a, who, now(), r.id); }
  else return { error: 'Unknown action.' }; return { ok: true, row: r }; };
export const view = (c, user, admin) => ({ hospitals: hospitals(c), inbound: list(c), conditions: CONDITIONS, codes: CODES, status: STATUS, admin: !!admin, me: user.id, linked: !!user.roblox_name });
export const summary = r => ({ id: r.id, unit: r.unit || '', by: r.by_name, complaint: r.complaint, condition: r.condition, code: r.code });
