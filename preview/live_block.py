"""Admin panel + live ER:LC data. Imported by rail.py; apply(s, ICON) returns the page with the
admin panel markup/CSS and the live-data script in place (replacing older copies)."""
import json, re

ADMIN_CSS = r"""  /* admin panel: server link, departments, map calibration */
  :root{--adminw:min(400px,calc(100vw - 2*var(--gap)))}
  .stage{transition:transform .6s cubic-bezier(.32,.72,0,1),opacity .4s,right .36s cubic-bezier(.32,.72,0,1)}
  body.admin-open .stage{right:calc(var(--adminw) + var(--gap))}
  body.admin-open .zoomctl,body.admin-open .layers{transition:transform .36s cubic-bezier(.32,.72,0,1)}
  .admin{position:fixed;top:calc(var(--barh) + var(--gap));right:var(--gap);bottom:var(--gap);width:var(--adminw);z-index:9;
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
  .admin .ad-btn[aria-pressed="true"]{background:var(--red);border-color:var(--red);color:#fff}
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
  @media (prefers-reduced-motion:reduce){.admin,.stage{transition:none}}
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
    teams = ''.join(f'<span>{t}</span><select data-team="{t}"><option value="pd">LE</option><option value="fd">FD</option><option value="dot">DOT</option><option value="">Ignore</option></select>' for t in ['Police', 'Sheriff', 'Fire', 'DOT', 'Civilian'])
    return f"""<aside class="admin" id="admin" aria-label="Admin panel" aria-hidden="true">
  <header><h2>Admin</h2><button type="button" id="adminClose">Close</button></header>
  <section>
    <h3>Server link</h3>
    <p class="ad-note">The key stays in this browser. It is only sent to this site's relay (or to <code>api.erlc.gg</code> when opened as a file). If the server already has a key set, leave this empty. Get it in game under Settings, ER:LC API.</p>
    <label><span>Server key</span><input type="password" id="adKey" autocomplete="off" spellcheck="false" placeholder="paste the private server key"></label>
    <div class="ad-row" id="adKeyRow" hidden><button type="button" class="ad-btn" id="adKeySave">Save key on the server for everyone</button><span class="ad-note" id="adKeyState" style="margin:0"></span></div>
    <label><span>Relay URL</span><input id="adRelay" autocomplete="off" spellcheck="false" placeholder="optional, blank uses this site's own relay"></label>
    <div class="ad-row"><button type="button" class="ad-btn" id="adTest">Test connection</button><label><input type="checkbox" id="adLive"> Use live data</label></div>
    <div class="ad-status" id="adStatus">Not connected. Demo units are showing.</div>
  </section>
  <section>
    <h3>Departments</h3>
    <p class="ad-note">Which in-game team feeds which department. Players without a callsign are skipped unless you untick the box.</p>
    <div class="ad-teams" id="adTeams">{teams}</div>
    <div class="ad-row"><label><input type="checkbox" id="adCallsignOnly"> Only players with a callsign</label></div>
  </section>
  <section>
    <h3>Map calibration</h3>
    <p class="ad-note">Positions are lined up automatically from the postal codes players report. Standing on a landmark and pressing "I'm here" makes it exact.</p>
    <div class="ad-kv"><span>Auto-calibration</span><b id="adAuto">waiting for players</b></div>
    <div class="ad-kv"><span>You</span><b id="adYou">not seen yet</b></div>
    <label><span>Your username</span><input id="adMe" autocomplete="off" spellcheck="false" placeholder="Roblox username"></label>
    <div class="ad-row"><button type="button" class="ad-btn pri" id="adPlace">Place me on the map</button><span class="ad-note" id="adPlaceHint" style="margin:0">Then click the exact spot you are standing on.</span></div>
    <div class="ad-row"><select id="adLandmark">{opts}</select><button type="button" class="ad-btn" id="adHere">I'm here</button></div>
    <div class="ad-pts" id="adPoints"></div>
    <div class="ad-kv"><span>Studs per map unit</span><b id="adScale">3.50 (default)</b></div>
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
  const OV = window.OVERSITE || null;                                       // set by the server on a community's CAD page: its API, the user's linked Roblox name, department names
  const DEPT = { pd: OV?.depts?.pd?.short || 'LE', fd: OV?.depts?.fd?.short || 'FD', dot: OV?.depts?.dot?.short || 'DOT' }, KIND = { pd: 'cruiser', fd: 'engine', dot: 'dot' };
  const HOSTED = /^https?:$/.test(location.protocol);                      // served by server.mjs: same-origin relay
  const API = OV ? OV.api : location.origin + '/api';
  const post = (path, body, method = 'POST') => fetch(API + path, { method, headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: body ? JSON.stringify(body) : undefined });
  const DEFAULTS = { key: '', relay: '', live: HOSTED, teams: { Police: 'pd', Sheriff: 'pd', Fire: 'fd', DOT: 'dot', Civilian: '' }, callsignOnly: false, me: '', cal: [] };
  const KEY = 'oversite.admin' + (OV ? '.' + OV.slug : '');               // each community keeps its own panel settings
  let S = { ...DEFAULTS };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  if (OV) { S.key = ''; S.relay = ''; S.me = OV.me || ''; S.teams = { ...S.teams, ...(OV.teams || {}) }; }   // the community decides these; the key never lives in the browser
  if (HOSTED) { S.live = true; delete S.fit; delete S.nudge; S.cal = []; }       // the server owns hand-placed points on the hosted site                                             // the hosted dashboard is always live; an old saved 'off' must never stick
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

  // ── panel open / close ──
  const panel = $('admin'), toggle = $('adminToggle');
  const setOpen = on => { document.body.classList.toggle('admin-open', on); panel.setAttribute('aria-hidden', !on); toggle?.setAttribute('aria-pressed', on); };
  toggle?.addEventListener('click', () => setOpen(!document.body.classList.contains('admin-open')));
  $('adminClose').addEventListener('click', () => setOpen(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('admin-open')) setOpen(false); });

  // ── fields ──
  const F = { key: $('adKey'), relay: $('adRelay'), live: $('adLive'), me: $('adMe'), callsignOnly: $('adCallsignOnly') };
  F.key.value = S.key; F.relay.value = S.relay; F.live.checked = S.live; F.me.value = S.me; F.callsignOnly.checked = S.callsignOnly;
  if (OV) { F.me.readOnly = true; F.me.placeholder = 'Link your Roblox account on the dashboard'; F.me.title = 'Your linked Roblox account. Change it on the dashboard.';
    F.relay.closest('label').style.display = 'none'; for (const sel of document.querySelectorAll('#adTeams select')) sel.disabled = true;
    const note = F.key.closest('section, div')?.querySelector('.ad-note'); if (note) note.textContent = OV.canEdit ? 'The key is stored encrypted on the server for this community. Paste a new one and save to replace it, or manage it in Settings.' : 'Only community admins can change the server connection.';
    if (!OV.canEdit) { F.key.closest('label').style.display = 'none'; $('adKeyRow').style.display = 'none'; }
    const links = document.createElement('div'); links.className = 'ad-row'; links.innerHTML = `<a class="ad-btn" href="/dashboard">Dashboard</a>${OV.canEdit ? `<a class="ad-btn" href="/c/${OV.slug}/settings">Community settings</a>` : ''}`; $('admin').querySelector('section')?.prepend(links); }
  if (HOSTED) { const l = F.live.closest('label'); if (l) l.hidden = true; }
  for (const sel of document.querySelectorAll('#adTeams select')) { sel.value = S.teams[sel.dataset.team] ?? ''; sel.addEventListener('change', () => { S.teams[sel.dataset.team] = sel.value; save(); }); }
  F.key.addEventListener('input', () => { S.key = F.key.value.trim(); save(); });
  F.key.addEventListener('change', () => { S.key = F.key.value.trim(); save(); if (S.key && !S.live) { S.live = F.live.checked = true; save(); } if (S.key) start(); });
  const keyRow = $('adKeyRow'), keyState = $('adKeyState');
  const keyStatus = async () => { if (!HOSTED) return; try { const j = await (await fetch(API + '/key', { cache: 'no-store' })).json(); keyRow.hidden = false; if (OV && !j.canEdit) keyRow.style.display = 'none';
      keyState.textContent = j.hasKey ? (j.persistent ? 'Saved on the server.' : 'Saved on the server until the next deploy.') : 'Not saved on the server yet.'; if (j.hasKey) F.key.placeholder = 'Saved on the server'; if (j.hasKey && !S.key) start(); if (!j.hasKey && S.key) seedKey(); } catch (e) {} };
  let seededAt = 0;                                                     // the browser remembers the key, so after a redeploy it quietly hands it back to the server
  const seedKey = async () => { if (OV || !HOSTED || !S.key || Date.now() - seededAt < 10000) return; seededAt = Date.now();
    try { const j = await (await post('/key', { key: S.key })).json(); if (j.ok) { keyState.textContent = j.persistent ? 'Saved on the server.' : 'Saved on the server until the next deploy.'; startStream(); } } catch (e) {} };
  $('adKeySave').addEventListener('click', async () => { const k = F.key.value.trim(); if (!k) return status('Paste the key first.', 'err'); keyState.textContent = 'Saving…';
    try { const j = await (await post('/key', { key: k })).json();
      keyState.textContent = j.ok ? (j.persistent ? 'Saved on the server for everyone.' : 'Saved until the next deploy.') : (j.error || j.message || 'Could not save.'); if (j.ok) { F.key.value = ''; start(); } } catch (e) { keyState.textContent = 'Could not reach the server.'; } });
  keyStatus();
  F.relay.addEventListener('change', () => { S.relay = F.relay.value.trim().replace(/\/+$/, ''); F.relay.value = S.relay; save(); });
  F.me.addEventListener('change', () => { S.me = F.me.value.trim(); save(); });
  F.callsignOnly.addEventListener('change', () => { S.callsignOnly = F.callsignOnly.checked; save(); });
  F.live.addEventListener('change', () => { S.live = F.live.checked; save(); S.live ? start() : stop(); });

  // ── calibration: studs -> world units (0..2000) ──
  // ER:LC reports LocationX / LocationZ as pixels on its official 5355 px map (checked against the in-game map: same spot to within a few pixels),
  // and our map grid is that image scaled to 0..2000, so the conversion is exact: no fitting needed.
  const DEF_A = 2000 / 5355, DEF_B = 0;
  let cal = { a: DEF_A, bx: DEF_B, bz: DEF_B, zs: 1 };                  // world = a * reported + b
  const POSTALS = __POSTALS__;                                           // postal code -> map centre, read off the official postal map
  S.auto = S.auto || {};                                                 // postal -> running mean of reported stud coords
  const fitCal = () => { cal = { a: DEF_A, bx: DEF_B, bz: DEF_B, zs: 1 };
    if (S.cal.length) { const n = S.cal.length;                          // hand-placed points can only shift the map, never rescale it
      const ox = S.cal.reduce((t, p) => t + p.wx - DEF_A * p.sx, 0) / n, oz = S.cal.reduce((t, p) => t + p.wy - DEF_A * p.sz, 0) / n; cal = { ...cal, bx: ox, bz: oz }; } };
  // road fit: players drive on roads, so the transform that puts the most position samples onto the road grid is the right one
  const SAMPLES = []; const lastSeen = {}; let newSamples = 0, lastFitAt = 0;
  const addSamples = players => { for (const p of players) { const L = p.Location; if (!L) continue; const k = p.Player, prev = lastSeen[k];
      if (prev && Math.hypot(L.LocationX - prev[0], L.LocationZ - prev[1]) < 4) continue; lastSeen[k] = [L.LocationX, L.LocationZ]; SAMPLES.push([L.LocationX, L.LocationZ]); newSamples++; if (SAMPLES.length > 1200) SAMPLES.shift(); } };
  const roadScore = (a, bx, bz) => { const R = window.roadAt; if (!R) return 0; let t = 0; for (const [sx, sz] of SAMPLES) t += R(a * sx + bx, a * sz + bz); return t / SAMPLES.length; };
  const postalCal = () => { const keep = S.fit; delete S.fit; fitCal(); const c = { ...cal }; if (keep) S.fit = keep; return c; };
  const roadFit = () => { if (true || !window.roadAt || SAMPLES.length < 150 || newSamples < 40 || Date.now() - lastFitAt < 15000) return; newSamples = 0; lastFitAt = Date.now();
    const xs = SAMPLES.map(p => p[0]), zs = SAMPLES.map(p => p[1]), mx = xs.reduce((a, b) => a + b) / xs.length, mz = zs.reduce((a, b) => a + b) / zs.length;
    const spread = Math.sqrt(SAMPLES.reduce((t, p) => t + (p[0] - mx) ** 2 + (p[1] - mz) ** 2, 0) / SAMPLES.length); if (spread < 250) return;   // need driving over a real distance
    const prior = postalCal();                                           // the postal fit is right to within a block; the road fit sharpens it
    const score = (a, bx, bz) => { const [px, pz] = [a * mx + bx, a * mz + bz], [qx, qz] = [prior.a * mx + prior.bx, prior.a * mz + prior.bz];
      const dist = Math.hypot(px - qx, pz - qz), ds = Math.abs(a / prior.a - 1); return roadScore(a, bx, bz) - 0.12 * (dist / 120) ** 2 - 0.5 * (ds / 0.12) ** 2; };
    let best = { a: prior.a, bx: prior.bx, bz: prior.bz, s: score(prior.a, prior.bx, prior.bz) }; const base = { ...best };
    const search = (da, na, db, nb) => { for (let i = -na; i <= na; i++) { const a = base.a * (1 + i * da); for (let j = -nb; j <= nb; j++) for (let k = -nb; k <= nb; k++) { const bx = base.bx + j * db, bz = base.bz + k * db; const sc = score(a, bx, bz); if (sc > best.s + 1e-6) best = { a, bx, bz, s: sc }; } } Object.assign(base, best); };
    search(0.02, 6, 10, 12); search(0.006, 4, 3, 5); search(0.002, 3, 1, 4);
    const onRoad = roadScore(best.a, best.bx, best.bz);
    if (onRoad >= 0.6) { S.fit = { a: best.a, bx: best.bx, bz: best.bz, score: onRoad, n: SAMPLES.length, t: Date.now() }; save(); fitCal(); renderCal(); } };
  const learnPostals = players => { if (HOSTED) return; let changed = false; for (const p of players) { const code = String(p.Location?.PostalCode || '').trim(); if (!code || !POSTALS[code] || !p.Location) continue;
      const a = S.auto[code] || { sx: 0, sz: 0, n: 0 }; const n = Math.min(a.n + 1, 20); a.sx += (p.Location.LocationX - a.sx) / n; a.sz += (p.Location.LocationZ - a.sz) / n; a.n = n; S.auto[code] = a; changed = true; }
    if (changed) { save(); fitCal(); renderCal(); } };
  const toWorld = (sx, sz) => [Math.max(-40, Math.min(2040, cal.a * sx + cal.bx)), Math.max(-40, Math.min(2040, cal.a * cal.zs * sz + cal.bz))];
  // the game also reports the postal each player is in: a unit is never drawn outside that postal area, whatever the transform says
  const POSTAL_LIST = Object.entries(POSTALS);
  const nearestPostal = (x, y) => { let best = null, bd = 1e9; for (const [k, c] of POSTAL_LIST) { const d = Math.hypot(c[0] - x, c[1] - y); if (d < bd) { bd = d; best = k; } } return [best, bd]; };
  const toWorldP = (sx, sz, code) => { const [x, y] = toWorld(sx, sz); code = String(code || '').trim(); const c = POSTALS[code]; if (!c) return [x, y];
    const [, nd] = nearestPostal(x, y), d = Math.hypot(x - c[0], y - c[1]); if (d <= Math.max(220, nd + 30)) return [x, y];   // exact transform: only a wildly wrong position (API change) falls back to the postal
    const m = S.auto[code];                                              // otherwise: postal centre plus how far they are from where players usually are in that postal
    const lx = m && m.n ? c[0] + cal.a * (sx - m.sx) : c[0], ly = m && m.n ? c[1] + cal.a * cal.zs * (sz - m.sz) : c[1];
    const k = Math.min(1, 45 / (Math.hypot(lx - c[0], ly - c[1]) || 1)); return [c[0] + (lx - c[0]) * k, c[1] + (ly - c[1]) * k]; };
  const renderCal = () => { fitCal();
    const n = Object.keys(S.auto).length; $('adAuto').textContent = S.cal.length ? `Official map coordinates, shifted by ${S.cal.length} hand-placed point${S.cal.length === 1 ? '' : 's'}` : 'Exact: official ER:LC map coordinates';
    $('adScale').textContent = `${(1 / cal.a).toFixed(4)} (official map)`;
    const me = (S.me || '').toLowerCase(), mp = me && (lastPlayers || []).find(x => x.Player.split(':')[0].toLowerCase() === me);
    $('adYou').textContent = mp && mp.Location ? (() => { const [x, y] = toWorldP(mp.Location.LocationX, mp.Location.LocationZ, mp.Location.PostalCode); const onMap = x >= 0 && x <= 2000 && y >= 0 && y <= 2000; return `${mp.Location.LocationX.toFixed(0)}, ${mp.Location.LocationZ.toFixed(0)} studs, postal ${mp.Location.PostalCode || '?'} → map ${x.toFixed(0)}, ${y.toFixed(0)}${onMap ? '' : ' (off the map, calibrate)'}`; })() : (me ? 'not in the player list' : 'enter your username');
    $('adOffset').textContent = `${Math.round(cal.bx - DEF_B)}, ${Math.round(cal.bz - DEF_B)}`;
    $('adPoints').innerHTML = S.cal.map((p, i) => `<div class="ad-pt"><span>${esc(p.name)}</span><small>${p.sx.toFixed(0)}, ${p.sz.toFixed(0)} studs</small><button type="button" data-rm="${i}">Remove</button></div>`).join('') || '<div class="ad-note">No points yet.</div>';
    if (lastUnits) applyPositions(); };
  const pushCal = body => { if (!HOSTED || (OV && !OV.canEdit)) return; post('/cal', body).catch(() => {}); };
  const takeCal = j => { if (!j || typeof j !== 'object') return; S.auto = j.auto || {}; const manual = Array.isArray(j.manual) ? j.manual : [];
    const changed = JSON.stringify(manual) !== JSON.stringify(S.cal); S.cal = manual; save(); if (changed) renderCal(); };   // only a hand-placed point moves anyone; postal stats never reset motion
  if (HOSTED) fetch(API + '/cal', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).then(takeCal).catch(() => {});
  $('adPoints').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; S.cal.splice(+b.dataset.rm, 1); save(); renderCal(); pushCal({ manual: S.cal }); });
  $('adClearCal').addEventListener('click', () => { S.cal = []; S.auto = {}; delete S.fit; delete S.nudge; SAMPLES.length = 0; save(); renderCal(); pushCal({ clear: true }); });
  $('adHere').addEventListener('click', () => { const me = (S.me || '').toLowerCase(); if (!me) return status('Enter your username first.', 'err');
    const p = (lastPlayers || []).find(x => x.Player.split(':')[0].toLowerCase() === me); if (!p || !p.Location) return status('You are not in the last player list. Turn on live data, wait for a poll, then try again.', 'err');
    const [wx, wy] = $('adLandmark').value.split(',').map(Number); S.cal.push({ name: $('adLandmark').selectedOptions[0].textContent, sx: p.Location.LocationX, sz: p.Location.LocationZ, wx, wy }); save(); renderCal(); pushCal({ manual: S.cal }); status(`Point added: ${$('adLandmark').selectedOptions[0].textContent}.`, 'ok'); });

  // ── place me: one click on the map pins the offset so the user's unit sits exactly where they click ──
  let placing = false; const placeBtn = $('adPlace'), placeHint = $('adPlaceHint');
  placeBtn.addEventListener('click', () => { const me = (S.me || '').toLowerCase(); if (!me) return status('Enter your username first.', 'err');
    const p = (lastPlayers || []).find(x => x.Player.split(':')[0].toLowerCase() === me); if (!p || !p.Location) return status('You are not in the player list yet.', 'err');
    placing = !placing; placeBtn.setAttribute('aria-pressed', placing); placeHint.textContent = placing ? 'Now click your exact spot on the map (Esc to cancel).' : 'Then click the exact spot you are standing on.'; if (placing) setOpen(false); });
  addEventListener('keydown', e => { if (e.key === 'Escape' && placing) { placing = false; placeBtn.setAttribute('aria-pressed', false); } });
  let down = null; const view = document.getElementById('view');
  view.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; }, true);
  view.addEventListener('pointerup', e => { if (!placing || !down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) { down = null; return; } down = null;
    const w = document.body.classList.contains('mode-3d') ? window.map3d?.pick?.(e.clientX, e.clientY) : window.map2d?.screenToWorld?.(e.clientX, e.clientY); if (!w) return;
    const me = (S.me || '').toLowerCase(), p = (lastPlayers || []).find(x => x.Player.split(':')[0].toLowerCase() === me); if (!p || !p.Location) return;
    S.cal = [{ name: 'Placed by hand', sx: p.Location.LocationX, sz: p.Location.LocationZ, wx: w[0], wy: w[1] }]; delete S.nudge; save(); pushCal({ manual: S.cal }); placing = false; placeBtn.setAttribute('aria-pressed', false); placeHint.textContent = 'Placed. Everyone is now lined up to that point.';
    fitCal(); renderCal(); applyPositions(); for (const u of units.values()) { u.x = u.tx; u.y = u.ty; } status('Position pinned to where you clicked.', 'ok'); }, true);

  // ── who am I: the player whose username is in the admin panel, with the department their team maps to ──
  const updateMe = players => { const me = (S.me || '').toLowerCase(); const p = me && (players || []).find(x => x.Player.split(':')[0].toLowerCase() === me);
    const next = p ? { name: p.Player.split(':')[0], team: p.Team, dept: S.teams[p.Team] || null, callsign: p.Callsign || '' } : null;
    if (next?.dept && (!window.ME?.dept || window.ME.team !== next.team)) flyMe = true;   // just joined a team (or the page just opened): show them
    const same = JSON.stringify(next) === JSON.stringify(window.ME || null); window.ME = next; if (!same) dispatchEvent(new CustomEvent('me', { detail: next })); };
  let flyMe = false;
  const flyToMe = () => { if (!flyMe || !window.ME) return; const n = window.ME.name.toLowerCase(), u = [...units.values()].find(v => v.crew.some(c => c.toLowerCase() === n)); if (!u) return;
    const cl = document.body.classList, in3d = cl.contains('mode-3d'), m = in3d ? window.map3d : window.map2d; if ((!in3d && !cl.contains('mode-2d')) || !m?.flyTo || (in3d && !window.map3dReady)) { setTimeout(flyToMe, 400); return; }   // wait for the map to finish loading
    flyMe = false; u.x = u.tx; u.y = u.ty; in3d ? m.flyTo(u.tx, u.ty, 420, 0.9, true) : m.flyTo(u.tx, u.ty, 1.6); };
  F.me.addEventListener('change', () => updateMe(lastPlayers));

  // ── status line ──
  const st = $('adStatus');
  const status = (msg, cls = '') => { st.textContent = msg; st.className = 'ad-status ' + cls; };

  // ── fetching ──
  const base = () => S.relay || (HOSTED ? API : 'https://api.erlc.gg');
  let timer = null, lastPlayers = null, lastUnits = null, lastServer = null, lastVehicles = [], seenCalls = new Set(), inflight = false;
  const fetchServer = async () => {
    if (!S.key && !S.relay && !HOSTED) throw new Error('No server key.');
    const url = `${base()}/v2/server?Players=true&Vehicles=true&EmergencyCalls=true&JoinLogs=true`;
    const headers = {}; if (S.key) headers['server-key'] = S.key;
    let r; try { r = await fetch(url, { headers, cache: 'no-store' }); }
    catch (e) { throw new Error(S.relay ? `Could not reach the relay at ${S.relay}. Is it running?` : 'The browser could not reach api.erlc.gg (blocked by CORS or offline). Run the relay in preview/relay and put its URL above.'); }
    const rl = { limit: r.headers.get('x-ratelimit-limit'), left: r.headers.get('x-ratelimit-remaining'), reset: r.headers.get('x-ratelimit-reset') };
    if (r.status === 429) { const wait = +(r.headers.get('retry-after') || 30); throw Object.assign(new Error(`Rate limited. Waiting ${wait}s before the next request.`), { wait }); }
    let body = null; try { body = await r.json(); } catch (e) {}
    if (!r.ok) { const m = { 2000: HOSTED ? 'No server key yet. Paste your private server key above, or set ERLC_SERVER_KEY on the server.' : 'No server key sent.', 2001: 'Server key is malformed.', 2002: 'Server key is invalid or expired.', 2004: 'This server key is banned from the API.', 3002: 'Server is offline (no players).', 4001: 'Rate limited or blocked.' }[body?.code] || body?.message || `HTTP ${r.status}`; throw Object.assign(new Error(m), { code: body?.code }); }
    return { body, rl };
  };


  // ── motion: between snapshots each unit keeps going at its measured speed, braking and turn rate; the dot follows that prediction on a spring ──
  const KPX = 5355 / 2000;                                              // reported units (official map px) per map unit
  const MO = { delay: 0, delaySlow: 1.0, maxDelay: 1.0, spring: 4.5, horizon: 1.5, turnDamp: 0.8, accDamp: 0.6, stopAfter: 1.35, weight: 1.1, maxTurn: 1.1, maxAcc: 25 };   // tuning, exposed for testing
  // predicted position τ seconds after the anchor fix: speed changes by the measured acceleration (never reversing), heading turns at the measured rate
  const pred = (m, tau) => { let x = m.pf[0], y = m.pf[1], h = m.h, v = m.sp; const n = Math.max(1, Math.ceil(tau / 0.05)), d = tau / n;
    for (let i = 0; i < n; i++) { const v2 = Math.max(0, v + m.acc * d); const vm = (v + v2) / 2, hm = h + m.w * d / 2; x += Math.cos(hm) * vm * d; y += Math.sin(hm) * vm * d; h += m.w * d * (vm > 0.5 ? 1 : 0); v = v2; if (v <= 0 && m.acc <= 0) break; }
    return [x, y]; };
  // a smooth curve through the real fixes (Catmull-Rom with uneven spacing): drawing a little behind the newest fix keeps the dot exactly on the driven path
  const hermite = (F, i, t) => { const p0 = F[Math.max(0, i - 1)], p1 = F[i], p2 = F[i + 1], p3 = F[Math.min(F.length - 1, i + 2)], d = p2.t - p1.t, s = (t - p1.t) / d;
    const m1 = [(p2.x - p0.x) / Math.max(0.05, p2.t - p0.t) * d, (p2.y - p0.y) / Math.max(0.05, p2.t - p0.t) * d], m2 = [(p3.x - p1.x) / Math.max(0.05, p3.t - p1.t) * d, (p3.y - p1.y) / Math.max(0.05, p3.t - p1.t) * d];
    const h00 = 2 * s ** 3 - 3 * s * s + 1, h10 = s ** 3 - 2 * s * s + s, h01 = -2 * s ** 3 + 3 * s * s, h11 = s ** 3 - s * s;
    return [h00 * p1.x + h10 * m1[0] + h01 * p2.x + h11 * m2[0], h00 * p1.y + h10 * m1[1] + h01 * p2.y + h11 * m2[1]]; };
  // coarser game updates are drawn further behind, through the real positions, so the dot never has to back up
  const delayFor = m => Math.max(m.df || 0, m.stale > 0.2 ? MO.delaySlow + (MO.maxDelay - MO.delaySlow) * Math.min(1, Math.max(0, (m.gap - 0.8) / 0.8)) : MO.delay) * Math.min(6, m.gap);   // seconds
  const traj = (m, t) => { const F = m.fixes, dl = m.dls || 0; if (dl > 0.005 && F.length >= 2) { const tt = t - dl;
      if (tt <= F[F.length - 1].t) { if (tt <= F[0].t) return [F[0].x, F[0].y]; let i = F.length - 2; while (i > 0 && F[i].t > tt) i--; return hermite(F, i, tt); }
      t = tt; }
    let tau = Math.max(0, t - m.tf); const H = Math.min(3.5, Math.max(0.7, m.gap * MO.horizon));
    if (tau > H) tau = H + 0.3 * (1 - Math.exp(-(tau - H) / 0.3)); return pred(m, tau); };    // past the expected next fix: coast to a stop, never run away
  // which way the road runs here (main axis of the road cells nearby), so a car seen parked faces along its road instead of due east
  const roadDir = (x, y) => { const R = window.roadAt; if (!R) return null; let sxx = 0, syy = 0, sxy = 0, n = 0;
    for (let i = -9; i <= 9; i++) for (let j = -9; j <= 9; j++) { const dx = i * 5, dy = j * 5; if (dx * dx + dy * dy > 2050 || R(x + dx, y + dy) < 1) continue; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; n++; }
    if (n < 6) return null; const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy), l1 = (sxx + syy) / 2 + Math.hypot((sxx - syy) / 2, sxy), l2 = (sxx + syy) / 2 - Math.hypot((sxx - syy) / 2, sxy);
    return l1 > l2 * 1.6 ? ang : null; };                               // only when there is a clear direction (not a junction or a car park)
  const motionReset = (u, wx, wy, t) => { const g = u.m?.gap || 1, gs = u.m?.gaps || [], sr = u.m?.stale || 0, df = u.m?.df || 0;
    u.m = { fixes: [{ t, x: wx, y: wy }], pf: [wx, wy], tf: t, h: u.heading || 0, sp: 0, acc: 0, w: 0, gap: g, gaps: gs, stale: sr, df, poll: t, D: [wx, wy], Dv: [0, 0], lastT: 0 }; u.x = wx; u.y = wy; };
  const motionFix = (u, wx, wy, tPoll) => { const m = u.m; if (!m) return motionReset(u, wx, wy, tPoll), true;
    const F = m.fixes, L = F[F.length - 1], prevPoll = m.poll; m.poll = tPoll;
    if (Math.hypot(wx - L.x, wy - L.y) < 0.12) {                        // the same position again: parked, or the game has not refreshed it yet
      if (m.sp > 3) { m.stale = m.stale * 0.85 + 0.15;                   // learn how often a moving car repeats: that means the game refreshes slower than we poll
        if (prevPoll < tPoll) { const N = m.nowins || (m.nowins = []); N.push([prevPoll, tPoll]); while (N.length > 16 || tPoll - N[0][1] > 25) N.shift(); } }   // and no refresh happened in this stretch
      if (m.sp > 0 && tPoll - L.t > Math.max(0.6, m.gap * MO.stopAfter)) { m.sp = 0; m.acc = 0; m.w = 0; m.tf = tPoll; m.pf = [L.x, L.y]; }   // it really stopped
      return false; }
    if (m.sp > 3) m.stale *= 0.85;
    // when the game refreshes slower than we poll, the move happened somewhere since the previous poll. If the game refreshes on a steady beat,
    // find that beat from these windows and time the fix to it exactly; otherwise take the middle of the window.
    let t = tPoll;
    if (prevPoll < tPoll) { const W = m.wins || (m.wins = []); W.push([prevPoll, tPoll]); while (W.length > 16 || tPoll - W[0][1] > 25) W.shift();
      if (m.stale > 0.12) { t = (prevPoll + tPoll) / 2;                     // the move happened somewhere since the previous poll
        if (W.length >= 6) { const R0 = (W[W.length - 1][1] - W[0][1]) / (W.length - 1);   // each refresh is seen once, so this is the average beat
          if (R0 > 0.25 && R0 < 6) { let best = -1, bR = R0, bPh = 0; const tol = 0.03, ref = W[W.length - 1][1];
            for (let j = -15; j <= 15; j++) { const R = R0 * (1 + j * 0.008);
              for (let i = 0; i < 32; i++) { const ph = i / 32 * R; let c = 0, slack = 0;
                for (const [a, b2] of W) { const k = Math.floor((b2 - ref - ph) / R), r = ref + ph + k * R; if (r > a - tol && r <= b2 + tol) { c++; slack += Math.min(r - a, b2 - r); } }
                for (const [a, b2] of (m.nowins || [])) { const k = Math.floor((b2 - tol - ref - ph) / R), r = ref + ph + k * R; if (r > a + tol) c -= 1; }   // a beat inside an unchanged stretch is wrong
                const sc = c + slack / R * 0.02; if (sc > best) { best = sc; bR = R; bPh = ph; } } }
            if (best >= W.length * 0.8) { const k = Math.floor((tPoll - ref - bPh) / bR), r = ref + bPh + k * bR; if (r > prevPoll - 0.05) { t = Math.min(tPoll, Math.max(prevPoll, r)); m.R = bR; } } } } } }
    if (Math.hypot(wx - m.D[0], wy - m.D[1]) > 90 + 70 * Math.max(0, tPoll - L.t) || t - L.t > 12) { motionReset(u, wx, wy, tPoll); return true; }   // teleport, respawn or a long silence (a car covers ~70 units a second at most)
    if (t - L.t < 0.05) t = L.t + 0.05;
    const dg = t - L.t; if (dg < 6) { m.gaps.push(dg); if (m.gaps.length > 9) m.gaps.shift(); const g = [...m.gaps].sort((a, b) => a - b); m.gap = Math.min(5, Math.max(0.25, g[g.length >> 1])); }
    if (m.R && m.stale > 0.12) m.gap = m.R;
    F.push({ t, x: wx, y: wy }); while (F.length > 8 || (F.length > 2 && t - F[0].t > 3.5)) F.shift();
    // speeds of the recent legs, then a weighted straight-line fit of speed against time: today's speed plus how fast it is changing
    const legs = []; for (let i = 1; i < F.length; i++) { const dt = F[i].t - F[i - 1].t; if (dt > 0.04) legs.push({ t: (F[i].t + F[i - 1].t) / 2, v: Math.hypot(F[i].x - F[i - 1].x, F[i].y - F[i - 1].y) / dt }); }
    let sp = 0, acc = 0;
    if (legs.length) { let sw = 0, st = 0, sv = 0; for (const l of legs) { const k = Math.exp((l.t - t) / MO.weight); sw += k; st += k * l.t; sv += k * l.v; } const mt = st / sw, mv = sv / sw;
      let stt = 0, stv = 0; for (const l of legs) { const k = Math.exp((l.t - t) / MO.weight), q = l.t - mt; stt += k * q * q; stv += k * q * (l.v - mv); }
      acc = legs.length >= 2 && stt > 1e-4 ? stv / stt : 0; acc = Math.max(-MO.maxAcc, Math.min(MO.maxAcc, acc)) * MO.accDamp; sp = Math.max(0, Math.min(140, mv + acc / MO.accDamp * (t - mt))); }
    // heading and turn rate from the last three fixes, so the dot follows bends instead of cutting across them
    const b = F[F.length - 2], c = F[F.length - 1], h2 = Math.atan2(c.y - b.y, c.x - b.x); let w = 0;
    if (F.length >= 3 && sp > 4) { const a = F[F.length - 3]; if (Math.hypot(b.x - a.x, b.y - a.y) > 0.4 && Math.hypot(c.x - b.x, c.y - b.y) > 0.4) {
      const h1 = Math.atan2(b.y - a.y, b.x - a.x), dh = Math.atan2(Math.sin(h2 - h1), Math.cos(h2 - h1)), dt = (c.t - a.t) / 2; if (dt > 0.05) w = Math.max(-MO.maxTurn, Math.min(MO.maxTurn, dh / dt)) * MO.turnDamp; } }
    const wasMoving = m.sp > 3;
    m.h = h2 + w * (c.t - b.t) / 2; m.sp = sp; m.acc = acc; m.w = w; m.tf = t; m.pf = [wx, wy];
    // self-tuning: if the dot had run past where the car really is, draw a little further behind; if it keeps landing right, creep back to now
    if (wasMoving && sp > 3) { const now = performance.now() / 1000, P = pred(m, Math.max(0, now - t)), over = (m.D[0] - P[0]) * Math.cos(m.h) + (m.D[1] - P[1]) * Math.sin(m.h);
      m.df = over > Math.max(2, sp * 0.08) ? Math.min(MO.maxDelay, (m.df || 0) + 0.2) : Math.max(0, (m.df || 0) - 0.04); }
    return true; };
  // each frame: a critically damped spring pulls the dot onto the predicted path, matching its velocity too, so corrections glide instead of jump
  const motionStep = (u, tsMs) => { const m = u.m; if (!m) return;
    if (!u.headed && window.roadAt) { u.headed = true; if (m.sp === 0) { const a = roadDir(m.D[0], m.D[1]); if (a != null) u.heading = a; } }   // first sight, parked: face along the road
    const now = tsMs / 1000; let dt = m.lastT ? Math.min(0.5, Math.max(0, now - m.lastT)) : 0; m.lastT = now;
    m.dls = (m.dls ?? delayFor(m)) + (delayFor(m) - (m.dls ?? delayFor(m))) * (1 - Math.exp(-dt / 1.5));   // the drawing delay eases, never switches
    const k = MO.spring; let left = dt;
    while (left > 1e-6) { const h = Math.min(1 / 60, left); left -= h; const tt = now - left;
      const E = traj(m, tt), E2 = traj(m, tt + 0.02), Ev = [(E2[0] - E[0]) / 0.02, (E2[1] - E[1]) / 0.02];
      const ax = -k * k * (m.D[0] - E[0]) - 2 * k * (m.Dv[0] - Ev[0]), ay = -k * k * (m.D[1] - E[1]) - 2 * k * (m.Dv[1] - Ev[1]);
      m.Dv = [m.Dv[0] + ax * h, m.Dv[1] + ay * h]; m.D = [m.D[0] + m.Dv[0] * h, m.D[1] + m.Dv[1] * h]; }
    u.x = m.D[0]; u.y = m.D[1];
    const sp = Math.hypot(...m.Dv); if (m.sp > 3 && sp > 1.2) u.headingKnown = true;
    if (sp > 1.2 && dt > 0) { const target = Math.atan2(m.Dv[1], m.Dv[0]), d = Math.atan2(Math.sin(target - u.heading), Math.cos(target - u.heading)); u.heading += d * (1 - Math.exp(-dt * 9)); }
    u.mph = m.sp > 0 ? Math.round(sp * KPX * 0.626) : 0; };
  window.liveStep = motionStep; window.liveMotion = MO;
  // when each snapshot was taken, on this page's clock: the server stamps it; extra network delay beyond the fastest delivery seen is taken back out
  const lats = []; const fixTime = taken => { const arr = performance.now() / 1000; if (!taken) return arr;
    const lat = Date.now() - taken; lats.push(lat); if (lats.length > 60) lats.shift(); return arr - Math.max(0, lat - Math.min(...lats)) / 1000; };

  // ── players -> units ──
  const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const units = new Map();                     // id -> unit object (kept across polls so timers and 3D cars persist)
  const mph = (dx, dz, dt) => dt > 0 ? Math.hypot(dx, dz) / dt * 0.626 : 0;   // 1 stud = 0.28 m
  const buildUnits = (players, vehicles, joins, tFix = performance.now() / 1000) => {
    const now = Date.now(), ids = new Set();
    const joinAt = {}; for (const j of joins || []) if (j.Join) joinAt[j.Player] = Math.max(joinAt[j.Player] || 0, j.Timestamp * 1000);
    const groups = new Map();
    for (const p of players) { const dept = S.teams[p.Team] ?? ''; if (!dept) continue; const cs = (p.Callsign || '').trim(); if (!cs && S.callsignOnly) continue;
      const [name, pid] = p.Player.split(':'); const id = `${dept}-${slug(cs || name)}`;
      if (!groups.has(id)) groups.set(id, { id, dept, cs, members: [], loc: p.Location, pid });
      groups.get(id).members.push({ name, pid, perm: p.Permission, join: joinAt[p.Player] }); }
    for (const g of groups.values()) { ids.add(g.id); let u = units.get(g.id);
      const veh = vehicles.find(v => g.members.some(m => m.name === v.Owner));
      const [wx, wy] = g.loc ? toWorldP(g.loc.LocationX, g.loc.LocationZ, g.loc.PostalCode) : [1000, 1000];
      if (!u) { u = { id: g.id, live: true, dept: g.dept, kind: KIND[g.dept], route: 'B', t: 0, dir: 1, speed: 0, x: wx, y: wy, tx: wx, ty: wy, heading: 0, th: 0, mph: 0, sx: g.loc?.LocationX, sz: g.loc?.LocationZ, seen: now,
          startedAt: Math.min(...g.members.map(m => m.join || now)) }; units.set(g.id, u); motionReset(u, wx, wy, tFix); }
      else if (g.loc) { if (motionFix(u, wx, wy, tFix)) { fixAt = now; u.seen = now; } u.sx = g.loc.LocationX; u.sz = g.loc.LocationZ; u.tx = wx; u.ty = wy; }
      u.name = `${DEPT[g.dept]} ${g.cs || g.members[0].name}`; u.crew = g.members.map(m => m.name); u.ranks = g.members.map(m => m.perm === 'Normal' ? 'Member' : m.perm.replace('Server ', ''));
      u.uid = g.pid; u.model = veh ? veh.Name : 'On foot'; u.postal = g.loc?.PostalCode || ''; u.street = g.loc?.StreetName || ''; }
    for (const id of [...units.keys()]) if (!ids.has(id)) units.delete(id);
    const me = (S.me || '').toLowerCase(); const mine = u => me && u.crew.some(n => n.toLowerCase() === me) ? 0 : 1;
    return [...units.values()].sort((a, b) => mine(a) - mine(b) || a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
  };
  const applyPositions = () => { for (const u of units.values()) if (u.sx != null) { const [wx, wy] = toWorldP(u.sx, u.sz, u.postal); u.tx = wx; u.ty = wy; motionReset(u, wx, wy, performance.now() / 1000); } };

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
  let shownIds = '', demoCleared = false;
  const publish = list => { const ids = list.map(u => u.id).join('|');
    if (ids !== shownIds) { shownIds = ids; const sel = fleet?.querySelector('[aria-pressed="true"]')?.dataset.unit;
      if (fleet) fleet.innerHTML = list.length ? list.map((u, i) => cardHTML(u, sel ? u.id === sel : i === 0)).join('') : '<div class="empty" style="padding:18px 6px;color:var(--dim)">No units on duty. Players need a callsign on a mapped team.</div>';
      window.UNITS = list; if (!demoCleared) { demoCleared = true; clearDemo(); } dispatchEvent(new CustomEvent('units', { detail: { live: true } })); }
    else for (const u of list) { const code = fleet?.querySelector(`[data-unit="${u.id}"] .code`); if (code) code.textContent = u.postal ? 'Postal ' + u.postal : '10-8'; }
    dispatchEvent(new CustomEvent('unitsupdate')); };                 // every snapshot: labels that show postal or street refresh
  const clearDemo = () => { const C = window.CALLS || []; for (let i = C.length - 1; i >= 0; i--) if (!C[i].live) C.splice(i, 1); window.demoCalls?.stop(); dispatchEvent(new CustomEvent('calls')); };
  const restoreDemo = () => { if (!fleet || shownIds === '') return; fleet.innerHTML = demoHTML; shownIds = ''; units.clear(); lastUnits = null; window.UNITS = demoUnits; demoCleared = false; if (!HOSTED) window.demoCalls?.start(); dispatchEvent(new CustomEvent('units', { detail: { live: false } })); };

  // ── emergency calls -> dispatch board ──
  const pushCalls = calls => { for (const c of calls || []) { const k = c.CallNumber ?? `${c.StartedAt}-${c.Description}`; if (seenCalls.has(k)) continue; seenCalls.add(k);
    const [x, y] = Array.isArray(c.Position) && c.Position.length >= 2 ? toWorld(c.Position[0], c.Position[1]) : [1000, 1000];
    const dept = S.teams[c.Team] || 'pd';
    window.addCall?.({ pri: 2, code: '911', type: c.Description || 'Emergency call', where: c.PositionDescriptor || 'Unknown location', unit: '', dept, stage: 0, startedAt: (c.StartedAt || Date.now() / 1000) * 1000, x, y, live: true }); } };

  // ── live updates: a server-sent stream when the page is served by server.mjs (or a relay), paced polling otherwise ──
  let lastUpdate = 0, updates = 0, source = '', fixAt = 0; const eventTimes = [];                 // fixAt = last time any unit's reported position changed
  const ERR = { 2000: HOSTED ? 'No server key yet. Paste your private server key above, or set ERLC_SERVER_KEY on the server.' : 'No server key sent.', 2001: 'Server key is malformed.', 2002: 'Server key is invalid or expired.', 2004: 'This server key is banned from the API.', 3002: 'Server is offline (no players).', 4001: 'Rate limited or blocked.' };
  const handle = (body, rl, src, taken) => { const tFix = fixTime(taken); lastServer = body; lastPlayers = body.Players || []; lastVehicles = body.Vehicles || []; lastUpdate = Date.now(); updates++; source = src; eventTimes.push(lastUpdate); while (eventTimes.length && lastUpdate - eventTimes[0] > 10000) eventTimes.shift();
    updateMe(lastPlayers); learnPostals(lastPlayers); addSamples(lastPlayers); roadFit(); lastUnits = buildUnits(lastPlayers, lastVehicles, body.JoinLogs, tFix); publish(lastUnits); pushCalls(body.EmergencyCalls); flyToMe();
    const on = $('statOnline'); if (on) on.textContent = body.CurrentPlayers ?? lastPlayers.length;
    status(`${src === 'stream' ? 'Streaming live from' : 'Connected to'} ${body.Name}. ${body.CurrentPlayers}/${body.MaxPlayers} players, ${lastUnits.length} units on duty.` + (rl?.limit ? ` Rate limit ${rl.left}/${rl.limit}.` : '') + ` Updated ${new Date().toLocaleTimeString()}.`, 'ok'); };
  const paceMs = rl => { let g = 1500; const left = +rl?.left, reset = +rl?.reset;              // spend the API window evenly, never the last two requests
    if (Number.isFinite(left) && Number.isFinite(reset) && reset > 0) { const win = Math.max(0, (reset > 1e12 ? reset : reset * 1000) - Date.now()); g = Math.max(g, left <= 2 ? win + 250 : win / (left - 2)); }
    return Math.min(120000, Math.max(1000, g)); };
  const streaming = () => es && es.readyState === 1 && source === 'stream' && Date.now() - lastUpdate < 20000;
  const feedEl = $('statFeed');                                           // under "Online": how fast data arrives and when the game last reported a move
  const feedTick = () => { if (!feedEl) return; if (!S.live || !lastUpdate) { feedEl.hidden = true; return; } feedEl.hidden = false;
    const now = Date.now(), age = (now - lastUpdate) / 1000, rate = eventTimes.length / Math.min(10, Math.max(1, (now - eventTimes[0]) / 1000));
    if (age > 20) { feedEl.textContent = `No data for ${Math.round(age)}s`; feedEl.className = 'feed off'; return; }
    const move = fixAt ? (now - fixAt) / 1000 : null;
    feedEl.textContent = (streaming() ? `Live ${rate.toFixed(1)}/s` : `Polling ${rate.toFixed(1)}/s`) + (move == null ? '' : move < 3 ? ' · moving' : ` · last move ${Math.round(move)}s ago`);
    feedEl.className = 'feed ' + (move != null && move > 10 ? 'stale' : 'on'); };
  setInterval(feedTick, 500);
  const poll = async () => { if (inflight) return; inflight = true;
    try { if (streaming()) { schedule(20000); return; }
      const { body, rl } = await fetchServer(); handle(body, rl, 'poll'); schedule(paceMs(rl)); }
    catch (e) { status(e.message, 'err'); schedule((e.wait || 15) * 1000); }
    finally { inflight = false; } };
  const schedule = ms => { clearTimeout(timer); if (S.live) timer = setTimeout(poll, ms); };
  let es = null, esRetry = null, esFails = 0;
  const canStream = () => (HOSTED || !!S.relay) && 'EventSource' in window;
  const stopStream = () => { clearTimeout(esRetry); esRetry = null; if (es) { es.close(); es = null; } };
  const startStream = () => { if (!S.live || !canStream()) return; stopStream(); let got = false;
    es = new EventSource(`${base()}/stream`);
    es.addEventListener('server', e => { got = true; esFails = 0; let body; try { body = JSON.parse(e.data); } catch (x) { return; } handle(body, null, 'stream', +e.lastEventId || 0); schedule(20000); });
    es.addEventListener('cal', e => { try { takeCal(JSON.parse(e.data)); } catch (x) {} });
    es.addEventListener('err', e => { let j = {}; try { j = JSON.parse(e.data); } catch (x) {}
      if (j.code === 2000) { if (S.key) seedKey(); else status(ERR[2000], 'err'); return; }
      if (j.status === 429) return status(`Rate limited by the API. Resuming in ${j.retry_after || 30}s.`, 'err');
      status(ERR[j.code] || j.message || `HTTP ${j.status}`, 'err'); });
    es.onerror = () => { if (es && es.readyState === 2 || !got) { esFails++; stopStream(); schedule(500); esRetry = setTimeout(startStream, Math.min(60000, 3000 * esFails)); } }; };
  const start = () => { if (!S.key && !S.relay && !HOSTED) { status('Enter the server key (or a relay URL) first.', 'err'); F.live.checked = S.live = false; save(); return; } clearTimeout(timer); startStream(); poll(); };
  const stop = () => { if (HOSTED) return; clearTimeout(timer); stopStream(); restoreDemo(); status('Live data off. Demo units are showing.'); };
  $('adTest').addEventListener('click', async () => { S.key = F.key.value.trim(); S.relay = F.relay.value.trim().replace(/\/+$/, ''); save(); status('Testing…');
    try { const { body, rl } = await fetchServer(); lastPlayers = body.Players || []; status(`OK: ${body.Name}, ${body.CurrentPlayers}/${body.MaxPlayers} players, ${lastPlayers.filter(p => p.Callsign).length} with callsigns, ${(body.Vehicles || []).length} vehicles.` + (rl.limit ? ` Rate limit ${rl.left}/${rl.limit}.` : ''), 'ok'); }
    catch (e) { status(e.message, 'err'); } });

  renderCal();
  if (S.live) start();
  window.live = { settings: S, units, toWorld, toWorldP, cal: () => cal, poll, roadScore, stats: () => ({ lastUpdate, updates, source, streaming: streaming(), fixAt, rate: eventTimes.length / 10 }), samplesRaw: () => SAMPLES.slice(0, 5), debug: () => ({ samples: SAMPLES.length, newSamples, onRoadNow: roadScore(cal.a, cal.bx, cal.bz), cal, fit: S.fit }) , roadFitNow: () => { lastFitAt = 0; newSamples = 999; roadFit(); } };
})();
</script>
"""

def apply(s, ICON):
    s = re.sub(r'  /\* admin panel: server link.*?(?=\n  @media \(prefers-reduced-motion:reduce\)\{\.admin\{transition:none\}\}\n)\n  @media \(prefers-reduced-motion:reduce\)\{\.admin\{transition:none\}\}\n', '', s, flags=re.S)
    s = re.sub(r'<aside class="admin" id="admin".*?</aside>\n', '', s, flags=re.S)
    s = re.sub(r'<script id="live">.*?</script>\n', '', s, flags=re.S)
    s = s.replace('</style>', ADMIN_CSS + '</style>', 1)
    s = s.replace('<button aria-label="Settings">', '<button aria-label="Settings" id="adminToggle" aria-pressed="false" title="Admin">', 1)
    s = s.replace('id="statFeed" hidden></small></div><div class="n">65</div>', 'id="statFeed" hidden></small></div><div class="n" id="statOnline">65</div>', 1)
    s = s.replace('</body>', admin_html() + LIVE_JS.replace('__ICON__', json.dumps(ICON)).replace('__POSTALS__', open('preview/newmap/postals.json').read()) + '</body>', 1)
    return s
