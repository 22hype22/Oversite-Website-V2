// A community's Discord server: the owner adds the Oversite bot to it and picks which roles mean member, staff and admin in the
// CAD. Anyone signed in with Discord then gets the highest access their roles give, checked live (cached for a minute), so
// taking a role away in Discord takes the access away too.
import { communities, members } from './db.mjs';

const DID = process.env.DISCORD_CLIENT_ID || '', DSECRET = process.env.DISCORD_CLIENT_SECRET || '', BOT = process.env.DISCORD_BOT_TOKEN || '';
const DAPI = process.env.DISCORD_API || 'https://discord.com/api', DWEB = process.env.DISCORD_WEB || 'https://discord.com';
export const ready = () => !!(DID && DSECRET && BOT);
export const LEVELS = ['member', 'staff', 'admin'];
const RANK = { member: 1, staff: 2, admin: 3, owner: 4 };
export const higher = (a, b) => ((RANK[a] || 0) >= (RANK[b] || 0) ? a : b) || null;

const bot = async path => { const r = await fetch(DAPI + path, { headers: { authorization: 'Bot ' + BOT } }); if (r.status === 404 || r.status === 403) return null;
  if (!r.ok) throw new Error(`Discord answered ${r.status}`); return r.json(); };

// adding the bot: Discord's own consent screen picks the server; the code exchange tells us which one, so it cannot be faked
const base = req => (process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || 'http').split(',')[0]}://${req.headers.host}`).replace(/\/$/, '');
export const installUrl = (req, state) => `${DWEB}/oauth2/authorize?${new URLSearchParams({ client_id: DID, scope: 'bot', permissions: '0', response_type: 'code', redirect_uri: base(req) + '/auth/discord/guild', state })}`;
export const finishInstall = async (req, code) => {
  const tok = await fetch(DAPI + '/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: DID, client_secret: DSECRET, grant_type: 'authorization_code', code: code || '', redirect_uri: base(req) + '/auth/discord/guild' }) }).then(r => r.json()).catch(() => ({}));
  const g = tok.guild; if (!g || !g.id) throw new Error('Discord did not say which server the bot was added to. Please try again.');
  return { guild_id: String(g.id), guild_name: String(g.name || 'Discord server'), icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null }; };

// the server's roles for the picker: highest first, without @everyone and roles that belong to bots
export const roles = async gid => { const list = await bot(`/guilds/${gid}/roles`); if (!list) return null;
  return list.filter(r => r.id !== gid && !r.managed).sort((a, b) => b.position - a.position).map(r => ({ id: r.id, name: r.name, color: r.color ? '#' + r.color.toString(16).padStart(6, '0') : null })); };

const cache = new Map(), TTL = 60000;
const memberRoles = async (gid, uid) => { const k = gid + ':' + uid, hit = cache.get(k); if (hit && Date.now() - hit.at < TTL) return hit.roles;
  let roles = null; try { const m = await bot(`/guilds/${gid}/members/${uid}`); roles = m ? m.roles || [] : null; } catch (e) { return hit ? hit.roles : null; }
  cache.set(k, { roles, at: Date.now() }); return roles; };
export const forget = gid => { for (const k of cache.keys()) if (k.startsWith(gid + ':')) cache.delete(k); };

// the access a Discord account's roles give in this community, or null
export const levelFor = async (c, discordId) => { const d = c.settings && c.settings.discord; if (!ready() || !d || !d.guild_id || !discordId) return null;
  const mine = await memberRoles(d.guild_id, discordId); if (!mine) return null; let best = null;
  for (const lvl of LEVELS) if ((d.roles?.[lvl] || []).some(id => mine.includes(id))) best = higher(best, lvl);
  return best; };

// after a Discord sign-in: join every community whose Discord server gives this person a role there
export const autoJoin = async user => { if (!ready() || !user?.discord_id) return 0; let n = 0;
  for (const c of communities.withDiscord()) { if (members.role(c.id, user.id)) continue; if (await levelFor(c, user.discord_id)) { members.add(c.id, user.id, 'member'); n++; } }
  return n; };
