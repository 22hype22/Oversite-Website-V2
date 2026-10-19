// Automations: rules a server's owner writes in Settings → Automations. "When <something happens>, if <it matches>, then
// <do these>": alert departments in the CAD, post to a Discord channel, message the player in game, announce in game, or
// put a call on the dispatch board. Events come from the live feed (players joining, 911 calls, plate reader hits), from
// panic buttons and from police records. Messages fill in {placeholders} from the event.
import { now } from './db.mjs';

export const TRIGGERS = {
  join: { name: 'A player joins the server', vars: ['player', 'team'], filter: ['team', 'Team'], target: 'player' },
  call: { name: 'A 911 call comes in', vars: ['type', 'where', 'team'], filter: ['team', 'Team'] },
  alpr: { name: 'The plate reader flags a car', vars: ['plate', 'vehicle', 'owner', 'reasons', 'where'], filter: ['reasons', 'Reason'], target: 'owner' },
  panic: { name: 'A unit presses panic', vars: ['unit', 'player', 'dept', 'where'], filter: ['dept', 'Department'], target: 'player' },
  record: { name: 'Police write a record', vars: ['kind', 'subject', 'plate', 'by', 'charges', 'reason'], filter: ['kind', 'Kind'], target: 'subject' } };
export const ACTIONS = { alert: 'Alert in the CAD', discord: 'Post to a Discord channel', pm: 'Message the player in game', announce: 'Announce in game', call: 'Put a call on the dispatch board' };
const DEPTS = ['pd', 'fd', 'dot', 'all'];
const okHook = u => (process.env.BOT_HOOKS_ALLOW_LOCAL === '1' && /^http:\/\/127\.0\.0\.1:\d+\//.test(String(u || ''))) || /^https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d{5,30}\/[\w-]{20,120}$/.test(String(u || ''));
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const ML = (v, n) => String(v ?? '').replace(/\r/g, '').replace(/[\u0000-\u0009\u000b-\u001f]/g, ' ').trim().slice(0, n);   // keeps line breaks
// made-up details for tests and the message preview
export const SAMPLE = { join: { player: 'Hype', team: 'Civilian' }, call: { type: 'Test call', where: 'Postal 214', team: 'Police' }, alpr: { plate: 'TEST 123', vehicle: 'Black Falcon', owner: 'Hype', reasons: 'reported stolen', where: 'near postal 214' },
  panic: { unit: 'Patrol 1', player: 'Hype', dept: 'pd', where: 'near postal 214' }, record: { kind: 'citation', subject: 'Hype', plate: 'TEST 123', by: 'Hype', charges: 'Speeding', reason: '' } };
// a Discord post as the message editor makes it: text, who it posts as, and an embed with fields
const okImg = u => /^https:\/\/[^\s<>"']{4,400}$/.test(String(u || '').trim()) ? String(u).trim() : '';
const cleanMsg = (m, text) => { m = m && typeof m === 'object' ? m : {}; const out = { content: ML(m.content ?? text, 1900), name: T(m.name, 80).replace(/discord|clyde/gi, ''), avatar: okImg(m.avatar) };
  if (m.embed) { const F = (Array.isArray(m.fields) ? m.fields : []).slice(0, 10).map(f => ({ n: T(f?.n, 256), v: ML(f?.v, 1024), i: !!f?.i })).filter(f => f.n || f.v);
    out.embed = true; Object.assign(out, { color: /^#[0-9a-f]{6}$/i.test(m.color || '') ? m.color : '#3987E5', author: T(m.author, 256), title: T(m.title, 256), url: okImg(m.url), desc: ML(m.desc, 3000), fields: F,
      image: okImg(m.image), thumb: okImg(m.thumb), footer: T(m.footer, 2048), ts: !!m.ts }); }
  return out; };
const hasMsg = m => !!(m.content || (m.embed && (m.title || m.desc || m.author || m.fields.length || m.image || m.footer)));

// a rule as posted by the settings page, checked and trimmed; null when it isn't a rule
const cleanRule = r => { if (!r || !TRIGGERS[r.when]) return null;
  const then = (Array.isArray(r.then) ? r.then : []).slice(0, 5).map(a => { if (!ACTIONS[a?.do]) return null;
    const x = { do: a.do, text: T(a.text, 400) };
    if (a.do === 'alert') x.depts = (Array.isArray(a.depts) ? a.depts : []).filter(d => DEPTS.includes(d)).slice(0, 4);
    if (a.do === 'discord') { if (!okHook(a.url)) return null; x.url = String(a.url).trim(); x.msg = cleanMsg(a.msg, a.text); x.text = x.msg.content.slice(0, 400); return hasMsg(x.msg) ? x : null; }
    if (a.do === 'call') x.dept = ['pd', 'fd', 'dot'].includes(a.dept) ? a.dept : 'pd';
    return x.text || a.do === 'alert' ? x : null; }).filter(Boolean);
  if (!then.length) return null;
  return { id: /^[a-z0-9]{6,16}$/.test(r.id || '') ? r.id : Math.random().toString(36).slice(2, 10), on: r.on !== false, name: T(r.name, 60) || TRIGGERS[r.when].name, when: r.when, match: T(r.match, 60), then }; };
export const rules = c => (Array.isArray(c.settings.automations) ? c.settings.automations : []);
export const save = (c, list, store) => { if (!Array.isArray(list)) return { error: 'Nothing to save.' }; if (list.length > 25) return { error: 'A server can have up to 25 automations.' };
  const bad = list.findIndex(r => !cleanRule(r)); if (bad >= 0) return { error: `Automation ${bad + 1} needs a trigger and at least one action filled in${list[bad]?.then?.some?.(a => a?.do === 'discord') ? ' (and a Discord webhook link)' : ''}.` };
  c.settings.automations = list.map(cleanRule); store(); return { ok: true, rules: rules(c) }; };

// what ran lately, per server, for the settings page
const runs = new Map(); const logRun = (cid, x) => { const L = runs.get(cid) || []; L.unshift({ at: now(), ...x }); runs.set(cid, L.slice(0, 30)); };
export const recent = cid => runs.get(cid) || [];
const fill = (s, v) => String(s || '').replace(/\{(\w+)\}/g, (m, k) => v[k] != null && v[k] !== '' ? String(v[k]) : m === '{where}' ? 'unknown location' : '');
const lastRun = new Map(), dayCount = new Map();

// the server's hands, set up by server.mjs: { alert(c, depts, title, text), command(c, cmd), call(c, dept, where, text) }
let H = null; export const wire = h => { H = h; };
// something happened on a server: every rule that matches runs its actions
export const fire = (c, when, vars, test = false) => { if (!H) return [];
  const ran = []; for (const r of rules(c)) { if (r.when !== when || (!r.on && !test)) continue;
    const field = TRIGGERS[when].filter?.[0]; if (r.match && field && !String(vars[field] ?? '').toLowerCase().includes(r.match.toLowerCase())) continue;
    const k = `${c.id}:${r.id}:${vars[TRIGGERS[when].target] || ''}`, day = `${c.id}:${new Date().toISOString().slice(0, 10)}`;
    if (!test && now() - (lastRun.get(k) || 0) < (TRIGGERS[when].target && vars[TRIGGERS[when].target] ? 5 * 60000 : 5000)) continue;   // the same player or car at most every five minutes
    if (!test && (dayCount.get(day) || 0) >= 500) continue; lastRun.set(k, now()); dayCount.set(day, (dayCount.get(day) || 0) + 1);
    for (const a of r.then) run(c, r, a, vars).then(res => logRun(c.id, { rule: r.name, action: ACTIONS[a.do], ok: !res?.error, detail: res?.error || res?.detail || '', test })).catch(e => logRun(c.id, { rule: r.name, action: ACTIONS[a.do], ok: false, detail: e.message, test }));
    ran.push(r.name); }
  return ran; };
const run = async (c, r, a, v) => { const text = fill(a.text, v);
  if (a.do === 'alert') { H.alert(c, a.depts.length ? a.depts : ['all'], r.name, text); return { detail: 'Shown in the CAD' }; }
  if (a.do === 'discord') { const m = a.msg || { content: a.text }, f = x => fill(x, v), body = { username: (m.name ? f(m.name) : c.name).slice(0, 80) || 'Oversite', content: f(m.content).slice(0, 2000), allowed_mentions: { parse: [] } };
    if (m.avatar) body.avatar_url = m.avatar;
    if (m.embed) { const e = { color: parseInt(String(m.color || '#3987E5').slice(1), 16) }; if (m.title) e.title = f(m.title).slice(0, 256); if (m.url) e.url = m.url; if (m.desc) e.description = f(m.desc).slice(0, 4096);
      if (m.author) e.author = { name: f(m.author).slice(0, 256) }; if (m.footer) e.footer = { text: f(m.footer).slice(0, 2048) }; if (m.ts) e.timestamp = new Date().toISOString();
      if (m.image) e.image = { url: m.image }; if (m.thumb) e.thumbnail = { url: m.thumb };
      const F = (m.fields || []).map(x => ({ name: f(x.n).slice(0, 256) || '\u200b', value: f(x.v).slice(0, 1024) || '\u200b', inline: !!x.i })); if (F.length) e.fields = F; body.embeds = [e]; }
    const res = await fetch(a.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    return res.ok ? { detail: 'Posted' } : { error: `Discord answered ${res.status}` }; }
  if (a.do === 'pm') { const who = v[TRIGGERS[r.when].target]; if (!who) return { error: 'No player to message' }; const res = await H.command(c, `:pm ${who} ${text}`.slice(0, 200)); return res?.ok === false ? { error: res.message || 'ER:LC refused' } : { detail: `Sent to ${who}` }; }
  if (a.do === 'announce') { const res = await H.command(c, `:h ${text}`.slice(0, 200)); return res?.ok === false ? { error: res.message || 'ER:LC refused' } : { detail: 'Announced' }; }
  if (a.do === 'call') { H.call(c, a.dept, v.where || 'Unknown location', text || r.name); return { detail: 'Call added' }; } };

// players joining and new 911 calls, read from each live update (the first update after a restart only learns who's there)
const seenPlayers = new Map(), seenCalls = new Map();
export const observe = (c, body) => { if (!rules(c).some(r => r.on && (r.when === 'join' || r.when === 'call'))) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const P = new Map((j.Players || []).map(p => [String(p.Player || '').split(':')[0], p.Team || '']).filter(([n]) => n)), prev = seenPlayers.get(c.id);
  if (prev) for (const [name, team] of P) if (name && !prev.has(name)) fire(c, 'join', { player: name, team });
  seenPlayers.set(c.id, new Set(P.keys()));
  const calls = Array.isArray(j.EmergencyCalls) ? j.EmergencyCalls : [], key = x => `${x.CallNumber ?? ''}@${x.StartedAt ?? ''}`, was = seenCalls.get(c.id);
  if (was) for (const x of calls) if (!was.has(key(x))) fire(c, 'call', { type: x.Description || 'Emergency call', where: x.PositionDescriptor || '', team: x.Team || '' });
  seenCalls.set(c.id, new Set(calls.map(key))); };
