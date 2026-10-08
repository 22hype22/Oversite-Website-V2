// Sign-in (Discord, or an owner code until Discord is set up), sessions, and Roblox account linking.
import { users, sessions, roblox, token } from './db.mjs';

export const cookies = req => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
const secure = req => ((req.headers['x-forwarded-proto'] || '').startsWith('https') ? '; Secure' : '');
export const setCookie = (req, name, value, maxAge) => `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure(req)}`;
export const currentUser = req => sessions.user(cookies(req).ov_sess);
export const signIn = (req, userId) => setCookie(req, 'ov_sess', sessions.create(userId), 30 * 86400);
export const signOut = req => { sessions.drop(cookies(req).ov_sess); return setCookie(req, 'ov_sess', '', 0); };
export const safeNext = n => (typeof n === 'string' && /^\/(?!\/)[\w\-\/?=&.%]*$/.test(n) ? n : '/dashboard');

// ── Discord ──
const DID = process.env.DISCORD_CLIENT_ID || '', DSECRET = process.env.DISCORD_CLIENT_SECRET || '';
export const discordReady = () => !!(DID && DSECRET);
const base = req => (process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || 'http').split(',')[0]}://${req.headers.host}`).replace(/\/$/, '');
export const discordStart = (req, next) => { const state = token(16);
  const url = `https://discord.com/oauth2/authorize?${new URLSearchParams({ client_id: DID, redirect_uri: base(req) + '/auth/discord/callback', response_type: 'code', scope: 'identify', state, prompt: 'none' })}`;
  return { url, cookie: setCookie(req, 'ov_oauth', `${state}|${safeNext(next)}`, 600) }; };
export const discordFinish = async (req, params) => {
  const [state, next] = (cookies(req).ov_oauth || '').split('|');
  if (!state || state !== params.get('state')) throw new Error('The sign-in link expired. Please try again.');
  if (params.get('error')) throw new Error('Discord sign-in was cancelled.');
  const tok = await fetch('https://discord.com/api/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: DID, client_secret: DSECRET, grant_type: 'authorization_code', code: params.get('code') || '', redirect_uri: base(req) + '/auth/discord/callback' }) }).then(r => r.json());
  if (!tok.access_token) throw new Error('Discord did not accept the sign-in. Please try again.');
  const me = await fetch('https://discord.com/api/users/@me', { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
  if (!me.id) throw new Error('Could not read your Discord account.');
  const name = me.global_name || me.username, avatar = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64` : null;
  let u = users.byDiscord(me.id); const current = currentUser(req);
  if (!u && current && !current.discord_id) { users.update(current.id, { discord_id: me.id, name, avatar }); u = users.byId(current.id); }   // an owner signed in with the code links their Discord
  else if (!u) u = users.byId(users.create({ discord_id: me.id, name, avatar }));
  else users.update(u.id, { name, avatar });
  return { user: u, next: safeNext(next) }; };

// ── owner sign-in: available until Discord is configured (or when OWNER_LOGIN=1), protected by the owner code ──
const OWNER_CODE = (process.env.OWNER_CODE || process.env.ACCESS_CODE || '').trim();
export const ownerLoginOn = () => !!OWNER_CODE && (!discordReady() || process.env.OWNER_LOGIN === '1');
const tries = new Map();
export const ownerLogin = (req, code) => { const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), a = tries.get(ip) || { n: 0, until: 0 };
  if (Date.now() < a.until) return { error: 'Too many tries. Wait a minute.' };
  if (!ownerLoginOn() || code !== OWNER_CODE) { a.n++; if (a.n >= 5) { a.n = 0; a.until = Date.now() + 60000; } tries.set(ip, a); return { error: 'That code is not right.' }; }
  tries.delete(ip); let u = users.localOwner(); if (!u) u = users.byId(users.create({ name: 'Owner', is_local_owner: 1 })); return { user: u }; };

// ── Roblox linking: the user puts a short phrase in their Roblox profile "About"; Roblox's public API confirms it ──
const WORDS = 'amber anchor apple arrow aspen badge banner beacon birch bison blaze bolt brook cactus canyon cedar cobalt comet coral crane delta ember falcon fern fjord flint forest frost garnet glacier harbor hawk hazel heron indigo iris jade juniper kestrel lantern lemon lotus maple marble meadow mesa mint nova oak ocean olive onyx orbit otter pebble pine plume quartz raven reef ridge river robin rocket sable sage sierra slate spruce summit sunset thunder tiger topaz tulip valley violet willow'.split(' ');
const phrase = () => Array.from({ length: 4 }, () => WORDS[Math.floor(Math.random() * WORDS.length)]).join(' ');
export const robloxStart = async (user, username) => {
  username = String(username || '').trim().replace(/^@/, ''); if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return { error: 'That is not a valid Roblox username.' };
  let r; try { r = await fetch('https://users.roblox.com/v1/usernames/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ usernames: [username], excludeBannedUsers: true }) }).then(x => x.json()); }
  catch (e) { return { error: 'Roblox did not answer. Try again in a moment.' }; }
  const hit = r?.data?.[0]; if (!hit) return { error: `No Roblox account is called "${username}".` };
  const p = phrase(); roblox.start(user.id, String(hit.id), hit.name, p); return { id: String(hit.id), name: hit.name, phrase: p }; };
export const robloxVerify = async user => { const p = roblox.pending(user.id); if (!p || p.expires < Date.now()) return { error: 'The code expired. Start again.' };
  let r; try { r = await fetch(`https://users.roblox.com/v1/users/${p.roblox_id}`).then(x => x.json()); } catch (e) { return { error: 'Roblox did not answer. Try again in a moment.' }; }
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z]+/g, ' ').trim();
  if (!norm(r.description).includes(norm(p.phrase))) return { error: 'The phrase is not on your profile yet. Roblox can take a minute to save it, then try again.' };
  users.update(user.id, { roblox_id: p.roblox_id, roblox_name: r.name || p.roblox_name }); roblox.clear(user.id); return { ok: true, name: r.name || p.roblox_name }; };
export const robloxUnlink = user => users.update(user.id, { roblox_id: null, roblox_name: null });
