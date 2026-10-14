// Boundaries editor for server Settings: presets (save slots), an area per team or for the whole server, drawn on the 2D map.
// Points are ER:LC map coordinates (what the API reports as LocationX / LocationZ), so the server checks players without converting.
(() => {
  const root = document.getElementById('bounds'); if (!root) return;
  const A = root.dataset.api + '/bounds', SIZE = 5355, ALL = '*', NS = 'http://www.w3.org/2000/svg';
  const COL = { pd: '#4C8DFF', fd: '#E24B4B', dot: '#E9C24C', '': '#46D07C', [ALL]: '#F0F2F5' };
  const $ = id => document.getElementById(id), svg = $('bdSvg'), msg = $('bdMsg');
  let B = null, teams = [], depts = {}, players = [], cur = '', scope = ALL, sel = -1, draft = null, hover = null, dirty = false, vb = [0, 0, SIZE, SIZE];
  const preset = () => B.presets.find(p => p.id === cur) || B.presets[0];
  const zones = () => preset().zones;
  const colorOf = s => s === ALL ? COL[ALL] : COL[depts[s] ?? ''] || COL[''];
  const scopeName = s => s === ALL ? 'Whole server' : s;
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const mark = () => { dirty = true; $('bdSave').disabled = false; $('bdDirty').hidden = false; };
  const px = () => vb[2] / (svg.clientWidth || 600);                       // map units per screen pixel

  // ── layers: map image, other areas (faint), this scope's areas, the area being drawn, players ──
  const img = el('image', { href: '/liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg);
  const gOther = el('g', {}, svg), gMine = el('g', {}, svg), gDraft = el('g', {}, svg), gPl = el('g', { 'pointer-events': 'none' }, svg);   // player dots never block a click on a corner
  const setVB = () => svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' '));
  const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; };
  const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE * 1.1, Math.max(250, vb[2] * f));
    vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; setVB(); draw(); };

  const poly = (pts, at, parent) => el('polygon', { points: pts.map(p => p.join(',')).join(' '), 'vector-effect': 'non-scaling-stroke', ...at }, parent);
  const draw = () => { if (!B) return; for (const g of [gOther, gMine, gDraft, gPl]) g.textContent = '';
    const Z = zones(), r = 6 * px();
    for (const [s, list] of Object.entries(Z)) if (s !== scope) for (const p of list) poly(p, { fill: colorOf(s), 'fill-opacity': .1, stroke: colorOf(s), 'stroke-opacity': .85, 'stroke-width': 2, 'stroke-dasharray': '6 5', 'pointer-events': 'none' }, gOther);
    const c = colorOf(scope);
    (Z[scope] || []).forEach((p, i) => { const on = i === sel;
      poly(p, { fill: c, 'fill-opacity': on ? .32 : .22, stroke: c, 'stroke-width': on ? 3.5 : 2.5, 'data-i': i, class: 'bd-poly' }, gMine);
      if (on && !draft) { p.forEach((q, k) => { const n = p[(k + 1) % p.length];
          el('circle', { cx: (q[0] + n[0]) / 2, cy: (q[1] + n[1]) / 2, r: r * .7, fill: c, 'fill-opacity': .55, class: 'bd-mid', 'data-k': k }, gMine); });
        p.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r, fill: '#0d1416', stroke: c, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', class: 'bd-pt', 'data-k': k }, gMine)); } });
    if (draft) { const pts = hover ? [...draft, hover] : draft;
      el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: c, 'fill-opacity': .1, stroke: c, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'vector-effect': 'non-scaling-stroke' }, gDraft);
      draft.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r: k ? r * .8 : r * 1.25, fill: k ? c : '#0d1416', stroke: c, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, gDraft)); }
    for (const p of players) { const g = el('g', {}, gPl); el('circle', { cx: p.x, cy: p.z, r: r * .9, fill: colorOf(p.team in depts ? p.team : ''), stroke: '#0d1416', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke' }, g);
      const t = el('text', { x: p.x + r * 1.5, y: p.z + r * .5, 'font-size': 11 * px(), fill: '#F0F2F5', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * px() }, g); t.textContent = p.name; }
    $('bdDel').disabled = sel < 0 || !!draft; $('bdUndo').hidden = !draft; $('bdDraw').textContent = draft ? 'Finish area' : 'Draw area';
    svg.classList.toggle('drawing', !!draft);
    $('bdHint').textContent = draft ? (draft.length < 3 ? 'Click to place corners, or hold and drag to draw the outline. Scroll to zoom, right-drag to move the map.' : 'Click the first corner, or press Finish area, to close it. Esc cancels.')
      : sel >= 0 ? 'Drag a corner to move it. Drag a small dot between corners to add one.' : (Z[scope] || []).length ? 'Click an area to edit it, or draw another.' : 'No area yet for ' + scopeName(scope) + '. Click or drag on the map to draw one.'; };

  // ── the controls above and below the map ──
  const slots = () => { $('bdSlots').innerHTML = B.presets.map(p => '<button type="button" class="bd-chip' + (p.id === cur ? ' on' : '') + '" data-p="' + p.id + '">' + esc(p.name) + (p.id === B.active ? '<i>Live</i>' : '') + '</button>').join('')
      + (B.presets.length < 8 ? '<button type="button" class="bd-chip add" data-p="+">New preset</button>' : '');
    $('bdName').value = preset().name; $('bdLive').disabled = cur === B.active; $('bdLive').textContent = cur === B.active ? 'This preset is live' : 'Make this preset live'; $('bdRm').disabled = B.presets.length < 2;
    $('bdScope').innerHTML = [ALL, ...teams].map(s => { const n = (zones()[s] || []).length; return '<button type="button" class="bd-chip' + (s === scope ? ' on' : '') + '" data-s="' + esc(s) + '"><b style="background:' + colorOf(s) + '"></b>' + esc(scopeName(s)) + (n ? '<small>' + n + '</small>' : '') + '</button>'; }).join('');
    $('bdTag').textContent = B.on ? 'On' : 'Off'; $('bdTag').className = 'tag' + (B.on ? ' ok' : ''); };
  const pick = id => { if (draft) draft = null; cur = id; sel = -1; slots(); draw(); };
  $('bdSlots').addEventListener('click', e => { const b = e.target.closest('[data-p]'); if (!b) return;
    if (b.dataset.p === '+') { const id = Math.random().toString(36).slice(2, 9); B.presets.push({ id, name: 'Preset ' + (B.presets.length + 1), zones: {} }); mark(); pick(id); $('bdName').select(); return; }
    pick(b.dataset.p); });
  $('bdScope').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; draft = null; scope = b.dataset.s; sel = -1; slots(); draw(); });
  $('bdName').addEventListener('input', () => { preset().name = $('bdName').value.slice(0, 32); mark(); const c = $('bdSlots').querySelector('.on'); if (c) c.firstChild.textContent = preset().name || 'Untitled'; });
  $('bdLive').addEventListener('click', () => { B.active = cur; mark(); slots(); });
  $('bdCopy').addEventListener('click', () => { if (B.presets.length >= 8) return say(msg, 'You can keep up to 8 presets.'); const id = Math.random().toString(36).slice(2, 9);
    B.presets.push({ id, name: (preset().name + ' copy').slice(0, 32), zones: JSON.parse(JSON.stringify(zones())) }); mark(); pick(id); });
  $('bdRm').addEventListener('click', async () => { if (B.presets.length < 2) return; if (!await ask({ title: 'Delete ' + preset().name + '?', text: 'Its areas are deleted with it once you save.', ok: 'Delete', danger: true })) return;
    B.presets = B.presets.filter(p => p.id !== cur); if (!B.presets.some(p => p.id === B.active)) B.active = B.presets[0].id; mark(); pick(B.presets[0].id); });
  $('bdOn').addEventListener('change', () => { B.on = $('bdOn').checked; mark(); slots(); });
  $('bdGrace').addEventListener('change', () => { B.grace = +$('bdGrace').value; mark(); });
  $('bdStaff').addEventListener('change', () => { B.exemptStaff = $('bdStaff').checked; mark(); });

  const finish = () => { if (!draft) return; if (draft.length >= 3) { const Z = zones(); (Z[scope] = Z[scope] || []).push(draft); sel = Z[scope].length - 1; mark(); } draft = null; hover = null; slots(); draw(); };
  $('bdDraw').addEventListener('click', () => { if (draft) return finish(); if ((zones()[scope] || []).length >= 16) return say(msg, 'That is the most areas one team can have.'); draft = []; sel = -1; draw(); });
  $('bdUndo').addEventListener('click', () => { if (draft) { draft.pop(); draw(); } });
  $('bdDel').addEventListener('click', () => { const Z = zones(); if (sel < 0 || !Z[scope]) return; Z[scope].splice(sel, 1); if (!Z[scope].length) delete Z[scope]; sel = -1; mark(); slots(); draw(); });
  $('bdIn').addEventListener('click', () => zoom(.7)); $('bdOut').addEventListener('click', () => zoom(1 / .7)); $('bdFit').addEventListener('click', () => { vb = [0, 0, SIZE, SIZE]; setVB(); draw(); });
  document.addEventListener('keydown', e => { if (!draft || !root.offsetParent || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'Escape') { draft = null; hover = null; draw(); } else if (e.key === 'Enter') { e.preventDefault(); finish(); } else if (e.key === 'Backspace') { e.preventDefault(); draft.pop(); draw(); } });

  // ── pointer. Drawing: a click adds a corner, holding and dragging draws the outline freehand. Otherwise a drag moves the map,
  // and a click picks an area. The right or middle button (or Space held down) always moves the map. ──
  let down = null, space = false;
  addEventListener('keydown', e => { if (e.code === 'Space' && root.offsetParent && document.activeElement === document.body) { space = true; e.preventDefault(); } });
  addEventListener('keyup', e => { if (e.code === 'Space') space = false; });
  svg.addEventListener('contextmenu', e => e.preventDefault());
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
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); const t = e.target, P = toMap(e);
    const pan = () => ({ kind: 'pan', x: e.clientX, y: e.clientY, vb: [...vb], moved: false, t });
    if (e.button || space) { down = { ...pan(), force: true }; return; }
    if (!draft && sel >= 0 && t.classList.contains('bd-pt')) down = { kind: 'pt', k: +t.dataset.k };
    else if (!draft && sel >= 0 && t.classList.contains('bd-mid')) { const p = zones()[scope][sel], k = +t.dataset.k; p.splice(k + 1, 0, P); down = { kind: 'pt', k: k + 1 }; mark(); draw(); }
    else if (!draft && !t.closest('.bd-poly') && !(zones()[scope] || []).length) { draft = []; sel = -1; down = { kind: 'draw', x: e.clientX, y: e.clientY, moved: false, n: 0 }; draw(); }   // nothing drawn for this team yet: just start drawing
    else if (draft) down = { kind: 'draw', x: e.clientX, y: e.clientY, moved: false, n: draft.length };
    else down = pan(); });
  svg.addEventListener('pointermove', e => { const P = toMap(e);
    if (down?.kind === 'pt') { zones()[scope][sel][down.k] = P; mark(); draw(); return; }
    if (down?.kind === 'pan') { const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!down.moved && Math.hypot(dx, dy) < 5) return; down.moved = true;
      const s = down.vb[2] / svg.clientWidth; vb = [down.vb[0] - dx * s, down.vb[1] - dy * s, vb[2], vb[3]]; setVB(); return; }
    if (down?.kind === 'draw') { if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) return;
      if (!down.moved) { down.moved = true; draft.push(toMap({ clientX: down.x, clientY: down.y })); }
      const last = draft[draft.length - 1]; if (Math.hypot(P[0] - last[0], P[1] - last[1]) > 6 * px()) { draft.push(P); hover = null; draw(); } return; }
    if (draft) { hover = P; draw(); } });
  svg.addEventListener('pointerup', e => { const d = down; down = null; if (!d) return; const P = toMap(e);
    if (d.kind === 'pt') return;
    if (d.kind === 'pan') { if (d.moved || d.force) { draw(); return; } const hit = d.t.closest?.('.bd-poly'); sel = hit ? +hit.dataset.i : -1; draw(); return; }
    if (d.moved) { const stroke = draft.splice(d.n); stroke.push(P); draft.push(...simplify(stroke, 2.5 * px()));   // a freehand stroke: keep its shape with fewer points
      if (draft.length > 220) draft = simplify(draft, 6 * px());
      if (draft.length >= 3 && Math.hypot(P[0] - draft[0][0], P[1] - draft[0][1]) < 18 * px()) { draft.pop(); return finish(); }   // ended where it started: close it
      draw(); return; }
    if (draft.length >= 3 && Math.hypot(P[0] - draft[0][0], P[1] - draft[0][1]) < 12 * px()) return finish(); draft.push(P); draw(); });
  svg.addEventListener('dblclick', e => { if (draft) { e.preventDefault(); draft.pop(); finish(); } });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15, toMap(e)); }, { passive: false });

  // ── recent activity, and live players while the tab is open ──
  const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : Math.round(s / 3600) + 'h ago'; };
  const showLog = log => { $('bdLog').innerHTML = log.length ? log.slice(0, 12).map(l => '<li><p><b>' + esc(l.name) + '</b>' + (l.team ? ' <span>' + esc(l.team) + '</span>' : '') + ' ' + (l.kind === 'left' ? 'left ' + esc(l.where || 'their area') + ' and was warned' : l.kind === 'loaded' ? 'was loaded for staying outside ' + esc(l.where || 'their area') : 'came back in time') + '</p><time>' + ago(l.at) + '</time></li>').join('') : '<li class="none">Nothing yet. Warnings and loads show up here.</li>'; };
  const load = async first => { try { const j = await api(A, null, 'GET'); players = j.players || []; showLog(j.log || []);
      if (first) { B = j.bounds; teams = j.teams; depts = j.depts || {}; cur = B.active; img.setAttribute('x', -j.off[0]); img.setAttribute('y', -j.off[1]);
        dirty = false; $('bdSave').disabled = true; $('bdDirty').hidden = true;   // the switches below the map come filled in from the page
        if (!j.connected) $('bdHint2').hidden = false; slots(); }
      draw(); } catch (e) { say(msg, e.message); } };
  $('bdSave').addEventListener('click', async () => { if (draft) finish(); $('bdSave').disabled = true;
    try { const j = await api(A, B); B = j.bounds; if (!B.presets.some(p => p.id === cur)) cur = B.active; dirty = false; $('bdDirty').hidden = true; showLog(j.log || []); slots(); draw();
      say(msg, B.on ? 'Saved. ' + (B.presets.find(p => p.id === B.active)?.name || 'The live preset') + ' is being enforced in game.' : 'Saved. Boundaries are off, so nobody is warned or loaded.', true); }
    catch (e) { $('bdSave').disabled = false; say(msg, e.message); } });
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  load(true); setInterval(() => { if (root.offsetParent && !down && !document.hidden) load(false); }, 5000);
  setVB();
})();
