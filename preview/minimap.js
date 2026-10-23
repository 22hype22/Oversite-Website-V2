// A small map for panels that need one (Transit routes and the bus tracker, hospital places): the official ER:LC map picture with
// a layer to draw on, dragging to pan, the wheel and +/- to zoom, and a click handler that gets map pixels (5355 across, like
// ER:LC's own positions). It never pans or zooms past the edge of the map. off: the server's map offset (mapOff on the server).
// ovMiniMap(box, { off, onClick, onDraw }) -> { g, el, px, toMap, fit, fitTo, redraw, view (get or set the view, to keep it across redraws) }
(() => { if (window.ovMiniMap) return; const SIZE = 5355, NS = 'http://www.w3.org/2000/svg';
  const css = document.createElement('style'); css.textContent = `.ovmm{position:relative;overflow:hidden;border-radius:12px;background:#3E6972;touch-action:none;user-select:none}
.ovmm svg{display:block;width:100%;height:100%;cursor:grab}.ovmm svg.pick{cursor:crosshair}.ovmm.drag svg{cursor:grabbing}
.ovmm .ovmm-z{position:absolute;right:8px;top:8px;display:flex;flex-direction:column;border-radius:9px;overflow:hidden;border:1px solid rgba(255,255,255,.14);background:rgba(13,20,22,.88)}
.ovmm .ovmm-z button{width:30px;height:30px;border:0;background:none;color:#E9EAEC;font:600 15px/1 inherit;cursor:pointer}.ovmm .ovmm-z button+button{border-top:1px solid rgba(255,255,255,.1)}
.ovmm .ovmm-z button:hover{background:rgba(255,255,255,.08)}`; document.head.appendChild(css);
  window.ovMiniMap = (box, o = {}) => { box.classList.add('ovmm'); box.innerHTML = `<svg preserveAspectRatio="xMidYMid slice"></svg><div class="ovmm-z"><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="out" aria-label="Zoom out">&minus;</button><button type="button" data-z="fit" aria-label="Show the whole map">&#x2922;</button></div>`;
    const svg = box.querySelector('svg'), el = (tag, at = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.appendChild(e); return e; };
    const img = el('image', { href: '/liberty-county.jpg', width: SIZE, height: SIZE, preserveAspectRatio: 'none', x: -(o.off?.[0] || 0), y: -(o.off?.[1] || 0) }, svg), g = el('g', {}, svg);
    let vb = [0, 0, SIZE, SIZE];
    const px = () => vb[2] / (svg.clientWidth || 400);
    const setVB = () => { const w = Math.min(SIZE, vb[2]), cw = svg.clientWidth || 1, ch = svg.clientHeight || 1, sx = w * (1 - Math.min(1, cw / ch)) / 2, sy = w * (1 - Math.min(1, ch / cw)) / 2, lim = (v, s) => Math.max(-s, Math.min(SIZE - w + s, v));
      vb = [lim(vb[0], sx), lim(vb[1], sy), w, w]; svg.setAttribute('viewBox', vb.map(v => v.toFixed(1)).join(' ')); };
    const redraw = () => { setVB(); o.onDraw && o.onDraw(px()); };
    const toMap = e => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; const q = p.matrixTransform(svg.getScreenCTM().inverse()); return [Math.round(q.x * 10) / 10, Math.round(q.y * 10) / 10]; };
    const zoom = (f, at) => { const [cx, cy] = at || [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2], w = Math.min(SIZE, Math.max(160, vb[2] * f)); vb = [cx - (cx - vb[0]) * w / vb[2], cy - (cy - vb[1]) * w / vb[3], w, w]; redraw(); };
    const fit = () => { vb = [0, 0, SIZE, SIZE]; redraw(); }, fitTo = (x, z, w) => { vb = [x - w / 2, z - w / 2, w, w]; redraw(); };
    let drag = null;
    svg.addEventListener('pointerdown', e => { if (e.button !== 0 && e.button !== 1) return; drag = { x: e.clientX, y: e.clientY, v0: vb[0], v1: vb[1], at: toMap(e), moved: false, t: e.target }; svg.setPointerCapture(e.pointerId); });
    svg.addEventListener('pointermove', e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; box.classList.add('drag'); }
      if (drag.moved) { vb[0] = drag.v0 - dx * px(); vb[1] = drag.v1 - dy * px(); setVB(); } });
    svg.addEventListener('pointerup', () => { const d = drag; drag = null; box.classList.remove('drag'); if (d && !d.moved && o.onClick) o.onClick(d.at, d.t); });
    svg.addEventListener('wheel', e => { e.preventDefault(); zoom(e.deltaY > 0 ? 1.2 : 1 / 1.2, toMap(e)); }, { passive: false });
    box.querySelector('.ovmm-z').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; b.dataset.z === 'fit' ? fit() : zoom(b.dataset.z === 'in' ? 1 / 1.4 : 1.4); });
    if (window.ResizeObserver) new ResizeObserver(() => redraw()).observe(box);
    setVB(); return { g, el: (t, a, p) => el(t, a, p || g), svg, px, toMap, fit, fitTo, redraw, view: v => { if (!v) return [...vb]; vb = [...v]; redraw(); }, setOff: off => { img.setAttribute('x', -(off?.[0] || 0)); img.setAttribute('y', -(off?.[1] || 0)); } }; };
})();
