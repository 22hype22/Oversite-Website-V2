// Help spam: a player who calls for a moderator over and over (ER:LC's mod call, or a !help or :help command) gets a warning, then a
// kick (they can join back), then a ban. The server sets how many calls in how many minutes count as spam, and how long a strike
// lasts before it's forgotten. Staff in game (anyone with a permission) never count. Every step is kept on the player's staff record
// and listed under Mod calls in the Server Staff MDT.
// Settings: c.settings.helpspam = { on, limit, mins, forget (days, 0: never) }
import { db, now, communities, staffRecords } from './db.mjs';
import { commandAs } from './staff.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS help_strikes (community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, lname TEXT NOT NULL, name TEXT NOT NULL,
  roblox_id TEXT, strikes INTEGER NOT NULL DEFAULT 0, last_at INTEGER NOT NULL, PRIMARY KEY (community_id, lname));
CREATE TABLE IF NOT EXISTS help_log (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, name TEXT NOT NULL, roblox_id TEXT,
  action TEXT NOT NULL, calls INTEGER NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS help_log_c ON help_log (community_id, id);`);
const q = sql => db.prepare(sql);
const NAME = 'Oversite help spam', STEPS = ['warn', 'kick', 'ban'], KEEP = 200;
// a command that asks for staff: !help, :help, /help, !mod, !modcall, !callmod (with or without a message after it)
const ASKS = /^\s*[!:/;]\s*(help|mod|modcall|callmod|calladmin|admin)\b/i;

const norm = (s = {}) => ({ on: !!s.on, limit: Math.max(2, Math.min(20, Math.round(+s.limit || 3))), mins: Math.max(1, Math.min(60, Math.round(+s.mins || 10))),
  forget: s.forget === 0 || s.forget === '0' ? 0 : Math.max(1, Math.min(90, Math.round(+s.forget || 7))) });
export const of = c => norm((communities.byId(c.id) || c).settings.helpspam);
export const save = (c, j) => { const s = norm(j); const st = communities.byId(c.id).settings; st.helpspam = s; communities.saveSettings(c.id, st); c.settings.helpspam = s; return { ok: true, settings: s }; };
export const log = c => q('SELECT * FROM help_log WHERE community_id = ? ORDER BY id DESC LIMIT 40').all(c.id).map(r => ({ id: r.id, name: r.name, roblox_id: r.roblox_id || '', action: r.action, calls: r.calls, at: r.at }));
// staff can wipe someone's strikes (they start again from a warning)
export const clear = (c, name) => ({ ok: q('DELETE FROM help_strikes WHERE community_id = ? AND lname = ?').run(c.id, String(name || '').toLowerCase()).changes > 0 });

const split = v => { const [name, id] = String(v || '').split(':'); return { name: name || '', id: /^\d+$/.test(id || '') ? id : '' }; };
// per server: the calls and commands already counted, and each player's recent ones (seconds)
const STATE = new Map(); const state = cid => { let st = STATE.get(cid); if (!st) STATE.set(cid, st = { seen: null, recent: new Map() }); return st; };

// one reading: the mod calls and command log, and who is staff in game right now
export const check = (c, key, body, modCalls, cmdLogs) => { const s = of(c); if (!s.on) return; let j = {}; try { j = JSON.parse(body); } catch (e) {}
  const staff = new Set((j.Players || []).filter(p => p.Permission && p.Permission !== 'Normal').map(p => split(p.Player).name.toLowerCase()));
  const calls = (Array.isArray(modCalls) ? modCalls : []).map(m => ({ who: split(m.Caller), at: +m.Timestamp, src: 'call' }));
  const cmds = (Array.isArray(cmdLogs) ? cmdLogs : []).filter(m => ASKS.test(String(m.Command || ''))).map(m => ({ who: split(m.Player), at: +m.Timestamp, src: 'cmd' }));
  // a !help that also made a mod call is one ask, not two
  const all = [...calls, ...cmds.filter(x => !calls.some(y => y.who.name.toLowerCase() === x.who.name.toLowerCase() && Math.abs(y.at - x.at) <= 10))]
    .filter(x => x.who.name && Number.isFinite(x.at)).sort((a, b) => a.at - b.at);
  const st = state(c.id), k = x => `${x.src}:${x.who.name.toLowerCase()}@${x.at}`;
  if (!st.seen) { st.seen = new Set(all.map(k)); return; }   // the first look after a restart only learns what's already there
  const t = Math.floor(Date.now() / 1000);
  for (const x of all) { const id = k(x); if (st.seen.has(id)) continue; st.seen.add(id); const ln = x.who.name.toLowerCase(); if (staff.has(ln)) continue;
    const R = (st.recent.get(ln) || []).filter(a => t - a < s.mins * 60); R.push(x.at); st.recent.set(ln, R);
    if (R.length >= s.limit) { st.recent.delete(ln); strike(c, key, s, x.who, R.length); } }
  if (st.seen.size > 3000) st.seen = new Set([...st.seen].slice(-1500)); };

const strike = (c, key, s, who, n) => { const ln = who.name.toLowerCase(), old = q('SELECT * FROM help_strikes WHERE community_id = ? AND lname = ?').get(c.id, ln);
  const fresh = !old || (s.forget && now() - old.last_at > s.forget * 86400000), strikes = (fresh ? 0 : old.strikes) + 1, action = STEPS[Math.min(strikes, 3) - 1];
  q('INSERT INTO help_strikes (community_id, lname, name, roblox_id, strikes, last_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (community_id, lname) DO UPDATE SET name = excluded.name, roblox_id = coalesce(excluded.roblox_id, roblox_id), strikes = excluded.strikes, last_at = excluded.last_at')
    .run(c.id, ln, who.name, who.id || null, strikes, now());
  const why = `${n} help calls in ${s.mins} min`;
  const cmd = action === 'warn' ? `:pm ${who.name} You've called for staff ${n} times in ${s.mins} minutes. Only call when you need help: next time you'll be kicked.`
    : action === 'kick' ? `:kick ${who.name} Spamming help calls (${why}). You can rejoin; next time is a ban.` : `:ban ${who.name}`;
  if (key) commandAs(c, key, cmd.slice(0, 200), NAME);
  staffRecords.add({ community_id: c.id, roblox_id: who.id || null, name: who.name, kind: action, reason: 'Help spam: ' + why, by_user: null, by_name: NAME, result: 'sent' });
  q('INSERT INTO help_log (community_id, name, roblox_id, action, calls, at) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, who.name, who.id || null, action, n, now());
  q('DELETE FROM help_log WHERE community_id = ? AND id NOT IN (SELECT id FROM help_log WHERE community_id = ? ORDER BY id DESC LIMIT ?)').run(c.id, c.id, KEEP);
  console.log(`helpspam: ${c.slug} ${action} ${who.name} (${why}, strike ${strikes})`); };

export const wantsLogs = c => !!c && of(c).on && ok(c);
let ok = () => false;
// servers with it on are read every 8 seconds, with the mod calls and command log, whether or not anyone has the CAD open
export const start = (feedFor, keyOf, allowed) => { ok = allowed; setInterval(async () => {
  for (const c of communities.all()) { if (c.suspended || !ok(c) || !of(c).on) continue; const key = keyOf(c.id); if (!key) continue;
    try { const f = feedFor(c), s = await f.snapshot(); if (s.status === 200) check(c, key, s.body, f.modCalls, f.cmdLogs); } catch (e) {} } }, 8000); };
