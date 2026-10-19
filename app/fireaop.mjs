// Fire AOP: where fires may burn. Staff draw areas on the map in the CAD's Server Staff panel and pick which are the AOP. The
// fire department calls ER:LC makes by itself (fires, alarms, crashes, medical calls; no caller) come with a map position in
// the same units as player positions, so each new one is checked against the AOP: outside it, the call is taken off the CAD's
// fire board, and a fire is put out in game with :stopfire (which puts out every fire, so not while one burns inside the AOP).
// Settings: c.settings.fireaop = { on, hide, stop, scope: 'fires' | 'all', areas: [{ id, name, on, pts: [[x, z], …] }] }
import { communities } from './db.mjs';

export const MAX_AREAS = 12, MAX_POINTS = 200, STOP = ':stopfire';
const SIZE = 5355, id = () => Math.random().toString(36).slice(2, 9);
const num = v => Math.round(Math.min(SIZE * 1.2, Math.max(-SIZE * 0.2, +v || 0)) * 10) / 10;
export const of = c => { const f = (communities.byId(c.id) || c).settings.fireaop || {};
  return { on: !!f.on, hide: f.hide !== false, stop: f.stop !== false, scope: f.scope === 'all' ? 'all' : 'fires', areas: Array.isArray(f.areas) ? f.areas : [] }; };

export const save = (c, j) => {
  const areas = (Array.isArray(j.areas) ? j.areas : []).slice(0, MAX_AREAS).map((a, i) => ({ id: /^[a-z0-9]{3,12}$/.test(a?.id) ? a.id : id(),
    name: String(a?.name || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 32) || `Area ${i + 1}`, on: !!a?.on,
    pts: (Array.isArray(a?.pts) ? a.pts : []).slice(0, MAX_POINTS).filter(q => Array.isArray(q) && q.length >= 2).map(q => [num(q[0]), num(q[1])]) })).filter(a => a.pts.length >= 3);
  const f = { on: !!j.on, hide: j.hide !== false, stop: j.stop !== false, scope: j.scope === 'all' ? 'all' : 'fires', areas };
  if (f.on && !areas.some(a => a.on)) return { error: 'Pick at least one area as the AOP, or switch Fire AOP off.' };
  const s = communities.byId(c.id).settings; s.fireaop = f; communities.saveSettings(c.id, s); c.settings.fireaop = f; handled.delete(c.id); return { ok: true }; };

// is a point inside a polygon (ray casting) / inside any area that is part of the AOP
const inside = (pts, x, z) => { let a = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j];
  if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) a = !a; } return a; };
export const inAop = (f, x, z) => f.areas.some(a => a.on && inside(a.pts, x, z));
const burning = d => /\bfire$/i.test(String(d || '').trim());          // "Reported Brush Fire", "Reported Dumpster Fire"; not alarms
const fireCall = d => /fire/i.test(String(d || ''));                   // fires and fire alarms

// the game's own fire department calls on a server right now, and what Fire AOP did lately (in memory, for the panel)
const live = new Map(), recent = new Map(), handled = new Map(), lastStop = new Map();
export const view = c => ({ ...of(c), calls: live.get(c.id) || [], recent: recent.get(c.id) || [], command: STOP });
const log = (cid, x) => { const L = recent.get(cid) || []; L.unshift(x); recent.set(cid, L.slice(0, 20)); return x; };

// each live update (the raw JSON from ER:LC): H = { key(call), clear(c, key), command(c, cmd) -> Promise<{ ok, message }> }
export const observe = (c, body, H) => { if (!/"Team":"Fire/i.test(body)) { live.set(c.id, []); return; } let j; try { j = JSON.parse(body); } catch (e) { return; }
  const calls = (Array.isArray(j.EmergencyCalls) ? j.EmergencyCalls : []).filter(k => /fire/i.test(k.Team || '') && !k.Caller && Array.isArray(k.Position) && k.Position.length >= 2);
  const f = of(c); live.set(c.id, calls.map(k => ({ key: H.key(k), what: String(k.Description || 'Call'), where: String(k.PositionDescriptor || ''), x: +k.Position[0], z: +k.Position[1], in: f.areas.some(a => a.on) ? inAop(f, +k.Position[0], +k.Position[1]) : null })));
  if (!f.on) return;
  const done = handled.get(c.id) || new Set(); handled.set(c.id, done); if (done.size > 500) done.clear();
  for (const k of calls) { const key = H.key(k); if (done.has(key)) continue; done.add(key);
    const what = String(k.Description || 'Call'), [x, z] = k.Position.map(Number);
    if (f.scope === 'fires' && !fireCall(what)) continue;
    if (inAop(f, x, z)) continue;
    const e = log(c.id, { at: Date.now(), what, where: String(k.PositionDescriptor || ''), hidden: false, stop: '' });
    if (f.hide) { H.clear(c, key); e.hidden = true; }
    if (!f.stop || !burning(what)) continue;
    if (calls.some(o => o !== k && burning(o.Description) && inAop(f, +o.Position[0], +o.Position[1]))) { e.stop = 'kept'; continue; }   // a fire burns inside the AOP too
    if (Date.now() - (lastStop.get(c.id) || 0) < 20000) { e.stop = 'sent'; continue; }                                                // one stop covers fires that came in together
    lastStop.set(c.id, Date.now()); e.stop = 'sending';
    H.command(c, STOP).then(r => { e.stop = r?.ok ? 'sent' : 'refused'; if (!r?.ok) e.msg = String(r?.message || '').slice(0, 160); }).catch(() => { e.stop = 'refused'; }); } };

// staff putting out every fire now (also how they check the command works on their server)
export const putOut = async (c, H) => { const r = await H.command(c, STOP); lastStop.set(c.id, Date.now());
  log(c.id, { at: Date.now(), what: 'Every fire put out by staff', where: '', hidden: false, stop: r?.ok ? 'sent' : 'refused', msg: r?.ok ? '' : String(r?.message || '').slice(0, 160) });
  return r?.ok ? { ok: true } : { error: r?.message || 'ER:LC refused the command.' }; };
