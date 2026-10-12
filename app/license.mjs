// The Liberty County driver's license on the MDT's card reader, and the ranks you sign in to an MDT with.
// ER:LC's API has no license data, so the photo, @username and display name come from Roblox and the rest is filled in by the player.
import { licenses } from './db.mjs';

// lowest to highest; the number is the collar insignia shown next to it (bugles, bars, stars)
export const RANKS = {
  fd: [['Probationary Firefighter', 0], ['Firefighter', 0], ['Engineer', 0], ['Lieutenant', 1], ['Captain', 2], ['Battalion Chief', 2], ['Deputy Chief', 3], ['Fire Chief', 5]],
  pd: [['Cadet', 0], ['Officer', 0], ['Senior Officer', 0], ['Corporal', 0], ['Sergeant', 0], ['Lieutenant', 1], ['Captain', 2], ['Deputy Chief', 3], ['Chief of Police', 4]],
  dot: [['Trainee', 0], ['Operator', 0], ['Senior Operator', 0], ['Crew Lead', 1], ['Supervisor', 2], ['Superintendent', 3], ['Director', 4]] };
export const validRank = (dept, rank) => !!RANKS[dept]?.some(r => r[0] === rank);

// what each field may hold: the license's own short forms (BLK, BRN…), kept short so the card never overflows
const T = (v, n) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
export const cleanLicense = b => {
  const o = { age: T(b.age, 16), gndr: T(b.gndr, 3).toUpperCase(), hair: T(b.hair, 4).toUpperCase(), eyes: T(b.eyes, 4).toUpperCase(), addr: T(b.addr, 34) };
  const ft = +b.ft, inch = +b.in; o.hgt = Number.isInteger(ft) && ft >= 3 && ft <= 8 && Number.isInteger(inch) && inch >= 0 && inch <= 11 ? `${ft}' ${inch}"` : '';
  const w = Math.round(+b.wgt); o.wgt = w >= 50 && w <= 600 ? `${w} lbs` : '';
  o.iss = /^\d{4}-\d{2}-\d{2}$/.test(String(b.iss || '')) && !isNaN(Date.parse(b.iss)) ? b.iss : '';
  return o; };

// display name and account age from Roblox, kept a few hours
const rbx = new Map();
const robloxUser = async rid => { const hit = rbx.get(rid); if (hit && Date.now() - hit.at < 6 * 3600e3) return hit;
  let v = { display: '', created: '', at: Date.now() }; try { const j = await fetch(`https://users.roblox.com/v1/users/${rid}`).then(r => r.ok ? r.json() : {}); v = { display: T(j.displayName, 40), created: String(j.created || '').slice(0, 10), at: Date.now() }; } catch (e) {}
  if (rbx.size > 5000) rbx.clear(); rbx.set(rid, v); return v; };

// everything the card shows for this person; the issue date defaults to when their Roblox account was made
export const licenseOf = async user => { const f = licenses.get(user.id), r = user.roblox_id ? await robloxUser(String(user.roblox_id)) : { display: '', created: '' };
  return { user: user.roblox_name || '', rid: user.roblox_id || '', display: r.display || user.roblox_name || '', ...f, iss: f.iss || r.created || '', saved: !!Object.keys(f).length }; };
export const saveLicense = (user, b) => { licenses.set(user.id, cleanLicense(b || {})); return licenseOf(user); };
