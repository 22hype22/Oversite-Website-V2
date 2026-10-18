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
  'record.updated': ['A warrant is served, recalled or denied, a BOLO is cleared, or a stop ends', 'lookup'] };
// what the "Connect a bot" form ticks for each kind of bot
export const PRESETS = {
  department: { name: 'Department bot', scopes: ['read', 'people', 'units', 'calls', 'lookup', 'records'], events: ['shift.started', 'shift.ended', 'call.created', 'call.updated', 'call.cleared', 'unit.status', 'panic', 'record.created', 'record.updated'] },
  justice: { name: 'Justice (DOJ) bot', scopes: ['read', 'people', 'lookup', 'records'], events: ['record.created', 'record.updated'] },
  roleplay: { name: 'Roleplay bot', scopes: ['read', 'people', 'lookup', 'vehicles', 'bank', 'records'], events: ['record.created', 'call.created'] },
  moderation: { name: 'Moderation bot', scopes: ['read', 'people', 'game'], events: ['player.joined', 'player.left'] },
  readonly: { name: 'Read only', scopes: ['read'], events: [] } };
export const FREE_BOTS = 1, PREMIUM_BOTS = 10;

const sha = s => createHash('sha256').update(s).digest('hex');
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const list0 = c => (Array.isArray(c.settings.bots) ? c.settings.bots : []);
const store = (c, L) => { const s = communities.byId(c.id).settings; s.bots = L; communities.saveSettings(c.id, s); c.settings.bots = L; idx.clear(); };
const used = new Map(), stat = new Map();   // bot id -> last request time and count; bot id -> how its events are getting through (in memory)

// what the settings page sees: never the key or the signing secret
export const view = b => ({ id: b.id, name: b.name, scopes: b.scopes, hint: b.hint, created: b.created, by: b.by, hook: b.hook ? { url: b.hook.url, events: b.hook.events } : null,
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

export const create = async (c, j, prem, by) => { const L = list0(c); if (L.length >= max(prem)) return { error: prem ? `A server can connect up to ${PREMIUM_BOTS} bots.` : `Free servers can connect ${FREE_BOTS} bot. Premium connects up to ${PREMIUM_BOTS}.` };
  const v = await clean(j); if (v.error) return v; const id = randomBytes(5).toString('hex'), key = `ovb_${id}_${randomBytes(30).toString('base64url')}`;
  const b = { id, ...v, key: sha(key), hint: key.slice(-4), created: Date.now(), by: T(by, 40) }; store(c, [...L, b]);
  return { ok: true, bot: view(b), key, secret: b.hook ? unseal(b.hook.secret) : undefined }; };
export const update = async (c, id, j) => { const L = list0(c), i = L.findIndex(b => b.id === id); if (i < 0) return { error: 'That bot isn’t connected any more.' };
  const v = await clean(j, L[i]); if (v.error) return v; const fresh = v.hook && !L[i].hook; L[i] = { ...L[i], ...v }; store(c, L);
  return { ok: true, bot: view(L[i]), secret: fresh ? unseal(L[i].hook.secret) : undefined }; };
export const rotate = (c, id, what) => { const L = list0(c), b = L.find(x => x.id === id); if (!b) return { error: 'That bot isn’t connected any more.' };
  if (what === 'secret') { if (!b.hook) return { error: 'This bot has no events link.' }; const secret = 'whsec_' + randomBytes(24).toString('base64url'); b.hook.secret = seal(secret); store(c, L); return { ok: true, bot: view(b), secret }; }
  const key = `ovb_${b.id}_${randomBytes(30).toString('base64url')}`; b.key = sha(key); b.hint = key.slice(-4); store(c, L); return { ok: true, bot: view(b), key }; };
export const remove = (c, id) => { store(c, list0(c).filter(b => b.id !== id)); used.delete(id); stat.delete(id); return { ok: true }; };

// a key to its server and bot; a server over its plan's limit (Premium ended) keeps only its first bot working
const idx = new Map();
export const auth = key => { const m = /^ovb_([0-9a-f]{10})_[A-Za-z0-9_-]{30,60}$/.exec(key || ''); if (!m) return null;
  let cid = idx.get(m[1]); if (cid == null) { for (const c of communities.all()) for (const b of list0(c)) idx.set(b.id, c.id); cid = idx.get(m[1]); } if (cid == null) return null;
  const c = communities.byId(cid), L = c ? list0(c) : [], i = L.findIndex(b => b.id === m[1]); if (i < 0) return null; const b = L[i], h = sha(key);
  if (b.key.length !== h.length || !timingSafeEqual(Buffer.from(b.key), Buffer.from(h))) return null;
  const u = used.get(b.id) || { n: 0 }; u.at = Date.now(); u.n++; used.set(b.id, u); return { c, bot: b, rank: i }; };
export const can = (b, s) => b.scopes.includes(s);

// sending an event: JSON signed like Stripe's (t=<seconds>,v1=<HMAC-SHA256 of "t.body">), one retry, never following redirects
const sign = (secret, body) => { const t = Math.floor(Date.now() / 1000); return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`; };
const deliver = async (c, b, event, data, test = false, retry = false) => {
  const body = JSON.stringify({ id: 'evt_' + randomBytes(8).toString('hex'), event, server: { name: c.name, slug: c.slug }, at: new Date().toISOString(), test: test || undefined, data });
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
  L.forEach((b, i) => { if (!b.hook?.events.includes(event) || !can(b, need) || !within(c, i)) return; if ((stat.get(b.id)?.fails || 0) >= 50 && Math.random() > 0.05) return;   // a dead link is tried now and then, not every time
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
