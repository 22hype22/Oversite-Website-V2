"""Admin panel + live ER:LC data. Imported by rail.py; apply(s, ICON) returns the page with the
admin panel markup/CSS and the live-data script in place (replacing older copies)."""
import json, re

ADMIN_CSS = r"""  /* admin panel: server link, departments, map calibration */
  .admin{position:fixed;top:calc(var(--barh) + var(--gap));right:var(--gap);bottom:var(--gap);width:min(420px,calc(100vw - 2*var(--gap)));z-index:9;
    background:var(--glass);backdrop-filter:var(--blur);-webkit-backdrop-filter:var(--blur);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.28);
    transform:translateX(calc(100% + 24px));opacity:0;pointer-events:none;transition:transform .32s cubic-bezier(.32,.72,0,1),opacity .2s;overflow-y:auto;scrollbar-width:none;
    padding:16px 20px 24px;color:var(--ink);font-size:13px;line-height:1.45}
  .admin::-webkit-scrollbar{display:none}
  body.admin-open .admin{transform:none;opacity:1;pointer-events:auto}
  body.mode-3d .admin{background:#141518}
  .admin header{display:flex;align-items:center;justify-content:space-between;padding:4px 0 12px;border-bottom:1px solid var(--hair)}
  .admin h2{margin:0;font-size:17px;font-weight:600;letter-spacing:-.01em}
  .admin header button{font-size:12px;color:var(--dim);padding:6px 10px;border-radius:8px}
  .admin header button:hover{color:var(--ink);background:rgba(240,242,245,.06)}
  .admin section{padding:14px 0 6px;border-bottom:1px solid var(--hair)}
  .admin section:last-child{border-bottom:0}
  .admin h3{margin:0 0 6px;font-size:13px;font-weight:600}
  .admin .ad-note{margin:0 0 10px;color:var(--dim);font-size:12px}
  .admin label{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:5px 0;color:var(--dim)}
  .admin label>span{flex:none;min-width:110px}
  .admin input:not([type=checkbox]),.admin select{flex:1;min-width:0;background:#141518;border:1px solid var(--hair2);border-radius:8px;color:var(--ink);padding:7px 9px;font:inherit;font-size:13px}
  body:not(.mode-3d) .admin input:not([type=checkbox]),body:not(.mode-3d) .admin select{background:rgba(11,11,12,.6)}
  .admin input:focus,.admin select:focus{outline:none;border-color:rgba(240,242,245,.4)}
  .admin input[type=number]{max-width:72px;flex:none}
  .admin input[type=checkbox]{width:15px;height:15px;accent-color:var(--ink)}
  .admin .ad-row{display:flex;align-items:center;gap:10px;padding:6px 0;flex-wrap:wrap}
  .admin .ad-row label{padding:0;flex:none}
  .admin .ad-btn{font-size:12.5px;font-weight:500;padding:7px 12px;border-radius:8px;background:rgba(240,242,245,.08);color:var(--ink);border:1px solid var(--hair2)}
  .admin .ad-btn:hover{background:rgba(240,242,245,.14)} .admin .ad-btn:active{transform:translateY(1px)}
  .admin .ad-btn.pri{background:var(--ink);color:#0B0B0C;border-color:var(--ink)}
  .admin .ad-status{margin:6px 0 2px;padding:9px 11px;border-radius:8px;background:rgba(240,242,245,.05);color:var(--dim);font-size:12px;white-space:pre-line}
  .admin .ad-status.ok{color:var(--green)} .admin .ad-status.err{color:#F0A0A0}
  .admin .ad-kv{display:flex;justify-content:space-between;padding:6px 0;color:var(--dim)} .admin .ad-kv b{color:var(--ink);font-weight:500;font-variant-numeric:tabular-nums}
  .admin .ad-pts{margin:4px 0}
  .admin .ad-pt{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:5px 0;border-top:1px solid var(--hair);font-size:12px}
  .admin .ad-pt small{color:var(--dim);font-variant-numeric:tabular-nums} .admin .ad-pt button{color:var(--dim);font-size:12px} .admin .ad-pt button:hover{color:#F0A0A0}
  .admin .ad-teams{display:grid;grid-template-columns:1fr 110px;gap:6px 10px;align-items:center}
  .admin .ad-teams span{color:var(--dim)}
  .admin code{font-family:ui-monospace,Menlo,monospace;font-size:11.5px;background:rgba(240,242,245,.08);padding:1px 5px;border-radius:4px}
  .icons button[aria-pressed="true"]{color:var(--ink);background:rgba(240,242,245,.1)}
  .live-dot{display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--green);margin-right:6px;vertical-align:1px}
  @media (prefers-reduced-motion:reduce){.admin{transition:none}}
"""

LANDMARKS = [
  ("Bayside pier, tip of the end platform", 559, 1668),
  ("Bayside pier, entrance arch", 562, 1600),
  ("Water tower (base)", 498, 1145),
  ("Town hall (front steps)", 533, 1346),
  ("Fire station (front)", 467, 1328),
  ("Beach office block, red stair tower", 539, 1585),
  ("Brookstone Apartments (sign corner)", 823, 1372),
  ("Downtown river bridge, mid span", 871, 1430),
  ("East beach, lifeguard tower", 689, 1587),
]

def admin_html():
    opts = ''.join(f'<option value="{x},{y}">{n}</option>' for n, x, y in LANDMARKS)
    teams = ''.join(f'<span>{t}</span><select data-team="{t}"><option value="pd">PD</option><option value="fd">FD</option><option value="dot">DOT</option><option value="">Ignore</option></select>' for t in ['Police', 'Sheriff', 'Fire', 'DOT', 'Civilian'])
    return f"""<aside class="admin" id="admin" aria-label="Admin panel" aria-hidden="true">
  <header><h2>Admin</h2><button type="button" id="adminClose">Close</button></header>
  <section>
    <h3>Server link</h3>
    <p class="ad-note">The key stays in this browser. It is only sent to <code>api.erlc.gg</code>, or to your relay if you set one. Get it in game under Settings, ER:LC API.</p>
    <label><span>Server key</span><input type="password" id="adKey" autocomplete="off" spellcheck="false" placeholder="paste the private server key"></label>
    <label><span>Relay URL</span><input id="adRelay" autocomplete="off" spellcheck="false" placeholder="optional, e.g. http://localhost:8787"></label>
    <label><span>Poll every</span><input type="number" id="adPoll" min="5" max="120" step="1" value="10"><span style="min-width:0">seconds</span></label>
    <div class="ad-row"><button type="button" class="ad-btn" id="adTest">Test connection</button><label><input type="checkbox" id="adLive"> Use live data</label></div>
    <div class="ad-status" id="adStatus">Not connected. Demo units are showing.</div>
  </section>
  <section>
    <h3>Departments</h3>
    <p class="ad-note">Which in-game team feeds which department. Players without a callsign are skipped unless you untick the box.</p>
    <div class="ad-teams" id="adTeams">{teams}</div>
    <div class="ad-row"><label><input type="checkbox" id="adCallsignOnly" checked> Only players with a callsign</label></div>
  </section>
  <section>
    <h3>Map calibration</h3>
    <p class="ad-note">The API reports positions in studs. Stand on a landmark, pick it below, press "I'm here". One point lines the map up, two or more fix the scale.</p>
    <label><span>Your username</span><input id="adMe" autocomplete="off" spellcheck="false" placeholder="Roblox username"></label>
    <div class="ad-row"><select id="adLandmark">{opts}</select><button type="button" class="ad-btn pri" id="adHere">I'm here</button></div>
    <div class="ad-pts" id="adPoints"></div>
    <div class="ad-kv"><span>Studs per map unit</span><b id="adScale">6.00 (default)</b></div>
    <div class="ad-kv"><span>Map centre offset</span><b id="adOffset">0, 0</b></div>
    <div class="ad-row"><button type="button" class="ad-btn" id="adClearCal">Clear calibration</button></div>
  </section>
</aside>
"""

LIVE_JS = r"""<script id="live">
/* ── admin panel + live ER:LC data (players, vehicles, emergency calls) ── */
(() => {
  const $ = id => document.getElementById(id);
  const ICON = __ICON__;
  const esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const DEPT = { pd: 'PD', fd: 'FD', dot: 'DOT' }, KIND = { pd: 'cruiser', fd: 'engine', dot: 'dot' };
  const DEFAULTS = { key: '', relay: '', poll: 10, live: false, teams: { Police: 'pd', Sheriff: 'pd', Fire: 'fd', DOT: 'dot', Civilian: '' }, callsignOnly: true, me: '', cal: [] };
  const KEY = 'oversite.admin';
  let S = { ...DEFAULTS };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  // ── panel open / close ──
  const panel = $('admin'), toggle = $('adminToggle');
  const setOpen = on => { document.body.classList.toggle('admin-open', on); panel.setAttribute('aria-hidden', !on); toggle?.setAttribute('aria-pressed', on); };
  toggle?.addEventListener('click', () => setOpen(!document.body.classList.contains('admin-open')));
  $('adminClose').addEventListener('click', () => setOpen(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('admin-open')) setOpen(false); });

  // ── fields ──
  const F = { key: $('adKey'), relay: $('adRelay'), poll: $('adPoll'), live: $('adLive'), me: $('adMe'), callsignOnly: $('adCallsignOnly') };
  F.key.value = S.key; F.relay.value = S.relay; F.poll.value = S.poll; F.live.checked = S.live; F.me.value = S.me; F.callsignOnly.checked = S.callsignOnly;
  for (const sel of document.querySelectorAll('#adTeams select')) { sel.value = S.teams[sel.dataset.team] ?? ''; sel.addEventListener('change', () => { S.teams[sel.dataset.team] = sel.value; save(); }); }
  F.key.addEventListener('change', () => { S.key = F.key.value.trim(); save(); });
  F.relay.addEventListener('change', () => { S.relay = F.relay.value.trim().replace(/\/+$/, ''); F.relay.value = S.relay; save(); });
  F.poll.addEventListener('change', () => { S.poll = Math.max(5, Math.min(120, +F.poll.value || 10)); F.poll.value = S.poll; save(); });
  F.me.addEventListener('change', () => { S.me = F.me.value.trim(); save(); });
  F.callsignOnly.addEventListener('change', () => { S.callsignOnly = F.callsignOnly.checked; save(); });
  F.live.addEventListener('change', () => { S.live = F.live.checked; save(); S.live ? start() : stop(); });

  // ── calibration: studs -> world units (0..2000) ──
  const DEF_A = 1 / 6, DEF_B = 1000;
  let cal = { a: DEF_A, bx: DEF_B, bz: DEF_B };
  const fitCal = () => { const P = S.cal; if (!P.length) { cal = { a: DEF_A, bx: DEF_B, bz: DEF_B }; return; }
    if (P.length === 1) { const p = P[0]; cal = { a: DEF_A, bx: p.wx - p.sx * DEF_A, bz: p.wy - p.sz * DEF_A }; return; }
    const mx = P.reduce((s, p) => s + p.sx, 0) / P.length, mz = P.reduce((s, p) => s + p.sz, 0) / P.length, mwx = P.reduce((s, p) => s + p.wx, 0) / P.length, mwy = P.reduce((s, p) => s + p.wy, 0) / P.length;
    let num = 0, den = 0; for (const p of P) { num += (p.sx - mx) * (p.wx - mwx) + (p.sz - mz) * (p.wy - mwy); den += (p.sx - mx) ** 2 + (p.sz - mz) ** 2; }
    const a = den > 1e-6 ? num / den : DEF_A; cal = { a, bx: mwx - a * mx, bz: mwy - a * mz }; };
  const toWorld = (sx, sz) => [cal.a * sx + cal.bx, cal.a * sz + cal.bz];
  const renderCal = () => { fitCal();
    $('adScale').textContent = S.cal.length >= 2 ? (1 / cal.a).toFixed(2) : `${(1 / DEF_A).toFixed(2)} (default)`;
    $('adOffset').textContent = `${Math.round(cal.bx - DEF_B)}, ${Math.round(cal.bz - DEF_B)}`;
    $('adPoints').innerHTML = S.cal.map((p, i) => `<div class="ad-pt"><span>${esc(p.name)}</span><small>${p.sx.toFixed(0)}, ${p.sz.toFixed(0)} studs</small><button type="button" data-rm="${i}">Remove</button></div>`).join('') || '<div class="ad-note">No points yet.</div>';
    if (lastUnits) applyPositions(); };
  $('adPoints').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; S.cal.splice(+b.dataset.rm, 1); save(); renderCal(); });
  $('adClearCal').addEventListener('click', () => { S.cal = []; save(); renderCal(); });
  $('adHere').addEventListener('click', () => { const me = (S.me || '').toLowerCase(); if (!me) return status('Enter your username first.', 'err');
    const p = (lastPlayers || []).find(x => x.Player.split(':')[0].toLowerCase() === me); if (!p || !p.Location) return status('You are not in the last player list. Turn on live data, wait for a poll, then try again.', 'err');
    const [wx, wy] = $('adLandmark').value.split(',').map(Number); S.cal.push({ name: $('adLandmark').selectedOptions[0].textContent, sx: p.Location.LocationX, sz: p.Location.LocationZ, wx, wy }); save(); renderCal(); status(`Point added: ${$('adLandmark').selectedOptions[0].textContent}.`, 'ok'); });

  // ── status line ──
  const st = $('adStatus');
  const status = (msg, cls = '') => { st.textContent = msg; st.className = 'ad-status ' + cls; };

  // ── fetching ──
  const base = () => S.relay || 'https://api.erlc.gg';
  let timer = null, lastPlayers = null, lastUnits = null, lastServer = null, lastVehicles = [], seenCalls = new Set(), inflight = false;
  const fetchServer = async () => {
    if (!S.key && !S.relay) throw new Error('No server key.');
    const url = `${base()}/v2/server?Players=true&Vehicles=true&EmergencyCalls=true&JoinLogs=true`;
    const headers = {}; if (S.key) headers['server-key'] = S.key;
    let r; try { r = await fetch(url, { headers, cache: 'no-store' }); }
    catch (e) { throw new Error(S.relay ? `Could not reach the relay at ${S.relay}. Is it running?` : 'The browser could not reach api.erlc.gg (blocked by CORS or offline). Run the relay in preview/relay and put its URL above.'); }
    const rl = { limit: r.headers.get('x-ratelimit-limit'), left: r.headers.get('x-ratelimit-remaining'), reset: r.headers.get('x-ratelimit-reset') };
    if (r.status === 429) { const wait = +(r.headers.get('retry-after') || 30); throw Object.assign(new Error(`Rate limited. Waiting ${wait}s before the next request.`), { wait }); }
    let body = null; try { body = await r.json(); } catch (e) {}
    if (!r.ok) { const m = { 2000: 'No server key sent.', 2001: 'Server key is malformed.', 2002: 'Server key is invalid or expired.', 2004: 'This server key is banned from the API.', 3002: 'Server is offline (no players).', 4001: 'Rate limited or blocked.' }[body?.code] || body?.message || `HTTP ${r.status}`; throw Object.assign(new Error(m), { code: body?.code }); }
    return { body, rl };
  };

  // ── players -> units ──
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const units = new Map();                     // id -> unit object (kept across polls so timers and 3D cars persist)
  const mph = (dx, dz, dt) => dt > 0 ? Math.hypot(dx, dz) / dt * 0.626 : 0;   // 1 stud = 0.28 m
  const buildUnits = (players, vehicles, joins) => {
    const now = Date.now(), ids = new Set();
    const joinAt = {}; for (const j of joins || []) if (j.Join) joinAt[j.Player] = Math.max(joinAt[j.Player] || 0, j.Timestamp * 1000);
    const groups = new Map();
    for (const p of players) { const dept = S.teams[p.Team] ?? ''; if (!dept) continue; const cs = (p.Callsign || '').trim(); if (!cs && S.callsignOnly) continue;
      const [name, pid] = p.Player.split(':'); const id = `${dept}-${slug(cs || name)}`;
      if (!groups.has(id)) groups.set(id, { id, dept, cs, members: [], loc: p.Location, pid });
      groups.get(id).members.push({ name, pid, perm: p.Permission, join: joinAt[p.Player] }); }
    for (const g of groups.values()) { ids.add(g.id); let u = units.get(g.id);
      const veh = vehicles.find(v => g.members.some(m => m.name === v.Owner));
      const [wx, wy] = g.loc ? toWorld(g.loc.LocationX, g.loc.LocationZ) : [1000, 1000];
      if (!u) { u = { id: g.id, live: true, dept: g.dept, kind: KIND[g.dept], route: 'B', t: 0, dir: 1, speed: 0, x: wx, y: wy, tx: wx, ty: wy, heading: 0, th: 0, mph: 0, sx: g.loc?.LocationX, sz: g.loc?.LocationZ, seen: now,
          startedAt: Math.min(...g.members.map(m => m.join || now)) }; units.set(g.id, u); }
      else if (g.loc) { const dt = (now - u.seen) / 1000, dx = g.loc.LocationX - (u.sx ?? g.loc.LocationX), dz = g.loc.LocationZ - (u.sz ?? g.loc.LocationZ);
        if (Math.hypot(dx, dz) > 0.5) u.th = Math.atan2(dz, dx); u.mph = Math.round(Math.min(160, mph(dx, dz, dt))); u.sx = g.loc.LocationX; u.sz = g.loc.LocationZ; u.tx = wx; u.ty = wy; u.seen = now; }
      u.name = `${DEPT[g.dept]} ${g.cs || g.members[0].name}`; u.crew = g.members.map(m => m.name); u.ranks = g.members.map(m => m.perm === 'Normal' ? 'Member' : m.perm.replace('Server ', ''));
      u.uid = g.pid; u.model = veh ? veh.Name : 'On foot'; u.postal = g.loc?.PostalCode || ''; u.street = g.loc?.StreetName || ''; }
    for (const id of [...units.keys()]) if (!ids.has(id)) units.delete(id);
    return [...units.values()].sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
  };
  const applyPositions = () => { for (const u of units.values()) if (u.sx != null) { const [wx, wy] = toWorld(u.sx, u.sz); u.tx = wx; u.ty = wy; u.x = wx; u.y = wy; } };

  // ── cards ──
  const fleet = document.querySelector('.fleet'); const demoHTML = fleet ? fleet.innerHTML : ''; const demoUnits = window.UNITS;
  const badge = k => `<span class="badge"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k === 'cruiser' ? 'car' : 'truck']}</svg></span>`;
  const cardHTML = (u, sel) => { const crew = esc(u.crew.join(', '));
    return `<button class="card veh dept-${u.dept}" role="listitem" data-unit="${u.id}" aria-pressed="${sel ? 'true' : 'false'}">
  <div class="hd"><div><b>${esc(u.name)}</b><small class="crew" title="${crew}">${crew}</small></div><span class="id"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M9 12h6"/></svg>${esc(u.uid)}</span></div>
  <div class="pic">${badge(u.kind)}<div class="vinfo"><b>${esc(u.model)}</b><small><span class="code">${esc(u.postal ? 'Postal ' + u.postal : '10-8')}</span> · <span class="spd" data-unit="${u.id}">0</span> mph</small></div></div>
  <div class="meta"><span class="on">Online</span><span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/><circle cx="12" cy="12" r="5"/></svg>GPS</span><span><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h4v-4H2zM9 20h4v-8H9zM16 20h4V6h-4z"/></svg>LTE</span></div>
  <div class="mini live" data-unit="${u.id}" aria-label="Live position of ${esc(u.name)}"><span class="ring"></span><span class="pin"></span></div>
  <div class="tl"><span>Active</span><span class="bar2"></span><span class="timer" data-unit="${u.id}">0:00:00</span></div>
</button>`; };
  let shownIds = '';
  const publish = list => { const ids = list.map(u => u.id).join('|');
    if (ids !== shownIds) { shownIds = ids; const sel = fleet?.querySelector('[aria-pressed="true"]')?.dataset.unit;
      if (fleet) fleet.innerHTML = list.length ? list.map((u, i) => cardHTML(u, sel ? u.id === sel : i === 0)).join('') : '<div class="empty" style="padding:18px 6px;color:var(--dim)">No units on duty. Players need a callsign on a mapped team.</div>';
      window.UNITS = list; dispatchEvent(new CustomEvent('units', { detail: { live: true } })); }
    else for (const u of list) { const sp = fleet?.querySelector(`.spd[data-unit="${u.id}"]`); if (sp) sp.textContent = u.mph; const code = fleet?.querySelector(`[data-unit="${u.id}"] .code`); if (code) code.textContent = u.postal ? 'Postal ' + u.postal : '10-8'; } };
  const restoreDemo = () => { if (!fleet || shownIds === '') return; fleet.innerHTML = demoHTML; shownIds = ''; units.clear(); lastUnits = null; window.UNITS = demoUnits; dispatchEvent(new CustomEvent('units', { detail: { live: false } })); };

  // ── emergency calls -> dispatch board ──
  const pushCalls = calls => { for (const c of calls || []) { const k = c.CallNumber ?? `${c.StartedAt}-${c.Description}`; if (seenCalls.has(k)) continue; seenCalls.add(k);
    const [x, y] = Array.isArray(c.Position) && c.Position.length >= 2 ? toWorld(c.Position[0], c.Position[1]) : [1000, 1000];
    const dept = S.teams[c.Team] || 'pd';
    window.addCall?.({ pri: 2, code: '911', type: c.Description || 'Emergency call', where: c.PositionDescriptor || 'Unknown location', unit: '', dept, stage: 0, startedAt: (c.StartedAt || Date.now() / 1000) * 1000, x, y, live: true }); } };

  // ── polling ──
  const poll = async () => { if (inflight) return; inflight = true;
    try { const { body, rl } = await fetchServer(); lastServer = body; lastPlayers = body.Players || []; lastVehicles = body.Vehicles || [];
      lastUnits = buildUnits(lastPlayers, lastVehicles, body.JoinLogs); publish(lastUnits); pushCalls(body.EmergencyCalls);
      const on = $('statOnline'); if (on) on.textContent = body.CurrentPlayers ?? lastPlayers.length;
      status(`Connected to ${body.Name}. ${body.CurrentPlayers}/${body.MaxPlayers} players, ${lastUnits.length} units on duty.` + (rl.limit ? ` Rate limit ${rl.left}/${rl.limit}.` : '') + ` Updated ${new Date().toLocaleTimeString()}.`, 'ok');
      schedule(S.poll * 1000); }
    catch (e) { status(e.message, 'err'); schedule((e.wait || Math.max(S.poll, 30)) * 1000); }
    finally { inflight = false; } };
  const schedule = ms => { clearTimeout(timer); if (S.live) timer = setTimeout(poll, ms); };
  const start = () => { if (!S.key && !S.relay) { status('Enter the server key (or a relay URL) first.', 'err'); F.live.checked = S.live = false; save(); return; } clearTimeout(timer); poll(); };
  const stop = () => { clearTimeout(timer); restoreDemo(); status('Live data off. Demo units are showing.'); };
  $('adTest').addEventListener('click', async () => { S.key = F.key.value.trim(); S.relay = F.relay.value.trim().replace(/\/+$/, ''); save(); status('Testing…');
    try { const { body, rl } = await fetchServer(); lastPlayers = body.Players || []; status(`OK: ${body.Name}, ${body.CurrentPlayers}/${body.MaxPlayers} players, ${lastPlayers.filter(p => p.Callsign).length} with callsigns, ${(body.Vehicles || []).length} vehicles.` + (rl.limit ? ` Rate limit ${rl.left}/${rl.limit}.` : ''), 'ok'); }
    catch (e) { status(e.message, 'err'); } });

  renderCal();
  if (S.live) start();
  window.live = { settings: S, units, toWorld, poll };
})();
</script>
"""

def apply(s, ICON):
    s = re.sub(r'  /\* admin panel: server link.*?(?=\n  @media \(prefers-reduced-motion:reduce\)\{\.admin\{transition:none\}\}\n)\n  @media \(prefers-reduced-motion:reduce\)\{\.admin\{transition:none\}\}\n', '', s, flags=re.S)
    s = re.sub(r'<aside class="admin" id="admin".*?</aside>\n', '', s, flags=re.S)
    s = re.sub(r'<script id="live">.*?</script>\n', '', s, flags=re.S)
    s = s.replace('</style>', ADMIN_CSS + '</style>', 1)
    s = s.replace('<button aria-label="Settings">', '<button aria-label="Settings" id="adminToggle" aria-pressed="false" title="Admin">', 1)
    s = s.replace('Online</div><div class="n">65</div>', 'Online</div><div class="n" id="statOnline">65</div>', 1)
    s = s.replace('</body>', admin_html() + LIVE_JS.replace('__ICON__', json.dumps(ICON)) + '</body>', 1)
    return s
