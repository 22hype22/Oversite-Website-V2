// A community's Discord server: the owner adds the Oversite bot to it and picks which roles are staff. Anyone signed in with
// Discord who holds one of those roles gets the Server Staff tools, checked live (cached for a minute), so taking the role
// away in Discord takes the access away too. Sections of the CAD can also be locked to roles (locksFor, below). Everything else in the
// CAD follows the player's in-game team.
import { communities, members } from './db.mjs';

const DID = process.env.DISCORD_CLIENT_ID || '', DSECRET = process.env.DISCORD_CLIENT_SECRET || '', BOT = process.env.DISCORD_BOT_TOKEN || '';
const DAPI = process.env.DISCORD_API || 'https://discord.com/api', DWEB = process.env.DISCORD_WEB || 'https://discord.com';
export const ready = () => !!(DID && DSECRET && BOT);
export const LEVELS = ['admin', 'mod'];                            // Discord roles decide staff rank (and section locks); departments come from the in-game team
const RANK = { member: 1, mod: 2, admin: 3, co_owner: 4, owner: 5 };
export const higher = (a, b) => ((RANK[a] || 0) >= (RANK[b] || 0) ? a : b) || null;

const bot = async path => { const r = await fetch(DAPI + path, { headers: { authorization: 'Bot ' + BOT } }); if (r.status === 404 || r.status === 403) return null;
  if (!r.ok) throw new Error(`Discord answered ${r.status}`); return r.json(); };

// Oversite's own Discord (the Supporter role for Premium people): the bot needs Manage Roles there
export const supporterInstallUrl = () => `${DWEB}/oauth2/authorize?${new URLSearchParams({ client_id: DID, scope: 'bot', permissions: '268435456' })}`;
export const botGuilds = async () => { try { return ((await bot('/users/@me/guilds')) || []).map(g => ({ id: g.id, name: g.name })); } catch (e) { return []; } };
// give or take one role: true when done, false when the person isn't in that Discord server; throws when Discord refuses
export const setRole = async (gid, uid, rid, on) => { const r = await fetch(`${DAPI}/guilds/${gid}/members/${uid}/roles/${rid}`, { method: on ? 'PUT' : 'DELETE', headers: { authorization: 'Bot ' + BOT, 'x-audit-log-reason': on ? 'Oversite Premium' : 'Oversite Premium ended' } });
  if (r.ok) return true; const j = await r.json().catch(() => ({}));
  if (r.status === 404 && [10007, 10013].includes(j.code)) return false;   // Unknown Member / User: not in the server (yet)
  throw new Error(r.status === 403 ? 'the bot is missing Manage Roles, or its role is below the Supporter role' : `Discord answered ${r.status}${j.message ? ': ' + j.message : ''}`); };

// adding the bot: Discord's own consent screen picks the server; the code exchange tells us which one, so it cannot be faked
const base = req => (process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || 'http').split(',')[0]}://${req.headers.host}`).replace(/\/$/, '');
export const installUrl = (req, state) => `${DWEB}/oauth2/authorize?${new URLSearchParams({ client_id: DID, scope: 'bot applications.commands', permissions: '0', response_type: 'code', redirect_uri: base(req) + '/auth/discord/guild', state })}`;
export const finishInstall = async (req, code) => {
  const tok = await fetch(DAPI + '/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: DID, client_secret: DSECRET, grant_type: 'authorization_code', code: code || '', redirect_uri: base(req) + '/auth/discord/guild' }) }).then(r => r.json()).catch(() => ({}));
  const g = tok.guild; if (!g || !g.id) throw new Error('Discord did not say which server the bot was added to. Please try again.');
  return { guild_id: String(g.id), guild_name: String(g.name || 'Discord server'), icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null }; };

// the server's roles for the picker: highest first, without @everyone and roles that belong to bots
// how many people are in a server's Discord (for the server browser), or null
export const counts = async gid => { if (!ready() || !gid) return null; try { const g = await bot(`/guilds/${gid}?with_counts=true`); return g ? { members: g.approximate_member_count ?? null, online: g.approximate_presence_count ?? null } : null; } catch (e) { return null; } };
// a Discord server's roles, kept for a minute; when Discord doesn't answer (a rate limit, an outage) the last list it gave is used
const ROLES = new Map();
export const roles = async gid => { const hit = ROLES.get(gid); if (hit && Date.now() - hit.at < 60000) return hit.list;
  let list; try { list = await bot(`/guilds/${gid}/roles`); } catch (e) { if (hit) return hit.list; throw e; } if (!list) { ROLES.delete(gid); return null; }
  const out = list.filter(r => r.id !== gid && !r.managed).sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name, color: r.color ? '#' + r.color.toString(16).padStart(6, '0') : null }));
  ROLES.set(gid, { list: out, at: Date.now() }); return out; };

const cache = new Map(), TTL = 60000;
const memberRoles = async (gid, uid) => { const k = gid + ':' + uid, hit = cache.get(k); if (hit && Date.now() - hit.at < TTL) return hit.roles;
  let roles = null; try { const m = await bot(`/guilds/${gid}/members/${uid}`); roles = m ? m.roles || [] : null; } catch (e) { return hit ? hit.roles : undefined; }   // undefined: Discord didn't answer
  cache.set(k, { roles, at: Date.now() }); return roles; };
export const forget = gid => { for (const k of cache.keys()) if (k.startsWith(gid + ':')) cache.delete(k); };
// whether a Discord account is in a Discord server: true, false, or undefined when Discord didn't answer (then nobody is acted on)
export const inGuild = async (gid, discordId) => { if (!ready() || !gid || !discordId) return undefined; const r = await memberRoles(gid, discordId); return r === undefined ? undefined : !!r; };

// the access a Discord account's roles give in this community, or null
export const levelFor = async (c, discordId) => { const d = c.settings && c.settings.discord; if (!ready() || !d || !d.guild_id || !discordId) return null;
  const mine = await memberRoles(d.guild_id, discordId); if (!mine) return null; return levelOf(d, mine); };
const levelOf = (d, mine) => { let best = null;
  const picks = { ...(d.roles || {}) }; if (picks.staff && !picks.admin) picks.admin = picks.staff;   // older links picked one 'staff' list: those are admins now
  for (const lvl of LEVELS) if ((picks[lvl] || []).some(id => mine.includes(id))) best = higher(best, lvl);
  return best; };

// section locks: the owner can lock Dispatch, each department's MDT and the Civilian tab to Discord roles, so only people holding one
// of a section's roles open it (settings.discord.locks = { pd: [{ id, name }], … }; no roles means open to everyone). Admins and up
// open everything. Someone without Discord on their account can't open a locked section; when Discord doesn't answer, nothing is locked.
export const SECTIONS = ['dispatch', 'pd', 'fd', 'dot', 'civ', 'transit', 'hospital'];
// and each department the server added (app/divisions.mjs), by its id: a Sheriff's Office can want a different role from the police
export const sectionsFor = c => [...SECTIONS, ...(Array.isArray(c?.settings?.divs) ? c.settings.divs.map(d => d.id) : [])];
export const locksFor = async (c, user, role) => { const d = c.settings && c.settings.discord, L0 = d && d.locks; if (!L0 || !d.guild_id || !ready() || (RANK[role] || 0) >= RANK.admin) return {};
  if (!sectionsFor(c).some(k => Array.isArray(L0[k]) && L0[k].length)) return {};
  const mine = user?.discord_id ? await memberRoles(d.guild_id, user.discord_id) : null; if (mine === undefined) return {};
  return locksOf(c, mine || []); };
// the sections someone holding these Discord roles can't open, with the roles each needs
const locksOf = (c, mine) => { const L0 = c.settings.discord?.locks || {};
  // an added department without roles of its own follows the built-in one it works like
  const L = { ...L0 }; for (const v of Array.isArray(c.settings.divs) ? c.settings.divs : []) if (!(Array.isArray(L[v.id]) && L[v.id].length) && Array.isArray(L0[v.kind]) && L0[v.kind].length) L[v.id] = L0[v.kind];
  const out = {}; for (const k of sectionsFor(c).filter(k => Array.isArray(L[k]) && L[k].length)) if (!L[k].some(r => mine.includes(r.id))) out[k] = L[k].map(r => r.name); return out; };
// View as a role (an admin previewing the CAD): the rank and locks someone holding just these Discord roles gets
export const previewAs = (c, roleIds) => { const d = c.settings.discord || {}, role = levelOf(d, roleIds) || 'member'; return { role, locks: RANK[role] >= RANK.admin ? {} : locksOf(c, roleIds) }; };

// after a Discord sign-in: join every community whose Discord server makes this person staff
export const autoJoin = async user => { if (!ready() || !user?.discord_id) return 0; let n = 0;
  for (const c of communities.withDiscord()) { if (members.role(c.id, user.id)) continue; if (await levelFor(c, user.discord_id)) { members.add(c.id, user.id, 'member'); n++; } }
  return n; };
