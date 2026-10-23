// License status, from a person's profile in the police MDT: an officer suspends a driver's license or firearms permit (for some
// days, or until it is reinstated), revokes it, or reinstates it, always with a reason. Per server. A person is their Roblox
// account, or the name an officer typed when they have none. A suspension with an end date lifts by itself. Every change is kept,
// so the profile shows who did what and why. On a server with roleplay characters a person is the character. The plate reader flags a car whose owner can't drive, and gun stores turn away
// anyone whose permit is suspended or revoked.
import { db, now } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS pd_licenses (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, who TEXT NOT NULL, kind TEXT NOT NULL,
  status TEXT NOT NULL, until INTEGER, reason TEXT, by_name TEXT, at INTEGER NOT NULL, PRIMARY KEY (community_id, who, kind));
CREATE TABLE IF NOT EXISTS pd_license_log (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, who TEXT NOT NULL, kind TEXT NOT NULL,
  status TEXT NOT NULL, until INTEGER, reason TEXT, by_name TEXT, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS pd_license_log_who ON pd_license_log (community_id, who, at);`);
const q = sql => db.prepare(sql);

export const KINDS = { driver: 'Driver’s license', firearm: 'Firearms permit', boat: 'Boating license' };
// licenses a person has to get first (the boating license, app/boats.mjs): without one it reads None, not Valid
const ISSUED = { boat: true }; let issued = () => false; export const issuedBy = fn => { issued = fn; };
export const STATUSES = ['Valid', 'Suspended', 'Revoked'];
export const DAYS = [1, 3, 7, 14, 30];   // how long a suspension can be (0: until someone reinstates it)
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
// a Roblox account, a roleplay character (c12, app/chars.mjs), or a typed name
export const key = (rid, name) => /^\d{1,20}$/.test(String(rid || '')) ? 'r:' + rid : /^c\d{1,12}$/.test(String(rid || '')) ? rid : name ? 'n:' + String(name).trim().toLowerCase() : '';

// a person's licenses as they stand now: { kind, name, status, until, reason, by, at }; an ended suspension reads as Valid
const now_ = (r, t) => !r || (r.status === 'Suspended' && r.until && r.until <= t) ? null : r;
export const of = (cid, rid, name) => { const w = key(rid, name), t = now(); const rows = w ? q('SELECT * FROM pd_licenses WHERE community_id = ? AND who = ?').all(cid, w) : [];
  return Object.entries(KINDS).map(([kind, label]) => { const r = now_(rows.find(x => x.kind === kind), t);
    return { kind, name: label, status: r ? r.status : ISSUED[kind] && !issued(cid, w, kind) ? 'None' : 'Valid', until: r?.until || null, reason: r?.reason || '', by: r?.by_name || '', at: r?.at || null }; }); };
export const statusOf = (cid, rid, name, kind) => of(cid, rid, name).find(l => l.kind === kind)?.status || 'Valid';
export const history = (cid, rid, name) => { const w = key(rid, name); return w ? q('SELECT kind, status, until, reason, by_name AS by, at FROM pd_license_log WHERE community_id = ? AND who = ? ORDER BY at DESC LIMIT 20').all(cid, w).map(r => ({ ...r, name: KINDS[r.kind] || r.kind })) : []; };

// an officer changes one: j = { rid, name, kind, status, days, reason }
export const set = (cid, by, j) => { const w = key(j.rid, T(j.name, 40)); if (!w) return { error: 'Pick the person first.' };
  if (!KINDS[j.kind]) return { error: 'kind is "driver", "firearm" or "boat".' }; if (!STATUSES.includes(j.status)) return { error: 'status is Valid, Suspended or Revoked.' };
  const reason = T(j.reason, 200); if (j.status !== 'Valid' && !reason) return { error: 'Say why.' };
  const days = j.status === 'Suspended' ? Math.max(0, Math.min(365, Math.round(+j.days || 0))) : 0, t = now(), until = days ? t + days * 864e5 : null;
  const cur = statusOf(cid, j.rid, j.name, j.kind); if (cur === 'Valid' && j.status === 'Valid') return { error: 'It’s already valid.' }; if (cur === 'None') return { error: `They don’t have a ${KINDS[j.kind].toLowerCase()}.` };
  q(`INSERT INTO pd_licenses (community_id, who, kind, status, until, reason, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (community_id, who, kind) DO UPDATE SET status = excluded.status, until = excluded.until, reason = excluded.reason, by_name = excluded.by_name, at = excluded.at`).run(cid, w, j.kind, j.status, until, reason, T(by, 40), t);
  q('INSERT INTO pd_license_log (community_id, who, kind, status, until, reason, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(cid, w, j.kind, j.status, until, reason, T(by, 40), t);
  return { ok: true, change: { kind: j.kind, name: KINDS[j.kind], status: j.status, until, reason, by: T(by, 40), at: t, was: cur }, licenses: of(cid, j.rid, j.name), history: history(cid, j.rid, j.name) }; };
