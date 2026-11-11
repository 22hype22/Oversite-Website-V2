// AI view: the CAD for public ER:LC servers, where there is no server key to read players and calls from. Players share their
// Roblox window from the CAD; every 5 seconds a frame goes to Claude (Haiku), which reads what the ER:LC screen shows: the postal
// code and street on the HUD, the players whose nameplates are on screen, and anything a dispatcher should hear about (a crash,
// a fire, shots). From that the server keeps its own picture of the server: where each sharer is, who they're near, and calls
// for what they saw. It is served to the CAD (and the Oversite AI Dispatch bot, through the bot API) as if ER:LC had sent it,
// so the map, units, MDTs and dispatch all work as on a private server. Frames are never stored.
// Premium servers with the Oversite AI Dispatch bot, without an ER:LC key. The Anthropic key is set by a site admin on /admin.
import Anthropic from '@anthropic-ai/sdk';
import { siteSettings, unseal } from './db.mjs';
import { POSTALS } from './postals.mjs';

const MODEL = 'claude-haiku-5-5', EVERY = 5000, MIN_GAP = 4000, MAX_SHARERS = 10, SELF_TTL = 30000, SEEN_TTL = 60000, GAME = 5355 / 2000;
export const key = () => (process.env.ANTHROPIC_API_KEY || unseal(siteSettings.get('anthropic_key')) || '').trim();
let client = null, clientKey = '';
const api = () => { const k = key(); if (!k) return null; if (!client || clientKey !== k) { client = new Anthropic({ apiKey: k, maxRetries: 1, timeout: 20000 }); clientKey = k; } return client; };
export const status = () => ({ ready: !!key(), fromEnv: !!(process.env.ANTHROPIC_API_KEY || '').trim(), model: MODEL });
export const EVERY_MS = EVERY;

const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
const SYSTEM = `You look at one frame of someone playing Emergency Response: Liberty County (ER:LC) on Roblox, captured from their screen, and report only what is actually visible.
- postal: the postal code ER:LC shows on its HUD (usually bottom left or near the minimap, often "Postal 214" or just the number). Digits only. null if you can't read it.
- street: the street name on the HUD, if shown. null otherwise.
- in_vehicle: true if the player is driving or riding in a vehicle.
- nearby: players whose name tags (nameplates above their heads) you can read. Give each username exactly as written (no display-name guessing), how near they look (close: a few metres; near: down the street; far: in the distance), and their team if their uniform, vehicle or name-tag colour makes it obvious (police, sheriff, fire, dot, civilian), otherwise unknown. Leave out the player whose screen this is.
- events: only things a dispatcher should send units to that are happening on screen right now: a vehicle crash, a fire, gunshots or someone shooting, someone injured or down, a pursuit, a robbery in progress. Each with a short plain description. Usually there are none.
- screen_ok: false if this is not ER:LC gameplay (a menu, a loading screen, another window).
Never invent names, postal codes or events you cannot see.`;
const TOOL = { name: 'report_view', description: 'Report what this ER:LC frame shows.', strict: true, input_schema: { type: 'object', additionalProperties: false,
  required: ['screen_ok', 'postal', 'street', 'in_vehicle', 'nearby', 'events'],
  properties: { screen_ok: { type: 'boolean' }, postal: { anyOf: [{ type: 'string' }, { type: 'null' }] }, street: { anyOf: [{ type: 'string' }, { type: 'null' }] }, in_vehicle: { type: 'boolean' },
    nearby: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['name', 'distance', 'team'], properties: { name: { type: 'string' }, distance: { type: 'string', enum: ['close', 'near', 'far'] }, team: { type: 'string', enum: ['police', 'sheriff', 'fire', 'dot', 'civilian', 'unknown'] } } } },
    events: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['kind', 'detail'], properties: { kind: { type: 'string', enum: ['crash', 'fire', 'shots', 'injured', 'pursuit', 'robbery', 'other'] }, detail: { type: 'string' } } } } } } };

// one frame: what it shows, or { error }
const read = async (jpegB64) => { const cl = api(); if (!cl) return { error: 'The AI view isn’t set up on Oversite yet.' };
  let r; try { r = await cl.messages.create({ model: MODEL, max_tokens: 1024, thinking: { type: 'disabled' }, output_config: { effort: 'low' }, system: SYSTEM, tools: [TOOL], tool_choice: { type: 'tool', name: TOOL.name },
    messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpegB64 } }, { type: 'text', text: 'Report what this frame shows.' }] }] }); }
  catch (e) { if (e instanceof Anthropic.RateLimitError) return { error: 'The AI is busy. It will catch up in a moment.', busy: true }; if (e instanceof Anthropic.AuthenticationError) return { error: 'The AI view isn’t set up on Oversite yet.' };
    if (e instanceof Anthropic.APIError) return { error: `The AI didn’t answer (${e.status || 'network'}).`, busy: true }; return { error: 'The AI didn’t answer.', busy: true }; }
  if (r.stop_reason === 'refusal') return { error: 'The AI couldn’t read that frame.' };
  const b = r.content.find(x => x.type === 'tool_use' && x.name === TOOL.name); if (!b || !b.input || typeof b.input !== 'object') return { error: 'The AI couldn’t read that frame.' };
  return { view: b.input, usage: r.usage }; };

// per server: the sharers and everyone they've seen, keyed by lower-case name; and the calls already made from what they saw
const S = new Map(); const st = cid => { let s = S.get(cid); if (!s) S.set(cid, s = { people: new Map(), calls: [], sharers: new Map(), frames: 0, tokens: 0 }); return s; };
const spread = (name, d) => { let h = 0; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0; const a = (h % 360) * Math.PI / 180, r = d === 'close' ? 6 : d === 'near' ? 18 : 40; return [Math.cos(a) * r, Math.sin(a) * r]; };
const KIND_DEPT = { crash: 'fd', fire: 'fd', injured: 'fd', shots: 'pd', pursuit: 'pd', robbery: 'pd', other: 'pd' };
const KIND_TEXT = { crash: 'Vehicle crash', fire: 'Fire', shots: 'Shots fired', injured: 'Person injured', pursuit: 'Pursuit', robbery: 'Robbery in progress', other: 'Incident' };

// a frame from a sharer. who = { name, rid, team, callsign }. hooks = { ridOf(name), call(dept, where, text) }. Returns what the CAD shows them.
export const frame = async (c, who, jpegB64, hooks) => { const s = st(c.id), now = Date.now(), ln = who.name.toLowerCase(), sh = s.sharers.get(ln);
  if (sh && now - sh.at < MIN_GAP) return { skipped: true };
  if (!sh && [...s.sharers.values()].filter(x => now - x.at < SELF_TTL).length >= MAX_SHARERS) return { error: `Up to ${MAX_SHARERS} people can share their screen at once on a server.` };
  s.sharers.set(ln, { at: now, name: who.name });
  const r = await read(jpegB64); if (r.error) return r; const v = r.view; s.frames++; s.tokens += (r.usage?.input_tokens || 0) + (r.usage?.output_tokens || 0);
  if (s.frames % 100 === 0) console.log(`vision: ${c.slug} ${s.frames} frames, ${s.tokens} tokens so far`);
  if (!v.screen_ok) return { ok: true, read: { screen_ok: false } };
  const me = s.people.get(ln) || { name: who.name }; const code = String(v.postal || '').replace(/\D/g, ''), P = POSTALS[code];
  if (P) { me.x = P[0]; me.y = P[1]; me.postal = code; } if (v.street) me.street = T(v.street, 60);
  Object.assign(me, { rid: who.rid || me.rid || '', team: who.team || me.team || 'Civilian', callsign: who.callsign || '', vehicle: !!v.in_vehicle, at: now, self: true }); s.people.set(ln, me);
  const near = [];
  if (Number.isFinite(me.x)) for (const n of (Array.isArray(v.nearby) ? v.nearby : []).slice(0, 15)) { const name = T(n.name, 30); if (!/^[A-Za-z0-9_]{3,20}$/.test(name) || name.toLowerCase() === ln) continue;
    const k = name.toLowerCase(), o = s.people.get(k) || { name }; near.push(name);
    if (o.self && now - o.at < SELF_TTL) continue;                         // they share their own screen: their own frames place them
    const [dx, dy] = spread(name, n.distance); Object.assign(o, { x: me.x + dx, y: me.y + dy, postal: me.postal, street: me.street, at: now, self: false, by: who.name, rid: o.rid || hooks.ridOf(name) || '' });
    const tm = { police: 'Police', sheriff: 'Sheriff', fire: 'Fire', dot: 'DOT', civilian: 'Civilian' }[n.team]; if (tm) o.team = tm; else o.team = o.team || 'Civilian';
    s.people.set(k, o); }
  // something a dispatcher should hear about becomes a call, once: not again for the same kind of thing near there in 3 minutes
  const made = [];
  for (const e of (Array.isArray(v.events) ? v.events : []).slice(0, 3)) { if (!KIND_TEXT[e.kind]) continue; const where = me.postal ? `Postal ${me.postal}${me.street ? ', ' + me.street : ''}` : me.street || 'Unknown location';
    s.calls = s.calls.filter(x => now - x.at < 180000); if (s.calls.some(x => x.kind === e.kind && (x.postal === me.postal || !me.postal))) continue;
    s.calls.push({ kind: e.kind, postal: me.postal, at: now }); const text = `${KIND_TEXT[e.kind]}: ${T(e.detail, 160)} (seen by ${who.name})`; hooks.call(KIND_DEPT[e.kind], where, text, Number.isFinite(me.x) ? [Math.round(me.x * GAME), Math.round(me.y * GAME)] : null); made.push(KIND_TEXT[e.kind]); }
  return { ok: true, read: { postal: me.postal || null, street: me.street || null, placed: Number.isFinite(me.x), nearby: near, calls: made } }; };

export const stop = (cid, name) => { const s = S.get(cid); if (!s) return; const ln = String(name || '').toLowerCase(); s.sharers.delete(ln); const p = s.people.get(ln); if (p) p.at = 0; };

// someone seen only on another player's screen, with no Roblox account Oversite knows: a steady made-up ID so the CAD can tell them apart
const pseudo = name => { let h = 7; for (const ch of name.toLowerCase()) h = (h * 131 + ch.charCodeAt(0)) % 1e9; return String(9e9 + h); };
// the server as ER:LC would describe it, from what the sharers saw: players with positions (ER:LC's own units), for the live feed
export const snapshotBody = c => { const s = st(c.id), now = Date.now(), P = [];
  for (const [k, p] of s.people) { if (now - p.at > (p.self ? SELF_TTL : SEEN_TTL)) { if (now - p.at > 10 * 60000) s.people.delete(k); continue; } if (!Number.isFinite(p.x)) continue;
    P.push({ Player: `${p.name}:${p.rid || pseudo(p.name)}`, Permission: 'Normal', Team: p.team || 'Civilian', Callsign: p.callsign || null, WantedStars: 0,
      Location: { LocationX: Math.round(p.x * GAME), LocationZ: Math.round(p.y * GAME), PostalCode: p.postal || '', StreetName: p.street || '' }, Oversite: { aiView: true, sharing: !!p.self } }); }
  return JSON.stringify({ Name: c.name, OwnerId: 0, CoOwnerIds: [], CurrentPlayers: P.length, MaxPlayers: 40, JoinKey: '', AccVerifiedReq: '', TeamBalance: false, Players: P, Vehicles: [], EmergencyCalls: [], JoinLogs: [], Staff: { Admins: {}, Mods: {}, Helpers: {} } }); };
export const sharing = cid => { const s = S.get(cid); if (!s) return []; const now = Date.now(); return [...s.sharers.values()].filter(x => now - x.at < SELF_TTL).map(x => x.name); };
