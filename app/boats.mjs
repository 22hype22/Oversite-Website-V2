// Boats: a boating license and registered boats for civilians, in the Civilian phone's Boats app. A player gets a boating license
// (a fee from their bank account, issued with a number), then registers their boats (a name, the model, colour and length) and each
// gets a hull number police can search. Owners report a boat stolen or recovered, and take one off the register when it's sold.
// Police see a person's boats and boating license on their profile; the license is suspended or revoked like the others
// (app/pdlicense.mjs). Everything is kept on the character a player is playing, or their Roblox account.
// Settings: c.settings.boats = { licenseFee, regFee, needLicense }
import { db, now, communities } from './db.mjs';
import * as civ from './civ.mjs';
import { key as personKey, statusOf, issuedBy } from './pdlicense.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS civ_boat_licenses (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, who TEXT NOT NULL, number TEXT NOT NULL, issued INTEGER NOT NULL,
  PRIMARY KEY (community_id, who));
CREATE TABLE IF NOT EXISTS civ_boats (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, user_id INTEGER, who TEXT NOT NULL, owner TEXT NOT NULL,
  hull TEXT NOT NULL, name TEXT, model TEXT NOT NULL, color TEXT, length TEXT, stolen INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS civ_boats_hull ON civ_boats (community_id, hull);
CREATE INDEX IF NOT EXISTS civ_boats_who ON civ_boats (community_id, who);`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
export const MAX = 6, MODELS = ['Jet ski', 'Speedboat', 'Fishing boat', 'Pontoon boat', 'Sailboat', 'Yacht', 'Inflatable', 'Other'];

export const conf = c => { const s = (communities.byId(c.id) || c).settings.boats || {}, m = (v, d) => Math.max(0, Math.min(1e6, Math.round(Number.isFinite(+v) && v !== '' && v != null ? +v : d)));
  return { licenseFee: m(s.licenseFee, 150), regFee: m(s.regFee, 250), needLicense: s.needLicense !== false }; };
export const saveConf = (c, j) => { const s = { licenseFee: Math.max(0, Math.min(1e6, Math.round(+j.licenseFee || 0))), regFee: Math.max(0, Math.min(1e6, Math.round(+j.regFee || 0))), needLicense: !!j.needLicense };
  const st = communities.byId(c.id).settings; st.boats = s; communities.saveSettings(c.id, st); c.settings.boats = s; return { ok: true }; };

// the person a player is right now: their character, or their Roblox account
const who = (c, user) => { const ch = civ.charOf(c.id, user.id); return { key: personKey(ch ? ch.key : user.roblox_id, ch ? '' : user.roblox_name), name: ch ? `${ch.first} ${ch.last}`.trim() : user.roblox_name || user.name || 'Someone' }; };
const held = (cid, w) => !!q('SELECT 1 FROM civ_boat_licenses WHERE community_id = ? AND who = ?').get(cid, w);
issuedBy((cid, w, kind) => kind === 'boat' && held(cid, w));
const rid = w => w.startsWith('r:') ? w.slice(2) : w.startsWith('c') ? w : '';
const licOf = (c, w) => { const L = q('SELECT number, issued FROM civ_boat_licenses WHERE community_id = ? AND who = ?').get(c.id, w), st = statusOf(c.id, rid(w), w.startsWith('n:') ? w.slice(2) : '', 'boat');
  return { status: st, number: L?.number || '', issued: L?.issued || null }; };
const boat = r => ({ id: r.id, hull: r.hull, name: r.name || '', model: r.model, color: r.color || '', length: r.length || '', stolen: !!r.stolen, owner: r.owner, created: r.created });

// a new number that isn't in use: LC-1234-AB for a hull, BL-123456 for a license
const pick = (cid, make, table, col) => { for (let i = 0; i < 40; i++) { const n = make(); if (!q(`SELECT 1 FROM ${table} WHERE community_id = ? AND ${col} = ?`).get(cid, n)) return n; } return make() + Date.now() % 97; };
const L2 = () => String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String.fromCharCode(65 + Math.floor(Math.random() * 26));
const hullFor = c => pick(c.id, () => `${(c.slug || 'BT').replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() || 'BT'}-${1000 + Math.floor(Math.random() * 9000)}-${L2()}`, 'civ_boats', 'hull');

export const view = (c, user, admin) => { const w = who(c, user), cf = conf(c);
  return { conf: cf, license: licOf(c, w.key), name: w.name, boats: q('SELECT * FROM civ_boats WHERE community_id = ? AND who = ? ORDER BY id').all(c.id, w.key).map(boat), models: MODELS, admin: !!admin, linked: !!user.roblox_id }; };

export const getLicense = (c, user) => { const w = who(c, user); if (!user.roblox_id) return { error: 'Link your Roblox account first.' };
  const st = licOf(c, w.key).status; if (st === 'Valid') return { error: 'You already have a boating license.' }; if (st === 'Suspended' || st === 'Revoked') return { error: `Your boating license is ${st.toLowerCase()}. Only police can reinstate it.` };
  const cf = conf(c); civ.ensure(c, user.id); if (cf.licenseFee) { const r = civ.move(c.id, user.id, -cf.licenseFee, 'license', 'Boating license'); if (r.error) return r; }
  const number = pick(c.id, () => 'BL-' + (100000 + Math.floor(Math.random() * 900000)), 'civ_boat_licenses', 'number');
  q('INSERT OR REPLACE INTO civ_boat_licenses (community_id, who, number, issued) VALUES (?, ?, ?, ?)').run(c.id, w.key, number, now()); return { ok: true, number }; };

export const register = (c, user, j) => { const w = who(c, user), cf = conf(c); if (!user.roblox_id) return { error: 'Link your Roblox account first.' };
  if (cf.needLicense && licOf(c, w.key).status !== 'Valid') return { error: 'You need a valid boating license to register a boat.' };
  const model = MODELS.includes(j.model) ? j.model : 'Other'; if (q('SELECT COUNT(*) n FROM civ_boats WHERE community_id = ? AND who = ?').get(c.id, w.key).n >= MAX) return { error: `You can register up to ${MAX} boats.` };
  civ.ensure(c, user.id); if (cf.regFee) { const r = civ.move(c.id, user.id, -cf.regFee, 'registration', `Boat registration: ${T(j.name, 30) || model}`); if (r.error) return r; }
  const hull = hullFor(c), id = Number(q('INSERT INTO civ_boats (community_id, user_id, who, owner, hull, name, model, color, length, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, user.id, w.key, w.name, hull, T(j.name, 30), model, T(j.color, 20), T(j.length, 12), now()).lastInsertRowid); return { ok: true, id, hull }; };
const mineBoat = (c, user, id) => { const w = who(c, user); return q('SELECT * FROM civ_boats WHERE community_id = ? AND id = ? AND who = ?').get(c.id, +id || 0, w.key); };
export const stolen = (c, user, j) => { const b = mineBoat(c, user, j.id); if (!b) return { error: 'That isn’t your boat.' }; q('UPDATE civ_boats SET stolen = ? WHERE id = ?').run(j.stolen ? 1 : 0, b.id); return { ok: true, boat: boat({ ...b, stolen: j.stolen ? 1 : 0 }) }; };
export const remove = (c, user, j) => { const b = mineBoat(c, user, j.id); if (!b) return { error: 'That isn’t your boat.' }; q('DELETE FROM civ_boats WHERE id = ?').run(b.id); return { ok: true }; };

// police: a person's boats and boating license, and boats by hull number, name or owner
export const forPerson = (cid, personRid, name) => { const w = personKey(personRid, name); if (!w) return { boats: [], license: null };
  const L = q('SELECT number, issued FROM civ_boat_licenses WHERE community_id = ? AND who = ?').get(cid, w);
  return { boats: q('SELECT * FROM civ_boats WHERE community_id = ? AND who = ? ORDER BY id').all(cid, w).map(boat), license: L ? { number: L.number, issued: L.issued } : null }; };
export const search = (cid, text) => { const s = T(text, 40).replace(/[%_]/g, ''); if (s.length < 2) return [];
  return q("SELECT * FROM civ_boats WHERE community_id = ? AND (upper(hull) LIKE upper(?) OR lower(name) LIKE lower(?) OR lower(owner) LIKE lower(?)) ORDER BY stolen DESC, id DESC LIMIT 15").all(cid, `%${s}%`, `%${s}%`, `%${s}%`)
    .map(r => ({ ...boat(r), rid: rid(r.who), owner: r.owner })); };
