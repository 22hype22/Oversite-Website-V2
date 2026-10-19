// Street names and postal numbers on the 2D map ("2D Labels" style) as their own layer: each is pinned to its spot and grows and
// shrinks with the map as you zoom, like part of it, but never gets too small to read zoomed out or bigger than the map's own
// lettering up close. The labels are cut out of the owner's labeled map by build-labels.py (map-labels.webp and .json), so they
// read exactly like it, and are drawn on one canvas over the map, like the unit pins. Where two would land on top of each other,
// the bigger one is drawn.
(() => {
  const DATA = '/map-labels.json?v=1', SHEET = '/map-labels.webp?v=1';
  let L = null, sheet = null, on = false, cv = null, ctx = null, last = '', loading = null;
  const load = () => loading || (loading = Promise.all([
    fetch(DATA).then(r => { if (!r.ok) throw new Error('labels ' + r.status); return r.json(); }),
    new Promise((ok, bad) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = bad; i.src = SHEET; })])
    .then(([j, i]) => { L = j.labels.slice().sort((a, b) => b[2] * b[3] - a[2] * a[3]); sheet = i; return true; })
    .catch(e => { console.warn('map labels:', e.message || e); loading = null; return false; }));
  // right over the map picture, under the vignette, the unit pins and every panel
  const canvas = () => { if (cv) return cv; const world = document.getElementById('world'); if (!world) return null;
    cv = document.createElement('canvas'); cv.className = 'map-labels'; cv.setAttribute('aria-hidden', 'true');
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none';
    world.after(cv); ctx = cv.getContext('2d'); return cv; };
  // how big a label is on screen for a zoom (s: screen pixels per map unit; the whole county fits around 0.7). Labels grow and
  // shrink with the map like part of it (1 = the label at the 5355-pixel map's own size), but never so small they can't be read
  // zoomed out, nor bigger than the map's own lettering up close.
  const scaleFor = s => Math.min(1, Math.max(.34, s * .5));
  // which labels show is worked out once the zoom settles (the bigger of two that would overlap wins), never while it's
  // changing, so nothing pops in and out mid-zoom; every label is pinned to its own spot on the map
  let st = [0, 0, 1], shown = null, shownFor = 0, settle = 0;
  const pick = s => { const k = scaleFor(s), cell = 64, grid = new Map(), out = new Set();
    const cells = (x0, y0, x1, y1, f) => { for (let gx = Math.floor(x0 / cell); gx <= Math.floor(x1 / cell); gx++) for (let gy = Math.floor(y0 / cell); gy <= Math.floor(y1 / cell); gy++) f(gx + ',' + gy); };
    L.forEach(([x, y, w, h], i) => { const dw = w * k + 4, dh = h * k + 4, x0 = x * s - dw / 2, y0 = y * s - dh / 2, x1 = x0 + dw, y1 = y0 + dh; let clash = false;
      cells(x0, y0, x1, y1, g => { if (!clash) for (const r of grid.get(g) || []) if (Math.min(x1, r[2]) - Math.max(x0, r[0]) > 0 && Math.min(y1, r[3]) - Math.max(y0, r[1]) > 0) { clash = true; break; } });
      if (clash) return; out.add(i); const r = [x0, y0, x1, y1]; cells(x0, y0, x1, y1, g => { if (!grid.has(g)) grid.set(g, []); grid.get(g).push(r); }); });
    shown = out; shownFor = s; };
  const draw = (tx, ty, s) => { st = [tx, ty, s]; if (!on || !L || !sheet || document.body.classList.contains('mode-3d')) { if (cv && last) { ctx.clearRect(0, 0, cv.width, cv.height); last = ''; } return; }
    const c = canvas(); if (!c) return; const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    const key = `${tx.toFixed(1)},${ty.toFixed(1)},${s.toFixed(4)},${W},${H},${dpr}`; if (key === last) return; last = key;
    if (!shown) pick(s);
    else if (Math.abs(s - shownFor) > 1e-4) { clearTimeout(settle); settle = setTimeout(() => { pick(st[2]); last = ''; draw(...st); }, 160); }
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingQuality = 'high';
    const k = scaleFor(s);
    for (const i of shown) { const [x, y, w, h, sx, sy] = L[i], dw = w * k, dh = h * k, x0 = tx + x * s - dw / 2, y0 = ty + y * s - dh / 2;
      if (x0 > W || y0 > H || x0 + dw < 0 || y0 + dh < 0) continue;
      ctx.drawImage(sheet, sx, sy, w, h, x0, y0, dw, dh); } };
  window.mapLabels = {
    // show(true) loads the labels the first time; ready() says whether the plain map can be shown under them
    show: v => { on = !!v; if (on && !L) load().then(ok => { if (ok && on) { window.map2d?.setTheme?.('labels'); last = ''; draw(...st); } }); last = ''; draw(...st); },
    ready: () => !!(L && sheet), draw };
  addEventListener('resize', () => { last = ''; draw(...st); });
})();
// the page may have picked "2D Labels" before this loaded
if (document.body.classList.contains('theme-labels')) window.mapLabels.show(true);
