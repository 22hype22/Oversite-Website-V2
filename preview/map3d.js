// The 3D map: the county as a real 3D model (county-3d.glb, slimmed from the map maker's file: shared corners, instanced trees,
// compressed geometry, WebP textures), shown on Dispatch when someone picks "3D" under the map style button. Nothing loads until
// then. It sits on the same grid as the 2D map (0..2000 world units across the 5355 px map picture; the model was fitted to that
// picture), so units, calls and "show on map" land in the same place. To stay smooth it only draws when something changes (the
// camera, a unit moving), draws trees only near where you're looking and none when zoomed far out, and slows right down behind an MDT.
(() => { if ((window.OVERSITE?.features || {}).map3d === false) return;
  const W = 2000, G2M = 2000 / 5355;
  // model studs (x, z) -> map picture px: fitted against the 2D map (rotated 90°, 1.784 px per stud, about 2 px of error)
  const T = [[-0.0011413780966303944, 1.7843755016895013, 2703.5939632620157], [-1.7843755016895013, -0.0011413780966303944, 2677.872768040358]];
  const view = document.getElementById('view'); if (!view) return;
  const box = document.createElement('div'); box.className = 'view3d'; box.id = 'view3d'; view.insertBefore(box, view.querySelector('.vig'));
  const tags = document.createElement('div'); tags.className = 'tags3d'; box.appendChild(tags);
  const note = document.createElement('div'); note.className = 'load3d'; note.hidden = true; box.appendChild(note);
  const css = document.createElement('style'); css.textContent = `.view3d .tags3d{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.view3d .t3{position:absolute;left:0;top:0;transform:translate(-50%,-130%);white-space:nowrap;font-size:11px;font-weight:600;padding:2px 7px;border-radius:999px;background:rgba(13,14,16,.82);color:#F0F2F5;border:1px solid rgba(255,255,255,.14)}
.view3d .t3 i{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px;vertical-align:1px}.view3d .t3.call{background:rgba(120,20,20,.9);border-color:rgba(255,120,120,.4)}
.view3d .load3d{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);padding:14px 18px;border-radius:14px;background:rgba(13,14,16,.9);color:#C9CDD3;font-size:13px;text-align:center;min-width:220px}
.view3d .load3d b{display:block;color:#F0F2F5;font-size:14px;margin-bottom:6px}.view3d .load3d i{display:block;height:4px;border-radius:2px;background:rgba(255,255,255,.1);margin-top:10px;overflow:hidden}.view3d .load3d i>span{display:block;height:100%;background:#F0F2F5;width:0}`;
  document.head.appendChild(css);
  const say = (t, sub, pct) => { note.hidden = !t; if (t) note.innerHTML = `<b>${t}</b>${sub || ''}${pct != null ? `<i><span style="width:${Math.round(pct * 100)}%"></span></i>` : ''}`; };

  let S = null, loading = null, active = false, theme = 'light';
  const load = () => loading ||= (async () => {
    say('Loading the 3D map…', 'About 25 MB the first time, then it’s cached.', 0);
    const THREE = await import('/vendor/three.module.js'), { GLTFLoader } = await import('/vendor/loaders/GLTFLoader.js'),
      { OrbitControls } = await import('/vendor/controls/OrbitControls.js'), { MeshoptDecoder } = await import('/vendor/libs/meshopt_decoder.module.js');
    const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio <= 1, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.outputColorSpace = THREE.SRGBColorSpace; box.insertBefore(renderer.domElement, tags);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1d2a30); scene.fog = new THREE.Fog(0x1d2a30, 2600, 6000);
    const hemi = new THREE.HemisphereLight(0xdfe8f2, 0x56544c, 1.5), sun = new THREE.DirectionalLight(0xfff3e0, 1.6); sun.position.set(-600, 1400, 400); scene.add(hemi, sun);
    const camera = new THREE.PerspectiveCamera(45, 1, 2, 9000), controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.14; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 25; controls.maxDistance = 2600;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE }; controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.screenSpacePanning = false; controls.panSpeed = 1.1;
    const gltf = await new Promise((ok, no) => { const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
      L.load('/county-3d.glb', ok, e => { if (e.total) say('Loading the 3D map…', `${Math.round(e.loaded / 1e6)} of ${Math.round(e.total / 1e6)} MB`, e.loaded / e.total); }, no); });
    say('Building the 3D map…', '', 1);
    // the model on the 2D map's grid
    const s = G2M * Math.hypot(T[0][0], T[1][0]), root = new THREE.Group(); root.matrixAutoUpdate = false;
    root.matrix.set(G2M * T[0][0], 0, G2M * T[0][1], G2M * T[0][2], 0, s, 0, 0, G2M * T[1][0], 0, G2M * T[1][1], G2M * T[1][2], 0, 0, 0, 1);
    root.add(gltf.scene); scene.add(root); root.updateMatrixWorld(true);
    // heights: the highest ground, road or bridge deck in each cell, so units and calls sit on top of what's there
    const HN = 512, hgt = new Float32Array(HN * HN).fill(-1e9), v = new THREE.Vector3(); let sea = 0;
    gltf.scene.traverse(o => { if (!o.isMesh || o.isInstancedMesh) return; const n = o.name + ' ' + (o.parent?.name || ''); if (/ocean/i.test(n)) { o.geometry.computeBoundingBox(); sea = o.geometry.boundingBox.getCenter(v).applyMatrix4(o.matrixWorld).y; }
      if (!/Terrain|Road|Bridge decks|Tunnel/i.test(n)) return; const p = o.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld); const ix = Math.floor(v.x / W * HN), iz = Math.floor(v.z / W * HN); if (ix < 0 || iz < 0 || ix >= HN || iz >= HN) continue; const k = iz * HN + ix; if (v.y > hgt[k]) hgt[k] = v.y; } });
    for (let pass = 0; pass < 6; pass++) for (let iz = 0; iz < HN; iz++) for (let ix = 0; ix < HN; ix++) { const k = iz * HN + ix; if (hgt[k] > -1e8) continue; let m = -1e9;   // fill cells no corner landed in
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = ix + dx, z = iz + dz; if (x >= 0 && z >= 0 && x < HN && z < HN && hgt[z * HN + x] > m) m = hgt[z * HN + x]; } if (m > -1e8) hgt[k] = m; }
    const heightAt = (x, z) => { const ix = Math.min(HN - 1, Math.max(0, Math.floor(x / W * HN))), iz = Math.min(HN - 1, Math.max(0, Math.floor(z / W * HN))), h = hgt[iz * HN + ix]; return h > -1e8 ? h : sea; };
    // open water past the model's own sea, so the island never floats in nothing
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshBasicMaterial({ color: 0x3E6972 })); ocean.rotation.x = -Math.PI / 2; ocean.position.set(W / 2, sea - 0.3, W / 2); scene.add(ocean);
    // trees: kept per kind with every position; only the ones near where you're looking are drawn, none when zoomed far out
    const trees = []; gltf.scene.traverse(o => { if (!o.isInstancedMesh) return; o.frustumCulled = false; const all = o.instanceMatrix.array.slice(), pos = new Float32Array(o.count * 2), m = new THREE.Matrix4();
      for (let i = 0; i < o.count; i++) { m.fromArray(all, i * 16).premultiply(o.matrixWorld); pos[i * 2] = m.elements[12]; pos[i * 2 + 1] = m.elements[14]; } trees.push({ o, all, pos, n: o.count }); });
    let treeKey = '';
    const cullTrees = () => { const t = controls.target, d = camera.position.distanceTo(t), far = d > 1300, R = Math.min(1150, Math.max(300, d * 1.5)), key = far ? 'far' : `${Math.round(t.x / 40)},${Math.round(t.z / 40)},${Math.round(R / 60)}`;
      if (key === treeKey) return; treeKey = key;
      for (const T2 of trees) { if (far) { T2.o.visible = false; continue; } T2.o.visible = true; const a = T2.o.instanceMatrix.array; let k = 0;
        for (let i = 0; i < T2.n; i++) { const dx = T2.pos[i * 2] - t.x, dz = T2.pos[i * 2 + 1] - t.z; if (dx * dx + dz * dz > R * R) continue; a.set(T2.all.subarray(i * 16, i * 16 + 16), k * 16); k++; }
        T2.o.count = k; T2.o.instanceMatrix.needsUpdate = true; } };
    // units and calls: a pin each, with its label in HTML over the map
    const COL = { pd: 0x4C8DFF, fd: 0xE24B4B, dot: 0xE9C24C }, pinGeo = new THREE.CylinderGeometry(0, 2.2, 7, 12), headGeo = new THREE.SphereGeometry(2.6, 14, 10); pinGeo.translate(0, 3.5, 0); headGeo.translate(0, 8.5, 0);
    const pins = new Map(), label = (key, html, cls) => { let el = tags.querySelector(`[data-k="${key}"]`); if (!el) { el = document.createElement('div'); el.className = 't3' + (cls ? ' ' + cls : ''); el.dataset.k = key; tags.appendChild(el); } if (el._h !== html) { el.innerHTML = html; el._h = html; } return el; };
    const pinFor = (key, color) => { let p = pins.get(key); if (!p) { const mat = new THREE.MeshBasicMaterial({ color }); p = new THREE.Group(); p.add(new THREE.Mesh(pinGeo, mat), new THREE.Mesh(headGeo, mat)); scene.add(p); pins.set(key, p); } p.children[0].material.color.setHex(color); return p; };
    const P = new THREE.Vector3(), esc = t => String(t ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const placeMarks = () => { const want = new Set(), grow = Math.min(3.5, Math.max(0.45, camera.position.distanceTo(controls.target) / 520)), w = box.clientWidth, h = box.clientHeight;
      const put = (key, x, z, color, html, cls) => { if (!Number.isFinite(x) || !Number.isFinite(z)) return; want.add(key); const p = pinFor(key, color), y = heightAt(x, z); p.position.set(x, y, z); p.scale.setScalar(grow);
        const el = label(key, html, cls); P.set(x, y + 11 * grow, z).project(camera); const vis = P.z < 1 && Math.abs(P.x) < 1.1 && Math.abs(P.y) < 1.1; el.style.display = vis ? '' : 'none'; if (vis) el.style.transform = `translate(${((P.x + 1) / 2 * w).toFixed(1)}px,${((1 - P.y) / 2 * h).toFixed(1)}px) translate(-50%,-100%)`; };
      for (const u of window.UNITS || []) { if (window.DEPT_FILTER && u.dept !== window.DEPT_FILTER) continue; const c = COL[u.dept] || 0xF0F2F5; put('u:' + (u.id ?? u.name), u.x, u.y, c, `<i style="background:#${c.toString(16).padStart(6, '0')}"></i>${esc(u.name || u.callsign || 'Unit')}`); }
      for (const c of window.CALLS || []) if (c.live !== false) put('c:' + c.startedAt, c.x, c.y, 0xE24B4B, esc(c.type || 'Call'), 'call');
      for (const [k, p] of pins) if (!want.has(k)) { scene.remove(p); pins.delete(k); tags.querySelector(`[data-k="${k}"]`)?.remove(); } };
    // drawing: only when something changed; behind an MDT, rarely
    let raf = 0, lastSig = '';
    const draw = () => { raf = 0; if (!active) return; const moving = controls.update(); cullTrees(); placeMarks(); renderer.render(scene, camera); if (moving) ask(); };
    const ask = () => { if (!raf && active) raf = requestAnimationFrame(draw); };
    controls.addEventListener('change', ask);
    setInterval(() => { if (!active || document.hidden) return; const sig = (window.UNITS || []).map(u => `${u.x | 0},${u.y | 0}`).join(';') + '|' + (window.CALLS || []).length;   // units moved: draw again
      if (sig !== lastSig && !(document.body.classList.contains('mdt-open') && Date.now() % 2000 > 300)) { lastSig = sig; ask(); } }, 250);
    const resize = () => { const w = box.clientWidth || innerWidth, h = box.clientHeight || innerHeight; renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = w / h; camera.updateProjectionMatrix(); ask(); };
    addEventListener('resize', resize); resize();
    // camera moves
    let flight = null; const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const flyTo = (x, z, dist = 420, smooth = true) => { const y = heightAt(x, z), T2 = V3(x, y, z), off = camera.position.clone().sub(controls.target).setLength(dist), P2 = T2.clone().add(off.y < dist * 0.3 ? V3(off.x, dist * 0.7, off.z) : off);
      if (!smooth) { controls.target.copy(T2); camera.position.copy(P2); controls.update(); ask(); return; }
      const T0 = controls.target.clone(), P0 = camera.position.clone(), t0 = performance.now(); flight = true;
      const step = () => { const k = Math.min(1, (performance.now() - t0) / 800), e = 1 - Math.pow(1 - k, 3); controls.target.lerpVectors(T0, T2, e); camera.position.lerpVectors(P0, P2, e); ask(); if (k < 1) requestAnimationFrame(step); else flight = null; }; step(); };
    const overview = () => { controls.target.set(1000, sea, 1060); camera.position.set(1000, 1750, 2200); controls.update(); ask(); };
    const dolly = f => { const d = camera.position.clone().sub(controls.target); camera.position.copy(controls.target).add(d.multiplyScalar(f)); controls.update(); ask(); };
    const setTheme = t => { theme = t; const dark = t === 'dark'; scene.background.setHex(dark ? 0x0f1215 : 0x1d2a30); scene.fog.color.setHex(dark ? 0x0f1215 : 0x1d2a30); hemi.intensity = dark ? 0.75 : 1.5; sun.intensity = dark ? 0.5 : 1.6; ocean.material.color.setHex(dark ? 0x1b2f34 : 0x3E6972); ask(); };
    addEventListener('showcall', e => { const c = e.detail; if (active && c && Number.isFinite(c.x)) flyTo(c.x, c.y, 360); });
    overview(); setTheme(theme); say('');
    // check it can keep up: a weak graphics chip gets told how to go back to 2D
    const t0 = performance.now(); renderer.render(scene, camera); renderer.getContext().finish(); const first = performance.now() - t0;
    if (first > 600) { say('This computer is slow at 3D', 'If the CAD lags, pick 2D under the map style button.'); setTimeout(() => say(''), 7000); }
    S = { ask, flyTo, overview, dolly, setTheme, resize, first, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, trees: trees.reduce((n, t2) => n + (t2.o.visible ? t2.o.count : 0), 0), first }) };
    return S; })().catch(e => { loading = null; say('The 3D map could not load', `${String(e.message || e).slice(0, 120)}<br>Pick 2D under the map style button.`); throw e; });

  window.map3d = {
    setActive: on => { active = !!on; box.style.display = on ? '' : 'none'; if (on) load().then(s => { s.resize(); s.ask(); }).catch(() => {}); },
    setTheme: t => { theme = t; S?.setTheme(t); },
    zoomIn: () => S?.dolly(0.75), zoomOut: () => S?.dolly(1.33), fit: () => S?.overview(), flyTo: (x, y) => S?.flyTo(x, y), info: () => S?.info() };
})();
