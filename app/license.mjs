// The Liberty County driver's license on the MDT's card reader, and the ranks you sign in to an MDT with.
// ER:LC's API has no license data, so the photo, @username and display name come from Roblox and the rest is filled in by the player.
import { licenses } from './db.mjs';

// lowest to highest; the number is the collar insignia shown next to it (bugles, bars, stars)
export const RANKS = {
  fd: [['Probationary Firefighter', 0], ['Firefighter', 0], ['Engineer', 0], ['Lieutenant', 1], ['Captain', 2], ['Battalion Chief', 2], ['Deputy Chief', 3], ['Fire Chief', 5]],
  pd: [['Cadet', 0], ['Officer', 0], ['Senior Officer', 0], ['Corporal', 0], ['Sergeant', 0], ['Lieutenant', 1], ['Captain', 2], ['Deputy Chief', 3], ['Chief of Police', 4]],
  dot: [['Trainee', 0], ['Operator', 0], ['Senior Operator', 0], ['Crew Lead', 1], ['Supervisor', 2], ['Superintendent', 3], ['Director', 4]] };
// a server's ranks: its own list on Premium (Settings, Premium, MDT ranks), otherwise the ones above. Each is [name, insignia, supervisor];
// a supervisor can approve and deny warrants. By default that's Sergeant and up for police, Lieutenant and up for fire, Crew Lead and up for DOT.
const SUP_FROM = { pd: 'Sergeant', fd: 'Lieutenant', dot: 'Crew Lead' };
const DEFAULT = Object.fromEntries(Object.entries(RANKS).map(([d, list]) => { const k = list.findIndex(r => r[0] === SUP_FROM[d]); return [d, list.map((r, i) => [r[0], r[1], i >= k])]; }));
export const MAX_RANKS = 20;
export const ranksFor = (c, premium) => Object.fromEntries(Object.keys(RANKS).map(d => { const own = premium && c.settings.ranks?.[d];
  return [d, Array.isArray(own) && own.length ? own.map(r => [r[0], 0, !!r[2]]) : DEFAULT[d]]; }));
export const validRank = (dept, rank, R = DEFAULT) => !!R[dept]?.some(r => r[0] === rank);
// the owner's edited lists, checked: names short and not repeated, at least one rank and at most MAX_RANKS per department; reset goes back to the defaults
export const saveRanks = (c, j, save) => { if (j.reset) { delete c.settings.ranks; save(); return { ok: true, ranks: ranksFor(c, true) }; }
  const out = {};
  for (const d of Object.keys(RANKS)) { const list = Array.isArray(j.ranks?.[d]) ? j.ranks[d] : null; if (!list) continue; const seen = new Set(), rows = [];
    for (const r of list.slice(0, MAX_RANKS)) { const name = String(r?.name ?? r?.[0] ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 32);
      if (!name || seen.has(name.toLowerCase())) continue; seen.add(name.toLowerCase()); rows.push([name, 0, !!(r?.sup ?? r?.[2])]); }
    if (!rows.length) return { error: 'Each department needs at least one rank.' }; out[d] = rows; }
  c.settings.ranks = { ...(c.settings.ranks || {}), ...out }; save(); return { ok: true, ranks: ranksFor(c, true) }; };

// what each field may hold: the license's own short forms (BLK, BRN…), kept short so the card never overflows
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
// Premium extras: a card finish, your own occupation line and signature
export const FINISHES = ['gold', 'holo', 'obsidian'];
export const cleanLicense = (b, prem = false) => {
  const o = { age: T(b.age, 16), gndr: T(b.gndr, 3).toUpperCase(), hair: T(b.hair, 4).toUpperCase(), eyes: T(b.eyes, 4).toUpperCase(), addr: T(b.addr, 34) };
  const ft = +b.ft, inch = +b.in; o.hgt = Number.isInteger(ft) && ft >= 3 && ft <= 8 && Number.isInteger(inch) && inch >= 0 && inch <= 11 ? `${ft}' ${inch}"` : '';
  const w = Math.round(+b.wgt); o.wgt = w >= 50 && w <= 600 ? `${w} lbs` : '';
  o.iss = /^\d{4}-\d{2}-\d{2}$/.test(String(b.iss || '')) && !isNaN(Date.parse(b.iss)) ? b.iss : '';
  if (prem) { o.finish = FINISHES.includes(b.finish) ? b.finish : ''; o.occx = T(b.occx, 20); o.sig = T(b.sig, 24); }
  return o; };

// display name and account age from Roblox, kept a few hours
const rbx = new Map();
const robloxUser = async rid => { const hit = rbx.get(rid); if (hit && Date.now() - hit.at < 6 * 3600e3) return hit;
  let v = { display: '', created: '', at: Date.now() }; try { const j = await fetch(`https://users.roblox.com/v1/users/${rid}`).then(r => r.ok ? r.json() : {}); v = { display: T(j.displayName, 40), created: String(j.created || '').slice(0, 10), at: Date.now() }; } catch (e) {}
  if (rbx.size > 5000) rbx.clear(); rbx.set(rid, v); return v; };

// everything the card shows for this person; the issue date defaults to when their Roblox account was made
export const licenseOf = async (user, prem = false) => { const f = { ...licenses.get(user.id) }, r = user.roblox_id ? await robloxUser(String(user.roblox_id)) : { display: '', created: '' };
  if (!prem) { delete f.finish; delete f.occx; delete f.sig; }   // the Premium extras only show while the person has Premium
  return { user: user.roblox_name || '', rid: user.roblox_id || '', display: r.display || user.roblox_name || '', ...f, iss: f.iss || r.created || '', saved: !!Object.keys(f).length, premium: !!prem }; };
// without Premium the extras can't be changed, but they are kept, so they come back if Premium does
export const saveLicense = (user, b, prem = false) => { const o = cleanLicense(b || {}, prem), old = licenses.get(user.id);
  if (!prem) for (const k of ['finish', 'occx', 'sig']) if (old[k]) o[k] = old[k];
  licenses.set(user.id, o); return licenseOf(user, prem); };
