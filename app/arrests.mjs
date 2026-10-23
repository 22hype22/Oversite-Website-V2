// Arrest log: proof of every arrest in game, for moderators. ER:LC has no arrest log of its own, but each reading of the server
// says everyone's team: when a player goes onto the jail team they were just arrested (or jailed by a staff command). Kept here:
// who, when and where, the wanted level they had, the officer closest to them at that moment (an arrest is made up close) and
// the others nearby, and when they came out. The Server Staff panel shows the log, with the MDT arrest report and any :jail
// command that matches, so a disputed arrest can be checked.
import { db, now, communities, commandLog } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS arrest_log (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, suspect TEXT NOT NULL,
  suspect_id TEXT, from_team TEXT, wanted INTEGER NOT NULL DEFAULT 0, postal TEXT, street TEXT, x REAL, z REAL, officer TEXT, officer_id TEXT, officer_team TEXT,
  dist INTEGER, nearby TEXT NOT NULL DEFAULT '[]', at INTEGER NOT NULL, released INTEGER);
CREATE INDEX IF NOT EXISTS arrest_log_c ON arrest_log (community_id, id);
CREATE INDEX IF NOT EXISTS arrest_log_s ON arrest_log (community_id, suspect_id);`);
const q = sql => db.prepare(sql);
export const KEEP = 5000, CLOSE = 60, NEAR = 350;   // map pixels: an arrest is made within a few metres; "nearby" is a block or two

const JAIL = t => /jail|prison/i.test(t || '');
const deptOf = (c, team) => { const T = c.settings.teams || {}; if (team in T) return T[team] || ''; return /police|sheriff|trooper|state/i.test(team || '') ? 'pd' : ''; };
const split = v => { const [name, id] = String(v || '').split(':'); return { name: name || '', id: /^\d+$/.test(id || '') ? id : '' }; };

// per server: everyone on the last reading (team, place, wanted level)
const LAST = new Map();
let emit = () => {}; export const onArrest = fn => { emit = fn; };
export const observe = (c, body) => { let j; try { j = JSON.parse(body); } catch (e) { return; } if (!Array.isArray(j.Players)) return;
  const was = LAST.get(c.id), cur = new Map(), t = now();
  for (const p of j.Players) { const { name, id } = split(p.Player); if (!name) continue; const L = p.Location || {};
    cur.set(name.toLowerCase(), { name, id, team: p.Team || '', wanted: +p.WantedStars || 0, x: L.LocationX, z: L.LocationZ, postal: L.PostalCode || '', street: L.StreetName || '' }); }
  LAST.set(c.id, cur); if (!was) return;   // the first reading after a restart only learns who is where
  for (const [k, p] of cur) { const b = was.get(k);
    if (b && !JAIL(b.team) && JAIL(p.team)) arrested(c, b, p, was, cur, t);
    else if (b && JAIL(b.team) && !JAIL(p.team)) q('UPDATE arrest_log SET released = ? WHERE id = (SELECT id FROM arrest_log WHERE community_id = ? AND lower(suspect) = ? AND released IS NULL ORDER BY id DESC LIMIT 1)').run(t, c.id, k); }
  for (const [k, b] of was) if (JAIL(b.team) && !cur.has(k)) q('UPDATE arrest_log SET released = ? WHERE id = (SELECT id FROM arrest_log WHERE community_id = ? AND lower(suspect) = ? AND released IS NULL ORDER BY id DESC LIMIT 1)').run(t, c.id, k); };   // left the game while jailed

// the arrest: where they were just before, and the officers around them then (and now, in case they moved since)
const arrested = (c, b, p, was, cur, t) => { const at = Number.isFinite(b.x) ? b : Number.isFinite(p.x) ? p : null; let cops = [];
  if (at) { const seen = new Map(); for (const M of [was, cur]) for (const o of M.values()) { if (o.name === b.name || deptOf(c, o.team) !== 'pd' || !Number.isFinite(o.x)) continue;
      const d = Math.round(Math.hypot(o.x - at.x, o.z - at.z)); if (d <= NEAR && (!seen.has(o.name) || seen.get(o.name).dist > d)) seen.set(o.name, { name: o.name, id: o.id, team: o.team, dist: d }); }
    cops = [...seen.values()].sort((x, y) => x.dist - y.dist); }
  const by = cops[0] && cops[0].dist <= CLOSE ? cops[0] : null;
  const id = Number(q('INSERT INTO arrest_log (community_id, suspect, suspect_id, from_team, wanted, postal, street, x, z, officer, officer_id, officer_team, dist, nearby, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, b.name, b.id || p.id || null, b.team, b.wanted, at?.postal || '', at?.street || '', at?.x ?? null, at?.z ?? null, by?.name || null, by?.id || null, by?.team || null, by ? by.dist : null,
      JSON.stringify(cops.filter(o => o !== by).slice(0, 6)), t).lastInsertRowid);
  if (id % 50 === 0) q('DELETE FROM arrest_log WHERE community_id = ? AND id NOT IN (SELECT id FROM arrest_log WHERE community_id = ? ORDER BY id DESC LIMIT ?)').run(c.id, c.id, KEEP);
  console.log(`arrest: ${c.slug} ${b.name}${by ? ' by ' + by.name : ''} at ${at?.postal || '?'}`);
  emit(c, { id, suspect: b.name, suspect_id: b.id, wanted: b.wanted, officer: by?.name || '', officer_id: by?.id || '', postal: at?.postal || '', street: at?.street || '', nearby: cops.filter(o => o !== by).map(o => o.name), at: t }); };

// the log, newest first, with what backs each arrest up: the MDT arrest report written for them around then, and a :jail command
const W = 20 * 60000;
const row = (c, r) => { const rec = q("SELECT id, data, by_name, at FROM pd_records WHERE community_id = ? AND kind = 'arrest' AND at BETWEEN ? AND ? AND (subject_rid = ? OR lower(subject) = lower(?)) ORDER BY abs(at - ?) LIMIT 1")
    .get(c.id, r.at - W, r.at + W, r.suspect_id || '-', r.suspect, r.at);
  let charges = []; try { charges = rec ? (JSON.parse(rec.data).charges || []).map(x => x.title || x.code || String(x)).slice(0, 8) : []; } catch (e) {}
  const cmd = commandLog.mentioning(c.id, r.suspect).find(x => /^:(jail|arrest)\b/i.test(x.command) && Math.abs(x.at * 1000 - r.at) < 120000);
  return { id: r.id, suspect: r.suspect, suspect_id: r.suspect_id || '', from: r.from_team || '', wanted: r.wanted, postal: r.postal || '', street: r.street || '', x: r.x, z: r.z,
    officer: r.officer || '', officer_id: r.officer_id || '', officer_team: r.officer_team || '', dist: r.dist, nearby: JSON.parse(r.nearby || '[]'), at: r.at, released: r.released,
    report: rec ? { id: rec.id, by: rec.by_name || '', at: rec.at, charges } : null, command: cmd ? { by: cmd.player, command: cmd.command, at: cmd.at * 1000 } : null }; };
export const list = (c, o = {}) => { const s = String(o.q || '').trim().slice(0, 40), like = '%' + s.replace(/[%_]/g, '') + '%';
  const rows = s ? q('SELECT * FROM arrest_log WHERE community_id = ? AND (suspect_id = ? OR officer_id = ? OR lower(suspect) LIKE lower(?) OR lower(officer) LIKE lower(?)) ORDER BY id DESC LIMIT 100').all(c.id, s, s, like, like)
    : q('SELECT * FROM arrest_log WHERE community_id = ? ORDER BY id DESC LIMIT 100').all(c.id);
  return rows.map(r => row(c, r)); };

// keeps readings coming for servers that want the log while nobody has the CAD open (the live feed's answer when it's fresh)
export const start = (feedFor, keyOf, allowed) => setInterval(async () => {
  for (const c of communities.all()) { if (c.suspended || !allowed(c) || !keyOf(c.id)) continue; try { await feedFor(c).snapshot(); } catch (e) {} } }, 5000);
