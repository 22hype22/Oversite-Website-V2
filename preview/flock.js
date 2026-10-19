// Flock cameras: one window for dispatch and police, opened from the map controls on Dispatch and from BOLOs on the police MDT.
// The map shows every plate camera and how far it sees; the side lists the cameras and the flagged cars they caught lately
// (a camera that caught one in the last ten minutes glows red). Admins and up can place, move, rename and remove cameras here
// too: the same cameras as Server Staff, Mapping, Cameras. Drag the map to move around, scroll to zoom.
(() => { const OV = window.OVERSITE; if (!OV || !OV.api || (OV.features || {}).alpr === false) return;
  const API = OV.api + '/flock', SIZE = 5355, NS = 'http://www.w3.org/2000/svg', CAM = '#B98CFF', HOT = '#E24B4B';
  const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.4 4.9 21.9 9.95Q22.9 10.5 22 11.15L19.2 12.75Q18.9 12.9 18.6 12.8L5.6 8.4Q4.5 8 4.75 6.95L5.15 5.7Q5.5 4.65 6.4 4.9Z"/><path d="M5.2 8.95 19.85 13.3 19.05 15.25Q18.6 16 17.9 15.75L5.75 11.6Q4.5 11.1 4.75 10.2Z"/><path d="M20.55 12.05 22.6 12.4Q23 12.55 22.85 12.95L21.5 16.1Q21.35 16.35 21.05 16.25L20.1 15.95Q19.6 15.7 19.75 15.2Z"/><path d="M9.95 13.05 11.5 13.45 10.35 15.6 8.85 15.1Z"/><circle cx="9.25" cy="16.25" r="1.35"/><rect x="2.6" y="15.75" width="5.9" height="1.1"/><rect x="1" y="12.9" width="1.95" height="6.3" rx=".5"/></svg>';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const hhmm = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const when = t => (new Date(t).toDateString() === new Date().toDateString() ? '' : new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ') + hhmm(t);
  const css = document.createElement('style'); css.textContent = `#flkDlg{width:min(1120px,calc(100vw - 24px));height:min(780px,calc(100dvh - 24px));max-width:none;max-height:none;padding:0;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:#141518;color:#E9EAEC;box-shadow:0 30px 70px rgba(0,0,0,.6);overflow:hidden}
#flkDlg::backdrop{background:rgba(0,0,0,.6)}#flkDlg .wt{display:grid;grid-template-columns:minmax(0,350px) minmax(0,1fr);height:100%;min-height:0}
#flkDlg .wt-side{display:flex;flex-direction:column;gap:14px;padding:18px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.08);min-height:0}
#flkDlg .wt-top{display:flex;align-items:center;gap:8px}#flkDlg .wt-top h2{flex:1;margin:0;font-size:16px;font-weight:600}
#flkDlg .wt-x{width:32px;height:32px;flex:none;border-radius:9px;border:0;background:none;color:#9A9EA6;font-size:20px;cursor:pointer}#flkDlg .wt-x:hover{background:rgba(255,255,255,.06);color:#fff}
#flkDlg p.sub{margin:0;font-size:12.5px;line-height:1.5;color:#9A9EA6}#flkDlg p.warn{margin:0;font-size:12.5px;line-height:1.5;color:#E9C24C}#flkDlg h3{margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#62666D}
#flkDlg input{font:inherit;font-size:13px;color:#ECEDEF;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:6px 9px;outline:none;min-width:0;width:100%}#flkDlg input:focus{border-color:rgba(255,255,255,.32)}
#flkDlg .go{font:inherit;font-size:12.5px;font-weight:600;padding:8px 15px;border-radius:999px;border:0;background:#ECEDEF;color:#0B0B0C;cursor:pointer;white-space:nowrap}
#flkDlg .bt{font:inherit;font-size:12.5px;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:none;color:#E9EAEC;cursor:pointer;white-space:nowrap}#flkDlg .bt[aria-pressed="true"]{background:#ECEDEF;color:#0B0B0C;border-color:#ECEDEF}
#flkDlg button:disabled{opacity:.45;cursor:default}#flkDlg .acts{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#flkDlg .msg{flex:1;font-size:12px;color:#9A9EA6;min-height:16px}#flkDlg .msg.err{color:#F3A0A0}#flkDlg .msg.ok{color:#7FDCA4}
#flkDlg .seg{display:flex;gap:6px;flex-wrap:wrap}#flkDlg .sw{display:flex;align-items:center;gap:10px;font-size:13px;cursor:pointer}#flkDlg .sw input{width:auto;accent-color:#46D07C}
#flkDlg .it{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);font-size:12.5px}
#flkDlg .it[data-cam]{cursor:pointer}#flkDlg .it.sel{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.05)}#flkDlg .it b{font-weight:600;color:#ECEDEF;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#flkDlg .it small{color:#9A9EA6}
#flkDlg .it i{width:9px;height:9px;border-radius:50%;display:block;background:${CAM}}#flkDlg .it i.hot{background:${HOT};box-shadow:0 0 8px ${HOT}}
#flkDlg .tag{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);color:#C9CDD3;white-space:nowrap}#flkDlg .tag.bad{color:#F3A0A0;border-color:rgba(226,75,75,.4)}
#flkDlg .list{display:grid;gap:6px}#flkDlg .log{display:grid}#flkDlg .log div{display:grid;grid-template-columns:62px minmax(0,1fr);gap:8px;padding:7px 0;border-top:1px solid rgba(255,255,255,.07);font-size:12.5px}#flkDlg .log div:first-child{border-top:0}
#flkDlg .log time{font-size:11.5px;color:#62666D}#flkDlg .log b{font-weight:600}#flkDlg .log small{display:block;color:#9A9EA6}#flkDlg .empty{font-size:12.5px;color:#62666D;margin:0}
#flkDlg .wt-map{position:relative;min-height:0;background:#3E6972}#flkDlg svg{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;user-select:none}#flkDlg svg.placing{cursor:crosshair}
#flkDlg .zm{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.14);background:rgba(13,20,22,.88)}
#flkDlg .zm button{width:34px;height:34px;border:0;background:none;color:#ECEDEF;font:500 17px/1 inherit;cursor:pointer}#flkDlg .zm button+button{border-top:1px solid rgba(255,255,255,.08)}
#flkDlg .hint{position:absolute;left:12px;right:60px;bottom:12px;padding:8px 10px;border-radius:10px;background:rgba(13,20,22,.9);font-size:12px;color:#C9CDD3}#flkDlg .hint:empty{display:none}
@media (max-width:820px){#flkDlg .wt{grid-template-columns:minmax(0,1fr);grid-template-rows:42% minmax(0,1fr)}#flkDlg .wt-map{order:-1}#flkDlg .wt-side{border-right:0;border-top:1px solid rgba(255,255,255,.08)}}`; document.head.appendChild(css);
  const dlg = document.createElement('dialog'); dlg.id = 'flkDlg'; dlg.setAttribute('aria-label', 'Flock cameras'); document.body.appendChild(dlg);
  dlg.innerHTML = `<div class="wt"><div class="wt-side" id="flkSide"></div><div class="wt-map"><svg id="flkSvg" preserveAspectRatio="xMidYMid slice"></svg>
    <div class="zm"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">&minus;</button><button type="button" data-z="fit" aria-label="Show the whole map">&#x2922;</button></div>
    <div class="hint" id="flkHint"></div></div></div>`;
  const $ = id => dlg.querySelector('#' + id), svg = $('flkSvg'), side = $('flkSide');
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  const img = el('image', { href: '/liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg), gC = el('g', {}, svg);
  let vb = [0, 0, SIZE, SIZE]; const setVB = () => { const w = Math.min(SIZE, vb[2]), cw = svg.clientWidth || 1, ch = svg.clientHeight || 1;   // never past the edge of the map:
    const sx = w * (1 - Math.min(1, cw / ch)) / 2, sy = w * (1 - Math.min(1, ch / cw)) / 2, lim = (v, s) => Math.max(-s, Math.min(SIZE - w + s, v));   // (the box is cropped to the panel's shape)
    vb = [lim(vb[0], sx), lim(vb[1], sy), w, w];
    svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); }; setVB();
  const px = () => vb[2] / (svg.clientWidth || 600);
  const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; };
  const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE, Math.max(200, vb[2] * f));
    vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; setVB(); draw(); };
  const fitTo = pts => { if (!pts.length) { vb = [0, 0, SIZE, SIZE]; setVB(); draw(); return; } const xs = pts.map(q => q[0]), zs = pts.map(q => q[1]);
    const w = Math.max(700, Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.4, cx = (Math.max(...xs) + Math.min(...xs)) / 2, cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    vb = [cx - w / 2, cz - w / 2, w, w]; setVB(); draw(); };

  // D: what the server has { on, range, ranges, list, log, edit }. ed: a copy being changed { on, range, list }. placing: the next map click adds a camera
  let D = null, ed = null, sel = '', placing = false, timer = 0, flash = null;
  const say = (t, k = '') => { flash = { t, k }; const m = $('flkMsg'); if (m) { m.textContent = t; m.className = 'msg ' + k; } };
  const cams = () => (ed || D)?.list || [];
  const hot = id => (D?.log || []).some(h => h.cam === id && Date.now() - h.at < 600000);
  const R = () => (D?.ranges || {})[(ed || D)?.range] || 55;

  // ── the map ──
  const draw = () => { gC.textContent = ''; if (!D) return; const p = px(), r = R();
    for (const k of cams()) { const h = hot(k.id), s = k.id === sel, c = h ? HOT : CAM;
      el('circle', { cx: k.x, cy: k.z, r, fill: c, 'fill-opacity': s ? .22 : .12, stroke: c, 'stroke-opacity': .7, 'stroke-width': s ? 2.5 : 1.5, 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, gC);
      el('circle', { cx: k.x, cy: k.z, r: (s ? 8 : 6.5) * p, fill: c, stroke: '#0d1416', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'data-c': k.id, style: `cursor:${ed ? 'move' : 'pointer'}` }, gC);
      el('text', { x: k.x, y: k.z - 14 * p, 'text-anchor': 'middle', 'font-size': 12 * p, 'font-weight': 600, fill: '#fff', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * p, 'pointer-events': 'none' }, gC).textContent = k.name; }
    svg.classList.toggle('placing', placing);
    $('flkHint').textContent = placing ? 'Click the map where the camera is. Esc cancels.' : ed ? 'Drag a camera to move it. Press Add camera for another.' : ''; };

  // dragging a camera moves it (while editing); anything else pans; a click picks a camera, or places one
  let drag = null;
  svg.addEventListener('pointerdown', e => { if (e.button !== 0 && e.button !== 1) return; const id = e.target.dataset?.c;
    drag = id && ed ? { id, moved: false } : { pan: [e.clientX, e.clientY, vb[0], vb[1]], at: toMap(e), id, moved: false }; svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => { if (!drag) return;
    if (drag.pan) { const dx = e.clientX - drag.pan[0], dy = e.clientY - drag.pan[1]; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) { vb[0] = drag.pan[2] - dx * px(); vb[1] = drag.pan[3] - dy * px(); setVB(); } return; }
    const k = ed.list.find(c => c.id === drag.id); if (!k) return; drag.moved = true; [k.x, k.z] = toMap(e); draw(); });
  svg.addEventListener('pointerup', () => { const d = drag; drag = null; if (!d || d.moved) return;
    if (placing && ed) { placing = false; const id = Math.random().toString(36).slice(2, 9); ed.list.push({ id, name: `Camera ${ed.list.length + 1}`, x: d.at[0], z: d.at[1] }); sel = id; drawSide(); draw(); dlg.querySelector(`[data-name="${id}"]`)?.select(); return; }
    if (d.id) { sel = d.id; drawSide(); draw(); } });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, toMap(e)); }, { passive: false });
  dlg.addEventListener('keydown', e => { if (e.key === 'Escape' && placing) { e.preventDefault(); placing = false; drawSide(); draw(); } });

  // ── the side panel ──
  const lastHit = id => (D.log || []).find(h => h.cam === id);
  const camRow = k => { const h = lastHit(k.id); return `<div class="it${k.id === sel ? ' sel' : ''}" data-cam="${esc(k.id)}"><i class="${hot(k.id) ? 'hot' : ''}"></i>${ed
    ? `<input data-name="${esc(k.id)}" maxlength="32" value="${esc(k.name)}" aria-label="Camera name"><button type="button" class="wt-x" data-rm="${esc(k.id)}" aria-label="Remove ${esc(k.name)}">&times;</button>`
    : `<div><b>${esc(k.name)}</b><small>${h ? 'Caught ' + esc(h.plate) + ' at ' + hhmm(h.at) : 'Nothing caught lately'}</small></div>${hot(k.id) ? '<span class="tag bad">Hit</span>' : '<span></span>'}`}</div>`; };
  const hits = () => { const L = (D.log || []).filter(h => !sel || h.cam === sel); return L.length ? `<div class="log">${L.map(h => `<div><time>${when(h.at)}</time><span><b>${esc(h.plate)}</b>${h.vehicle ? ' · ' + esc(h.vehicle) : ''}<small>${esc(h.camera)} · ${esc(h.reasons)}${h.owner ? ' · ' + esc(h.owner) : ''}</small></span></div>`).join('')}</div>`
    : `<p class="empty">${sel ? 'This camera hasn’t caught a flagged car lately.' : 'No flagged cars caught lately.'}</p>`; };
  const view = () => `<p class="sub">Fixed plate readers. When a stolen car, a car matching a BOLO, one whose owner has a warrant or one with bad papers drives past, police and dispatch get an alert that names the camera.</p>
    ${D.on ? '' : `<p class="warn">Cameras are switched off${D.list.length ? '' : ' and none are placed yet'}. ${D.edit ? 'Press Edit cameras to set them up.' : 'An admin can set them up here or in Server Staff, Mapping.'}</p>`}
    ${D.edit ? '<div class="acts"><button type="button" class="bt" data-act="edit">Edit cameras</button><span class="msg" id="flkMsg" role="status"></span></div>' : ''}
    <h3>Cameras${D.list.length ? ' · ' + D.list.length : ''}</h3><div class="list">${D.list.length ? D.list.map(camRow).join('') : '<p class="empty">No cameras yet.</p>'}</div>
    <h3>${sel ? 'Caught by ' + esc(D.list.find(k => k.id === sel)?.name || 'this camera') : 'Lately'}</h3>${hits()}${sel ? '<div><button type="button" class="bt" data-act="all">Show every camera</button></div>' : ''}`;
  const editor = () => `<label class="sw"><input type="checkbox" id="flkOn"${ed.on ? ' checked' : ''}>Cameras on<small style="color:#9A9EA6">While they’re on, the plate reader only alerts at cameras</small></label>
    <h3>How far each sees</h3><div class="seg">${[['short', 'Short, 15 m'], ['normal', 'Normal, 25 m'], ['long', 'Long, 40 m']].map(([v, t]) => `<button type="button" class="bt" data-range="${v}" aria-pressed="${ed.range === v}">${t}</button>`).join('')}</div>
    <h3>Cameras · ${ed.list.length}</h3><div class="list">${ed.list.length ? ed.list.map(camRow).join('') : '<p class="empty">None yet. Press Add camera, then click the map where one is.</p>'}</div>
    <div><button type="button" class="bt" data-act="add" aria-pressed="${placing}"${ed.list.length >= (D.max || 60) ? ' disabled' : ''}>${placing ? 'Click the map…' : 'Add camera'}</button></div>
    <div class="acts" style="justify-content:flex-end"><span class="msg" id="flkMsg" role="status"></span><button type="button" class="bt" data-act="cancel">Cancel</button><button type="button" class="go" data-act="save">Save</button></div>`;
  const drawSide = () => { side.innerHTML = `<div class="wt-top"><h2>Flock cameras</h2><button type="button" class="wt-x" data-act="close" aria-label="Close">&times;</button></div>${ed ? editor() : view()}`;
    if (flash) { const m = $('flkMsg'); if (m) { m.textContent = flash.t; m.className = 'msg ' + flash.k; } } };

  // ── loading, and keeping hits fresh while it's open ──
  const load = async () => { try { D = await call(''); if (Array.isArray(D.off)) { img.setAttribute('x', -D.off[0]); img.setAttribute('y', -D.off[1]); } if (sel && !cams().some(k => k.id === sel)) sel = ''; return true; }
    catch (x) { side.innerHTML = `<div class="wt-top"><h2>Flock cameras</h2><button type="button" class="wt-x" data-act="close" aria-label="Close">&times;</button></div><p class="sub">${esc(x.message)}</p>`; return false; } };
  const tick = async () => { if (!dlg.open) return; if (!ed && !drag && await load()) { drawSide(); draw(); } timer = setTimeout(tick, 10000); };
  window.ovFlock = async () => { ed = null; placing = false; flash = null; sel = ''; if (!dlg.open) dlg.showModal(); side.innerHTML = '<p class="sub">Loading…</p>'; if (!await load()) return;
    drawSide(); fitTo(D.list.map(k => [k.x, k.z])); clearTimeout(timer); timer = setTimeout(tick, 10000); };
  dlg.addEventListener('close', () => { clearTimeout(timer); ed = null; placing = false; });

  // ── the panel's buttons ──
  dlg.addEventListener('input', e => { const t = e.target; if (!ed) return; if (t.id === 'flkOn') ed.on = t.checked;
    if (t.dataset.name) { const k = ed.list.find(c => c.id === t.dataset.name); if (k) { k.name = t.value; draw(); } } });
  dlg.addEventListener('click', async e => { const t = e.target.closest('button,[data-cam]'); if (!t) { if (e.target === dlg) dlg.close(); return; } const a = t.dataset.act;
    if (a === 'close') return dlg.close();
    if (t.dataset.z) return t.dataset.z === 'fit' ? fitTo([]) : zoom(t.dataset.z === 'in' ? 1 / 1.4 : 1.4);
    if (t.dataset.rm) { ed.list = ed.list.filter(k => k.id !== t.dataset.rm); if (sel === t.dataset.rm) sel = ''; drawSide(); draw(); return; }
    if (t.dataset.range) { ed.range = t.dataset.range; drawSide(); draw(); return; }
    if (t.dataset.cam) { if (e.target.closest('input')) return; sel = t.dataset.cam; flash = null; drawSide(); const k = cams().find(c => c.id === sel); if (k && !ed) fitTo([[k.x, k.z]]); else draw(); return; }
    if (a === 'all') { sel = ''; drawSide(); fitTo(D.list.map(k => [k.x, k.z])); return; }
    if (a === 'edit') { ed = { on: D.on, range: D.range, list: D.list.map(k => ({ ...k })) }; flash = null; drawSide(); draw(); return; }
    if (a === 'add') { placing = !placing; drawSide(); draw(); return; }
    if (a === 'cancel') { ed = null; placing = false; flash = null; drawSide(); draw(); return; }
    if (a === 'save') { t.disabled = true; try { D = await call('/save', ed); ed = null; placing = false; say(D.on ? 'Saved. Cameras are on.' : 'Saved. Cameras are off.', 'ok'); drawSide(); draw(); } catch (x) { say(x.message, 'err'); t.disabled = false; } } });

  // ── where to open it: Dispatch's map controls (next to Ankle monitors), and the police MDT's BOLOs ──
  const ctl = document.querySelector('.mapctl'); if (ctl) { const b = document.createElement('button'); b.type = 'button'; b.className = 'flk-open'; b.innerHTML = ICON;
    b.setAttribute('aria-label', 'Flock cameras'); b.title = 'Flock cameras'; b.addEventListener('click', () => window.ovFlock()); ctl.appendChild(b); }
  const nb = document.querySelector('[data-pane="bolos"] .thead [data-new="bolo"]'); if (nb) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn flk-open'; b.textContent = 'Flock cameras';
    b.style.marginRight = '8px'; b.addEventListener('click', () => window.ovFlock()); nb.before(b); }
})();
