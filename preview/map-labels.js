// Street names and postal numbers on the 2D map ("2D Labels" style) as their own layer, so they stay readable at every zoom:
// small enough not to crowd the whole-county view, a little bigger as you zoom in, never the giant letters a picture with the
// names painted on turns into. The labels are cut out of the owner's labeled map by build-labels.py (map-labels.webp and .json),
// so they read exactly like it, and are drawn on one canvas over the map, like the unit pins. Where two would land on top of
// each other, the bigger one is drawn.
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
  // how big a label is on screen for a zoom (s: screen pixels per map unit; the whole county fits around 0.7): readable when
  // zoomed out, gently bigger closer in. 1 = the label at the 5355-pixel map's own size.
  const scaleFor = s => Math.min(.62, Math.max(.36, .42 * Math.pow(s / .75, .3)));
  let st = [0, 0, 1];
  const draw = (tx, ty, s) => { st = [tx, ty, s]; if (!on || !L || !sheet || document.body.classList.contains('mode-3d')) { if (cv && last) { ctx.clearRect(0, 0, cv.width, cv.height); last = ''; } return; }
    const c = canvas(); if (!c) return; const dpr = Math.min(2, devicePixelRatio || 1), W = innerWidth, H = innerHeight;
    const key = `${tx.toFixed(1)},${ty.toFixed(1)},${s.toFixed(4)},${W},${H},${dpr}`; if (key === last) return; last = key;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H); ctx.imageSmoothingQuality = 'high';
    const k = scaleFor(s), taken = [], cell = 64, grid = new Map();
    const hit = (x0, y0, x1, y1) => { for (let gx = Math.floor(x0 / cell); gx <= Math.floor(x1 / cell); gx++) for (let gy = Math.floor(y0 / cell); gy <= Math.floor(y1 / cell); gy++)
      for (const r of grid.get(gx + ',' + gy) || []) { const ox = Math.min(x1, r[2]) - Math.max(x0, r[0]), oy = Math.min(y1, r[3]) - Math.max(y0, r[1]); if (ox > 2 && oy > 2) return true; } return false; };
    for (const [x, y, w, h, sx, sy] of L) { const cx = tx + x * s, cy = ty + y * s, dw = w * k, dh = h * k, x0 = cx - dw / 2, y0 = cy - dh / 2;
      if (x0 > W || y0 > H || x0 + dw < 0 || y0 + dh < 0 || hit(x0, y0, x0 + dw, y0 + dh)) continue;
      const r = [x0, y0, x0 + dw, y0 + dh]; taken.push(r);
      for (let gx = Math.floor(r[0] / cell); gx <= Math.floor(r[2] / cell); gx++) for (let gy = Math.floor(r[1] / cell); gy <= Math.floor(r[3] / cell); gy++) { const g = gx + ',' + gy; if (!grid.has(g)) grid.set(g, []); grid.get(g).push(r); }
      ctx.drawImage(sheet, sx, sy, w, h, x0, y0, dw, dh); } };
  window.mapLabels = {
    // show(true) loads the labels the first time; ready() says whether the plain map can be shown under them
    show: v => { on = !!v; if (on && !L) load().then(ok => { if (ok && on) { window.map2d?.setTheme?.('labels'); last = ''; draw(...st); } }); last = ''; draw(...st); },
    ready: () => !!(L && sheet), draw };
  addEventListener('resize', () => { last = ''; draw(...st); });
})();
// the page may have picked "2D Labels" before this loaded
if (document.body.classList.contains('theme-labels')) window.mapLabels.show(true);
