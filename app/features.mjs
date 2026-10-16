// Settings → Features: every part of the CAD a server can switch off. Anything not switched off is on.
// Most live in c.settings.features; a few are the switches other settings already keep (the civilian economy, proximity
// voice, boundaries, the Explore listing), so turning one here is the same as turning it there.
import { communities } from './db.mjs';

export const GROUPS = [
  ['Sections of the CAD', [
    ['civ', 'Civilian', 'The Civilian tab: money, bills, ID, vehicles, housing, shops, work and businesses.'],
    ['staff', 'Server Staff', 'The staff tab for mods and admins: players in game, bans, kicks and logs.', 'premium'],
    ['status', 'Status & Updates', 'Your server’s status and what’s new in Oversite.']]],
  ['Civilian', [
    ['housing', 'Housing', 'Buying, renting and mortgages, with rent, mortgage payments and property tax billed weekly.'],
    ['cars', 'Vehicle bills', 'Weekly registration and insurance on the civilian cars players drive.'],
    ['fines', 'Fines', 'Citations and arrests written in the MDT are billed to the player as fines.'],
    ['biz', 'Businesses, work and shops', 'Players start businesses, hire staff, take tasks with mini-games and sell in Shops.']]],
  ['Departments', [
    ['panic', 'Panic button', 'Units hold the panic button in the MDT to alert dispatch with a siren and a priority call.'],
    ['gps', 'Directions', 'Turn-by-turn directions to a call in the MDT, with spoken turns.']]],
  ['Server', [
    ['voice', 'Proximity voice', 'Players hear each other by distance in game. Range and muffling are under Premium.', 'premium'],
    ['bounds', 'Boundaries', 'Warn and kick players who leave the areas you draw under Boundaries.'],
    ['explore', 'Listed on Explore', 'Show your server on the Explore page so new players can find it.']]]];
export const KEYS = GROUPS.flatMap(([, items]) => items.map(i => i[0]));

// is this feature on for the server?
export const on = (c, k) => {
  if (k === 'civ') return (c.settings.civ || {}).on !== false;
  if (k === 'voice') return !!(c.settings.voice || {}).on;
  if (k === 'bounds') return !!(c.settings.bounds || {}).on;
  if (k === 'explore') return !(c.settings.profile || {}).unlisted;
  return (c.settings.features || {})[k] !== false; };
export const all = c => Object.fromEntries(KEYS.map(k => [k, on(c, k)]));

// switch one on or off; voice needs Premium to turn on
export const set = (c, k, v, prem) => { if (!KEYS.includes(k)) return { error: 'There is no such feature.' }; v = !!v;
  if (k === 'voice' && v && !prem) return { error: 'Proximity voice is part of Premium.' };
  const s = communities.byId(c.id).settings;
  if (k === 'civ') s.civ = { ...(s.civ || {}), on: v };
  else if (k === 'voice') s.voice = { ...(s.voice || {}), on: v };
  else if (k === 'bounds') s.bounds = { ...(s.bounds || {}), on: v };
  else if (k === 'explore') s.profile = { ...(s.profile || {}), unlisted: !v };
  else s.features = { ...(s.features || {}), [k]: v };
  communities.saveSettings(c.id, s); c.settings = s; return { ok: true, features: all(c) }; };
