// Mapping, in the CAD's Server Staff panel: one map for three kinds of areas, each kept separately.
//   Boundaries: where people may go (an area for the whole server and one per team, in presets; the live one is enforced in game)
//   Safe zones: no crime there (players are told when they walk in; a killer inside one is warned, and respawned or kicked)
//   Fire AOP:   where fires may burn (fire calls outside it come off the board, and fires outside it are put out)
// Drawing works the same in all three: click to place corners or hold and drag to draw the outline, click the first corner (or
// double-click, Enter, Finish area) to close it, drag a corner to move it, drag the dot between corners to add one.
// Points are ER:LC map coordinates. Staff can look; admins and up change Boundaries and Safe zones; Fire AOP is staff and Premium.
(() => {
  const box = document.getElementById('stMapping'), OV = window.OVERSITE; if (!box || !OV) return;
  const API = OV.api, SIZE = 5355, NS = 'http://www.w3.org/2000/svg', ALL = '*';
  const RK = { mod: 2, staff: 3, admin: 3, co_owner: 4, owner: 5 }[OV.role] || 0;
  const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C', '': '#46D07C', [ALL]: '#F0F2F5' }, SAFE = '#5AB8F0', AOP = '#46D07C', OFF = '#C9CDD3';
  const CSS = `.mp{display:grid;grid-template-columns:minmax(0,340px) minmax(0,1fr);gap:18px;height:100%;min-height:0}
.mp-side{display:flex;flex-direction:column;gap:14px;min-height:0;overflow-y:auto;padding:2px 2px 10px;scrollbar-width:none}
.mp-modes{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;padding:3px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid var(--line)}
.mp-modes button{font:inherit;font-size:12px;font-weight:500;padding:8px 4px;border:0;border-radius:9px;background:none;color:var(--mute);cursor:pointer;transition:background-color .15s ease,color .15s ease}
.mp-modes button[aria-pressed="true"]{background:rgba(255,255,255,.1);color:#fff}.mp-modes button:hover{color:#ECEDEF}
.mp-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.mp-head h2{margin:0;font-size:17px;font-weight:600;color:#ECEDEF}.mp-head small{display:block;margin-top:3px;font-size:12px;color:var(--mute);line-height:1.45}
.mp-sw{position:relative;flex:none;width:40px;height:23px;margin-top:2px;cursor:pointer}.mp-sw input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}.mp-sw i{position:absolute;inset:0;pointer-events:none;border-radius:999px;background:rgba(255,255,255,.14);transition:background-color .2s ease}
.mp-sw i::after{content:"";position:absolute;top:3px;left:3px;width:17px;height:17px;border-radius:50%;background:#fff;transition:transform .2s cubic-bezier(.23,1,.32,1)}.mp-sw input:checked+i{background:#46D07C}.mp-sw input:checked+i::after{transform:translateX(17px)}.mp-sw input:focus-visible+i{outline:2px solid rgba(255,255,255,.5);outline-offset:2px}.mp-sw input:disabled{cursor:default}
#mpSide{display:flex;flex-direction:column;gap:18px}
.mp input.mp-in,.mp select{height:34px;padding:0 10px;border-radius:9px;border:1px solid var(--line);background:rgba(255,255,255,.04);color:#ECEDEF;font:inherit;font-size:13px;outline:none}
.mp input.mp-in:focus,.mp select:focus{border-color:rgba(255,255,255,.3)}.mp select option{background:#16171a;color:#ECEDEF}.mp input.mp-in[readonly]{opacity:.7}.mp-row select{flex:1}
.mp-sec{display:grid;gap:8px}.mp-sec>b{font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--faint)}
.mp-chips{display:flex;flex-wrap:wrap;gap:6px}.mp-chip{display:inline-flex;align-items:center;gap:7px;font:inherit;font-size:12px;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--mute);cursor:pointer}
.mp-chip:hover{color:#ECEDEF}.mp-chip.on{color:#0d1416;background:#ECEDEF;border-color:#ECEDEF}.mp-chip b{width:8px;height:8px;border-radius:50%;flex:none}.mp-chip small{font-size:11px;opacity:.7}.mp-chip i{font-style:normal;font-size:10.5px;padding:1px 6px;border-radius:999px;background:#46D07C;color:#0d1416}.mp-chip.add{border-style:dashed}
.mp-pre{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.mp-pre input{flex:1 1 140px;min-width:0}
.mp-area{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 8px;border-radius:10px;border:1px solid var(--line);background:rgba(255,255,255,.02);cursor:pointer}
.mp-area.sel{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.05)}.mp-area input[type=text]{min-width:0;font:inherit;font-size:13px;color:#ECEDEF;background:none;border:0;padding:4px 2px;outline:none}
.mp-area input[type=text]:focus{box-shadow:inset 0 -1px 0 rgba(255,255,255,.35)}.mp-area>b{width:9px;height:9px;border-radius:50%;margin:0 2px}.mp-aop{display:flex;align-items:center;gap:6px;font-size:11.5px;color:var(--mute);cursor:pointer;white-space:nowrap}.mp-aop input{margin:0;accent-color:#46D07C}
.mp-x{width:26px;height:26px;border-radius:8px;border:0;background:none;color:var(--mute);font-size:15px;cursor:pointer}.mp-x:hover{color:#F3A0A0;background:rgba(226,75,75,.12)}
.mp-empty{font-size:12.5px;color:var(--faint);margin:0}
.mp-chk{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:#E3E5E8;cursor:pointer;line-height:1.4}.mp-chk input{margin:2px 0 0;accent-color:#46D07C}.mp-chk small{display:block;font-size:11.5px;color:var(--faint)}
.mp-seg{display:flex;gap:6px;flex-wrap:wrap}.mp-seg button{font:inherit;font-size:12px;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--mute);cursor:pointer}.mp-seg button[aria-pressed="true"]{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}
.mp-row{display:flex;align-items:center;gap:10px;font-size:13px;color:#E3E5E8}.mp-row select,.mp-in{min-width:0}.mp-in{width:100%}
.mp-act{display:flex;align-items:center;gap:10px;justify-content:flex-end}.mp-act .msg{flex:1;font-size:12px;color:var(--mute)}.mp-act .msg.err{color:#F3A0A0}.mp-act .msg.ok{color:#7FDCA4}
.mp-note{margin:0;font-size:12px;line-height:1.5;color:var(--mute)}.mp-warn{color:#E9B04C}
.mp-rec{display:grid}.mp-rec div{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:12.5px;color:#E3E5E8}.mp-rec div:first-child{border-top:0}
.mp-rec time{font-size:11.5px;color:var(--faint);padding-top:1px}.mp-rec small{display:block;color:var(--mute);font-size:11.5px;margin-top:1px}.mp-rec .bad{color:#F3A0A0}
.mp-mapcol{display:flex;flex-direction:column;min-height:0;gap:10px}
.mp-map{position:relative;flex:1;min-height:0;border-radius:12px;overflow:hidden;border:1px solid var(--hair2,rgba(255,255,255,.14));background:#0b1113}
.mp-map svg{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;user-select:none}.mp-map svg:active{cursor:grabbing}.mp-map svg.drawing{cursor:crosshair}.mp-map:has(svg.drawing){outline:2px solid rgba(240,242,245,.35);outline-offset:-2px}
.mp-map .mp-poly,.mp-map .mp-other{cursor:pointer}.mp-map .mp-pt{cursor:move}.mp-map .mp-mid{cursor:copy}
.mp-zoom{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;border:1px solid var(--hair2,rgba(255,255,255,.14));background:rgba(13,20,22,.86)}
.mp-zoom button{width:34px;height:34px;border:0;background:transparent;color:#ECEDEF;font:500 17px/1 inherit;cursor:pointer}.mp-zoom button+button{border-top:1px solid var(--line)}.mp-zoom button:hover{background:rgba(255,255,255,.06)}
.mp-key{position:absolute;left:10px;top:10px;display:flex;gap:10px;flex-wrap:wrap;padding:6px 9px;border-radius:9px;background:rgba(13,20,22,.86);font-size:11px;color:#C9CDD3;pointer-events:none}.mp-key span{display:flex;align-items:center;gap:5px}.mp-key i{width:9px;height:9px;border-radius:50%;display:inline-block}.mp-key:empty{display:none}
.mp-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px}.mp-bar .st-go{padding:7px 14px;font-size:12px}.mp-bar button:disabled{opacity:.45;cursor:default}.mp-bar .danger:not(:disabled){color:#F3A0A0}
.mp-hint{flex:1 1 220px;margin:0;font-size:12px;line-height:1.45;color:var(--mute)}
@media (max-width:900px){.mp{grid-template-columns:minmax(0,1fr);height:auto}.mp-mapcol{order:-1}.mp-map{flex:none;height:380px}.mp-side{overflow:visible}}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const hhmm = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  box.innerHTML = `<div class="mp"><div class="mp-side"><div class="mp-modes" role="group" aria-label="What to map"><button type="button" data-mode="bounds">Boundaries</button><button type="button" data-mode="safe">Safe zones</button><button type="button" data-mode="fire">Fire AOP</button><button type="button" data-mode="cams">Cameras</button></div><div id="mpSide"></div></div>
    <div class="mp-mapcol"><div class="mp-map"><svg id="mpSvg" preserveAspectRatio="xMidYMid slice" aria-label="Map. Click to add corners, drag to move around, scroll to zoom."></svg><div class="mp-key" id="mpKey" aria-hidden="true"></div>
      <div class="mp-zoom"><button type="button" id="mpIn" aria-label="Zoom in">+</button><button type="button" id="mpOut" aria-label="Zoom out">&minus;</button><button type="button" id="mpFit" aria-label="Show the whole map">&#x2922;</button></div></div>
      <div class="mp-bar"><button type="button" class="st-go" id="mpDraw">Draw area</button><button type="button" class="st-btn" id="mpUndo" hidden>Undo corner</button><button type="button" class="st-btn danger" id="mpDel" disabled>Delete area</button><p class="mp-hint" id="mpHint"></p></div></div></div>`;
  const $ = id => document.getElementById(id), svg = $('mpSvg'), side = $('mpSide');
  let mode = 'bounds'; try { mode = localStorage.getItem('ov.mapping') || 'bounds'; } catch (e) {} if (!['bounds', 'safe', 'fire', 'cams'].includes(mode)) mode = 'bounds';
  let sel = -1, draft = null, hover = null, vb = [0, 0, SIZE, SIZE];
  const D = { bounds: null, safe: null, fire: null, cams: null }, dirty = { bounds: false, safe: false, fire: false, cams: false }, errs = {};
  const CAM = '#B98CFF', CAM_R = { short: 35, normal: 55, long: 90 };   // plate cameras, and how far each sees (ER:LC map pixels)
  let camLog = [], camAlpr = true, placing = false;
  let B = { cur: '', scope: ALL, teams: [], depts: {}, players: [], log: [], connected: true }, calls = [], fireRecent = [], safeLog = [];

  // ── the map layers ──
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const img = el('image', { href: 'liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg);
  const gO = el('g', {}, svg), gA = el('g', {}, svg), gD = el('g', {}, svg), gP = el('g', { 'pointer-events': 'none' }, svg);
  const setVB = () => svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); setVB();
  const px = () => vb[2] / (svg.clientWidth || 600);
  const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; };
  const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE * 1.1, Math.max(250, vb[2] * f));
    vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; setVB(); draw(); };

  // ── what each mode puts on the map. items(): the areas you edit now ({ pts, name, color, dashed }); others(): faint areas you can
  // click to switch to (other teams' boundaries); dots(): people or calls; add/remove change the list ──
  const preset = () => D.bounds && (D.bounds.presets.find(p => p.id === B.cur) || D.bounds.presets[0]);
  const colorOf = s => s === ALL ? COL[ALL] : COL[B.depts[s] ?? ''] || COL[''];
  const scopeName = s => s === ALL ? 'Whole server' : s;
  const can = () => mode === 'fire' ? RK >= 2 && OV.premium : RK >= 3;
  const MODES = {
    bounds: { items: () => { const z = preset()?.zones || {}; return (z[B.scope] || []).map((pts, i, l) => ({ pts, name: scopeName(B.scope) + (l.length > 1 ? ' ' + (i + 1) : ''), color: colorOf(B.scope) })); },
      others: () => Object.entries(preset()?.zones || {}).filter(([s]) => s !== B.scope).flatMap(([s, list]) => list.map((pts, i) => ({ pts, color: colorOf(s), pick: () => { B.scope = s; sel = i; drawSide(); fit(pts); } }))),
      dots: () => B.players.map(p => ({ x: p.x, z: p.z, fill: colorOf(p.team in B.depts ? p.team : ''), name: p.name })),
      add: pts => { const z = preset().zones; (z[B.scope] = z[B.scope] || []).push(pts); return z[B.scope].length - 1; },
      remove: i => { const z = preset().zones; z[B.scope].splice(i, 1); if (!z[B.scope].length) delete z[B.scope]; }, max: 16, key: () => [{ c: colorOf(B.scope), t: scopeName(B.scope) }] },
    safe: { items: () => (D.safe?.zones || []).map(z => ({ pts: z.pts, name: z.name, color: SAFE })), others: () => [],
      dots: () => B.players.map(p => ({ x: p.x, z: p.z, fill: '#E9EAEC', name: p.name })),
      add: pts => { D.safe.zones.push({ name: 'Safe zone ' + (D.safe.zones.length + 1), pts }); return D.safe.zones.length - 1; }, remove: i => D.safe.zones.splice(i, 1), max: 16, key: () => [{ c: SAFE, t: 'Safe zone' }] },
    fire: { items: () => (D.fire?.areas || []).map(a => ({ pts: a.pts, name: a.name, color: a.on ? AOP : OFF, dashed: !a.on })), others: () => [],
      dots: () => calls.map(k => ({ x: k.x, z: k.z, fill: /fire/i.test(k.what) ? '#FF8A3D' : '#E9EAEC', ring: k.in === false ? '#E24B4B' : '', title: k.what + (k.where ? ', ' + k.where : '') + (k.in === false ? ' (outside the AOP)' : '') })),
      add: pts => { D.fire.areas.push({ name: 'Area ' + (D.fire.areas.length + 1), on: true, pts }); return D.fire.areas.length - 1; }, remove: i => D.fire.areas.splice(i, 1), max: 12,
      key: () => [{ c: AOP, t: 'AOP' }, { c: '#FF8A3D', t: 'Fire' }, { c: '#E9EAEC', t: 'Other call' }] },
    // cameras are points, not areas: they're drawn and moved by their own code below
    cams: { items: () => [], others: () => [], dots: () => B.players.map(p => ({ x: p.x, z: p.z, fill: '#E9EAEC', name: p.name })), max: 60, key: () => [{ c: CAM, t: 'Plate camera' }] } };
  const M = () => MODES[mode], ready = () => !!D[mode];

  const poly = (pts, at, parent) => el('polygon', { points: pts.map(p => p.join(',')).join(' '), 'vector-effect': 'non-scaling-stroke', ...at }, parent);
  const draw = () => { for (const g of [gO, gA, gD, gP]) g.textContent = ''; const r = 6 * px(); if (!ready()) return bar();
    M().others().forEach((o, i) => { const p = poly(o.pts, { fill: o.color, 'fill-opacity': .1, stroke: o.color, 'stroke-opacity': .85, 'stroke-width': 2, 'stroke-dasharray': '6 5', class: 'mp-other', 'data-o': i, 'pointer-events': draft ? 'none' : 'visiblePainted' }, gO); });
    M().items().forEach((a, i) => { const on = i === sel, c = a.color, p = a.pts;
      poly(p, { fill: c, 'fill-opacity': on ? .32 : a.dashed ? .1 : .22, stroke: c, 'stroke-width': on ? 3.5 : 2.5, 'stroke-dasharray': a.dashed ? '6 5' : '', 'data-i': i, class: 'mp-poly', 'pointer-events': draft ? 'none' : 'visiblePainted' }, gA);
      const [cx, cy] = p.reduce((s, q) => [s[0] + q[0] / p.length, s[1] + q[1] / p.length], [0, 0]);
      el('text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#fff', 'font-size': 13 * px(), 'font-weight': 600, 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * px(), 'pointer-events': 'none' }, gA).textContent = a.name;
      if (on && !draft && can()) { p.forEach((q, k) => { const n = p[(k + 1) % p.length]; el('circle', { cx: (q[0] + n[0]) / 2, cy: (q[1] + n[1]) / 2, r: r * .7, fill: c, 'fill-opacity': .55, class: 'mp-mid', 'data-k': k }, gA); });
        p.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r, fill: '#0d1416', stroke: c, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', class: 'mp-pt', 'data-k': k }, gA)); } });
    if (draft) { const c = mode === 'bounds' ? colorOf(B.scope) : mode === 'safe' ? SAFE : AOP, pts = hover ? [...draft, hover] : draft;
      el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: c, 'fill-opacity': .1, stroke: c, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'vector-effect': 'non-scaling-stroke' }, gD);
      draft.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r: k ? r * .8 : r * 1.25, fill: k ? c : '#0d1416', stroke: c, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, gD)); }
    if (mode === 'cams') { const R = CAM_R[D.cams.range] || 55; D.cams.list.forEach((k, i) => { const on = i === sel;
        el('circle', { cx: k.x, cy: k.z, r: R, fill: CAM, 'fill-opacity': on ? .2 : .12, stroke: CAM, 'stroke-width': on ? 2.5 : 1.5, 'stroke-dasharray': '5 4', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, gA);
        el('circle', { cx: k.x, cy: k.z, r: r * 1.3, fill: on ? '#FFFFFF' : CAM, stroke: '#0d1416', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', class: 'mp-cam', 'data-c': i, style: can() ? 'cursor:move' : 'cursor:pointer' }, gA);
        el('text', { x: k.x + r * 2, y: k.z + r * .5, 'font-size': 12 * px(), 'font-weight': 600, fill: '#fff', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * px(), 'pointer-events': 'none' }, gA).textContent = k.name; }); }
    for (const d of M().dots()) { const g = el('g', {}, gP); const c = el('circle', { cx: d.x, cy: d.z, r: r * (d.name ? .9 : 1.1), fill: d.fill, stroke: d.ring || '#0d1416', 'stroke-width': d.ring ? 3 : 1.5, 'vector-effect': 'non-scaling-stroke' }, g);
      if (d.title) el('title', {}, c).textContent = d.title;
      if (d.name) el('text', { x: d.x + r * 1.5, y: d.z + r * .5, 'font-size': 11 * px(), fill: '#F0F2F5', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * px() }, g).textContent = d.name; }
    $('mpKey').innerHTML = M().key().map(k => `<span><i style="background:${k.c}"></i>${esc(k.t)}</span>`).join(''); bar(); };
  const bar = () => { if (mode === 'cams') { const ok = can() && ready(), n = ready() ? D.cams.list.length : 0;
      $('mpDraw').disabled = !ok; $('mpDraw').textContent = placing ? 'Cancel' : 'Add camera'; $('mpDel').disabled = !ok || sel < 0; $('mpDel').textContent = 'Delete camera'; $('mpUndo').hidden = true; svg.classList.toggle('drawing', placing);
      $('mpHint').textContent = !ready() ? (errs.cams || 'Loading…') : !can() ? 'You can look. Admins and up change these.' : placing ? 'Click the map where the camera is.' : sel >= 0 ? 'Drag the camera to move it.' : n ? 'Click a camera to edit it, or add another.' : 'No cameras yet. Press Add camera, then click the map where one is.'; return; }
    $('mpDel').textContent = 'Delete area'; const n = ready() ? M().items().length : 0, ok = can() && ready();
    $('mpDraw').disabled = !ok; $('mpDel').disabled = !ok || sel < 0 || !!draft; $('mpUndo').hidden = !draft; $('mpDraw').textContent = draft ? 'Finish area' : 'Draw area'; svg.classList.toggle('drawing', !!draft);
    $('mpHint').textContent = !ready() ? (errs[mode] || 'Loading…') : !can() ? (mode === 'fire' && !OV.premium ? 'Fire AOP comes with Premium.' : 'You can look. Admins and up change these.')
      : draft ? (draft.length < 3 ? 'Click to place corners, or hold and drag to draw the outline. Scroll to zoom, hold the middle mouse button to move the map.' : 'Click the first corner, or press Finish area, to close it. Esc cancels.')
      : sel >= 0 ? 'Drag a corner to move it. Drag a small dot between corners to add one.' : n ? 'Click an area to edit it, or draw another.' : 'Nothing drawn yet. Click or drag on the map to draw one.'; };
  const fit = p => { const xs = p.map(q => q[0]), zs = p.map(q => q[1]), w = Math.max(400, Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.4, cx = (Math.max(...xs) + Math.min(...xs)) / 2, cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    vb = [cx - w / 2, cz - w / 2, w, w]; setVB(); draw(); };
  const choose = i => { const a = M().items()[i]; if (!a) return; draft = null; sel = i; drawSide(); fit(a.pts); };
  const mark = () => { dirty[mode] = true; const s = $('mpSave'); if (s) s.disabled = false; say('Not saved yet'); };
  let flash = null;   // the last message under Save, kept for a few seconds so a refresh of the panel doesn't wipe it
  const say = (t, k = '') => { flash = { t, k, at: Date.now() }; const m = $('mpMsg'); if (m) { m.textContent = t || ''; m.className = 'msg ' + k; } };
  const finish = () => { if (!draft) return; if (draft.length >= 3) { sel = M().add(draft); mark(); } draft = null; hover = null; drawSide(); draw();
    const inp = side.querySelector(`[data-i="${sel}"] input[type=text]`); if (inp) { inp.focus(); inp.select(); } };
  const removeArea = i => { const a = M().items()[i]; if (!a || !confirm('Delete ' + a.name + '? Press Save to keep the change.')) return; M().remove(i); sel = -1; mark(); drawSide(); draw(); };

  // ── the side panel for each mode ──
  const sw = (id, on, label) => `<label class="mp-sw" title="${label}"><input type="checkbox" id="${id}"${on ? ' checked' : ''}${can() ? '' : ' disabled'} aria-label="${label}"><i></i></label>`;
  const saveRow = () => can() ? `<div class="mp-act"><span class="msg" id="mpMsg" role="status"></span><button type="button" class="st-go" id="mpSave"${dirty[mode] ? '' : ' disabled'}>Save</button></div>` : '';
  const recent = (list, fmt) => `<div class="mp-sec"><b>Lately</b><div class="mp-rec">${list && list.length ? list.slice(0, 8).map(x => `<div><time>${hhmm(x.at)}</time><span>${fmt(x)}</span></div>`).join('') : '<p class="mp-empty">Nothing yet.</p>'}</div></div>`;
  const areaRows = (list, extra, none) => list.length ? list.map((a, i) => `<div class="mp-area${i === sel ? ' sel' : ''}" data-i="${i}">${extra ? extra(a) : '<b style="background:' + SAFE + '"></b>'}<input type="text" data-k="name" maxlength="32" value="${esc(a.name)}" aria-label="Name"${can() ? '' : ' readonly'}>${can() ? `<button type="button" class="mp-x" data-k="rm" aria-label="Delete ${esc(a.name)}">&times;</button>` : '<span></span>'}</div>`).join('') : '<p class="mp-empty">' + (none || 'None drawn yet. Draw one on the map.') + '</p>';
  const drawSide = () => { box.querySelectorAll('.mp-modes button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
    if (!ready()) { side.innerHTML = `<p class="mp-note">${esc(errs[mode] || 'Loading…')}</p>`; return; }
    if (mode === 'bounds') { const b = D.bounds, P = preset(), z = P.zones;
      side.innerHTML = `<div class="mp-head"><div><h2>Boundaries</h2><small>Where people may go: one area for the whole server, and one per team if you want. Anyone who leaves theirs is told in game, and respawned if they aren't back in time.</small></div>${sw('mpOn', b.on, 'Enforce the live preset')}</div>
        ${B.connected ? '' : '<p class="mp-note mp-warn">Connect the ER:LC server in Settings first. Boundaries need in-game positions and commands.</p>'}
        <div class="mp-sec"><b>Presets</b><div class="mp-chips" id="mpSlots">${b.presets.map(p => `<button type="button" class="mp-chip${p.id === P.id ? ' on' : ''}" data-p="${p.id}">${esc(p.name)}${p.id === b.active ? '<i>Live</i>' : ''}</button>`).join('')}${can() && b.presets.length < 8 ? '<button type="button" class="mp-chip add" data-p="+">New preset</button>' : ''}</div>
          ${can() ? `<div class="mp-pre"><input id="mpName" class="mp-in" maxlength="32" value="${esc(P.name)}" aria-label="Preset name"><button type="button" class="st-btn" id="mpLive"${P.id === b.active ? ' disabled' : ''}>${P.id === b.active ? 'Live' : 'Make live'}</button><button type="button" class="st-btn" id="mpCopy">Duplicate</button><button type="button" class="st-btn" id="mpRmP"${b.presets.length < 2 ? ' disabled' : ''}>Delete</button></div>` : ''}</div>
        <div class="mp-sec"><b>Area for</b><div class="mp-chips" id="mpScope">${[ALL, ...B.teams].map(s => { const n = (z[s] || []).length; return `<button type="button" class="mp-chip${s === B.scope ? ' on' : ''}" data-s="${esc(s)}"><b style="background:${colorOf(s)}"></b>${esc(scopeName(s))}${n ? '<small>' + n + '</small>' : ''}</button>`; }).join('')}</div></div>
        <div class="mp-sec"><b>Rules</b><div class="mp-row">Time to get back<select id="mpGrace"${can() ? '' : ' disabled'}>${[15, 30, 45, 60, 90, 120, 180, 300].map(t => `<option value="${t}"${+b.grace === t ? ' selected' : ''}>${t < 60 ? t + ' seconds' : t / 60 + (t === 60 ? ' minute' : ' minutes')}</option>`).join('')}</select></div>
          <label class="mp-chk"><input type="checkbox" id="mpStaff"${b.exemptStaff ? ' checked' : ''}${can() ? '' : ' disabled'}><span>Leave server staff alone<small>In-game admins and mods aren't warned or respawned</small></span></label></div>
        ${saveRow()}${recent(B.log, l => `<b>${esc(l.name)}</b>${l.team ? ' · ' + esc(l.team) : ''}<small${l.kind === 'failed' ? ' class="bad"' : ''}>${l.kind === 'left' ? 'Left ' + esc(l.where || 'their area') + ' and was warned' : l.kind === 'loaded' ? 'Respawned for staying outside ' + esc(l.where || 'their area') : l.kind === 'failed' ? 'Couldn’t be ' + (l.cmd === 'load' ? 'respawned' : 'messaged') + ': ' + esc(l.why || 'ER:LC refused it') : 'Came back in time'}</small>`)}`; }
    if (mode === 'safe') { const s = D.safe;
      side.innerHTML = `<div class="mp-head"><div><h2>Safe zones</h2><small>No crime here: spawn, the hospital, the station. Draw them on the map.</small></div>${sw('mpOn', s.on, 'Safe zones on')}</div>
        <div class="mp-sec"><b>Zones</b><div id="mpAreas">${areaRows(s.zones)}</div></div>
        <div class="mp-sec"><b>When someone walks in</b><label class="mp-chk"><input type="checkbox" id="mpEnter"${s.enter ? ' checked' : ''}${can() ? '' : ' disabled'}><span>Send them a message in game</span></label>
          <input id="mpEnterMsg" class="mp-in" maxlength="150" value="${esc(s.enterMsg)}" aria-label="Message"${can() ? '' : ' readonly'}${s.enter ? '' : ' hidden'}></div>
        <div class="mp-sec"><b>When someone kills inside one</b><div class="mp-seg" id="mpKill" role="group" aria-label="What happens to the killer">${[['warn', 'Warn them'], ['load', 'Warn and respawn'], ['kick', 'Warn and kick']].map(([k, t]) => `<button type="button" data-v="${k}" aria-pressed="${s.kill === k}"${can() ? '' : ' disabled'}>${t}</button>`).join('')}</div>
          <p class="mp-note">The killer gets a message in game explaining why. Every kill in a safe zone shows below.</p></div>
        ${saveRow()}${recent(safeLog, x => `<b>${esc(x.killer)}</b> killed ${esc(x.victim)}<small${x.failed ? ' class="bad"' : ''}>In ${esc(x.zone)} · ${x.failed ? 'ER:LC refused: ' + esc(x.failed) : { warn: 'Warned', load: 'Warned and respawned', kick: 'Warned and kicked' }[x.action] || 'Warned'}</small>`)}`; }
    if (mode === 'fire') { const f = D.fire;
      side.innerHTML = `<div class="mp-head"><div><h2>Fire AOP</h2><small>Keep fires and fire calls inside your AOP. Tick the areas that are today's AOP.</small></div>${sw('mpOn', f.on, 'Fire AOP on')}</div>
        <div class="mp-sec"><b>Areas</b><div id="mpAreas">${areaRows(f.areas, a => `<label class="mp-aop" title="Part of the AOP"><input type="checkbox" data-k="on"${a.on ? ' checked' : ''}${can() ? '' : ' disabled'}>AOP</label>`)}</div></div>
        <div class="mp-sec"><b>Outside the AOP</b>
          <label class="mp-chk"><input type="checkbox" id="mpHide"${f.hide ? ' checked' : ''}${can() ? '' : ' disabled'}><span>Take the call off the fire board<small>Firefighters only see calls inside the AOP</small></span></label>
          <label class="mp-chk"><input type="checkbox" id="mpStop"${f.stop ? ' checked' : ''}${can() ? '' : ' disabled'}><span>Put the fire out in game<small>Runs <code>${esc(f.command || ':stopfire')}</code>, which puts out every fire, so it waits while one burns inside the AOP</small></span></label>
          <div class="mp-seg" id="mpScopeF" role="group" aria-label="Which calls"><button type="button" data-v="fires" aria-pressed="${f.scope === 'fires'}"${can() ? '' : ' disabled'}>Fires and alarms</button><button type="button" data-v="all" aria-pressed="${f.scope === 'all'}"${can() ? '' : ' disabled'}>Every fire department call</button></div></div>
        ${saveRow()}${recent(fireRecent, x => `${esc(x.what)}${x.where ? ' · ' + esc(x.where) : ''}<small${x.stop === 'refused' ? ' class="bad"' : ''}>${[x.hidden ? 'Taken off the fire board' : '', { sent: 'Put out in game', refused: 'ER:LC refused to put it out', kept: 'Left burning: a fire is burning inside the AOP', sending: 'Putting it out…' }[x.stop] || ''].filter(Boolean).join(' · ')}${x.msg ? ': ' + esc(x.msg) : ''}</small>`)}
        ${can() ? '<div><button type="button" class="st-btn" id="mpFireOut">Put out every fire now</button></div>' : ''}`; }
    if (mode === 'cams') { const k = D.cams;
      side.innerHTML = `<div class="mp-head"><div><h2>Plate cameras</h2><small>Fixed plate readers, like Flock cameras. When a flagged car (stolen, a BOLO, its owner wanted, bad papers) drives past one, police and dispatch get an alert that says which camera saw it.</small></div>${sw('mpOn', k.on, 'Cameras on')}</div>
        ${camAlpr ? '' : '<p class="mp-note mp-warn">The plate reader is switched off in Settings, Features, so cameras won’t alert until it’s on.</p>'}
        <p class="mp-note">While cameras are on, the plate reader only watches at cameras instead of the whole map.</p>
        <div class="mp-sec"><b>How far each sees</b><div class="mp-seg" id="mpRange" role="group" aria-label="Range">${[['short', 'Short, 15 m'], ['normal', 'Normal, 25 m'], ['long', 'Long, 40 m']].map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${k.range === v}"${can() ? '' : ' disabled'}>${t}</button>`).join('')}</div></div>
        <div class="mp-sec"><b>Cameras</b><div id="mpAreas">${areaRows(k.list, () => '<b style="background:' + CAM + '"></b>', 'None yet. Press Add camera under the map, then click where one is.')}</div></div>
        ${saveRow()}${recent(camLog, x => `<b>${esc(x.plate)}</b>${x.vehicle ? ' · ' + esc(x.vehicle) : ''}<small>${esc(x.camera)} · ${esc(x.reasons)}${x.owner ? ' · ' + esc(x.owner) : ''}</small>`)}`; }
    const m = $('mpMsg'); if (m && flash && Date.now() - flash.at < 6000) { m.textContent = flash.t; m.className = 'msg ' + flash.k; } };

  // ── side panel input ──
  side.addEventListener('click', async e => { const t = e.target; if (!ready()) return;
    const row0 = t.closest('[data-i]'); if (row0 && mode === 'cams') { const i = +row0.dataset.i; if (t.closest('[data-k="rm"]')) return removeCam(i); if (sel !== i) { sel = i; const k = D.cams.list[i]; if (!t.closest('input')) { vb = [k.x - 350, k.z - 350, 700, 700]; setVB(); } drawSide(); draw(); } return; }
    const rg = t.closest('#mpRange [data-v]'); if (rg) { D.cams.range = rg.dataset.v; mark(); drawSide(); draw(); return; }
    const row = t.closest('[data-i]'); if (row && (mode !== 'bounds')) { const i = +row.dataset.i; if (t.closest('[data-k="rm"]')) return removeArea(i); if (sel !== i && !t.closest('input')) choose(i); else if (sel !== i) { sel = i; draw(); side.querySelectorAll('.mp-area').forEach(x => x.classList.toggle('sel', x === row)); } return; }
    if (mode === 'bounds') { const b = D.bounds, P = preset();
      const pc = t.closest('#mpSlots [data-p]'); if (pc) { draft = null; sel = -1; if (pc.dataset.p === '+') { const id = Math.random().toString(36).slice(2, 9); b.presets.push({ id, name: 'Preset ' + (b.presets.length + 1), zones: {} }); B.cur = id; mark(); } else B.cur = pc.dataset.p; drawSide(); draw(); return; }
      const sc = t.closest('#mpScope [data-s]'); if (sc) { draft = null; sel = -1; B.scope = sc.dataset.s; drawSide(); draw(); return; }
      if (t.id === 'mpLive') { b.active = P.id; mark(); drawSide(); return; }
      if (t.id === 'mpCopy') { if (b.presets.length >= 8) return say('You can keep up to 8 presets.', 'err'); const id = Math.random().toString(36).slice(2, 9); b.presets.push({ id, name: (P.name + ' copy').slice(0, 32), zones: JSON.parse(JSON.stringify(P.zones)) }); B.cur = id; mark(); drawSide(); draw(); return; }
      if (t.id === 'mpRmP') { if (b.presets.length < 2 || !confirm('Delete ' + P.name + ' and its areas? Press Save to keep the change.')) return; b.presets = b.presets.filter(p => p.id !== P.id); if (!b.presets.some(p => p.id === b.active)) b.active = b.presets[0].id; B.cur = b.presets[0].id; sel = -1; mark(); drawSide(); draw(); return; } }
    const kb = t.closest('#mpKill [data-v]'); if (kb) { D.safe.kill = kb.dataset.v; mark(); drawSide(); return; }
    const fb = t.closest('#mpScopeF [data-v]'); if (fb) { D.fire.scope = fb.dataset.v; mark(); drawSide(); return; }
    if (t.id === 'mpFireOut') { t.disabled = true; try { takeFire(await call('/staff/fires/out', {})); say('Every fire was put out.', 'ok'); } catch (x) { say(x.message, 'err'); } t.disabled = false; return; }
    if (t.id === 'mpSave') save(); });
  side.addEventListener('input', e => { const t = e.target; if (!ready() || !can()) return;
    const row = t.closest('[data-i]'); if (row && t.dataset.k) { const L = mode === 'safe' ? D.safe.zones : mode === 'cams' ? D.cams.list : D.fire.areas, a = L[+row.dataset.i]; if (t.dataset.k === 'on') a.on = t.checked; if (t.dataset.k === 'name') a.name = t.value; draw(); return mark(); }
    if (t.id === 'mpName') { preset().name = t.value.slice(0, 32); const c = side.querySelector('#mpSlots .on'); if (c) c.firstChild.textContent = preset().name || 'Untitled'; return mark(); }
    if (t.id === 'mpEnterMsg') { D.safe.enterMsg = t.value; return mark(); } });
  side.addEventListener('change', e => { const t = e.target; if (!ready() || !can()) return; const d = D[mode];
    if (t.id === 'mpOn') { d.on = t.checked; return mark(); } if (t.id === 'mpGrace') { d.grace = +t.value; return mark(); } if (t.id === 'mpStaff') { d.exemptStaff = t.checked; return mark(); }
    if (t.id === 'mpEnter') { d.enter = t.checked; const m = $('mpEnterMsg'); if (m) m.hidden = !t.checked; return mark(); } if (t.id === 'mpHide') { d.hide = t.checked; return mark(); } if (t.id === 'mpStop') { d.stop = t.checked; return mark(); } });
  const save = async () => { if (draft) finish(); const b = $('mpSave'); if (b) b.disabled = true; say('Saving…'); const m = mode;
    try { if (m === 'bounds') { const j = await call('/bounds', D.bounds); D.bounds = j.bounds; B.log = j.log || B.log; if (!D.bounds.presets.some(p => p.id === B.cur)) B.cur = D.bounds.active; }
      else if (m === 'safe') { const j = await call('/safezones', D.safe); takeSafe(j, true); }
      else if (m === 'cams') { takeCams(await call('/cameras', D.cams), true); }
      else { const f = D.fire; takeFire(await call('/staff/fires', { on: f.on, hide: f.hide, stop: f.stop, scope: f.scope, areas: f.areas }), true); }
      dirty[m] = false; if (mode === m) { drawSide(); draw(); say(D[m].on ? 'Saved. It’s on.' : 'Saved. It’s off, so nothing happens in game.', 'ok'); } }
    catch (x) { if (b) b.disabled = false; say(x.message, 'err'); } };

  // ── data from the server; while something is unsaved, only the live parts (players, calls, recent activity) update ──
  const off = j => { if (Array.isArray(j.off)) { img.setAttribute('x', -j.off[0]); img.setAttribute('y', -j.off[1]); } };
  const takeBounds = j => { off(j); B.players = j.players || []; B.log = j.log || []; B.connected = j.connected !== false;
    if (!dirty.bounds) { D.bounds = j.bounds; B.teams = j.teams || []; B.depts = j.depts || {}; if (!B.cur || !D.bounds.presets.some(p => p.id === B.cur)) B.cur = D.bounds.active; if (B.scope !== ALL && !B.teams.includes(B.scope)) B.scope = ALL; } };
  const takeSafe = (j, force) => { off(j); safeLog = j.log || []; if (!dirty.safe || force) D.safe = { on: j.on, zones: (j.zones || []).map(z => ({ ...z, pts: z.pts.map(q => q.slice()) })), enter: j.enter, enterMsg: j.enterMsg, kill: j.kill }; };
  const takeCams = (j, force) => { off(j); camLog = j.log || []; camAlpr = j.alpr !== false; if (!dirty.cams || force) D.cams = { on: j.on, range: j.range, list: (j.list || []).map(k => ({ ...k })) }; };
  const removeCam = i => { const k = D.cams.list[i]; if (!k || !confirm('Delete ' + k.name + '? Press Save to keep the change.')) return; D.cams.list.splice(i, 1); sel = -1; mark(); drawSide(); draw(); };
  const takeFire = (j, force) => { off(j); calls = j.calls || []; fireRecent = j.recent || []; if (!dirty.fire || force) D.fire = { on: j.on, hide: j.hide, stop: j.stop, scope: j.scope, command: j.command, areas: (j.areas || []).map(a => ({ ...a, pts: a.pts.map(q => q.slice()) })) }; };
  const load = async (first) => { const m = mode;
    try { if (m === 'fire' && !OV.premium) { errs.fire = 'Fire AOP comes with Premium: fire calls outside your AOP come off the board, and fires outside it are put out.'; }
      else { const j = await call({ bounds: '/bounds', safe: '/safezones', cams: '/cameras' }[m] || '/staff/fires'); ({ bounds: takeBounds, safe: takeSafe, cams: takeCams }[m] || takeFire)(j); errs[m] = '';
        if ((m === 'safe' || m === 'cams') && m !== 'bounds') call('/bounds').then(takeBounds).catch(() => {}); }   // who is where, from the same reading   // safe zones show who is where, from the same reading
      if (mode !== m) return; if (first || (!dirty[m] && !draft && !side.contains(document.activeElement))) drawSide();   // never redrawn under someone typing
      draw(); } catch (x) { errs[m] = x.message; if (mode === m && first) { drawSide(); draw(); } } };
  const setMode = m => { if (m === mode) return; flash = null; placing = false; draft = null; hover = null; sel = -1; mode = m; try { localStorage.setItem('ov.mapping', m); } catch (e) {} drawSide(); draw(); load(true); };
  box.querySelector('.mp-modes').addEventListener('click', e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); });

  // ── drawing, as in Boundaries. Drawing: a click adds a corner, holding and dragging draws the outline freehand. Otherwise a drag
  // moves the map, and a click picks an area. The middle button (or right button, or Space held down) always moves the map. ──
  $('mpDraw').addEventListener('click', () => { if (!can() || !ready()) return;
    if (mode === 'cams') { if (!placing && D.cams.list.length >= 60) return say('A server can have up to 60 cameras.', 'err'); placing = !placing; sel = -1; drawSide(); draw(); return; }
    if (draft) return finish(); if (M().items().length >= M().max) return say('That’s the most areas there can be here.', 'err'); draft = []; sel = -1; drawSide(); draw(); });
  $('mpUndo').addEventListener('click', () => { if (draft) { draft.pop(); draw(); } });
  $('mpDel').addEventListener('click', () => { if (sel >= 0) mode === 'cams' ? removeCam(sel) : removeArea(sel); });
  $('mpIn').addEventListener('click', () => zoom(.7)); $('mpOut').addEventListener('click', () => zoom(1 / .7)); $('mpFit').addEventListener('click', () => { vb = [0, 0, SIZE, SIZE]; setVB(); draw(); });
  document.addEventListener('keydown', e => { if (placing && e.key === 'Escape' && box.offsetParent) { placing = false; draw(); return; } if (!draft || !box.offsetParent || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'Escape') { draft = null; hover = null; draw(); } else if (e.key === 'Enter') { e.preventDefault(); finish(); } else if (e.key === 'Backspace') { e.preventDefault(); draft.pop(); draw(); } });
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
  svg.addEventListener('pointerdown', e => { if (!ready()) return; svg.setPointerCapture(e.pointerId); const t = e.target, P = toMap(e), edit = can();
    const pan = () => ({ kind: 'pan', x: e.clientX, y: e.clientY, vb: [...vb], moved: false, t });
    if (e.button || space) { if (e.button === 1) e.preventDefault(); down = { ...pan(), force: true }; return; }
    if (mode === 'cams') { if (edit && t.classList.contains('mp-cam')) { sel = +t.dataset.c; down = { kind: 'cam', i: sel, x: e.clientX, y: e.clientY, moved: false }; draw(); } else down = pan(); return; }
    if (edit && !draft && sel >= 0 && t.classList.contains('mp-pt')) down = { kind: 'pt', k: +t.dataset.k };
    else if (edit && !draft && sel >= 0 && t.classList.contains('mp-mid')) { const p = M().items()[sel].pts, k = +t.dataset.k; p.splice(k + 1, 0, P); down = { kind: 'pt', k: k + 1 }; mark(); draw(); }
    else if (edit && !draft && !t.closest('.mp-poly') && !t.closest('.mp-other') && !M().items().length) { draft = []; sel = -1; down = { kind: 'draw', x: e.clientX, y: e.clientY, moved: false, n: 0 }; draw(); }   // nothing drawn yet: just start drawing
    else if (draft) down = { kind: 'draw', x: e.clientX, y: e.clientY, moved: false, n: draft.length };
    else down = pan(); });
  svg.addEventListener('pointermove', e => { const P = toMap(e);
    if (down?.kind === 'pt') { M().items()[sel].pts[down.k] = P; mark(); draw(); return; }
    if (down?.kind === 'cam') { if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 4) return; down.moved = true; const k = D.cams.list[down.i]; k.x = P[0]; k.z = P[1]; mark(); draw(); return; }
    if (down?.kind === 'pan') { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!down.moved && Math.hypot(dx, dy) < 5) return; down.moved = true;
      const s = down.vb[2] / svg.clientWidth; vb = [down.vb[0] - dx * s, down.vb[1] - dy * s, vb[2], vb[3]]; setVB(); return; }
    if (down?.kind === 'draw') { if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) return;
      if (!down.moved) { down.moved = true; draft.push(toMap({ clientX: down.x, clientY: down.y })); }
      const last = draft[draft.length - 1]; if (Math.hypot(P[0] - last[0], P[1] - last[1]) > 6 * px()) { draft.push(P); hover = null; draw(); } return; }
    if (draft) { hover = P; draw(); } });
  svg.addEventListener('pointerup', e => { const d = down; down = null; if (!d) return; const P = toMap(e);
    if (d.kind === 'pt') return;
    if (d.kind === 'cam') { drawSide(); draw(); return; }
    if (mode === 'cams' && d.kind === 'pan') { if (d.moved || d.force) { draw(); return; } const cm = d.t.closest?.('.mp-cam'); if (cm) { sel = +cm.dataset.c; drawSide(); draw(); return; }
      if (placing && can()) { D.cams.list.push({ name: 'Camera ' + (D.cams.list.length + 1), x: P[0], z: P[1] }); sel = D.cams.list.length - 1; placing = false; mark(); drawSide(); draw();
        const inp = side.querySelector(`[data-i="${sel}"] input[type=text]`); if (inp) { inp.focus(); inp.select(); } return; }
      sel = -1; drawSide(); draw(); return; }
    if (d.kind === 'pan') { if (d.moved || d.force) { draw(); return; } const o = d.t.closest?.('.mp-other'); if (o) return M().others()[+o.dataset.o]?.pick();
      const hit = d.t.closest?.('.mp-poly'); if (hit) return choose(+hit.dataset.i); sel = -1; drawSide(); draw(); return; }
    if (d.moved) { const stroke = draft.splice(d.n); stroke.push(P); draft.push(...simplify(stroke, 2.5 * px()));   // a freehand stroke: keep its shape with fewer points
      if (draft.length > 190) draft = simplify(draft, 6 * px());
      if (draft.length >= 3 && Math.hypot(P[0] - draft[0][0], P[1] - draft[0][1]) < 18 * px()) { draft.pop(); return finish(); }   // ended where it started: close it
      draw(); return; }
    if (draft.length >= 3 && Math.hypot(P[0] - draft[0][0], P[1] - draft[0][1]) < 12 * px()) return finish(); if (draft.length < 200) draft.push(P); draw(); });
  svg.addEventListener('dblclick', e => { if (draft) { e.preventDefault(); draft.pop(); finish(); } });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, toMap(e)); }, { passive: false });

  drawSide();
  setInterval(() => { if (box.offsetParent !== null && !down && !document.hidden) load(false); }, 5000);
  document.getElementById('stTabs')?.addEventListener('click', e => { if (e.target.closest('[data-p="mapping"]')) setTimeout(() => { load(true); draw(); }, 30); });
  addEventListener('beforeunload', e => { if (dirty.bounds || dirty.safe || dirty.fire || dirty.cams) { e.preventDefault(); e.returnValue = ''; } });
})();
