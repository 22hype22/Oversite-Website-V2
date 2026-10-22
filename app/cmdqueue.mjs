// Commands that wait for players, and temporary bans. ER:LC only runs a command while someone is in the server, so a command staff
// send while it's shut down or empty (a ban, an unban, an announcement, or one typed in the Server Staff panel) waits here and runs
// as soon as someone joins, in the order they were sent, credited to whoever sent it. A temporary ban is an ordinary ban plus an end
// time: when it's up, an unban is queued the same way (so it runs at once if the server has players, or when someone next joins).
import { db, now, staffRecords, communities } from './db.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS cmd_queue (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, command TEXT NOT NULL,
  label TEXT, record TEXT, by_user INTEGER, by_name TEXT, at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'waiting', result TEXT, ran_at INTEGER, tries INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS cmd_queue_wait ON cmd_queue (status, community_id, id);
CREATE TABLE IF NOT EXISTS temp_bans (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, roblox_id TEXT, name TEXT NOT NULL,
  until INTEGER NOT NULL, reason TEXT, by_user INTEGER, by_name TEXT, at INTEGER NOT NULL, ended INTEGER);
CREATE INDEX IF NOT EXISTS temp_bans_due ON temp_bans (ended, until);`);
const q = sql => db.prepare(sql);
export const MAX_WAITING = 25;

// record: a staff record to write once the command really runs ({ roblox_id, name, kind, reason }), e.g. the unban that ends a temporary ban
export const add = (c, command, by, label, record = null) => {
  if (q("SELECT COUNT(*) n FROM cmd_queue WHERE community_id = ? AND status = 'waiting'").get(c.id).n >= MAX_WAITING) return { error: `${MAX_WAITING} commands are already waiting. Cancel some first.` };
  const id = q('INSERT INTO cmd_queue (community_id, command, label, record, by_user, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(c.id, command, label || null, record ? JSON.stringify(record) : null, by?.id || null, by?.name || '', now()).lastInsertRowid;
  return { ok: true, id: Number(id) }; };
export const list = c => q("SELECT id, command, label, by_name, at, status, result, ran_at FROM cmd_queue WHERE community_id = ? AND (status = 'waiting' OR at > ?) ORDER BY id DESC LIMIT 30").all(c.id, now() - 3 * 864e5);
export const cancel = (c, id) => q("UPDATE cmd_queue SET status = 'cancelled' WHERE community_id = ? AND id = ? AND status = 'waiting'").run(c.id, +id || 0).changes ? { ok: true } : { error: 'That command already ran or was cancelled.' };

// temporary bans: when each ends, by Roblox ID (or name) for the ban list
export const tempBan = (c, who, hours, reason, by) => { const until = now() + hours * 3600000;
  q('UPDATE temp_bans SET ended = ? WHERE community_id = ? AND ended IS NULL AND (roblox_id = ? OR lower(name) = lower(?))').run(now(), c.id, who.id || '-', who.name);   // a new ban replaces an old timer
  q('INSERT INTO temp_bans (community_id, roblox_id, name, until, reason, by_user, by_name, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(c.id, who.id || null, who.name, until, reason || '', by?.id || null, by?.name || '', now());
  return until; };
export const unbanned = (c, who) => q('UPDATE temp_bans SET ended = ? WHERE community_id = ? AND ended IS NULL AND (roblox_id = ? OR lower(name) = lower(?))').run(now(), c.id, who.id || '-', who.name || '-');
export const banEnds = c => { const m = new Map(); for (const b of q('SELECT roblox_id, name, until FROM temp_bans WHERE community_id = ? AND ended IS NULL').all(c.id)) { if (b.roblox_id) m.set(b.roblox_id, b.until); m.set('n:' + b.name.toLowerCase(), b.until); } return m; };

// every 30 seconds: queue the unban for temporary bans that are up, then run what's waiting on servers that have players.
// send(c, key, command, by) -> { ok, offline, message }; players(c) -> how many are in the server (null when unknown)
export const start = (send, players, keyOf) => { let busy = false;
  const tick = async () => { if (busy) return; busy = true; try {
    for (const b of q('SELECT * FROM temp_bans WHERE ended IS NULL AND until <= ?').all(now())) { const c = communities.byId(b.community_id); q('UPDATE temp_bans SET ended = ? WHERE id = ?').run(now(), b.id); if (!c) continue;
      add(c, `:unban ${b.roblox_id || b.name}`, { id: null, name: 'Oversite temporary ban' }, `Temporary ban for ${b.name} ended`, { roblox_id: b.roblox_id, name: b.name, kind: 'unban', reason: 'Temporary ban ended' }); }
    const ids = q("SELECT DISTINCT community_id FROM cmd_queue WHERE status = 'waiting'").all().map(r => r.community_id);
    for (const cid of ids) { const c = communities.byId(cid), key = c && keyOf(cid); if (!c || !key || c.suspended) continue;
      const n = await players(c).catch(() => null); if (!n) continue;   // nobody in game (or no answer): try again next time
      for (const w of q("SELECT * FROM cmd_queue WHERE community_id = ? AND status = 'waiting' ORDER BY id LIMIT 10").all(cid)) {
        const r = await send(c, key, w.command, { id: w.by_user, name: w.by_name }).catch(e => ({ ok: false, message: e.message }));
        if (r.ok) { q("UPDATE cmd_queue SET status = 'sent', ran_at = ?, result = ? WHERE id = ?").run(now(), String(r.message || 'Sent').slice(0, 200), w.id);
          if (w.record) { const rec = JSON.parse(w.record); staffRecords.add({ community_id: cid, roblox_id: rec.roblox_id || null, name: rec.name, kind: rec.kind, reason: rec.reason || '', by_user: w.by_user, by_name: w.by_name || 'Oversite', result: 'sent' }); }
          console.log(`queued command ran on ${c.slug}: ${w.command}`); continue; }
        if (r.offline) break;                                                     // emptied again: wait for the next player
        const tries = w.tries + 1; q('UPDATE cmd_queue SET tries = ?, status = ?, result = ? WHERE id = ?').run(tries, tries >= 3 ? 'failed' : 'waiting', String(r.message || 'ER:LC refused it').slice(0, 200), w.id); } }
  } catch (e) { console.log('command queue:', e.message); } busy = false; };
  setInterval(tick, 30000); setTimeout(tick, 5000); };
