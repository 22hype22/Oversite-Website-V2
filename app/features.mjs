// Settings → Features: every part of Oversite a server can switch off. Anything not switched off is on (except the few in
// DEFAULT_OFF, which a server opts into). Most live in c.settings.features; a few are switches other settings already keep
// (the civilian economy, proximity voice, boundaries, the Explore listing), so turning one here is the same as turning it there.
//
// A feature can have a `parent`: it only works while the parent is on, and the settings page shows it under it. `hide` is the
// CSS that takes it off the CAD (the page gets `off-<key>` on its body for each one that is off, see css()). What a feature
// does on the server is refused in server.mjs (routeKey() for the plain routes, and checks next to the ones that need the body),
// and what it charges is skipped in app/civ.mjs and app/civbiz.mjs.
import { communities } from './db.mjs';

const F = (key, name, about, x = {}) => ({ key, name, about, ...x });
const tab = (pane, area) => `${area} [data-pane="${pane}"]`;
export const GROUPS = [
  { title: 'Sections of the CAD', items: [
    F('dispatch_board', 'Dispatch board', 'The unit list, calls board and alerts on the Dispatch tab. The map stays, and the MDTs still open from it.', { hide: ['.rail', '#stage .foot', '#warn'] }),
    F('dept_pd', 'Law Enforcement MDT', 'The police department’s tab and MDT.'),
    F('dept_fd', 'Fire Department MDT', 'The fire and EMS department’s tab and MDT.'),
    F('dept_dot', 'Department of Transportation MDT', 'The DOT’s tab and MDT.'),
    F('civ', 'Civilian', 'The Civilian tab: money, bills, ID, vehicles, housing, shops, work and businesses.'),
    F('staff', 'Server Staff', 'The staff tab for mods and admins: players in game, bans, kicks and logs.', { tag: 'Premium' }),
    F('status', 'Status & Updates', 'Your server’s status and what’s new in Oversite.')] },

  { title: 'Dispatch', items: [
    F('map3d', '3D map', 'A 3D model of the county under the map style button on Dispatch. It loads only when someone picks it.', { hide: ['#layers [data-dim="3d"]'] }),
    F('unitlist', 'Unit list', 'The cards for every unit down the left side.', { parent: 'dispatch_board', hide: ['.fleet'] }),
    F('unitfilter', 'Department filters', 'The chips that filter units by department.', { parent: 'dispatch_board', hide: ['.rail .chips'] }),
    F('availability', 'Availability and stats', 'The unit availability chart and the online and active call counts.', { parent: 'dispatch_board', hide: ['#avail', '.rail .stats'] }),
    F('duty', 'On duty roster', 'Who is on duty, by department.', { parent: 'dispatch_board', hide: ['#dutyCard'] }),
    F('calls', 'Active calls board', 'Every open call with its priority, under the map.', { parent: 'dispatch_board', hide: ['#callsCard'] }),
    F('callalerts', 'Call alerts', 'The panel that pops up for new calls, with suggested units.', { parent: 'dispatch_board', hide: ['#warn'] }),
    F('callsound', 'New call sound', 'The tone that plays when a call comes in.', { parent: 'callalerts', hide: ['#warnSound'] }),
    F('assign', 'Assigning units', 'Sending, adding and removing units on a call, from dispatch and the MDT.', { hide: ['#warn [data-send]', '#warn [data-add]', '#warn [data-adding]', '#warn [data-unassign]', '#fdDetail [data-act="respond"]', '#fdDetail [data-act="assist"]', '#fdDetail [data-act="leave"]'] }),
    F('clearcall', 'Clearing calls', 'Closing a call for everyone once it’s handled.', { hide: ['#warn [data-clear]', '[data-act="clear"]', '[data-home="clear"]'] }),
    F('mapunits', 'Units on the map', 'Live unit pins and their tags on the map.', { hide: ['#pins .pin[data-unit]'] }),
    F('mapcalls', 'Calls on the map', 'Call pins on the map.', { hide: ['#pins .pin.call'] }),
    F('mapzoom', 'Map zoom buttons', 'The zoom in, zoom out and recenter buttons.', { hide: ['.mapctl'] }),
    F('mapstyle', 'Map style picker', 'Switching the map between its styles, light and dark.', { hide: ['#layers', '#zlayers'] }),
    F('search', 'Search', 'The search box for units, players, calls and postals.', { hide: ['#srch'] }),
    F('notifications', 'Notifications bell', 'The bell in the top bar.', { hide: ['.bar .icons button[aria-label="Notifications"]'] })] },

  { title: 'Every department MDT', items: [
    F('mdtsignin', 'MDT sign-in', 'Signing in to the MDT with a license card, rank and password.'),
    F('hospital', 'Hospital', 'A Hospital app in the Fire Department MDT: EMS send the hospital a pre-alert (the patient, what they need, how to treat them, the response code), the hospital sees each ambulance’s live ETA and both sides message each other.', { parent: 'dept_fd', hide: ['#mdt .tside [data-pane="hospital"]'] }),
    F('premises', 'Location notes', 'Notes pinned to places on the map: fire pre-incident plans (exits, hydrants, parking) and police premise notes. A 911 call near one brings it up for the units.', { hide: ['.pre-open', '.pda.premise'] }),
    F('unitpick', 'Unit picker', 'Picking your unit, like Engine 1 or Patrol, on the MDT home.', { hide: ['#fdMyUnit'] }),
    F('ridewith', 'Riding together', 'Riding in a teammate’s unit.', { hide: ['#fdRide'] }),
    F('unitstatus', 'Unit status codes', 'The 10-code status buttons that show on dispatch and every MDT.', { hide: ['#fdStatus', '#fdStatusPill'] }),
    F('activitylog', 'Activity log', 'The log of what you did on the MDT home.', { hide: ['.ulog', '#fdLog'] }),
    F('homecall', 'My call card', 'The card for the call you’re assigned to on the MDT home.', { hide: ['#fdHomeCall'] }),
    F('mdtstats', 'MDT stats', 'The numbers along the top of the MDT home.', { hide: ['#mdt .stats'] }),
    F('mdtcalls', 'Calls', 'The calls list and call details in the MDT.', { hide: [tab('calls', '#mdt .tside')] }),
    F('mdtunits', 'Units', 'The units and apparatus list in the MDT.', { hide: [tab('units', '#mdt .tside')] }),
    F('mdtmap', 'MDT map', 'The map inside the MDT.', { hide: [tab('map', '#mdt .tside')] }),
    F('gps', 'Directions', 'Turn-by-turn directions to a call, with spoken turns.', { hide: ['[data-nav]', '#navView'] }),
    F('radio', 'Dispatch radio', 'Push-to-talk radio channels for each department and all units, in the CAD.', { hide: ['#radio', '#radioBtn'] }),
    F('panic', 'Panic button', 'Units hold the panic button to alert dispatch with a siren and a priority call.', { hide: ['#tPanic', '.panicbar'] }),
    F('reports', 'Incident reports', 'Fire and DOT incident reports.', { hide: [tab('reports', '#mdt .tside'), '[data-act="report"]'] })] },

  { title: 'Law Enforcement MDT', items: [
    F('pd_lookup', 'Person and plate lookups', 'Searching people and plates, with their history.', { parent: 'dept_pd', hide: [tab('lookup', '#mdt .tside')] }),
    F('pd_vehedit', 'Editing vehicles', 'Officers updating a car’s registration and insurance, or marking it stolen.', { parent: 'pd_lookup', hide: ['#pdDet [data-vset]', '#pdDet [data-stolen]'] }),
    F('pd_character', 'Characters in lookups', 'The player’s character from their civilian ID in a person lookup.', { parent: 'pd_lookup' }),
    F('pd_warrants', 'Warrants', 'Writing, approving, serving and recalling warrants.', { parent: 'dept_pd', hide: [tab('warrants', '#mdt .tside'), '[data-new="warrant"]', '#tnavWar', '.pda.warrant'] }),
    F('pd_bolos', 'BOLOs', 'Be-on-the-lookout alerts for people and vehicles.', { parent: 'dept_pd', hide: [tab('bolos', '#mdt .tside'), '[data-new="bolo"]', '#tnavBolo', '.pda.bolo'] }),
    F('pd_records', 'Records list', 'The list of every record written on the server.', { parent: 'dept_pd', hide: [tab('pdrecs', '#mdt .tside')] }),
    F('pd_citations', 'Citations', 'Writing citations with fines.', { parent: 'dept_pd', hide: ['[data-new="citation"]', '#pdRecSeg [data-k="citation"]'] }),
    F('pd_warnings', 'Written warnings', 'Writing warnings.', { parent: 'dept_pd', hide: ['[data-new="warning"]', '#pdRecSeg [data-k="warning"]'] }),
    F('pd_arrests', 'Arrests and bookings', 'Arrest reports, charges and bookings.', { parent: 'dept_pd', hide: ['[data-new="arrest"]', '#pdRecSeg [data-k="arrest"]'] }),
    F('pd_stops', 'Traffic stops', 'Starting and ending traffic stops.', { parent: 'dept_pd', hide: ['#pdStop', tab('stop', '#mdt .tside'), '[data-stopv]', '#pdStopNew', '#pdRecSeg [data-k="stop"]'] }),
    F('pd_backup', 'Backup requests', 'Calling for backup from a traffic stop, and the alerts other units get.', { parent: 'pd_stops', hide: ['[data-bk]', '.pda.backup'] }),
    F('pd_autochecks', 'Automatic stop checks', 'Running the plate, owner and warrants by themselves when a stop starts.', { parent: 'pd_stops', hide: ['#pdStop .chk'] }),
    F('pd_alerts', 'Police alerts', 'The pop-ups every officer gets for new BOLOs, warrants and backup calls.', { parent: 'dept_pd', hide: ['.pdalerts'] }),
    F('pd_licenses', 'License suspensions', 'Officers suspend or revoke a driver’s license or firearms permit from a person’s profile, and reinstate it. The plate reader flags cars whose owner can’t drive, and gun stores turn away anyone whose permit isn’t valid.', { parent: 'dept_pd', hide: ['.pd-lic'] }),
    F('alpr', 'Plate reader', 'Flags cars out in game that are stolen, match a BOLO, have bad papers or an owner with a warrant, and alerts police.', { parent: 'dept_pd', hide: ['.pda.alpr'] }),
    F('monitors', 'Ankle monitors', 'Police and dispatch put an ankle monitor on someone and draw where they may go. Dispatch is alerted when they leave it, walk into a place they must keep out of, or come back.', { parent: 'dept_pd', hide: ['.pda.monitor', '.mon-open'] }),
    F('pd_delete', 'Deleting records', 'Admins deleting a record.', { parent: 'dept_pd', hide: ['#pdViewActs [data-act="delete"]'] })] },

  { title: 'Civilian', items: [
    F('payday', 'Weekly pay', 'Every player gets paid each in-game week.', { parent: 'civ' }),
    F('startcash', 'Starting money', 'New players start with money in their account.', { parent: 'civ' }),
    F('autopay', 'Autopay', 'Players can have their bills paid by themselves.', { parent: 'civ', hide: ['#cvAuto', 'label:has(> #cvAuto)'] }),
    F('latefees', 'Late fees', 'A bill paid late costs extra.', { parent: 'civ' }),
    F('vehicles', 'Vehicles tab', 'The car you have out in game.', { parent: 'civ', hide: ['#cvTabs [data-p="cars"]'] }),
    F('cars', 'Vehicle bills', 'Weekly registration and insurance on the civilian cars players drive.', { parent: 'vehicles' }),
    F('stolen', 'Reporting stolen cars', 'Players marking their own car stolen for police lookups.', { parent: 'vehicles', hide: ['#civMdt [data-stolen]'] }),
    F('fines', 'Fines', 'Citations and arrests written in the MDT are billed to the player as fines.', { parent: 'civ' }),
    F('civid', 'ID', 'The player’s character and ID card.', { parent: 'civ', hide: ['#cvTabs [data-p="id"]'] }),
    F('license', 'Driver’s license', 'The driver’s license on the ID.', { parent: 'civid', hide: ['#cvLicW'] }),
    F('record', 'Record', 'Players seeing their own criminal record.', { parent: 'civ', hide: ['#cvTabs [data-p="record"]'] }),
    F('civ_grant', 'Giving money', 'Admins giving or taking money from a player.', { parent: 'civ', hide: ['#cvGrantF'] })] },

  { title: 'Housing', items: [
    F('housing', 'Housing', 'Homes players buy or rent.', { parent: 'civ', hide: ['#cvTabs [data-p="home2"]'] }),
    F('renting', 'Renting', 'Renting a home by the week.', { parent: 'housing', hide: ['#civMdt [data-in][data-how="rent"]'] }),
    F('mortgages', 'Mortgages', 'Buying a home with a down payment and weekly mortgage payments.', { parent: 'housing', hide: ['#civMdt [data-in][data-how="mortgage"]'] }),
    F('proptax', 'Property tax', 'A weekly tax on homes players own.', { parent: 'housing' }),
    F('evictions', 'Evictions', 'A home goes back on the market when its rent or mortgage goes unpaid too long.', { parent: 'housing' })] },

  { title: 'Businesses', items: [
    F('biz', 'Businesses', 'Players start and run businesses.', { parent: 'civ', hide: ['#cvTabs [data-p="biz"]'] }),
    F('bizfee', 'Registration fee', 'Registering a business costs money.', { parent: 'biz' }),
    F('bizlic', 'Weekly license', 'Every business pays a license each week, and is suspended if it goes unpaid.', { parent: 'biz' }),
    F('biztax', 'Business tax', 'A cut of everything a business earns goes to the server: sales, paid bills and tasks.', { parent: 'biz', input: { label: 'Rate', unit: '%', min: 0, max: 50 } }),
    F('biz_menu', 'Menus and listings', 'What a business sells or offers.', { parent: 'biz', hide: ['.cv-btabs [data-bt$=":menu"]'] }),
    F('biz_staff', 'Staff', 'Hiring, wages, titles and letting people go.', { parent: 'biz', hide: ['.cv-btabs [data-bt$=":staff"]'] }),
    F('hiring', 'Job board', 'Businesses hiring, and players applying.', { parent: 'biz_staff', hide: ['#civMdt [data-apply]'] }),
    F('commission', 'Commission', 'Staff earning a cut of the bills they send.', { parent: 'biz_staff', tag: 'Premium', hide: ['#civMdt label:has(> [data-f="commission"])'] }),
    F('biz_bonus', 'Bonuses', 'Paying staff a bonus from the business account.', { parent: 'biz_staff', tag: 'Premium', hide: ['#civMdt [data-bonus]', '#civMdt label:has(> [data-f="bonus"])'] }),
    F('biz_requests', 'Requests', 'Customers requesting services and viewings, accepted and billed by the business.', { parent: 'biz', hide: ['.cv-btabs [data-bt$=":req"]', '#civMdt [data-request]'] }),
    F('invoices', 'Billing customers', 'Sending a bill straight to a player.', { parent: 'biz', hide: ['#civMdt .cv-inl:has(> [data-inv])', '#civMdt [data-inv]'] }),
    F('biz_loans', 'Business loans', 'Borrowing for a business, repaid each week.', { parent: 'biz', tag: 'Premium', hide: ['.cv-g-loan'] }),
    F('ads', 'Ads', 'Paying for an ad at the top of Shops.', { parent: 'biz', tag: 'Premium', hide: ['.cv-g-ad', '.cv-ad'] }),
    F('reviews', 'Reviews', 'Customers rating the businesses they bought from.', { parent: 'biz', tag: 'Premium', hide: ['.cv-g-rev', '#civMdt [data-review]'] }),
    F('biz_brand', 'Colours and taglines', 'A business’s own colour, tagline and extra locations.', { parent: 'biz', tag: 'Premium', hide: ['.cv-g-brand'] }),
    F('biz_insights', 'Insights', 'Takings, sales and best sellers.', { parent: 'biz', tag: 'Premium', hide: ['.cv-g-ins'] }),
    F('transit', 'Transit', 'A Transit app in the Civilian tab for bus drivers: the server’s routes and stops, a pre-trip checklist, fares, reports, transit police and a panic button. Admins draw the routes and set what happens when a bus goes off its route.', { parent: 'civ', hide: ['#cvTabs [data-p="transit"]'] }),
    F('transit_tracker', 'Bus tracker', 'A phone app that shows every player where the buses are, their routes and their next stop.', { parent: 'transit' }),
    F('court', 'Court', 'A Court app on the phone: players sue each other, both sides and their lawyers argue it out in the case, judges hold hearings and rule, and judgments are billed. Admins name the judges and lawyers in the app.', { parent: 'civ', hide: ['#civMdt [data-p="court"]'] }),
    F('guncheck', 'Gun store background checks', 'Gun stores refuse anyone with a felony or warrant.', { parent: 'biz' })] },

  { title: 'Shops and work', items: [
    F('shops', 'Shops', 'Buying from businesses.', { parent: 'biz', hide: ['#cvTabs [data-p="shops"]'] }),
    F('work', 'Work', 'Clocking in at a business and the Work tab.', { parent: 'biz', hide: ['#cvTabs [data-p="jobs"]', '#civMdt [data-clock]'] }),
    F('tasks', 'Tasks', 'The task board: jobs that pay, like showings, deliveries and repairs.', { parent: 'work', hide: ['#civMdt .tb', '.cv-btabs [data-bt$=":tasks"]'] }),
    F('minigames', 'Mini-games', 'The mini-games inside tasks. Off, tasks are just the driving.', { parent: 'tasks' })] },

  { title: 'Server Staff', items: [
    F('st_map', 'Staff map', 'The map of players in the staff tab.', { parent: 'staff', hide: ['#stTabs [data-p="map"]'] }),
    F('st_modcalls', 'Mod calls', 'Players’ calls for a moderator.', { parent: 'staff', hide: ['#stTabs [data-p="calls"]'] }),
    F('st_records', 'Staff records', 'Warnings, kicks and notes kept on each player.', { parent: 'staff', hide: ['#stTabs [data-p="records"]'] }),
    F('st_logs', 'Logs', 'Looking up command and kill logs.', { parent: 'staff', hide: ['#stTabs [data-p="logs"]'] }),
    F('st_rdm', 'RDM watch', 'Flags possible random deathmatch from the kill log: kill streaks, killing the same person again and again, and Fire, DOT or officers killing when they shouldn’t.', { parent: 'staff', hide: ['#stTabs [data-p="rdm"]'] }),
    F('st_warn', 'Warnings', 'Warning a player in game.', { parent: 'staff', hide: ['.st-act.k-warn'] }),
    F('st_pm', 'Messages', 'Sending a player a private message in game.', { parent: 'staff', hide: ['.st-act.k-pm'] }),
    F('st_kick', 'Kicks', 'Kicking a player from the server.', { parent: 'staff', hide: ['.st-act.k-kick'] }),
    F('st_ban', 'Bans', 'Banning and unbanning players.', { parent: 'staff', hide: ['.st-act.k-ban', '#stTabs [data-p="bans"]'] }),
    F('st_note', 'Notes', 'Staff notes on a player.', { parent: 'staff', hide: ['.st-act.k-note'] }),
    F('st_announce', 'Announcements', 'Announcing a message to everyone in game.', { parent: 'staff', hide: ['#stAnnounce'] })] },

  { title: 'Server', items: [
    F('voice', 'Proximity voice', 'Players hear each other by distance in game. Range and muffling are under Premium.', { tag: 'Premium', hide: ['#voiceBtn'] }),
    F('bounds', 'Boundaries', 'Warn, then respawn, players who leave the areas you draw in the CAD, under Server Staff, Mapping.'),
    F('safezones', 'Safe zones', 'Areas with no crime, drawn in the CAD under Server Staff, Mapping: players are told when they walk in, and killers in one are warned.'),
    F('bots', 'Connected bots', 'Your own Discord bots (department, roleplay, economy, moderation) reading and changing the CAD with the keys you make under Bots.'),
    F('courses', 'Staff courses', 'Courses your staff take on the Staff page or with /course in Discord, with a pass mark. Public courses are open to every member.'),
    F('discordcmds', 'Discord commands', 'Slash commands in your Discord: /status, /calls, /units, /lookup and /cad, answered by the Oversite bot.'),
    F('automations', 'Automations', 'The rules you set under Automations: alerts, Discord posts, in-game messages and calls when things happen.'),
    F('roads', 'Road fixes', 'Owners fixing roads the GPS gets wrong, from the CAD’s admin panel.', { hide: ['#adRoads'] }),
    F('serverlogo', 'Server logo in the CAD', 'Your server’s logo on the CAD and MDT.', { tag: 'Premium' }),
    F('goldchecks', 'Supporter checks', 'The gold check next to Premium supporters’ names.'),
    F('explore', 'Listed on Explore', 'Show your server on the Explore page so new players can find it.')] }];

const ALL = GROUPS.flatMap(g => g.items), BY = Object.fromEntries(ALL.map(i => [i.key, i]));
export const KEYS = ALL.map(i => i.key);
// new extras a server opts into, so switching Oversite to a new version never changes how an existing server runs
const DEFAULT_OFF = new Set(['biztax']);

// the feature's own switch
const raw = (c, k) => {
  if (k === 'civ') return (c.settings.civ || {}).on !== false;
  if (k === 'voice') return !!(c.settings.voice || {}).on;
  if (k === 'bounds') return !!(c.settings.bounds || {}).on;
  if (k === 'safezones') return !!(c.settings.safezones || {}).on;
  if (k === 'explore') return !(c.settings.profile || {}).unlisted;
  const v = (c.settings.features || {})[k]; return v == null ? !DEFAULT_OFF.has(k) : v !== false; };
// is it working: its switch and every parent's are on
export const on = (c, k) => { for (let i = BY[k], n = 0; i && n < 8; i = BY[i.parent], n++) if (!raw(c, i.key)) return false; return true; };
export const all = c => Object.fromEntries(KEYS.map(k => [k, on(c, k)]));          // what the CAD obeys
export const switches = c => Object.fromEntries(KEYS.map(k => [k, raw(c, k)]));    // what the settings page shows

// the CSS that takes switched-off features off the CAD
// (one rule per selector, so a browser that can't read one, like :has() in an old one, still hides the rest)
export const css = c => ALL.filter(i => i.hide && !on(c, i.key)).flatMap(i => i.hide.map(s => `body.off-${i.key} ${s}{display:none!important}`)).join('\n');

// the plain routes (under /c/<slug>/api/) and the feature each belongs to; routes that depend on what is posted are checked where they're handled
const ROUTES = [
  [/^panic(\/clear)?$/, 'panic'], [/^calls\/state$/, 'assign'], [/^reports(\/delete)?$/, 'reports'], [/^srvstatus/, 'status'], [/^radio\//, 'radio'], [/^status$/, 'unitstatus'], [/^units\/me$/, 'unitpick'], [/^units\/ride$/, 'ridewith'], [/^calls\/clear$/, 'clearcall'],
  [/^mdt\/sign(in|out)$/, 'mdtsignin'], [/^roads$/, 'roads'],
  [/^pd\//, 'dept_pd'], [/^pd\/search$/, 'pd_lookup'], [/^pd\/records\/delete$/, 'pd_delete'],
  [/^staff\/records/, 'st_records'], [/^staff\/logs$/, 'st_logs'], [/^staff\/rdm/, 'st_rdm'],
  [/^civ\/autopay$/, 'autopay'], [/^civ\/stolen$/, 'stolen'], [/^civ\/(home|prop)$/, 'housing'], [/^civ\/grant$/, 'civ_grant'], [/^civ\/character$/, 'civid'],
  [/^civ\/biz\/(buy|cancel)$/, 'shops'], [/^civ\/biz\/(request|respond)$/, 'biz_requests'], [/^civ\/biz\/review$/, 'reviews'], [/^civ\/biz\/ad$/, 'ads'],
  [/^civ\/biz\/clock$/, 'work'], [/^civ\/(job\/apply|biz\/decide)$/, 'hiring'], [/^civ\/job\/quit$/, 'biz'], [/^civ\/biz\/(task|job|game)$/, 'tasks'],
  [/^civ\/biz\/(staffx|staff)$/, 'biz_staff'], [/^civ\/biz\/bonus$/, 'biz_bonus'], [/^civ\/biz\/loan$/, 'biz_loans'], [/^civ\/biz\/brand$/, 'biz_brand'], [/^civ\/biz\/item$/, 'biz_menu'],
  [/^civ\/biz\/invoice$/, 'invoices'], [/^civ\/biz\/(open|edit|cash|close|spot)$/, 'biz']];
// every feature a route needs (a lookup also needs the police department)
export const routeKeys = rest => ROUTES.filter(([re]) => re.test(rest)).map(([, k]) => k);
export const nameOf = k => BY[k]?.name || 'That';
// what is posted decides the feature: the kind of police record, and the kind of staff action
export const RECORD = { warrant: 'pd_warrants', bolo: 'pd_bolos', citation: 'pd_citations', warning: 'pd_warnings', arrest: 'pd_arrests', stop: 'pd_stops' };
export const STAFF_ACT = { warn: 'st_warn', pm: 'st_pm', kick: 'st_kick', ban: 'st_ban', unban: 'st_ban', note: 'st_note', announce: 'st_announce' };

// switch some on or off; voice needs Premium to turn on
export const setMany = (c, keys, v, prem) => { keys = [...new Set(keys)]; if (!keys.length || keys.some(k => !KEYS.includes(k))) return { error: 'There is no such feature.' }; v = !!v;
  if (v && !prem) keys = keys.filter(k => k !== 'voice'); if (!keys.length) return { error: 'Proximity voice is part of Premium.' };
  const s = communities.byId(c.id).settings;
  for (const k of keys) {
    if (k === 'civ') s.civ = { ...(s.civ || {}), on: v };
    else if (k === 'voice') s.voice = { ...(s.voice || {}), on: v };
    else if (k === 'bounds') s.bounds = { ...(s.bounds || {}), on: v };
    else if (k === 'safezones') s.safezones = { ...(s.safezones || {}), on: v };
    else if (k === 'explore') s.profile = { ...(s.profile || {}), unlisted: !v };
    else s.features = { ...(s.features || {}), [k]: v }; }
  communities.saveSettings(c.id, s); c.settings = s; return { ok: true, features: switches(c) }; };

// the words people use for each feature when they don't know its name, for the settings search
export const WORDS = {
  dispatch_board: 'dispatcher board left panel sidebar calls units overview', dept_pd: 'police cops law sheriff officers lspd pd mdt', dept_fd: 'fire firefighters ems ambulance medics paramedics fd',
  dept_dot: 'dot tow trucks road crew transportation', civ: 'civilian civ economy money citizens roleplay rp', staff: 'staff moderation mods admins moderators', status: 'status updates news changelog outage',
  unitlist: 'units cards officers list roster', unitfilter: 'filter chips departments tabs', availability: 'availability chart graph stats statistics online count', duty: 'on duty roster who is working shift',
  calls: 'calls 911 emergencies board list', callalerts: 'alerts popup new call notification suggested units', callsound: 'sound tone beep ding audio noise alert sound', assign: 'assign send attach respond units to calls dispatch units',
  clearcall: 'clear close end finish resolve call', mapunits: 'pins dots players on map unit markers', mapcalls: 'call pins markers on map', mapzoom: 'zoom buttons recenter plus minus', mapstyle: 'map style theme dark mode light satellite layers',
  search: 'search box find lookup top bar', notifications: 'bell notifications', mdtsignin: 'sign in login lock password license card rank', unitpick: 'unit callsign engine patrol pick choose',
  ridewith: 'ride along partner passenger teammate', unitstatus: '10 codes ten codes status buttons 10-8 10-7 busy available', activitylog: 'activity log history what i did', homecall: 'my call assigned call card',
  mdtstats: 'stats numbers counters', mdtcalls: 'calls list call details', mdtunits: 'units apparatus list', mdtmap: 'map inside mdt mini map', gps: 'gps directions navigation route waypoint satnav turn by turn voice directions',
  panic: 'panic emergency button 10-99 officer down help siren distress', reports: 'incident reports fire reports paperwork write ups',
  pd_lookup: 'lookup search people plates name check ncic database run plate', pd_vehedit: 'edit vehicle registration insurance stolen flag', pd_character: 'character name age civilian profile in lookup',
  pd_warrants: 'warrants arrest warrant judge approval supervisor', pd_bolos: 'bolo be on the lookout wanted alert apb', pd_records: 'records list history database', pd_citations: 'citations tickets fines speeding traffic ticket',
  pd_warnings: 'warnings verbal written warning', pd_arrests: 'arrests jail booking charges cuffs prison', pd_stops: 'traffic stops pull over pullover', pd_backup: 'backup code 2 code 3 assistance help request',
  pd_autochecks: 'automatic checks alpr plate reader auto run', map3d: '3d map three dimensional model buildings county terrain', premises: 'location notes premise pre-incident plan preplan hydrants exits building map notes hazards', court: 'court civil suit sue lawsuit judge lawyer attorney doj justice settlement ruling judgment small claims', pd_licenses: 'license suspend suspension revoke revoked reinstate drivers license firearms permit gun permit', pd_alerts: 'police alerts popups bolo alerts warrant alerts', monitors: 'ankle monitor house arrest probation parole tracking geofence', pd_delete: 'delete records remove erase', radio: 'radio push to talk ptt walkie talkie comms channels voice dispatch radio', alpr: 'alpr plate reader license plate camera scanner auto flag stolen cars', bots: 'connected bots integrations api keys department bot roleplay bot economy bot erm melonly webhooks developers link my bot connect bot', courses: 'courses training quiz test exam certification staff training academy lessons tests pass mark course', discordcmds: 'discord commands slash commands bot status calls units lookup plate in discord discord bot', automations: 'automations rules triggers if this then that auto messages welcome discord posts bots workflows',
  payday: 'weekly pay paycheck salary income stimulus allowance ubi', startcash: 'starting money opening balance new player cash', autopay: 'autopay automatic payments auto pay bills', latefees: 'late fees penalty overdue interest',
  vehicles: 'vehicles cars garage my car', cars: 'registration insurance car bills vehicle tax dmv', stolen: 'stolen car report theft', fines: 'fines tickets pay citations billed', civid: 'id card identity character drivers name',
  license: 'drivers license licence dl', record: 'criminal record rap sheet history', civ_grant: 'give money take money add cash admin money grant',
  housing: 'houses homes apartments real estate property', renting: 'rent renting lease tenants', mortgages: 'mortgage loan home loan buy house down payment', proptax: 'property tax house tax', evictions: 'evict eviction repossess foreclosure kicked out',
  biz: 'businesses companies company shops stores own a business', bizfee: 'registration fee cost to start business register price', bizlic: 'license fee weekly business license permit', biztax: 'business tax taxes sales tax income tax cut percent revenue',
  biz_menu: 'menu items products listings catalog', biz_staff: 'employees staff workers hire fire wages', hiring: 'job board hiring apply applications jobs', commission: 'commission cut percentage sales staff',
  biz_bonus: 'bonus pay staff extra money', biz_requests: 'requests orders service requests viewings', invoices: 'invoice bill customers charge', biz_loans: 'business loan borrow bank debt',
  ads: 'ads advertising advertisement promote', reviews: 'reviews ratings stars feedback', biz_brand: 'colour color tagline branding locations', biz_insights: 'insights analytics sales stats takings',
  guncheck: 'gun store background check firearm felony', shops: 'shops buy purchase store market', work: 'work jobs clock in shifts employment', tasks: 'tasks jobs missions quests deliveries showings',
  minigames: 'mini games minigames puzzles games in jobs tasks fun challenges', st_map: 'staff map players map', transit: 'transit bus buses bus driver routes stops fares tickets public transport metro', transit_tracker: 'bus tracker bus times where is the bus', hospital: 'hospital doctors nurses ems ambulance patient pre alert eta er emergency room medical', st_rdm: 'rdm random deathmatch random killing kill streak mass rdm vdm kill log detection anti rdm', st_modcalls: 'mod calls call a mod help requests', st_records: 'staff records history punishments', st_logs: 'logs command logs kill logs audit',
  st_warn: 'warn warning', st_pm: 'message pm dm private message', st_kick: 'kick remove player', st_ban: 'ban unban bans', st_note: 'notes staff notes', st_announce: 'announce announcement broadcast message everyone',
  voice: 'voice chat proximity talk hear microphone vc', bounds: 'boundaries areas zones kick outside play area map limits restricted mapping', safezones: 'safe zones safezone no crime spawn hospital rdm kill protected area mapping', roads: 'roads fix gps roads road editor', serverlogo: 'logo icon branding image',
  goldchecks: 'gold check verified badge supporters', explore: 'explore listing public discover find server directory' };
for (const i of ALL) i.words = WORDS[i.key] || '';
