// Oversite's own Discord: everyone with Premium on their account gets a Supporter role there, and loses it when their
// Premium ends. Oversite's owner picks the server and the role on /admin. People who aren't in the Discord yet are tried
// again every hour, and straight away after they sign in with Discord.
import { db, siteSettings } from './db.mjs';
import * as dl from './discordlink.mjs';

try { db.exec('ALTER TABLE users ADD COLUMN supporter INTEGER NOT NULL DEFAULT 0'); } catch (e) {}       // 1 while they hold the role
try { db.exec('ALTER TABLE users ADD COLUMN supporter_try INTEGER NOT NULL DEFAULT 0'); } catch (e) {}   // last time giving it failed
const q = sql => db.prepare(sql);
const KEY = 'supporter_discord';

export const config = () => { try { return JSON.parse(siteSettings.get(KEY) || '{}') || {}; } catch (e) { return {}; } };
let lastError = '';
export const status = async guild => { const c = config(), g = guild || c.guild;
  return { ready: dl.ready(), install: dl.ready() ? dl.supporterInstallUrl() : '', guild: c.guild || '', guild_name: c.guild_name || '', role: c.role || '', role_name: c.role_name || '', invite: c.invite || '',
    guilds: dl.ready() ? await dl.botGuilds() : [], roles: dl.ready() && g ? (await dl.roles(g).catch(() => null)) || [] : [], error: lastError,
    holders: q('SELECT COUNT(*) AS n FROM users WHERE supporter = 1').get().n }; };
const INVITE = /^https:\/\/(discord\.gg|(www\.)?discord\.com\/invite)\/[A-Za-z0-9-]{2,40}$/;
export const configure = async j => { const guild = String(j.guild || ''), role = String(j.role || ''), invite = String(j.invite || '').trim();
  if (invite && !INVITE.test(invite)) return { error: 'The invite link should look like https://discord.gg/yourcode.' };
  if (!guild) { siteSettings.set(KEY, JSON.stringify({ invite })); return { ok: true }; }
  const g = (await dl.botGuilds()).find(x => x.id === guild); if (!g) return { error: 'The Oversite bot is not in that Discord server. Add it first.' };
  const r = ((await dl.roles(guild).catch(() => null)) || []).find(x => x.id === role); if (!r) return { error: 'Pick the role Premium people should get.' };
  const was = config(); if (was.guild !== guild || was.role !== role) q('UPDATE users SET supporter = 0, supporter_try = 0').run();   // a new role: everyone gets it fresh
  siteSettings.set(KEY, JSON.stringify({ guild, guild_name: g.name, role, role_name: r.name, invite })); lastError = ''; sweep(); return { ok: true }; };

// one pass: give the role to Premium people who don't have it, take it from people whose Premium ended (50 at a time)
let running = false;
export const sweep = async () => { const c = config(); if (running || !dl.ready() || !c.guild || !c.role) return; running = true; const now = Date.now();
  try { const rows = q(`SELECT id, discord_id, COALESCE(premium_until, 0) AS until FROM users WHERE discord_id IS NOT NULL AND discord_id != ''
      AND ((COALESCE(premium_until, 0) > ? AND supporter = 0 AND supporter_try < ?) OR (COALESCE(premium_until, 0) <= ? AND supporter = 1)) LIMIT 50`).all(now, now - 3600e3, now);
    for (const u of rows) { const want = u.until > now;
      try { const done = await dl.setRole(c.guild, u.discord_id, c.role, want);
        if (want) q(done ? 'UPDATE users SET supporter = 1, supporter_try = 0 WHERE id = ?' : 'UPDATE users SET supporter_try = ? WHERE id = ?').run(...(done ? [u.id] : [now, u.id]));
        else q('UPDATE users SET supporter = 0 WHERE id = ?').run(u.id); lastError = ''; }
      catch (e) { lastError = e.message; console.log(`supporter role: ${e.message}`); q('UPDATE users SET supporter_try = ? WHERE id = ?').run(now, u.id); if (/Manage Roles|429/.test(e.message)) break; } } }
  finally { running = false; } };
// they just signed in with Discord (maybe after joining the server): try them again now
export const retry = uid => { q('UPDATE users SET supporter_try = 0 WHERE id = ?').run(uid); sweep(); };
export const has = uid => !!q('SELECT supporter FROM users WHERE id = ?').get(uid)?.supporter;
export const start = () => { setTimeout(sweep, 20000); return setInterval(sweep, 3 * 60000); };
