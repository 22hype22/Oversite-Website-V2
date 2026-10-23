// Connected bots: a server's own Discord bots (department, roleplay, economy and moderation bots it bought or built) linked
// to its CAD. Each bot gets its own key and only the permissions the owner ticks in Settings → Bots. It reads and changes the
// CAD through /api/bot/v1 (documented at /developers), and can be sent the server's events as they happen, signed with a
// secret only that bot has, so it knows they came from Oversite.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { communities, seal, unseal } from './db.mjs';

export const SCOPES = {
  read: ['Read the server', 'Players in game, units on duty, open calls, unit status and shifts.'],
  people: ['Match Discord and Roblox', 'Find a member’s Roblox account from their Discord ID, and the other way round.'],
  lookup: ['Police lookups', 'Look up plates and people, and read police records.'],
  calls: ['Calls', 'Put 911 calls on the dispatch board and clear them.'],
  units: ['Unit status', 'Set a unit’s 10-code status.'],
  records: ['Write police records', 'Citations, warnings, arrests, BOLOs and warrants. Warrants still wait for a supervisor.'],
  vehicles: ['Vehicle papers', 'Set a plate’s registration, insurance and stolen flag.'],
  bank: ['Bank', 'Read balances, and pay or charge members in the Civilian economy.'],
  alerts: ['CAD alerts', 'Pop up an alert in the CAD for one or more departments.'],
  game: ['In-game commands', 'Run ER:LC commands like :h, :pm, :kick and :ban. They show in your logs under the bot’s name.'] };
export const EVENTS = {
  'call.created': ['A 911 call comes in', 'read'], 'call.updated': ['Units are assigned to a call or move on it', 'read'], 'call.cleared': ['A call is cleared', 'read'],
  'unit.status': ['A unit changes status', 'read'], 'panic': ['A unit presses panic', 'read'], 'shift.started': ['Someone goes on duty', 'read'], 'shift.ended': ['Someone goes off duty', 'read'],
  'player.joined': ['A player joins the server', 'read'], 'player.left': ['A player leaves the server', 'read'],
  'alpr': ['The plate reader flags a car', 'lookup'], 'record.created': ['Police write a record (a warrant once it’s approved)', 'lookup'],
  'record.updated': ['A warrant is served, recalled or denied, a BOLO is cleared, or a stop ends', 'lookup'],
  'monitor.alert': ['Someone on an ankle monitor leaves their area, enters a no-go zone or comes back', 'lookup'],
  'license.updated': ['Police suspend, revoke or reinstate a driver’s license or firearms permit', 'lookup'],
  'case.filed': ['Someone files a civil suit in Court', 'read'], 'case.updated': ['A judge takes a case, sets a hearing or rules, or a case is settled or withdrawn', 'read'],
  'rdm.flagged': ['RDM watch flags a possible random deathmatch (or adds a kill to a flag)', 'read'],
  'arrest.logged': ['Someone is arrested in game (sent to jail): who, the officer closest to them and where', 'read'],
  'loa.requested': ['Someone asks for leave (LOA) from a department or the staff team', 'read'], 'loa.decided': ['A leave request is approved or denied', 'read'] };
// what the "Connect a bot" form ticks for each kind of bot
export const PRESETS = {
  department: { name: 'Department bot', scopes: ['read', 'people', 'units', 'calls', 'lookup', 'records'], events: ['shift.started', 'shift.ended', 'call.created', 'call.updated', 'call.cleared', 'unit.status', 'panic', 'record.created', 'record.updated', 'loa.requested', 'loa.decided', 'monitor.alert', 'license.updated'] },
  justice: { name: 'Justice (DOJ) bot', scopes: ['read', 'people', 'lookup', 'records'], events: ['record.created', 'record.updated', 'license.updated', 'case.filed', 'case.updated'] },
  roleplay: { name: 'Roleplay bot', scopes: ['read', 'people', 'lookup', 'vehicles', 'bank', 'records'], events: ['record.created', 'call.created'] },
  moderation: { name: 'Moderation bot', scopes: ['read', 'people', 'game'], events: ['player.joined', 'player.left', 'rdm.flagged', 'arrest.logged'] },
  readonly: { name: 'Read only', scopes: ['read'], events: [] } };
// a server's own bots (made here, with a key): 1 free, 10 with Premium. Oversite bots bought on oversite.shop (roleplay, dispatch,
// department…) don't count: up to OVERSITE_BOTS of them, free or not
export const FREE_BOTS = 1, PREMIUM_BOTS = 10, OVERSITE_BOTS = 10;
const own = L => L.filter(b => !b.oversite);
// where a bot stands against the limit: Oversite bots always work; a server's own, by the order they were added
export const rankOf = (L, b) => b.oversite ? 0 : own(L).indexOf(b);

const sha = s => createHash('sha256').update(s).digest('hex');
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const list0 = c => (Array.isArray(c.settings.bots) ? c.settings.bots : []);
const store = (c, L) => { const s = communities.byId(c.id).settings; s.bots = L; communities.saveSettings(c.id, s); c.settings.bots = L; idx.clear(); };
const used = new Map(), stat = new Map();   // bot id -> last request time and count; bot id -> how its events are getting through (in memory)

// The logs a linked Oversite bot can post in the server's Discord, each in a channel the owner picks in Settings → Bots: the
// events behind each, sent to the bot through Oversite with the channel attached. A bot only gets the logs its permissions allow.
export const LOGS = {
  calls: ['Call logs', 'A 911 call comes in, and when it’s cleared', ['call.created', 'call.cleared']],
  records: ['Arrests, citations and warrants', 'Every record police write: arrests, citations, warnings, warrants (once approved) and BOLOs', ['record.created']],
  closed: ['Warrants served and BOLOs cleared', 'A warrant is served, recalled or denied, a BOLO is cleared, or a traffic stop ends', ['record.updated']],
  shifts: ['Shift logs', 'Someone goes on or off duty, with how long they were on', ['shift.started', 'shift.ended']],
  panic: ['Panic alerts', 'A unit presses their panic button', ['panic']],
  status: ['Unit status', 'A unit changes their 10-code status', ['unit.status']],
  licenses: ['License changes', 'Police suspend, revoke or reinstate a driver’s license or firearms permit', ['license.updated']],
  monitors: ['Ankle monitor alerts', 'Someone on an ankle monitor leaves their area or enters a no-go zone', ['monitor.alert']],
  alpr: ['Plate reader hits', 'A plate reader or camera flags a car', ['alpr']],
  rdm: ['RDM alerts', 'RDM watch flags someone for a possible random deathmatch', ['rdm.flagged']],
  arrests: ['Arrest logs', 'Every arrest in game: who went to jail, the officer who arrested them and where', ['arrest.logged']] };
const logOf = event => Object.keys(LOGS).find(k => LOGS[k][2].includes(event));
const LOG_BASES = ['department', 'dispatch', 'roleplay', 'customs'];   // the Oversite bots that post CAD logs
const logsFor = b => LOG_BASES.includes(b.base) ? Object.keys(LOGS).filter(k => LOGS[k][2].every(ev => can(b, EVENTS[ev][1]))) : [];
// the events a linked Oversite bot is sent: those of the logs it has a channel for
const logEvents = b => [...new Set(Object.entries(b.logs || {}).filter(([k, ch]) => ch && LOGS[k]).flatMap(([k]) => LOGS[k][2]))];

// what the settings page sees: never the key or the signing secret
export const view = b => ({ id: b.id, name: b.name, scopes: b.scopes, hint: b.hint, created: b.created, by: b.by, oversite: !!b.oversite, guild: b.guild || null, hook: b.hook ? { url: b.hook.url, events: b.hook.events } : null,
  ...(b.oversite ? { logs: b.logs || {}, canLog: !!b.hook, logKinds: logsFor(b) } : {}),
  used: used.get(b.id)?.at || b.used || null, uses: used.get(b.id)?.n || 0, delivery: stat.get(b.id) || null });
export const list = c => list0(c).map(view);
export const max = prem => prem ? PREMIUM_BOTS : FREE_BOTS;

// where events go: https on a public address only, so a bot's link can't point Oversite at anything private
const PRIVATE = [/^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./, /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/, /^f[cd]/i, /^fe80/i, /^::ffff:(127|10|192\.168|169\.254)\./i, /^::$/];
const LOCAL_OK = () => process.env.BOT_HOOKS_ALLOW_LOCAL === '1';   // local testing only
export const checkUrl = async (u, resolve = true) => { let x; try { x = new URL(String(u || '').trim()); } catch (e) { return { error: 'That isn’t a link. It should start with https://' }; }
  if (x.protocol !== 'https:' && !(LOCAL_OK() && x.protocol === 'http:')) return { error: 'The events link has to start with https://' };
  if (x.username || x.password || x.href.length > 300) return { error: 'That link can’t be used.' };
  const host = x.hostname.replace(/^\[|\]$/g, '');
  if (!LOCAL_OK() && (/(^|\.)(localhost|internal|local|railway\.internal)$/i.test(host) || (isIP(host) && PRIVATE.some(r => r.test(host))))) return { error: 'The events link has to be a public address.' };
  if (resolve && !LOCAL_OK() && !isIP(host)) { try { const A = await lookup(host, { all: true }); if (!A.length || A.some(a => PRIVATE.some(r => r.test(a.address)))) return { error: 'The events link has to be a public address.' }; }
    catch (e) { return { error: `Oversite couldn’t find ${host}. Check the link.` }; } }
  return { url: x.href }; };

const clean = async (j, old) => { const name = T(j.name, 40); if (!name) return { error: 'Give the bot a name, like the name it has in your Discord.' };
  const scopes = [...new Set((Array.isArray(j.scopes) ? j.scopes : []).filter(s => SCOPES[s]))]; if (!scopes.length) return { error: 'Tick at least one thing the bot may do.' };
  let hook = null; const url = String(j.hook?.url ?? '').trim();
  if (url) { const ok = await checkUrl(url); if (ok.error) return ok; const events = [...new Set((Array.isArray(j.hook.events) ? j.hook.events : []).filter(e => EVENTS[e]))];
    if (!events.length) return { error: 'Pick which events to send to the bot, or clear the events link.' };
    hook = { url: ok.url, events, secret: old?.hook?.secret || seal('whsec_' + randomBytes(24).toString('base64url')) }; }
  return { name, scopes, hook }; };

export const create = async (c, j, prem, by) => { const L = list0(c); if (own(L).length >= max(prem)) return { error: prem ? `A server can connect up to ${PREMIUM_BOTS} of its own bots. Oversite bots don’t count.` : `Free servers can connect ${FREE_BOTS} of their own bot. Premium connects up to ${PREMIUM_BOTS}. Oversite bots don’t count.` };
  const v = await clean(j); if (v.error) return v; const id = randomBytes(5).toString('hex'), key = `ovb_${id}_${randomBytes(30).toString('base64url')}`;
  const b = { id, ...v, key: sha(key), hint: key.slice(-4), created: Date.now(), by: T(by, 40) }; store(c, [...L, b]);
  return { ok: true, bot: view(b), key, secret: b.hook ? unseal(b.hook.secret) : undefined }; };
export const update = async (c, id, j) => { const L = list0(c), i = L.findIndex(b => b.id === id); if (i < 0) return { error: 'That bot isn’t connected any more.' };
  const v = await clean(j, L[i]); if (v.error) return v; const fresh = v.hook && !L[i].hook; L[i] = { ...L[i], ...v }; store(c, L);
  return { ok: true, bot: view(L[i]), secret: fresh ? unseal(L[i].hook.secret) : undefined }; };
export const rotate = (c, id, what) => { const L = list0(c), b = L.find(x => x.id === id); if (!b) return { error: 'That bot isn’t connected any more.' };
  if (what === 'secret') { if (!b.hook) return { error: 'This bot has no events link.' }; const secret = 'whsec_' + randomBytes(24).toString('base64url'); b.hook.secret = seal(secret); store(c, L); return { ok: true, bot: view(b), secret }; }
  if (b.oversite) return { error: 'Oversite keeps this bot’s key. To link it again, use a new code from the bot’s page on oversite.shop.' };
  const key = `ovb_${b.id}_${randomBytes(30).toString('base64url')}`; b.key = sha(key); b.hint = key.slice(-4); store(c, L); return { ok: true, bot: view(b), key }; };
// does any connected bot get this event (so the MDT can say the request will be posted)
export const listens = (c, event) => list0(c).some(b => b.hook?.events.includes(event) && can(b, EVENTS[event]?.[1] || 'read'));
// is one of Oversite's own bots of this kind ('dispatch', 'department', …) linked to the server; some CAD features come with one
export const hasOversite = (c, kind) => list0(c).some(b => b.oversite && b.base === kind);
// Linking one of the server's Oversite bots (bought on oversite.shop): its owner reads a code off the bot's page there (it
// changes every minute) and types it here. Oversite checks the code and keeps the bot's key itself, so nobody copies a key.
const LINK_URL = process.env.OVERSITE_LINK_URL || 'https://kqhyjxtylvigrezlxzpl.supabase.co/functions/v1/cad-link';
const LINK_KIND = { department: 'department', dispatch: 'department', roleplay: 'roleplay', customs: 'roleplay', protection: 'moderation' };
export const link = async (c, code, prem, by) => { const secret = process.env.CAD_LINK_SECRET || ''; if (!secret) return { error: 'Linking Oversite bots isn’t set up on this site yet.' };
  const clean = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); if (clean.length !== 8) return { error: 'The code is 8 letters and numbers. Copy it from the bot’s page on oversite.shop.' };
  const L = list0(c);
  const id = randomBytes(5).toString('hex'), key = `ovb_${id}_${randomBytes(30).toString('base64url')}`, evSecret = 'whsec_' + randomBytes(24).toString('base64url'); let r;
  try { const x = await fetch(LINK_URL, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'content-type': 'application/json', 'x-cad-link-secret': secret },
      body: JSON.stringify({ code: clean, key, events_secret: evSecret, server: { name: c.name, slug: c.slug }, cad_bot_id: id }) });
    r = await x.json().catch(() => ({})); if (!x.ok && !r.error) r.error = `Oversite answered ${x.status}. Try again in a minute.`; }
  catch (e) { return { error: 'Oversite couldn’t be reached. Try again in a minute.' }; }
  if (!r.ok) return { error: r.error || 'That code didn’t work.' };
  // linked somewhere before: that link's key is no longer the bot's, so its old entry goes (here or on the other server)
  if (r.previous_slug && r.previous_cad_bot_id && r.previous_slug !== c.slug) { const pc = communities.all().find(x => x.slug === r.previous_slug); if (pc) store(pc, list0(pc).filter(b => b.id !== r.previous_cad_bot_id)); }
  const old = L.findIndex(b => b.oversite === r.bot_id || (r.previous_cad_bot_id && b.id === r.previous_cad_bot_id));
  if (old < 0 && L.filter(b => b.oversite).length >= OVERSITE_BOTS) return { error: `A server can link up to ${OVERSITE_BOTS} Oversite bots. Disconnect one, then use a new code.` };
  const p = PRESETS[LINK_KIND[String(r.base || '').split(/[^a-z]/)[0]]] || PRESETS.readonly;
  // the bot can take events (LOA requests, calls…) if it says where: signed with the secret sent above, the events its kind of bot gets
  const ev = r.events_url ? await checkUrl(r.events_url) : null, prev = old >= 0 ? L[old] : null;
  const hook = ev?.url ? { url: ev.url, events: logEvents({ logs: prev?.logs }), secret: seal(evSecret) } : null;
  const b = { id, name: T(r.bot_name, 40) || 'Oversite bot', scopes: [...p.scopes], hook, key: sha(key), hint: key.slice(-4), created: Date.now(), by: T(by, 40), oversite: String(r.bot_id), base: T(String(r.base || '').split(/[^a-z]/)[0], 20), logs: prev?.logs || {} };
  store(c, old >= 0 ? L.map((x, i) => (i === old ? b : x)) : [...L, b]);
  return { ok: true, bot: view(b), linked: true }; };
// the channel each log goes to ('' for off), checked against the channels the bot can post in
export const setLogs = async (c, id, logs) => { const L = list0(c), b = L.find(x => x.id === id); if (!b?.oversite) return { error: 'Only Oversite bots post logs.' };
  if (!b.hook) return { error: 'Link this bot again with a new code from its page to turn on logs.' };
  const ch = await channels(c, id); if (ch.error) return ch; const ok = new Set(ch.channels.filter(x => !b.guild || !x.guild || x.guild === b.guild.id).map(x => x.id)), kinds = logsFor(b), next = {};   // only the picked Discord server's channels
  for (const [k, v] of Object.entries(logs || {})) { const cid = String(v || ''); if (!kinds.includes(k) || !cid) continue; if (!ok.has(cid)) return { error: 'The bot can’t see one of those channels. Refresh and pick again.' }; next[k] = cid; }
  b.logs = next; b.hook.events = logEvents(b); store(c, L); return { ok: true, bot: view(b) }; };
const chCache = new Map();
export const channels = async (c, id) => { const b = list0(c).find(x => x.id === id); if (!b?.oversite) return { error: 'Only Oversite bots post logs.' };
  const hit = chCache.get(b.id); if (hit && Date.now() - hit.at < 60000) return hit.r; const secret = process.env.CAD_LINK_SECRET || ''; if (!secret) return { error: 'Linking Oversite bots isn’t set up on this site yet.' };
  let r; try { const x = await fetch(LINK_URL, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'content-type': 'application/json', 'x-cad-link-secret': secret },
      body: JSON.stringify({ action: 'channels', bot_id: b.oversite, server: { slug: c.slug }, cad_bot_id: b.id, guild_id: b.guild?.id || undefined }) }); r = await x.json().catch(() => ({})); }
  catch (e) { return { error: 'Oversite couldn’t be reached. Try again in a minute.' }; }
  if (!r.ok) return { error: r.error || 'Couldn’t read the bot’s channels.' };
  if (!seenShape.has(b.oversite)) { seenShape.add(b.oversite); console.log(`bot channels: ${c.slug} answer has ${Object.keys(r).join(',')}; a channel has ${Object.keys(r.channels?.[0] || {}).join(',')}`); }   // which fields Oversite sends (no values)
  // each channel's Discord server, when Oversite says (guild_id / guild_name, or guild: { id, name }); the servers the bot is in
  const gid = x => T(String(x.guild_id ?? x.guild?.id ?? (typeof x.guild === 'string' ? x.guild : '') ?? ''), 30), gname = x => T(x.guild_name ?? x.guild?.name ?? '', 100);
  const list = (r.channels || []).map(x => ({ id: String(x.id), name: T(x.name, 100), category: T(x.category, 100), guild: gid(x), guild_name: gname(x) }));
  const guilds = new Map((Array.isArray(r.guilds) ? r.guilds : []).map(g => [String(g.id), T(g.name, 100) || 'Discord server']));
  for (const x of list) if (x.guild && !guilds.has(x.guild)) guilds.set(x.guild, x.guild_name || 'Discord server');
  const out = { ok: true, channels: list, guilds: [...guilds].map(([id, name]) => ({ id, name })) }; chCache.set(b.id, { at: Date.now(), r: out }); return out; };
const seenShape = new Set();
// which of the Discord servers the bot is in this CAD's logs and events are for (a bot can be in several); logs elsewhere are dropped
export const setGuild = async (c, id, guild) => { const L = list0(c), b = L.find(x => x.id === id); if (!b?.oversite) return { error: 'Only Oversite bots post in Discord.' };
  const ch = await channels(c, id); if (ch.error) return ch; const g = ch.guilds.find(x => x.id === String(guild || ''));
  if (guild && !g) return { error: 'The bot isn’t in that Discord server any more. Refresh and pick again.' };
  b.guild = g ? { id: g.id, name: g.name } : null; const keep = new Set(ch.channels.filter(x => !g || x.guild === g.id).map(x => x.id));
  b.logs = Object.fromEntries(Object.entries(b.logs || {}).filter(([, cid]) => keep.has(cid))); if (b.hook) b.hook.events = logEvents(b); store(c, L); chCache.delete(b.id); return { ok: true, bot: view(b) }; };
export const DUTY_DEPTS = ['pd', 'fd', 'dot'];
export const remove = (c, id) => { store(c, list0(c).filter(b => b.id !== id)); used.delete(id); stat.delete(id); return { ok: true }; };

// a key to its server and bot; a server over its plan's limit (Premium ended) keeps only its first bot working
const idx = new Map();
export const auth = key => { const m = /^ovb_([0-9a-f]{10})_[A-Za-z0-9_-]{30,60}$/.exec(key || ''); if (!m) return null;
  let cid = idx.get(m[1]); if (cid == null) { for (const c of communities.all()) for (const b of list0(c)) idx.set(b.id, c.id); cid = idx.get(m[1]); } if (cid == null) return null;
  const c = communities.byId(cid), L = c ? list0(c) : [], i = L.findIndex(b => b.id === m[1]); if (i < 0) return null; const b = L[i], h = sha(key);
  if (b.key.length !== h.length || !timingSafeEqual(Buffer.from(b.key), Buffer.from(h))) return null;
  const u = used.get(b.id) || { n: 0 }; u.at = Date.now(); u.n++; used.set(b.id, u); return { c, bot: b, rank: rankOf(L, b) }; };
export const can = (b, s) => b.scopes.includes(s);

// sending an event: JSON signed like Stripe's (t=<seconds>,v1=<HMAC-SHA256 of "t.body">), one retry, never following redirects
const sign = (secret, body) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`; };
const deliver = async (c, b, event, data, test = false, retry = false) => {
  const channel = b.oversite ? b.logs?.[logOf(event)] || undefined : undefined;
  const body = JSON.stringify({ id: 'evt_' + randomBytes(8).toString('hex'), event, server: { name: c.name, slug: c.slug }, at: new Date().toISOString(), test: test || undefined, channel_id: channel, guild_id: b.oversite ? b.guild?.id || undefined : undefined, data });
  let status = 0, error = ''; const ok = await checkUrl(b.hook.url); if (ok.error) error = ok.error;
  else try { const r = await fetch(ok.url, { method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(6000), headers: { 'content-type': 'application/json', 'user-agent': 'Oversite-Events/1', 'x-oversite-event': event, 'x-oversite-signature': sign(unseal(b.hook.secret), body) }, body });
    status = r.status; if (!r.ok) error = `The bot answered ${r.status}`; } catch (e) { error = e.name === 'TimeoutError' ? 'The bot took over 6 seconds to answer' : 'The bot couldn’t be reached'; }
  const s = stat.get(b.id) || { fails: 0 }; Object.assign(s, { at: Date.now(), event, ok: !error, status, error }); s.fails = error ? s.fails + 1 : 0; stat.set(b.id, s);
  if (error && !test && !retry && status !== 401 && status !== 403) setTimeout(() => deliver(c, b, event, data, false, true), 15000);
  return error ? { error } : { ok: true, status }; };
export const test = (c, id) => { const b = list0(c).find(x => x.id === id); if (!b?.hook) return { error: 'This bot has no events link.' }; return deliver(c, b, 'test', { message: 'Oversite can reach your bot.' }, true); };
// something happened: every bot that asked for this event, and may see it, gets it
let enabled = () => true; export const gate = fn => { enabled = fn; };
export const emit = (c, event, data) => { if (!enabled(c)) return; const need = EVENTS[event]?.[1]; const L = list0(c);
  L.forEach(b => { if (!b.hook?.events.includes(event) || !can(b, need) || !within(c, rankOf(L, b))) return; if ((stat.get(b.id)?.fails || 0) >= 50 && Math.random() > 0.05) return;   // a dead link is tried now and then, not every time
    deliver(c, b, event, data).catch(() => {}); }); };
let within = () => true; export const limit = fn => { within = fn; };

// players joining and leaving and new calls, from each live update (the first one after a restart only learns who's there)
const seenP = new Map(), seenC = new Map();
export const observe = (c, body, callKey) => { if (!list0(c).some(b => b.hook)) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const P = new Map((j.Players || []).map(p => { const [name, rid] = String(p.Player || '').split(':'); return [rid || name, { name, roblox_id: rid || null, team: p.Team || '', callsign: p.Callsign || null }]; }).filter(([k]) => k));
  const prev = seenP.get(c.id); if (prev) { for (const [k, p] of P) if (!prev.has(k)) emit(c, 'player.joined', p); for (const [k, p] of prev) if (!P.has(k)) emit(c, 'player.left', p); } seenP.set(c.id, P);
  const calls = Array.isArray(j.EmergencyCalls) ? j.EmergencyCalls : [], was = seenC.get(c.id);
  if (was) for (const k of calls) if (!was.has(callKey(k))) emit(c, 'call.created', { key: callKey(k), number: k.CallNumber ?? null, team: k.Team || '', description: k.Description || '', where: k.PositionDescriptor || '', started: k.StartedAt ? k.StartedAt * 1000 : null });
  seenC.set(c.id, new Set(calls.map(callKey))); };
