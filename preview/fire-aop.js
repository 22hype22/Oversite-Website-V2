// Fire AOP, in the CAD's Server Staff panel: draw areas on the map, tick the ones that are the AOP, and choose what happens to
// the fire department calls ER:LC makes outside it (taken off the fire board, fires put out in game). Talks to /staff/fires;
// points are ER:LC map coordinates, the same units the calls' positions come in. Drawing works exactly like Settings → Boundaries.
(() => {
  const box = document.getElementById('stFires'), OV = window.OVERSITE; if (!box || !OV) return;
  const API = OV.api + '/staff/fires', SIZE = 5355, NS = 'http://www.w3.org/2000/svg', AOP = '#46D07C', OFF = '#C9CDD3';
  const CSS = `.fa{display:grid;grid-template-columns:minmax(0,330px) minmax(0,1fr);gap:18px;height:100%;min-height:0}
.fa-side{display:flex;flex-direction:column;gap:14px;min-height:0;overflow-y:auto;padding:2px 2px 10px;scrollbar-width:none}
.fa-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.fa-head h2{margin:0;font-size:17px;font-weight:600;color:#ECEDEF}.fa-head small{display:block;margin-top:3px;font-size:12px;color:var(--mute)}
.fa-sw{position:relative;flex:none;width:40px;height:23px;margin-top:2px;cursor:pointer}.fa-sw input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}.fa-sw i{position:absolute;inset:0;pointer-events:none;border-radius:999px;background:rgba(255,255,255,.14);transition:background-color .2s ease}
.fa-sw i::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.23,1,.32,1)}.fa-sw input:checked+i{background:#46D07C}.fa-sw input:checked+i::after{transform:translateX(17px)}.fa-sw input:focus-visible+i{outline:2px solid rgba(255,255,255,.5);outline-offset:2px}
.fa-note{margin:0;font-size:12.5px;line-height:1.5;color:var(--mute)}
.fa-sec{display:grid;gap:8px}.fa-sec>b{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.fa-area{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 8px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.02);cursor:pointer}
.fa-area.sel{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.05)}.fa-area input[type=text]{min-width:0;font:inherit;font-size:13px;color:#ECEDEF;background:none;border:0;padding:4px 2px;outline:none}
.fa-area input[type=text]:focus{box-shadow:inset 0 -1px 0 rgba(255,255,255,.35)}.fa-aop{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--mute);cursor:pointer;white-space:nowrap}.fa-aop input{margin:0;accent-color:#46D07C}
.fa-x{width:26px;height:26px;border-radius:8px;border:0;background:none;color:var(--mute);font-size:15px;cursor:pointer}.fa-x:hover{color:#F3A0A0;background:rgba(226,75,75,.12)}
.fa-empty{font-size:12.5px;color:var(--faint);padding:2px 0;margin:0}
.fa-chk{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:#E3E5E8;cursor:pointer;line-height:1.4}.fa-chk input{margin:2px 0 0;accent-color:#46D07C}.fa-chk small{display:block;font-size:11.5px;color:var(--faint)}
.fa-seg{display:flex;gap:6px;flex-wrap:wrap}.fa-seg button{font:inherit;font-size:12px;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--mute);cursor:pointer}.fa-seg button[aria-pressed="true"]{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}
.fa-act{display:flex;align-items:center;gap:10px;justify-content:flex-end}.fa-act .msg{flex:1;font-size:12px;color:var(--mute)}.fa-act .msg.err{color:#F3A0A0}.fa-act .msg.ok{color:#7FDCA4}
.fa-rec{display:grid;gap:2px}.fa-rec div{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:12.5px;color:#E3E5E8}.fa-rec div:first-child{border-top:0}
.fa-rec time{font-size:11.5px;color:var(--faint);padding-top:1px}.fa-rec small{display:block;color:var(--mute);font-size:11.5px;margin-top:1px}.fa-rec .bad{color:#F3A0A0}
.fa-mapcol{display:flex;flex-direction:column;min-height:0;gap:10px}
.fa-map{position:relative;flex:1;min-height:0;border-radius:12px;overflow:hidden;border:1px solid var(--hair2,rgba(255,255,255,.14));background:#0b1113}
.fa-map svg{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;user-select:none}.fa-map svg:active{cursor:grabbing}.fa-map svg.drawing{cursor:crosshair}.fa-map:has(svg.drawing){outline:2px solid rgba(240,242,245,.35);outline-offset:-2px}
.fa-map .fa-poly{cursor:pointer}.fa-map .fa-pt{cursor:move}.fa-map .fa-mid{cursor:copy}
.fa-zoom{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;border:1px solid var(--hair2,rgba(255,255,255,.14));background:rgba(13,20,22,.86)}
.fa-zoom button{width:34px;height:34px;border:0;background:transparent;color:#ECEDEF;font:500 17px/1 inherit;cursor:pointer}.fa-zoom button+button{border-top:1px solid var(--line)}.fa-zoom button:hover{background:rgba(255,255,255,.06)}
.fa-key{position:absolute;left:10px;top:10px;display:flex;gap:10px;flex-wrap:wrap;padding:6px 9px;border-radius:9px;background:rgba(13,20,22,.86);font-size:11px;color:#C9CDD3;pointer-events:none}.fa-key span{display:flex;align-items:center;gap:5px}.fa-key i{width:9px;height:9px;border-radius:50%;display:inline-block}
.fa-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.fa-bar .st-go{padding:7px 14px;font-size:12px}.fa-bar .st-btn:disabled{opacity:.45;cursor:default}.fa-bar .danger:not(:disabled){color:#F3A0A0}
.fa-hint{flex:1 1 220px;margin:0;font-size:12px;line-height:1.45;color:var(--mute)}
@media (max-width:900px){.fa{grid-template-columns:minmax(0,1fr);height:auto}.fa-mapcol{order:-1}.fa-map{flex:none;height:380px}.fa-side{overflow:visible}}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p = '', b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };

  box.innerHTML = `<div class="fa"><div class="fa-side">
    <div class="fa-head"><div><h2>Fire AOP</h2><small>Keep fires and fire calls inside your AOP</small></div><label class="fa-sw" title="Fire AOP on or off"><input type="checkbox" id="faOn" aria-label="Fire AOP on"><i></i></label></div>
    <p class="fa-note">Draw your areas on the map once, then tick the ones that are today's AOP. Fire calls ER:LC makes outside it are handled as you choose below.</p>
    <div class="fa-sec"><b>Areas</b><div id="faAreas"></div></div>
    <div class="fa-sec"><b>Outside the AOP</b>
      <label class="fa-chk"><input type="checkbox" id="faHide"><span>Take the call off the fire board<small>Firefighters only see calls inside the AOP</small></span></label>
      <label class="fa-chk"><input type="checkbox" id="faStop"><span>Put the fire out in game<small>Runs <code id="faCmd">:stopfire</code>, which puts out every fire, so it waits while one burns inside the AOP</small></span></label>
      <div class="fa-seg" id="faScope" role="group" aria-label="Which calls"><button type="button" data-s="fires">Fires and alarms</button><button type="button" data-s="all">Every fire department call</button></div></div>
    <div class="fa-act"><span class="msg" id="faMsg" role="status"></span><button type="button" class="st-go" id="faSave" disabled>Save</button></div>
    <div class="fa-sec"><b>Lately</b><div class="fa-rec" id="faRecent"></div><div><button type="button" class="st-btn" id="faOut">Put out every fire now</button></div></div>
  </div><div class="fa-mapcol"><div class="fa-map"><svg id="faSvg" preserveAspectRatio="xMidYMid slice" aria-label="Map. Click to add corners, drag to move around, scroll to zoom."></svg>
    <div class="fa-key" aria-hidden="true"><span><i style="background:${AOP}"></i>AOP</span><span><i style="background:#FF8A3D"></i>Fire</span><span><i style="background:#E9EAEC"></i>Other call</span></div>
    <div class="fa-zoom"><button type="button" id="faIn" aria-label="Zoom in">+</button><button type="button" id="faOutZ" aria-label="Zoom out">&minus;</button><button type="button" id="faFit" aria-label="Show the whole map">&#x2922;</button></div></div>
    <div class="fa-bar"><button type="button" class="st-go" id="faDraw">Draw area</button><button type="button" class="st-btn" id="faUndo" hidden>Undo corner</button><button type="button" class="st-btn danger" id="faDel" disabled>Delete area</button><p class="fa-hint" id="faHint"></p></div></div></div>`;
  const $ = id => document.getElementById(id), svg = $('faSvg'), msg = $('faMsg');
  let F = null, calls = [], sel = -1, draft = null, hover = null, dirty = false, vb = [0, 0, SIZE, SIZE], loaded = false;
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const img = el('image', { href: 'liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg);
  const gA = el('g', {}, svg), gD = el('g', {}, svg), gC = el('g', { 'pointer-events': 'none' }, svg);
  const setVB = () => svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); setVB();
  const px = () => vb[2] / (svg.clientWidth || 600);                       // map units per screen pixel
  const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; };
  const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE * 1.1, Math.max(250, vb[2] * f));
    vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; setVB(); draw(); };
  const say = (t, k = '') => { msg.textContent = t || ''; msg.className = 'msg ' + k; };
  const mark = () => { dirty = true; $('faSave').disabled = false; say('Not saved yet'); };

  // ── the map: areas (AOP in green, the rest grey), the selected one with its corners, the outline being drawn, live calls ──
  const poly = (pts, at, parent) => el('polygon', { points: pts.map(p => p.join(',')).join(' '), 'vector-effect': 'non-scaling-stroke', ...at }, parent);
  const draw = () => { if (!F) return; for (const g of [gA, gD, gC]) g.textContent = ''; const r = 6 * px();
    F.areas.forEach((a, i) => { const on = i === sel, c = a.on ? AOP : OFF, p = a.pts;
      poly(p, { fill: c, 'fill-opacity': on ? .32 : a.on ? .22 : .1, stroke: c, 'stroke-width': on ? 3.5 : 2.5, 'stroke-dasharray': a.on ? '' : '6 5', 'data-i': i, class: 'fa-poly', 'pointer-events': draft ? 'none' : 'visiblePainted' }, gA);
      const [cx, cy] = p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]);
      el('text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#fff', 'font-size': 13 * px(), 'font-weight': 600, 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * px(), 'pointer-events': 'none' }, gA).textContent = a.name;
      if (on && !draft) { p.forEach((q, k) => { const n = p[(k + 1) % p.length];
          el('circle', { cx: (q[0] + n[0]) / 2, cy: (q[1] + n[1]) / 2, r: r * .7, fill: c, 'fill-opacity': .55, class: 'fa-mid', 'data-k': k }, gA); });
        p.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r, fill: '#0d1416', stroke: c, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', class: 'fa-pt', 'data-k': k }, gA)); } });
    if (draft) { const pts = hover ? [...draft, hover] : draft;
      el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: AOP, 'fill-opacity': .1, stroke: AOP, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'vector-effect': 'non-scaling-stroke' }, gD);
      draft.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r: k ? r * .8 : r * 1.25, fill: k ? AOP : '#0d1416', stroke: AOP, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, gD)); }
    for (const k of calls) { const fire = /fire/i.test(k.what), c = el('circle', { cx: k.x, cy: k.z, r: r * 1.1, fill: fire ? '#FF8A3D' : '#E9EAEC', stroke: k.in === false ? '#E24B4B' : '#0d1416', 'stroke-width': k.in === false ? 3 : 1.5, 'vector-effect': 'non-scaling-stroke', opacity: k.in === false ? .75 : 1 }, gC);
      el('title', {}, c).textContent = k.what + (k.where ? ', ' + k.where : '') + (k.in === false ? ' (outside the AOP)' : ''); }
    $('faDel').disabled = sel < 0 || !!draft; $('faUndo').hidden = !draft; $('faDraw').textContent = draft ? 'Finish area' : 'Draw area';
    svg.classList.toggle('drawing', !!draft);
    $('faHint').textContent = draft ? (draft.length < 3 ? 'Click to place corners, or hold and drag to draw the outline. Scroll to zoom, hold the middle mouse button to move the map.' : 'Click the first corner, or press Finish area, to close it. Esc cancels.')
      : sel >= 0 ? 'Drag a corner to move it. Drag a small dot between corners to add one.' : F.areas.length ? 'Click an area to edit it, or draw another.' : 'No areas yet. Click or drag on the map to draw one around your AOP, like Springfield.'; };

  // ── the side: areas, options ──
  const drawList = () => { $('faAreas').innerHTML = F.areas.length ? F.areas.map((a, i) => `<div class="fa-area${i === sel ? ' sel' : ''}" data-i="${i}"><label class="fa-aop" title="Part of the AOP"><input type="checkbox" data-k="on"${a.on ? ' checked' : ''}>AOP</label>
      <input type="text" data-k="name" maxlength="32" value="${esc(a.name)}" aria-label="Area name"><button type="button" class="fa-x" data-k="rm" aria-label="Delete ${esc(a.name)}">&times;</button></div>`).join('')
      : '<p class="fa-empty">No areas yet. Draw one on the map.</p>'; };
  const drawOpts = () => { $('faOn').checked = F.on; $('faHide').checked = F.hide; $('faStop').checked = F.stop; $('faScope').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === F.scope))); };
  const drawRecent = list => { const S = { sent: 'Put out in game', refused: 'ER:LC refused to put it out', kept: 'Left burning: a fire is burning inside the AOP', sending: 'Putting it out…' };
    $('faRecent').innerHTML = list && list.length ? list.slice(0, 8).map(x => `<div><time>${new Date(x.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time><span>${esc(x.what)}${x.where ? ' · ' + esc(x.where) : ''}<small${x.stop === 'refused' ? ' class="bad"' : ''}>${[x.hidden ? 'Taken off the fire board' : '', S[x.stop] || ''].filter(Boolean).join(' · ')}${x.msg ? ': ' + esc(x.msg) : ''}</small></span></div>`).join('')
      : '<p class="fa-empty">Nothing handled yet. Calls outside the AOP show here.</p>'; };
  // jump to an area: selected, the map fitted around it
  const choose = i => { const p = F.areas[i]?.pts; if (!p) return; draft = null; sel = i;
    const xs = p.map(q => q[0]), zs = p.map(q => q[1]), w = Math.max(400, Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.4, cx = (Math.max(...xs) + Math.min(...xs)) / 2, cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    vb = [cx - w / 2, cz - w / 2, w, w]; setVB(); drawList(); draw(); };
  const removeArea = i => { const a = F.areas[i]; if (!a || !confirm('Delete ' + a.name + '? Press Save to keep the change.')) return; F.areas.splice(i, 1); sel = -1; mark(); drawList(); draw(); };
  const finish = () => { if (!draft) return; if (draft.length >= 3) { F.areas.push({ name: 'Area ' + (F.areas.length + 1), on: true, pts: draft }); sel = F.areas.length - 1; mark(); } draft = null; hover = null; drawList(); draw();
    const inp = $('faAreas').querySelector(`[data-i="${sel}"] input[type=text]`); if (inp) { inp.focus(); inp.select(); } };
  $('faDraw').addEventListener('click', () => { if (draft) return finish(); if (F.areas.length >= 12) return say('A server can have up to 12 areas.', 'err'); draft = []; sel = -1; drawList(); draw(); });
  $('faUndo').addEventListener('click', () => { if (draft) { draft.pop(); draw(); } });
  $('faDel').addEventListener('click', () => { if (sel >= 0) removeArea(sel); });
  $('faIn').addEventListener('click', () => zoom(.7)); $('faOutZ').addEventListener('click', () => zoom(1 / .7)); $('faFit').addEventListener('click', () => { vb = [0, 0, SIZE, SIZE]; setVB(); draw(); });
  document.addEventListener('keydown', e => { if (!draft || !box.offsetParent || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'Escape') { draft = null; hover = null; draw(); } else if (e.key === 'Enter') { e.preventDefault(); finish(); } else if (e.key === 'Backspace') { e.preventDefault(); draft.pop(); draw(); } });
  $('faAreas').addEventListener('click', e => { const row = e.target.closest('[data-i]'); if (!row) return; const i = +row.dataset.i;
    if (e.target.closest('[data-k="rm"]')) return removeArea(i); if (sel !== i && !e.target.closest('input')) choose(i); else if (sel !== i) { sel = i; draw(); row.parentElement.querySelectorAll('.fa-area').forEach(x => x.classList.toggle('sel', x === row)); } });
  $('faAreas').addEventListener('input', e => { const row = e.target.closest('[data-i]'), k = e.target.dataset.k; if (!row || !k) return; const a = F.areas[+row.dataset.i];
    if (k === 'on') a.on = e.target.checked; if (k === 'name') a.name = e.target.value; draw(); mark(); });
  $('faOn').addEventListener('change', e => { F.on = e.target.checked; mark(); });
  $('faHide').addEventListener('change', e => { F.hide = e.target.checked; mark(); });
  $('faStop').addEventListener('change', e => { F.stop = e.target.checked; mark(); });
  $('faScope').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; F.scope = b.dataset.s; drawOpts(); mark(); });

  // ── pointer, as in Boundaries. Drawing: a click adds a corner, holding and dragging draws the outline freehand. Otherwise a
  // drag moves the map, and a click picks an area. The middle button (or right button, or Space held down) always moves the map. ──
  let down = null, space = false;
  addEventListener('keydown', e => { if (e.code === 'Space' && box.offsetParent && document.activeElement === document.body) { space = true; e.preventDefault(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
  svg.addEventListener('contextmenu', e => e.preventDefault());
  for (const ev of ['mousedown', 'auxclick']) svg.addEventListener(ev, e => { if (e.button === 1) e.preventDefault(); });
  // fewer points for a freehand outline: drop the ones that sit on a nearly straight line (Douglas-Peucker)
  const simplify = (pts, tol) => { if (pts.length < 4) return pts;
    const [sx, sz] = pts[0], [ex, ez] = pts[pts.length - 1];
    if (Math.hypot(ex - sx, ez - sz) < tol * 4) { let k = 1, far = 0; pts.forEach((q, i) => { const d = Math.hypot(q[0] - sx, q[1] - sz); if (d > far) { far = d; k = i; } });   // a closed loop: split it at its far side first
      if (k > 0 && k < pts.length - 1) return [...line(pts.slice(0, k + 1), tol), ...line(pts.slice(k), tol).slice(1)]; }
    return line(pts, tol); };
  const line = (pts, tol) => { if (pts.length < 3) return pts; const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1; const st = [[0, pts.length - 1]];
    while (st.length) { const [a, b] = st.pop(); let far = 0, k = -1; const [ax, az] = pts[a], [bx, bz] = pts[b], L = Math.hypot(bx - ax, bz - az) || 1;
      for (let i = a + 1; i < b; i++) { const d = Math.abs((bx - ax) * (az - pts[i][1]) - (ax - pts[i][0]) * (bz - az)) / L; if (d > far) { far = d; k = i; } }
      if (far > tol) { keep[k] = 1; st.push([a, k], [k, b]); } }
    return pts.filter((_, i) => keep[i]); };
  svg.addEventListener('pointerdown', e => { if (!F) return; svg.setPointerCapture(e.pointerId); const t = e.target, P = toMap(e);
    const pan = () => ({ kind: 'pan', x: e.clientX, y: e.clientY, vb: [...vb], moved: false, t });
    if (e.button || space) { if (e.button === 1) e.preventDefault(); down = { ...pan(), force: true }; return; }
    if (!draft && sel >= 0 && t.classList.contains('fa-pt')) down = { kind: 'pt', k: +t.dataset.k };
    else if (!draft && sel >= 0 && t.classList.contains('fa-mid')) { const p = F.areas[sel].pts, k = +t.dataset.k; p.splice(k + 1, 0, P); down = { kind: 'pt', k: k + 1 }; mark(); draw(); }
    else if (!draft && !t.closest('.fa-poly') && !F.areas.length) { draft = []; sel = -1; down = { kind: 'draw', x: e.clientX, y: e.clientY, moved: false, n: 0 }; draw(); }   // nothing drawn yet: just start drawing
    else if (draft) down = { kind: 'draw', x: e.clientX, y: e.clientY, moved: false, n: draft.length };
    else down = pan(); });
  svg.addEventListener('pointermove', e => { const P = toMap(e);
    if (down?.kind === 'pt') { F.areas[sel].pts[down.k] = P; mark(); draw(); return; }
    if (down?.kind === 'pan') { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!down.moved && Math.hypot(dx, dy) < 5) return; down.moved = true;
      const s = down.vb[2] / svg.clientWidth; vb = [down.vb[0] - dx * s, down.vb[1] - dy * s, vb[2], vb[3]]; setVB(); return; }
    if (down?.kind === 'draw') { if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) return;
      if (!down.moved) { down.moved = true; draft.push(toMap({ clientX: down.x, clientY: down.y })); }
      const last = draft[draft.length - 1]; if (Math.hypot(P[0] - last[0], P[1] - last[1]) > 6 * px()) { draft.push(P); hover = null; draw(); } return; }
    if (draft) { hover = P; draw(); } });
  svg.addEventListener('pointerup', e => { const d = down; down = null; if (!d) return; const P = toMap(e);
    if (d.kind === 'pt') return;
    if (d.kind === 'pan') { if (d.moved || d.force) { draw(); return; } const hit = d.t.closest?.('.fa-poly'); if (hit) return choose(+hit.dataset.i); sel = -1; drawList(); draw(); return; }
    if (d.moved) { const stroke = draft.splice(d.n); stroke.push(P); draft.push(...simplify(stroke, 2.5 * px()));   // a freehand stroke: keep its shape with fewer points
      if (draft.length > 190) draft = simplify(draft, 6 * px());
      if (draft.length >= 3 && Math.hypot(P[0] - draft[0][0], P[1] - draft[0][1]) < 18 * px()) { draft.pop(); return finish(); }   // ended where it started: close it
      draw(); return; }
    if (draft.length >= 3 && Math.hypot(P[0] - draft[0][0], P[1] - draft[0][1]) < 12 * px()) return finish(); if (draft.length < 200) draft.push(P); draw(); });
  svg.addEventListener('dblclick', e => { if (draft) { e.preventDefault(); draft.pop(); finish(); } });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, toMap(e)); }, { passive: false });

  // ── saving, and fresh data every few seconds while the tab is open (unsaved changes are never overwritten) ──
  $('faSave').addEventListener('click', async () => { if (draft) finish(); $('faSave').disabled = true; say('Saving…');
    try { const j = await call('', { on: F.on, hide: F.hide, stop: F.stop, scope: F.scope, areas: F.areas }); dirty = false; take(j); say(F.on ? 'Saved. Fire AOP is on.' : 'Saved.', 'ok'); } catch (x) { $('faSave').disabled = false; say(x.message, 'err'); } });
  $('faOut').addEventListener('click', async () => { const b = $('faOut'); b.disabled = true; try { take(await call('/out', {})); say('Every fire was put out.', 'ok'); } catch (x) { say(x.message, 'err'); } b.disabled = false; });
  const take = j => { calls = j.calls || []; drawRecent(j.recent); if (j.command) $('faCmd').textContent = j.command;
    if (Array.isArray(j.off)) { img.setAttribute('x', -j.off[0]); img.setAttribute('y', -j.off[1]); }   // the map picture lined up with ER:LC's positions, as in Boundaries
    if (!dirty) { F = { on: j.on, hide: j.hide, stop: j.stop, scope: j.scope, areas: (j.areas || []).map(a => ({ ...a, pts: a.pts.map(q => q.slice()) })) }; if (sel >= F.areas.length) sel = -1; drawOpts(); if (!draft) drawList(); } draw(); };
  const load = () => call().then(take).catch(x => { if (!loaded) box.innerHTML = '<div class="st-gate" style="height:100%"><div><b>Fire AOP</b>' + esc(x.message) + '</div></div>'; }).finally(() => { loaded = true; });
  setInterval(() => { if (box.offsetParent !== null && !down && !document.hidden) load(); }, 5000);
  document.getElementById('stTabs')?.addEventListener('click', e => { if (e.target.closest('[data-p="fires"]')) setTimeout(() => { load(); draw(); }, 30); });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
})();
