// Sign-in (Discord, or an owner code until Discord is set up), sessions, and Roblox account linking.
import { users, sessions, roblox, token, communities, members, codes, codeOk, normCode, newCode } from './db.mjs';
import { createHash } from 'node:crypto';

export const cookies = req => Object.fromEntries((req.headers.cookie || '').split(/;\s*/).filter(Boolean).map(c => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
const secure = req => ((req.headers['x-forwarded-proto'] || '').startsWith('https') ? '; Secure' : '');
export const setCookie = (req, name, value, maxAge) => `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure(req)}`;
export const currentUser = req => sessions.user(cookies(req).ov_sess);
export const signIn = (req, userId) => setCookie(req, 'ov_sess', sessions.create(userId), 30 * 86400);
export const signOut = req => { sessions.drop(cookies(req).ov_sess); return setCookie(req, 'ov_sess', '', 0); };
export const safeNext = n => (typeof n === 'string' && /^\/(?!\/)[\w\-\/?=&.%]*$/.test(n) ? n : '/dashboard');

// ── Discord ──
const DID = process.env.DISCORD_CLIENT_ID || '', DSECRET = process.env.DISCORD_CLIENT_SECRET || '', DAPI = process.env.DISCORD_API || 'https://discord.com/api';
export const discordReady = () => !!(DID && DSECRET);
const base = req => (process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || 'http').split(',')[0]}://${req.headers.host}`).replace(/\/$/, '');
export const discordStart = (req, next) => { const state = token(16);
  const url = `https://discord.com/oauth2/authorize?${new URLSearchParams({ client_id: DID, redirect_uri: base(req) + '/auth/discord/callback', response_type: 'code', scope: 'identify connections', state, prompt: 'none' })}`;
  return { url, cookie: setCookie(req, 'ov_oauth', `${state}|${safeNext(next)}`, 600) }; };
export const discordFinish = async (req, params) => {
  const [state, next] = (cookies(req).ov_oauth || '').split('|');
  if (!state || state !== params.get('state')) throw new Error('The sign-in link expired. Please try again.');
  if (params.get('error')) throw new Error('Discord sign-in was cancelled.');
  const tok = await fetch(DAPI + '/oauth2/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: DID, client_secret: DSECRET, grant_type: 'authorization_code', code: params.get('code') || '', redirect_uri: base(req) + '/auth/discord/callback' }) }).then(r => r.json());
  if (!tok.access_token) throw new Error('Discord did not accept the sign-in. Please try again.');
  const me = await fetch(DAPI + '/users/@me', { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
  if (!me.id) throw new Error('Could not read your Discord account.');
  const name = me.global_name || me.username, avatar = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64` : null;
  let u = users.byDiscord(me.id); const current = currentUser(req);
  if (!u && current && !current.discord_id) { users.update(current.id, { discord_id: me.id, name, avatar }); u = users.byId(current.id); }   // an owner signed in with the code links their Discord
  else if (!u) u = users.byId(users.create({ discord_id: me.id, name, avatar }));
  else users.update(u.id, { name, avatar });
  // the Roblox account they verified on Discord (Settings, Connections) becomes their Roblox link: no phrase needed
  try { const conns = await fetch(DAPI + '/users/@me/connections', { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json());
    const rb = Array.isArray(conns) && conns.find(c => c.type === 'roblox' && c.verified !== false);
    if (rb && rb.id) { const rid = String(rb.id), existing = users.byRoblox(rid);
      if (existing && existing.id !== u.id) { if (!existing.discord_id || existing.discord_id === me.id) { users.merge(u.id, existing.id); users.update(existing.id, { discord_id: me.id, name, avatar, roblox_name: rb.name, roblox_via: 'discord' }); u = users.byId(existing.id); } }   // same person, another device
      else { users.update(u.id, { roblox_id: rid, roblox_name: rb.name, roblox_via: 'discord' }); roblox.clear(u.id); u = users.byId(u.id); } } } catch (e) {}
  return { user: u, next: safeNext(next) }; };

// ── owner sign-in: available until Discord is configured (or when OWNER_LOGIN=1), protected by the owner code ──
const OWNER_CODE = (process.env.OWNER_CODE || process.env.ACCESS_CODE || '').trim();
export const ownerLoginOn = () => !!OWNER_CODE && process.env.OWNER_LOGIN === '1';   // site-wide owner sign-in: off unless asked for; server codes replace it
const tries = new Map();
export const ownerLogin = (req, code) => { const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(), a = tries.get(ip) || { n: 0, until: 0 };
  if (Date.now() < a.until) return { error: 'Too many tries. Wait a minute.' };
  if (!ownerLoginOn() || code !== OWNER_CODE) { a.n++; if (a.n >= 5) { a.n = 0; a.until = Date.now() + 60000; } tries.set(ip, a); return { error: 'That code is not right.' }; }
  tries.delete(ip); let u = users.localOwner(); if (!u) u = users.byId(users.create({ name: 'Owner', is_local_owner: 1 })); return { user: u }; };

// ── Roblox sign-in (OAuth, "Log in with Roblox"): Roblox itself confirms which account is theirs, so the link is always right.
// The app lives under the Oversite Customs group on Roblox (Creator Dashboard, Credentials, OAuth 2.0 Apps); redirect: <site>/auth/roblox/callback
const RID = process.env.ROBLOX_CLIENT_ID || '', RSECRET = process.env.ROBLOX_CLIENT_SECRET || '', RAPI = process.env.ROBLOX_OAUTH || 'https://apis.roblox.com/oauth';
export const robloxOAuthReady = () => !!(RID && RSECRET);
export const robloxOAuthStart = (req, next) => { const state = token(16), verifier = token(32), challenge = createHash('sha256').update(verifier).digest('base64url');
  const url = `${RAPI}/v1/authorize?${new URLSearchParams({ client_id: RID, redirect_uri: base(req) + '/auth/roblox/callback', response_type: 'code', scope: 'openid profile', state, code_challenge: challenge, code_challenge_method: 'S256' })}`;
  return { url, cookie: setCookie(req, 'ov_rbx', `${state}|${verifier}|${safeNext(next)}`, 600) }; };
export const robloxOAuthFinish = async (req, params) => {
  const [state, verifier, next] = (cookies(req).ov_rbx || '').split('|');
  if (!state || state !== params.get('state')) throw new Error('The Roblox link expired. Please try again.');
  if (params.get('error')) throw new Error('Linking with Roblox was cancelled.');
  const tok = await fetch(RAPI + '/v1/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: RID, client_secret: RSECRET, grant_type: 'authorization_code', code: params.get('code') || '', code_verifier: verifier || '', redirect_uri: base(req) + '/auth/roblox/callback' }) }).then(r => r.json()).catch(() => ({}));
  if (!tok.access_token) throw new Error('Roblox did not accept the link. Please try again.');
  const me = await fetch(RAPI + '/v1/userinfo', { headers: { authorization: `Bearer ${tok.access_token}` } }).then(r => r.json()).catch(() => ({}));
  if (!me.sub) throw new Error('Could not read your Roblox account.');
  const rid = String(me.sub), rname = me.preferred_username || me.nickname || me.name || 'Roblox user', avatar = me.picture || null;
  const current = currentUser(req), existing = users.byRoblox(rid); let u;
  if (current && existing && existing.id !== current.id) {                     // this Roblox account already has an Oversite account (another device): fold this one into it
    if (current.discord_id && existing.discord_id && current.discord_id !== existing.discord_id) throw new Error('That Roblox account is already linked to a different Oversite account.');
    const discord = current.discord_id && !existing.discord_id ? current.discord_id : null;
    users.merge(current.id, existing.id); if (discord) users.update(existing.id, { discord_id: discord }); u = users.byId(existing.id);
  } else if (current) u = current;
  else if (existing) u = existing;                                             // signing in with Roblox to an account that is already linked
  else throw new Error('No Oversite account uses that Roblox account yet. Join your server with its code first, then link Roblox from your dashboard.');
  users.update(u.id, { roblox_id: rid, roblox_name: rname, roblox_via: 'oauth', ...(['Owner', 'Member'].includes(u.name) ? { name: rname } : {}), ...(!u.avatar && avatar ? { avatar } : {}) });
  roblox.clear(u.id);
  return { user: users.byId(u.id), next: safeNext(next) }; };

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
  const name = r.name || p.roblox_name; roblox.clear(user.id);
  const existing = users.byRoblox(p.roblox_id);                         // the same person already has an account (another device): fold this one into it
  if (existing && existing.id !== user.id) { users.merge(user.id, existing.id); return { ok: true, name, mergedInto: existing.id }; }
  users.update(user.id, { roblox_id: p.roblox_id, roblox_name: name, roblox_via: 'profile', ...(['Owner', 'Member'].includes(user.name) ? { name } : {}) }); return { ok: true, name }; };
export const robloxUnlink = user => users.update(user.id, { roblox_id: null, roblox_name: null });

// ── server codes: create a server with your own owner code, or sign in to one with the code its owner gave you ──
const ipOf = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const limits = new Map();
const limited = (req, kind, max, windowMs) => { const k = kind + ipOf(req), now = Date.now(), a = (limits.get(k) || []).filter(t => now - t < windowMs); if (a.length >= max) return true; a.push(now); limits.set(k, a); return false; };
export const codeSignIn = (req, user, code) => {
  if (limited(req, 'code', 8, 60000)) return { error: 'Too many tries. Wait a minute and try again.' };
  const hit = codes.find(code); if (!hit) return { error: 'No server uses that code. Check it with your server owner.' };
  const c = communities.byId(hit.community_id); if (!c) return { error: 'That server no longer exists.' };
  let u = user; if (!u) u = users.byId(users.create({ name: hit.role === 'owner' ? 'Owner' : 'Member' }));
  members.raise(c.id, u.id, hit.role); return { user: u, community: c, role: hit.role, fresh: !user }; };
export const createServer = (req, user, { name, slug, ownerCode }, RESERVED) => {
  name = String(name || '').trim(); slug = String(slug || '').trim().toLowerCase();
  if (name.length < 2 || name.length > 48) return { error: 'The server name must be 2 to 48 characters.' };
  if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(slug) || slug.includes('--')) return { error: 'The address must be 3 to 32 lowercase letters, numbers or single dashes.' };
  if (RESERVED.has(slug) || communities.bySlug(slug)) return { error: 'That address is taken. Try another.' };
  if (!codeOk(ownerCode)) return { error: 'The owner code must be 2 to 24 letters or numbers.' };
  if (codes.find(ownerCode)) return { error: 'That owner code is already used by another server. Pick a different one.' };
  if (user && communities.forUser(user.id).filter(c => c.role === 'owner').length >= 10) return { error: 'You can own up to 10 servers.' };
  if (limited(req, 'create', 5, 3600000)) return { error: 'Too many servers created from here. Try again later.' };
  let u = user; if (!u) u = users.byId(users.create({ name: 'Owner' }));
  const id = communities.create(u.id, slug, name); codes.set(id, 'owner', String(ownerCode).trim().toUpperCase());
  let mc = newCode(); while (codes.find(mc)) mc = newCode(); codes.set(id, 'member', mc);
  return { user: u, id, slug, memberCode: mc }; };
export const setCode = (cid, role, code) => { if (!codeOk(code)) return { error: 'Codes must be 2 to 24 letters or numbers.' };
  if (normCode(code) === normCode(codes.show(cid, role === 'owner' ? 'member' : 'owner'))) return { error: 'The owner code and the member code must be different.' };
  if (codes.taken(code, cid, role)) return { error: 'Another server already uses that code. Pick a different one.' };
  codes.set(cid, role, String(code).trim().toUpperCase()); return { code: codes.show(cid, role) }; };
export const newMemberCode = cid => { let mc = newCode(); while (codes.find(mc)) mc = newCode(); codes.set(cid, 'member', mc); return { code: mc }; };
