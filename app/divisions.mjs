// A server's own departments (Premium), in place of the three standard ones (Law enforcement, Fire and EMS, Transportation): an
// Ontario Provincial Police, a Toronto Fire Service, a Toronto Paramedic Service. Once a server makes any, the standard ones go away
// and its tabs are its own. Each works like one of the three (its kind: the MDT it uses) with its own name, short name, units and
// Discord roles, and gets the calls it picks: robberies but not traffic, house fires but not medical calls, and so on (CALL_GROUPS;
// the CAD sorts each call by the team it went to and what the caller said). Its players are the ones on an in-game team given to it
// (Police → Ontario Provincial Police) or, on a team given to another department of the same kind, the ones who pick one of its
// units in the MDT (paramedics on the Fire team pick a paramedic unit). Without Premium the standard departments come back; the
// server's own stay saved.
// c.settings.divs = [{ id, kind, name, short, units, calls: [type, …] }], c.settings.teamDiv = { <team>: id }
import { isPremium } from './premium.mjs';
import * as features from './features.mjs';

export const MAX = 8, KINDS = ['pd', 'fd', 'dot'];
// the kinds of call a department can take, by group; the CAD's sorter (window.callType in live-map.html) uses the same keys
export const CALL_GROUPS = [
  { key: 'le', name: 'Law enforcement', types: [['le_robbery', 'Robberies: stores, banks and houses'], ['le_burglary', 'Break-ins and burglaries'], ['le_shots', 'Shots fired and armed people'],
    ['le_assault', 'Fights, assaults and stabbings'], ['le_theft', 'Theft and stolen vehicles'], ['le_traffic', 'Reckless driving, pursuits and hit and runs'],
    ['le_disturb', 'Suspicious people, disturbances and threats'], ['le_other', 'Any other police call']] },
  { key: 'fire', name: 'Fire', types: [['fire_building', 'Building and house fires'], ['fire_vehicle', 'Vehicle fires'], ['fire_brush', 'Brush and wildfires'],
    ['fire_alarm', 'Fire alarms, gas leaks and explosions'], ['fire_rescue', 'Rescues: trapped, stuck, in the water'], ['fire_other', 'Any other fire call']] },
  { key: 'ems', name: 'EMS', types: [['ems_medical', 'Medical emergencies: unresponsive, breathing, heart, overdoses'], ['ems_injury', 'Injuries, falls and wounds'],
    ['ems_crash', 'Crashes with injuries'], ['ems_other', 'Any other call for EMS']] },
  { key: 'dot', name: 'Transportation', types: [['dot_disabled', 'Broken-down vehicles'], ['dot_tow', 'Tows and blocked roads'], ['dot_hazard', 'Road hazards, debris and damage'],
    ['dot_other', 'Any other DOT call']] }];
export const CALL_KEYS = CALL_GROUPS.flatMap(g => g.types.map(t => t[0]));
const keysOf = (...g) => CALL_GROUPS.filter(x => g.includes(x.key)).flatMap(x => x.types.map(t => t[0]));
// what a new department takes until the owner picks: everything of its kind
export const DEFAULT_CALLS = { pd: keysOf('le'), fd: keysOf('fire', 'ems'), dot: keysOf('dot') };
// departments saved before calls were picked type by type: 'medical' was an EMS that took only medical calls
const callsOf = d => Array.isArray(d.calls) ? d.calls.filter(k => CALL_KEYS.includes(k)) : d.calls === 'medical' ? keysOf('ems') : DEFAULT_CALLS[d.kind] || [];

const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
// the departments saved, whether or not they're in use. Ones added before a server's own replaced the standard ones (a Sheriff's
// Office beside Law Enforcement) sat next to the standard ones: those come back as the server's own too, so nothing goes missing
// (EMS that took medical calls leaves the fire department only the fire ones).
const STD = { pd: ['Law Enforcement', 'LE'], fd: ['Fire Department', 'FD'], dot: ['Department of Transportation', 'DOT'] };
export const saved = c => { const raw = (Array.isArray(c.settings.divs) ? c.settings.divs : []).filter(d => d && KINDS.includes(d.kind)), out = raw.map(d => ({ ...d, calls: callsOf(d) }));
  if (!raw.some(d => !Array.isArray(d.calls))) return out;
  const D = c.settings.depts || {}, ems = raw.some(d => d.kind === 'fd' && d.calls === 'medical');
  const std = KINDS.filter(k => features.on(c, 'dept_' + k)).map(k => ({ id: 's' + k, kind: k, name: D[k]?.name || STD[k][0], short: D[k]?.short || STD[k][1], units: D[k]?.units || [], calls: k === 'fd' && ems ? keysOf('fire') : DEFAULT_CALLS[k] }));
  return [...std, ...out].sort((a, b) => KINDS.indexOf(a.kind) - KINDS.indexOf(b.kind)); };
// the ones in use: a Premium server's own, or none (the standard departments)
export const list = c => isPremium(c) ? saved(c) : [];
export const custom = c => list(c).length > 0;
// which department each in-game team belongs to. A team still on a standard department (saved before) goes to the first of the
// server's own of that kind.
export const teamDiv = c => { const L = list(c); if (!L.length) return {}; const ids = new Set(L.map(d => d.id)), m = c.settings.teamDiv || {}, out = {};
  for (const [t, k] of Object.entries(c.settings.teams || {})) { if (ids.has(m[t])) out[t] = m[t]; else if (m[t] !== '') { const d = KINDS.includes(k) && L.find(x => x.kind === k); if (d) out[t] = d.id; } }   // '': set to none
  return out; };
// the in-game teams with the kind of department each is on: with the server's own departments, a team on none of them isn't on the CAD
export const teams = c => { const T0 = c.settings.teams || {}; if (!custom(c)) return T0; const td = teamDiv(c), L = list(c);
  return Object.fromEntries(Object.keys(T0).map(t => [t, td[t] ? L.find(d => d.id === td[t]).kind : ''])); };

// the departments sent from Settings, checked; ids are kept for ones that already existed so players' unit picks still match
export const clean = (c, raw, rude) => { if (!Array.isArray(raw)) return { divs: saved(c) }; if (raw.length > MAX) return { error: `A server can have up to ${MAX} of its own departments.` };
  if (raw.length && !isPremium(c)) return { error: 'Making your own departments comes with Premium.' };
  const old = new Set(saved(c).map(d => d.id)), used = new Set(), divs = [];
  for (const x of raw) { const kind = KINDS.includes(x?.kind) ? x.kind : null, name = T(x?.name, 40), short = T(x?.short, 6).toUpperCase();
    if (!kind) return { error: 'Pick what each department works like.' }; if (!name || !short) return { error: 'Every department needs a name and a short name.' };
    const units = [...new Set((Array.isArray(x.units) ? x.units : String(x.units || '').split(',')).map(u => T(u, 40)).filter(Boolean))].slice(0, 20);
    if (units.some(u => u.length > 24)) return { error: 'Keep each unit name to 24 characters.' }; if ([name, short, ...units].some(v => rude(v))) return { rude: true };
    const calls = Array.isArray(x.calls) ? [...new Set(x.calls.filter(k => CALL_KEYS.includes(k)))] : DEFAULT_CALLS[kind];
    if (!calls.length) return { error: `Pick at least one kind of call for ${name}.` };
    let id = old.has(x.id) && !used.has(x.id) ? x.id : ''; for (let i = 1; !id; i++) if (!old.has('d' + i) && !used.has('d' + i) && !raw.some(y => y?.id === 'd' + i)) id = 'd' + i;
    used.add(id); divs.push({ id, kind, name, short, units, calls }); }
  return { divs }; };
