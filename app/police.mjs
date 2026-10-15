// The law enforcement MDT's records: people and vehicles seen in game, and the warrants, BOLOs, citations, warnings,
// arrests and traffic stops officers write. Everything is per server and shared by everyone on it, so dispatch and every
// officer see the same thing. ER:LC's API gives plates, vehicle colors and owners, and players' wanted stars; it has no
// characters, so a person is their Roblox account, and their license details are the ones they filled in on Oversite.
import { db, now, users, licenses, mdtSignin } from './db.mjs';

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
const q = sql => db.prepare(sql);

// Liberty County's penal code: [code, title, fine in $, jail in minutes, class]. Infractions are tickets; misdemeanors and felonies can be jailed.
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
const PENAL_BY = new Map(PENAL.map(p => [p[0], p]));

// who may approve a warrant: a server admin, or someone signed in to the police MDT with a supervisor rank (Sergeant and up,
// unless a Premium server set its own ranks); pdRanks is the server's police list from ranksFor
export const pdRank = (cid, uid) => mdtSignin.mine(cid, uid).pd || '';
export const isSupervisor = (cid, uid, adminRole, pdRanks) => adminRole || !!pdRanks?.find(r => r[0] === pdRank(cid, uid))?.[2];

const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const PLATE = v => String(v ?? '').toUpperCase().replace(/[^A-Z0-9 -]/g, '').trim().slice(0, 10);
const RID = v => /^\d{1,20}$/.test(String(v ?? '')) ? String(v) : '';

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
    db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); console.log('pd observe:', e.message); } };

// ── records ──
const row = r => r && { id: r.id, kind: r.kind, status: r.status, subject: r.subject || '', subject_rid: r.subject_rid || '', plate: r.plate || '', by: r.by_name || '', at: r.at, updated: r.updated, ...JSON.parse(r.data || '{}') };
export const record = (cid, id) => row(q('SELECT * FROM pd_records WHERE community_id = ? AND id = ?').get(cid, +id || 0));
export const list = (cid, { kind, status, mine } = {}, uid) => { const w = ['community_id = ?'], a = [cid];
  if (kind) { w.push('kind = ?'); a.push(kind); } if (status === 'open') w.push("status IN ('Pending', 'Active')"); else if (status === 'closed') w.push("status NOT IN ('Pending', 'Active')");
  if (mine) { w.push('by_uid = ?'); a.push(uid); }
  return q(`SELECT * FROM pd_records WHERE ${w.join(' AND ')} ORDER BY at DESC LIMIT 200`).all(...a).map(row); };

const charges = arr => (Array.isArray(arr) ? arr : []).slice(0, 20).map(c => { const p = PENAL_BY.get(String(c?.code || c)); return p && { code: p[0], title: p[1], fine: p[2], jail: p[3], cls: p[4], count: Math.min(9, Math.max(1, +c?.count || 1)) }; }).filter(Boolean);
const sum = (cs, k) => cs.reduce((a, c) => a + c[k] * c.count, 0);
const KINDS = ['warrant', 'citation', 'warning', 'arrest', 'bolo', 'stop'];
// what each kind keeps; the officer never types a fine or a total, they come from the penal code
const shape = (kind, b) => { const cs = charges(b.charges), base = { location: T(b.location, 80), notes: T(b.notes, 1500), unit: T(b.unit, 40) };
  if (kind === 'citation') return { ...base, charges: cs, fine: sum(cs, 'fine'), vehicle: T(b.vehicle, 60) };
  if (kind === 'warning') return { ...base, reason: T(b.reason, 200) };
  if (kind === 'arrest') return { ...base, charges: cs, fine: sum(cs, 'fine'), jail: sum(cs, 'jail'), officers: (Array.isArray(b.officers) ? b.officers : String(b.officers || '').split(',')).map(o => T(o, 40)).filter(Boolean).slice(0, 8),
    booking: { num: 'BK-' + String(Math.floor(now() / 1000) % 1e7).padStart(7, '0'), facility: T(b.facility, 60) || 'Liberty County Jail', property: T(b.property, 300), miranda: !!b.miranda } };
  if (kind === 'warrant') return { ...base, charges: cs, type: b.type === 'Search' ? 'Search' : 'Arrest', reason: T(b.reason, 600) };
  if (kind === 'bolo') return { ...base, type: b.type === 'vehicle' ? 'vehicle' : 'person', desc: T(b.desc, 300), reason: T(b.reason, 200), model: T(b.model, 60), color: T(b.color, 30), armed: !!b.armed };
  if (kind === 'stop') return { ...base, vehicle: T(b.vehicle, 60), color: T(b.color, 30), x: Number.isFinite(+b.x) ? +(+b.x).toFixed(1) : null, y: Number.isFinite(+b.y) ? +(+b.y).toFixed(1) : null, backup: [], outcome: '' };
  return base; };

export const create = (cid, by, b) => { const kind = String(b.kind || ''); if (!KINDS.includes(kind)) return { error: 'Unknown record.' };
  const d = shape(kind, b), subject = T(b.subject, 40), rid = RID(b.subject_rid), plate = PLATE(b.plate);
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
export const remove = (cid, id) => q('DELETE FROM pd_records WHERE community_id = ? AND id = ?').run(cid, +id || 0);

// ── lookups ──
const vehRow = v => v && { plate: v.plate, model: v.model || '', color: v.color || '', hex: v.color_hex || '', owner: v.owner || '', owner_rid: v.owner_rid || '', reg: v.reg, ins: v.ins, stolen: !!v.stolen, first_seen: v.first_seen, last_seen: v.last_seen };
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
  const vehicles = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND (plate LIKE ? OR owner LIKE ? OR model LIKE ?) ORDER BY last_seen DESC LIMIT 15').all(cid, plate, like, like).map(vehRow);
  const ppl = [...out.values()].slice(0, 15).map(p => ({ ...p, flags: flagsFor(cid, p.rid, p.name).map(f => f.kind) }));
  return { people: ppl, vehicles: vehicles.map(v => ({ ...v, flags: [...flagsFor(cid, '', '', [v.plate]).map(f => f.kind), ...(v.stolen ? ['stolen'] : [])] })) }; };

export const person = async (cid, key, licenseOf) => { const rid = RID(key), name = rid ? '' : T(key, 40);
  const p = rid ? q('SELECT * FROM pd_people WHERE community_id = ? AND rid = ?').get(cid, rid) : q('SELECT * FROM pd_people WHERE community_id = ? AND lower(name) = lower(?)').get(cid, name);
  const who = { rid: p?.rid || rid, name: p?.name || name, team: p?.team || '', first_seen: p?.first_seen || 0, last_seen: p?.last_seen || 0 };
  if (!who.name && !who.rid) return { error: 'Nobody by that name.' };
  const acct = who.rid ? users.byRoblox(who.rid) : null; let license = null;
  if (acct) { const l = await licenseOf(acct); if (l.saved) license = { display: l.display, age: l.age, gndr: l.gndr, hair: l.hair, eyes: l.eyes, hgt: l.hgt, wgt: l.wgt, addr: l.addr, iss: l.iss, num: 'LC' + String(who.rid).padStart(8, '0').slice(-8) }; else license = { display: l.display, none: true }; }
  const vehicles = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND (owner_rid = ? OR lower(owner) = lower(?)) ORDER BY last_seen DESC LIMIT 20').all(cid, who.rid || '-', who.name || '-').map(vehRow);
  const n = (who.name || '').toLowerCase(), history = q("SELECT * FROM pd_records WHERE community_id = ? AND ((subject_rid <> '' AND subject_rid = ?) OR lower(subject) = ?) ORDER BY at DESC LIMIT 100").all(cid, who.rid || '-', n || '-').map(row);
  return { person: who, account: !!acct, license, vehicles, history, flags: flagsFor(cid, who.rid, who.name, vehicles.map(v => v.plate)) }; };

export const vehicle = (cid, plate) => { const v = vehRow(q('SELECT * FROM pd_vehicles WHERE community_id = ? AND plate = ?').get(cid, PLATE(plate)));
  if (!v) return { error: `No vehicle with plate ${PLATE(plate)} has been seen in this server.` };
  const history = q('SELECT * FROM pd_records WHERE community_id = ? AND plate = ? ORDER BY at DESC LIMIT 50').all(cid, v.plate).map(row);
  return { vehicle: v, history, flags: flagsFor(cid, '', '', [v.plate]), owner_flags: v.owner ? flagsFor(cid, v.owner_rid, v.owner).filter(f => !f.plate || f.plate !== v.plate) : [] }; };
export const setVehicle = (cid, plate, b) => { const v = q('SELECT * FROM pd_vehicles WHERE community_id = ? AND plate = ?').get(cid, PLATE(plate)); if (!v) return { error: 'That vehicle is not on file.' };
  const reg = ['Valid', 'Expired', 'Suspended'].includes(b.reg) ? b.reg : v.reg, ins = ['Active', 'Lapsed', 'None'].includes(b.ins) ? b.ins : v.ins, stolen = b.stolen == null ? v.stolen : b.stolen ? 1 : 0;
  q('UPDATE pd_vehicles SET reg = ?, ins = ?, stolen = ? WHERE community_id = ? AND plate = ?').run(reg, ins, stolen, cid, v.plate); return { ok: true, ...vehicle(cid, v.plate) }; };

// unit status (10-codes), shared so dispatch and every MDT show the same; kept in memory, gone after 12 hours
const STATUS = new Map();
export const STATUS_CODES = ['10-8', '10-6', '10-7', '10-11', '10-80', '10-23', '10-76', '10-15', '10-19', '10-97', '10-99'];
export const statuses = cid => { const m = STATUS.get(cid) || new Map(); for (const [k, v] of m) if (now() - v.at > 12 * 3600000) m.delete(k); return Object.fromEntries([...m].map(([k, v]) => [k, v.st])); };
export const setStatus = (cid, unit, st, by) => { if (!STATUS_CODES.includes(st)) return { error: 'Unknown status.' }; const u = T(unit, 40); if (!u) return { error: 'You are not on a unit yet.' };
  if (!STATUS.has(cid)) STATUS.set(cid, new Map()); STATUS.get(cid).set(u, { st, at: now(), by }); return { ok: true, unit: u, st }; };
