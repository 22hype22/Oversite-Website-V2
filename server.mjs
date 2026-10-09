#!/usr/bin/env node
// Oversite: a multi-community CAD for ER:LC. Each community connects its own server and gets its own live map and MDTs at /c/<slug>.
// Railway runs `npm start`. Data lives in SQLite on the /data volume (see app/db.mjs).
import http from 'node:http';
import { createReadStream, statSync, existsSync, readFileSync, renameSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { users, communities, members, invites, roblox, codes, RESERVED } from './app/db.mjs';
import { Feed, testKey, NOKEY } from './app/feed.mjs';
import * as auth from './app/auth.mjs';
import * as staff from './app/staff.mjs';
import * as pages from './app/pages.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'preview');
const PORT = +(process.env.PORT || 8080);
const CODE = (process.env.ACCESS_CODE || '').trim();          // private preview lock: digits visitors must enter; empty = site is open
const CANON = (process.env.CANONICAL_HOST || 'www.oversitescad.com').toLowerCase();
const LOGO = readFileSync(join(ROOT, 'logo.png')).toString('base64');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const DATA = existsSync('/data') ? '/data' : join(ROOT, '..');
const LEGACY_KEY = join(DATA, existsSync('/data') ? 'erlc.key' : '.erlc.key');   // the single-server key from before communities: given to the first community created

// ── small helpers ──
const html = (res, body, status = 200, extra = {}) => { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'SAMEORIGIN', ...extra }); res.end(body); };
const json = (res, obj, status = 200, extra = {}) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra }); res.end(JSON.stringify(obj)); };
const redirect = (res, to, extra = {}) => { res.writeHead(303, { location: to, 'cache-control': 'no-store', ...extra }); res.end(); };
const body = (req, limit = 1e5) => new Promise(resolve => { let b = ''; req.on('data', c => { b += c; if (b.length > limit) req.destroy(); }); req.on('end', () => resolve(b)); req.on('error', () => resolve('')); });
const jsonBody = async req => { try { return JSON.parse(await body(req) || '{}'); } catch (e) { return {}; } };
const formBody = async req => new URLSearchParams(await body(req));
const sameOrigin = req => { const o = req.headers.origin || req.headers.referer; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch (e) { return false; } };
const page = (res, p, status) => html(res, p, status);
const msg = (res, user, title, text, action, status = 200) => page(res, pages.message({ logo: LOGO, user, title, text, action }), status);

// ── live feeds, one per community ──
const feeds = new Map();
const feedFor = c => { let f = feeds.get(c.id); if (!f) { f = new Feed(c.id, () => communities.key(c.id)); feeds.set(c.id, f); } return f; };
const calOf = c => ({ auto: {}, manual: c.settings.cal || [] });

// ── the CAD page, with this community's settings injected ──
let mapHtml = null, mapMtime = 0;
const mapPage = (c, user, role) => { const f = join(ROOT, 'live-map-3d.html'), m = statSync(f).mtimeMs; if (!mapHtml || m !== mapMtime) { mapHtml = readFileSync(f, 'utf8'); mapMtime = m; }
  const cfg = { slug: c.slug, name: c.name, api: `/c/${c.slug}/api`, role, me: user.roblox_name || '', user: user.name, depts: c.settings.depts, teams: c.settings.teams, canEdit: role !== 'member' };
  const inject = `<base href="/"><script>window.OVERSITE=${JSON.stringify(cfg).replace(/</g, '\\u003c')};</script>`;
  return mapHtml.replace(/<head>/i, `<head>${inject}`).replace(/<title>[^<]*<\/title>/i, `<title>${pages.esc(c.name)} · Oversite</title>`); };

// ── community access ──
const ROLE_RANK = { member: 1, staff: 2, admin: 3, owner: 4 };
const access = (req, slug) => { const user = auth.currentUser(req), c = communities.bySlug(slug); if (!c) return { c: null, user }; const role = user ? members.role(c.id, user.id) : null; return { c, user, role }; };
const can = (role, need) => (ROLE_RANK[role] || 0) >= ROLE_RANK[need];

const communityApi = async (req, res, slug, rest) => {
  const { c, user, role } = access(req, slug);
  if (!c) return json(res, { error: 'No such community.' }, 404);
  if (!user) return json(res, { error: 'Sign in first.' }, 401);
  if (!role) return json(res, { error: 'You are not a member of this community.' }, 403);
  if (req.method !== 'GET' && req.headers['x-oversite'] !== '1') return json(res, { error: 'Bad request.' }, 400);
  const f = feedFor(c), M = req.method;
  if (rest === 'stream' && M === 'GET') return f.stream(req, res, calOf(c));
  if (rest.startsWith('v2/server') && M === 'GET') { const s = await f.snapshot(); res.writeHead(s.status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...s.headers }); return res.end(s.body); }
  if (rest === 'cal') { if (M === 'GET') return json(res, calOf(c)); if (!can(role, 'admin')) return json(res, { error: 'Only admins can move the map calibration.' }, 403);
    const j = await jsonBody(req), num = v => typeof v === 'number' && Number.isFinite(v);
    c.settings.cal = j.clear ? [] : (Array.isArray(j.manual) ? j.manual.filter(p => p && num(p.sx) && num(p.sz) && num(p.wx) && num(p.wy)).slice(0, 20).map(p => ({ name: String(p.name || 'Point').slice(0, 60), sx: p.sx, sz: p.sz, wx: p.wx, wy: p.wy })) : c.settings.cal);
    communities.saveSettings(c.id, c.settings); f.bcast('cal', JSON.stringify(calOf(c))); return json(res, calOf(c)); }
  if (rest === 'key') {
    if (M === 'GET') return json(res, { hasKey: !!communities.key(c.id), persistent: true, canEdit: can(role, 'admin') });
    if (!can(role, 'admin')) return json(res, { error: 'Only admins can change the server key.' }, 403);
    if (M === 'DELETE') { if (!can(role, 'owner')) return json(res, { error: 'Only the owner can disconnect the server.' }, 403); communities.setKey(c.id, null); f.setKey(''); return json(res, { ok: true }); }
    const k = String((await jsonBody(req)).key || '').trim(); if (!/^[A-Za-z0-9_\-]{8,200}$/.test(k)) return json(res, { error: 'That does not look like an ER:LC server key.' }, 400);
    const t = await testKey(k); if (!t.ok) return json(res, { error: t.message }, 400);
    communities.setKey(c.id, k); f.setKey(k); return json(res, { ok: true, persistent: true, name: t.name, players: t.players }); }
  if (rest === 'track' && M === 'GET') { if (!can(role, 'admin')) return json(res, { error: 'Admins only.' }, 403); return json(res, { stats: f.stats(), players: Object.fromEntries([...f.track].map(([k, v]) => [k.split(':')[0], v])) }); }
  // staff tools: Staff and up
  if (rest.startsWith('staff/')) { if (!can(role, 'staff')) return json(res, { error: 'Staff only.' }, 403);
    const sub = rest.slice(6), by = { id: user.id, name: user.roblox_name || user.name };
    if (sub === 'state' && M === 'GET') { const v = await staff.view(c, communities.key(c.id)); return json(res, v, v.error ? 502 : 200); }
    if (sub === 'action' && M === 'POST') { const r = await staff.act(c, communities.key(c.id), by, await jsonBody(req)); return json(res, r, r.error ? 400 : 200); }
    if (sub === 'records' && M === 'GET') return json(res, { records: staff.records(c, Object.fromEntries(new URL(req.url, 'http://x').searchParams)) });
    if (sub === 'records/delete' && M === 'POST') { if (!can(role, 'admin')) return json(res, { error: 'Only admins can delete records.' }, 403); staff.removeRecord(c, (await jsonBody(req)).id); return json(res, { ok: true }); }
    return json(res, { error: 'Not found.' }, 404); }
  if (!can(role, 'admin')) return json(res, { error: 'Only admins can do that.' }, 403);
  if (rest === 'settings' && M === 'POST') { const j = await jsonBody(req), s = c.settings;
    const name = String(j.name || '').trim(); if (name.length < 2 || name.length > 48) return json(res, { error: 'The name must be 2 to 48 characters.' }, 400);
    for (const d of ['pd', 'fd', 'dot']) { const n = String(j.depts?.[d]?.name || '').trim().slice(0, 40), sh = String(j.depts?.[d]?.short || '').trim().toUpperCase().slice(0, 6); if (!n || !sh) return json(res, { error: 'Every department needs a name and a short name.' }, 400); s.depts[d] = { name: n, short: sh }; }
    for (const [t, d] of Object.entries(j.teams || {})) if (t in s.teams && ['pd', 'fd', 'dot', ''].includes(d)) s.teams[t] = d;
    communities.rename(c.id, name); communities.saveSettings(c.id, s); return json(res, { ok: true }); }
  if (rest === 'codes' && M === 'POST') { const j = await jsonBody(req); if (j.role === 'owner' && !can(role, 'owner')) return json(res, { error: 'Only owners can change the owner code.' }, 403);
    if (!['owner', 'member'].includes(j.role)) return json(res, { error: 'Unknown code.' }, 400);
    const r = j.generate && j.role === 'member' ? auth.newMemberCode(c.id) : auth.setCode(c.id, j.role, j.code); return r.error ? json(res, { error: r.error }, 400) : json(res, r); }
  if (rest === 'invites' && M === 'POST') { const code = invites.create(c.id, user.id); return json(res, { code, url: `${origin(req)}/join/${code}` }); }
  if (rest === 'invites/revoke' && M === 'POST') { invites.revoke(c.id, String((await jsonBody(req)).code || '')); return json(res, { ok: true }); }
  if (rest === 'members/role' && M === 'POST') { if (!can(role, 'owner')) return json(res, { error: 'Only the owner can change roles.' }, 403); const j = await jsonBody(req);
    if (!['member', 'staff', 'admin'].includes(j.role)) return json(res, { error: 'Unknown role.' }, 400); members.setRole(c.id, +j.userId, j.role); return json(res, { ok: true }); }
  if (rest === 'members/remove' && M === 'POST') { const j = await jsonBody(req), target = members.role(c.id, +j.userId);
    if (!target || target === 'owner' || +j.userId === user.id) return json(res, { error: 'That member cannot be removed.' }, 400);
    if (target === 'admin' && !can(role, 'owner')) return json(res, { error: 'Only the owner can remove an admin.' }, 403); members.remove(c.id, +j.userId); return json(res, { ok: true }); }
  if (rest === 'delete' && M === 'POST') { if (!can(role, 'owner')) return json(res, { error: 'Only the owner can delete the community.' }, 403);
    if ((await jsonBody(req)).confirm !== c.slug) return json(res, { error: 'Type the address to confirm.' }, 400); communities.remove(c.id); feeds.delete(c.id); return json(res, { ok: true }); }
  return json(res, { error: 'Not found.' }, 404); };
const legacyKey = id => { if (existsSync(LEGACY_KEY) && !communities.all().some(c => c.erlc_key)) { try { const k = readFileSync(LEGACY_KEY, 'utf8').trim(); if (k) { communities.setKey(id, k); renameSync(LEGACY_KEY, LEGACY_KEY + '.migrated'); } } catch (e) {} } };   // the first server keeps the key the site already had
const origin = req => (process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || 'http').split(',')[0]}://${req.headers.host}`).replace(/\/$/, '');

const globalApi = async (req, res, rest) => {
  const user = auth.currentUser(req); if (!user) return json(res, { error: 'Sign in first.' }, 401);
  if (req.headers['x-oversite'] !== '1') return json(res, { error: 'Bad request.' }, 400);
  if (rest === 'communities' && req.method === 'POST') { const j = await jsonBody(req), name = String(j.name || '').trim(), slug = String(j.slug || '').trim().toLowerCase();
    if (name.length < 2 || name.length > 48) return json(res, { error: 'The name must be 2 to 48 characters.' }, 400);
    if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(slug) || slug.includes('--')) return json(res, { error: 'The address must be 3 to 32 lowercase letters, numbers or single dashes.' }, 400);
    if (RESERVED.has(slug) || communities.bySlug(slug)) return json(res, { error: 'That address is taken. Try another.' }, 409);
    if (communities.forUser(user.id).filter(c => c.role === 'owner').length >= 10) return json(res, { error: 'You can own up to 10 communities.' }, 400);
    const r = auth.createServer(req, user, { name, slug, ownerCode: j.ownerCode }, RESERVED); if (r.error) return json(res, { error: r.error }, 400); legacyKey(r.id); return json(res, { slug }); }
  if (rest === 'roblox/start' && req.method === 'POST') { const r = await auth.robloxStart(user, (await jsonBody(req)).username); return r.error ? json(res, { error: r.error }, 400) : json(res, r); }
  if (rest === 'roblox/verify' && req.method === 'POST') { const r = await auth.robloxVerify(user); if (r.error) return json(res, { error: r.error }, 400); return json(res, r, 200, r.mergedInto ? { 'set-cookie': auth.signIn(req, r.mergedInto) } : {}); }
  if (rest === 'roblox/cancel' && req.method === 'POST') { roblox.clear(user.id); return json(res, { ok: true }); }
  if (rest === 'roblox/unlink' && req.method === 'POST') { auth.robloxUnlink(user); return json(res, { ok: true }); }
  return json(res, { error: 'Not found.' }, 404); };

// ── routes ──
const route = async (req, res) => {
  const url = new URL(req.url, 'http://x'), path = decodeURIComponent(url.pathname);
  if (path === '/health') { let w = 0, perMin = 0; for (const f of feeds.values()) { w += f.clients.size; perMin += f.sent.length; } res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(`ok ${communities.all().length} communities, ${w} watching, ${perMin}/min`); }
  // an account that only ever came from a server code (no Discord, no Roblox) is nothing once its last server is gone: sign it out and start over
  const stranded = user => user && !user.discord_id && !user.roblox_id && !communities.forUser(user.id).length;
  if (path === '/' || path === '/dashboard') { const user = auth.currentUser(req); if (stranded(user)) return redirect(res, '/', { 'set-cookie': auth.signOut(req) }); }
  if (path === '/') { const user = auth.currentUser(req); if (user) return redirect(res, '/dashboard'); return page(res, pages.landing({ logo: LOGO, discord: auth.discordReady(), roblox: auth.robloxOAuthReady(), owner: auth.ownerLoginOn(), next: auth.safeNext(url.searchParams.get('next')) })); }
  if (path === '/dashboard') { const user = auth.currentUser(req); if (!user) return redirect(res, '/?next=/dashboard');
    const p = roblox.pending(user.id), w = url.searchParams.get('welcome'), wc = w && communities.bySlug(w);
    return page(res, pages.dashboard({ logo: LOGO, user, comms: communities.forUser(user.id), discordLinkable: auth.discordReady() && !user.discord_id, pending: p && p.expires > Date.now() ? p : null, welcome: wc && members.role(wc.id, user.id) ? wc : null, discord: auth.discordReady(), robloxOAuth: auth.robloxOAuthReady() && !(p && p.expires > Date.now()) })); }
  if (path === '/privacy') return page(res, pages.privacy({ logo: LOGO, user: auth.currentUser(req) }));
  if (path === '/terms') return redirect(res, 'https://www.oversite.shop/terms');
  if (path === '/auth/roblox') { if (!auth.robloxOAuthReady()) return msg(res, auth.currentUser(req), 'Roblox linking is not set up yet', 'The site owner needs to add the Roblox app keys first.', { href: '/dashboard', label: 'Back' });
    const { url: to, cookie } = auth.robloxOAuthStart(req, url.searchParams.get('next') || '/dashboard'); return redirect(res, to, { 'set-cookie': cookie }); }
  // end of the second-tab flow: tell the page that opened it, then close; opened directly it just goes to the dashboard
  if (path === '/auth/roblox/done') return html(res, `<!doctype html><meta charset="utf-8"><title>Linked</title><body style="background:#0B0C0E;color:#F0F2F5;font:15px system-ui;display:grid;place-items:center;height:100vh;margin:0"><p>Roblox linked. You can close this tab.</p><script>try{if(window.opener&&!window.opener.closed){window.opener.postMessage({ov:'roblox-linked'},location.origin);window.close()}}catch(e){}setTimeout(()=>{location.replace('/dashboard')},600)</script>`);
  if (path === '/auth/roblox/callback') { try { const { user, next } = await auth.robloxOAuthFinish(req, url.searchParams); return redirect(res, next, { 'set-cookie': [auth.signIn(req, user.id), auth.setCookie(req, 'ov_rbx', '', 0)] }); }
    catch (e) { const u = auth.currentUser(req); return msg(res, u, 'Could not link Roblox', e.message, { href: u ? '/dashboard' : '/', label: 'Back' }, 400); } }
  if (path === '/auth/discord') { if (!auth.discordReady()) return msg(res, auth.currentUser(req), 'Discord sign-in is not set up yet', 'The site owner needs to connect a Discord application first.', { href: '/', label: 'Back' });
    const { url: to, cookie } = auth.discordStart(req, url.searchParams.get('next')); return redirect(res, to, { 'set-cookie': cookie }); }
  if (path === '/auth/discord/callback') { try { const { user, next } = await auth.discordFinish(req, url.searchParams); return redirect(res, next, { 'set-cookie': [auth.signIn(req, user.id), auth.setCookie(req, 'ov_oauth', '', 0)] }); }
    catch (e) { return page(res, pages.landing({ logo: LOGO, discord: auth.discordReady(), roblox: auth.robloxOAuthReady(), owner: auth.ownerLoginOn(), error: e.message }), 400); } }
  if (path === '/auth/owner' && req.method === 'POST') { if (!sameOrigin(req)) return msg(res, null, 'Request blocked', 'Please sign in from the Oversite page.', { href: '/', label: 'Back' }, 400);
    const f = await formBody(req), r = auth.ownerLogin(req, String(f.get('code') || '').trim());
    if (r.error) return page(res, pages.landing({ logo: LOGO, discord: auth.discordReady(), roblox: auth.robloxOAuthReady(), owner: auth.ownerLoginOn(), next: auth.safeNext(f.get('next')), error: r.error }), 401);
    return redirect(res, auth.safeNext(f.get('next')), { 'set-cookie': auth.signIn(req, r.user.id) }); }
  if ((path === '/auth/create' || path === '/auth/code') && req.method === 'POST') { if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400);
    const user = auth.currentUser(req), j = await jsonBody(req);
    const r = path === '/auth/create' ? auth.createServer(req, user, { name: j.name, slug: j.slug, ownerCode: j.ownerCode }, RESERVED) : auth.codeSignIn(req, user, j.code);
    if (r.error) return json(res, { error: r.error }, 400);
    if (path === '/auth/create') legacyKey(r.id);
    const slug = r.slug || r.community.slug, u = users.byId(r.user.id);
    let next = path === '/auth/create' ? `/c/${slug}/settings?new=1` : (u.roblox_name ? `/c/${slug}` : `/dashboard?welcome=${slug}`);
    if (j.roblox && !u.roblox_name) { const s2 = await auth.robloxStart(u, j.roblox); if (!s2.error && path === '/auth/code') next = `/dashboard?welcome=${slug}`; }
    return json(res, { next }, 200, user ? {} : { 'set-cookie': auth.signIn(req, r.user.id) }); }
  if (path === '/auth/logout' && req.method === 'POST') { if (!sameOrigin(req)) return redirect(res, '/'); return redirect(res, '/', { 'set-cookie': [auth.signOut(req), auth.setCookie(req, COOKIE, '', 0)] }); }   // signing out also forgets the preview code, so the browser is back at the very first screen
  let m;
  if ((m = path.match(/^\/join\/([0-9a-f]{10})$/))) { const user = auth.currentUser(req), inv = invites.get(m[1]), c = inv && communities.byId(inv.community_id);
    if (!inv || !c) return msg(res, user, 'This invite has expired', 'Ask your community for a new link.', { href: user ? '/dashboard' : '/', label: user ? 'Go to dashboard' : 'Back' }, 404);
    if (!user) return redirect(res, `/?next=/join/${m[1]}`);
    if (members.role(c.id, user.id)) return redirect(res, `/c/${c.slug}`);
    if (req.method === 'POST') { if (!sameOrigin(req)) return redirect(res, `/join/${m[1]}`); members.add(c.id, user.id); invites.use(m[1]); return redirect(res, `/c/${c.slug}`); }
    return page(res, pages.join({ logo: LOGO, user, c, code: m[1] })); }
  if ((m = path.match(/^\/c\/([a-z0-9-]{3,32})(\/.*)?$/))) { const slug = m[1], sub = (m[2] || '/').replace(/\/+$/, '') || '/';
    if (sub.startsWith('/api/')) return communityApi(req, res, slug, sub.slice(5));
    const { c, user, role } = access(req, slug);
    if (!c) return msg(res, user, 'Community not found', 'Check the address, or ask your community for an invite link.', { href: user ? '/dashboard' : '/', label: user ? 'Go to dashboard' : 'Back' }, 404);
    if (!user) return redirect(res, `/?next=${encodeURIComponent(path)}`);
    if (!role) return msg(res, user, `You are not in ${c.name}`, 'Ask the community for an invite link to join.', { href: '/dashboard', label: 'Go to dashboard' }, 403);
    if (sub === '/') return html(res, mapPage(c, user, role));
    if (sub === '/settings') { if (!can(role, 'admin')) return msg(res, user, 'Admins only', 'Only owners and admins can change community settings.', { href: `/c/${c.slug}`, label: 'Open CAD' }, 403);
      const key = communities.key(c.id), f = feeds.get(c.id), snapName = (() => { try { return f?.snap ? JSON.parse(f.snap.body).Name : ''; } catch (e) { return ''; } })();
      return page(res, pages.settings({ logo: LOGO, user, c, role, keyStatus: { connected: !!key, name: snapName }, invites: invites.list(c.id), members: members.list(c.id), origin: origin(req), isNew: url.searchParams.has('new'), codes: can(role, 'owner') ? { owner: codes.show(c.id, 'owner'), member: codes.show(c.id, 'member') } : (can(role, 'admin') ? { owner: null, member: codes.show(c.id, 'member') } : null) })); }
    return msg(res, user, 'Not found', 'That page does not exist.', { href: `/c/${c.slug}`, label: 'Open CAD' }, 404); }
  if (path.startsWith('/api/')) return globalApi(req, res, path.slice(5));
  return serve(req, res, path); };

const serve = (req, res, url) => {
  const file = normalize(join(ROOT, url));
  if (!file.startsWith(ROOT) || /\.(py|md)$/i.test(file) || !existsSync(file) || !statSync(file).isFile()) return msg(res, auth.currentUser(req), 'Not found', 'That page does not exist.', { href: '/', label: 'Home' }, 404);
  const ext = extname(file).toLowerCase();
  res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' }); createReadStream(file).pipe(res); };

// ── private preview lock: a numeric access code, remembered in a cookie for 30 days ──
const sign = v => createHmac('sha256', 'oversite-preview:' + CODE).update(v).digest('hex');
const COOKIE = 'ov_access';
const hasAccess = req => { if (!CODE) return true; const m = /(?:^|;\s*)ov_access=([0-9a-f]{64})/.exec(req.headers.cookie || ''); if (!m) return false;
  const want = Buffer.from(sign(CODE)), got = Buffer.from(m[1]); return want.length === got.length && timingSafeEqual(want, got); };
const attempts = new Map();
const ipOf = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const lockPage = (m = '') => { const n = Math.min(8, Math.max(4, CODE.length || 4)); return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oversite</title>
<link rel="icon" type="image/png" href="data:image/png;base64,${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--ink:#F0F2F5;--dim:#8C9098;--faint:#5B5F66;--hair2:rgba(240,242,245,.14)}*{box-sizing:border-box}html,body{height:100%;margin:0}
body{font:15px/1.45 "Geist",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#386069;overflow:hidden}
.map{position:fixed;inset:0;background:#386069 url(/liberty-county.jpg) center/cover no-repeat;filter:brightness(.55) saturate(.9)}
.map::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(11,11,12,.35),rgba(11,11,12,.78))}
.wrap{position:fixed;inset:0;display:grid;place-items:center;padding:16px}
form{text-align:center;width:min(440px,100%)}
.mark{width:40px;height:40px;border-radius:10px;background:rgba(28,28,31,.66);border:1px solid rgba(240,242,245,.08);display:grid;place-items:center;margin:0 auto 18px}.mark img{width:22px;height:22px}
h1{margin:0;font-size:22px;font-weight:300;letter-spacing:-.02em}h1 b{font-weight:600}
p{margin:6px 0 0;color:var(--dim);font-size:13px}
.boxes{display:flex;gap:10px;justify-content:center;margin:26px 0 18px;cursor:text}
.boxes i{width:52px;height:64px;border-radius:12px;background:rgba(13,13,15,.62);border:1px solid var(--hair2);display:grid;place-items:center;font-style:normal;font-size:28px;font-weight:500;transition:border-color .15s}
.boxes i.on{border-color:rgba(240,242,245,.5)}.boxes i.cur{border-color:var(--ink);box-shadow:inset 0 0 0 1px var(--ink)}
form.err .boxes i{border-color:#E24B4B}form.shake .boxes{animation:shake .4s}
@keyframes shake{20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
input{position:absolute;opacity:0;width:1px;height:1px;left:-9999px}
.hint{color:var(--faint);font-size:12px}.msg{color:#F0A0A0;font-size:13px;margin:0 0 8px}
@media (max-width:420px){.boxes{gap:6px}.boxes i{width:44px;height:56px;font-size:24px}}
@media (prefers-reduced-motion:reduce){form.shake .boxes{animation:none}}
</style>${pages.INTRO_HEAD}</head><body><div class="map"></div><div class="wrap">
<form method="post" action="/unlock" autocomplete="off" id="f" class="${m ? 'err shake' : ''}">
<div class="mark"><img src="data:image/png;base64,${LOGO}" alt=""></div>
<h1><b>Oversite</b> is in private preview</h1><p>Enter your ${['four', 'five', 'six', 'seven', 'eight'][n - 4]}-digit access code.</p>
<label class="boxes" id="boxes" for="code">${'<i></i>'.repeat(n)}</label>
<input id="code" name="code" inputmode="numeric" pattern="[0-9]*" maxlength="${n}" autofocus aria-label="Access code">
${m ? `<p class="msg">${m}</p>` : ''}<span class="hint">Remembered on this browser for 30 days.</span></form></div>
<script>
const f=document.getElementById('f'),inp=document.getElementById('code'),cells=[...document.querySelectorAll('#boxes i')],N=${n};
const paint=()=>{const v=inp.value.replace(/\\D/g,'').slice(0,N);inp.value=v;cells.forEach((c,i)=>{c.textContent=v[i]||'';c.className=v[i]?'on':(i===v.length?'cur':'');});if(v.length===N)f.submit();};
inp.addEventListener('input',paint);document.getElementById('boxes').addEventListener('click',()=>inp.focus());document.addEventListener('click',()=>inp.focus());
f.addEventListener('animationend',()=>f.classList.remove('shake'));paint();inp.focus();
</script></body></html>`; };
const unlock = (req, res, code, next = '/') => { const ip = ipOf(req), a = attempts.get(ip) || { n: 0, until: 0 };
  if (Date.now() < a.until) return html(res, lockPage('Too many tries. Wait a minute and try again.'), 429);
  if (code && code === CODE) { attempts.delete(ip); const secure = (req.headers['x-forwarded-proto'] || '').startsWith('https') ? '; Secure' : '';
    return redirect(res, next, { 'set-cookie': `${COOKIE}=${sign(CODE)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}` }); }
  a.n++; if (a.n >= 5) { a.n = 0; a.until = Date.now() + 60000; } attempts.set(ip, a); return html(res, lockPage('That code is not right.'), 401); };
const gate = async (req, res) => {
  const url = new URL(req.url, 'http://x'), path = url.pathname;
  if (path === '/health' || path === '/liberty-county.jpg' || path === '/intro-splash.js' || path === '/privacy' || path === '/terms') return route(req, res);   // legal pages stay public so Roblox and Discord can link to them
  if (path === '/unlock' && req.method === 'POST') { const f = await formBody(req); return unlock(req, res, String(f.get('code') || '').trim()); }
  if (path === '/lock') return html(res, lockPage(), 200, { 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` });
  const q = url.searchParams.get('code'); if (q && CODE && !hasAccess(req)) { url.searchParams.delete('code'); return unlock(req, res, q.trim(), url.pathname + (url.search || '')); }
  if (hasAccess(req)) return route(req, res);
  if (path.includes('/api/')) return json(res, { error: 'locked' }, 401);
  return html(res, lockPage(), 401); };

http.createServer((req, res) => {
  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (CANON.startsWith('www.') && host === CANON.slice(4)) { res.writeHead(301, { location: `https://${CANON}${req.url}`, 'cache-control': 'no-store' }); return res.end(); }
  gate(req, res).catch(e => { console.error(e); if (!res.headersSent) json(res, { error: 'Server error.' }, 500); else res.end(); }); })
  .listen(PORT, () => console.log(`Oversite on http://localhost:${PORT} (${communities.all().length} communities; ${CODE ? 'preview lock on' : 'site open'}; Discord sign-in ${auth.discordReady() ? 'on' : 'off'})`));
