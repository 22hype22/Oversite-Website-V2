// Fire AOP, in the CAD's Server Staff panel: draw areas on the map, tick the ones that are the AOP, and choose what happens to
// the fire department calls ER:LC makes outside it (taken off the fire board, fires put out in game). Talks to /staff/fires;
// points are ER:LC map coordinates, the same units the calls' positions come in.
(() => {
  const box = document.getElementById('stFires'), OV = window.OVERSITE; if (!box || !OV) return;
  const API = OV.api + '/staff/fires', SIZE = 5355, NS = 'http://www.w3.org/2000/svg';
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
.fa-empty{font-size:12.5px;color:var(--faint);padding:2px 0}
.fa-chk{display:flex;align-items:flex-start;gap:9px;font-size:13px;color:#E3E5E8;cursor:pointer;line-height:1.4}.fa-chk input{margin:2px 0 0;accent-color:#46D07C}.fa-chk small{display:block;font-size:11.5px;color:var(--faint)}
.fa-seg{display:flex;gap:6px;flex-wrap:wrap}.fa-seg button{font:inherit;font-size:12px;padding:6px 11px;border-radius:999px;border:1px solid var(--line);background:none;color:var(--mute);cursor:pointer}.fa-seg button[aria-pressed="true"]{color:#fff;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.18)}
.fa-act{display:flex;align-items:center;gap:10px;justify-content:flex-end}.fa-act .msg{flex:1;font-size:12px;color:var(--mute)}.fa-act .msg.err{color:#F3A0A0}.fa-act .msg.ok{color:#7FDCA4}
.fa-rec{display:grid;gap:2px}.fa-rec div{display:grid;grid-template-columns:44px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:12.5px;color:#E3E5E8}.fa-rec div:first-child{border-top:0}
.fa-rec time{font-size:11.5px;color:var(--faint);padding-top:1px}.fa-rec small{display:block;color:var(--mute);font-size:11.5px;margin-top:1px}.fa-rec .bad{color:#F3A0A0}
.fa-map{position:relative;min-height:0;border-radius:12px;overflow:hidden;border:1px solid var(--line);background:#3E6973;touch-action:none}.fa-map svg{position:absolute;inset:0;width:100%;height:100%;cursor:grab;display:block}.fa-map.drawing svg{cursor:crosshair}
.fa-zoom{position:absolute;right:10px;top:10px;display:grid;gap:4px}.fa-zoom button{width:32px;height:32px;border-radius:9px;border:1px solid rgba(255,255,255,.14);background:rgba(14,15,17,.82);color:#ECEDEF;font-size:15px;cursor:pointer}
.fa-hint{position:absolute;left:10px;right:56px;bottom:10px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:rgba(14,15,17,.86);border:1px solid rgba(255,255,255,.1);font-size:12px;color:#E3E5E8}.fa-hint[hidden]{display:none}
.fa-key{position:absolute;left:10px;top:10px;display:flex;gap:10px;flex-wrap:wrap;padding:6px 9px;border-radius:9px;background:rgba(14,15,17,.82);font-size:11px;color:#C9CDD3}.fa-key span{display:flex;align-items:center;gap:5px}.fa-key i{width:9px;height:9px;border-radius:50%;display:inline-block}
@media (max-width:900px){.fa{grid-template-columns:minmax(0,1fr);height:auto}.fa-map{height:380px;order:-1}.fa-side{overflow:visible}}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p = '', b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };

  box.innerHTML = `<div class="fa"><div class="fa-side">
    <div class="fa-head"><div><h2>Fire AOP</h2><small>Keep fires and fire calls inside your AOP</small></div><label class="fa-sw" title="Fire AOP on or off"><input type="checkbox" id="faOn" aria-label="Fire AOP on"><i></i></label></div>
    <p class="fa-note">Draw your areas on the map once, then tick the ones that are today's AOP. Fire calls ER:LC makes outside it are handled as you choose below.</p>
    <div class="fa-sec"><b>Areas</b><div id="faAreas"></div><div><button type="button" class="st-btn" id="faDraw">Draw an area</button></div></div>
    <div class="fa-sec"><b>Outside the AOP</b>
      <label class="fa-chk"><input type="checkbox" id="faHide"><span>Take the call off the fire board<small>Firefighters only see calls inside the AOP</small></span></label>
      <label class="fa-chk"><input type="checkbox" id="faStop"><span>Put the fire out in game<small>Runs <code id="faCmd">:stopfire</code>, which puts out every fire, so it waits while one burns inside the AOP</small></span></label>
      <div class="fa-seg" id="faScope" role="group" aria-label="Which calls"><button type="button" data-s="fires">Fires and alarms</button><button type="button" data-s="all">Every fire department call</button></div></div>
    <div class="fa-act"><span class="msg" id="faMsg" role="status"></span><button type="button" class="st-go" id="faSave" disabled>Save</button></div>
    <div class="fa-sec"><b>Lately</b><div class="fa-rec" id="faRecent"></div><div><button type="button" class="st-btn" id="faOut">Put out every fire now</button></div></div>
  </div><div class="fa-map" id="faMap"><svg id="faSvg" preserveAspectRatio="xMidYMid slice" aria-label="Map. Drag to move around, scroll to zoom."></svg>
    <div class="fa-key" aria-hidden="true"><span><i style="background:#46D07C"></i>AOP</span><span><i style="background:#FF8A3D"></i>Fire</span><span><i style="background:#E9EAEC"></i>Other call</span></div>
    <div class="fa-zoom"><button type="button" id="faIn" aria-label="Zoom in">+</button><button type="button" id="faOutZ" aria-label="Zoom out">−</button><button type="button" id="faFit" aria-label="Show the whole map">⤢</button></div>
    <div class="fa-hint" id="faHint" hidden></div></div></div>`;
  const $ = id => document.getElementById(id), svg = $('faSvg'), msg = $('faMsg');
  let F = null, calls = [], sel = -1, draft = null, dirty = false, vb = [0, 0, SIZE, SIZE], loaded = false;
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  el('image', { href: 'liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg);
  const gA = el('g', {}, svg), gD = el('g', {}, svg), gC = el('g', { 'pointer-events': 'none' }, svg);
  const setVB = () => svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); setVB();
  const px = () => vb[2] / (svg.clientWidth || 600);
  const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; };
  const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE * 1.1, Math.max(250, vb[2] * f));
    vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; setVB(); drawMap(); };
  const say = (t, k = '') => { msg.textContent = t || ''; msg.className = 'msg ' + k; };
  const mark = () => { dirty = true; $('faSave').disabled = false; say('Not saved yet'); };

  const drawMap = () => { if (!F) return; gA.textContent = ''; gD.textContent = ''; gC.textContent = ''; const r = px();
    F.areas.forEach((a, i) => { const p = el('polygon', { points: a.pts.map(q => q.join(',')).join(' '), 'vector-effect': 'non-scaling-stroke', fill: a.on ? '#46D07C' : '#E9EAEC', 'fill-opacity': a.on ? .18 : .06,
        stroke: i === sel ? '#FFFFFF' : a.on ? '#46D07C' : '#E9EAEC', 'stroke-width': i === sel ? 3 : 2, 'stroke-dasharray': a.on ? '' : '7 6', style: draft ? 'pointer-events:none' : 'cursor:pointer' }, gA);
      p.addEventListener('click', e => { if (moved) return; e.stopPropagation(); sel = i; drawList(); drawMap(); });
      const [cx, cy] = a.pts.reduce((s, q) => [s[0] + q[0] / a.pts.length, s[1] + q[1] / a.pts.length], [0, 0]);
      const t = el('text', { x: cx, y: cy, 'text-anchor': 'middle', 'dominant-baseline': 'middle', fill: '#fff', 'font-size': 13 * r, 'font-weight': 600, 'paint-order': 'stroke', stroke: 'rgba(0,0,0,.65)', 'stroke-width': 3 * r, 'pointer-events': 'none' }, gA); t.textContent = a.name; });
    if (draft) { if (draft.length > 1) el('polyline', { points: draft.map(q => q.join(',')).join(' '), fill: 'none', stroke: '#fff', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, gD);
      draft.forEach((q, i) => el('circle', { cx: q[0], cy: q[1], r: (i === 0 && draft.length >= 3 ? 8 : 5) * r, fill: i === 0 ? '#46D07C' : '#fff', stroke: '#0B0C0E', 'stroke-width': 1.5 * r }, gD)); }
    for (const k of calls) { const fire = /fire/i.test(k.what), c = el('circle', { cx: k.x, cy: k.z, r: 7 * r, fill: fire ? '#FF8A3D' : '#E9EAEC', stroke: k.in === false ? '#E24B4B' : '#0B0C0E', 'stroke-width': (k.in === false ? 3 : 1.5) * r, opacity: k.in === false ? .75 : 1 }, gC);
      const t = el('title', {}, c); t.textContent = k.what + (k.where ? ', ' + k.where : '') + (k.in === false ? ' (outside the AOP)' : ''); } };
  const drawList = () => { $('faAreas').innerHTML = F.areas.length ? F.areas.map((a, i) => `<div class="fa-area${i === sel ? ' sel' : ''}" data-i="${i}"><label class="fa-aop" title="Part of the AOP"><input type="checkbox" data-k="on"${a.on ? ' checked' : ''}>AOP</label>
      <input type="text" data-k="name" maxlength="32" value="${esc(a.name)}" aria-label="Area name"><button type="button" class="fa-x" data-k="rm" aria-label="Delete ${esc(a.name)}">×</button></div>`).join('')
      : '<div class="fa-empty">No areas yet. Draw one around your AOP, like Springfield.</div>'; };
  const drawOpts = () => { $('faOn').checked = F.on; $('faHide').checked = F.hide; $('faStop').checked = F.stop; $('faScope').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.s === F.scope))); };
  const drawRecent = list => { const S = { sent: 'Put out in game', refused: 'ER:LC refused to put it out', kept: 'Left burning: a fire is burning inside the AOP', sending: 'Putting it out…' };
    $('faRecent').innerHTML = list && list.length ? list.slice(0, 8).map(x => `<div><time>${new Date(x.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</time><span>${esc(x.what)}${x.where ? ' · ' + esc(x.where) : ''}<small${x.stop === 'refused' ? ' class="bad"' : ''}>${[x.hidden ? 'Taken off the fire board' : '', S[x.stop] || ''].filter(Boolean).join(' · ')}${x.msg ? ': ' + esc(x.msg) : ''}</small></span></div>`).join('')
      : '<p class="fa-empty" style="margin:0">Nothing handled yet. Calls outside the AOP show here.</p>'; };
  const hint = () => { const h = $('faHint'); $('faMap').classList.toggle('drawing', !!draft); h.hidden = !draft; if (!draft) return;
    h.innerHTML = `<span style="flex:1">${draft.length < 3 ? 'Click the map to add corners around the area.' : 'Click the first corner, or Finish, to close it.'}</span>${draft.length ? '<button type="button" class="st-btn" data-h="undo">Undo corner</button>' : ''}${draft.length >= 3 ? '<button type="button" class="st-go" data-h="done" style="padding:6px 13px;font-size:12px">Finish</button>' : ''}<button type="button" class="st-btn" data-h="cancel">Cancel</button>`; };
  const finish = () => { if (!draft || draft.length < 3) return; F.areas.push({ name: 'Area ' + (F.areas.length + 1), on: true, pts: draft }); sel = F.areas.length - 1; draft = null; hint(); drawList(); drawMap(); mark();
    const inp = $('faAreas').querySelector(`[data-i="${sel}"] input[type=text]`); if (inp) { inp.focus(); inp.select(); } };

  // ── map: drag to move, wheel to zoom, click to add a corner while drawing ──
  let drag = null, moved = false;
  svg.addEventListener('pointerdown', e => { if (e.button !== 0) return; drag = { x: e.clientX, y: e.clientY, vb: vb.slice(), id: e.pointerId }; moved = false; });
  svg.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!moved && Math.hypot(dx, dy) < 5) return; if (!moved) svg.setPointerCapture(drag.id); moved = true;
    const k = drag.vb[2] / (svg.clientWidth || 600); vb = [drag.vb[0] - dx * k, drag.vb[1] - dy * k, drag.vb[2], drag.vb[3]]; setVB(); });
  svg.addEventListener('pointerup', e => { const was = drag; drag = null; if (!was || moved || !draft) return; const q = toMap(e);
    if (draft.length >= 3 && Math.hypot(q[0] - draft[0][0], q[1] - draft[0][1]) < 12 * px()) return finish();
    if (draft.length < 200) draft.push(q); hint(); drawMap(); });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, toMap(e)); }, { passive: false });
  $('faIn').addEventListener('click', () => zoom(1 / 1.4)); $('faOutZ').addEventListener('click', () => zoom(1.4)); $('faFit').addEventListener('click', () => { vb = [0, 0, SIZE, SIZE]; setVB(); drawMap(); });
  $('faHint').addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (!b) return; if (b.dataset.h === 'undo') draft.pop(); if (b.dataset.h === 'cancel') draft = null; if (b.dataset.h === 'done') return finish(); hint(); drawMap(); });
  addEventListener('keydown', e => { if (!draft || box.offsetParent === null) return; if (e.key === 'Escape') { draft = null; hint(); drawMap(); } else if (e.key === 'Enter') finish(); });
  $('faDraw').addEventListener('click', () => { if (F.areas.length >= 12) return say('A server can have up to 12 areas.', 'err'); draft = []; sel = -1; hint(); drawList(); drawMap(); });

  // ── the side: areas, options, saving ──
  $('faAreas').addEventListener('click', e => { const row = e.target.closest('[data-i]'); if (!row) return; const i = +row.dataset.i;
    if (e.target.closest('[data-k="rm"]')) { F.areas.splice(i, 1); sel = -1; drawList(); drawMap(); return mark(); }
    if (sel !== i) { sel = i; const a = F.areas[i], xs = a.pts.map(q => q[0]), ys = a.pts.map(q => q[1]), w = Math.max(400, Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 1.4;
      vb = [(Math.max(...xs) + Math.min(...xs)) / 2 - w / 2, (Math.max(...ys) + Math.min(...ys)) / 2 - w / 2, w, w]; setVB(); drawMap(); row.parentElement.querySelectorAll('.fa-area').forEach(x => x.classList.toggle('sel', x === row)); } });
  $('faAreas').addEventListener('input', e => { const row = e.target.closest('[data-i]'), k = e.target.dataset.k; if (!row || !k) return; const a = F.areas[+row.dataset.i];
    if (k === 'on') a.on = e.target.checked; if (k === 'name') a.name = e.target.value; drawMap(); mark(); });
  $('faOn').addEventListener('change', e => { F.on = e.target.checked; mark(); });
  $('faHide').addEventListener('change', e => { F.hide = e.target.checked; mark(); });
  $('faStop').addEventListener('change', e => { F.stop = e.target.checked; mark(); });
  $('faScope').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; F.scope = b.dataset.s; drawOpts(); mark(); });
  $('faSave').addEventListener('click', async () => { $('faSave').disabled = true; say('Saving…');
    try { const j = await call('', { on: F.on, hide: F.hide, stop: F.stop, scope: F.scope, areas: F.areas }); dirty = false; take(j); say(F.on ? 'Saved. Fire AOP is on.' : 'Saved.', 'ok'); } catch (x) { $('faSave').disabled = false; say(x.message, 'err'); } });
  $('faOut').addEventListener('click', async () => { const b = $('faOut'); b.disabled = true; try { take(await call('/out', {})); say('Every fire was put out.', 'ok'); } catch (x) { say(x.message, 'err'); } b.disabled = false; });

  // fresh data every few seconds while the tab is open; unsaved changes are never overwritten
  const take = j => { calls = j.calls || []; drawRecent(j.recent); if (j.command) $('faCmd').textContent = j.command;
    if (!dirty) { F = { on: j.on, hide: j.hide, stop: j.stop, scope: j.scope, areas: (j.areas || []).map(a => ({ ...a, pts: a.pts.map(q => q.slice()) })) }; drawOpts(); if (!draft) drawList(); } drawMap(); };
  const load = () => call().then(take).catch(x => { if (!loaded) box.innerHTML = '<div class="st-gate" style="height:100%"><div><b>Fire AOP</b>' + esc(x.message) + '</div></div>'; }).finally(() => { loaded = true; });
  setInterval(() => { if (box.offsetParent !== null && !document.hidden) load(); }, 5000);
  document.getElementById('stTabs')?.addEventListener('click', e => { if (e.target.closest('[data-p="fires"]')) setTimeout(() => { load(); drawMap(); }, 30); });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
})();
