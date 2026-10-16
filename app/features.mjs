// Settings → Features: every part of the CAD a server can switch off. Anything not switched off is on.
// Most live in c.settings.features; a few are the switches other settings already keep (the civilian economy, proximity
// voice, boundaries, the Explore listing), so turning one here is the same as turning it there.
import { communities } from './db.mjs';

// each group is a card in Settings → Features; a feature with a `parent` sits under it and only matters while the parent is on.
// `tag` marks a Premium feature, `input` adds a number next to the switch (saved by the server route, not here)
const F = (key, name, about, x = {}) => ({ key, name, about, ...x });
export const GROUPS = [
  { title: 'Sections of the CAD', items: [
    F('civ', 'Civilian', 'The Civilian tab: money, bills, ID, vehicles, housing, shops, work and businesses.'),
    F('staff', 'Server Staff', 'The staff tab for mods and admins: players in game, bans, kicks and logs.', { tag: 'Premium' }),
    F('status', 'Status & Updates', 'Your server’s status and what’s new in Oversite.')] },
  { title: 'Civilian', items: [
    F('housing', 'Housing', 'Buying, renting and mortgages, with rent, mortgage payments and property tax billed weekly.', { parent: 'civ' }),
    F('cars', 'Vehicle bills', 'Weekly registration and insurance on the civilian cars players drive.', { parent: 'civ' }),
    F('fines', 'Fines', 'Citations and arrests written in the MDT are billed to the player as fines.', { parent: 'civ' }),
    F('biz', 'Businesses, work and shops', 'Players start businesses, hire staff, take tasks with mini-games and sell in Shops.', { parent: 'civ' }),
    F('biztax', 'Business tax', 'A cut of everything a business earns goes to the server: sales, paid bills and tasks.', { parent: 'biz', input: { label: 'Rate', unit: '%', min: 0, max: 50 } })] },
  { title: 'Departments', items: [
    F('panic', 'Panic button', 'Units hold the panic button in the MDT to alert dispatch with a siren and a priority call.'),
    F('gps', 'Directions', 'Turn-by-turn directions to a call in the MDT, with spoken turns.')] },
  { title: 'Server', items: [
    F('voice', 'Proximity voice', 'Players hear each other by distance in game. Range and muffling are under Premium.', { tag: 'Premium' }),
    F('bounds', 'Boundaries', 'Warn and kick players who leave the areas you draw under Boundaries.'),
    F('explore', 'Listed on Explore', 'Show your server on the Explore page so new players can find it.')] }];
// new extras a server opts into, so switching Oversite to a new version never changes how an existing server runs
const DEFAULT_OFF = new Set(['biztax']);
export const KEYS = GROUPS.flatMap(g => g.items.map(i => i.key));

// is this feature on for the server?
export const on = (c, k) => {
  if (k === 'civ') return (c.settings.civ || {}).on !== false;
  if (k === 'voice') return !!(c.settings.voice || {}).on;
  if (k === 'bounds') return !!(c.settings.bounds || {}).on;
  if (k === 'explore') return !(c.settings.profile || {}).unlisted;
  const v = (c.settings.features || {})[k]; return v == null ? !DEFAULT_OFF.has(k) : v !== false; };
export const all = c => Object.fromEntries(KEYS.map(k => [k, on(c, k)]));

// switch one on or off; voice needs Premium to turn on
export const set = (c, k, v, prem) => setMany(c, [k], v, prem);
export const setMany = (c, keys, v, prem) => { keys = [...new Set(keys)]; if (!keys.length || keys.some(k => !KEYS.includes(k))) return { error: 'There is no such feature.' }; v = !!v;
  if (v && !prem) keys = keys.filter(k => k !== 'voice'); if (!keys.length) return { error: 'Proximity voice is part of Premium.' };
  const s = communities.byId(c.id).settings;
  for (const k of keys) {
    if (k === 'civ') s.civ = { ...(s.civ || {}), on: v };
    else if (k === 'voice') s.voice = { ...(s.voice || {}), on: v };
    else if (k === 'bounds') s.bounds = { ...(s.bounds || {}), on: v };
    else if (k === 'explore') s.profile = { ...(s.profile || {}), unlisted: !v };
    else s.features = { ...(s.features || {}), [k]: v }; }
  communities.saveSettings(c.id, s); c.settings = s; return { ok: true, features: all(c) }; };
