// Location notes (app/premises.mjs): notes pinned to places for whoever responds there. Fire pre-incident plans mark exits, hydrants,
// the sprinkler connection, staging, the key box and shutoffs; police premise notes say what to know before going in. One window,
// opened from the map controls on Dispatch (and Locations in every MDT): the map with every note you may see, the list, and an editor where you click the map to
// place the note and its points. When a 911 call comes in inside a note's circle, the units get an alert that opens it.
(() => { const OV = window.OVERSITE; if (!OV || !OV.api || (OV.features || {}).premises === false) return;
  const API = OV.api + '/premises', SIZE = 5355, G2M = 2000 / 5355, NS = 'http://www.w3.org/2000/svg';
  const DC = { fd: '#E24B4B', pd: '#4C8DFF', all: '#B98CFF' }, DN = { fd: 'Fire', pd: 'Police', all: 'Everyone' };
  const PT = { exit: ['EX', '#46D07C'], entry: ['EN', '#46D07C'], hydrant: ['H', '#E24B4B'], fdc: ['FDC', '#E24B4B'], staging: ['P', '#4C8DFF'], knox: ['K', '#E9C24C'], shutoff: ['U', '#F2994A'], hazard: ['!', '#F2994A'], stairs: ['S', '#C9CDD3'], camera: ['C', '#C9CDD3'], note: ['N', '#C9CDD3'] };
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'Something went wrong (' + r.status + ')'), { status: r.status }); return j; };
  const css = document.createElement('style'); css.textContent = `#preDlg{width:min(1120px,calc(100vw - 24px));height:min(780px,calc(100dvh - 24px));max-width:none;max-height:none;padding:0;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:#141518;color:#E9EAEC;box-shadow:0 30px 70px rgba(0,0,0,.6);overflow:hidden}
#preDlg::backdrop{background:rgba(0,0,0,.6)}#preDlg .wt{display:grid;grid-template-columns:minmax(0,370px) minmax(0,1fr);height:100%;min-height:0}
#preDlg .wt-side{display:flex;flex-direction:column;gap:12px;padding:18px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.08);min-height:0}
#preDlg .wt-top{display:flex;align-items:center;gap:8px}#preDlg .wt-top h2{flex:1;margin:0;font-size:16px;font-weight:600}
#preDlg .wt-x{width:32px;height:32px;flex:none;border-radius:9px;border:0;background:none;color:#9A9EA6;font-size:20px;cursor:pointer}#preDlg .wt-x:hover{background:rgba(255,255,255,.06);color:#fff}
#preDlg p.sub{margin:0;font-size:12.5px;line-height:1.5;color:#9A9EA6}#preDlg h3{margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#62666D}
#preDlg input,#preDlg select,#preDlg textarea{font:inherit;font-size:13px;color:#ECEDEF;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:8px 10px;outline:none;min-width:0;width:100%;box-sizing:border-box;color-scheme:dark}
#preDlg textarea{resize:vertical;min-height:90px;line-height:1.45}#preDlg input:focus,#preDlg select:focus,#preDlg textarea:focus{border-color:rgba(255,255,255,.32)}#preDlg label{display:grid;gap:5px;font-size:12px;color:#9A9EA6}
#preDlg .two{display:grid;grid-template-columns:1fr 1fr;gap:8px}
#preDlg .go{font:inherit;font-size:12.5px;font-weight:600;padding:8px 15px;border-radius:999px;border:0;background:#ECEDEF;color:#0B0B0C;cursor:pointer;white-space:nowrap}
#preDlg .bt{font:inherit;font-size:12.5px;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:none;color:#E9EAEC;cursor:pointer;white-space:nowrap}#preDlg .bt[aria-pressed="true"]{background:#ECEDEF;color:#0B0B0C;border-color:#ECEDEF}#preDlg .bt.bad{color:#F3A0A0}
#preDlg button:disabled{opacity:.45;cursor:default}#preDlg .acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#preDlg .msg{flex:1;font-size:12px;color:#9A9EA6;min-height:16px}#preDlg .msg.err{color:#F3A0A0}#preDlg .msg.ok{color:#7FDCA4}
#preDlg .seg{display:flex;gap:6px;flex-wrap:wrap}
#preDlg .it{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);font-size:12.5px;cursor:pointer;text-align:left;color:inherit;font-family:inherit;width:100%}
#preDlg .it:hover{background:rgba(255,255,255,.04)}#preDlg .it b{font-weight:600;color:#ECEDEF;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#preDlg .it small{color:#9A9EA6;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#preDlg .it i{width:9px;height:9px;border-radius:50%;display:block}#preDlg .list{display:grid;gap:6px}#preDlg .empty{font-size:12.5px;color:#62666D;margin:0}
#preDlg .tag{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);color:#C9CDD3;white-space:nowrap}
#preDlg .body{font-size:13px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;color:#D6D8DC}
#preDlg .pt{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:8px;align-items:center;font-size:12.5px;padding:4px 0}#preDlg .pt .g{min-width:22px;height:22px;padding:0 4px;border-radius:999px;display:grid;place-items:center;font-size:10px;font-weight:700;color:#0B0B0C;box-sizing:border-box}
#preDlg .pt input{padding:5px 8px}
#preDlg .wt-map{position:relative;min-height:0;background:#3E6972}#preDlg svg{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;user-select:none}#preDlg svg.placing{cursor:crosshair}
#preDlg .zm{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.14);background:rgba(13,20,22,.88)}
#preDlg .zm button{width:34px;height:34px;border:0;background:none;color:#ECEDEF;font:500 17px/1 inherit;cursor:pointer}#preDlg .zm button+button{border-top:1px solid rgba(255,255,255,.08)}
#preDlg .hint{position:absolute;left:12px;right:60px;bottom:12px;padding:8px 10px;border-radius:10px;background:rgba(13,20,22,.9);font-size:12px;color:#C9CDD3}#preDlg .hint:empty{display:none}
@media (max-width:820px){#preDlg .wt{grid-template-columns:minmax(0,1fr);grid-template-rows:42% minmax(0,1fr)}#preDlg .wt-map{order:-1}#preDlg .wt-side{border-right:0;border-top:1px solid rgba(255,255,255,.08)}}`; document.head.appendChild(css);
  const dlg = document.createElement('dialog'); dlg.id = 'preDlg'; dlg.setAttribute('aria-label', 'Location notes'); document.body.appendChild(dlg);
  dlg.innerHTML = `<div class="wt"><div class="wt-side" id="preSide"></div><div class="wt-map"><svg id="preSvg" preserveAspectRatio="xMidYMid slice"></svg>
    <div class="zm"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">&minus;</button><button type="button" data-z="fit" aria-label="Show the whole map">&#x2922;</button></div>
    <div class="hint" id="preHint"></div></div></div>`;
  const $ = id => dlg.querySelector('#' + id), svg = $('preSvg'), side = $('preSide');
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const img = el('image', { href: '/liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg), gN = el('g', {}, svg), gP = el('g', {}, svg);
  let vb = [0, 0, SIZE, SIZE];
  const setVB = () => { const w = Math.min(SIZE, vb[2]), cw = svg.clientWidth || 1, ch = svg.clientHeight || 1;   // never past the edge of the map (cropped to the panel's shape)
    const sx = w * (1 - Math.min(1, cw / ch)) / 2, sy = w * (1 - Math.min(1, ch / cw)) / 2, lim = (v, s) => Math.max(-s, Math.min(SIZE - w + s, v));
    vb = [lim(vb[0], sx), lim(vb[1], sy), w, w]; svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); }; setVB();
  const px = () => vb[2] / (svg.clientWidth || 600);
  const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; };
  const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE, Math.max(160, vb[2] * f)); vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; setVB(); draw(); };
  const fitTo = (x, z, w) => { if (x == null) vb = [0, 0, SIZE, SIZE]; else vb = [x - w / 2, z - w / 2, w, w]; setVB(); draw(); };

  // D: { notes, may, kinds, points, radii }. sel: the note shown. ed: the note being made or changed. placing: 'centre' | a point type | null
  let D = null, sel = 0, ed = null, placing = null, filter = '', q = '', flash = null;
  const say = (t, k = '') => { flash = { t, k }; const m = $('preMsg'); if (m) { m.textContent = t; m.className = 'msg ' + k; } };
  const cur = () => D?.notes.find(n => n.id === sel);
  const shown = () => (D?.notes || []).filter(n => (!filter || n.dept === filter) && (!q || (n.title + ' ' + n.address + ' ' + n.body).toLowerCase().includes(q)));

  // ── the map: every note as a circle and pin; the one open (or being edited) with its points ──
  const pin = (x, z, color, big, data) => { const r = (big ? 8 : 6) * px(); return el('circle', { cx: x, cy: z, r, fill: color, stroke: '#0d1416', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', ...data }, gN); };
  const label = (x, y, t, parent, size = 12) => { el('text', { x, y, 'text-anchor': 'middle', 'font-size': size * px(), 'font-weight': 600, fill: '#fff', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * px(), 'pointer-events': 'none' }, parent).textContent = t; };
  const draw = () => { gN.textContent = ''; gP.textContent = ''; if (!D) return; const p = px();
    for (const n of shown()) { if (ed && ed.id === n.id) continue; const c = DC[n.dept], on = n.id === sel && !ed;
      el('circle', { cx: n.x, cy: n.z, r: n.radius, fill: c, 'fill-opacity': on ? .18 : .1, stroke: c, 'stroke-opacity': .8, 'stroke-width': on ? 2.5 : 1.5, 'stroke-dasharray': on ? '' : '6 4', 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, gN);
      pin(n.x, n.z, c, on, { 'data-n': n.id, style: 'cursor:pointer' }); label(n.x, n.z - Math.max(n.radius, 9 * p) - 5 * p, n.title, gN); }
    const show = ed || (sel && cur()); if (show) { const c = DC[show.dept] || DC.all;
      if (ed && Number.isFinite(ed.x)) { el('circle', { cx: ed.x, cy: ed.z, r: ed.radius, fill: c, 'fill-opacity': .16, stroke: c, 'stroke-width': 2.5, 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, gN); pin(ed.x, ed.z, c, true, { 'data-centre': 1, style: 'cursor:move' }); }
      (show.points || []).forEach((q2, i) => { const [g, col] = PT[q2.type] || PT.note, r = 9 * p;
        el('circle', { cx: q2.x, cy: q2.z, r, fill: col, stroke: '#0d1416', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke', ...(ed ? { 'data-p': i, style: 'cursor:move' } : {}) }, gP);
        el('text', { x: q2.x, y: q2.z + 3.5 * p, 'text-anchor': 'middle', 'font-size': (g.length > 2 ? 7 : 9.5) * p, 'font-weight': 800, fill: '#0B0B0C', 'pointer-events': 'none' }, gP).textContent = g;
        if (q2.label) label(q2.x, q2.z - 13 * p, q2.label, gP, 11); }); }
    svg.classList.toggle('placing', !!placing);
    $('preHint').textContent = placing === 'centre' ? 'Click the map where the place is. Esc cancels.' : placing ? `Click the map where the ${(D.points[placing] || 'point').toLowerCase()} is. Esc cancels.` : ed ? 'Drag the pin or a point to move it.' : ''; };

  // dragging the centre or a point moves it (while editing); anything else pans; a click picks a note or places what's being placed
  let drag = null;
  svg.addEventListener('pointerdown', e => { if (e.button !== 0 && e.button !== 1) return; const t = e.target;
    drag = ed && t.dataset.centre ? { what: 'c' } : ed && t.dataset.p != null ? { what: 'p', i: +t.dataset.p } : { pan: [e.clientX, e.clientY, vb[0], vb[1]], at: toMap(e), n: t.dataset.n, moved: false };
    svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => { if (!drag) return; if (drag.pan) { const dx = e.clientX - drag.pan[0], dy = e.clientY - drag.pan[1]; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) { vb[0] = drag.pan[2] - dx * px(); vb[1] = drag.pan[3] - dy * px(); setVB(); } return; }
    const m = toMap(e); if (drag.what === 'c') { const dx = m[0] - ed.x, dz = m[1] - ed.z; ed.x = m[0]; ed.z = m[1]; ed.points.forEach(q2 => { q2.x += dx; q2.z += dz; }); } else { ed.points[drag.i].x = m[0]; ed.points[drag.i].z = m[1]; } draw(); });
  svg.addEventListener('pointerup', () => { const d = drag; drag = null; if (!d || !d.pan || d.moved) return;
    if (placing && ed) { if (placing === 'centre') { ed.x = d.at[0]; ed.z = d.at[1]; } else ed.points.push({ type: placing, x: d.at[0], z: d.at[1], label: '' }); placing = null; drawSide(); draw(); return; }
    if (d.n) { sel = +d.n; flash = null; drawSide(); draw(); } });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, toMap(e)); }, { passive: false });
  dlg.addEventListener('keydown', e => { if (e.key === 'Escape' && placing) { e.preventDefault(); placing = null; drawSide(); draw(); } });

  // ── the side panel ──
  const deptOpts = v => D.may.map(d => `<option value="${d}"${d === v ? ' selected' : ''}>${DN[d]}</option>`).join('');
  const row = n => `<button type="button" class="it" data-n="${n.id}"><i style="background:${DC[n.dept]}"></i><div><b>${esc(n.title)}</b><small>${esc([D.kinds[n.kind], n.address, n.points.length ? n.points.length + ' marked' : ''].filter(Boolean).join(' · '))}</small></div><span class="tag">${DN[n.dept]}</span></button>`;
  const overview = () => { const L = shown(), n = cur(), deps = [...new Set(D.notes.map(x => x.dept))];
    return `<p class="sub">Notes pinned to places, for whoever responds there: fire pre-incident plans (exits, hydrants, staging) and police premise notes. When a 911 call comes in inside a note's circle, the units get it as an alert.</p>
      <div class="acts"><button type="button" class="go" data-act="new">New note</button><span class="msg" id="preMsg" role="status"></span></div>
      ${n ? `<div style="display:grid;gap:8px;padding:12px;border-radius:12px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08)"><div class="acts"><b style="flex:1;font-size:15px">${esc(n.title)}</b><button type="button" class="wt-x" data-act="unsel" aria-label="Close">&times;</button></div>
        <div class="acts"><span class="tag" style="border-color:${DC[n.dept]};color:#fff">${DN[n.dept]}</span><span class="tag">${esc(D.kinds[n.kind])}</span>${n.address ? `<span style="font-size:12.5px;color:#9A9EA6">${esc(n.address)}</span>` : ''}</div>
        ${n.body ? `<div class="body">${esc(n.body)}</div>` : ''}${n.points.length ? `<div>${n.points.map(q2 => `<div class="pt"><span class="g" style="background:${(PT[q2.type] || PT.note)[1]}">${(PT[q2.type] || PT.note)[0]}</span><span>${esc(D.points[q2.type] || q2.type)}${q2.label ? ': ' + esc(q2.label) : ''}</span><span></span></div>`).join('')}</div>` : ''}
        <small style="color:#62666D;font-size:11.5px">By ${esc(n.by || 'someone')}${n.updated_by ? ', changed by ' + esc(n.updated_by) : ''} · ${new Date(n.updated).toLocaleDateString()}</small>
        ${D.may.includes(n.dept) ? '<div class="acts"><button type="button" class="bt" data-act="edit">Edit</button><button type="button" class="bt bad" data-act="del">Delete</button></div>' : ''}</div>` : ''}
      <input id="preQ" placeholder="Search notes" value="${esc(q)}" autocomplete="off">
      ${deps.length > 1 ? `<div class="seg"><button type="button" class="bt" data-f="" aria-pressed="${!filter}">All</button>${deps.map(d => `<button type="button" class="bt" data-f="${d}" aria-pressed="${filter === d}">${DN[d]}</button>`).join('')}</div>` : ''}
      <div class="list" id="preList">${L.length ? L.map(row).join('') : `<p class="empty">${D.notes.length ? 'No note matches that.' : 'No location notes yet. Press New note, then click the map.'}</p>`}</div>`; };
  const editor = () => `<h3>${ed.id ? 'Change the note' : 'New location note'}</h3>
    <label>Name<input id="preTitle" maxlength="60" placeholder="Liberty County Bank" value="${esc(ed.title)}"></label>
    <label>Address or postal<input id="preAddr" maxlength="80" placeholder="Postal 221, Main Street" value="${esc(ed.address)}"></label>
    <div class="two"><label>For<select id="preDept">${deptOpts(ed.dept)}</select></label><label>Type<select id="preKind">${Object.entries(D.kinds).map(([k, t]) => `<option value="${k}"${k === ed.kind ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label></div>
    <label>What to know<textarea id="preBody" maxlength="3000" placeholder="Two floors, vault at the back. Alarm panel by the front door. Sprinklers on both floors.">${esc(ed.body)}</textarea></label>
    <h3>On the map</h3><div class="acts"><button type="button" class="bt" data-act="centre" aria-pressed="${placing === 'centre'}">${Number.isFinite(ed.x) ? 'Move the pin' : 'Place it on the map'}</button></div>
    <div class="seg" role="group" aria-label="Circle size">${Object.entries(D.radii).map(([k, r]) => `<button type="button" class="bt" data-rad="${r}" aria-pressed="${ed.radius === r}">${k[0].toUpperCase() + k.slice(1)} area</button>`).join('')}</div>
    <p class="sub">A 911 call inside the circle brings this note up for the units.</p>
    <h3>Points</h3><div>${ed.points.map((q2, i) => `<div class="pt"><span class="g" style="background:${(PT[q2.type] || PT.note)[1]}">${(PT[q2.type] || PT.note)[0]}</span><input data-plabel="${i}" maxlength="60" placeholder="${esc(D.points[q2.type])}" value="${esc(q2.label)}"><button type="button" class="wt-x" data-prm="${i}" aria-label="Remove">&times;</button></div>`).join('') || '<p class="empty">Exits, hydrants, where to park… Pick one and click the map.</p>'}</div>
    <div class="two"><select id="prePt">${Object.entries(D.points).map(([k, t]) => `<option value="${k}">${esc(t)}</option>`).join('')}</select><button type="button" class="bt" data-act="point" aria-pressed="${!!placing && placing !== 'centre'}"${Number.isFinite(ed.x) ? '' : ' disabled'}>Add on the map</button></div>
    <div class="acts" style="justify-content:flex-end"><span class="msg" id="preMsg" role="status"></span><button type="button" class="bt" data-act="cancel">Cancel</button><button type="button" class="go" data-act="save">Save</button></div>`;
  const drawSide = () => { side.innerHTML = `<div class="wt-top"><h2>Location notes</h2><button type="button" class="wt-x" data-act="close" aria-label="Close">&times;</button></div>${ed ? editor() : overview()}`;
    if (flash) { const m = $('preMsg'); if (m) { m.textContent = flash.t; m.className = 'msg ' + flash.k; } } };

  const take = j => { D = j; if (Array.isArray(j.off)) { img.setAttribute('x', -j.off[0]); img.setAttribute('y', -j.off[1]); } if (sel && !cur()) sel = 0; watchCalls(); };
  const load = async () => { try { take(await call('')); return true; } catch (x) { side.innerHTML = `<div class="wt-top"><h2>Location notes</h2><button type="button" class="wt-x" data-act="close" aria-label="Close">&times;</button></div><p class="sub">${esc(x.message)}</p>`; return false; } };
  window.ovPremises = async id => { ed = null; placing = null; flash = null; if (!dlg.open) dlg.showModal(); side.innerHTML = '<p class="sub">Loading…</p>'; if (!await load()) return;
    sel = id && D.notes.some(n => n.id === id) ? id : 0; drawSide(); const n = cur(); n ? fitTo(n.x, n.z, Math.max(500, n.radius * 6)) : fitTo(); };
  dlg.addEventListener('close', () => { ed = null; placing = null; });
  dlg.addEventListener('input', e => { const t = e.target; if (t.id === 'preQ') { q = t.value.trim().toLowerCase(); const l = $('preList'); if (l) { const L = shown(); l.innerHTML = L.length ? L.map(row).join('') : '<p class="empty">No note matches that.</p>'; } draw(); return; }
    if (!ed) return; if (t.id === 'preTitle') ed.title = t.value; if (t.id === 'preAddr') ed.address = t.value; if (t.id === 'preBody') ed.body = t.value; if (t.id === 'preKind') ed.kind = t.value;
    if (t.id === 'preDept') { ed.dept = t.value; draw(); } if (t.dataset.plabel) { ed.points[+t.dataset.plabel].label = t.value; draw(); } });
  dlg.addEventListener('change', e => { if (ed && (e.target.id === 'preDept' || e.target.id === 'preKind')) { ed[e.target.id === 'preDept' ? 'dept' : 'kind'] = e.target.value; draw(); } });
  dlg.addEventListener('click', async e => { const t = e.target.closest('button'); if (!t) { if (e.target === dlg) dlg.close(); return; } const a = t.dataset.act;
    if (a === 'close') return dlg.close();
    if (t.dataset.z) return t.dataset.z === 'fit' ? fitTo() : zoom(t.dataset.z === 'in' ? 1 / 1.4 : 1.4);
    if (t.dataset.n) { sel = +t.dataset.n; flash = null; drawSide(); const n = cur(); if (n) fitTo(n.x, n.z, Math.max(500, n.radius * 6)); return; }
    if (t.dataset.f != null) { filter = t.dataset.f; drawSide(); draw(); return; }
    if (a === 'unsel') { sel = 0; drawSide(); draw(); return; }
    if (a === 'new') { ed = { dept: D.may.includes('fd') ? 'fd' : D.may[0], kind: 'preplan', title: '', address: '', body: '', x: NaN, z: NaN, radius: D.radii.medium, points: [] }; placing = 'centre'; flash = null; drawSide(); draw(); $('preTitle')?.focus(); return; }
    if (a === 'edit') { const n = cur(); ed = { ...n, points: n.points.map(q2 => ({ ...q2 })) }; flash = null; drawSide(); draw(); return; }
    if (a === 'cancel') { ed = null; placing = null; flash = null; drawSide(); draw(); return; }
    if (a === 'centre') { placing = placing === 'centre' ? null : 'centre'; drawSide(); draw(); return; }
    if (a === 'point') { placing = placing && placing !== 'centre' ? null : $('prePt').value; drawSide(); draw(); return; }
    if (t.dataset.rad) { ed.radius = +t.dataset.rad; drawSide(); draw(); return; }
    if (t.dataset.prm) { ed.points.splice(+t.dataset.prm, 1); drawSide(); draw(); return; }
    if (a === 'save') { if (!Number.isFinite(ed.x)) { say('Place it on the map first.', 'err'); return; } t.disabled = true;
      try { const j = await call('/save', ed); take(j); sel = j.id; ed = null; placing = null; say('Saved.', 'ok'); drawSide(); draw(); } catch (x) { say(x.message, 'err'); t.disabled = false; } return; }
    if (a === 'del') { const n = cur(); if (!confirm(`Delete the note for ${n.title}?`)) return; try { take(await call('/delete', { id: n.id })); sel = 0; say('Deleted.', 'ok'); drawSide(); draw(); } catch (x) { say(x.message, 'err'); } } });

  // ── a 911 call inside a note's circle: an alert for the units, opening the note ──
  const told = new Set(); let watching = false;
  const near = (n, c) => { const w = window.ovToWorld ? window.ovToWorld(n.x, n.z) : [n.x * G2M, n.z * G2M]; return Math.hypot(w[0] - c.x, w[1] - c.y) <= n.radius * G2M + 4; };
  const check = () => { if (!D) return; const now = Date.now();
    for (const c of window.CALLS || []) { if (!c.live || !Number.isFinite(c.x) || now - c.startedAt > 15 * 60000) continue;
      for (const n of D.notes) { const k = n.id + ':' + c.startedAt; if (told.has(k) || !(n.dept === 'all' || n.dept === c.dept) || !near(n, c)) continue; told.add(k);
        dispatchEvent(new CustomEvent('ov:premise', { detail: { id: n.id, call: c.startedAt, call_type: c.type, title: n.title, kind: D.kinds[n.kind] || 'Location note', address: n.address, points: n.points.length } })); } } };
  const watchCalls = () => { if (watching) return; watching = true; addEventListener('calls', check); check(); };
  // the notes, for the call watcher: loaded once and every few minutes (not for players on the civilian team, who can't see them)
  const quiet = async () => { try { take(await call('')); } catch (x) { if (x.status === 403) return; } setTimeout(quiet, 180000); };
  setTimeout(quiet, 4000);

  // ── where to open it: Dispatch's map controls ──
  const ctl = document.querySelector('.mapctl'); if (ctl) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pre-open';
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><path d="M9.5 9.5h5M9.5 12h3"/></svg>';
    b.setAttribute('aria-label', 'Location notes'); b.title = 'Location notes'; b.addEventListener('click', () => window.ovPremises()); ctl.appendChild(b); }
  // and in every department MDT, under Map
  const mp = document.querySelector('#mdt .tside [data-pane="map"]'); if (mp) { const b = document.createElement('button'); b.type = 'button'; b.className = 'pre-open';
    b.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><path d="M9.5 9.5h5M9.5 12h3"/></svg>Locations';
    b.addEventListener('click', () => window.ovPremises()); mp.after(b); }
})();
