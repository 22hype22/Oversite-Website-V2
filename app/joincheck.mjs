// Join check (anti-random): players in the ER:LC server who haven't joined the community properly get a :pm saying what's missing
// and, after a grace period, a kick. What counts, picked by the server: being in its Discord (their Oversite account has Roblox
// and Discord linked, and that Discord account is in the server's Discord) and having a character in the Civilian tab. Staff in
// game (anyone with a permission) and the names or Roblox IDs on the server's exempt list are never acted on, and when Discord
// doesn't answer nobody is. Every warning and kick is kept on the player's staff record and listed in the Server Staff MDT.
// Settings: c.settings.joincheck = { on, discord, character, action: 'warn' | 'kick', grace (minutes), exempt: [name or id] }
import { db, now, communities, users, staffRecords } from './db.mjs';
import { commandAs } from './staff.mjs';
import * as chars from './chars.mjs';
import { inGuild } from './discordlink.mjs';

db.exec(`CREATE TABLE IF NOT EXISTS join_checks (id INTEGER PRIMARY KEY, community_id INTEGER NOT NULL REFERENCES communities(id) ON DELETE CASCADE, name TEXT NOT NULL,
  roblox_id TEXT, action TEXT NOT NULL, missing TEXT NOT NULL, at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS join_checks_c ON join_checks (community_id, id);`);
const q = sql => db.prepare(sql);
const NAME = 'Oversite join check', KEEP = 300, GRACES = [0, 1, 2, 3, 5, 10];
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

const norm = (s = {}) => ({ on: !!s.on, discord: s.discord !== false, character: !!s.character, action: s.action === 'warn' ? 'warn' : 'kick',
  grace: GRACES.includes(+s.grace) ? +s.grace : 3, exempt: [...new Set((Array.isArray(s.exempt) ? s.exempt : String(s.exempt || '').split(/[,\n]/)).map(x => T(x, 40)).filter(Boolean))].slice(0, 100) });
export const of = c => norm((communities.byId(c.id) || c).settings.joincheck);
export const save = (c, j) => { const s = norm(j); if (s.on && !s.discord && !s.character) return { error: 'Pick at least one thing players need.' };
  if (s.on && s.discord && !c.settings.discord?.guild_id) return { error: 'Link your Discord server in Settings first, so Oversite can see who is in it.' };
  const st = communities.byId(c.id).settings; st.joincheck = s; communities.saveSettings(c.id, st); c.settings.joincheck = s; STATE.delete(c.id); return { ok: true, settings: s }; };
export const log = c => q('SELECT * FROM join_checks WHERE community_id = ? ORDER BY id DESC LIMIT 60').all(c.id).map(r => ({ id: r.id, name: r.name, roblox_id: r.roblox_id || '', action: r.action, missing: JSON.parse(r.missing), at: r.at }));

const split = v => { const [name, id] = String(v || '').split(':'); return { name: name || '', id: /^\d+$/.test(id || '') ? id : '' }; };
// what one player is missing: [] when they're fine, null when it can't be told right now (Discord didn't answer)
const missingFor = async (c, s, p) => { const u = p.id ? users.byRoblox(p.id) : null, out = [];
  if (s.discord) { if (!u) out.push('account'); else if (!u.discord_id) out.push('discord_link');
    else { const inside = await inGuild(c.settings.discord?.guild_id, u.discord_id); if (inside === undefined) return null; if (!inside) out.push('discord'); } }
  if (s.character && !(u && chars.list(c.id, u.id).some(ch => chars.nameOf(ch)))) out.push(u ? 'character' : 'account');
  return [...new Set(out)]; };
const SAY = { account: 'sign in on Oversite with Roblox', discord_link: 'link Discord to your Oversite account', discord: 'join our Discord', character: 'make a character in the CAD’s Civilian tab' };
export const LABEL = { account: 'No Oversite account', discord_link: 'Discord not linked', discord: 'Not in the Discord', character: 'No character' };

// per server: who has been warned (name → { at, missing }), and who passed recently (checked again every 5 minutes)
const STATE = new Map(); const state = cid => { let st = STATE.get(cid); if (!st) STATE.set(cid, st = { warned: new Map(), ok: new Map() }); return st; };
let site = () => '';
export const check = async (c, key, body) => { const s = of(c); if (!s.on) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const st = state(c.id), t = Date.now(), ex = new Set(s.exempt.map(x => x.toLowerCase())), here = new Set();
  for (const pl of j.Players || []) { const p = split(pl.Player); if (!p.name) continue; const ln = p.name.toLowerCase(); here.add(ln);
    if ((pl.Permission && pl.Permission !== 'Normal') || ex.has(ln) || (p.id && ex.has(p.id))) continue;
    if (t - (st.ok.get(ln) || 0) < 300000) continue;
    const miss = await missingFor(c, s, p); if (miss === null) continue;
    if (!miss.length) { st.ok.set(ln, t); if (st.warned.delete(ln)) record(c, p, 'passed', []); continue; }
    const w = st.warned.get(ln);
    if (!w) { st.warned.set(ln, { at: t, missing: miss });
      const how = miss.map(m => SAY[m]).join(', then '), when = s.action === 'warn' ? '' : s.grace ? ` within ${s.grace} minute${s.grace === 1 ? '' : 's'} or you'll be kicked` : '';
      if (s.action === 'kick' && !s.grace) { kick(c, key, p, miss); continue; }
      commandAs(c, key, `:pm ${p.name} To play here, ${how}${when}. Go to ${site()}/${c.slug}`.slice(0, 200), NAME); record(c, p, 'warned', miss); continue; }
    if (s.action === 'kick' && t - w.at >= s.grace * 60000 && !w.kicked) { w.kicked = true; kick(c, key, p, miss); } }
  // someone who left starts over if they come back (a kick sends them out; they get a fresh warning next time)
  for (const k of [...st.warned.keys()]) if (!here.has(k)) st.warned.delete(k);
  for (const [k, at] of st.ok) if (!here.has(k) && t - at > 300000) st.ok.delete(k); };
const kick = (c, key, p, miss) => { commandAs(c, key, `:kick ${p.name} ${miss.map(m => LABEL[m]).join(', ')}. See ${site()}/${c.slug} to join properly.`.slice(0, 200), NAME); record(c, p, 'kicked', miss); };
const record = (c, p, action, miss) => { q('INSERT INTO join_checks (community_id, name, roblox_id, action, missing, at) VALUES (?, ?, ?, ?, ?, ?)').run(c.id, p.name, p.id || null, action, JSON.stringify(miss), now());
  q('DELETE FROM join_checks WHERE community_id = ? AND id NOT IN (SELECT id FROM join_checks WHERE community_id = ? ORDER BY id DESC LIMIT ?)').run(c.id, c.id, KEEP);
  if (action !== 'passed') staffRecords.add({ community_id: c.id, roblox_id: p.id || null, name: p.name, kind: action === 'kicked' ? 'kick' : 'warn', reason: 'Join check: ' + miss.map(m => LABEL[m]).join(', '), by_user: null, by_name: NAME, result: 'sent' });
  console.log(`joincheck: ${c.slug} ${action} ${p.name}${miss.length ? ' (' + miss.join(', ') + ')' : ''}`); };

let ok = () => false;
// servers with it on are checked every 15 seconds from the live feed, whether or not anyone has the CAD open
export const start = (feedFor, keyOf, allowed, siteUrl) => { ok = allowed; site = siteUrl; let busy = false; setInterval(async () => { if (busy) return; busy = true;
  try { for (const c of communities.all()) { if (c.suspended || !ok(c) || !of(c).on) continue; const key = keyOf(c.id); if (!key) continue;
    try { const s = await feedFor(c).snapshot(); if (s.status === 200) await check(c, key, s.body); } catch (e) { console.log('joincheck:', c.slug, e.message); } } }
  finally { busy = false; } }, 15000); };
