// Call history and call notes. Every 911 call the CAD sees (in game, from the Civilian tab, from a bot) is kept here: what it was,
// where, who called, which units went and when (dispatched, en route, on scene), and when and by whom it was cleared, or that it
// ended in game. Dispatch and the units on a call add notes to it ("Suspect left northbound in a red sedan"), live for everyone,
// and can keep adding them after it's over ("Report filed: FD-2026-0012"). Free servers see the last 30 days; Premium all of it.
// A call's key is the one the CAD gives it: `${CallNumber or Description}@${StartedAt}`.
import { db, now } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS call_log (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, key TEXT NOT NULL,
  type TEXT NOT NULL, where_txt TEXT, team TEXT, caller TEXT, x REAL, y REAL, received INTEGER NOT NULL, last_seen INTEGER NOT NULL,
  dispatched INTEGER, enroute INTEGER, onscene INTEGER, cleared INTEGER, cleared_by TEXT, units TEXT NOT NULL DEFAULT '[]', notes TEXT NOT NULL DEFAULT '[]',
  UNIQUE (community_id, key));
CREATE INDEX IF NOT EXISTS call_log_r ON call_log (community_id, received);`);
const q = sql => db.prepare(sql);
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
export const keyOf = c => String(`${c.CallNumber ?? c.Description ?? ''}@${c.StartedAt ?? ''}`).replace(/[^\w .:@#-]/g, '').slice(0, 120);   // the CAD's own (live-map.html pushCalls)
const KEY = /^[\w .:@#-]{1,120}$/, ENDED = 120000, KEEP_DAYS = 400;

const row = r => r && ({ key: r.key, type: r.type, where: r.where_txt || '', team: r.team || '', caller: r.caller || '', x: r.x, y: r.y, received: r.received,
  dispatched: r.dispatched || null, enroute: r.enroute || null, onscene: r.onscene || null, cleared: r.cleared || null, cleared_by: r.cleared_by || '',
  units: JSON.parse(r.units), notes: JSON.parse(r.notes) });
export const get = (cid, key) => row(q('SELECT * FROM call_log WHERE community_id = ? AND key = ?').get(cid, key));

// one reading of the server's calls: new ones are filed, ones still going are seen, and ones gone from the game for a couple of
// minutes without being cleared in the CAD ended in game
let lastPrune = 0;
export const observe = (cid, body) => { let j; try { j = JSON.parse(body); } catch (e) { return; } const L = Array.isArray(j.EmergencyCalls) ? j.EmergencyCalls : null; if (!L) return;
  const t = now(), here = new Set();
  for (const c of L) { const k = keyOf(c); if (!KEY.test(k)) continue; here.add(k); const at = Number.isFinite(+c.StartedAt) && +c.StartedAt > 0 ? +c.StartedAt * 1000 : t;
    const caller = Array.isArray(c.Players) && c.Players.length ? String(c.Players[0]).split(':')[0] : c.Caller != null ? String(c.Caller) : '';
    q(`INSERT INTO call_log (community_id, key, type, where_txt, team, caller, x, y, received, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (community_id, key) DO UPDATE SET last_seen = excluded.last_seen`).run(cid, k, T(c.Description, 300) || 'Emergency call', T(c.PositionDescriptor, 120) || null, T(c.Team, 30) || null,
      T(caller, 40) || null, Array.isArray(c.Position) ? +c.Position[0] || null : null, Array.isArray(c.Position) ? +c.Position[1] || null : null, at, t); }
  for (const r of q('SELECT id, key, last_seen FROM call_log WHERE community_id = ? AND cleared IS NULL AND last_seen < ?').all(cid, t - ENDED))
    if (!here.has(r.key)) q("UPDATE call_log SET cleared = ?, cleared_by = 'Ended in game' WHERE id = ?").run(r.last_seen, r.id);
  if (t - lastPrune > 3600000) { lastPrune = t; q('DELETE FROM call_log WHERE received < ?').run(t - KEEP_DAYS * 864e5); } };

// units and progress set on the call in dispatch or an MDT (the server's calls/state): who went, and when each stage was first reached
export const state = (cid, key, st) => { const r = q('SELECT * FROM call_log WHERE community_id = ? AND key = ?').get(cid, key); if (!r) return; const t = now();
  const names = [st.unit, ...(st.more || []).map(m => m.name)].filter(Boolean), U = JSON.parse(r.units);
  for (const n of names) if (!U.some(u => u.name === n)) U.push({ name: n, at: t });
  const has = !!st.unit; q('UPDATE call_log SET units = ?, dispatched = coalesce(dispatched, ?), enroute = coalesce(enroute, ?), onscene = coalesce(onscene, ?) WHERE id = ?')
    .run(JSON.stringify(U.slice(0, 20)), has ? t : null, has && st.stage >= 1 ? t : null, has && st.stage >= 2 ? t : null, r.id); };
export const cleared = (cid, key, by) => q('UPDATE call_log SET cleared = coalesce(cleared, ?), cleared_by = coalesce(cleared_by, ?) WHERE community_id = ? AND key = ?').run(now(), T(by, 40) || 'Dispatch', cid, key);

export const addNote = (cid, key, by, text, as) => { const r = q('SELECT * FROM call_log WHERE community_id = ? AND key = ?').get(cid, String(key || '')); if (!r) return { error: 'That call isn’t on file.' };
  const x = T(text, 400); if (!x) return { error: 'Write the note first.' }; const N = JSON.parse(r.notes); if (N.length >= 60) return { error: 'A call can have up to 60 notes.' };
  N.push({ at: now(), by: T(by, 40), as: as === 'unit' ? 'unit' : 'dispatch', text: x }); q('UPDATE call_log SET notes = ? WHERE id = ?').run(JSON.stringify(N), r.id); return { ok: true, key: r.key, notes: N }; };
// notes on calls still going (or cleared in the last 12 hours), for a CAD that just connected
export const openNotes = cid => Object.fromEntries(q("SELECT key, notes FROM call_log WHERE community_id = ? AND notes <> '[]' AND (cleared IS NULL OR cleared > ?)").all(cid, now() - 12 * 3600000).map(r => [r.key, JSON.parse(r.notes)]));

// past calls, newest first: a search over type, place, caller, units and notes; a day range; cut = the oldest a free server sees
export const list = (cid, { q: text = '', days = 7, unit = '', cut = 0, before = 0 } = {}) => { const w = ['community_id = ?'], a = [cid], from = Math.max(cut, days ? now() - days * 864e5 : 0);
  if (from) { w.push('received >= ?'); a.push(from); } if (before) { w.push('received < ?'); a.push(+before); }
  const s = T(text, 60).toLowerCase(); if (s) { w.push("(lower(type) LIKE ? OR lower(coalesce(where_txt, '')) LIKE ? OR lower(coalesce(caller, '')) LIKE ? OR lower(units) LIKE ? OR lower(notes) LIKE ?)"); const like = '%' + s.replace(/[%_]/g, '') + '%'; a.push(like, like, like, like, like); }
  const u = T(unit, 40).toLowerCase(); if (u) { w.push('lower(units) LIKE ?'); a.push('%"' + u.replace(/[%_"]/g, '') + '"%'); }
  return q(`SELECT * FROM call_log WHERE ${w.join(' AND ')} ORDER BY received DESC LIMIT 101`).all(...a).map(row); };
