// Safe zones: areas where no crime happens (spawn, the hospital, the station). Staff draw them in the CAD's Server Staff panel,
// under Mapping. A player who walks into one can get a private message, and a kill inside one gets the killer warned and, if the
// server wants, respawned or kicked. Kills come from ER:LC's kill log (read with the live feed), matched to where the killer and
// the victim were. Points are ER:LC map coordinates, like Boundaries.
// Settings: c.settings.safezones = { on, zones: [{ id, name, pts }], enter, enterMsg, kill: 'warn' | 'load' | 'kick' }
import { communities } from './db.mjs';
import { commandAs } from './staff.mjs';

export const MAX_ZONES = 16, MAX_POINTS = 200, KILL = ['warn', 'load', 'kick'];
const SIZE = 5355, id = () => Math.random().toString(36).slice(2, 9);
const num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
export const of = c => { const s = (communities.byId(c.id) || c).settings.safezones || {};
  return { on: !!s.on, zones: Array.isArray(s.zones) ? s.zones : [], enter: s.enter !== false, enterMsg: s.enterMsg || 'You are in a safe zone. No crime here.', kill: KILL.includes(s.kill) ? s.kill : 'warn' }; };
export const save = (c, j) => {
  const zones = (Array.isArray(j.zones) ? j.zones : []).slice(0, MAX_ZONES).map((z, i) => ({ id: typeof z?.id === 'string' && /^[a-z0-9]{3,12}$/.test(z.id) ? z.id : id(), name: T(z?.name, 32) || `Safe zone ${i + 1}`,
    pts: (Array.isArray(z?.pts) ? z.pts : []).slice(0, MAX_POINTS).filter(q => Array.isArray(q) && q.length >= 2).map(q => [num(q[0]), num(q[1])]) })).filter(z => z.pts.length >= 3);
  const s = { on: !!j.on, zones, enter: j.enter !== false, enterMsg: T(j.enterMsg, 150) || 'You are in a safe zone. No crime here.', kill: KILL.includes(j.kill) ? j.kill : 'warn' };
  if (s.on && !zones.length) return { error: 'Draw at least one safe zone, or switch safe zones off.' };
  const st = communities.byId(c.id).settings; st.safezones = s; communities.saveSettings(c.id, st); c.settings.safezones = s; return { ok: true }; };
export const wantsKills = c => !!c?.settings?.safezones?.on;

const inside = (pts, x, z) => { let a = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j];
  if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) a = !a; } return a; };
const zoneAt = (s, p) => p && s.zones.find(z => inside(z.pts, p.x, p.z));

// per server: who is in which zone (and since when they were last messaged), where everyone was on the last reading, the newest
// kill already looked at, and what happened lately (for the panel)
const STATE = new Map(); const state = cid => { let st = STATE.get(cid); if (!st) STATE.set(cid, st = { in: new Map(), told: new Map(), pos: new Map(), lastKill: null, log: [] }); return st; };
const note = (st, e) => { st.log.unshift({ at: Date.now(), ...e }); st.log.length = Math.min(st.log.length, 30); };
export const log = c => state(c.id).log;
const send = (c, key, st, cmd, e) => commandAs(c, key, cmd, 'Oversite Safe zones').then(r => { if (r && r.ok === false) { e.failed = String(r.message || 'ER:LC refused the command').slice(0, 160); } }).catch(() => {});
const nameOf = v => String(v || '').split(':')[0];

// one reading of the server (and its kill log): message whoever just walked into a zone, deal with kills inside one
export const check = (c, key, body, kills) => { const s = of(c); if (!s.on || !key || !s.zones.length) return; let j; try { j = JSON.parse(body); } catch (e) { return; }
  const st = state(c.id), now = Date.now(), pos = new Map();
  for (const p of j.Players || []) { const L = p.Location, name = nameOf(p.Player); if (!name || !L || !Number.isFinite(L.LocationX)) continue;
    const at = { x: L.LocationX, z: L.LocationZ }; pos.set(name.toLowerCase(), at); const z = zoneAt(s, at), was = st.in.get(name);
    if (!z) { if (was) st.in.delete(name); continue; }
    if (was === z.id) continue; st.in.set(name, z.id);
    if (s.enter && now - (st.told.get(name) || 0) > 180000) { st.told.set(name, now); send(c, key, st, `:pm ${name} ${s.enterMsg}`.slice(0, 200), {}); } }
  for (const n of st.in.keys()) if (!pos.has(n.toLowerCase())) st.in.delete(n);
  // kills since the last look; the first look after a restart only learns where the log is up to
  const K = (Array.isArray(kills) ? kills : []).filter(k => Number.isFinite(+k.Timestamp)).sort((a, b) => a.Timestamp - b.Timestamp);
  if (st.lastKill == null) st.lastKill = K.length ? +K[K.length - 1].Timestamp : 0;
  else for (const k of K) { if (+k.Timestamp <= st.lastKill) continue; st.lastKill = +k.Timestamp;
    const killer = nameOf(k.Killer), victim = nameOf(k.Killed); if (!killer || killer === victim) continue;
    const z = zoneAt(s, st.pos.get(victim.toLowerCase())) || zoneAt(s, st.pos.get(killer.toLowerCase())) || zoneAt(s, pos.get(killer.toLowerCase())); if (!z) continue;
    const e = { kind: 'kill', killer, victim, zone: z.name, action: s.kill }; note(st, e); console.log(`safe zones ${c.slug}: ${killer} killed ${victim} in ${z.name}`);
    send(c, key, st, `:pm ${killer} You killed ${victim} in a safe zone (${z.name}). No crime in safe zones.`.slice(0, 200), e);
    if (s.kill === 'load') send(c, key, st, `:load ${killer}`, e);
    if (s.kill === 'kick') send(c, key, st, `:kick ${killer} Killing in a safe zone`, e); }
  st.pos = pos; };

// runs whether or not anyone has the CAD open: every few seconds, servers with safe zones on are read (the live feed's latest
// answer when it is fresh, otherwise one request) with their kill log
export const start = (feedFor, keyOf) => setInterval(async () => {
  for (const c of communities.all()) { if (!c.settings.safezones?.on || c.suspended) continue; const key = keyOf(c.id); if (!key) continue;
    try { const f = feedFor(c), s = await f.snapshot(); if (s.status === 200) check(c, key, s.body, f.kills); } catch (e) {} } }, 5000);
