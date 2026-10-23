// Transit (app/transit.mjs): the bus driver's app in the Civilian phone, and the Buses app every player gets.
//   Drive: start a shift (bus number, route, the pre-trip checklist), follow the route with the next stop and an off-route warning,
//   charge fares to whoever is on or next to the bus, call transit police or press panic (a 911 call, the nearest officers sent).
//   Buses: every bus in service on the map. Reports: incidents, crashes, lost property. Admins: Routes (click the map along the
//   roads, then add stops) and Settings (fare, checklist, what happens off route, transit police).
// The map and positions refresh every few seconds while the app is open.
(() => { const OV = window.OVERSITE; if (!OV || !OV.api || (OV.features || {}).transit === false) return;
  const API = OV.api + '/transit', CUR = OV.currency || '$', money = n => CUR + Math.round(n).toLocaleString('en-US');
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const css = document.createElement('style'); css.textContent = `.tr{display:grid;gap:10px;font-size:13px;color:#E9EAEC}
.tr .tr-seg{display:flex;gap:2px;padding:3px;border-radius:10px;background:rgba(255,255,255,.06);overflow-x:auto;scrollbar-width:none}.tr .tr-seg button{flex:1;white-space:nowrap;padding:6px 9px;border-radius:8px;border:0;background:none;color:#9A9EA6;font:500 12px inherit;font-family:inherit;cursor:pointer}
.tr .tr-seg button[aria-pressed="true"]{background:rgba(255,255,255,.12);color:#fff}
.tr .tr-card{border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:12px;display:grid;gap:9px;background:rgba(255,255,255,.03)}
.tr .tr-card h4{margin:0;font-size:14px;font-weight:600}.tr .tr-sub{color:#9A9EA6;font-size:12px;line-height:1.45}
.tr input,.tr select,.tr textarea{font:inherit;font-size:13px;color:#E9EAEC;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:9px;padding:8px 10px;min-width:0;width:100%;box-sizing:border-box;color-scheme:dark}
.tr textarea{min-height:64px;resize:vertical}.tr label{display:grid;gap:4px;color:#9A9EA6;font-size:12px}.tr .tr-chk{display:flex;gap:8px;align-items:flex-start;color:#E9EAEC;font-size:13px}.tr .tr-chk input{width:auto;flex:none;margin-top:2px}
.tr .tr-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tr .tr-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.tr .tr-btn{font:inherit;font-size:12.5px;font-weight:600;padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.16);background:none;color:#E9EAEC;cursor:pointer;white-space:nowrap}
.tr .tr-btn.go{background:#ECEDEF;color:#0B0B0C;border-color:#ECEDEF}.tr .tr-btn.bad{color:#F6A4A4;border-color:rgba(226,75,75,.5)}.tr .tr-btn.panic{background:#E0453B;border-color:#E0453B;color:#fff}.tr .tr-btn:disabled{opacity:.5;cursor:default}
.tr .tr-map{height:250px}.tr .tr-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid rgba(255,255,255,.07)}.tr .tr-row:first-child{border-top:0}.tr .tr-row .grow{flex:1;min-width:0}
.tr .tr-row small{display:block;color:#9A9EA6;font-size:11.5px}.tr .tr-dot{width:10px;height:10px;border-radius:50%;flex:none}
.tr .tr-big{display:flex;gap:10px}.tr .tr-big>div{flex:1;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.05)}.tr .tr-big b{display:block;font-size:17px;font-weight:600}.tr .tr-big small{color:#9A9EA6;font-size:11px}
.tr .tr-warn{padding:9px 11px;border-radius:10px;background:rgba(242,193,78,.14);color:#F2C14E;font-weight:600}.tr .tr-warn.red{background:rgba(226,75,75,.18);color:#F6A4A4}
.tr .msg{font-size:12px;color:#9A9EA6}.tr .msg.err{color:#F3A0A0}.tr .msg.ok{color:#7BE3A1}.tr .tr-pill{font-size:11px;padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.08)}
.tr .tr-stop{display:flex;gap:6px}.tr .tr-stop input{flex:1}`; document.head.appendChild(css);

  // the route and buses on a mini map (minimap.js)
  const paint = (m, D, o = {}) => { if (!m) return; const p = m.px(); m.g.textContent = '';
    for (const r of D.routes) { if (o.only && r.id !== o.only) continue; if (r.path.length > 1) m.el('polyline', { points: r.path.map(a => a.join(',')).join(' '), fill: 'none', stroke: r.color, 'stroke-width': o.only ? 5 : 3.5, 'stroke-opacity': .9, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' });
      for (const s of r.stops) { m.el('circle', { cx: s.x, cy: s.z, r: 5 * p, fill: '#fff', stroke: r.color, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke' }); if (o.only || p < 2.2) m.el('text', { x: s.x, y: s.z - 9 * p, 'text-anchor': 'middle', 'font-size': 10.5 * p, 'font-weight': 600, fill: '#fff', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * p }).textContent = s.name; } }
    for (const b of D.buses || []) { if (!Number.isFinite(b.x)) continue; const mine = o.me && b.id === o.me, col = b.route?.color || '#FFC94A';
      m.el('rect', { x: b.x - 9 * p, y: b.z - 6 * p, width: 18 * p, height: 12 * p, rx: 3 * p, fill: col, stroke: mine ? '#fff' : '#0d1416', 'stroke-width': mine ? 3 : 1.5, 'vector-effect': 'non-scaling-stroke' });
      m.el('text', { x: b.x, y: b.z + 3.6 * p, 'text-anchor': 'middle', 'font-size': 8.5 * p, 'font-weight': 800, fill: '#0B0B0C' }).textContent = String(b.bus).slice(0, 4); }
    if (o.draft) { const d = o.draft; if (d.path.length) m.el('polyline', { points: d.path.map(a => a.join(',')).join(' '), fill: 'none', stroke: d.color, 'stroke-width': 4, 'stroke-dasharray': '8 5', 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' });
      d.path.forEach(a => m.el('circle', { cx: a[0], cy: a[1], r: 3 * p, fill: d.color }));
      d.stops.forEach(s => { m.el('circle', { cx: s.x, cy: s.z, r: 6 * p, fill: '#fff', stroke: d.color, 'stroke-width': 3, 'vector-effect': 'non-scaling-stroke' }); m.el('text', { x: s.x, y: s.z - 10 * p, 'text-anchor': 'middle', 'font-size': 11 * p, 'font-weight': 700, fill: '#fff', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * p }).textContent = s.name; }); } };

  // ── the driver's app ──
  const box = document.getElementById('trBody'); if (box) { box.classList.add('tr');
    let D = null, tab = 'drive', mm = null, timer = 0, flash = null, draft = null, mode = 'path', armed = 0, cfg = null;
    const say = (t, k = '') => { flash = { t, k }; const f = document.getElementById('trFlash'); if (f) { f.textContent = t; f.className = 'msg ' + k; } };
    const tabs = () => `<div class="tr-seg" role="group" aria-label="Transit">${[['drive', D.shift ? 'My bus' : 'Drive'], ['buses', 'Buses'], ['reports', 'Reports'], ...(D.admin ? [['routes', 'Routes'], ['settings', 'Settings']] : [])].map(([k, t]) => `<button type="button" data-tab="${k}" aria-pressed="${tab === k}">${t}</button>`).join('')}</div>`;
    const routeOpts = v => `<option value="">No route</option>${D.routes.map(r => `<option value="${r.id}"${+v === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}`;
    const me = () => D.buses.find(b => D.shift && b.id === D.shift.id);
    const liveInfo = () => { const s = D.shift, b = me(), r = D.routes.find(x => x.id === s.route_id);
      return `${s.status === 'emergency' ? '<div class="tr-warn red">Emergency: police are on the way.</div>' : ''}${b?.off ? '<div class="tr-warn">You are off your route. Head back to it when it’s safe.</div>' : ''}
        <div class="tr-big"><div><small>Next stop</small><b>${esc(b?.next || (r ? '…' : 'No route'))}</b></div><div><small>Fares</small><b>${s.fares}</b></div><div><small>Taken</small><b>${money(s.takings)}</b></div></div>
        ${b && Number.isFinite(b.x) ? `<div class="tr-sub">${esc([b.postal && 'Postal ' + b.postal, b.street].filter(Boolean).join(', '))}</div>` : '<div class="tr-sub">Waiting to see your bus in the server. Make sure you’re in game.</div>'}`; };
    const nearHTML = () => { const L = D.shift.near || []; return L.length ? L.map(p => `<div class="tr-row"><div class="grow"><b>${esc(p.name)}</b><small>${esc(p.team || 'No team')} · ${p.dist} away</small></div>${D.conf.fare ? `<button class="tr-btn" data-fare="${esc(p.name)}">Charge ${money(D.conf.fare)}</button>` : ''}</div>`).join('') : '<div class="tr-sub">Nobody is on or next to the bus.</div>'; };
    const body = () => { const s = D.shift;
      if (tab === 'drive' && !D.linked) return '<div class="tr-card"><h4>Link your Roblox account</h4><div class="tr-sub">Your bus is found on the map by your Roblox name.</div></div>';
      if (tab === 'drive' && !s) return `<form class="tr-card" id="trStart" autocomplete="off"><h4>Start a shift</h4>
          <div class="tr-two"><label>Bus number<input name="bus" maxlength="12" placeholder="12" required></label><label>Route<select name="route">${routeOpts('')}</select></label></div>
          ${D.conf.checklist.length ? `<div class="tr-sub">Pre-trip checklist</div>${D.conf.checklist.map((c, i) => `<label class="tr-chk"><input type="checkbox" data-chk="${i}"> ${esc(c)}</label>`).join('')}` : ''}
          <div class="tr-acts"><button class="tr-btn go">Start shift</button><span class="msg" id="trStartMsg"></span></div>
          <div class="tr-sub">${D.conf.fare ? `Fares are ${money(D.conf.fare)}, paid from the rider’s bank account to yours.` : 'Rides are free on this server.'}${D.conf.autoFare && D.conf.fare ? ' Riders are charged by themselves when they ride along.' : ''}</div></form>`;
      if (tab === 'drive') return `<div class="tr-card"><div class="tr-acts"><h4 style="flex:1">Bus ${esc(s.bus)}</h4><select data-status style="width:auto">${D.statuses.map(x => `<option${x === s.status ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select></div>
          <label>Route<select data-route>${routeOpts(s.route_id)}</select></label><div id="trLive">${liveInfo()}</div><div class="tr-map" id="trMap"></div></div>
        ${D.conf.fare ? `<div class="tr-card"><div class="tr-acts"><h4 style="flex:1">Fares</h4><button class="tr-btn go" data-fareall>Charge everyone boarding</button></div><div id="trNear">${nearHTML()}</div></div>` : ''}
        <div class="tr-card"><h4>Help</h4>${D.conf.police ? `<form class="tr-stop" id="trCop"><input maxlength="280" placeholder="Message transit police: fare evader, fight on board…" aria-label="Message transit police"><button class="tr-btn">Send</button></form>` : ''}
          <div class="tr-acts"><button class="tr-btn panic" data-panic>${armed > Date.now() ? 'Press again to send panic' : 'Panic'}</button><span class="tr-sub">Calls 911 at your bus and sends the nearest officers.</span></div></div>
        <div class="tr-acts"><button class="tr-btn" data-tab="reports">File a report</button><span style="flex:1"></span><button class="tr-btn bad" data-end>End shift</button></div>`;
      if (tab === 'buses') return `<div class="tr-card"><div class="tr-map" id="trMap"></div><div id="trBusList">${busList()}</div></div>`;
      if (tab === 'reports') return `<form class="tr-card" id="trRep" autocomplete="off"><h4>New report</h4><div class="tr-two"><label>Type<select name="kind">${Object.entries(D.kinds).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select></label><label>Bus<input name="bus" maxlength="12" value="${esc(s?.bus || '')}"></label></div>
          <label>Title<input name="title" maxlength="80" placeholder="Rear-ended at the stop" required></label><label>Where<input name="location" maxlength="80" placeholder="${s ? 'Your bus’s location if empty' : 'Postal or street'}"></label>
          <label>What happened<textarea name="body" maxlength="3000"></textarea></label><div class="tr-acts"><button class="tr-btn go">File report</button><span class="msg" id="trRepMsg"></span></div></form>
        <div class="tr-card"><h4>Reports</h4>${D.reports.length ? D.reports.map(r => `<div class="tr-row"><div class="grow"><b>${esc(r.title)}</b><small>${esc(D.kinds[r.kind] || r.kind)}${r.bus ? ' · Bus ' + esc(r.bus) : ''}${r.location ? ' · ' + esc(r.location) : ''} · ${esc(r.by)} · ${new Date(r.at).toLocaleDateString()}</small>${r.body ? `<small style="color:#C9CDD3;white-space:pre-wrap">${esc(r.body)}</small>` : ''}</div><button class="tr-btn" data-rclose="${r.id}" data-reopen="${r.status === 'closed' ? 1 : ''}">${r.status === 'closed' ? 'Reopen' : 'Close'}</button></div>`).join('') : '<div class="tr-sub">No reports yet.</div>'}</div>`;
      if (tab === 'routes') return draft ? `<div class="tr-card"><h4>${draft.id ? 'Change route' : 'New route'}</h4><div class="tr-two"><label>Name<input data-dn maxlength="40" value="${esc(draft.name)}" placeholder="Route 1: Downtown loop"></label><label>Colour<input data-dc type="color" value="${esc(draft.color)}" style="height:38px;padding:3px"></label></div>
          <div class="tr-seg"><button type="button" data-mode="path" aria-pressed="${mode === 'path'}">Draw the route</button><button type="button" data-mode="stop" aria-pressed="${mode === 'stop'}">Add stops</button></div>
          <div class="tr-sub">${mode === 'path' ? 'Click the map along the roads the bus takes, in order.' : 'Click the map where each stop is, then name it below.'}</div><div class="tr-map" id="trMap"></div>
          <div class="tr-acts"><button class="tr-btn" data-undo>Undo last point</button><button class="tr-btn" data-clear>Clear the line</button><span class="tr-sub">${draft.path.length} points</span></div>
          ${draft.stops.map((s, i) => `<div class="tr-stop"><input data-sn="${i}" maxlength="40" value="${esc(s.name)}" aria-label="Stop name"><button class="tr-btn" data-srm="${i}">Remove</button></div>`).join('')}
          <div class="tr-acts">${draft.id ? '<button class="tr-btn bad" data-rdel>Delete route</button>' : ''}<span style="flex:1"></span><button class="tr-btn" data-rcancel>Cancel</button><button class="tr-btn go" data-rsave>Save route</button></div></div>`
        : `<div class="tr-card"><div class="tr-acts"><h4 style="flex:1">Routes</h4><button class="tr-btn go" data-rnew>New route</button></div>${D.routes.map(r => `<div class="tr-row"><span class="tr-dot" style="background:${esc(r.color)}"></span><div class="grow"><b>${esc(r.name)}</b><small>${r.stops.length} stop${r.stops.length === 1 ? '' : 's'}</small></div><button class="tr-btn" data-redit="${r.id}">Edit</button></div>`).join('') || '<div class="tr-sub">No routes yet. Draw one for drivers to follow.</div>'}<div class="tr-map" id="trMap"></div></div>`;
      if (tab === 'settings') { const c = cfg || D.conf; return `<form class="tr-card" id="trSet" autocomplete="off"><h4>Transit settings</h4>
          <div class="tr-two"><label>Fare (${esc(CUR)})<input name="fare" type="number" min="0" max="10000" value="${c.fare}"></label><label>Off route after<select name="how">${[['strict', 'a short way'], ['normal', 'a block or so'], ['loose', 'a long way']].map(([k, t]) => `<option value="${k}"${c.off.how === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
          <label class="tr-chk"><input type="checkbox" name="autoFare"${c.autoFare ? ' checked' : ''}> Charge riders by themselves when they ride along (from their bank account)</label>
          <label class="tr-chk"><input type="checkbox" name="offOn"${c.off.on ? ' checked' : ''}> Message a driver who goes off their route</label>
          <label>Off-route message<input name="msg" maxlength="150" value="${esc(c.off.msg)}"></label>
          <label class="tr-chk"><input type="checkbox" name="police"${c.police ? ' checked' : ''}> Drivers can message transit police (police get it as a CAD alert)</label>
          <label>Pre-trip checklist, one item a line<textarea name="checklist" rows="5">${esc(c.checklist.join('\n'))}</textarea></label>
          <div class="tr-acts"><button class="tr-btn go">Save</button><span class="msg" id="trSetMsg"></span></div></form>`; }
      return ''; };
    const busList = () => D.buses.length ? D.buses.map(b => `<div class="tr-row"><span class="tr-dot" style="background:${esc(b.route?.color || '#FFC94A')}"></span><div class="grow"><b>Bus ${esc(b.bus)} · ${esc(b.name)}</b><small>${esc(b.route?.name || 'No route')}${b.next ? ' · next: ' + esc(b.next) : ''} · ${esc(b.status)}${b.off ? ' · off route' : ''}</small></div></div>`).join('') : '<div class="tr-sub">No buses in service right now.</div>';
    const mapOpts = () => tab === 'drive' ? { only: D.shift?.route_id || -1, me: D.shift?.id } : tab === 'routes' ? { draft, only: draft ? -1 : 0 } : {};
    // the map keeps where you were looking when the screen is drawn again (a click while drawing a route, a fresh reading)
    let lastView = null, lastKey = '';
    const draw = () => { if (!D) return; if (mm) lastView = mm.view(); box.innerHTML = `${tabs()}<span class="msg ${flash?.k || ''}" id="trFlash">${esc(flash?.t || '')}</span>${body()}`;
      const el = document.getElementById('trMap'), key = tab + ':' + (draft ? draft.id || 'new' : '') + ':' + (D.shift?.id || ''); mm = null;
      if (!el) { lastKey = key; return; }
      mm = window.ovMiniMap(el, { off: D.off, onDraw: () => paint(mm, D, mapOpts()), onClick: at => { if (tab !== 'routes' || !draft) return;
        if (mode === 'path') draft.path.push(at); else draft.stops.push({ name: 'Stop ' + (draft.stops.length + 1), x: at[0], z: at[1] }); draw(); } });
      if (tab === 'routes' && draft) mm.svg.classList.add('pick');
      if (key === lastKey && lastView) mm.view(lastView);
      else { const b = me(), r = D.routes.find(x => x.id === (tab === 'drive' ? D.shift?.route_id : draft?.id)), pts = r?.path.length ? r.path : null;
        if (tab === 'drive' && b && Number.isFinite(b.x)) mm.fitTo(b.x, b.z, 900);
        else if (pts) { const xs = pts.map(a => a[0]), zs = pts.map(a => a[1]); mm.fitTo((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...zs) + Math.max(...zs)) / 2, Math.max(700, Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.25); } }
      lastKey = key; paint(mm, D, mapOpts()); };
    // live: while the app is open, the positions, the next stop and who's next to the bus, without touching what you're typing in
    const refresh = async () => { const was = D; try { D = await call(''); } catch (e) { return; }
      if (['routes', 'settings', 'reports'].includes(tab)) return;   // nothing live there
      if (!!was?.shift !== !!D.shift) return draw();
      if (tab === 'drive' && D.shift) { const L = document.getElementById('trLive'), n = document.getElementById('trNear'); if (L) L.innerHTML = liveInfo(); if (n) n.innerHTML = nearHTML(); paint(mm, D, mapOpts()); return; }
      if (tab === 'buses') { const bl = document.getElementById('trBusList'); if (bl) bl.innerHTML = busList(); paint(mm, D, mapOpts()); return; }
      const typing = document.activeElement && box.contains(document.activeElement) && document.activeElement.matches('input,textarea,select'); if (!typing) draw(); };
    const isOpen = () => document.body.dataset.view === 'civ' && document.querySelector('#civMdt .cv-pane[data-p="transit"]')?.classList.contains('on');
    const loop = () => { clearTimeout(timer); timer = setTimeout(async () => { if (isOpen() && ['drive', 'buses'].includes(tab)) await refresh(); loop(); }, 5000); };
    const openApp = async () => { if (!D) { try { D = await call(''); } catch (e) { box.innerHTML = `<div class="tr-card"><h4>Transit</h4><div class="tr-sub">${esc(e.message)}</div></div>`; return; } } draw(); loop(); };
    document.querySelector('#cvTabs [data-p="transit"]')?.addEventListener('click', openApp);
    const act = async (p, b, okMsg) => { try { D = await call(p, b); if (okMsg) flash = { t: okMsg, k: 'ok' }; draw(); return true; } catch (x) { say(x.message, 'err'); return false; } };
    box.addEventListener('click', async e => { const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.tab) { tab = t.dataset.tab; flash = null; cfg = null; if (tab !== 'routes') draft = null; return draw(); }
      if (t.dataset.fare) return act('/fare', { name: t.dataset.fare }, `Charged ${t.dataset.fare} ${money(D.conf.fare)}.`);
      if (t.hasAttribute('data-fareall')) { try { const j = await call('/fare', { all: true }); D = j; flash = { t: `Charged ${j.charged.join(', ')} ${money(j.amount)} each.${j.failed.length ? ' ' + j.failed.join(' ') : ''}`, k: 'ok' }; draw(); } catch (x) { say(x.message, 'err'); } return; }
      if (t.hasAttribute('data-panic')) { if (armed < Date.now()) { armed = Date.now() + 4000; t.textContent = 'Press again to send panic'; setTimeout(() => { if (t.isConnected && armed < Date.now()) t.textContent = 'Panic'; }, 4100); return; }
        armed = 0; try { const j = await call('/panic', {}); D = j; flash = { t: j.units.length ? `Panic sent. ${j.units.length} officer${j.units.length === 1 ? '' : 's'} on the way: ${j.units.join(', ')}.` : 'Panic sent: a 911 call is on the board. No officers are in the server right now.', k: 'ok' }; draw(); } catch (x) { say(x.message, 'err'); } return; }
      if (t.hasAttribute('data-end')) { if (!confirm('End your shift?')) return; try { const j = await call('/end', {}); D = j; flash = { t: `Shift over: ${j.summary.fares} fare${j.summary.fares === 1 ? '' : 's'}, ${money(j.summary.takings)} in ${j.summary.mins} min.`, k: 'ok' }; draw(); } catch (x) { say(x.message, 'err'); } return; }
      if (t.dataset.rclose) return act('/report/close', { id: +t.dataset.rclose, reopen: !!t.dataset.reopen });
      if (t.hasAttribute('data-rnew')) { draft = { name: '', color: '#3FBF8A', path: [], stops: [] }; mode = 'path'; return draw(); }
      if (t.dataset.redit) { const r = D.routes.find(x => x.id === +t.dataset.redit); draft = { ...r, path: r.path.map(a => [...a]), stops: r.stops.map(s => ({ ...s })) }; mode = 'path'; return draw(); }
      if (t.dataset.mode) { mode = t.dataset.mode; return draw(); }
      if (t.hasAttribute('data-undo')) { draft.path.pop(); return draw(); } if (t.hasAttribute('data-clear')) { draft.path = []; return draw(); }
      if (t.dataset.srm != null) { draft.stops.splice(+t.dataset.srm, 1); return draw(); }
      if (t.hasAttribute('data-rcancel')) { draft = null; return draw(); }
      if (t.hasAttribute('data-rdel')) { if (!confirm(`Delete ${draft.name || 'this route'}? Buses on it carry on with no route.`)) return; if (await act('/routes/delete', { id: draft.id }, 'Route deleted.')) { draft = null; draw(); } return; }
      if (t.hasAttribute('data-rsave')) { const keep = draft; draft = null; if (!(await act('/routes/save', keep, 'Route saved.'))) { draft = keep; draw(); say(flash?.t || 'Could not save.', 'err'); } return; } });
    box.addEventListener('input', e => { const t = e.target; if (!draft) return; if (t.dataset.dn != null) draft.name = t.value; if (t.dataset.dc != null) { draft.color = t.value; paint(mm, D, mapOpts()); } if (t.dataset.sn != null) { draft.stops[+t.dataset.sn].name = t.value; paint(mm, D, mapOpts()); } });
    box.addEventListener('change', e => { const t = e.target; if (t.hasAttribute('data-status')) act('/update', { status: t.value }); if (t.hasAttribute('data-route')) act('/update', { route: +t.value || null });
      if (t.closest('#trSet')) { const f = t.closest('#trSet'); cfg = { ...D.conf, autoFare: f.elements.autoFare.checked }; } });
    box.addEventListener('submit', async e => { e.preventDefault(); const f = e.target, v = Object.fromEntries(new FormData(f));
      if (f.id === 'trStart') { const m = document.getElementById('trStartMsg'); m.className = 'msg'; m.textContent = 'Starting…';
        try { D = await call('/start', { bus: v.bus, route: +v.route || null, checklist: [...f.querySelectorAll('[data-chk]')].map(x => x.checked) }); flash = { t: 'You’re on shift. Drive safe.', k: 'ok' }; draw(); } catch (x) { m.className = 'msg err'; m.textContent = x.message; } return; }
      if (f.id === 'trCop') { const i = f.querySelector('input'); if (!i.value.trim()) return; if (await act('/police', { text: i.value }, 'Transit police have your message.')) i.value = ''; return; }
      if (f.id === 'trRep') { const m = document.getElementById('trRepMsg'); try { D = await call('/report', v); flash = { t: 'Report filed.', k: 'ok' }; draw(); } catch (x) { m.className = 'msg err'; m.textContent = x.message; } return; }
      if (f.id === 'trSet') { const m = document.getElementById('trSetMsg');
        try { D = await call('/settings', { fare: +v.fare || 0, autoFare: !!f.elements.autoFare.checked, checklist: String(v.checklist || '').split('\n'), off: { on: !!f.elements.offOn.checked, how: v.how, msg: v.msg }, police: !!f.elements.police.checked }); cfg = null; flash = { t: 'Saved.', k: 'ok' }; draw(); } catch (x) { m.className = 'msg err'; m.textContent = x.message; } } }); }

  // ── Buses: every player's bus tracker on the phone ──
  const start = () => { const P = window.ovPhone; if (!P || (OV.features || {}).transit_tracker === false) return;
    let T = null, mm = null, timer = 0, sec = null;
    const list = () => T.buses.length ? T.buses.map(b => `<div class="tr-row"><span class="tr-dot" style="background:${esc(b.route?.color || '#FFC94A')}"></span><div class="grow"><b>Bus ${esc(b.bus)}${b.route ? ' · ' + esc(b.route.name) : ''}</b><small>${b.next ? 'Next stop: ' + esc(b.next) : 'Not on a route'}${b.postal ? ' · near postal ' + esc(b.postal) : ''}${b.status !== 'in service' ? ' · ' + esc(b.status) : ''}${b.off ? ' · running off route' : ''}</small></div></div>`).join('') : '<div class="tr-sub">No buses are running right now.</div>';
    const routes = () => T.routes.length ? T.routes.map(r => `<div class="tr-row"><span class="tr-dot" style="background:${esc(r.color)}"></span><div class="grow"><b>${esc(r.name)}</b><small>${r.stops.map(s => esc(s.name)).join(' → ') || 'No stops'}</small></div><span class="tr-pill">${T.buses.filter(b => b.route?.id === r.id).length} bus${T.buses.filter(b => b.route?.id === r.id).length === 1 ? '' : 'es'}</span></div>`).join('') : '<div class="tr-sub">This server has no bus routes yet.</div>';
    const render = async () => { try { T = await fetch(OV.api + '/transit/tracker', { cache: 'no-store' }).then(async r => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Could not load the buses.'); return j; }); } catch (e) { sec.innerHTML = `<div class="tr"><div class="tr-card"><h4>Buses</h4><div class="tr-sub">${esc(e.message)}</div></div></div>`; return; }
      if (!mm) { sec.innerHTML = `<div class="thead"><div><h2>Buses</h2><small>Where every bus is, live</small></div></div><div class="tr"><div class="tr-card"><div class="tr-map" id="trTrackMap"></div><div id="trTrackList"></div></div><div class="tr-card"><h4>Routes</h4><div id="trTrackRoutes"></div></div></div>`;
        mm = window.ovMiniMap(document.getElementById('trTrackMap'), { off: T.off, onDraw: () => paint(mm, T) }); }
      document.getElementById('trTrackList').innerHTML = list(); document.getElementById('trTrackRoutes').innerHTML = routes(); paint(mm, T); };
    const loop = () => { clearTimeout(timer); timer = setTimeout(async () => { if (P.isOpen('buses') && document.body.dataset.view === 'civ') await render(); loop(); }, 6000); };
    P.addApp({ id: 'buses', name: 'Buses', color: 'linear-gradient(180deg,#5BD08A,#1E9E57)', before: 'transit',
      icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.4-6-10.5a6 6 0 0 1 12 0C18 15.6 12 21 12 21z"/><rect x="9" y="7" width="6" height="5.5" rx="1.2"/><path d="M9 10h6"/></svg>',
      render: s => { sec = s; }, onOpen: () => { render(); loop(); } }); };
  window.ovPhone ? start() : addEventListener('load', () => setTimeout(start, 0));
})();
