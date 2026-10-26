// The law enforcement MDT's records: people and vehicles seen in game, and the warrants, BOLOs, citations, warnings,
// arrests and traffic stops officers write. Everything is per server and shared by everyone on it, so dispatch and every
// officer see the same thing. ER:LC's API gives plates, vehicle colors and owners, and players' wanted stars; it has no
// characters, so a person is their Roblox account, and their license details are the ones they filled in on Oversite. A server
// that uses roleplay characters (app/chars.mjs) has a person be a character instead: keyed 'c<id>', with the cars given to it.
import { db, now, users, licenses, mdtSignin } from './db.mjs';
import * as markers from './markers.mjs';
import { statusOf as licenseStatus } from './pdlicense.mjs';
import * as chars from './chars.mjs';
import { POSTALS } from './postals.mjs';
import { STATES } from './penal-states.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS pd_people (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, rid TEXT NOT NULL, name TEXT NOT NULL, team TEXT,
  first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, PRIMARY KEY (community_id, rid));
CREATE TABLE IF NOT EXISTS pd_vehicles (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, plate TEXT NOT NULL, model TEXT, color TEXT, color_hex TEXT,
  owner TEXT, owner_rid TEXT, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, reg TEXT NOT NULL DEFAULT 'Valid', ins TEXT NOT NULL DEFAULT 'Active', stolen INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (community_id, plate));
CREATE TABLE IF NOT EXISTS pd_records (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, kind TEXT NOT NULL, status TEXT NOT NULL,
  subject TEXT, subject_rid TEXT, plate TEXT, data TEXT NOT NULL, by_uid INTEGER, by_name TEXT, at INTEGER NOT NULL, updated INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS pd_records_k ON pd_records (community_id, kind, status);
CREATE INDEX IF NOT EXISTS pd_records_s ON pd_records (community_id, subject_rid);
CREATE INDEX IF NOT EXISTS pd_records_p ON pd_records (community_id, plate);`);
// civ: 1 when its owner was on the civilian team when we last saw it (police cars, fire trucks and the like aren't theirs to pay for)
try { db.exec('ALTER TABLE pd_vehicles ADD COLUMN civ INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
// char_id: the roleplay character the car is on file under; char_pin: 1 when its player gave it to that character, so it stays put
try { db.exec('ALTER TABLE pd_vehicles ADD COLUMN char_id INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE pd_vehicles ADD COLUMN char_pin INTEGER NOT NULL DEFAULT 0'); } catch (e) {}
const q = sql => db.prepare(sql);

// Liberty County's default penal code: [code, title, fine, jail in minutes, class]. A server can replace it with its own (penalOf). Infractions are tickets; misdemeanors and felonies can be jailed.
export const PENAL = [
  ['T-101', 'Speeding, 1 to 15 over', 150, 0, 'Infraction'], ['T-102', 'Speeding, 16 to 30 over', 300, 0, 'Infraction'], ['T-103', 'Speeding, 31 or more over', 600, 0, 'Infraction'],
  ['T-104', 'Running a red light', 200, 0, 'Infraction'], ['T-105', 'Failure to stop at a stop sign', 150, 0, 'Infraction'], ['T-106', 'Failure to yield', 150, 0, 'Infraction'],
  ['T-107', 'Illegal U-turn', 100, 0, 'Infraction'], ['T-108', 'Driving on the wrong side of the road', 250, 0, 'Infraction'], ['T-109', 'Failure to yield to an emergency vehicle', 400, 0, 'Infraction'],
  ['T-110', 'Illegal parking', 75, 0, 'Infraction'], ['T-111', 'No headlights at night', 100, 0, 'Infraction'], ['T-112', 'Driving without insurance', 500, 0, 'Infraction'],
  ['T-113', 'Expired registration', 200, 0, 'Infraction'], ['T-114', 'Driving without a license', 400, 0, 'Infraction'], ['T-115', 'Reckless driving', 750, 5, 'Misdemeanor'],
  ['T-116', 'Hit and run', 1500, 10, 'Misdemeanor'], ['T-117', 'Driving under the influence', 1200, 10, 'Misdemeanor'], ['T-118', 'Street racing', 1000, 5, 'Misdemeanor'],
  ['M-201', 'Disorderly conduct', 300, 3, 'Misdemeanor'], ['M-202', 'Trespassing', 400, 3, 'Misdemeanor'], ['M-203', 'Vandalism', 500, 5, 'Misdemeanor'],
  ['M-204', 'Petty theft', 500, 5, 'Misdemeanor'], ['M-205', 'Resisting arrest', 800, 8, 'Misdemeanor'], ['M-206', 'Obstruction of justice', 700, 6, 'Misdemeanor'],
  ['M-207', 'Failure to comply with a lawful order', 400, 4, 'Misdemeanor'], ['M-208', 'Brandishing a weapon', 900, 8, 'Misdemeanor'], ['M-209', 'Public intoxication', 250, 2, 'Misdemeanor'],
  ['M-210', 'Assault', 1000, 8, 'Misdemeanor'], ['M-211', 'Impersonating a public servant', 1200, 10, 'Misdemeanor'], ['M-212', 'False report to police', 600, 5, 'Misdemeanor'],
  ['F-301', 'Evading police (pursuit)', 2000, 15, 'Felony'], ['F-302', 'Grand theft auto', 2500, 15, 'Felony'], ['F-303', 'Robbery', 3000, 20, 'Felony'],
  ['F-304', 'Armed robbery', 5000, 30, 'Felony'], ['F-305', 'Burglary', 2500, 15, 'Felony'], ['F-306', 'Assault with a deadly weapon', 4000, 25, 'Felony'],
  ['F-307', 'Assault on a public servant', 4500, 25, 'Felony'], ['F-308', 'Attempted murder', 8000, 45, 'Felony'], ['F-309', 'Murder', 15000, 60, 'Felony'],
  ['F-310', 'Kidnapping', 7000, 40, 'Felony'], ['F-311', 'Possession of an illegal weapon', 2500, 15, 'Felony'], ['F-312', 'Drug trafficking', 6000, 35, 'Felony'],
  ['F-313', 'Escape from custody', 3000, 20, 'Felony'], ['F-314', 'Bank robbery', 10000, 50, 'Felony'], ['F-315', 'Terroristic threats', 5000, 30, 'Felony']];
// a UK starting point owners can load and change: fixed penalties and offences in £, jail in in-game minutes, classes as UK courts use them
export const PENAL_UK = [
  ['RT-01', 'Speeding', 100, 0, 'Summary'], ['RT-02', 'Speeding, excessive', 300, 0, 'Summary'], ['RT-03', 'Running a red light', 100, 0, 'Summary'],
  ['RT-04', 'Using a mobile phone while driving', 200, 0, 'Summary'], ['RT-05', 'Careless driving', 100, 0, 'Summary'], ['RT-06', 'Dangerous driving', 2500, 15, 'Either-way'],
  ['RT-07', 'Driving without insurance', 300, 0, 'Summary'], ['RT-08', 'Driving without a licence', 100, 0, 'Summary'], ['RT-09', 'No MOT', 100, 0, 'Summary'],
  ['RT-10', 'Vehicle not taxed', 80, 0, 'Summary'], ['RT-11', 'Drink or drug driving', 2500, 10, 'Summary'], ['RT-12', 'Driving while disqualified', 2500, 10, 'Summary'],
  ['RT-13', 'Failing to stop for police', 1000, 5, 'Summary'], ['RT-14', 'Failing to stop after a collision', 1000, 5, 'Summary'], ['RT-15', 'Failing to provide a specimen', 1000, 5, 'Summary'],
  ['RT-16', 'Taking a vehicle without consent', 1500, 10, 'Summary'], ['RT-17', 'Aggravated vehicle taking', 3000, 20, 'Either-way'], ['RT-18', 'Illegal parking', 70, 0, 'Summary'],
  ['PO-01', 'Causing harassment, alarm or distress (s.5)', 90, 0, 'Summary'], ['PO-02', 'Threatening behaviour (s.4)', 500, 5, 'Summary'], ['PO-03', 'Drunk and disorderly', 90, 2, 'Summary'],
  ['PO-04', 'Affray', 2000, 15, 'Either-way'], ['PO-05', 'Violent disorder', 4000, 25, 'Either-way'], ['PO-06', 'Breach of the peace', 200, 2, 'Summary'],
  ['OP-01', 'Common assault', 1000, 8, 'Summary'], ['OP-02', 'Assault occasioning actual bodily harm', 3000, 20, 'Either-way'], ['OP-03', 'Grievous bodily harm', 6000, 35, 'Indictable'],
  ['OP-04', 'Assault on an emergency worker', 2500, 15, 'Either-way'], ['OP-05', 'Kidnapping', 7000, 40, 'Indictable'], ['OP-06', 'Attempted murder', 8000, 45, 'Indictable'],
  ['OP-07', 'Manslaughter', 10000, 50, 'Indictable'], ['OP-08', 'Murder', 15000, 60, 'Indictable'],
  ['PR-01', 'Theft', 500, 5, 'Either-way'], ['PR-02', 'Shoplifting', 200, 2, 'Either-way'], ['PR-03', 'Burglary', 2500, 15, 'Either-way'],
  ['PR-04', 'Robbery', 4000, 25, 'Indictable'], ['PR-05', 'Criminal damage', 500, 5, 'Either-way'], ['PR-06', 'Handling stolen goods', 1000, 8, 'Either-way'],
  ['PR-07', 'Making off without payment', 300, 2, 'Either-way'], ['PR-08', 'Fraud', 2500, 15, 'Either-way'],
  ['WD-01', 'Possession of an offensive weapon', 1500, 10, 'Either-way'], ['WD-02', 'Possession of a bladed article', 1500, 10, 'Either-way'], ['WD-03', 'Possession of a firearm', 5000, 30, 'Indictable'],
  ['WD-04', 'Possession of a controlled drug', 500, 5, 'Either-way'], ['WD-05', 'Possession with intent to supply', 5000, 30, 'Either-way'],
  ['JU-01', 'Obstructing a police officer', 500, 3, 'Summary'], ['JU-02', 'Resisting arrest', 800, 5, 'Summary'], ['JU-03', 'Wasting police time', 600, 3, 'Summary'],
  ['JU-04', 'Escape from lawful custody', 3000, 20, 'Indictable'], ['JU-05', 'Impersonating a police officer', 1200, 8, 'Summary']];
// the sets a server can load in Settings → Laws: the default, the UK one, and each US state's (app/penal-states.mjs, keyed us-fl and so on)
export const PENAL_SETS = { us: { name: 'United States (default)', list: PENAL }, uk: { name: 'United Kingdom', list: PENAL_UK },
  ...Object.fromEntries(Object.entries(STATES).map(([k, v]) => ['us-' + k, { name: v.name, list: v.list, state: true }])) };
// a server's own laws (Settings → Laws), or the default; each entry is [code, title, fine, jail minutes, class]
export const penalOf = c => (Array.isArray(c?.settings?.penal) && c.settings.penal.length ? c.settings.penal : PENAL);
export const CLASSES = ['Infraction', 'Misdemeanor', 'Felony', 'Summary', 'Either-way', 'Indictable'];
export const cleanPenal = list => { if (!Array.isArray(list) || !list.length) return { error: 'Add at least one law.' }; if (list.length > 400) return { error: 'A server can have up to 400 laws.' };
  const out = [], seen = new Set();
  for (const [i, x] of list.entries()) { const r = Array.isArray(x) ? x : [x?.code, x?.title, x?.fine, x?.jail, x?.cls];
    const code = T(r[0], 14).toUpperCase(), title = T(r[1], 80), fine = Math.round(+r[2] || 0), jail = Math.round(+r[3] || 0), cls = CLASSES.includes(r[4]) ? r[4] : '';
    if (!code || !title) return { error: `Law ${i + 1} needs a code and a name.` }; if (!/^[A-Z0-9][A-Z0-9 .:,\-()\/§]*$/.test(code)) return { error: `Law ${i + 1}: use letters, numbers and dashes in the code, like RT-01.` };   // colons and commas for states that cite with them (RSA 265:60, 2C:11-3, 60-6,186)
    if (seen.has(code)) return { error: `Two laws use the code ${code}. Each needs its own.` }; seen.add(code);
    if (fine < 0 || fine > 1e7 || jail < 0 || jail > 10000) return { error: `Law ${i + 1}: the fine or jail time is out of range.` }; if (!cls) return { error: `Law ${i + 1} needs a class.` };
    out.push([code, title, fine, jail, cls]); }
  return { list: out }; };

// who may approve a warrant: a server admin, or someone signed in to the police MDT with a supervisor rank (Sergeant and up,
// unless a Premium server set its own ranks); pdRanks is the server's police list from ranksFor
export const pdRank = (cid, uid) => mdtSignin.mine(cid, uid).pd || '';
export const isSupervisor = (cid, uid, adminRole, pdRanks) => adminRole || !!pdRanks?.find(r => r[0] === pdRank(cid, uid))?.[2];

const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const PLATE = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim().slice(0, 10);
// a person: a Roblox ID, or a roleplay character's key (c12)
const RID = v => /^c?\d{1,20}$/.test(String(v ?? '')) ? String(v) : '';

// ── what ER:LC shows: who is in the server and which vehicles are out, recorded at most every 20 s per server ──
const seen = new Map();
export const observe = (cid, body, teams = {}) => { const t = now(); if (t - (seen.get(cid) || 0) < 20000) return; seen.set(cid, t); let j; try { j = JSON.parse(body); } catch (e) { return; }
  const byName = new Map(), civName = new Set(); const up = q(`INSERT INTO pd_people (community_id, rid, name, team, first_seen, last_seen) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(community_id, rid) DO UPDATE SET name = excluded.name, team = excluded.team, last_seen = excluded.last_seen`);
  const upV = q(`INSERT INTO pd_vehicles (community_id, plate, model, color, color_hex, owner, owner_rid, first_seen, last_seen, civ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(community_id, plate) DO UPDATE SET model = excluded.model, color = excluded.color, color_hex = excluded.color_hex, owner = excluded.owner,
    owner_rid = COALESCE(NULLIF(excluded.owner_rid, ''), pd_vehicles.owner_rid), last_seen = excluded.last_seen, civ = excluded.civ`);
  db.exec('BEGIN'); try {
    for (const p of j.Players || []) { const [name, id] = String(p.Player || '').split(':'); if (!name || !RID(id)) continue; byName.set(name.toLowerCase(), id); if (!(teams || {})[p.Team]) civName.add(name.toLowerCase()); up.run(cid, id, T(name, 40), T(p.Team, 30), t, t); }
    for (const v of j.Vehicles || []) { const plate = PLATE(v.Plate); if (!plate) continue; const owner = T(String(v.Owner || '').split(':')[0], 40);
      upV.run(cid, plate, T(v.Name, 60), T(v.ColorName, 30), /^#?[0-9a-f]{6}$/i.test(v.ColorHex || '') ? '#' + String(v.ColorHex).replace('#', '') : '', owner, byName.get(owner.toLowerCase()) || '', t, t, civName.has(owner.toLowerCase()) ? 1 : 0); }
    // with characters, a car is on file under whoever its player is playing, unless they gave it to one of their characters
    if (chars.rp(cid)) { const on = new Map(), give = q('UPDATE pd_vehicles SET char_id = ? WHERE community_id = ? AND plate = ? AND char_pin = 0 AND char_id IS NOT ?');
      for (const v of j.Vehicles || []) { const plate = PLATE(v.Plate), rid = byName.get(T(String(v.Owner || '').split(':')[0], 40).toLowerCase()); if (!plate || !rid) continue;
        if (!on.has(rid)) on.set(rid, chars.playing(cid, rid)?.id ?? null); const id = on.get(rid); if (id) give.run(id, cid, plate, id); } }
    db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); console.log('pd observe:', e.message); }
  return alpr(cid, j); };

// ── the plate reader: every car out in game checked against stolen reports, bad papers, BOLOs and its owner's warrants.
// A hit is returned (for the CAD and automations) once per car every ten minutes while it stays flagged ──
const alprAt = new Map(), G2M = 2000 / 5355;
const postalNear = (x, z) => { let best = '', d = Infinity; for (const [k, [px, py]] of Object.entries(POSTALS)) { const e = (px - x * G2M) ** 2 + (py - z * G2M) ** 2; if (e < d) { d = e; best = k; } } return best ? 'near postal ' + best : ''; };
// who a car is on file under: { key, name } of its character on a server with characters, else of its Roblox owner
const ownerOf = (cid, v) => { const ch = v.char_id && chars.rp(cid) ? chars.byId(cid, v.char_id) : null;
  return ch ? { key: ch.key, name: ch.name } : { key: v.owner_rid || '', name: v.owner || '' }; };
// why the plate reader (or a plate camera) would flag a car on file: stolen, a BOLO on it, its owner wanted, bad papers
export const flagReasons = (cid, plate) => { const car = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND plate = ?').get(cid, plate); if (!car) return null; const why = [], o = ownerOf(cid, car);
  if (car.stolen) why.push('reported stolen');
  if (q("SELECT 1 FROM pd_records WHERE community_id = ? AND kind = 'bolo' AND status = 'Active' AND plate = ?").get(cid, plate)) why.push('matches a BOLO');
  if (o.key && q("SELECT 1 FROM pd_records WHERE community_id = ? AND kind = 'warrant' AND status = 'Active' AND subject_rid = ?").get(cid, o.key)) why.push('owner has a warrant');
  if (o.key || o.name) { const s = licenseStatus(cid, o.key, o.name, 'driver'); if (s !== 'Valid') why.push(`owner’s license ${s.toLowerCase()}`); }
  if (car.civ && (car.reg !== 'Valid' || car.ins !== 'Active')) why.push(car.reg !== 'Valid' ? `registration ${car.reg.toLowerCase()}` : `insurance ${car.ins.toLowerCase()}`);
  return { car, why, owner: o }; };
export { postalNear, G2M, PLATE };
const alpr = (cid, j) => { const hits = [], at = new Map((j.Players || []).map(p => [String(p.Player || '').split(':')[0].toLowerCase(), p.Location]));
  for (const v of j.Vehicles || []) { const plate = PLATE(v.Plate); if (!plate) continue; const k = `${cid}:${plate}`; if (now() - (alprAt.get(k) || 0) < 600000) continue;
    const f = flagReasons(cid, plate); if (!f || !f.why.length) continue; const { car, why } = f; alprAt.set(k, now()); const L = at.get(String(car.owner || '').toLowerCase());
    const o = ownerOf(cid, car); hits.push({ plate, vehicle: [car.color, car.model].filter(Boolean).join(' '), owner: o.name, owner_rid: o.key, reasons: why.join(', '),
      where: L && Number.isFinite(+L.LocationX) ? postalNear(+L.LocationX, +L.LocationZ) : '', x: L ? +L.LocationX * G2M : null, y: L ? +L.LocationZ * G2M : null }); }
  return hits; };

// ── records ──
const row = r => r && { id: r.id, kind: r.kind, status: r.status, subject: r.subject || '', subject_rid: r.subject_rid || '', plate: r.plate || '', by: r.by_name || '', at: r.at, updated: r.updated, ...JSON.parse(r.data || '{}') };
export const record = (cid, id) => row(q('SELECT * FROM pd_records WHERE community_id = ? AND id = ?').get(cid, +id || 0));
export const list = (cid, { kind, status, mine } = {}, uid) => { const w = ['community_id = ?'], a = [cid];
  if (kind) { w.push('kind = ?'); a.push(kind); } if (status === 'open') w.push("status IN ('Pending', 'Active')"); else if (status === 'closed') w.push("status NOT IN ('Pending', 'Active')");
  if (mine) { w.push('by_uid = ?'); a.push(uid); }
  return q(`SELECT * FROM pd_records WHERE ${w.join(' AND ')} ORDER BY at DESC LIMIT 200`).all(...a).map(row); };

// a charge by its code (T-101), or for bots by its title when only one charge matches it ("Hit and run")
export const chargeFor = (x, list = PENAL) => { const k = String(x?.code || x?.title || x || '').trim(); if (!k) return null; const up = k.toUpperCase(), byCode = list.find(p => p[0] === up); if (byCode) return byCode;
  const lo = k.toLowerCase(), same = list.find(p => p[1].toLowerCase() === lo); if (same) return same; const some = list.filter(p => p[1].toLowerCase().includes(lo)); return some.length === 1 ? some[0] : null; };
// a charge from the penal code, or one the officer typed because it isn't listed ({ custom, fine, jail }), with what they set it at
const charges = (arr, list) => (Array.isArray(arr) ? arr : []).slice(0, 20).map(c => { const count = Math.min(9, Math.max(1, +c?.count || 1));
  if (c && typeof c === 'object' && c.custom != null) { const title = T(c.custom, 100); return title && { code: '', title, fine: Math.max(0, Math.min(1e7, Math.round(+c.fine || 0))), jail: Math.max(0, Math.min(1e4, Math.round(+c.jail || 0))), cls: 'Other', count, custom: true }; }
  const p = chargeFor(c, list); return p && { code: p[0], title: p[1], fine: p[2], jail: p[3], cls: p[4], count }; }).filter(Boolean);
const sum = (cs, k) => cs.reduce((a, c) => a + c[k] * c.count, 0);
const KINDS = ['warrant', 'citation', 'warning', 'arrest', 'bolo', 'stop'];
// what each kind keeps; the officer never types a fine or a total, they come from the penal code
const shape = (kind, b, list) => { const cs = charges(b.charges, list), base = { location: T(b.location, 80), notes: T(b.notes, 1500), unit: T(b.unit, 40) };
  if (kind === 'citation') return { ...base, charges: cs, fine: sum(cs, 'fine'), vehicle: T(b.vehicle, 60) };
  if (kind === 'warning') return { ...base, reason: T(b.reason, 200) };
  if (kind === 'arrest') return { ...base, charges: cs, fine: sum(cs, 'fine'), jail: sum(cs, 'jail'), officers: (Array.isArray(b.officers) ? b.officers : String(b.officers || '').split(',')).map(o => T(o, 40)).filter(Boolean).slice(0, 8),
    booking: { num: 'BK-' + String(Math.floor(now() / 1000) % 1e7).padStart(7, '0'), facility: T(b.facility, 60) || 'Liberty County Jail', property: T(b.property, 300), miranda: !!b.miranda } };
  if (kind === 'warrant') return { ...base, charges: cs, type: b.type === 'Search' ? 'Search' : 'Arrest', reason: T(b.reason, 600) };
  if (kind === 'bolo') return { ...base, type: b.type === 'vehicle' ? 'vehicle' : 'person', desc: T(b.desc, 300), reason: T(b.reason, 200), model: T(b.model, 60), color: T(b.color, 30), armed: !!b.armed };
  if (kind === 'stop') return { ...base, vehicle: T(b.vehicle, 60), color: T(b.color, 30), x: Number.isFinite(+b.x) ? +(+b.x).toFixed(1) : null, y: Number.isFinite(+b.y) ? +(+b.y).toFixed(1) : null, backup: [], outcome: '' };
  return base; };

export const create = (cid, by, b, list = PENAL) => { const kind = String(b.kind || ''); if (!KINDS.includes(kind)) return { error: 'Unknown record.' };
  const d = shape(kind, b, list), plate = PLATE(b.plate); let subject = T(b.subject, 40), rid = RID(b.subject_rid);
  // on a server with characters, a name typed without a lookup is written against that character
  if (!rid && subject) { const ch = characterFor(cid, subject); if (ch) { subject = ch.name; rid = ch.key; } }
  if (['citation', 'arrest', 'warrant'].includes(kind) && !d.charges.length) return { error: 'Add at least one charge.' };
  if (['citation', 'warning', 'arrest', 'warrant'].includes(kind) && !subject) return { error: 'Who is this for? Look the person up first, or type their username.' };
  if (kind === 'warning' && !d.reason) return { error: 'Say what the warning is for.' };
  if (kind === 'bolo' && !d.desc && !plate && !subject) return { error: 'Describe who or what to look out for.' };
  if (kind === 'stop' && !plate && !d.vehicle) return { error: 'Pick the vehicle you stopped, or type its plate.' };
  const status = { warrant: by.supervisor ? 'Active' : 'Pending', bolo: 'Active', stop: 'Active', citation: 'Issued', warning: 'Issued', arrest: 'Booked' }[kind];
  if (kind === 'warrant' && by.supervisor) d.approved_by = by.name;
  const t = now(), r = q('INSERT INTO pd_records (community_id, kind, status, subject, subject_rid, plate, data, by_uid, by_name, at, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(cid, kind, status, subject, rid, plate, JSON.stringify(d), by.uid, by.name, t, t);
  return { ok: true, record: record(cid, r.lastInsertRowid) }; };

// approve, serve, recall, clear, end a stop, call for backup on it
export const act = (cid, by, b) => { const r = record(cid, b.id); if (!r) return { error: 'That record is gone.' }; const a = String(b.action || ''), d = { ...r }; let status = r.status;
  for (const k of ['id', 'kind', 'status', 'subject', 'subject_rid', 'plate', 'by', 'at', 'updated']) delete d[k];
  if (r.kind === 'warrant' && a === 'approve') { if (!by.supervisor) return { error: 'Only a Sergeant or above can approve a warrant.' }; if (status !== 'Pending') return { error: 'That warrant is not waiting for approval.' }; status = 'Active'; d.approved_by = by.name; }
  else if (r.kind === 'warrant' && a === 'deny') { if (!by.supervisor) return { error: 'Only a Sergeant or above can deny a warrant.' }; status = 'Denied'; d.closed_by = by.name; }
  else if (r.kind === 'warrant' && (a === 'serve' || a === 'recall')) { if (status !== 'Active') return { error: 'That warrant is not active.' }; if (a === 'recall' && !by.supervisor && r.by !== by.name) return { error: 'Only the officer who wrote it or a Sergeant can recall a warrant.' }; status = a === 'serve' ? 'Served' : 'Recalled'; d.closed_by = by.name; }
  else if (r.kind === 'bolo' && a === 'clear') { status = 'Cleared'; d.closed_by = by.name; }
  else if (r.kind === 'stop' && a === 'end') { status = 'Ended'; d.outcome = T(b.outcome, 60) || 'Ended'; d.closed_by = by.name; }
  else if (r.kind === 'stop' && a === 'backup') { if (status !== 'Active') return { error: 'That stop has ended.' }; d.backup = [...(d.backup || []), { by: by.name, at: now(), code: b.code === 3 ? 3 : 2 }].slice(-10); }
  else if (r.kind === 'stop' && a === 'respond') { if (status !== 'Active') return { error: 'That stop has ended.' }; d.responding = [...new Set([...(d.responding || []), T(b.unit, 40) || by.name])].slice(0, 10); }
  else return { error: 'You can\'t do that to this record.' };
  q('UPDATE pd_records SET status = ?, data = ?, updated = ? WHERE community_id = ? AND id = ?').run(status, JSON.stringify(d), now(), cid, r.id);
  return { ok: true, record: record(cid, r.id) }; };
// a follow-up note on any record, by any officer, kept in order under it: "Suspect wasn't home, warrant still outstanding", "Firearm seized"
export const addNote = (cid, by, b) => { const r = record(cid, b.id); if (!r) return { error: 'That record is gone.' }; const text = T(b.text, 500); if (!text) return { error: 'Write the note first.' };
  const d = JSON.parse(q('SELECT data FROM pd_records WHERE community_id = ? AND id = ?').get(cid, r.id).data || '{}'); d.updates = [...(Array.isArray(d.updates) ? d.updates : []), { at: now(), by: T(by.name, 40), text }].slice(-50);
  q('UPDATE pd_records SET data = ?, updated = ? WHERE community_id = ? AND id = ?').run(JSON.stringify(d), now(), cid, r.id); return { ok: true, record: record(cid, r.id) }; };
export const remove = (cid, id) => q('DELETE FROM pd_records WHERE community_id = ? AND id = ?').run(cid, +id || 0);

// ── lookups ──
// owner and owner_rid are who the car is on file under (its character on a server with characters); player is the Roblox account
const vehRow = (v, cid) => { if (!v) return v; const o = ownerOf(cid, v);
  return { plate: v.plate, model: v.model || '', color: v.color || '', hex: v.color_hex || '', owner: o.name, owner_rid: o.key, player: v.owner || '', player_rid: v.owner_rid || '', reg: v.reg, ins: v.ins, stolen: !!v.stolen, first_seen: v.first_seen, last_seen: v.last_seen }; };
const flagsFor = (cid, rid, name, plates = []) => { const open = q("SELECT * FROM pd_records WHERE community_id = ? AND status IN ('Pending', 'Active') AND kind IN ('warrant', 'bolo')").all(cid).map(row);
  const n = String(name || '').toLowerCase(); return open.filter(r => (rid && r.subject_rid === rid) || (n && r.subject.toLowerCase() === n) || (r.plate && plates.includes(r.plate))); };
export const search = (cid, text) => { const s = T(text, 40); if (!s) return { people: [], vehicles: [] }; const like = `%${s.replace(/[%_]/g, '')}%`, plate = `%${PLATE(s).replace(/[%_]/g, '')}%`;
  const people = q('SELECT * FROM pd_people WHERE community_id = ? AND (name LIKE ? OR rid = ?) ORDER BY last_seen DESC LIMIT 15').all(cid, like, s);
  // also anyone whose Oversite license address matches, and people only known from a record (typed in by an officer)
  const extra = q(`SELECT DISTINCT subject AS name, subject_rid AS rid FROM pd_records WHERE community_id = ? AND subject LIKE ? AND subject <> '' LIMIT 10`).all(cid, like);
  const out = new Map(people.map(p => [p.rid, { rid: p.rid, name: p.name, team: p.team || '', last_seen: p.last_seen }]));
  for (const e of extra) { const k = e.rid || 'n:' + e.name.toLowerCase(); if (![...out.values()].some(p => p.name.toLowerCase() === e.name.toLowerCase())) out.set(k, { rid: e.rid || '', name: e.name, team: '', last_seen: 0 }); }
  for (const u of q(`SELECT u.roblox_id AS rid, u.roblox_name AS name FROM users u JOIN pd_people p ON p.rid = u.roblox_id AND p.community_id = ? WHERE u.license LIKE ? LIMIT 10`).all(cid, like))
    if (!out.has(u.rid)) out.set(u.rid, { rid: u.rid, name: u.name, team: '', last_seen: 0, addr: true });
  if (chars.rp(cid)) { const rp = new Map();
    for (const ch of chars.search(cid, s)) rp.set(ch.key, ch);
    for (const p of people) for (const ch of q('SELECT c.id FROM civ_characters c JOIN users u ON u.id = c.user_id WHERE c.community_id = ? AND u.roblox_id = ?').all(cid, p.rid)) { const x = chars.byId(cid, ch.id); if (x) rp.set(x.key, x); }
    // a player with characters is found as them; one without any is still found by their username
    const played = new Set([...rp.values()].map(ch => chars.player(ch)?.rid).filter(Boolean));
    for (const k of [...out.keys()]) if (played.has(String(k))) out.delete(k);
    for (const ch of rp.values()) out.set(ch.key, { rid: ch.key, name: ch.name, team: '', last_seen: 0, player: chars.player(ch)?.name || '' }); }
  const vehicles = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND (plate LIKE ? OR owner LIKE ? OR model LIKE ?) ORDER BY last_seen DESC LIMIT 15').all(cid, plate, like, like).map(v => vehRow(v, cid));
  const ppl = [...out.values()].slice(0, 15).map(p => ({ ...p, flags: flagsFor(cid, p.rid, p.name).map(f => f.kind), markers: markers.codesFor(cid, p.rid, p.name) }));
  return { people: ppl, vehicles: vehicles.map(v => ({ ...v, flags: [...flagsFor(cid, '', '', [v.plate]).map(f => f.kind), ...(v.stolen ? ['stolen'] : [])] })) }; };

// a roleplay character as a person: its own name, record, licenses and cars; the details on its ID, the looks from the player's license
const charPerson = async (cid, ch, licenseOf) => { const pl = chars.player(ch), p = pl?.rid ? q('SELECT * FROM pd_people WHERE community_id = ? AND rid = ?').get(cid, pl.rid) : null;
  const who = { rid: ch.key, name: ch.name, team: p?.team || '', first_seen: p?.first_seen || 0, last_seen: p?.last_seen || 0, player: pl?.name || '', character: true };
  const acct = users.byId(ch.user_id); let license = null;
  const age = ch.dob ? Math.floor((Date.now() - Date.parse(ch.dob)) / 31557600000) : null;
  if (acct) { const l = await licenseOf(acct); license = { display: ch.name, age: Number.isFinite(age) && age > 0 ? `${age}` : l.saved ? l.age : '', gndr: l.gndr || '', hair: l.hair || '', eyes: l.eyes || '', hgt: l.hgt || '', wgt: l.wgt || '',
    addr: ch.address || 'N/A', iss: l.iss || '', dob: ch.dob || '', num: 'LC' + String(ch.id).padStart(8, '0').slice(-8) }; }
  const vehicles = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND char_id = ? ORDER BY last_seen DESC LIMIT 20').all(cid, ch.id).map(v => vehRow(v, cid));
  const history = q("SELECT * FROM pd_records WHERE community_id = ? AND (subject_rid = ? OR (subject_rid = '' AND lower(subject) = lower(?))) ORDER BY at DESC LIMIT 100").all(cid, ch.key, ch.name).map(row);
  return { person: who, account: !!acct, license, vehicles, history, flags: flagsFor(cid, ch.key, ch.name, vehicles.map(v => v.plate)), markers: markers.forPerson(cid, ch.key, ch.name), character: { ...Object.fromEntries(Object.keys(chars.FIELDS).map(k => [k, ch[k]])) } }; };
// a name, Roblox ID or character key to a character: a key always; on a server with characters, also one by that exact name, or the one a player is on
export const characterFor = (cid, key) => { const k = String(key ?? '').trim(); if (!k) return null;
  const byKey = chars.byKey(cid, k); if (byKey) return byKey; if (!chars.rp(cid)) return null; const same = chars.named(cid, k); if (same.length === 1) return same[0];
  const p = /^\d{1,20}$/.test(k) ? q('SELECT rid FROM pd_people WHERE community_id = ? AND rid = ?').get(cid, k) : q('SELECT rid FROM pd_people WHERE community_id = ? AND lower(name) = lower(?)').get(cid, T(k, 40));
  return p ? chars.playing(cid, p.rid) : null; };
export const person = async (cid, key, licenseOf) => { const ch = characterFor(cid, key); if (ch) return charPerson(cid, ch, licenseOf);
  if (chars.KEY.test(String(key ?? ''))) return { error: 'That character is gone.' };
  const rid = RID(key), name = rid ? '' : T(key, 40);
  const p = rid ? q('SELECT * FROM pd_people WHERE community_id = ? AND rid = ?').get(cid, rid) : q('SELECT * FROM pd_people WHERE community_id = ? AND lower(name) = lower(?)').get(cid, name);
  const who = { rid: p?.rid || rid, name: p?.name || name, team: p?.team || '', first_seen: p?.first_seen || 0, last_seen: p?.last_seen || 0 };
  if (!who.name && !who.rid) return { error: 'Nobody by that name.' };
  const acct = who.rid ? users.byRoblox(who.rid) : null; let license = null;
  if (acct) { const l = await licenseOf(acct); if (l.saved) license = { display: l.display, age: l.age, gndr: l.gndr, hair: l.hair, eyes: l.eyes, hgt: l.hgt, wgt: l.wgt, addr: l.addr, iss: l.iss, num: 'LC' + String(who.rid).padStart(8, '0').slice(-8) }; else license = { display: l.display, none: true }; }
  const vehicles = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND (owner_rid = ? OR lower(owner) = lower(?)) ORDER BY last_seen DESC LIMIT 20').all(cid, who.rid || '-', who.name || '-').map(v => vehRow(v, cid));
  const n = (who.name || '').toLowerCase(), history = q("SELECT * FROM pd_records WHERE community_id = ? AND ((subject_rid <> '' AND subject_rid = ?) OR lower(subject) = ?) ORDER BY at DESC LIMIT 100").all(cid, who.rid || '-', n || '-').map(row);
  return { person: who, account: !!acct, license, vehicles, history, flags: flagsFor(cid, who.rid, who.name, vehicles.map(v => v.plate)), markers: markers.forPerson(cid, who.rid, who.name) }; };

// someone this server has seen in game, by Roblox ID or exact name: { rid, name } or null; on a server with characters, the character
export const seenPerson = (cid, rid, name) => { const ch = characterFor(cid, rid || name); if (ch) return { rid: ch.key, name: ch.name }; return seenPlayer(cid, rid, name); };
const seenPlayer = (cid, rid, name) => (/^\d{1,20}$/.test(String(rid ?? '')) ? q('SELECT rid, name FROM pd_people WHERE community_id = ? AND rid = ?').get(cid, RID(rid)) : q('SELECT rid, name FROM pd_people WHERE community_id = ? AND lower(name) = lower(?)').get(cid, T(name, 40))) || null;
export const vehicle = (cid, plate) => { const v = vehRow(q('SELECT * FROM pd_vehicles WHERE community_id = ? AND plate = ?').get(cid, PLATE(plate)), cid);
  if (!v) return { error: `No vehicle with plate ${PLATE(plate)} has been seen in this server.` };
  const history = q('SELECT * FROM pd_records WHERE community_id = ? AND plate = ? ORDER BY at DESC LIMIT 50').all(cid, v.plate).map(row);
  return { vehicle: v, history, flags: flagsFor(cid, '', '', [v.plate]), owner_flags: v.owner ? flagsFor(cid, v.owner_rid, v.owner).filter(f => !f.plate || f.plate !== v.plate) : [] }; };
export const setVehicle = (cid, plate, b) => { const v = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND plate = ?').get(cid, PLATE(plate)); if (!v) return { error: 'That vehicle is not on file.' };
  const reg = ['Valid', 'Expired', 'Suspended'].includes(b.reg) ? b.reg : v.reg, ins = ['Active', 'Lapsed', 'None'].includes(b.ins) ? b.ins : v.ins, stolen = b.stolen == null ? v.stolen : b.stolen ? 1 : 0;
  q('UPDATE pd_vehicles SET reg = ?, ins = ?, stolen = ? WHERE community_id = ? AND plate = ?').run(reg, ins, stolen, cid, v.plate); return { ok: true, ...vehicle(cid, v.plate) }; };

// unit status (10-codes), shared so dispatch and every MDT show the same; kept in memory, gone after 12 hours
const STATUS = new Map();
export const STATUS_CODES = ['10-8', '10-6', '10-7', '10-11', '10-80', '10-23', '10-76', '10-15', '10-19', '10-97', '10-99'];
// what each code means here, the same words the MDT shows, so a bot can say back the CAD's meaning rather than its own
export const STATUS_LABELS = { '10-8': 'Available', '10-6': 'Busy', '10-7': 'Out of service', '10-11': 'Traffic stop', '10-80': 'Pursuit', '10-23': 'On scene', '10-76': 'En route', '10-15': 'Prisoner in custody', '10-19': 'Returning', '10-97': 'On scene', '10-99': 'Panic' };
// a code however it was written: "10 8", "10-08", "108", "ten-eight", "Ten 8"
const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, eleven: 11, fifteen: 15, nineteen: 19, 'twenty-three': 23, 'twenty three': 23, eighty: 80, 'seventy-six': 76, 'seventy six': 76, 'ninety-seven': 97, 'ninety seven': 97, 'ninety-nine': 99, 'ninety nine': 99 };
export const statusCode = v => { let s = String(v ?? '').trim().toLowerCase().replace(/[.,!]+$/, ''); s = s.replace(/^ten[\s-]*/, '10-');
  const w = /^10-(.+)$/.exec(s); if (w && WORDS[w[1]]) s = '10-' + WORDS[w[1]];
  const m = /^10[\s-]*0*(\d{1,2})$/.exec(s) || (/^10(\d{1,2})$/.test(s) && STATUS_CODES.includes('10-' + s.slice(2)) ? [, s.slice(2)] : null);
  return m ? '10-' + +m[1] : String(v ?? '').trim(); };
export const statuses = cid => { const m = STATUS.get(cid) || new Map(); for (const [k, v] of m) if (now() - v.at > 12 * 3600000) m.delete(k); return Object.fromEntries([...m].map(([k, v]) => [k, v.st])); };
export const setStatus = (cid, unit, st, by) => { st = statusCode(st); if (!STATUS_CODES.includes(st)) return { error: 'Unknown status.' }; const u = T(unit, 40); if (!u) return { error: 'You are not on a unit yet.' };
  if (!STATUS.has(cid)) STATUS.set(cid, new Map()); STATUS.get(cid).set(u, { st, at: now(), by }); return { ok: true, unit: u, st, label: STATUS_LABELS[st] }; };
