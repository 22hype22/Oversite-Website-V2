// /developers: how a server's own bot talks to its Oversite CAD. For whoever runs the bot (often a hired developer), so it
// says everything once, with examples they can paste. Uses the legal pages' layout.
import { layout } from './pages.mjs';
import { SCOPES, EVENTS } from './bots.mjs';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const code = s => `<pre class="dv-code"><code>${esc(s.trim())}</code></pre>`;
const ROUTES = [
  ['GET', 'me', '', 'The bot’s name, its permissions, and the server it belongs to.'],
  ['GET', 'server', 'read', 'Name, whether ER:LC is answering, players, max players, open calls, join code and the CAD link.'],
  ['GET', 'players', 'read', 'Everyone in game: name, Roblox ID, team, department, callsign, postal and street. With <b>Match Discord and Roblox</b>, each also has <code>discord_id</code> when they have an Oversite account.'],
  ['GET', 'calls', 'read', 'Open 911 calls with their <code>key</code>, who called, where, and the units on them.'],
  ['GET', 'units', 'read', 'Units on duty by department, with callsign and 10-code status.'],
  ['GET', 'shifts?days=7&roblox_id=', 'read', 'Time on duty, counted from the in-game team (1 to 30 days; one person with <code>roblox_id</code>).'],
  ['GET', 'duty-shifts?since=', 'read', 'Shifts people started and ended on their department’s MDT, changed since <code>since</code> (ms; send back the <code>now</code> it answered). Deleted ones come with <code>deleted: true</code>. An Oversite bot linked for one department gets only that one.'],
  ['GET', 'loa?status=pending', 'read', 'Leave (LOA) requests from departments and the staff team: who, which department, first and last day, reason and status. Leave out <code>status</code> for recent ones too. Or get them as they happen with the <code>loa.requested</code> event.'],
  ['GET', 'people?discord_id=', 'people', 'A member’s Roblox account from their Discord ID. Also takes <code>roblox_id</code> or <code>roblox_name</code>.'],
  ['GET', 'lookup?q=', 'lookup', 'Search people and plates, with their warrant and BOLO flags.'],
  ['GET', 'person?roblox_name=', 'lookup', 'One person’s criminal record, for a <code>/search</code> command: <code>wanted</code>, officer safety <code>markers</code> (like FI, Firearms), open warrants, BOLOs, arrests, citations and warnings with counts, their vehicles and license. Also takes <code>discord_id</code> or <code>roblox_id</code>.'],
  ['GET', 'plates/{plate}', 'lookup', 'A plate: model, color, owner, registration, insurance, stolen, flags and its records.'],
  ['GET', 'penal', 'lookup', 'The server’s charges: code, title, fine, jail time and class, for writing records.'],
  ['GET', 'records?kind=&status=open', 'lookup', 'Police records, newest first (citation, warning, arrest, warrant, bolo, stop).'],
  ['POST', 'calls', 'calls', 'Put a call on the dispatch board: <code>{ "department": "pd", "location": "Postal 214", "details": "Shots fired" }</code>.'],
  ['POST', 'calls/clear', 'calls', 'Clear a call for everyone: <code>{ "key": "…" }</code> from <code>GET calls</code>.'],
  ['POST', 'units/status', 'units', 'Set a unit’s status: <code>{ "unit": "1A-12", "status": "10-8" }</code>. "10 8", "10-08" and "ten-eight" work too. The answer has the code and what it means here (<code>"label": "Available"</code>), so the bot can say back the CAD’s own words.'],
  ['POST', 'records', 'records', 'Write a record as the bot, like the MDT does. Warrants wait for a supervisor. See below.'],
  ['POST', 'records/{id}/act', 'records', 'Serve or recall a warrant, or clear a BOLO: <code>{ "action": "serve" }</code>. Sends <code>record.updated</code>.'],
  ['POST', 'licenses', 'records', 'Suspend, revoke or reinstate a license: <code>{ "roblox_name": "Kesh", "license": "driver", "status": "Suspended", "reason": "DUI", "days": 7 }</code>. <code>license</code> is driver or firearm; <code>status</code> is Suspended, Revoked or Valid; <code>days</code> only for a suspension (leave it out for until it’s reinstated); <code>officer</code> names who asked. Only someone seen in the server.'],
  ['POST', 'plates/{plate}', 'vehicles', 'Change papers on a plate Oversite has seen: <code>{ "reg": "Expired", "ins": "Lapsed", "stolen": true }</code>. <code>reg</code> is Valid, Expired or Suspended; <code>ins</code> is Active, Lapsed or None.'],
  ['GET', 'bank?discord_id=', 'bank', 'A member’s balance in the Civilian economy.'],
  ['POST', 'bank', 'bank', 'Pay (positive) or charge (negative): <code>{ "discord_id": "…", "amount": 500, "memo": "Paycheck" }</code>. Charges never go below zero unless <code>"force": true</code>.'],
  ['GET', 'fines?discord_id=&status=unpaid', 'fines', 'Someone’s fines from citations and arrests, and <code>owed</code> in total. Also takes <code>roblox_id</code> or <code>roblox_name</code>; <code>status</code> is unpaid (the default), paid or all.'],
  ['GET', 'fines/{id}', 'fines', 'One fine: charges, amount, officer, when it was issued, and whether and how it was paid.'],
  ['POST', 'fines/{id}/pay', 'fines', 'Mark a fine paid once your economy took the money: <code>{ "note": "Paid with UnbelievaBoat", "by": "Kesh" }</code> (both optional). Sends <code>fine.paid</code>.'],
  ['POST', 'fines/{id}/unpay', 'fines', 'Undo a fine marked paid by mistake. Sends <code>fine.unpaid</code>.'],
  ['POST', 'fines/pay-all', 'fines', 'Mark all of someone’s unpaid fines paid: <code>{ "discord_id": "…" }</code>. The answer has how many and the <code>total</code>.'],
  ['POST', 'alerts', 'alerts', 'A popup in the CAD: <code>{ "departments": ["pd", "fd"], "title": "Storm warning", "text": "…" }</code>.'],
  ['POST', 'commands', 'game', 'Run an ER:LC command: <code>{ "command": ":h Server restart in 5 minutes" }</code>.']];
const SECTIONS = [
  ['start', 'Getting started', `<p class="lg-short"><b>In short</b><span>The server’s owner connects your bot in their Oversite settings, under <b>Bots</b>, and gives you its key. Send the key with every request.</span></p>
<p>Every request goes to <code>https://www.oversitescad.com/api/bot/v1/</code> with the header <code>Authorization: Bot &lt;key&gt;</code>. Bodies and answers are JSON. A key belongs to one server and one bot, and works for what the owner ticked, nothing more.</p>
${code(`curl https://www.oversitescad.com/api/bot/v1/server \\
  -H "Authorization: Bot ovb_..."`)}
<p>Errors come back as <code>{ "error": "…" }</code> with a status: <b>401</b> unknown key, <b>402</b> the server’s plan doesn’t cover this bot, <b>403</b> missing permission (the answer names it in <code>permission</code>) or the feature is switched off, <b>404</b> not found, <b>429</b> over 120 requests a minute. The error text is written for people, so you can show it in Discord as it is.</p>
<p>Keep the key secret, like a bot token. If it leaks, the owner makes a new one from the same page and the old one stops working.</p>`],
  ['perms', 'Permissions', `<p>The owner ticks these for your bot. Ask for the ones you need.</p><div class="lg-tw"><table class="lg-t"><thead><tr><th>Permission</th><th>Name</th><th>Lets the bot</th></tr></thead><tbody>
${Object.entries(SCOPES).map(([k, [n, d]]) => `<tr><td><code>${k}</code></td><td>${esc(n)}</td><td>${esc(d)}</td></tr>`).join('')}</tbody></table></div>`],
  ['api', 'Endpoints', `<p>All paths are under <code>/api/bot/v1/</code>.</p><div class="lg-tw"><table class="lg-t"><thead><tr><th>Request</th><th>Needs</th><th>What it does</th></tr></thead><tbody>
${ROUTES.map(([m, p, s, d]) => `<tr><td><code>${m} ${esc(p)}</code></td><td>${s ? `<code>${s}</code>` : 'nothing'}</td><td>${d}</td></tr>`).join('')}</tbody></table></div>
<p>Live data (players, calls, units) comes from ER:LC through Oversite, so when ER:LC isn’t answering, <code>live</code> is <code>false</code> and the lists are empty.</p>`],
  ['people', 'Discord and Roblox', `<p>Your bot knows people by their Discord ID; the CAD knows them by Roblox. Anywhere a request needs a person (<code>people</code>, <code>bank</code>, <code>records</code>), send one of <code>discord_id</code>, <code>roblox_id</code> or <code>roblox_name</code>. People are matched through their Oversite account, so someone who has never signed in to Oversite can’t be found by Discord ID.</p>
${code(`GET /api/bot/v1/people?discord_id=123456789012345678

{ "person": { "discord_id": "123456789012345678", "roblox_id": "7001", "roblox_name": "Hype", "member": "member" } }`)}`],
  ['records', 'Writing police records', `<p>Records written by your bot show in the MDT under the bot’s name. The fields match the MDT’s forms:</p>
${code(`POST /api/bot/v1/records
{
  "kind": "citation",
  "discord_id": "123456789012345678",
  "plate": "ABC 123",
  "charges": ["T-102"],
  "reason": "72 in a 45"
}`)}
<p><code>kind</code> is <code>citation</code>, <code>warning</code>, <code>arrest</code>, <code>warrant</code>, <code>bolo</code> or <code>stop</code>. Charges are codes from <code>GET penal</code> (like <code>"T-102"</code>), or a title when only one charge matches it (<code>"Hit and run"</code>); fines come from the code. A charge that isn't in the server's laws can be written out: <code>{ "custom": "Solicitation to commit murder", "fine": 5000, "jail": 60 }</code>. Name the person with <code>subject</code> (their Roblox username) or any of the ways above. Warrants from a bot always wait for a supervisor to approve them in the MDT.</p>`],
  ['events', 'Events', `<p class="lg-short"><b>In short</b><span>Give the owner a web address. Oversite sends a signed POST to it the moment something happens, for the events they tick.</span></p>
<div class="lg-tw"><table class="lg-t"><thead><tr><th>Event</th><th>When</th><th>Needs</th></tr></thead><tbody>
${Object.entries(EVENTS).map(([k, [d, s]]) => `<tr><td><code>${k}</code></td><td>${esc(d)}</td><td><code>${s}</code></td></tr>`).join('')}</tbody></table></div>
${code(`POST https://your-bot.example.com/oversite
X-Oversite-Event: call.created
X-Oversite-Signature: t=1760600000,v1=5f2c...

{
  "id": "evt_3f9a1c2b7d4e6a80",
  "event": "call.created",
  "server": { "name": "Liberty County RP", "slug": "lcrp" },
  "at": "2026-10-16T04:00:00.000Z",
  "data": { "key": "41@1760599990", "team": "Police", "description": "Shots fired", "where": "Postal 214" }
}`)}
<p>Answer with any 2xx within 6 seconds. A failed delivery is tried once more 15 seconds later. Shifts start once someone has been on a department team for a minute. Players, calls and shifts are read from ER:LC about every minute when nobody has the CAD open, and within seconds when someone does.</p>
<p><b>Check the signature</b> on every event, so nobody else can pretend to be Oversite. It’s an HMAC-SHA256 of <code>t + "." + the raw body</code>, keyed with the signing secret the owner gave you:</p>
${code(`// Node.js (Express): use the raw body, not parsed JSON
const crypto = require('crypto');
app.post('/oversite', express.raw({ type: 'application/json' }), (req, res) => {
  const [t, v1] = req.get('x-oversite-signature').split(',').map(p => p.split('=')[1]);
  const want = crypto.createHmac('sha256', process.env.OVERSITE_SECRET).update(t + '.' + req.body).digest('hex');
  const fresh = Math.abs(Date.now() / 1000 - Number(t)) < 300;
  if (!fresh || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(v1))) return res.sendStatus(401);
  const event = JSON.parse(req.body);
  // event.event, event.data ...
  res.sendStatus(200);
});`)}
${code(`# Python (Flask)
import hmac, hashlib, time
@app.post("/oversite")
def oversite():
    t, v1 = [p.split("=")[1] for p in request.headers["X-Oversite-Signature"].split(",")]
    want = hmac.new(SECRET.encode(), f"{t}.".encode() + request.get_data(), hashlib.sha256).hexdigest()
    if abs(time.time() - int(t)) > 300 or not hmac.compare_digest(want, v1):
        return "", 401
    event = request.get_json()
    return "", 200`)}
<p>The owner can press <b>Send a test event</b> in their settings; it arrives as <code>test</code> with <code>"test": true</code>.</p>`],
  ['economy', 'Your own economy', `<p class="lg-short"><b>In short</b><span>Pick <b>Economy bot</b> when connecting. Your bot takes the money for fines in your own economy, and Oversite keeps track of what is paid.</span></p>
<p>Every citation and arrest in the MDT can come with a fine. When a server runs its own economy (a Discord economy bot, say) instead of the Civilian tab’s bank, the bot that runs it can:</p>
<ul><li>Hear about each new fine with the <code>fine.issued</code> event, to take the money straight away or send the player a bill.</li>
<li>Look up what someone owes with <code>GET fines?discord_id=…</code>, for a <code>/fines</code> command.</li>
<li>Mark a fine paid with <code>POST fines/{id}/pay</code> (or all of them with <code>POST fines/pay-all</code>) once it took the money. The MDT then shows it paid, with who marked it.</li></ul>
${code(`// /payfines: take what they owe from your economy, then tell Oversite
const H = { Authorization: 'Bot ' + process.env.OVERSITE_KEY, 'content-type': 'application/json' };
const r = await fetch(API + 'fines?discord_id=' + user.id, { headers: H }).then(r => r.json());
if (!r.owed) return reply('You have no unpaid fines.');
if (await balanceOf(user.id) < r.owed) return reply('You owe $' + r.owed + ' and can’t cover it.');
await takeMoney(user.id, r.owed);
await fetch(API + 'fines/pay-all', { method: 'POST', headers: H, body: JSON.stringify({ discord_id: user.id, note: 'Paid in Discord' }) });
reply('Paid $' + r.owed + ' in fines.');`)}
<p>A fine paid any other way sends <code>fine.paid</code> too: a Sergeant or above marking it paid in the MDT, or the player paying it from the Civilian bank. Each fine looks like this:</p>
${code(`{ "id": 412, "kind": "citation", "subject": "Kesh", "roblox_id": "1234567", "charges": [{ "code": "T-101", "title": "Speeding", "fine": 250, "count": 1 }],
  "fine": 250, "amount": 250, "officer": "22HYPE22", "issued_at": 1761400000000, "due_at": null,
  "paid": false, "paid_at": null, "paid_by": null, "note": null }`)}
<p><code>amount</code> is what is owed now: with the Civilian tab’s bank on, an overdue fine there has a late fee added.</p>`],
  ['doj', 'A Justice (DOJ) bot', `<p class="lg-short"><b>In short</b><span>Pick <b>Justice (DOJ) bot</b> when connecting it. Every department writes in the same CAD, so one bot hears every arrest, citation and warrant and can post it to each department’s Discord.</span></p>
<p>Subscribe to <code>record.created</code> and <code>record.updated</code>. <code>record.created</code> comes when an officer of any department files an arrest, citation, warning or BOLO, and when a supervisor approves a warrant (so a warrant only goes out once it’s real). <code>record.updated</code> comes when a warrant is served, recalled or denied, a BOLO is cleared or a stop ends, with <code>action</code> and <code>action_by</code>.</p>
${code(`// post every new record to each department's log channel
if (event.event === 'record.created') {
  const r = event.data;   // r.kind, r.status, r.subject, r.charges, r.fine, r.jail, r.by, r.unit
  for (const id of [LAPD_LOG, SHERIFF_LOG, HIGHWAY_LOG]) client.channels.cache.get(id)?.send(
    \`**\${r.kind}** · \${r.subject} · \${(r.charges || []).map(c => c.title).join(', ')} · by \${r.by}\`);
}

// /search player:<roblox name>
const s = await oversite('/person?roblox_name=' + encodeURIComponent(name));
// s.wanted, s.warrants, s.counts.arrests, s.counts.citations, s.records`)}
<p>Your bot can also file records itself with <code>POST records</code>, and serve warrants with <code>POST records/{id}/act</code>. Warrants it writes wait for a supervisor in the MDT.</p>`],
  ['example', 'A slash command, start to finish', `<p>A discord.js command that shows who is on duty, using the <code>read</code> permission:</p>
${code(`const API = 'https://www.oversitescad.com/api/bot/v1';
const oversite = path => fetch(API + path, { headers: { Authorization: 'Bot ' + process.env.OVERSITE_KEY } }).then(r => r.json());

client.on('interactionCreate', async i => {
  if (!i.isChatInputCommand() || i.commandName !== 'onduty') return;
  const { live, departments, error } = await oversite('/units');
  if (error) return i.reply({ content: error, ephemeral: true });
  if (!live) return i.reply('The game server isn’t answering right now.');
  await i.reply(departments.map(d => \`**\${d.name}**: \${d.units.map(u => u.callsign || u.name).join(', ') || 'nobody'}\`).join('\\n'));
});`)}`]];

export const developers = ({ logo, user }) => layout({ title: 'Developers · Oversite CAD', logo, user, seo: { path: '/developers', desc: 'Connect a Discord bot to an Oversite CAD: the bot API, permissions, and signed events.' }, body: `
<style>.dv-code{margin:10px 0 14px;padding:14px 16px;border-radius:12px;background:rgba(0,0,0,.4);border:1px solid var(--hair);overflow-x:auto;font:12.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#D9DDE3}
.lg-s code{font:12.5px ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink);background:rgba(255,255,255,.06);padding:1px 5px;border-radius:5px}.dv-code code{background:none;padding:0}.lg-t td:first-child code{white-space:nowrap}@media (max-width:820px){.lg-body{grid-template-columns:minmax(0,1fr)}.lg-body>div{min-width:0}}</style>
<main class="lg"><header class="lg-hd"><h1>Connect a bot to Oversite</h1><p class="lead">For people who build or run Discord bots for ER:LC servers: department, roleplay, economy and moderation bots. Read the server’s CAD, change it, and get its events as they happen.</p></header>
<div class="lg-body"><aside class="lg-toc"><b>On this page</b><nav>${SECTIONS.map(([id, h], i) => `<a href="#${id}"><span>${i + 1}</span>${esc(h)}</a>`).join('')}</nav></aside>
<div>${SECTIONS.map(([id, h, b], i) => `<section class="lg-s" id="${id}"><h2><span>${String(i + 1).padStart(2, '0')}</span>${esc(h)}</h2>${b}</section>`).join('')}</div></div></main>` });
