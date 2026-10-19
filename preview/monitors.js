// Ankle monitors: one window for dispatch and police, opened from the map controls on Dispatch and from BOLOs on the police MDT.
// Pick the person, draw where they may go (green) and any places they must keep out of (red), and optionally a last day. Dispatch
// is alerted when they leave their area, walk into a no-go zone, or come back; each monitor keeps a log. Drawing works like
// Mapping: click to place corners, click the first corner (or Finish area) to close it, drag a corner to move it; drag the map to
// move around, scroll to zoom.
(() => { const OV = window.OVERSITE; if (!OV || !OV.api || (OV.features || {}).monitors === false) return;
  const API = OV.api + '/monitors', SIZE = 5355, NS = 'http://www.w3.org/2000/svg', OK = '#46D07C', BAD = '#E24B4B';
  const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const call = async (p, b) => { const r = await fetch(API + p, b ? { method: 'POST', headers: { 'content-type': 'application/json', 'x-oversite': '1' }, body: JSON.stringify(b) } : { cache: 'no-store' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Something went wrong (' + r.status + ')'); return j; };
  const hhmm = t => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), day = t => new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });
  const when = t => (new Date(t).toDateString() === new Date().toDateString() ? '' : day(t) + ', ') + hhmm(t);
  const css = document.createElement('style'); css.textContent = `#monDlg{width:min(1120px,calc(100vw - 24px));height:min(780px,calc(100dvh - 24px));max-width:none;max-height:none;padding:0;border-radius:16px;border:1px solid rgba(255,255,255,.14);background:#141518;color:#E9EAEC;box-shadow:0 30px 70px rgba(0,0,0,.6);overflow:hidden}
#monDlg::backdrop{background:rgba(0,0,0,.6)}#monDlg .wt{display:grid;grid-template-columns:minmax(0,350px) minmax(0,1fr);height:100%;min-height:0}
#monDlg .wt-side{display:flex;flex-direction:column;gap:14px;padding:18px;overflow-y:auto;border-right:1px solid rgba(255,255,255,.08);min-height:0}
#monDlg .wt-top{display:flex;align-items:center;gap:8px}#monDlg .wt-top h2{flex:1;margin:0;font-size:16px;font-weight:600}
#monDlg .wt-x{width:32px;height:32px;flex:none;border-radius:9px;border:0;background:none;color:#9A9EA6;font-size:20px;cursor:pointer}#monDlg .wt-x:hover{background:rgba(255,255,255,.06);color:#fff}
#monDlg p.sub{margin:0;font-size:12.5px;line-height:1.5;color:#9A9EA6}#monDlg h3{margin:4px 0 0;font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#62666D}
#monDlg input{font:inherit;font-size:13px;color:#ECEDEF;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:9px;padding:8px 10px;outline:none;color-scheme:dark;min-width:0}
#monDlg input:focus{border-color:rgba(255,255,255,.32)}#monDlg label{display:grid;gap:5px;font-size:12px;color:#9A9EA6}
#monDlg .go{font:inherit;font-size:12.5px;font-weight:600;padding:8px 15px;border-radius:999px;border:0;background:#ECEDEF;color:#0B0B0C;cursor:pointer;white-space:nowrap}
#monDlg .bt{font:inherit;font-size:12.5px;padding:7px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:none;color:#E9EAEC;cursor:pointer;white-space:nowrap}#monDlg .bt.bad{color:#F3A0A0}
#monDlg button:disabled{opacity:.45;cursor:default}#monDlg .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#monDlg .msg{flex:1;font-size:12px;color:#9A9EA6;min-height:16px}#monDlg .msg.err{color:#F3A0A0}#monDlg .msg.ok{color:#7FDCA4}
#monDlg .it{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:9px;align-items:center;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.02);font-size:12.5px}
#monDlg .it[data-mon]{cursor:pointer}#monDlg .it.sel{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.05)}#monDlg .it b{font-weight:600;color:#ECEDEF;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#monDlg .it small{color:#9A9EA6}
#monDlg .it i{width:9px;height:9px;border-radius:50%;display:block}
#monDlg .tag{font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid rgba(255,255,255,.14);color:#C9CDD3;white-space:nowrap}#monDlg .tag.ok{color:#7FDCA4;border-color:rgba(70,208,124,.35)}#monDlg .tag.bad{color:#F3A0A0;border-color:rgba(226,75,75,.4)}
#monDlg .list{display:grid;gap:6px}#monDlg .log{display:grid}#monDlg .log div{display:grid;grid-template-columns:62px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.07);font-size:12.5px}#monDlg .log div:first-child{border-top:0}
#monDlg .log time{font-size:11.5px;color:#62666D}#monDlg .log .bad{color:#F3A0A0}#monDlg .empty{font-size:12.5px;color:#62666D;margin:0}
#monDlg .mon-pick{position:relative;display:grid}#monDlg .mon-pick input{width:100%}#monDlg .mon-pick ul{position:absolute;z-index:3;left:0;right:0;top:100%;margin:4px 0 0;padding:4px;list-style:none;border-radius:10px;background:#1c1d21;border:1px solid rgba(255,255,255,.14);max-height:220px;overflow:auto}
#monDlg .mon-pick li button{width:100%;text-align:left;font:inherit;font-size:13px;padding:7px 9px;border:0;border-radius:7px;background:none;color:#E9EAEC;cursor:pointer}#monDlg .mon-pick li button:hover{background:rgba(255,255,255,.07)}
#monDlg .wt-map{position:relative;min-height:0;background:#3E6972}#monDlg svg{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:grab;user-select:none}#monDlg svg.drawing{cursor:crosshair}
#monDlg .zm{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;border:1px solid rgba(255,255,255,.14);background:rgba(13,20,22,.88)}
#monDlg .zm button{width:34px;height:34px;border:0;background:none;color:#ECEDEF;font:500 17px/1 inherit;cursor:pointer}#monDlg .zm button+button{border-top:1px solid rgba(255,255,255,.08)}
#monDlg .hint{position:absolute;left:12px;right:60px;bottom:12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 10px;border-radius:10px;background:rgba(13,20,22,.9);font-size:12px;color:#C9CDD3}#monDlg .hint:empty{display:none}#monDlg .hint span{flex:1 1 200px}
@media (max-width:820px){#monDlg .wt{grid-template-columns:minmax(0,1fr);grid-template-rows:42% minmax(0,1fr)}#monDlg .wt-map{order:-1}#monDlg .wt-side{border-right:0;border-top:1px solid rgba(255,255,255,.08)}}`; document.head.appendChild(css);
  const dlg = document.createElement('dialog'); dlg.id = 'monDlg'; dlg.setAttribute('aria-label', 'Ankle monitors'); document.body.appendChild(dlg);
  dlg.innerHTML = `<div class="wt"><div class="wt-side" id="monSide"></div><div class="wt-map"><svg id="monSvg" preserveAspectRatio="xMidYMid slice"></svg>
    <div class="zm"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">&minus;</button><button type="button" data-z="fit" aria-label="Show the whole map">&#x2922;</button></div>
    <div class="hint" id="monHint"></div></div></div>`;
  const $ = id => dlg.querySelector('#' + id), svg = $('monSvg'), side = $('monSide');
  const el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
  el('image', { href: '/liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none' }, svg);
  const gA = el('g', {}, svg), gD = el('g', {}, svg), gP = el('g', {}, svg);
  let vb = [0, 0, SIZE, SIZE]; const setVB = () => { const w = Math.min(SIZE, vb[2]), cw = svg.clientWidth || 1, ch = svg.clientHeight || 1;   // never past the edge of the map:
    const sx = w * (1 - Math.min(1, cw / ch)) / 2, sy = w * (1 - Math.min(1, ch / cw)) / 2, lim = (v, s) => Math.max(-s, Math.min(SIZE - w + s, v));   // (the box is cropped to the panel's shape)
    vb = [lim(vb[0], sx), lim(vb[1], sy), w, w];
    svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); }; setVB();
  const px = () => vb[2] / (svg.clientWidth || 600);
  const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; };
  const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE, Math.max(200, vb[2] * f));
    vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; setVB(); draw(); };
  const fitTo = pts => { if (!pts.length) { vb = [0, 0, SIZE, SIZE]; setVB(); draw(); return; } const xs = pts.map(q => q[0]), zs = pts.map(q => q[1]);
    const w = Math.max(500, Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) * 1.5, cx = (Math.max(...xs) + Math.min(...xs)) / 2, cz = (Math.max(...zs) + Math.min(...zs)) / 2;
    vb = [cx - w / 2, cz - w / 2, w, w]; setVB(); draw(); };

  // D: { list, players }. ed: the monitor being made or changed { id?, rid, name, reason, ends, zones, nogo }. draft: { kind: 'zones' | 'nogo', pts }
  let D = null, sel = 0, ed = null, draft = null, hover = null, hist = [], timer = 0, flash = null;
  const say = (t, k = '') => { flash = { t, k }; const m = $('monMsg'); if (m) { m.textContent = t; m.className = 'msg ' + k; } };
  const cur = () => D?.list.find(m => m.id === sel);
  const STATE = { in: ['Inside', 'ok'], out: ['Outside their area', 'bad'], nogo: ['In a no-go zone', 'bad'], offline: ['Not in game', ''], '': ['Waiting', ''] };
  const extent = m => [...m.zones.flat(), ...m.nogo.flat(), ...(m.x != null ? [[m.x, m.z]] : [])];

  // ── the map ──
  const poly = (pts, at, parent) => el('polygon', { points: pts.map(p => p.join(',')).join(' '), 'vector-effect': 'non-scaling-stroke', ...at }, parent);
  const label = (x, y, t, parent) => { el('text', { x, y, 'text-anchor': 'middle', 'font-size': 12 * px(), 'font-weight': 600, fill: '#fff', 'paint-order': 'stroke', stroke: '#0d1416', 'stroke-width': 3 * px(), 'pointer-events': 'none' }, parent).textContent = t; };
  const areasNow = () => ed ? [...ed.zones.map((p, i) => ({ pts: p, c: OK, kind: 'zones', i })), ...ed.nogo.map((p, i) => ({ pts: p, c: BAD, kind: 'nogo', i }))]
    : cur() ? [...cur().zones.map(p => ({ pts: p, c: OK })), ...cur().nogo.map(p => ({ pts: p, c: BAD }))] : [];
  const draw = () => { for (const g of [gA, gD, gP]) g.textContent = ''; if (!D) return; const r = 6 * px();
    for (const a of areasNow()) { poly(a.pts, { fill: a.c, 'fill-opacity': .2, stroke: a.c, 'stroke-width': 2.5, 'pointer-events': 'none' }, gA);
      if (ed && !draft) a.pts.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r, fill: '#0d1416', stroke: a.c, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke', 'data-kind': a.kind, 'data-i': a.i, 'data-k': k, style: 'cursor:move' }, gA)); }
    if (draft) { const c = draft.kind === 'nogo' ? BAD : OK, pts = hover ? [...draft.pts, hover] : draft.pts;
      el('polyline', { points: pts.map(p => p.join(',')).join(' '), fill: c, 'fill-opacity': .1, stroke: c, 'stroke-width': 2, 'stroke-dasharray': '7 5', 'vector-effect': 'non-scaling-stroke' }, gD);
      draft.pts.forEach((q, k) => el('circle', { cx: q[0], cy: q[1], r: k ? r * .8 : r * 1.3, fill: k ? c : '#0d1416', stroke: c, 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, gD)); }
    // the person: live when they are in game, otherwise where they were last seen (faded)
    const rid = ed?.rid || cur()?.rid, live = D.players.find(p => p.rid === rid), m = !ed && cur(), at = live || (m && m.x != null ? { x: m.x, z: m.z, name: m.name } : null);
    if (at) { el('circle', { cx: at.x, cy: at.z, r: r * 1.2, fill: '#fff', 'fill-opacity': live ? 1 : .45, stroke: '#0d1416', 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke', 'pointer-events': 'none' }, gP);
      label(at.x, at.z - r * 2.4, live ? live.name : at.name + ', last seen', gP); }
    svg.classList.toggle('drawing', !!draft); hint(); };
  const hint = () => { $('monHint').innerHTML = draft ? `<span>${draft.pts.length < 3 ? 'Click to place corners.' : 'Click the first corner, or Finish area, to close it.'} Esc cancels.</span><button type="button" class="bt" data-act="undo"${draft.pts.length ? '' : ' disabled'}>Undo corner</button><button type="button" class="go" data-act="finish"${draft.pts.length >= 3 ? '' : ' disabled'}>Finish area</button>`
    : ed && (ed.zones.length || ed.nogo.length) ? '<span>Drag a corner to move it. Remove an area from the list.</span>' : ''; };

  // dragging a corner moves it; anything else pans the map, and a click without a drag places a corner
  let drag = null;
  svg.addEventListener('pointerdown', e => { if (e.button !== 0 && e.button !== 1) return; const t = e.target;
    drag = t.dataset.k != null && ed && !draft ? { kind: t.dataset.kind, i: +t.dataset.i, k: +t.dataset.k } : { pan: [e.clientX, e.clientY, vb[0], vb[1]], at: toMap(e), moved: false };
    svg.setPointerCapture(e.pointerId); });
  svg.addEventListener('pointermove', e => { const m = toMap(e); if (draft && !drag?.moved) { hover = m; draw(); } if (!drag) return;
    if (drag.pan) { const dx = e.clientX - drag.pan[0], dy = e.clientY - drag.pan[1]; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) { vb[0] = drag.pan[2] - dx * px(); vb[1] = drag.pan[3] - dy * px(); setVB(); } return; }
    ed[drag.kind][drag.i][drag.k] = m; draw(); });
  svg.addEventListener('pointerup', () => { const d = drag; drag = null; if (d?.pan && !d.moved && draft) { const f = draft.pts[0];
    if (draft.pts.length >= 3 && Math.hypot(d.at[0] - f[0], d.at[1] - f[1]) < 12 * px()) finish(); else { draft.pts.push(d.at); draw(); } } });
  svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, toMap(e)); }, { passive: false });
  const finish = () => { if (draft && draft.pts.length >= 3) ed[draft.kind].push(draft.pts); draft = null; hover = null; drawSide(); draw(); };
  dlg.addEventListener('keydown', e => { if (e.key === 'Escape' && draft) { e.preventDefault(); draft = null; drawSide(); draw(); } });

  // ── the side panel ──
  const row = m => { const s = STATE[m.state] || STATE['']; return `<div class="it${m.id === sel ? ' sel' : ''}" data-mon="${m.id}"><i style="background:${s[1] === 'bad' ? BAD : s[1] === 'ok' ? OK : '#62666D'}"></i><div><b>${esc(m.name)}</b><small>${esc(m.reason || 'No reason given')}${m.ends ? ' · until ' + day(m.ends) : ''}</small></div><span class="tag ${s[1]}">${s[0]}</span></div>`; };
  const areaList = (kind, name) => ed[kind].map((p, i) => `<div class="it"><i style="background:${kind === 'nogo' ? BAD : OK}"></i><b>${name} ${i + 1}</b><button type="button" class="wt-x" data-area-rm="${kind}:${i}" aria-label="Remove ${name} ${i + 1}">&times;</button></div>`).join('');
  const localDay = t => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const editor = () => `<p class="sub">Draw where they may go in green, and any places they must keep out of in red. Dispatch is alerted when they leave their area, go into a no-go zone, or come back.</p>
    <h3>${ed.id ? 'Change ' + esc(ed.name) + '’s monitor' : 'New ankle monitor'}</h3>
    ${ed.id ? '' : `<label>Person<div class="mon-pick"><input id="monWho" placeholder="Type their Roblox name" value="${esc(ed.name)}" autocomplete="off"><ul id="monWhoList" hidden></ul></div></label>`}
    <label>Reason<input id="monWhy" maxlength="200" placeholder="House arrest, probation…" value="${esc(ed.reason)}"></label>
    <label>Last day (optional)<input type="date" id="monEnds" min="${localDay(Date.now())}" value="${ed.ends ? localDay(ed.ends) : ''}"></label>
    <h3>Where they may go</h3><div class="list">${areaList('zones', 'Area')}</div><button type="button" class="bt" data-draw="zones"${draft ? ' disabled' : ''}>Draw where they may go</button>
    <h3>Places they must keep out of</h3><div class="list">${areaList('nogo', 'No-go zone')}</div><button type="button" class="bt" data-draw="nogo"${draft ? ' disabled' : ''}>Draw a no-go zone</button>
    <span class="msg" id="monMsg" role="status"></span><div class="row" style="justify-content:flex-end"><button type="button" class="bt" data-act="cancel">Cancel</button><button type="button" class="go" data-act="save"${draft ? ' disabled' : ''}>${ed.id ? 'Save' : 'Put on monitor'}</button></div>`;
  const overview = () => { const m = cur(); return `<p class="sub">Dispatch and police are alerted when someone on a monitor leaves their area, goes into a no-go zone, or comes back.</p>
    <div class="row"><button type="button" class="go" data-act="new">New monitor</button><span class="msg" id="monMsg" role="status"></span></div>
    <div class="list">${D.list.length ? D.list.map(row).join('') : '<p class="empty">Nobody is on a monitor.</p>'}</div>
    ${m ? `<h3>${esc(m.name)}</h3><p class="sub">${m.where ? 'Last seen ' + esc(m.where) + (m.seen ? ' at ' + hhmm(m.seen) : '') + '. ' : ''}Put on by ${esc(m.by || 'someone')} ${when(m.created)}.</p>
      <div class="row"><button type="button" class="bt" data-act="edit">Change areas</button><button type="button" class="bt bad" data-act="remove">Take off</button></div>
      <h3>Log</h3><div class="log">${hist.length ? hist.map(h => `<div><time>${when(h.at)}</time><span class="${h.kind === 'out' || h.kind === 'nogo' ? 'bad' : ''}">${esc(h.text)}</span></div>`).join('') : '<p class="empty">Nothing yet.</p>'}</div>` : ''}`; };
  const drawSide = () => { side.innerHTML = `<div class="wt-top"><h2>Ankle monitors</h2><button type="button" class="wt-x" data-act="close" aria-label="Close">&times;</button></div>${ed ? editor() : overview()}`;
    if (flash) { const m = $('monMsg'); if (m) { m.textContent = flash.t; m.className = 'msg ' + flash.k; } } };

  // ── loading, and keeping people and states fresh while it's open ──
  const load = async () => { try { D = await call(''); if (sel && !D.list.some(m => m.id === sel)) sel = 0; return true; } catch (x) { side.innerHTML = `<p class="sub">${esc(x.message)}</p>`; return false; } };
  const loadHist = async () => { try { hist = sel ? (await call('/history?id=' + sel)).history : []; } catch (x) { hist = []; } };
  const tick = async () => { if (!dlg.open) return; if (!ed && !drag && await load()) { await loadHist(); drawSide(); draw(); } timer = setTimeout(tick, 10000); };
  window.ovMonitors = async id => { ed = null; draft = null; flash = null; if (!dlg.open) dlg.showModal(); side.innerHTML = '<p class="sub">Loading…</p>'; if (!await load()) return;
    if (id) sel = +id; await loadHist(); drawSide(); fitTo(cur() ? extent(cur()) : []); clearTimeout(timer); timer = setTimeout(tick, 10000); };
  dlg.addEventListener('close', () => { clearTimeout(timer); ed = null; draft = null; });

  // ── the panel's buttons ──
  let whoT = 0;
  dlg.addEventListener('input', e => { const t = e.target;
    if (t.id === 'monWhy') ed.reason = t.value; if (t.id === 'monEnds') ed.ends = t.value ? new Date(t.value + 'T23:59:00').getTime() : null;
    if (t.id === 'monWho') { ed.rid = ''; ed.name = t.value; clearTimeout(whoT); whoT = setTimeout(async () => { const ul = $('monWhoList'); if (!ul) return; const v = t.value.trim(); if (!v) { ul.hidden = true; return; }
      try { const P = (await call('/people?q=' + encodeURIComponent(v))).people; ul.innerHTML = P.length ? P.map(p => `<li><button type="button" data-who="${esc(p.rid)}" data-name="${esc(p.name)}">${esc(p.name)}</button></li>`).join('') : '<li><button type="button" disabled>Nobody by that name has been seen in game</button></li>'; ul.hidden = false; } catch (x) {} }, 250); } });
  dlg.addEventListener('click', async e => { const t = e.target.closest('button,[data-mon]'); if (!t) { if (e.target === dlg) dlg.close(); return; } const a = t.dataset.act;
    if (a === 'close') return dlg.close();
    if (t.dataset.z) return t.dataset.z === 'fit' ? fitTo([]) : zoom(t.dataset.z === 'in' ? 1 / 1.4 : 1.4);
    if (a === 'undo') { draft.pts.pop(); return draw(); } if (a === 'finish') return finish();
    if (t.dataset.mon) { sel = +t.dataset.mon; flash = null; await loadHist(); drawSide(); fitTo(extent(cur())); return; }
    if (a === 'new') { ed = { rid: '', name: '', reason: '', ends: null, zones: [], nogo: [] }; flash = null; drawSide(); draw(); $('monWho')?.focus(); return; }
    if (a === 'edit') { const m = cur(); ed = { id: m.id, rid: m.rid, name: m.name, reason: m.reason, ends: m.ends, zones: m.zones.map(p => p.map(q => [...q])), nogo: m.nogo.map(p => p.map(q => [...q])) }; flash = null; drawSide(); draw(); return; }
    if (a === 'cancel') { ed = null; draft = null; flash = null; drawSide(); draw(); return; }
    if (t.dataset.who) { ed.rid = t.dataset.who; ed.name = t.dataset.name; drawSide(); const p = D.players.find(x => x.rid === ed.rid); if (p) fitTo([[p.x, p.z]]); else draw(); return; }
    if (t.dataset.draw) { draft = { kind: t.dataset.draw, pts: [] }; drawSide(); draw(); return; }
    if (t.dataset.areaRm) { const [k, i] = t.dataset.areaRm.split(':'); ed[k].splice(+i, 1); drawSide(); draw(); return; }
    if (a === 'save') { if (!ed.rid) { say('Pick the person from the list.', 'err'); return; } t.disabled = true;
      try { const j = await call('/save', ed); D.list = j.list; sel = j.monitor.id; ed = null; await loadHist(); say('Monitor on. Dispatch is alerted when they leave their area.', 'ok'); drawSide(); draw(); } catch (x) { say(x.message, 'err'); t.disabled = false; } return; }
    if (a === 'remove') { const m = cur(); if (!confirm(`Take ${m.name}'s ankle monitor off?`)) return;
      try { const j = await call('/remove', { id: m.id }); D.list = j.list; sel = 0; hist = []; say('Taken off.', 'ok'); drawSide(); draw(); } catch (x) { say(x.message, 'err'); } } });

  // ── where to open it: Dispatch's map controls, and the police MDT's BOLOs ──
  const ctl = document.querySelector('.mapctl'); if (ctl) { const b = document.createElement('button'); b.type = 'button'; b.className = 'mon-open';
    b.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M1 10.1C1 8.4 5.9 7 12 7s11 1.4 11 3.1v3.75c0 1.05-2.3 1.85-5.44 2.1v-3.71c2.84-.29 5.04-1.04 5.04-1.91 0-1.23-4.8-2.15-10.6-2.15S1.4 9.1 1.4 10.33c0 .87 2.2 1.62 5.04 1.91v3.71C3.3 15.7 1 14.9 1 13.85z"/><rect x="6.8" y="11.77" width="1.1" height="4.67" rx=".5"/><rect x="16.1" y="11.77" width="1.1" height="4.67" rx=".5"/><rect x="8.13" y="11" width="7.74" height="6.02" rx="1"/></svg>';
    b.setAttribute('aria-label', 'Ankle monitors'); b.title = 'Ankle monitors'; b.addEventListener('click', () => window.ovMonitors()); ctl.appendChild(b); }
  const nb = document.querySelector('[data-pane="bolos"] .thead [data-new="bolo"]'); if (nb) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn mon-open'; b.textContent = 'Ankle monitors';
    b.style.marginRight = '8px'; b.addEventListener('click', () => window.ovMonitors()); nb.before(b); }
})();
