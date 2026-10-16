#!/usr/bin/env node
// Oversite: a multi-community CAD for ER:LC. Each community connects its own server and gets its own live map and MDTs at /<slug>.
// Railway runs `npm start`. Data lives in SQLite on the /data volume (see app/db.mjs).
import http from 'node:http';
import { createReadStream, statSync, existsSync, readFileSync, renameSync } from 'node:fs';
import { join, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { users, communities, communityPhotos, members, invites, roblox, codes, reports, reviews, stats, voteDays, unitMembers, rideWith, mdtSignin, support, staffGrants, siteSettings, seal, RESERVED, token } from './app/db.mjs';
import { RANKS, validRank, ranksFor, saveRanks, licenseOf, saveLicense } from './app/license.mjs';
import { serverPage } from './app/serverpage.mjs';
import * as voice from './app/voice.mjs';
import { voicePage } from './app/voicepage.mjs';
import { staffHub, applyPage } from './app/staffpage.mjs';
import { Feed, testKey, appSide, NOKEY, appKey, appId, appKeyChanged, authLink, erlcHeaders } from './app/feed.mjs';
import * as auth from './app/auth.mjs';
import * as discordlink from './app/discordlink.mjs';
import * as staff from './app/staff.mjs';
import * as police from './app/police.mjs';
import * as premium from './app/premium.mjs';
import * as bounds from './app/bounds.mjs';
import * as career from './app/career.mjs';
import * as mdtprefs from './app/mdtprefs.mjs';
import * as supporter from './app/supporter.mjs';
import * as staffhub from './app/staffhub.mjs';
import * as civ from './app/civ.mjs';
import * as civbiz from './app/civbiz.mjs';
import * as features from './app/features.mjs';
import * as deptReports from './app/reports.mjs';
import * as srvStatus from './app/status.mjs';
import * as alerts from './app/alerts.mjs';
import * as backup from './app/backup.mjs';
import * as automations from './app/automations.mjs';
import * as radio from './app/radio.mjs';
import * as insights from './app/insights.mjs';
import * as discordbot from './app/discordbot.mjs';
import * as profile from './app/profile.mjs';
import * as pages from './app/pages.mjs';
import { isSiteAdmin, isSiteMod } from './app/admins.mjs';
import { rude, RUDE_MSG } from './app/clean.mjs';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'preview');
const PORT = +(process.env.PORT || 8080);
const CODE = (process.env.ACCESS_CODE || '').trim();          // private preview lock: digits visitors must enter; empty = site is open
const CANON = (process.env.CANONICAL_HOST || 'www.oversitescad.com').toLowerCase();
const LOGO = readFileSync(join(ROOT, 'logo.png')).toString('base64');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const DATA = existsSync('/data') ? '/data' : join(ROOT, '..');
const LEGACY_KEY = join(DATA, existsSync('/data') ? 'erlc.key' : '.erlc.key');   // the single-server key from before communities: given to the first community created

// ── small helpers ──
const html = (res, body, status = 200, extra = {}) => { res.writeHead(status, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-frame-options': 'SAMEORIGIN', ...extra }); res.end(body); };
const json = (res, obj, status = 200, extra = {}) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra }); res.end(JSON.stringify(obj)); };
const redirect = (res, to, extra = {}, code = 303) => { res.writeHead(code, { location: to, 'cache-control': 'no-store', ...extra }); res.end(); };
// bytes are joined before decoding, so a character split across two chunks (and the Stripe signature over it) stays intact
const body = (req, limit = 1e5) => new Promise(resolve => { const parts = []; let n = 0; req.on('data', c => { n += c.length; if (n > limit) return req.destroy(); parts.push(c); }); req.on('end', () => resolve(Buffer.concat(parts).toString('utf8'))); req.on('error', () => resolve('')); req.on('close', () => { if (n > limit) resolve(''); }); });
const jsonBody = async req => { try { return JSON.parse(await body(req) || '{}'); } catch (e) { return {}; } };
const formBody = async req => new URLSearchParams(await body(req));
const sameOrigin = req => { const o = req.headers.origin || req.headers.referer; if (!o) return true; try { return new URL(o).host === req.headers.host; } catch (e) { return false; } };
const page = (res, p, status) => html(res, p, status);
const msg = (res, user, title, text, action, status = 200) => page(res, pages.message({ logo: LOGO, user, title, text, action, code: status }), status);

// ── live feeds, one per community ──
const feeds = new Map();
const clearedCalls = (c, s = c.settings) => (s.cleared && typeof s.cleared === 'object' ? s.cleared : {});
// who is on each open call and how far they've got (0 assigned, 1 en route, 2 on scene), shared by every dispatcher and MDT; kept 12 hours
const callStates = (c, s = c.settings) => (s.callstate && typeof s.callstate === 'object' ? s.callstate : {});
const feedFor = c => { let f = feeds.get(c.id); if (!f) { f = new Feed(c.id, () => communities.key(c.id), () => isSiteAdmin(users.byId(communities.byId(c.id)?.owner_id))); feeds.set(c.id, f);
  f.onSnap = body => { const cc = communities.byId(c.id) || c, hits = police.observe(c.id, body, cc.settings.teams) || [];
    // the plate reader's hits go to every CAD and to automations; automations also watch for players joining and new calls
    if (features.on(cc, 'alpr')) for (const h of hits) { f.bcast('alpr', JSON.stringify(h)); if (features.on(cc, 'automations')) automations.fire(cc, 'alpr', h); }
    if (features.on(cc, 'automations')) automations.observe(cc, body); career.observe(c.id, body); staffhub.observe(c.id, body); try { civbiz.observe(communities.byId(c.id) || c, body); } catch (e) { console.log('civbiz observe:', e.message); } };
  f.withExtra = body => civ.withCalls(c.id, body, clearedCalls(communities.byId(c.id) || c));                                                                   // 911 calls made from the Civilian tab                                                          // plates, owners and players for the PD lookups
  f.onStream = res => { res.write(`event: unitstatuses\ndata: ${JSON.stringify(police.statuses(c.id))}\n\n`); res.write(`event: callstates\ndata: ${JSON.stringify(callStates(communities.byId(c.id) || c))}\n\n`); }; } return f; };   // everyone's 10-code on connect
const calOf = c => ({ auto: {}, manual: c.settings.cal || [] });
// which side someone is playing right now, from the server's latest ER:LC snapshot: 'pd' | 'fd' | 'dot' | 'civ', null when they
// aren't in the server, undefined when there's no fresh data (then nothing is blocked, so an ER:LC outage never locks anyone out)
const liveSide = (c, user) => { const sn = feeds.get(c.id)?.snap; if (!sn || Date.now() - sn.t > 180000 || !user.roblox_id) return undefined;
  let j; try { j = JSON.parse(sn.body); } catch (e) { return undefined; }
  const p = (j.Players || []).find(x => String(x.Player || '').split(':')[1] === String(user.roblox_id)); if (!p) return null;
  return (c.settings.teams || {})[p.Team] || 'civ'; };
// where someone is standing in game right now ({ x, z, label }), from the latest snapshot; null when unknown
const posOf = (c, user) => { const sn = feeds.get(c.id)?.snap; if (!sn || Date.now() - sn.t > 60000 || !user.roblox_id) return null;
  let j; try { j = JSON.parse(sn.body); } catch (e) { return null; } const p = (j.Players || []).find(x => String(x.Player || '').split(':')[1] === String(user.roblox_id)), L = p?.Location;
  if (!L || !Number.isFinite(+L.LocationX)) return null; return { x: +L.LocationX, z: +L.LocationZ, label: [L.PostalCode ? 'Postal ' + L.PostalCode : '', L.StreetName || ''].filter(Boolean).join(', ') }; };
// the cars someone has spawned in game right now, from the same snapshot; null when there's no fresh data
const spawnedBy = (c, user) => { const sn = feeds.get(c.id)?.snap; if (!sn || Date.now() - sn.t > 180000 || !user.roblox_name) return null;
  let j; try { j = JSON.parse(sn.body); } catch (e) { return null; } const me = String(user.roblox_name).toLowerCase();
  const p = (j.Players || []).find(x => String(x.Player || '').split(':')[0].toLowerCase() === me); if (p && (c.settings.teams || {})[p.Team]) return [];   // a department car isn't theirs
  return (j.Vehicles || []).filter(v => String(v.Owner || '').split(':')[0].toLowerCase() === me).map(v => ({ plate: v.Plate, model: v.Name, color: v.ColorName, hex: v.ColorHex })); };

// ── the CAD page, with this community's settings injected ──
// a Premium person's saved map style wins over whatever this browser last used, so every device opens on the same map
const mapPref = p => { const m = /^(2d)-(light|dark)$/.exec(p?.map || ''); return m ? `try{localStorage.setItem('ov.mapstyle','{"dim":"${m[1]}","theme":"${m[2]}"}')}catch(e){}` : ''; };
let mapHtml = null, mapMtime = 0;
const mapPage = (c, user, role) => { const f = join(ROOT, 'live-map-3d.html'), m = statSync(f).mtimeMs; if (!mapHtml || m !== mapMtime) { mapHtml = readFileSync(f, 'utf8'); mapMtime = m; }
  const prem = premium.isPremium(c), cfg = { premium: prem, logo: prem && profile.iconSource(c) && features.on(c, 'serverlogo') ? `/c/${c.slug}/icon` : '', license: prem ? c.settings.licenseStyle || null : null, slug: c.slug, name: c.name, api: `/c/${c.slug}/api`, role, me: user.roblox_name || '', rid: user.roblox_id || '', user: user.name, signed: !!user.roblox_name, depts: c.settings.depts, teams: c.settings.teams, unitOf: unitMembers.all(c.id), rideWith: rideWith.all(c.id), voice: voice.voiceSettings(c).on && prem, roads: c.settings.roads || null, mdt: mdtSignin.mine(c.id, user.id), ranks: features.on(c, 'mdtsignin') ? ranksFor(c, prem) : null, features: features.all(c), gold: features.on(c, 'goldchecks') ? users.premiumRoblox() : [], setup: premium.userInfo(user).on ? mdtprefs.get(user.id) : null, beta: premium.isBeta(user), canEdit: (ROLE_RANK[role] || 0) >= ROLE_RANK.co_owner };
  const inject = `<base href="/"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4"><link rel="manifest" href="/manifest.webmanifest?v=4"><meta name="apple-mobile-web-app-title" content="Oversite"><meta name="application-name" content="Oversite"><meta name="theme-color" content="#0D1416"><script>window.OVERSITE=${JSON.stringify(cfg).replace(/</g, '\\u003c')};${mapPref(cfg.setup)}</script><style>${features.css(c)}</style>`;
  return mapHtml.replace(/<head>/i, () => `<head>${inject}`).replace(/<title>[^<]*<\/title>/i, () => `<title>${pages.esc(c.name)} · Oversite</title>`); };   // functions, so a $' in a name is never read as a replace pattern

// ── Roblox headshots ──
const heads = new Map();
const headshot = async (id, kind = 'headshot') => { const ck = kind + id, hit = heads.get(ck); if (hit && Date.now() - hit.at < (hit.url ? 6 * 3600e3 : 600e3)) return hit.url;   // kind 'bust' = head and shoulders, for the license photo
  let url = null; try { const j = await fetch(kind === 'bust' ? `https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${id}&size=420x420&format=Png&isCircular=false` : `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${id}&size=150x150&format=Png&isCircular=false`).then(r => r.json());
    const d = j.data && j.data[0]; if (d && d.state === 'Completed' && /^https:\/\/[a-z0-9.-]+\.rbxcdn\.com\//.test(d.imageUrl || '')) url = d.imageUrl; } catch (e) {}
  if (heads.size > 5000) heads.clear(); heads.set(ck, { url, at: Date.now() }); return url; };

// ── community access ──
// owner > co-owner > admin > mod > member. Co-owners run Settings (not deleting the server); admins and mods get the Staff MDT
const ROLE_RANK = { member: 1, mod: 2, admin: 3, co_owner: 4, owner: 5 };
// access = the stored membership, raised by the person's roles in the community's linked Discord server (checked live)
// staff from the Team tab and from the game: a role given before they were on Oversite is theirs the first time they open the server,
// and ER:LC co-owners, admins and mods are staff in the CAD too, at least at that rank
const staffRole = (c, user) => { if (!user) return null; let role = members.role(c.id, user.id); if (!user.roblox_id) return role;
  const g = staffGrants.take(c.id, user.roblox_id); if (g) { if (!role) members.add(c.id, user.id, g.role); else if (role !== 'owner') members.setRole(c.id, user.id, g.role); role = members.role(c.id, user.id); }
  const G = c.settings.ingameStaff, rid = String(user.roblox_id), lvl = !G || role === 'owner' ? null : G.co?.includes(rid) ? 'co_owner' : G.admins?.includes(rid) ? 'admin' : G.mods?.includes(rid) ? 'mod' : null;
  if (lvl) { if (!role) members.add(c.id, user.id, 'member'); role = discordlink.higher(role || 'member', lvl); } return role; };
const access = async (req, slug) => { const user = auth.currentUser(req), c = communities.bySlug(slug); if (!c) return { c: null, user };
  let role = staffRole(c, user);
  if (user && user.discord_id && role !== 'owner') { const lvl = await discordlink.levelFor(c, user.discord_id).catch(() => null); if (lvl) { if (!role) members.add(c.id, user.id, 'member'); role = discordlink.higher(role, lvl); } }
  return { c, user, role }; };
// new servers must connect a Discord server before they can be used; servers made before this rule are left alone
const requireDiscord = id => { if (!discordlink.ready()) return; const c = communities.byId(id); c.settings.discordRequired = true; communities.saveSettings(id, c.settings); };
export const needsDiscord = c => !!(c && c.settings.discordRequired && !c.settings.discord?.guild_id && discordlink.ready());
const withSetup = list => list.map(x => ({ ...x, setup: needsDiscord(communities.byId(x.id)) }));
const nextAfterCreate = slug => discordlink.ready() ? `/c/${slug}/discord/connect?new=1` : `/${slug}/settings?new=1`;
const can = (role, need) => (ROLE_RANK[role] || 0) >= ROLE_RANK[need];

const communityApi = async (req, res, slug, rest) => {
  const { c, user, role } = await access(req, slug);
  if (!c) return json(res, { error: 'No such community.' }, 404);
  if (c.suspended && !isSiteAdmin(user)) return json(res, { error: 'This server is suspended.' }, 403);
  if (!user) return json(res, { error: 'Sign in first.' }, 401);
  // applications: anyone signed in can read an open form and apply, member or not
  { const ap = rest.match(/^apply\/(\d{1,9})$/);
    if (ap && req.method === 'GET') { const fm = staffhub.form(c, ap[1]); return fm && fm.open ? json(res, { form: fm, mine: staffhub.myApps(c, user).filter(a => a.form_id === fm.id) }) : json(res, { error: 'This application is closed.' }, 404); }
    if (ap && req.method === 'POST') { if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400);
      if (auth.limited(req, 'apply', 6, 60000)) return json(res, { error: 'Too many tries. Wait a minute.' }, 429);
      const r = staffhub.apply(c, user, ap[1], (await jsonBody(req)).answers); return json(res, r, r.error ? 400 : 200); } }
  if (!role) return json(res, { error: 'You are not a member of this community.' }, 403);
  if (!user.roblox_name) return json(res, { error: 'Link your Roblox account first. Open the dashboard to link it.' }, 403);
  if (req.method !== 'GET' && req.headers['x-oversite'] !== '1') return json(res, { error: 'Bad request.' }, 400);
  const f = feedFor(c), M = req.method;
  if (rest === 'stream' && M === 'GET') return f.stream(req, res, calOf(c), Object.keys(clearedCalls(c)), user.id);
  // a game 911 call cleared by anyone in the CAD clears for everyone (and stays cleared after a reload, for as long as ER:LC still lists it)
  // dispatch and the MDTs are for the departments: on the civilian team in game you can't clear calls, set a unit or status, or press panic
  // (server staff, mod and up, see and use everything whatever their team)
  if (M === 'POST' && !can(role, 'mod') && ['calls/clear', 'calls/state', 'reports', 'reports/delete', 'units/me', 'status', 'panic', 'panic/clear', 'units/ride'].includes(rest) && liveSide(c, user) === 'civ')
    return json(res, { error: 'You’re on the civilian team in game. Dispatch is for players on a department team.' }, 403);
  // Settings → Features: what a switched-off feature does is refused (police records, staff actions and homes depend on what's posted: checked where they're handled)
  const offKey = features.routeKeys(rest).find(k => (M !== 'GET' || ['dept_pd', 'pd_lookup', 'st_records', 'st_logs', 'reports', 'status', 'radio'].includes(k)) && !features.on(c, k)), off = k => json(res, { error: `This server has switched this off: ${features.nameOf(k)}.` }, 403);
  if (offKey) return off(offKey);
  if (rest === 'calls/clear' && M === 'POST') { const k = String((await jsonBody(req)).key || ''); if (!/^[\w .:@#-]{1,120}$/.test(k)) return json(res, { error: 'Bad call.' }, 400);
    const s = communities.byId(c.id).settings, now = Date.now(); s.cleared = Object.fromEntries(Object.entries(clearedCalls(c, s)).filter(([, t]) => now - t < 12 * 3600000).slice(-300)); s.cleared[k] = now;
    if (s.callstate) delete s.callstate[k];
    communities.saveSettings(c.id, s); c.settings.cleared = s.cleared; f.bcast('callclear', JSON.stringify({ key: k, by: user.roblox_name || user.name || '' })); return json(res, { ok: true }); }
  // dispatch radio: a channel is for players on that department's team in game (server staff can use any), All units for any department
  if (rest.startsWith('radio/')) { const qs = new URL(req.url, 'http://x').searchParams, j = M === 'POST' ? await jsonBody(req) : {}, ch = String(qs.get('ch') || j.ch || '');
    if (!radio.CHANNELS[ch]) return json(res, { error: 'There is no such channel.' }, 400); if (ch !== 'all' && !features.on(c, 'dept_' + ch)) return off('dept_' + ch);
    if (!can(role, 'mod')) { const side = liveSide(c, user); if (side === 'civ') return json(res, { error: 'Radio is for department players. You’re on the civilian team in game.' }, 403);
      if (ch !== 'all' && side !== undefined && side !== ch) return json(res, { error: `The ${radio.CHANNELS[ch]} channel is for players on that team in game.` }, 403); }
    if (rest === 'radio/join' && M === 'GET') return radio.join(req, res, c, user, ch, qs.get('unit'));
    if (rest === 'radio/signal' && M === 'POST') { const r = radio.signal(c, user, ch, j.to, j.data); return json(res, r, r.error ? 400 : 200); }
    if (rest === 'radio/talk' && M === 'POST') { const r = radio.talk(c, user, ch, !!j.on); return json(res, r, r.error ? 400 : 200); }
    return json(res, { error: 'Not found.' }, 404); }
  // Settings → Insights: activity, departments, records, the economy and moderation over 7 or 30 days
  if (rest === 'insights' && M === 'GET') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can see insights.' }, 403); return json(res, insights.view(c, +new URL(req.url, 'http://x').searchParams.get('days'))); }
  // Settings → Automations: the rules, what can be used in them, what ran lately; a test run with made-up details
  if (rest === 'automations' && M === 'GET') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can see automations.' }, 403); return json(res, { rules: automations.rules(c), recent: automations.recent(c.id) }); }
  if (rest === 'automations' && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can change automations.' }, 403); const r = automations.save(c, (await jsonBody(req)).rules, () => communities.saveSettings(c.id, c.settings)); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'automations/test' && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can test automations.' }, 403); const id = String((await jsonBody(req)).id || ''), r = automations.rules(c).find(x => x.id === id); if (!r) return json(res, { error: 'Save the automation first.' }, 400);
    const me = user.roblox_name || 'Player', sample = { join: { player: me, team: 'Civilian' }, call: { type: 'Test call', where: 'Postal 214', team: 'Police' }, alpr: { plate: 'TEST 123', vehicle: 'Black Falcon', owner: me, reasons: 'reported stolen', where: 'near postal 214' },
      panic: { unit: 'Patrol 1', player: me, dept: 'pd', where: 'near postal 214' }, record: { kind: 'citation', subject: me, plate: 'TEST 123', by: me, charges: 'Speeding', reason: '' } }[r.when];
    automations.fire(c, r.when, { ...sample, [automations.TRIGGERS[r.when].filter?.[0]]: r.match || sample[automations.TRIGGERS[r.when].filter?.[0]] }, true); await new Promise(x => setTimeout(x, 1500)); return json(res, { ok: true, recent: automations.recent(c.id) }); }
  // Status & Updates: the server's health and updates; owners and co-owners post their own
  if (rest === 'srvstatus' && M === 'GET') return json(res, srvStatus.view(c, can(role, 'co_owner')));
  if (rest === 'srvstatus/post' && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can post updates.' }, 403); const r = srvStatus.post(c, user, await jsonBody(req)); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'srvstatus/delete' && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can remove updates.' }, 403); return json(res, srvStatus.unpost(c, (await jsonBody(req)).id)); }
  // Fire and DOT incident reports, shared by the department; everyone with the CAD open is told when one changes
  if (rest === 'reports' && M === 'GET') return json(res, { reports: deptReports.list(c.id, new URL(req.url, 'http://x').searchParams.get('dept'), user.id) });
  if (rest === 'reports' && M === 'POST') { const j = await jsonBody(req), r = deptReports.save(c.id, String(j.dept || ''), user, j); if (r.ok) f.bcast('deptreports', JSON.stringify({ dept: j.dept })); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'reports/delete' && M === 'POST') { const j = await jsonBody(req), r = deptReports.remove(c.id, user, j.num, can(role, 'admin')); if (r.ok) f.bcast('deptreports', JSON.stringify({ dept: j.dept })); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'calls/state' && M === 'POST') { const j = await jsonBody(req), k = String(j.key || ''); if (!/^[\w .:@#-]{1,120}$/.test(k)) return json(res, { error: 'Bad call.' }, 400);
    const T = v => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 40), D = v => ['pd', 'fd', 'dot'].includes(v) ? v : '';
    const st = { unit: T(j.unit), dept: D(j.dept), stage: Math.max(0, Math.min(2, Math.round(+j.stage || 0))), more: (Array.isArray(j.more) ? j.more : []).slice(0, 8).map(m => ({ name: T(m?.name), dept: D(m?.dept) })).filter(m => m.name), at: Date.now() };
    const s = communities.byId(c.id).settings, now = Date.now(); s.callstate = Object.fromEntries(Object.entries(callStates(c, s)).filter(([, v]) => now - (v.at || 0) < 12 * 3600000).slice(-300)); s.callstate[k] = st;
    communities.saveSettings(c.id, s); c.settings.callstate = s.callstate; f.bcast('callstate', JSON.stringify({ key: k, ...st })); return json(res, { ok: true }); }
  if (rest.startsWith('v2/server') && M === 'GET') { const s = await f.snapshot(); res.writeHead(s.status || 502, { 'content-type': 'application/json', 'cache-control': 'no-store', ...s.headers }); return res.end(s.body); }
  if (rest === 'cal') { if (M === 'GET') return json(res, calOf(c)); if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner can move the map calibration.' }, 403);
    const j = await jsonBody(req), num = v => typeof v === 'number' && Number.isFinite(v);
    c.settings.cal = j.clear ? [] : (Array.isArray(j.manual) ? j.manual.filter(p => p && num(p.sx) && num(p.sz) && num(p.wx) && num(p.wy)).slice(0, 20).map(p => ({ name: String(p.name || 'Point').slice(0, 60), sx: p.sx, sz: p.sz, wx: p.wx, wy: p.wy })) : c.settings.cal);
    communities.saveSettings(c.id, c.settings); f.bcast('cal', JSON.stringify(calOf(c))); return json(res, calOf(c)); }
  if (rest === 'key') {
    if (M === 'GET') return json(res, { hasKey: !!communities.key(c.id), persistent: true, canEdit: can(role, 'co_owner') });
    if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner or a co-owner can change the server key.' }, 403);
    if (M === 'DELETE') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner can disconnect the server.' }, 403); communities.setKey(c.id, null); f.setKey(''); return json(res, { ok: true }); }
    if (auth.limited(req, 'keytest', 6, 60000)) return json(res, { error: 'Too many tries. Wait a minute and try again.' }, 429);   // each try asks ER:LC
    const k = String((await jsonBody(req)).key || '').trim(); if (!/^[A-Za-z0-9_\-]{8,200}$/.test(k)) return json(res, { error: 'That does not look like an ER:LC server key.' }, 400);
    const t = await testKey(k); if (!t.ok && !t.appSide && !t.keep) return json(res, { error: t.message }, 400);
    communities.setKey(c.id, k); f.setKey(k); console.log(`key: ${c.slug} saved${t.ok ? '' : ' (ER:LC did not confirm: ' + String(t.message).slice(0, 120) + ')'}`);
    return json(res, { ok: true, persistent: true, name: t.name, players: t.players, pending: t.ok ? undefined : t.message }); }   // pending: saved, but ER:LC hasn't confirmed it yet
  if (rest === 'track' && M === 'GET') { if (!can(role, 'co_owner')) return json(res, { error: 'Owner only.' }, 403); return json(res, { stats: f.stats(), players: Object.fromEntries([...f.track].map(([k, v]) => [k.split(':')[0], v])) }); }
  // Premium: what this server has, buying it, Explore boosts and the bot key (owner and co-owners)
  if (rest === 'premium' && M === 'GET') return json(res, { ...premium.info(c), plans: premium.PLANS, payments: premium.stripeReady(), canBuy: can(role, 'co_owner') });
  if (rest.startsWith('premium/') && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner or a co-owner can manage Premium.' }, 403);
    const sub = rest.slice(8), j = await jsonBody(req);
    try { const r = sub === 'checkout' ? await premium.checkout(c, user, String(j.plan || ''), origin(req)) : sub === 'portal' ? await premium.portal(c, origin(req), user, role === 'owner') : sub === 'boost' ? premium.boost(c)
        : sub === 'botkey' ? premium.newBotKey(c) : sub === 'botkey/delete' ? premium.dropBotKey(c) : sub === 'license' ? saveLicenseStyle(c, j)
        : sub === 'boost-server' ? premium.boostServer(c, user) : sub === 'unboost-server' ? premium.unboostServer(c, user)
        : sub === 'ranks' ? (premium.isPremium(c) ? saveRanks(c, j, () => communities.saveSettings(c.id, c.settings)) : { error: 'Custom ranks come with Premium.' }) : { error: 'Not found.' };
      return json(res, r, r.error ? 400 : 200); } catch (e) { console.log(`premium ${sub}: ${c.slug}: ${e.message}`); return json(res, { error: 'Payments could not be reached. Try again in a minute.' }, 502); } }
  // staff tools: Staff and up, on Premium servers
  if (rest.startsWith('staff/')) { if (!can(role, 'mod')) return json(res, { error: 'Staff only.' }, 403); if (!features.on(c, 'staff')) return off('staff'); if (!premium.isPremium(c)) return json(res, { error: 'The Server Staff CAD is part of Premium.', premium: true }, 402);
    const sub = rest.slice(6), by = { id: user.id, name: user.roblox_name || user.name };
    if (sub === 'state' && M === 'GET') { const v = await staff.view(c, communities.key(c.id)); return json(res, v, v.error ? 502 : 200); }
    if (sub === 'action' && M === 'POST') { const k = features.STAFF_ACT[String((req._body ||= await jsonBody(req)).kind)]; if (k && !features.on(c, k)) return off(k); }
    if (sub === 'action' && M === 'POST' && !can(role, 'admin') && !staff.MOD_KINDS.includes(String((req._body ||= await jsonBody(req)).kind))) return json(res, { error: 'Mods can warn, message, kick and add notes. Bans, unbans and announcements need an admin.' }, 403);
    if (sub === 'action' && M === 'POST') { const r = await staff.act(c, communities.key(c.id), by, req._body || await jsonBody(req)); return json(res, r, r.error ? 400 : 200); }
    // the Team tab: staff in game and in the CAD; the owner and co-owners give and take roles in both
    if (sub === 'team' && M === 'GET') return json(res, await staff.team(c, communities.key(c.id)));
    if (sub === 'team' && M === 'POST') { const r = await staff.setTeam(c, communities.key(c.id), { uid: user.id, rid: user.roblox_id, name: by.name, role }, await jsonBody(req)); return json(res, r, r.error ? 400 : 200); }
    if (sub === 'logs' && M === 'GET') return json(res, staff.lookup(c, new URL(req.url, 'http://x').searchParams.get('user')));
    if (sub === 'records/delete' && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner or a co-owner can delete records.' }, 403); staff.removeRecord(c, (await jsonBody(req)).id); return json(res, { ok: true }); }   // records can go; the command log never can
    if (sub === 'records' && M === 'GET') return json(res, { records: staff.records(c, Object.fromEntries(new URL(req.url, 'http://x').searchParams)) });
    return json(res, { error: 'Not found.' }, 404); }
  // proximity voice: the live stream of who is near you, connection setup between two players, mute, and the owner's settings
  if (rest.startsWith('voice/') && !premium.isPremium(c)) return json(res, { error: 'Proximity voice is part of Premium.', premium: true }, 402);
  if (rest === 'voice/stream' && M === 'GET') { if (!voice.voiceSettings(c).on) return json(res, { error: 'Proximity voice is off for this server.' }, 403);
    if (!user.roblox_id) return json(res, { error: 'Link your Roblox account first.' }, 403); return voice.join(req, res, c, user, f); }
  if (rest === 'voice/signal' && M === 'POST') { const j = await jsonBody(req), r = voice.signal(c, user, j.to, j.data); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'voice/mute' && M === 'POST') return json(res, voice.setMuted(c, user, (await jsonBody(req)).muted));
  if (rest === 'voice/settings' && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can change this.' }, 403);
    const j = await jsonBody(req), s = communities.byId(c.id).settings; s.voice = { on: !!j.on, range: ['short', 'normal', 'long'].includes(j.range) ? j.range : 'normal', muffle: j.muffle !== false };
    communities.saveSettings(c.id, s); return json(res, { ok: true }); }
  // Settings → Features: switch a part of the CAD on or off for the whole server
  if (rest === 'features' && M === 'POST') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can change this.' }, 403);
    const j = await jsonBody(req);
    if (j.key === 'biztax' && j.value != null) { const r = civ.saveConf(c, { biztax: j.value }, () => communities.saveSettings(c.id, c.settings)); return json(res, { ok: true, value: r.conf.biztax }); }   // the rate next to its switch
    const r = features.setMany(c, Array.isArray(j.keys) ? j.keys.map(String) : [String(j.key || '')], j.on, premium.isPremium(c)); return json(res, r, r.error ? 400 : 200); }
  // GPS road fixes the owner made on the map (a blocked road, a one-way, not a road, a parking lot); everyone's GPS routes around them
  if (rest === 'roads') { if (M === 'GET') return json(res, c.settings.roads || { ov: {} }); if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can change the roads.' }, 403);
    const j = await jsonBody(req), ov = {};
    for (const [k, v] of Object.entries(j.ov && typeof j.ov === 'object' ? j.ov : {}).slice(0, 2500)) { if (!/^(t_\d{1,4}_\d{1,4}_)?\d{1,4}_\d{1,4}$/.test(k) || !v || typeof v !== 'object') continue; const o = {};
      if (k.startsWith('t_')) { ov[k] = { t: 1 }; continue; }   // a tunnel the owner added between two road ends
      if ([1, -1, 0].includes(v.o)) o.o = v.o; if (v.b) o.b = 1; if (v.x) o.x = 1; if (v.l === 0 || v.l === 1) o.l = v.l; if (Object.keys(o).length) ov[k] = o; }
    const s = communities.byId(c.id).settings; s.roads = { ov, at: Date.now() }; communities.saveSettings(c.id, s); c.settings.roads = s.roads; f.bcast('roads', JSON.stringify(s.roads)); return json(res, s.roads); }
  if (rest === 'units' && M === 'GET') return json(res, { of: unitMembers.all(c.id), ride: rideWith.all(c.id), units: Object.fromEntries(['pd', 'fd', 'dot'].map(d => [d, c.settings.depts?.[d]?.units || []])) });
  if (rest === 'units/me' && M === 'POST') { if (!user.roblox_id) return json(res, { error: 'Link your Roblox account first.' }, 403);
    const unit = String((await jsonBody(req)).unit || '').trim(), all = ['pd', 'fd', 'dot'].flatMap(d => c.settings.depts?.[d]?.units || []);
    if (unit && !all.includes(unit)) return json(res, { error: 'That unit no longer exists. Pick another one.' }, 400);
    unitMembers.set(c.id, String(user.roblox_id), unit); const out = { of: unitMembers.all(c.id), ride: rideWith.all(c.id) }; f.bcast('unitsof', JSON.stringify(out)); return json(res, { ok: true, ...out }); }
  // the panic button in a unit's MDT: every open CAD on this server gets it at once, until someone clears it
  if (rest === 'panic' && M === 'POST') { const j = await jsonBody(req), num = v => Number.isFinite(+v) ? Math.round(+v * 10) / 10 : null, T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
    if (!['pd', 'fd', 'dot'].includes(j.dept)) return json(res, { error: 'Open your department\'s MDT first.' }, 400);
    const mine = f.activePanics().find(p => p.uid === user.id); if (mine) return json(res, { ok: true, panic: mine });   // already pressed: one at a time per person
    const p = { id: token(8), uid: user.id, by: user.roblox_name || user.name, rid: user.roblox_id || '', dept: j.dept, unit: T(j.unit, 40), crew: (Array.isArray(j.crew) ? j.crew : []).map(x => T(x, 40)).filter(Boolean).slice(0, 6),
      x: num(j.x), y: num(j.y), where: T(j.where, 80), at: Date.now() };
    f.panic(p); if (features.on(c, 'automations')) automations.fire(c, 'panic', { unit: p.unit, player: p.by, dept: p.dept, where: p.where }); console.log(`panic: ${c.slug} ${p.unit || p.by} (${p.dept}) at ${p.where || 'unknown'}`); return json(res, { ok: true, panic: p }); }
  if (rest === 'panic/clear' && M === 'POST') { const j = await jsonBody(req); const ok = f.panicClear(String(j.id || ''), user.roblox_name || user.name); return json(res, { ok }); }
  // unit status: the 10-code a unit picks shows on every MDT and on dispatch
  if (rest === 'status' && M === 'POST') { const j = await jsonBody(req), r = police.setStatus(c.id, j.unit, String(j.st || ''), user.roblox_name || user.name);
    if (r.ok) f.bcast('unitstatus', JSON.stringify({ unit: r.unit, st: r.st })); return json(res, r, r.error ? 400 : 200); }
  // the law enforcement MDT: lookups, warrants, BOLOs, citations, warnings, arrests and traffic stops, shared by the whole server
  // the Civilian tab (app/civ.mjs, businesses in app/civbiz.mjs): every member has an account, an ID, bills, a record and businesses
  if (rest.startsWith('civ/')) { const sub = rest.slice(4), st = () => { const s = civ.state(c, user, can(role, 'admin'), spawnedBy(c, user)); return s.off ? s : { ...s, ...civbiz.state(c, user) }; },
      ok = r => json(res, r.error ? r : { ...r, state: st() }, r.error ? 400 : 200);
    // players on a police, fire or DOT team in game don't use the Civilian tab (server staff, mod and up, excepted)
    if (M === 'POST' && !can(role, 'mod') && !['settings', 'grant', 'prop', 'biz/admin'].includes(sub)) { const side = liveSide(c, user);
      if (side && side !== 'civ') return json(res, { error: 'You’re on a department team in game. The Civilian tab is for players on the civilian team.' }, 403); }
    if (sub === 'state' && M === 'GET') return json(res, st());
    if (M !== 'POST') return json(res, { error: 'Not found.' }, 404);
    const j = await jsonBody(req);
    if (sub === 'settings') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can change this.' }, 403); return ok(civ.saveConf(c, j, () => communities.saveSettings(c.id, c.settings))); }
    if (sub === 'character') return ok(civ.saveChar(c, user, j));   // your ID works with the economy off too
    if (!civ.conf(c).on) return json(res, { error: 'The civilian economy is switched off on this server.' }, 403);
    if (sub === 'home' && !j.out) { const k = { rent: 'renting', mortgage: 'mortgages' }[j.how]; if (k && !features.on(c, k)) return off(k); }
    if (sub === 'pay') return ok(civ.pay(c, user, j.id));
    if (sub === 'autopay') return ok(civ.setAutopay(c, user, !!j.on));
    if (sub === 'stolen') { const v = police.vehicle(c.id, j.plate); if (v.error || String(v.vehicle.owner_rid) !== String(user.roblox_id)) return json(res, { error: 'That is not your car.' }, 403);
      police.setVehicle(c.id, v.vehicle.plate, { stolen: !!j.on }); return ok({ ok: true }); }
    if (sub === 'grant') { if (!can(role, 'admin')) return json(res, { error: 'Only admins and up can give or take money.' }, 403); return ok(civ.grant(c, user.roblox_name || user.name, j)); }
    if (sub === 'home') return ok(j.out ? civ.moveOut(c, user, j) : civ.moveIn(c, user, j));
    const BIZ = { 'biz/open': civ.openBiz, 'biz/edit': civ.editBiz, 'biz/cash': civ.bizCash, 'biz/close': civ.closeBiz, 'biz/decide': civ.decide, 'biz/staff': civ.staffSet, 'biz/invoice': civ.invoice, 'job/apply': civ.apply, 'job/quit': civ.quit };
    if (BIZ[sub]) return ok(BIZ[sub](c, user, j));
    if (sub === 'biz/clock') return ok(civbiz.clock(c, user, j, liveSide(c, user)));
    if (sub === 'biz/spot') return ok(civbiz.setSpot(c, user, j, posOf(c, user)));
    if (sub === 'biz/job') return ok(civbiz.startJob(c, user, j, posOf(c, user)));
    if (sub === 'biz/task') return ok(civbiz.takeTask(c, user, j, posOf(c, user)));
    if (sub === 'biz/game') return ok(civbiz.playGame(c, user, j));
    const BIZ2 = { 'biz/request': civbiz.request, 'biz/respond': civbiz.respond, 'biz/cancel': civbiz.cancelRequest, 'biz/item': civbiz.saveItem, 'biz/buy': civbiz.buy, 'biz/staffx': civbiz.staffx, 'biz/bonus': civbiz.bonus, 'biz/loan': civbiz.loan, 'biz/brand': civbiz.brand, 'biz/ad': civbiz.advertise, 'biz/review': civbiz.review };
    if (BIZ2[sub]) return ok(BIZ2[sub](c, user, j));
    if (sub === 'biz/admin') { if (!can(role, 'admin')) return json(res, { error: 'Only admins and up can do that.' }, 403); return ok(civ.bizAdmin(c, j)); }
    if (sub === 'prop') { if (!can(role, 'admin')) return json(res, { error: 'Only admins and up can manage homes.' }, 403); return ok(j.drop || j.evict ? civ.dropProp(c, j) : civ.saveProp(c, j)); }
    return json(res, { error: 'Not found.' }, 404); }
  // the police MDT answers players on a police team in game (owners and co-owners always; anyone while ER:LC data is unavailable)
  if (rest.startsWith('pd/') && rest !== 'pd/config' && !can(role, 'mod')) { const side = liveSide(c, user);
    if (side !== undefined && side !== 'pd') return json(res, { error: side ? 'The police MDT is for players on a police team in game.' : 'Join a police team in game to use the police MDT.' }, 403); }
  if (rest.startsWith('pd/')) { const sub = rest.slice(3), qs = new URL(req.url, 'http://x').searchParams, by = { uid: user.id, name: user.roblox_name || user.name, supervisor: police.isSupervisor(c.id, user.id, can(role, 'admin'), ranksFor(c, premium.isPremium(c)).pd) };
    const prem = premium.isPremium(c), cut = prem ? 0 : Date.now() - premium.FREE_RECORD_DAYS * 864e5, recent = L => cut ? L.filter(r => r.at >= cut || r.status === 'Active' || r.status === 'Pending') : L;   // free servers see the last 30 days
    if (sub === 'config' && M === 'GET') return json(res, { penal: police.PENAL, rank: police.pdRank(c.id, user.id), supervisor: by.supervisor, admin: can(role, 'admin'), me: by.name, premium: prem, recordDays: prem ? 0 : premium.FREE_RECORD_DAYS });
    if (sub === 'search' && M === 'GET') return json(res, police.search(c.id, qs.get('q')));
    if (sub === 'person' && M === 'GET') { const r = await police.person(c.id, qs.get('id') || qs.get('name'), licenseOf); if (r.history) r.history = recent(r.history);
      const who = r.person?.rid && users.byRoblox(r.person.rid); if (who && features.on(c, 'pd_character')) r.character = civ.charOf(c.id, who.id);   // the character they made in the Civilian tab
      return json(res, r, r.error ? 404 : 200); }
    if (sub === 'vehicle' && M === 'GET') { const r = police.vehicle(c.id, qs.get('plate')); if (r.history) r.history = recent(r.history); return json(res, r, r.error ? 404 : 200); }
    if (sub === 'vehicle' && M === 'POST') { const j = await jsonBody(req), r = police.setVehicle(c.id, j.plate, j); return json(res, r, r.error ? 400 : 200); }
    if (sub === 'records') { const k = M === 'GET' ? (features.RECORD[qs.get('kind')] || 'pd_records') : features.RECORD[String((req._body ||= await jsonBody(req)).kind)]; if (k && !features.on(c, k)) return off(k); }
    if (sub === 'records/act' && M === 'POST') { const j = req._body ||= await jsonBody(req), a = String(j.action || ''), k = ['backup', 'respond'].includes(a) ? 'pd_backup' : features.RECORD[police.record(c.id, j.id)?.kind]; if (k && !features.on(c, k)) return off(k); }
    if (sub === 'records' && M === 'GET') return json(res, { records: recent(police.list(c.id, { kind: qs.get('kind') || '', status: qs.get('status') || '', mine: qs.get('mine') === '1' }, user.id)) });
    if (sub === 'records' && M === 'POST') { const r = police.create(c.id, by, req._body); if (r.ok) { f.bcast('pdrec', JSON.stringify(r.record)); if (!(r.record.kind === 'warrant' && r.record.status === 'Pending')) recordEvent(c, r.record); } return json(res, r, r.error ? 400 : 200); }
    if (sub === 'records/act' && M === 'POST') { const j = req._body, r = police.act(c.id, by, j); if (r.ok && j.action === 'approve') recordEvent(c, r.record); if (r.ok) f.bcast('pdrec', JSON.stringify({ ...r.record, _act: String(j.action || ''), _by: by.name })); return json(res, r, r.error ? 400 : 200); }
    if (sub === 'records/delete' && M === 'POST') { if (!can(role, 'admin')) return json(res, { error: 'Only an admin can delete records.' }, 403); const id = +(await jsonBody(req)).id || 0; police.remove(c.id, id); f.bcast('pdrec', JSON.stringify({ id, _deleted: true })); return json(res, { ok: true }); }
    return json(res, { error: 'Not found.' }, 404); }
  // staff management (app/staffhub.mjs): shifts, the weekly board, staff records, leave, applications. Mod and up.
  if (rest.startsWith('sm/')) { if (!can(role, 'mod')) return json(res, { error: 'Staff only.' }, 403);
    const sub = rest.slice(3), qs = new URL(req.url, 'http://x').searchParams, ok = r => json(res, r.error ? r : { ...r, state: staffhub.state(c, user, role) }, r.error ? 400 : 200);
    if (sub === 'state' && M === 'GET') return json(res, staffhub.state(c, user, role));
    if (sub === 'person' && M === 'GET') { const id = +qs.get('id') || user.id; if (id !== user.id && !can(role, 'admin')) return json(res, { error: 'Only admins and up can see other staff records.' }, 403); const r = staffhub.person(c, id); return json(res, r, r.error ? 404 : 200); }
    if (sub === 'apps' && M === 'GET') { if (!can(role, 'admin')) return json(res, { error: 'Only admins and up can read applications.' }, 403); return json(res, { form: staffhub.form(c, qs.get('form')), apps: staffhub.apps(c, qs.get('form'), qs.get('status')) }); }
    if (M !== 'POST') return json(res, { error: 'Not found.' }, 404);
    const j = await jsonBody(req);
    if (sub === 'clock') return ok(staffhub.clock(c, user, String(j.action || ''), String(j.type || '')));
    if (sub === 'end-for') { if (!can(role, 'admin')) return json(res, { error: 'Only admins and up can end someone else’s shift.' }, 403); return ok(staffhub.endFor(c, user, j.user)); }
    if (sub === 'action') return ok(staffhub.addAction(c, user, role, j));
    if (sub === 'action/delete') return ok(staffhub.delAction(c, role, j.id));
    if (sub === 'leave') return ok(staffhub.requestLeave(c, user, j));
    if (sub === 'leave/decide') return ok(staffhub.decideLeave(c, user, role, j.id, !!j.approve));
    if (sub === 'leave/cancel') return ok(staffhub.cancelLeave(c, user, j.id));
    if (sub === 'settings') { if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner and co-owners can change this.' }, 403); staffhub.saveConf(c, j); return ok({ ok: true }); }
    if (sub === 'form') return ok(staffhub.saveForm(c, role, j));
    if (sub === 'form/delete') return ok(staffhub.delForm(c, role, j.id));
    if (sub === 'app/decide') return ok(staffhub.decideApp(c, user, role, j.id, !!j.accept, j.note, !!j.mod));
    return json(res, { error: 'Not found.' }, 404); }
  // signing in to a department's MDT with your license and rank; it stays until you sign out
  if (rest === 'mdt/signin' && M === 'POST') { const j = await jsonBody(req); if (!validRank(j.dept, j.rank, ranksFor(c, premium.isPremium(c)))) return json(res, { error: 'Pick your rank.' }, 400);
    mdtSignin.set(c.id, user.id, j.dept, j.rank); return json(res, { ok: true, mdt: mdtSignin.mine(c.id, user.id) }); }
  if (rest === 'mdt/signout' && M === 'POST') { const j = await jsonBody(req); if (!RANKS[j.dept]) return json(res, { error: 'Bad request.' }, 400); mdtSignin.out(c.id, user.id, j.dept); return json(res, { ok: true, mdt: mdtSignin.mine(c.id, user.id) }); }
  // ride with a teammate: you join their unit on the map and in dispatch (empty to ride alone again)
  if (rest === 'units/ride' && M === 'POST') { if (!user.roblox_id) return json(res, { error: 'Link your Roblox account first.' }, 403);
    const w = String((await jsonBody(req)).with || '').trim(); if (w && (!/^\d{1,20}$/.test(w) || w === String(user.roblox_id))) return json(res, { error: 'Pick a teammate to ride with.' }, 400);
    const R = rideWith.all(c.id); if (w && R[w] === String(user.roblox_id)) rideWith.set(c.id, w, '');   // they were riding with you: now you ride with them instead
    rideWith.set(c.id, String(user.roblox_id), w); const out = { of: unitMembers.all(c.id), ride: rideWith.all(c.id) }; f.bcast('unitsof', JSON.stringify(out)); return json(res, { ok: true, ...out }); }
  if (!can(role, 'co_owner')) return json(res, { error: 'Only the owner or a co-owner can do that.' }, 403);
  // jurisdiction boundaries: presets of areas per team, the live one enforced in game (app/bounds.mjs)
  if (rest === 'bounds' && M === 'GET') { const A = 2000 / 5355, cal = c.settings.cal || [], off = cal.length ? [0, 1].map(i => cal.reduce((t, p) => t + (i ? p.wy - A * p.sz : p.wx - A * p.sx), 0) / cal.length / A) : [0, 0];
    let players = []; try { if (f.snap && Date.now() - f.snap.t < 15000) players = (JSON.parse(f.snap.body).Players || []).filter(p => p.Location).map(p => ({ name: String(p.Player).split(':')[0], team: p.Team || '', x: p.Location.LocationX, z: p.Location.LocationZ })); } catch (e) {}
    return json(res, { bounds: bounds.of(c), log: bounds.log(c), teams: Object.keys(c.settings.teams || {}), depts: c.settings.teams, off, players, connected: !!communities.key(c.id) }); }
  if (rest === 'bounds' && M === 'POST') { const r = bounds.save(c, await jsonBody(req)); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'profile/refresh' && M === 'POST') { if (auth.limited(req, 'profref', 6, 60000)) return json(res, { error: 'Too many refreshes. Wait a minute.' }, 429); const r = await profile.refresh(c); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'profile/save' && M === 'POST') { const r = profile.save(c, await jsonBody(req)); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'profile/icon' && M === 'POST') { let j = {}; try { j = JSON.parse(await body(req, 5e5) || '{}'); } catch (e) {} const r = profile.setIcon(c, j.data); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'profile/icon/remove' && M === 'POST') return json(res, profile.clearIcon(c));
  if (rest === 'profile/photos' && M === 'POST') { let j = {}; try { j = JSON.parse(await body(req, 1.3e6) || '{}'); } catch (e) {} const r = profile.addPhoto(c, j.data); return json(res, r, r.error ? 400 : 200); }
  if (rest === 'profile/photos/remove' && M === 'POST') return json(res, profile.removePhoto(c, (await jsonBody(req)).id));
  if (rest === 'profile/photos/order' && M === 'POST') return json(res, profile.orderPhotos(c, (await jsonBody(req)).ids));
  if (rest === 'profile/photos/pos' && M === 'POST') { const j = await jsonBody(req), r = profile.posPhoto(c, j.id, j.x, j.y); return json(res, r, r.error ? 400 : 200); }
  // department units (Engine 1, K-9, ...) and who is in which, for the unit tags on the map; players set their own from the MDT
  if (rest === 'settings' && M === 'POST') { const j = await jsonBody(req), s = c.settings;
    const name = String(j.name || '').trim(); if (name.length < 2 || name.length > 48) return json(res, { error: 'The name must be 2 to 48 characters.' }, 400); if (rude(name)) return json(res, { error: RUDE_MSG }, 400);
    for (const d of ['pd', 'fd', 'dot']) { const n = String(j.depts?.[d]?.name || '').trim().slice(0, 40), sh = String(j.depts?.[d]?.short || '').trim().toUpperCase().slice(0, 6); if (!n || !sh) return json(res, { error: 'Every department needs a name and a short name.' }, 400); if (rude(n) || rude(sh)) return json(res, { error: RUDE_MSG }, 400);
      const raw = j.depts?.[d]?.units, units = [...new Set((Array.isArray(raw) ? raw : String(raw || '').split(',')).map(x => String(x).replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 20);
      if (units.some(x => x.length > 24)) return json(res, { error: 'Keep each unit name to 24 characters.' }, 400); if (units.some(x => rude(x))) return json(res, { error: RUDE_MSG }, 400);
      s.depts[d] = { name: n, short: sh, units }; }
    for (const [t, d] of Object.entries(j.teams || {})) if (t in s.teams && ['pd', 'fd', 'dot', ''].includes(d)) s.teams[t] = d;
    communities.rename(c.id, name); communities.saveSettings(c.id, s); return json(res, { ok: true }); }
  if (rest === 'codes' && M === 'POST') { const j = await jsonBody(req);
    if (j.role !== 'member') return json(res, { error: 'Servers only have an invite code now.' }, 400);
    const r = j.generate && j.role === 'member' ? auth.newMemberCode(c.id) : auth.setCode(c.id, j.role, j.code); return r.error ? json(res, { error: r.error }, 400) : json(res, r); }
  if (rest === 'invites' && M === 'POST') { const code = invites.create(c.id, user.id); return json(res, { code, url: `${origin(req)}/join/${code}` }); }
  if (rest === 'invites/revoke' && M === 'POST') { invites.revoke(c.id, String((await jsonBody(req)).code || '')); return json(res, { ok: true }); }
  if (rest.startsWith('discord')) {
    const d = c.settings.discord || null;
    if (rest === 'discord' && M === 'GET') { if (!d) return json(res, { ready: discordlink.ready(), linked: null });
      const roles = await discordlink.roles(d.guild_id).catch(e => ({ error: e.message })); return json(res, { ready: discordlink.ready(), linked: d, roles: Array.isArray(roles) ? roles : null, missing: roles === null, error: roles && roles.error, cmds: discordbot.connected() ? { feature: features.on(c, 'discordcmds'), list: discordbot.COMMANDS.map(x => '/' + x.name) } : null }); }
    if (rest === 'discord/save' && M === 'POST') { if (!d) return json(res, { error: 'Connect a Discord server first.' }, 400);
      const j = await jsonBody(req), known = new Set(((await discordlink.roles(d.guild_id).catch(() => [])) || []).map(r => r.id)), out = {};
      for (const lvl of discordlink.LEVELS) out[lvl] = [...new Set((Array.isArray(j.roles?.[lvl]) ? j.roles[lvl] : []).map(String).filter(id => known.has(id)))].slice(0, 25);
      c.settings.discord = { ...d, roles: out }; communities.saveSettings(c.id, c.settings); discordlink.forget(d.guild_id); return json(res, { ok: true, roles: out }); }
    if (rest === 'discord/commands' && M === 'POST') { if (!d) return json(res, { error: 'Connect a Discord server first.' }, 400); if (!discordbot.connected()) return json(res, { error: 'Discord commands aren’t switched on for Oversite yet.' }, 400);
      const r = await addCommands(c); return json(res, r, r.error ? 400 : 200); }
    if (rest === 'discord/unlink' && M === 'POST') { delete c.settings.discord; communities.saveSettings(c.id, c.settings); if (d) discordlink.forget(d.guild_id); return json(res, { ok: true }); }
    return json(res, { error: 'Not found.' }, 404); }
  if (rest === 'members/role' && M === 'POST') { const j = await jsonBody(req), target = members.role(c.id, +j.userId);
    if (!['member', 'mod', 'admin', 'co_owner'].includes(j.role)) return json(res, { error: 'Unknown rank.' }, 400);
    const boss = user.id === c.owner_id, mine = boss ? 6 : ROLE_RANK[role];   // the server's creator outranks everyone, owner-code Owners included
    if (!target || +j.userId === user.id || +j.userId === c.owner_id || !(ROLE_RANK[target] < mine) || !(ROLE_RANK[j.role] < mine)) return json(res, { error: 'You can only change the rank of people below you, to a rank below yours.' }, 403);
    members.setRole(c.id, +j.userId, j.role); return json(res, { ok: true }); }
  if (rest === 'members/remove' && M === 'POST') { const j = await jsonBody(req), target = members.role(c.id, +j.userId);
    const boss = user.id === c.owner_id;
    if (!target || +j.userId === user.id || +j.userId === c.owner_id || !(boss || (target !== 'owner' && ROLE_RANK[target] < ROLE_RANK[role]))) return json(res, { error: 'That member cannot be removed.' }, 400);
    members.remove(c.id, +j.userId); return json(res, { ok: true }); }
  if (rest === 'delete' && M === 'POST') { if (!can(role, 'owner')) return json(res, { error: 'Only the owner can delete the community.' }, 403);
    if ((await jsonBody(req)).confirm !== c.slug) return json(res, { error: 'Type the address to confirm.' }, 400);
    if (premium.renews(c)) return json(res, { error: 'This server has a Premium subscription that renews. Cancel it under Premium, Manage billing, then delete the server.' }, 400);
    communities.remove(c.id); feeds.delete(c.id); return json(res, { ok: true }); }
  return json(res, { error: 'Not found.' }, 404); };
const legacyKey = id => { if (existsSync(LEGACY_KEY) && !communities.all().some(c => c.erlc_key)) { try { const k = readFileSync(LEGACY_KEY, 'utf8').trim(); if (k) { communities.setKey(id, k); renameSync(LEGACY_KEY, LEGACY_KEY + '.migrated'); } } catch (e) {} } };   // the first server keeps the key the site already had
const origin = req => (process.env.PUBLIC_URL || `${(req.headers['x-forwarded-proto'] || 'http').split(',')[0]}://${req.headers.host}`).replace(/\/$/, '');

// ── bot API (Premium): a server's own Discord bot reads its CAD. Read-only, 60 requests a minute per key ──
const botHits = new Map();
const botApi = async (req, res, rest) => { if (req.method !== 'GET') return json(res, { error: 'Read-only.' }, 405);
  const key = String(req.headers.authorization || '').replace(/^(Bot|Bearer)\s+/i, '').trim(), c = premium.serverForBotKey(key);
  if (!c) return json(res, { error: 'Unknown key. Make one in your server\'s Settings, under Premium.' }, 401);
  if (c.suspended) return json(res, { error: 'This server is suspended.' }, 403);
  if (!premium.isPremium(c)) return json(res, { error: 'This server\'s Premium has ended, so its bot key is paused.' }, 402);
  const now = Date.now(), h = (botHits.get(c.id) || []).filter(t => now - t < 60000); if (h.length >= 60) return json(res, { error: 'Slow down: 60 requests a minute.' }, 429); h.push(now); botHits.set(c.id, h);
  const f = feedFor(c), s = await f.snapshot(); let j = {}; try { j = JSON.parse(s.body); } catch (e) {}
  const live = s.status === 200, st = police.statuses(c.id), qs = new URL(req.url, 'http://x').searchParams;
  if (rest === 'server') return json(res, { name: c.name, slug: c.slug, live, players: live ? (j.Players || []).length : null, max: j.MaxPlayers ?? null, calls: live ? (j.EmergencyCalls || []).length : null });
  if (rest === 'players') return json(res, { live, players: (j.Players || []).map(p => { const [name, id] = String(p.Player || '').split(':'); return { name, id, team: p.Team || '', callsign: p.Callsign || null, postal: p.Location?.PostalCode || null, street: p.Location?.StreetName || null }; }) });
  if (rest === 'calls') return json(res, { live, calls: (j.EmergencyCalls || []).map(k => ({ number: k.CallNumber, team: k.Team, description: k.Description || '', where: k.PositionDescriptor || '', started: k.StartedAt ? k.StartedAt * 1000 : null })) });
  if (rest === 'status') return json(res, { units: st });
  if (rest === 'records') return json(res, { records: police.list(c.id, { kind: ['warrant', 'citation', 'warning', 'arrest', 'bolo', 'stop'].includes(qs.get('kind')) ? qs.get('kind') : '', status: qs.get('status') === 'open' ? 'open' : '' }).slice(0, 100) });
  return json(res, { error: 'Not found. Try server, players, calls, status or records.' }, 404); };
// custom license (Premium): the card's title, color and seal
const saveLicenseStyle = (c, j) => { if (!premium.isPremium(c)) return { error: 'A custom license comes with Premium.' };
  const title = String(j.title || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 22), color = /^#[0-9a-fA-F]{6}$/.test(j.color || '') ? j.color : '#38542A';
  const s = communities.byId(c.id).settings; s.licenseStyle = j.reset ? null : { title: title || c.name.slice(0, 22), color, seal: j.seal === 'icon' ? 'icon' : 'default' }; communities.saveSettings(c.id, s);
  return { ok: true, license: s.licenseStyle }; };

const globalApi = async (req, res, rest) => {
  // Stripe tells us about payments here; the signature is checked against the raw body
  if (rest === 'stripe/webhook' && req.method === 'POST') { const raw = await body(req, 5e5); let r; try { r = await premium.webhook(raw, req.headers['stripe-signature']); if (r?.error) alerts.send('stripe', 'A Stripe webhook was turned away', `${r.error} If payments are going through, check the webhook signing secret on /admin.`, 'warn'); } catch (e) { console.log('stripe webhook:', e.message); alerts.send('stripe', 'A Stripe webhook failed', e.message, 'crit'); return json(res, { error: 'Try again.' }, 500); }
    return json(res, r, r.status || 200); }
  // the Oversite bot's slash commands: Discord signs each one, and anything unsigned is turned away
  if (rest === 'discord/interactions' && req.method === 'POST') { const raw = await body(req, 1e5);
    if (!await discordbot.signed(raw, String(req.headers['x-signature-ed25519'] || ''), String(req.headers['x-signature-timestamp'] || ''))) return json(res, { error: 'Bad signature.' }, 401);
    let x; try { x = JSON.parse(raw); } catch (e) { return json(res, { error: 'Bad request.' }, 400); } return json(res, await discordbot.handle(x)); }
  // a Premium server's own Discord bot reads its CAD with the key from Settings: Authorization: Bot <key>
  if (rest.startsWith('bot/v1/')) return botApi(req, res, rest.slice(7));
  const user = auth.currentUser(req); if (rest === 'explore' && req.method === 'GET') return json(res, { servers: profile.directory(user) });   // Explore's live refresh: open to everyone
  if (!user) return json(res, { error: 'Sign in first.' }, 401);
  // the verification page; anyone else gets a plain not-found
  if (rest === 'me/ping') return json(res, { ok: true });   // open pages check in; a suspended account gets 403 before this and reloads
  // your Liberty County license for the MDT card reader
  // Premium for your own account: buy it, manage it, see what it boosts
  if (rest === 'me/premium' && req.method === 'GET') return json(res, premium.userInfo(user));
  if ((rest === 'me/premium/checkout' || rest === 'me/premium/portal') && req.method === 'POST') { if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); if (!user.roblox_id) return json(res, { error: 'Link your Roblox account first.' }, 403);
    try { const r = rest.endsWith('checkout') ? await premium.checkoutUser(user, String((await jsonBody(req)).plan || ''), origin(req)) : await premium.portalUser(user, origin(req)); return json(res, r, r.error ? 400 : 200); }
    catch (e) { console.log(`premium account ${rest}: ${user.roblox_name}: ${e.message}`); return json(res, { error: 'Payments could not be reached. Try again in a minute.' }, 502); } }
  // your own MDT setup (Premium): sounds, the tablet's look, the map style; every server's CAD uses it
  if (rest === 'me/beta' && req.method === 'POST') { if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400);
    if (!premium.userInfo(user).on) return json(res, { error: 'Early access comes with Premium.' }, 403); premium.setBeta(user.id, !!(await jsonBody(req)).on); return json(res, { ok: true, on: premium.betaOn(user.id) }); }
  if (rest === 'me/mdt' && req.method === 'GET') return json(res, { premium: premium.userInfo(user).on, setup: mdtprefs.get(user.id), defaults: mdtprefs.DEFAULTS });
  if (rest === 'me/mdt' && req.method === 'POST') { if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400);
    if (!premium.userInfo(user).on) return json(res, { error: 'Your own MDT setup comes with Premium.' }, 403); return json(res, { ok: true, setup: mdtprefs.save(user.id, await jsonBody(req)) }); }
  if (rest === 'me/license' && req.method === 'GET') return json(res, await licenseOf(user, premium.userInfo(user).on));
  if (rest === 'me/license' && req.method === 'POST') { if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); if (!user.roblox_id) return json(res, { error: 'Link your Roblox account first.' }, 403);
    return json(res, await saveLicense(user, await jsonBody(req), premium.userInfo(user).on)); }
  if (rest.startsWith('admin/') && !isSiteMod(user)) return json(res, { error: 'Not found.' }, 404);
  // payments, the ER:LC application, Premium grants and moderator access: site admins only
  if (/^admin\/(erlc-app|premium|stripe|mod|supporter|beta-note|alerts|backup|discordcmds)$/.test(rest) && !isSiteAdmin(user)) return json(res, { error: 'Only Oversite\'s owners can do that.' }, 403);
  if (rest === 'admin/mod' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req), u = users.byId(Number(j.id)); if (!u) return json(res, { error: 'No such person.' }, 404);
    if (isSiteAdmin(u)) return json(res, { error: 'That person is a site admin already.' }, 400); users.setSiteMod(u.id, !!j.on);
    console.log(`moderation: ${user.roblox_name || user.name} ${j.on ? 'made' : 'removed'} ${u.roblox_name || u.id} ${j.on ? 'a moderator' : 'as moderator'}`); return json(res, { ok: true, on: !!j.on }); }
  if (rest === 'admin/people' && req.method === 'GET') return json(res, { people: users.search(new URL(req.url, 'http://x').searchParams.get('q')) });   // read-only: the server browser's live refresh
  if (req.headers['x-oversite'] !== '1') return json(res, { error: 'Bad request.' }, 400);
  // Oversite's ER:LC application (needed to serve more than one server): its Global API Key, sealed, and its App ID; then a live check
  if (rest === 'admin/erlc-app' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req);
    const k = String(j.key || '').trim(), id = String(j.appId || '').trim();
    if (id && !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return json(res, { error: 'Paste the Client ID shown on your app\'s page on the ER:LC dashboard.' }, 400);
    if (k && (k.length < 16 || k.length > 400 || /\s/.test(k))) return json(res, { error: 'That does not look like a Global API Key. Copy it again from the ER:LC dashboard.' }, 400);
    if (k) siteSettings.set('erlc_app_key', seal(k)); if (id) siteSettings.set('erlc_app_id', id); if (j.clear) { siteSettings.set('erlc_app_key', ''); siteSettings.set('erlc_app_id', ''); } appKeyChanged();
    console.log(`erlc app: ${user.discord_id} ${j.clear ? 'cleared' : 'updated'} the application settings`);
    return json(res, await erlcAppStatus(true)); }
  if (rest === 'admin/erlc-app' && req.method === 'GET') return json(res, await erlcAppStatus(true));
  // Premium by hand: days (30, 90, 365), forever, or off
  if (rest === 'admin/premium' && req.method === 'POST' && (req._body = await jsonBody(req)).user) { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = req._body, u = users.byId(Number(j.user)); if (!u) return json(res, { error: 'No such person.' }, 404);
    const until = premium.setUserUntil(u.id, j.off ? 0 : j.forever ? 4102444800000 : Number(j.until) || 0);
    console.log(`premium: person ${u.roblox_name || u.id} ${until ? 'has Premium until ' + new Date(until).toISOString().slice(0, 10) : 'turned off'} by ${user.roblox_name || user.name}`); return json(res, { ok: true, until }); }
  if (rest === 'admin/premium' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = req._body || await jsonBody(req), c = communities.byId(Number(j.id)); if (!c) return json(res, { error: 'No such server.' }, 404);
    if (j.off) premium.revoke(c.id); else if (j.until || j.forever) premium.setUntil(c.id, j.forever ? 4102444800000 : Number(j.until), user.roblox_name || user.name); else premium.grant(c.id, Math.min(3650, Math.max(1, Number(j.days) || 30)), user.roblox_name || user.name);
    console.log(`premium: ${c.slug} ${j.off ? 'turned off' : j.forever ? 'granted forever' : j.until ? 'granted until ' + new Date(+j.until).toISOString().slice(0, 10) : 'granted ' + j.days + ' days'} by ${user.roblox_name || user.name}`); return json(res, { ok: true, premium: premium.info(c) }); }
  // Stripe keys for selling Premium, sealed like the ER:LC key
  // Oversite's own Discord: which server and role Premium people get (the Supporter role), and the invite link shown to them
  if (rest === 'admin/supporter' && req.method === 'GET') return json(res, await supporter.status(String(new URL(req.url, 'http://x').searchParams.get('guild') || '').replace(/\D/g, '')));
  if (rest === 'admin/supporter' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const r = await supporter.configure(await jsonBody(req)); return json(res, r.error ? r : await supporter.status(), r.error ? 400 : 200); }
  if (rest === 'admin/beta-note' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const n = String((await jsonBody(req)).note || '').trim().slice(0, 300); siteSettings.set('beta_note', n); return json(res, { ok: true, note: n }); }
  if (rest === 'admin/stripe' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req), k = String(j.key || '').trim(), w = String(j.whsec || '').trim();
    if (k && !/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,200}$/.test(k)) return json(res, { error: 'That is not a Stripe secret key. It starts with sk_live_ or sk_test_.' }, 400);
    if (w && !/^whsec_[A-Za-z0-9]{10,200}$/.test(w)) return json(res, { error: 'That is not a webhook signing secret. It starts with whsec_.' }, 400);
    if (k) siteSettings.set('stripe_key', seal(k)); if (w) siteSettings.set('stripe_whsec', seal(w)); if (j.clear) { siteSettings.set('stripe_key', ''); siteSettings.set('stripe_whsec', ''); }
    if (j.clear) siteSettings.set('stripe_portal', '');
    console.log(`stripe: keys ${j.clear ? 'cleared' : 'updated'} by ${user.roblox_name || user.name}`);
    if (k && !w) { try { const r = await premium.setupStripe(origin(req), seal); console.log('stripe: webhook and billing page set up'); return json(res, { ...r, check: 'Saved. Oversite set up its webhook and billing page in Stripe. Premium payments are on.' }); }   // only the key: finish the rest automatically
      catch (e) { console.log('stripe setup:', e.message); return json(res, { ...premium.stripeStatus(), error: undefined, check: 'Key saved, but Stripe said: ' + e.message }); } }
    return json(res, premium.stripeStatus()); }
  // alerts and backups: the Discord webhook alerts go to, a test message, the off-site copy, and a backup now
  if (rest === 'admin/alerts' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req), u = String(j.hook || '').trim();
    if (u && !alerts.okHook(u)) return json(res, { error: 'That isn’t a Discord webhook link. In Discord: channel settings, Integrations, Webhooks, Copy Webhook URL.' }, 400);
    if (u) alerts.setHook(u); if (j.clear) alerts.setHook(''); if (j.offsite != null) backup.setOffsite(!!j.offsite);
    if (u || j.test) { const r = await alerts.send('test', 'Oversite alerts are on', `Set up by ${user.roblox_name || user.name}. Problems that need a person will show up here.`, 'info', true); if (r.error) return json(res, { ...alertsInfo(), error: r.error }, 400); }
    console.log(`alerts: ${j.clear ? 'webhook cleared' : u ? 'webhook set' : 'settings changed'} by ${user.roblox_name || user.name}`); return json(res, alertsInfo()); }
  // the Oversite bot's slash commands: where the Discord application sends them, and pointing it at Oversite (or back)
  if (rest === 'admin/discordcmds' && req.method === 'GET') return json(res, await discordCmdsInfo());
  if (rest === 'admin/discordcmds' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req);
    const r = j.off ? await discordbot.disconnect(interactionsUrl()) : await discordbot.connect(interactionsUrl());
    console.log(`discord commands: ${j.off ? 'disconnected' : 'connected'} by ${user.roblox_name || user.name}${r.error ? ' (failed: ' + r.error + ')' : ''}`);
    if (!r.error && !j.off) addCommandsEverywhere(); return json(res, { ...(await discordCmdsInfo()), error: r.error, note: r.note || undefined }, r.error ? 400 : 200); }
  if (rest === 'admin/backup' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const r = await backup.run('by hand'); return json(res, { ...alertsInfo(), ...r }, r.error ? 500 : 200); }
  if (rest === 'admin/support' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); support.close(Number((await jsonBody(req)).id)); return json(res, { tickets: support.open() }); }
  if (rest === 'admin/verify' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req), id = Number(j.id);
    const n = j.kind === 'server' ? communities.setVerified(id, !!j.on) : j.kind === 'user' ? users.setVerified(id, !!j.on) : 0;
    if (!n) return json(res, { error: 'Not found.' }, 404); console.log(`verify: ${user.discord_id} set ${j.kind} ${id} ${j.on ? 'on' : 'off'}`); return json(res, { ok: true }); }
  // join a server's CAD straight from Explore, when its owner allows open joining
  if (rest === 'explore/join' && req.method === 'POST') { if (!user.roblox_name) return json(res, { error: 'Link your Roblox account to join a server.' }, 403);
    const c = visible((await jsonBody(req)).slug); if (!c) return json(res, { error: 'That server is not listed.' }, 404);
    if (!members.role(c.id, user.id)) { if (!c.settings.profile?.open_join) return json(res, { error: 'This server takes new members with its invite code. Ask them for it, or join their Discord.' }, 403); members.add(c.id, user.id, 'member'); }
    return json(res, { ok: true, next: `/${c.slug}` }); }
  if (rest === 'reviews' && req.method === 'POST') { if (!user.roblox_name) return json(res, { error: 'Link your Roblox account to write a review.' }, 403);
    const j = await jsonBody(req), c = visible(j.slug); if (!c) return json(res, { error: 'That server is not listed.' }, 404);
    if (runsServer(c.id, user.id)) return json(res, { error: 'You can\'t review a server you run.' }, 403);
    const rating = Number(j.rating), body = String(j.body || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return json(res, { error: 'Pick a star rating from 1 to 5.' }, 400);
    if (body.length < 10) return json(res, { error: 'Write at least a sentence about the server.' }, 400);
    if (body.length > 600) return json(res, { error: 'Keep the review to 600 characters.' }, 400);
    if (rude(body)) return json(res, { error: 'Your review has a word that isn\'t allowed on Oversite. Please change it.' }, 400);
    if (!reviews.mine(c.id, user.id) && reviews.newToday(user.id) >= 5) return json(res, { error: 'You have written a lot of reviews today. Please try again tomorrow.' }, 429);
    reviews.save(c.id, user.id, rating, body); return json(res, { ok: true, list: reviewList(c.id) }); }
  if (rest === 'reviews/delete' && req.method === 'POST') { const r = reviews.byId(Number((await jsonBody(req)).id)); if (!r) return json(res, { error: 'That review is already gone.' }, 404);
    if (r.user_id !== user.id && !isSiteMod(user)) return json(res, { error: 'You can only delete your own review.' }, 403);
    reviews.remove(r.id); reports.resolveReview(r.id, 'removed'); if (r.user_id !== user.id) console.log(`moderation: ${user.discord_id} removed review ${r.id} on server ${r.community_id}`);
    return json(res, { ok: true, list: reviewList(r.community_id) }); }
  if (rest === 'reviews/reply' && req.method === 'POST') { const j = await jsonBody(req), r = reviews.byId(Number(j.id)); if (!r) return json(res, { error: 'That review is gone.' }, 404);
    if (!runsServer(r.community_id, user.id)) return json(res, { error: 'Only the owner and co-owners can reply.' }, 403);
    const text = String(j.reply || '').replace(/\r/g, '').trim(); if (text.length > 400) return json(res, { error: 'Keep the reply to 400 characters.' }, 400);
    if (rude(text)) return json(res, { error: RUDE_MSG }, 400);
    reviews.reply(r.id, text, user.id); return json(res, { ok: true, list: reviewList(r.community_id) }); }
  if (rest === 'reviews/report' && req.method === 'POST') { if (!user.roblox_name) return json(res, { error: 'Link your Roblox account to report a review.' }, 403);
    const r = reviews.byId(Number((await jsonBody(req)).id)); if (!r) return json(res, { error: 'That review is gone.' }, 404); if (r.user_id === user.id) return json(res, { error: 'That is your own review.' }, 400);
    if (reports.sameReview(user.id, r.id)) return json(res, { error: 'You already reported this review. Thanks, we have it.' }, 429);
    if (reports.byUserSince(user.id, Date.now() - 864e5) >= 10) return json(res, { error: 'You have sent a lot of reports today. Please try again tomorrow.' }, 429);
    reports.add(r.community_id, user.id, 'review', '', r.id); return json(res, { ok: true }); }
  if (rest === 'admin/review' && req.method === 'POST') { if (!isSiteMod(user) || !sameOrigin(req)) return json(res, { error: 'Not found.' }, 404); const id = Number((await jsonBody(req)).id);
    reviews.remove(id); reports.resolveReview(id, 'removed'); console.log(`moderation: ${user.discord_id} removed review ${id}`); return json(res, { ok: true, servers: communities.overview(), reports: reports.open() }); }
  if (rest === 'explore/report' && req.method === 'POST') { if (!user.roblox_name) return json(res, { error: 'Link your Roblox account to report a server.' }, 403);
    const j = await jsonBody(req), c = communities.bySlug(String(j.slug || '')), reason = String(j.reason || ''), details = String(j.details || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!c || c.settings.profile?.unlisted) return json(res, { error: 'That server is not listed.' }, 404);
    if (!REPORT_REASONS[reason]) return json(res, { error: 'Pick a reason.' }, 400);
    if (reason === 'other' && details.length < 4) return json(res, { error: 'Tell us what is wrong.' }, 400);
    const day = Date.now() - 864e5; if (reports.sameSince(user.id, c.id, day)) return json(res, { error: 'You already reported this server today. Thanks, we have it.' }, 429);
    if (reports.byUserSince(user.id, day) >= 10) return json(res, { error: 'You have sent a lot of reports today. Please try again tomorrow.' }, 429);
    reports.add(c.id, user.id, reason, details); return json(res, { ok: true }); }
  if (rest === 'admin/server' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req), c = communities.byId(Number(j.id)); if (!c) return json(res, { error: 'Not found.' }, 404);
    const act = String(j.action || '');
    if (act === 'hide' || act === 'show') { communities.setFlag(c.id, 'hidden', act === 'hide'); if (act === 'hide') reports.resolveFor(c.id, 'hidden'); }
    else if (act === 'suspend' || act === 'unsuspend') { communities.setFlag(c.id, 'suspended', act === 'suspend'); if (act === 'suspend') { reports.resolveFor(c.id, 'suspended'); feeds.get(c.id)?.kick(); } }
    else if (act === 'reset_icon') profile.clearIcon(c);
    else if (act === 'clear_photos') profile.clearPhotos(c);
    else if (act === 'clear_bio') profile.clearBio(c);
    else return json(res, { error: 'Unknown action.' }, 400);
    console.log(`moderation: ${user.discord_id} ${act} server ${c.id} (${c.slug})`); return json(res, { ok: true, servers: communities.overview(), reports: reports.open() }); }
  if (rest === 'admin/person' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req), act = String(j.action || ''), id = Number(j.id);
    if (act !== 'suspend' && act !== 'unsuspend') return json(res, { error: 'Unknown action.' }, 400);
    const target = users.byId(id); if (!target) return json(res, { error: 'Not found.' }, 404); if (isSiteMod(target) && !isSiteAdmin(user)) return json(res, { error: 'Only a site admin can suspend a moderator.' }, 403); if (isSiteAdmin(target)) return json(res, { error: 'You can\'t suspend a site admin.' }, 400);
    users.setSuspended(id, act === 'suspend'); if (act === 'suspend') for (const fd of feeds.values()) fd.kick(id);   // their open CADs reload into the suspension at once
    console.log(`moderation: ${user.discord_id} ${act} person ${id} (${target.roblox_name || target.name})`); return json(res, { ok: true }); }
  if (rest === 'admin/report' && req.method === 'POST') { if (!sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400); const j = await jsonBody(req);
    if (!reports.resolve(Number(j.id), 'dismissed')) return json(res, { error: 'That report is already closed.' }, 404); return json(res, { ok: true, servers: communities.overview(), reports: reports.open() }); }
  if (rest === 'explore/vote' && req.method === 'POST') { if (!user.roblox_name) return json(res, { error: 'Link your Roblox account to vote.' }, 403); const r = profile.vote(user, (await jsonBody(req)).slug); return json(res, r, r.error ? 429 : 200); }
  if (rest === 'communities' && req.method === 'POST') { const j = await jsonBody(req), name = String(j.name || '').trim(), slug = String(j.slug || '').trim().toLowerCase();
    if (name.length < 2 || name.length > 48) return json(res, { error: 'The name must be 2 to 48 characters.' }, 400);
    if (!/^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(slug) || slug.includes('--')) return json(res, { error: 'The address must be 3 to 32 lowercase letters, numbers or single dashes.' }, 400);
    if (RESERVED.has(slug) || communities.bySlug(slug)) return json(res, { error: 'That address is taken. Try another.' }, 409);
    if (communities.forUser(user.id).filter(c => c.role === 'owner').length >= 10) return json(res, { error: 'You can own up to 10 communities.' }, 400);
    const r = auth.createServer(req, user, { name, slug, inviteCode: j.inviteCode ?? j.ownerCode }, RESERVED); if (r.error) return json(res, { error: r.error }, 400); legacyKey(r.id); requireDiscord(r.id); return json(res, { slug, next: nextAfterCreate(slug) }); }
  if (rest === 'roblox/start' && req.method === 'POST') { const r = await auth.robloxStart(user, (await jsonBody(req)).username); return r.error ? json(res, { error: r.error }, 400) : json(res, r); }
  if (rest === 'roblox/verify' && req.method === 'POST') { const r = await auth.robloxVerify(user); if (r.error) return json(res, { error: r.error }, 400); return json(res, r, 200, r.mergedInto ? { 'set-cookie': auth.signIn(req, r.mergedInto) } : {}); }
  if (rest === 'roblox/cancel' && req.method === 'POST') { roblox.clear(user.id); return json(res, { ok: true }); }
  if (rest === 'roblox/unlink' && req.method === 'POST') { auth.robloxUnlink(user); return json(res, { ok: true }); }
  if (rest === 'leave' && req.method === 'POST') { const c = communities.bySlug(String((await jsonBody(req)).slug || '')), role = c && members.role(c.id, user.id);
    if (!role) return json(res, { error: 'You are not in that server.' }, 400); if (role === 'owner') return json(res, { error: 'Owners cannot leave their own server.' }, 400);
    members.remove(c.id, user.id); return json(res, { ok: true }); }
  return json(res, { error: 'Not found.' }, 404); };

export const REPORT_REASONS = { name: 'Inappropriate name', icon: 'Inappropriate icon', bio: 'Inappropriate bio', fake: 'Fake or misleading', other: 'Something else' };
const REVIEW_REASON = 'Review';
// a listed, visible server and its reviews, as the server page shows them
// is the application key set, and does ER:LC accept it? (checked against a connected server, as a normal read)
const erlcAppStatus = async live => { const out = { hasKey: !!appKey(), fromEnv: !!(process.env.ERLC_API_KEY || '').trim(), appId: appId(), check: '' };
  if (!live || !out.hasKey) return out; const c = communities.all().find(x => x.erlc_key); const key = c && communities.key(c.id); if (!key) { out.check = 'No server is connected yet to test with.'; return out; }
  try { const r = await fetch((process.env.ERLC_UPSTREAM || 'https://api.erlc.gg') + '/v2/server', { headers: erlcHeaders(key) }), j = await r.json().catch(() => ({}));
    out.ok = r.ok; out.check = r.ok ? 'ER:LC accepts the key.' : j.code === 2003 ? 'ER:LC says this Global API Key is invalid. Copy it again, or regenerate it.' : `ER:LC answered ${r.status}${j.message ? ': ' + j.message : ''}`; out.bucket = r.headers.get('x-ratelimit-bucket') || ''; }
  catch (e) { out.check = 'Could not reach ER:LC right now.'; } return out; };
const visible = slug => { const c = communities.bySlug(String(slug || '')); return c && !c.settings.profile?.unlisted && !c.hidden && !c.suspended ? c : null; };
const reviewList = cid => reviews.forServer(cid).map(r => ({ id: r.id, user_id: r.user_id, rating: r.rating, body: r.body, created: r.created, updated: r.updated, reply: r.reply, reply_name: r.reply_name || '', reply_verified: !!r.reply_verified, roblox_name: r.roblox_name, roblox_id: r.roblox_id, verified: !!r.verified }));
const runsServer = (cid, uid) => ['owner', 'co_owner'].includes(members.role(cid, uid));
const SUSPENDED_OK = /^\/(privacy|terms|refunds|health|auth\/logout|liberty-county\.jpg|intro-splash\.js|dropdown\.js|favicon\.ico|icon-[a-z0-9-]+\.(png|svg)|apple-touch-icon(-precomposed)?\.png|manifest\.webmanifest|rbx\/(avatar|bust)\/\d+|support|api\/support)$/;
// ── routes ──
const route = async (req, res) => {
  const url = new URL(req.url, 'http://x'); let path = decodeURIComponent(url.pathname), m0, m0r, aboutPage = false;
  // short addresses: oversitescad.com/<server> is the CAD for its members and the server's page for everyone else;
  // /<server>/about is always the server page, /<server>/settings is its settings and /<server>/prox its proximity voice.
  // The old /c/<server> and /s/<server> addresses still work and move to the short ones.
  const old = req.method === 'GET' && path.match(/^\/(c|s)\/([a-z0-9-]{3,32})(\/(?:settings|voice))?\/?$/);
  if (old && !RESERVED.has(old[2])) return redirect(res, `/${old[2]}${old[1] === 's' ? '' : old[3] === '/voice' ? '/prox' : old[3] || ''}${url.search}`, { 'cache-control': 'no-store' }, 301);
  // /<server>/vote is the link servers share to get votes: their page, opened on the vote prompt. The invite code works in place of the address.
  const vl = req.method === 'GET' && path.match(/^\/([A-Za-z0-9-]{2,32})\/vote\/?$/), vs = vl && vl[1].toLowerCase();
  if (vl && (vs !== vl[1] || !communities.bySlug(vs) || RESERVED.has(vs))) { const bySlug = !RESERVED.has(vs) && communities.bySlug(vs), hit = bySlug ? { c: bySlug } : auth.inviteByCode(req, vl[1]);
    if (hit?.c) return redirect(res, `/${hit.c.slug}/vote`, { 'cache-control': 'no-store' });
    return msg(res, auth.currentUser(req), hit?.error ? 'Too many tries' : 'Server not found', hit?.error || 'Check the vote link, or find the server on Explore.', { href: '/explore', label: 'Explore servers' }, hit?.error ? 429 : 404); }
  const short = path.match(/^\/([a-z0-9-]{3,32})(\/(?:settings|prox|about|vote|staff|apply\/\d{1,9}))?\/?$/), sc = short && !RESERVED.has(short[1]) && communities.bySlug(short[1]);
  if (sc) { const sub = short[2] || '', u = auth.currentUser(req); if (u) staffRole(sc, u);
    if (sub === '/vote') { path = `/s/${sc.slug}`; aboutPage = true; req.votePrompt = true; }
    else if (sub === '/about' || (!sub && !(u && members.role(sc.id, u.id)) && visible(sc.slug))) { path = `/s/${sc.slug}`; aboutPage = true; }
    else if (sub === '/prox') { path = `/c/${sc.slug}/voice`; req.prox = true; }
    else path = `/c/${sc.slug}${sub}`; }
  const me0 = auth.currentUser(req);
  if (me0?.suspended && !isSiteAdmin(me0) && !SUSPENDED_OK.test(path)) { if (path.startsWith('/api/') || /^\/c\/[^/]+\/api\//.test(path)) return json(res, { error: 'Your account is suspended.' }, 403);
    return msg(res, me0, 'Your account is suspended', 'Oversite has suspended this account for breaking the Terms of Use, so you can\'t use the CAD or Explore right now. If you think this is a mistake, contact support.', { href: '/support?topic=account', label: 'Contact support' }, 403); }
  if (path === '/health') { let w = 0, perMin = 0; const live = [], errs = {}; for (const f of feeds.values()) { w += f.clients.size; perMin += f.sent.length; if (f.clients.size && f.rtt) live.push(f.stats()); const er = f.stats().err; if (er != null) errs[er] = (errs[er] || 0) + 1; }
    const avg = k => live.length ? Math.round(live.reduce((a, s) => a + s[k], 0) / live.length) : 0;   // how fresh the live feeds are: ER:LC round trip, time between updates, time between real moves
    res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(`ok ${communities.all().length} communities, ${w} watching, ${perMin}/min` + (live.length ? `, api ${avg('rtt')}ms, update every ${avg('every')}ms, positions change every ${avg('moves')}ms` : '') + (Object.keys(errs).length ? `, ER:LC refusing: ${Object.entries(errs).map(([k, n]) => `${k} x${n}`).join(', ')}` : '')); }
  // an account that only ever came from a server code (no Discord, no Roblox) is nothing once its last server is gone: sign it out and start over
  const stranded = user => user && !user.discord_id && !user.roblox_id && !communities.forUser(user.id).length;
  if (path === '/' || path === '/dashboard') { const user = auth.currentUser(req); if (stranded(user)) return redirect(res, '/', { 'set-cookie': auth.signOut(req) }); }
  // signed in: straight to your account (or the Roblox link step first); signed out: the sign-in page
  if (path === '/') { const user = auth.currentUser(req); if (user) return redirect(res, user.roblox_name ? '/account' : '/dashboard'); return page(res, pages.landing({ logo: LOGO, discord: auth.discordReady(), roblox: auth.robloxOAuthReady(), owner: auth.ownerLoginOn(), next: auth.safeNext(url.searchParams.get('next')) })); }
  // anyone can browse, signed in or not; voting, joining and reporting ask them to sign in
  if (path === '/explore') { const user = auth.currentUser(req);
    return page(res, pages.explore({ logo: LOGO, user, servers: profile.directory(user), owned: (user ? communities.forUser(user.id) : []).filter(m => m.role === 'owner' || m.role === 'co_owner').map(m => m.slug), prem: !!user && premium.userInfo(user).on })); }
  if (aboutPage && (m0r = path.match(/^\/s\/([a-z0-9-]{3,32})$/))) { const user = auth.currentUser(req), c = communities.bySlug(m0r[1]);
    const all = profile.directory(user), x = c && all.find(y => y.id === c.id);
    if (!x) return msg(res, user, 'Server not found', 'It may have been taken off Explore, or the address is wrong.', { href: '/explore', label: 'Explore servers' }, 404);
    // medals: where this server places on each Explore tab (top 3 earns one; a tab with nothing to count doesn't)
    const playing = y => y.live && y.players != null ? y.players : -1, NEW_DAYS = 14;
    const BOARDS = [['trending', 'Trending', y => y.week * 3 + Math.max(0, playing(y)) * 2 + y.votes * .2, y => y.week > 0 || playing(y) > 0 || y.votes > 0],
      ['active', 'Most active', playing, y => playing(y) > 0], ['popular', 'Most popular', y => y.dc_members ?? -1, y => (y.dc_members ?? 0) > 0],
      ['voted', 'Most voted', y => y.votes, y => y.votes > 0], ['new', 'Newest', y => y.created, y => Date.now() - y.created < NEW_DAYS * 864e5]];
    const medals = BOARDS.map(([k, label, f, counts]) => { if (!counts(x)) return null;
      const place = [...all].sort((a, b) => f(b) - f(a) || b.votes - a.votes || a.name.localeCompare(b.name)).findIndex(y => y.id === x.id) + 1;
      return place && place <= 3 ? { k, label, place } : null; }).filter(Boolean).sort((a, b) => a.place - b.place);
    const own = user && runsServer(c.id, user.id);
    const me = user ? { id: user.id, owner: own, admin: isSiteMod(user), can: !!user.roblox_name && !own, why: !user.roblox_name ? 'Link your Roblox account to write a review.' : own ? 'Reviews are from players. You can reply to any review below.' : '' } : null;
    return page(res, serverPage({ logo: LOGO, user, x, medals, players: stats.since(c.id, Date.now() - 864e5).map(r => [r.at, r.players]), voteTimes: voteDays(c.id, Date.now() - 15 * 864e5), list: reviewList(c.id), me, prompt: req.votePrompt ? { vote: true, roblox: !!user?.roblox_name, origin: origin(req), rank: x.votes > 0 ? [...all].sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name)).findIndex(y => y.id === x.id) + 1 : 0 } : null })); }
  if (path === '/admin/backup' && req.method === 'GET') { const user = auth.currentUser(req); if (!isSiteAdmin(user)) return msg(res, user, 'Page not found', 'There is nothing here.', { href: '/', label: 'Home' }, 404);
    const b = url.searchParams.get('name') ? { name: url.searchParams.get('name') } : backup.latest(), p = b && backup.file(b.name); if (!p) return msg(res, user, 'No backup yet', 'The first one is made a couple of minutes after the site starts.', { href: '/admin', label: 'Back' }, 404);
    console.log(`backup: ${b.name} downloaded by ${user.roblox_name || user.name}`);
    res.writeHead(200, { 'content-type': 'application/gzip', 'content-disposition': `attachment; filename="${b.name}"`, 'cache-control': 'no-store' }); return createReadStream(p).pipe(res); }
  if (path === '/admin') { const user = auth.currentUser(req); if (!isSiteMod(user)) return msg(res, user, 'Page not found', 'There is nothing here.', { href: '/', label: 'Home' }, 404);
    return page(res, pages.admin({ logo: LOGO, user, servers: communities.overview(), reports: reports.open(), reasons: { ...REPORT_REASONS, review: REVIEW_REASON }, app: await erlcAppStatus(false), tickets: support.open(), stripe: premium.stripeStatus(), owner: isSiteAdmin(user), betaNote: siteSettings.get('beta_note'), alertsInfo: alertsInfo() })); }
  if (path === '/account/career') { const user = auth.currentUser(req); if (!user) return redirect(res, '/?next=/account/career'); if (!user.roblox_name) return redirect(res, '/dashboard');
    return page(res, pages.career(premium.userInfo(user).on ? { logo: LOGO, user, stats: career.stats(user), prem: true } : { logo: LOGO, user, prem: false, tracked: career.stats(user)?.total || 0, payments: premium.stripeReady() })); }
  if (path === '/account') { const user = auth.currentUser(req); if (!user) return redirect(res, '/?next=/account'); if (!user.roblox_name) return redirect(res, '/dashboard');
    const from = url.searchParams.get('from'), back = from && /^\/(c\/)?[a-z0-9-]{3,32}$/.test(from) ? from : null;
    const comms = withSetup(communities.forUser(user.id));
    return page(res, pages.account({ logo: LOGO, user, comms, discord: auth.discordReady(), back, prem: premium.userInfo(user), payments: premium.stripeReady(), justBought: url.searchParams.has('premium'), beta: { on: premium.betaOn(user.id), note: siteSettings.get('beta_note') }, discordPerk: { invite: supporter.config().invite || '', ready: !!supporter.config().role, has: supporter.has(user.id) }, boostable: comms.filter(x => x.role === 'owner' || x.role === 'co_owner').map(x => ({ slug: x.slug, name: x.name, premium: premium.isPremium(x), mine: !!premium.boostInfo(x, user).here })) })); }
  if (path === '/dashboard') { const user = auth.currentUser(req); if (!user) return redirect(res, '/?next=/dashboard');
    const p = roblox.pending(user.id), w = url.searchParams.get('welcome'), wc = w && communities.bySlug(w);
    // a Roblox link is required; once it is there, carry on to the CAD they were heading for
    const back = url.searchParams.get('link'), dest = back && (/^\/(c\/)?[a-z0-9-]{3,32}(\/[a-z]*)?(\?[a-z0-9=&]*)?$/.test(back) || back === '/explore') ? back : wc && members.role(wc.id, user.id) ? `/${wc.slug}` : null;
    if (user.roblox_name && dest) return redirect(res, dest);
    if (user.roblox_name) return redirect(res, '/account');                     // the dashboard is only the Roblox link step now; the account page is home
    return page(res, pages.dashboard({ logo: LOGO, user, comms: withSetup(communities.forUser(user.id)), discordLinkable: auth.discordReady() && !user.discord_id, pending: p && p.expires > Date.now() ? p : null, welcome: wc && members.role(wc.id, user.id) ? wc : null, discord: auth.discordReady(), robloxOAuth: auth.robloxOAuthReady() && !(p && p.expires > Date.now()) })); }
  // a player's Roblox headshot, by Roblox user id: looked up once, then cached; the page shows initials if it fails
  // a server's icon, for server cards now and the server browser later
  if ((m0r = path.match(/^\/c\/([a-z0-9-]{3,32})\/icon$/))) { const c = communities.bySlug(m0r[1]), src = c && profile.iconSource(c);
    if (!src) { res.writeHead(404, { 'cache-control': 'public, max-age=300' }); return res.end(); }
    if (src.kind === 'custom') { res.writeHead(200, { 'content-type': src.mime, 'cache-control': 'public, max-age=300', 'content-length': src.data.length }); return res.end(src.data); }
    return redirect(res, src.url); }
  // a server's photo; a photo is never changed in place (a new upload gets a new id), so browsers can keep it a while
  if ((m0r = path.match(/^\/c\/([a-z0-9-]{3,32})\/photos\/(\d{1,12})$/))) { const c = communities.bySlug(m0r[1]), ph = c && !c.suspended && communityPhotos.get(c.id, Number(m0r[2]));
    if (!ph) { res.writeHead(404, { 'cache-control': 'public, max-age=60' }); return res.end(); }
    res.writeHead(200, { 'content-type': ph.mime, 'cache-control': 'public, max-age=86400', 'content-length': ph.data.length, 'x-content-type-options': 'nosniff' }); return res.end(ph.data); }
  if ((m0r = path.match(/^\/rbx\/bust\/(\d{1,20})$/))) { const url = await headshot(m0r[1], 'bust'); if (!url) { res.writeHead(404, { 'cache-control': 'public, max-age=600' }); return res.end(); }
    res.writeHead(302, { location: url, 'cache-control': 'public, max-age=3600' }); return res.end(); }
  if ((m0r = path.match(/^\/rbx\/avatar\/(\d{1,20})$/))) { const url = await headshot(m0r[1]); if (!url) { res.writeHead(404, { 'cache-control': 'public, max-age=600' }); return res.end(); }
    res.writeHead(302, { location: url, 'cache-control': 'public, max-age=3600' }); return res.end(); }
  // for search engines: what to crawl, and every public page (servers listed on Explore included once the site is open)
  if (path === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' });
    return res.end(['User-agent: *', 'Disallow: /api/', 'Disallow: /c/', 'Disallow: /auth/', 'Disallow: /account', 'Disallow: /admin', 'Disallow: /dashboard', 'Disallow: /lock', '', `Sitemap: ${pages.SITE}/sitemap.xml`, ''].join('\n')); }
  if (path === '/sitemap.xml') { const open = !CODE, urls = ['/', ...(open ? ['/explore', '/premium', '/support'] : []), '/privacy', '/terms', '/refunds', ...(open ? profile.directory(null).map(x => '/' + x.slug) : [])];
    res.writeHead(200, { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' });
    return res.end(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `<url><loc>${pages.SITE}${u.replace(/&/g, '&amp;')}</loc>${u === '/' ? '<priority>1.0</priority>' : ''}</url>`).join('\n')}\n</urlset>\n`); }
  if (path === '/privacy' || path === '/terms' || path === '/refunds') return page(res, pages.legal({ logo: LOGO, user: auth.currentUser(req), doc: path.slice(1) }));
  if ((m0 = path.match(/^\/c\/([a-z0-9-]+)\/discord\/connect$/))) { const { c, user, role } = await access(req, m0[1]);
    if (!c || !user || !can(role, 'co_owner')) return msg(res, user, 'Owners only', 'Only the owner or a co-owner can connect a Discord server.', { href: '/dashboard', label: 'Back' }, 403);
    if (!discordlink.ready()) return msg(res, user, 'Discord is not set up yet', 'Oversite needs its Discord bot keys before servers can be linked.', { href: `/${c.slug}/settings`, label: 'Back' });
    const state = token(16); return redirect(res, discordlink.installUrl(req, state), { 'set-cookie': auth.setCookie(req, 'ov_dg', `${state}|${c.slug}|${url.searchParams.has('new') ? 'new' : ''}`, 600) }); }
  if (path === '/auth/discord/guild') { const [state, slug, fresh] = (auth.cookies(req).ov_dg || '').split('|'), back = slug ? `/${slug}/settings` : '/dashboard', u0 = auth.currentUser(req);
    try { if (!state || state !== url.searchParams.get('state')) throw new Error('That link expired. Please try connecting again.');
      if (url.searchParams.get('error')) throw new Error('Adding the bot was cancelled.');
      const { c, user, role } = await access(req, slug); if (!c || !user || !can(role, 'co_owner')) throw new Error('Only the owner or a co-owner can connect a Discord server.');
      const g = await discordlink.finishInstall(req, url.searchParams.get('code'));
      c.settings.discord = { ...g, roles: c.settings.discord?.guild_id === g.guild_id ? c.settings.discord.roles || {} : {} }; communities.saveSettings(c.id, c.settings); discordlink.forget(g.guild_id);
      if (discordbot.connected()) await addCommands(c).catch(() => null);
      return redirect(res, back + (fresh ? '?new=1&discord=1#discord' : '?discord=1#discord'), { 'set-cookie': auth.setCookie(req, 'ov_dg', '', 0) }); }
    catch (e) { return msg(res, u0, 'Could not connect Discord', e.message, { href: back, label: 'Back' }, 400); } }
  if (path === '/auth/roblox') { if (!auth.robloxOAuthReady()) return msg(res, auth.currentUser(req), 'Roblox linking is not set up yet', 'The site owner needs to add the Roblox app keys first.', { href: '/dashboard', label: 'Back' });
    const { url: to, cookie } = auth.robloxOAuthStart(req, url.searchParams.get('next') || '/dashboard'); return redirect(res, to, { 'set-cookie': cookie }); }
  // end of the second-tab flow: tell the page that opened it, then close; opened directly it just goes to the dashboard
  if (path === '/auth/roblox/done') return html(res, `<!doctype html><meta charset="utf-8"><title>Linked</title><body style="background:#0B0C0E;color:#F0F2F5;font:15px system-ui;display:grid;place-items:center;height:100vh;margin:0"><p>Roblox linked. You can close this tab.</p><script>try{if(window.opener&&!window.opener.closed){window.opener.postMessage({ov:'roblox-linked'},location.origin);window.close()}}catch(e){}setTimeout(()=>{location.replace('/dashboard')},600)</script>`);
  if (path === '/auth/roblox/callback') { try { const { user, next } = await auth.robloxOAuthFinish(req, url.searchParams); return redirect(res, next, { 'set-cookie': [auth.signIn(req, user.id), auth.setCookie(req, 'ov_rbx', '', 0)] }); }
    catch (e) { const u = auth.currentUser(req); return msg(res, u, 'Could not link Roblox', e.message, { href: u ? '/dashboard' : '/', label: 'Back' }, 400); } }
  if (path === '/auth/discord') { if (!auth.discordReady()) return msg(res, auth.currentUser(req), 'Discord sign-in is not set up yet', 'The site owner needs to connect a Discord application first.', { href: '/', label: 'Back' });
    const { url: to, cookie } = auth.discordStart(req, url.searchParams.get('next')); return redirect(res, to, { 'set-cookie': cookie }); }
  if (path === '/auth/discord/callback') { try { const { user, next } = await auth.discordFinish(req, url.searchParams); await discordlink.autoJoin(user).catch(() => 0); supporter.retry(user.id); return redirect(res, next, { 'set-cookie': [auth.signIn(req, user.id), auth.setCookie(req, 'ov_oauth', '', 0)] }); }
    catch (e) { return page(res, pages.landing({ logo: LOGO, discord: auth.discordReady(), roblox: auth.robloxOAuthReady(), owner: auth.ownerLoginOn(), error: e.message }), 400); } }
  if (path === '/auth/owner' && req.method === 'POST') { if (!sameOrigin(req)) return msg(res, null, 'Request blocked', 'Please sign in from the Oversite page.', { href: '/', label: 'Back' }, 400);
    const f = await formBody(req), r = auth.ownerLogin(req, String(f.get('code') || '').trim());
    if (r.error) return page(res, pages.landing({ logo: LOGO, discord: auth.discordReady(), roblox: auth.robloxOAuthReady(), owner: auth.ownerLoginOn(), next: auth.safeNext(f.get('next')), error: r.error }), 401);
    return redirect(res, auth.safeNext(f.get('next')), { 'set-cookie': auth.signIn(req, r.user.id) }); }
  if ((path === '/auth/create' || path === '/auth/code') && req.method === 'POST') { if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400);
    const user = auth.currentUser(req), j = await jsonBody(req);
    const r = path === '/auth/create' ? auth.createServer(req, user, { name: j.name, slug: j.slug, inviteCode: j.inviteCode ?? j.ownerCode }, RESERVED) : auth.codeSignIn(req, user, j.code);
    if (r.error) return json(res, { error: r.error }, 400);
    if (path === '/auth/create') { legacyKey(r.id); requireDiscord(r.id); }
    const slug = r.slug || r.community.slug, u = users.byId(r.user.id);
    let next = path === '/auth/create' ? nextAfterCreate(slug) : (u.roblox_name ? `/${slug}` : `/dashboard?welcome=${slug}`);
    if (j.roblox && !u.roblox_name) { const s2 = await auth.robloxStart(u, j.roblox); if (!s2.error && path === '/auth/code') next = `/dashboard?welcome=${slug}`; }
    return json(res, { next }, 200, user ? {} : { 'set-cookie': auth.signIn(req, r.user.id) }); }
  if (path === '/auth/logout' && req.method === 'POST') { if (!sameOrigin(req)) return redirect(res, '/'); return redirect(res, '/', { 'set-cookie': [auth.signOut(req), auth.setCookie(req, COOKIE, '', 0)] }); }   // signing out also forgets the preview code, so the browser is back at the very first screen
  let m;
  if ((m = path.match(/^\/join\/([0-9a-f]{10})$/))) { const user = auth.currentUser(req), inv = invites.get(m[1]), c = inv && communities.byId(inv.community_id);
    if (!inv || !c) return msg(res, user, 'This invite has expired', 'Ask your community for a new link.', { href: user ? '/dashboard' : '/', label: user ? 'Go to dashboard' : 'Back' }, 404);
    if (!user) return redirect(res, `/?next=/join/${m[1]}`);
    if (members.role(c.id, user.id)) return redirect(res, `/${c.slug}`);
    if (req.method === 'POST') { if (!sameOrigin(req)) return redirect(res, `/join/${m[1]}`); members.add(c.id, user.id); invites.use(m[1]); return redirect(res, `/${c.slug}`); }
    return page(res, pages.join({ logo: LOGO, user, c, code: m[1] })); }
  // the invite code as a link that never expires: works for as long as the server keeps that code
  if ((m = path.match(/^\/invite\/([A-Za-z0-9-]{2,30})\/?$/))) { const user = auth.currentUser(req), code = m[1], hit = auth.inviteByCode(req, code);
    if (hit && hit.error) return msg(res, user, 'Too many tries', hit.error, { href: '/', label: 'Back' }, 429);
    if (!hit) return msg(res, user, 'This invite does not work any more', 'The server may have changed its invite code. Ask them for the new one.', { href: user ? '/dashboard' : '/', label: user ? 'Go to dashboard' : 'Back' }, 404);
    const c = hit.c; if (!user) return redirect(res, `/?next=/invite/${encodeURIComponent(code)}`);
    if (members.role(c.id, user.id)) return redirect(res, `/${c.slug}`);
    if (req.method === 'POST') { if (!sameOrigin(req)) return redirect(res, `/invite/${encodeURIComponent(code)}`); members.raise(c.id, user.id, 'member'); return redirect(res, `/${c.slug}`); }
    return page(res, pages.join({ logo: LOGO, user, c, code, action: `/invite/${encodeURIComponent(code)}` })); }
  if ((m = path.match(/^\/c\/([a-z0-9-]{3,32})\/premium\/done$/))) { const { c, user, role } = await access(req, m[1]); if (!c || !user) return redirect(res, '/');
    let r; try { r = await premium.confirm(c, url.searchParams.get('session_id')); } catch (e) { r = { error: 'Payments could not be reached. Premium switches on within a few minutes.' }; }
    if (r.error) return msg(res, user, 'Almost there', r.error, { href: `/${c.slug}/settings#premium`, label: 'Back to Settings' });
    console.log(`premium: ${c.slug} bought by ${user.roblox_name || user.name}`); return redirect(res, `/${c.slug}/settings?premium=1#premium`); }
  if ((m = path.match(/^\/c\/([a-z0-9-]{3,32})(\/.*)?$/))) { const slug = m[1], sub = (m[2] || '/').replace(/\/+$/, '') || '/';
    if (sub.startsWith('/api/')) return communityApi(req, res, slug, sub.slice(5));
    const { c, user, role } = await access(req, slug);
    if (!c) return msg(res, user, 'Community not found', 'Check the address, or ask your community for an invite link.', { href: user ? '/dashboard' : '/', label: user ? 'Go to dashboard' : 'Back' }, 404);
    if (c.suspended && !isSiteAdmin(user)) return msg(res, user, `${c.name} is suspended`, 'Oversite has suspended this server for breaking the Terms of Use, so its CAD is closed. The owner can contact support about it.', { href: '/support?topic=server', label: 'Contact support' }, 403);
    if (!user) return redirect(res, `/?next=${encodeURIComponent(url.pathname)}`);
    const apm = sub.match(/^\/apply\/(\d{1,9})$/);   // an application form: open to anyone signed in, member or not
    if (apm) return user.roblox_name ? page(res, applyPage({ logo: LOGO, user, c, id: apm[1] })) : redirect(res, `/dashboard?link=${encodeURIComponent(url.pathname)}`);
    if (!role) return msg(res, user, `You are not in ${c.name}`, 'Ask the community for an invite link to join.', { href: '/dashboard', label: 'Go to dashboard' }, 403);
    if (!user.roblox_name) return redirect(res, `/dashboard?link=${encodeURIComponent(url.pathname + url.search)}`);   // no CAD without a linked Roblox account
    if (needsDiscord(c) && sub === '/') return can(role, 'co_owner') ? redirect(res, `/${c.slug}/settings#discord`) : msg(res, user, `${c.name} is still being set up`, 'The owner needs to connect the server\'s Discord before the CAD opens. Check back soon.', { href: '/account', label: 'Your servers' }, 403);
    if (sub === '/') return html(res, mapPage(c, user, role));
    if (sub === '/voice' && !req.prox) return redirect(res, `/${c.slug}/prox${url.search}`);   // the old address
    if (sub === '/voice' && !premium.isPremium(c)) return msg(res, user, 'Proximity chat is part of Premium', can(role, 'co_owner') ? 'Get Premium for this server to let players hear each other by distance in game.' : 'Ask your server owner to get Premium for proximity chat.', can(role, 'co_owner') ? { href: `/${c.slug}/settings#premium`, label: 'Get Premium' } : { href: `/${c.slug}`, label: 'Back to the CAD' });
    if (sub === '/voice') return page(res, voicePage({ logo: LOGO, user, c, settings: voice.voiceSettings(c), keyOk: !!communities.key(c.id), embed: url.searchParams.has('embed') }));
    if (sub === '/staff') return can(role, 'mod') ? page(res, staffHub({ logo: LOGO, user, c })) : msg(res, user, 'Staff only', 'The staff page is for Mods and up.', { href: `/${c.slug}`, label: 'Open CAD' }, 403);
    if (sub === '/settings') { if (!can(role, 'co_owner')) return msg(res, user, 'Owners only', 'Only the owner and co-owners can change its settings.', { href: `/${c.slug}`, label: 'Open CAD' }, 403);
      const key = communities.key(c.id), f = feeds.get(c.id), snapName = (() => { try { return f?.snap ? JSON.parse(f.snap.body).Name : ''; } catch (e) { return ''; } })();
      return page(res, pages.settings({ logo: LOGO, user, c, role, photos: communityPhotos.ids(c.id), keyStatus: { connected: !!key, name: snapName, authorize: key ? authLink(key) : '' }, invites: invites.list(c.id), members: members.list(c.id), origin: origin(req), isNew: url.searchParams.has('new'), needsDiscord: needsDiscord(c), discordReady: discordlink.ready(), iconKind: profile.iconSource(c)?.kind || null, regions: profile.REGIONS, langs: profile.LANGS, codes: can(role, 'admin') ? { member: codes.show(c.id, 'member') } : null , prem: premium.info(c), payments: premium.stripeReady(), justBought: url.searchParams.has('premium'), bnd: bounds.of(c), ranks: ranksFor(c, premium.isPremium(c)), boost: premium.boostInfo(c, user), feats: features.switches(c), autos: automations.rules(c), featVals: { biztax: civ.conf(c).biztax }})); }
    return msg(res, user, 'Page not found', 'That page does not exist in this server.', { href: `/${c.slug}`, label: 'Open CAD' }, 404); }
  if (path === '/premium/done') { const user = auth.currentUser(req); if (!user) return redirect(res, '/?next=/account');
    let r; try { r = await premium.confirmUser(user, url.searchParams.get('session_id')); } catch (e) { r = { error: 'Payments could not be reached. If you were charged, Premium switches on within a few minutes.' }; }
    if (r.error) return msg(res, user, 'Almost there', r.error, { href: '/account#premium', label: 'Back to your account' }); return redirect(res, '/account?premium=1#premium'); }
  if (path === '/premium') { const user = auth.currentUser(req), owned = user ? communities.forUser(user.id).filter(x => x.role === 'owner' || x.role === 'co_owner').map(x => ({ slug: x.slug, name: x.name, premium: premium.isPremium(x) })) : [];
    return page(res, pages.premiumPage({ logo: LOGO, user, owned, payments: premium.stripeReady(), mine: !!user && premium.userInfo(user).on })); }
  if (path === '/support') { const u = auth.currentUser(req); return page(res, pages.support({ logo: LOGO, user: u, topic: url.searchParams.get('topic') || '', prem: !!u && premium.userInfo(u).on })); }
  if (path === '/api/support' && req.method === 'POST') { const user = auth.currentUser(req); if (req.headers['x-oversite'] !== '1' || !sameOrigin(req)) return json(res, { error: 'Bad request.' }, 400);
    if (auth.limited(req, 'support', 6, 3600e3) || (user && support.recent(user.id, Date.now() - 3600e3) >= 6)) return json(res, { error: 'You have sent several messages in the last hour. Oversite has them; wait for a reply.' }, 429);
    const j = await jsonBody(req), topic = pages.SUPPORT_TOPICS[j.topic] ? j.topic : 'other', body = String(j.body || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 3000), email = String(j.email || '').trim().slice(0, 120);
    if (body.length < 10) return json(res, { error: 'Tell Oversite a bit more: at least a sentence.' }, 400);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, { error: 'That email address does not look right.' }, 400);
    if (!user && !email) return json(res, { error: 'Add your email so Oversite can reply.' }, 400);
    const prio = user ? premium.userInfo(user).on || communities.forUser(user.id).some(x => (x.role === 'owner' || x.role === 'co_owner') && premium.isPremium(x)) : false;   // Premium people and owners of Premium servers go to the top of the inbox
    const id = support.add(user ? user.id : null, topic, email || null, body, String(j.page || '').slice(0, 200), prio); console.log(`support: #${id} ${topic} from ${user ? (user.roblox_name || user.name) : email}`);
    return json(res, { ok: true, id }); }
  if (path.startsWith('/api/')) return globalApi(req, res, path.slice(5));
  return serve(req, res, path); };

const serve = (req, res, url) => {
  const file = normalize(join(ROOT, url));
  if (!file.startsWith(ROOT + sep) || /\.(py|md)$/i.test(file) || !existsSync(file) || !statSync(file).isFile()) return msg(res, auth.currentUser(req), 'Page not found', 'That page does not exist, or it has moved. Check the address.', { href: '/', label: 'Home' }, 404);
  const ext = extname(file).toLowerCase();
  res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' }); createReadStream(file).pipe(res); };

// ── private preview lock: a numeric access code, remembered in a cookie for 30 days ──
const sign = v => createHmac('sha256', 'oversite-preview:' + CODE).update(v).digest('hex');
const COOKIE = 'ov_access';
const hasAccess = req => { if (!CODE) return true; const m = /(?:^|;\s*)ov_access=([0-9a-f]{64})/.exec(req.headers.cookie || ''); if (!m) return false;
  const want = Buffer.from(sign(CODE)), got = Buffer.from(m[1]); return want.length === got.length && timingSafeEqual(want, got); };
const attempts = new Map();
const ipOf = auth.clientIp;
const lockPage = (m = '') => { const n = Math.min(8, Math.max(4, CODE.length || 4)); return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Oversite CAD: Free ERLC CAD, MDT and Dispatch for ER:LC Servers</title>${pages.seoHead('Oversite CAD: Free ERLC CAD, MDT and Dispatch for ER:LC Servers', { path: '/', ld: pages.SITE_LD })}
<link rel="icon" href="/favicon.ico?v=5" sizes="32x32"><link rel="icon" type="image/svg+xml" href="/icon-tab.svg?v=5"><link rel="icon" type="image/png" href="/icon-tab.png?v=5"><link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4"><link rel="manifest" href="/manifest.webmanifest?v=4"><meta name="apple-mobile-web-app-title" content="Oversite"><meta name="application-name" content="Oversite"><meta name="theme-color" content="#0D1416">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
:root{color-scheme:dark;--ink:#F0F2F5;--dim:#8C9098;--faint:#5B5F66;--hair2:rgba(240,242,245,.14)}*{box-sizing:border-box}html,body{height:100%;margin:0}
body{font:15px/1.45 "Geist",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:#386069;overflow:hidden}
.map{position:fixed;inset:0;background:#386069 url(/liberty-county.jpg) center/cover no-repeat;filter:brightness(.55) saturate(.9)}
.map::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(11,11,12,.35),rgba(11,11,12,.78))}
.wrap{position:fixed;inset:0;display:grid;place-items:center;padding:16px}
form{text-align:center;width:min(440px,100%)}
.mark{display:flex;justify-content:center;margin:0 auto 18px}.mark img{height:58px;width:auto;display:block}
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
const unlock = (req, res, code, next = '/') => { auth.prune(attempts); const ip = ipOf(req), a = attempts.get(ip) || { n: 0, until: 0 };
  if (Date.now() < a.until) return html(res, lockPage('Too many tries. Wait a minute and try again.'), 429);
  if (code && code === CODE) { attempts.delete(ip); const secure = (req.headers['x-forwarded-proto'] || '').startsWith('https') ? '; Secure' : '';
    return redirect(res, next, { 'set-cookie': `${COOKIE}=${sign(CODE)}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax${secure}` }); }
  a.n++; if (a.n >= 5) { a.n = 0; a.until = Date.now() + 60000; } attempts.set(ip, a); return html(res, lockPage('That code is not right.'), 401); };
const gate = async (req, res) => {
  const url = new URL(req.url, 'http://x'), path = url.pathname;
  if (path === '/health' || path === '/liberty-county.jpg' || path === '/intro-splash.js' || /^\/(apple-touch-icon(-precomposed)?\.png|icon-(192|512|maskable-512|tab)\.png|icon-tab\.svg|manifest\.webmanifest|favicon\.ico)$/.test(path) || path === '/privacy' || path === '/terms' || path === '/refunds') return route(req, res);   // legal pages stay public so Roblox and Discord can link to them
  if (!CODE && (path === '/lock' || path === '/unlock')) return redirect(res, '/');   // the site is open: no code screen to show
  if (path === '/unlock' && req.method === 'POST') { const f = await formBody(req); return unlock(req, res, String(f.get('code') || '').trim()); }
  if (path === '/lock') return html(res, lockPage(), 200, { 'set-cookie': `${COOKIE}=; Path=/; Max-Age=0` });
  if (path === '/robots.txt' || path === '/sitemap.xml') return route(req, res);   // search engines read these even while the site is locked
  const q = url.searchParams.get('code'); if (q && CODE && !hasAccess(req)) { url.searchParams.delete('code'); return unlock(req, res, q.trim(), url.pathname + (url.search || '')); }
  if (hasAccess(req) || path === '/api/stripe/webhook' || path === '/api/discord/interactions' || path.startsWith('/api/bot/')) return route(req, res);
  if (path.includes('/api/')) return json(res, { error: 'locked' }, 401);
  return html(res, lockPage(), path === '/' ? 200 : 401); };   // the front door answers 200, so search engines can list Oversite while it's in preview

http.createServer((req, res) => {
  // on every answer: no sniffing file types, no other site framing Oversite (clickjacking), no plugins, and https only once seen over https
  res.setHeader('x-content-type-options', 'nosniff'); res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('content-security-policy', "frame-ancestors 'self'; object-src 'none'; base-uri 'self'");
  if ((req.headers['x-forwarded-proto'] || '').startsWith('https')) res.setHeader('strict-transport-security', 'max-age=15552000');
  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (CANON.startsWith('www.') && host === CANON.slice(4)) { res.writeHead(301, { location: `https://${CANON}${req.url}`, 'cache-control': 'no-store' }); return res.end(); }
  gate(req, res).catch(e => { console.error(e); if (res.headersSent) return res.end();
    if ((req.url || '').startsWith('/api/') || /json/.test(req.headers.accept || '') && !/html/.test(req.headers.accept || '')) return json(res, { error: 'Server error.' }, 500);
    let u = null; try { u = auth.currentUser(req); } catch {}   // the database may be what broke
    msg(res, u, 'Something went wrong', 'Oversite hit an error loading this page. Try again in a moment. If it keeps happening, let us know.', { href: '/', label: 'Home' }, 500); }); })
  .listen(PORT, () => console.log(`Oversite on http://localhost:${PORT} (${communities.all().length} communities; ${CODE ? 'preview lock on' : 'site open'}; Discord sign-in ${auth.discordReady() ? 'on' : 'off'})`));
// Status & Updates: what each part of a server looks like right now (see app/status.mjs for what the states mean)
const probeStatus = c => { const f = feeds.get(c.id), t = Date.now(), watching = !!f && f.clients.size > 0, E = c.settings.profile?.erlc, P = { cad: { s: 'ok' } };
  if (!communities.key(c.id)) P.erlc = { s: 'down', why: 'No ER:LC server key is connected. The owner adds it in Settings → General.' };
  else if (watching && f.lastErr && t - f.lastErr.at < 120000) P.erlc = { s: [401, 403].includes(f.lastErr.status) ? 'down' : 'deg', why: `ER:LC answered ${f.lastErr.status}${f.lastErr.message ? ': ' + f.lastErr.message : ''}` };
  else if ((watching && f.snap && t - f.snap.t < 60000) || (E?.at && t - E.at < 6 * 60000)) P.erlc = { s: 'ok' };
  else P.erlc = watching ? { s: 'deg', why: 'No answer from ER:LC in the last minute.' } : { s: 'idle' };
  P.live = !watching ? { s: 'idle' } : !f.snap ? { s: 'deg', why: 'Waiting for the first update from ER:LC.' } : t - f.snap.t < 20000 ? { s: 'ok' }
    : t - f.snap.t < 90000 ? { s: 'deg', why: `The last update came ${Math.round((t - f.snap.t) / 1000)} seconds ago.` } : { s: 'down', why: 'No position updates for over a minute and a half.' };
  P.discord = !c.settings.discord?.guild_id ? { s: 'off' } : discordlink.ready() ? { s: 'ok' } : { s: 'down', why: 'Oversite’s Discord connection isn’t set up.' };
  P.voice = voice.voiceSettings(c).on && premium.isPremium(c) ? { s: 'ok' } : { s: 'off' };
  try { communities.byId(c.id); P.db = { s: 'ok' }; } catch (e) { P.db = { s: 'down', why: 'Oversite couldn’t read this server’s saved data.' }; }
  return P; };
srvStatus.start(probeStatus);
// automations act through the CAD's live stream, the staff command queue and the dispatch board
automations.wire({ alert: (c, depts, title, text) => feedFor(c).bcast('autoalert', JSON.stringify({ depts, title, text })), command: (c, cmd) => staff.commandAs(c, communities.key(c.id), cmd, 'Oversite Automations'),
  call: (c, dept, where, text) => civ.autoCall(c, dept, where, text) });
// the Oversite bot's slash commands read the same live data as the CAD
const PUBLIC = () => (process.env.PUBLIC_URL || `https://${CANON}`).replace(/\/$/, '');
const interactionsUrl = () => `${PUBLIC()}/api/discord/interactions`;
const DEPT_NAME = { pd: 'Law Enforcement', fd: 'Fire Department', dot: 'Transportation' };
const callKey = k => String(`${k.CallNumber ?? k.Description ?? ''}@${k.StartedAt ?? ''}`).replace(/[^\w .:@#-]/g, '').slice(0, 120);
discordbot.wire({ community: gid => communities.withDiscord().find(c => String(c.settings.discord?.guild_id) === gid) || null, on: c => features.on(c, 'discordcmds'), link: c => `${PUBLIC()}/${c.slug}`,
  snapshot: async c => { const f = feedFor(c), s = await f.snapshot(), E = c.settings.profile?.erlc, cl = clearedCalls(c), st = callStates(c); let j = {};
    if (s.status === 200) try { j = JSON.parse(f.withExtra ? f.withExtra(s.body) : s.body); } catch (e) {}
    const calls = (Array.isArray(j.EmergencyCalls) ? j.EmergencyCalls : []).filter(k => !cl[callKey(k)]).map(k => { const x = st[callKey(k)];
      return { team: k.Team || '', description: k.Description || '', where: k.PositionDescriptor || '', started: k.StartedAt ? k.StartedAt * 1000 : null, units: x ? [x.unit, ...(x.more || []).map(m => m.name)].filter(Boolean) : [] }; });
    return { live: s.status === 200, players: Array.isArray(j.Players) ? j.Players : [], max: j.MaxPlayers ?? E?.max ?? null, join: j.JoinKey || E?.join_key || '', calls, last: E?.at && E.players != null ? { players: E.players, at: E.at } : null }; },
  units: (c, s) => { const teams = c.settings.teams || {}, D = c.settings.depts || {}, st = police.statuses(c.id);
    return ['pd', 'fd', 'dot'].filter(d => features.on(c, 'dept_' + d)).map(d => ({ key: d, name: D[d]?.name || DEPT_NAME[d],
      units: s.players.filter(p => teams[p.Team] === d).map(p => { const name = String(p.Player || '').split(':')[0], cs = p.Callsign || ''; return { name, callsign: cs, status: st[cs] || st[name] || '' }; }) })); },
  lookup: (c, plate) => police.vehicle(c.id, plate),
  canLookup: async (c, did) => { const u = did && users.byDiscord(did); if (!u) return `Sign in to Oversite with this Discord account first, then try again: ${PUBLIC()}/auth/discord`;
    if (!features.on(c, 'pd_lookup')) return 'This server has switched off plate lookups.';
    let role = staffRole(c, u); const lvl = await discordlink.levelFor(c, did).catch(() => null); if (lvl) role = discordlink.higher(role || 'member', lvl);
    if ((ROLE_RANK[role] || 0) >= ROLE_RANK.mod) return true;
    const f = feedFor(c), me = String(u.roblox_name || '').toLowerCase(); let j = {}; try { j = f.snap ? JSON.parse(f.snap.body) : {}; } catch (e) {}
    if (me && (j.Players || []).some(p => String(p.Player || '').split(':')[0].toLowerCase() === me && (c.settings.teams || {})[p.Team] === 'pd')) return true;
    return 'Only staff, and players on a police team in game right now, can look up plates.'; } });
// putting the commands in a linked Discord, remembered on the server so it's done once
const addCommands = async c => { const r = await discordbot.register(c.settings.discord.guild_id), cc = communities.byId(c.id); if (!cc?.settings.discord) return r;
  cc.settings.discord = { ...cc.settings.discord, cmds: r.ok ? r.version : 0, cmdsErr: r.error || '' }; communities.saveSettings(c.id, cc.settings); c.settings.discord = cc.settings.discord; return r; };
const addCommandsEverywhere = async () => { if (!discordbot.connected() || !discordlink.ready()) return;
  for (const c of communities.withDiscord()) { if (discordbot.current(c.settings.discord) || c.settings.discord.cmdsErr) continue; await addCommands(c).catch(() => null); await new Promise(r => setTimeout(r, 1500)); } };
setTimeout(addCommandsEverywhere, 30000);
const discordCmdsInfo = async () => { let a = null, err = ''; try { a = await discordbot.app(true); } catch (e) { err = e.message; }
  const L = communities.withDiscord(); return { ready: discordlink.ready() && !!a, error: err || undefined, name: a?.name || '', endpoint: a?.endpoint || '', ours: interactionsUrl(), connected: discordbot.connected(),
    linked: L.length, added: L.filter(c => discordbot.current(c.settings.discord)).length, failed: L.filter(c => c.settings.discord.cmdsErr).length }; };
const recordEvent = (c, r) => { if (!features.on(c, 'automations')) return; automations.fire(c, 'record', { kind: r.kind, subject: r.subject || '', plate: r.plate || '', by: r.by || '', charges: (r.charges || []).map(x => x.title).join(', '), reason: r.reason || '' }); };
// what /admin shows about alerts and backups
const alertsInfo = () => { const L = backup.list(), d = backup.disk(); let last = null; try { last = JSON.parse(siteSettings.get('backup_last') || 'null'); } catch (e) {}
  return { alerts: alerts.ready(), offsite: backup.offsite(), last, backups: L.slice(0, 6).map(b => ({ name: b.name, kind: b.kind, size: b.size, at: b.at })), count: L.length, disk: d && { used: d.used, free: d.free } }; };
backup.start();
// ER:LC failing for many servers at once is ER:LC's problem or Oversite's, not one owner's key: tell Oversite's owners
setInterval(() => { const S = srvStatus.snapshot(), bad = S.filter(P => P.erlc && ['deg', 'down'].includes(P.erlc.s)), live = S.filter(P => P.erlc && ['ok', 'deg', 'down'].includes(P.erlc.s));
  if (bad.length >= 3 && bad.length >= live.length / 2) alerts.send('erlc-wide', 'ER:LC is failing for many servers', `${bad.length} of ${live.length} servers can’t read ER:LC right now. The most common answer: ${bad.map(P => P.erlc.why).filter(Boolean).sort((a, b) => bad.filter(P => P.erlc.why === b).length - bad.filter(P => P.erlc.why === a).length)[0] || 'none'}`, 'crit'); }, 5 * 60000);
// once a day, a short summary, so a quiet channel means things are fine rather than that alerts stopped
setInterval(() => { const d = new Date(), day = d.toISOString().slice(0, 10); if (d.getUTCHours() !== 13 || siteSettings.get('digest_day') === day) return; siteSettings.set('digest_day', day);
  const all = communities.all(), watching = [...feeds.values()].filter(f => f.clients.size).length, L = backup.list(), disk = backup.disk();
  alerts.send('digest', 'Oversite today', [`${all.length} servers, ${watching} with the CAD open right now`, L[0] ? `Last backup ${Math.round((Date.now() - L[0].at) / 60000)} minutes ago, ${(L[0].size / 1048576).toFixed(1)} MB (${L.length} kept)` : 'No backups yet',
    disk ? `Disk ${Math.round(disk.used * 100)}% used` : ''].filter(Boolean).join('\n'), 'info', true); }, 10 * 60000);
// a crash: say so before Railway restarts the process; a promise nobody caught: say so and keep going
process.on('uncaughtException', e => { console.error('uncaught:', e); alerts.send('crash', 'Oversite crashed and is restarting', String(e?.stack || e).slice(0, 1800), 'crit').finally(() => setTimeout(() => process.exit(1), 500)); setTimeout(() => process.exit(1), 4000); });
process.on('unhandledRejection', e => { console.error('unhandled rejection:', e); alerts.send('rejection', 'Oversite hit an error it didn’t handle', String(e?.stack || e).slice(0, 1800), 'warn'); });
staff.startHistory(); bounds.start(feedFor, id => communities.key(id)); career.start(feedFor, id => communities.key(id), staffhub.observe);
supporter.start(); civ.start();
// business shifts end when the worker leaves the server or the civilian team; loans take their weekly payment
setInterval(() => { for (const c of communities.all()) { try { civbiz.sweep(c, uid => { const u = users.byId(uid); return u ? liveSide(c, u) : undefined; }); } catch (e) { console.log('civbiz:', e.message); } } }, 120000); premium.sweepBoosts(); setInterval(() => { const n = premium.sweepBoosts(); if (n) console.log(`premium: ${n} boost${n === 1 ? '' : 's'} ended with the booster's Premium`); }, 10 * 60000); profile.startDirectory(id => feeds.get(id)?.snap);
// once: the old owner link left extra "Owner" members behind; on servers a site admin made, they go back to plain members
// (in-game staff still get their in-game rank in the CAD), and the server's creator can sort out anyone else from the Team tab
// Premium launch: servers Oversite's own team runs get it for good; every server that existed before gets 30 days free, so nobody loses the Staff CAD or voice overnight
if (!siteSettings.get('premium_founding_1')) { let a = 0, f = 0;
  for (const c of communities.all()) { if (premium.isPremium(c)) continue; if (isSiteAdmin(users.byId(c.owner_id))) { premium.grant(c.id, 0, 'launch'); a++; } else { premium.grant(c.id, 30, 'founding'); f++; } }
  siteSettings.set('premium_founding_1', String(Date.now())); console.log(`premium: launch grants, ${a} forever (Oversite's own), ${f} founding servers for 30 days`); }
if (!siteSettings.get('fix_extra_owners_1')) { let n = 0;
  for (const c of communities.all()) { if (!isSiteAdmin(users.byId(c.owner_id))) continue; for (const m of members.list(c.id)) { if (m.role !== 'owner' || m.id === c.owner_id || isSiteAdmin(m)) continue;
      const u = users.byId(m.id), to = u?.roblox_id && c.settings.ingameStaff?.co?.includes(String(u.roblox_id)) ? 'co_owner' : 'member';   // a co-owner in game stays co-owner
      members.setRole(c.id, m.id, to); n++; console.log(`owners: ${c.slug} ${m.roblox_name || m.name} is ${to === 'member' ? 'a member' : 'a co-owner'} now (was an extra Owner from the old owner link)`); } }
  siteSettings.set('fix_extra_owners_1', String(Date.now())); console.log(`owners: ${n} extra owner${n === 1 ? '' : 's'} removed`); }
// the address ER:LC sees our commands come from, for checking against the server owner's allowlist
fetch('https://api.ipify.org?format=json').then(r => r.json()).then(j => console.log('Outbound IP:', j.ip)).catch(e => console.log('Outbound IP check failed:', e.message));
