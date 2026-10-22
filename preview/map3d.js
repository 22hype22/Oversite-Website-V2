// The 3D map: the county as a real 3D model (county-3d.glb, slimmed from the map maker's file: shared corners, instanced trees,
// compressed geometry, WebP textures), shown on Dispatch when someone picks "3D" under the map style button. Nothing loads until
// then. It sits on the same grid as the 2D map (0..2000 world units across the 5355 px map picture; the model was fitted to that
// picture), so units, calls and "show on map" land in the same place. To stay smooth it only draws when something changes (the
// camera, a unit moving), loads trees chunk by chunk near where you're looking and none when zoomed far out, and slows right down behind an MDT.
// Speed: the county is cut into map tiles, and each tile is drawn at the detail its distance needs: far away, buildings and bridges
// are plain coloured blocks and the ground is coarse; nearer, the real shapes; close up, mid-size parts; right up close, small parts
// like railings. Tiles off screen aren't drawn, surfaces use simple lighting, and if frames still run slow while you move around,
// it steps the detail down by itself (and says so).
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

  let S = null, loading = null, active = false, theme = 'light', THREE_ = null;
  // a much simpler copy of a tree for the chunks further out: about a sixth of its triangles (meshoptimizer's simplifier, run here once)
  const simplifier = async () => { let M = null; try { ({ MeshoptSimplifier: M } = await import('/vendor/libs/meshopt_simplifier.module.js')); await M.ready; } catch (e) { return g => g; }
    return g => { try { const p = g.attributes.position, n = p.count, P = new Float32Array(n * 3); for (let i = 0; i < n; i++) { P[i * 3] = p.getX(i); P[i * 3 + 1] = p.getY(i); P[i * 3 + 2] = p.getZ(i); }
      const I = new Uint32Array(g.index ? g.index.array : [...Array(n).keys()]), want = Math.max(36, Math.floor(I.length / 6 / 3) * 3);
      let [out] = M.simplify(I, P, 3, want, 0.08); if (out.length > want * 1.5) { const [lo] = M.simplifySloppy(I, P, 3, null, want, 0.3); if (lo.length >= 36 && lo.length < out.length) out = lo; }   // leafy trees only shrink the rough way if (!out.length || out.length >= I.length) return g;
      const s2 = new THREE_.BufferGeometry(); for (const k in g.attributes) s2.setAttribute(k, g.attributes[k]);
      if (out.length * 3 < I.length) { g.computeBoundingBox(); const b = g.boundingBox, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;   // the rough copy loses leaves: widen it a little so it reads as full
        for (let i = 0; i < n; i++) { P[i * 3] = cx + (P[i * 3] - cx) * 1.2; P[i * 3 + 1] = b.min.y + (P[i * 3 + 1] - b.min.y) * 1.05; P[i * 3 + 2] = cz + (P[i * 3 + 2] - cz) * 1.2; } s2.setAttribute('position', new THREE_.BufferAttribute(P, 3)); } s2.setIndex(new THREE_.BufferAttribute(n < 65536 ? new Uint16Array(out) : out, 1)); return s2; } catch (e) { return g; } }; };
  const load = () => loading ||= (async () => {
    say('Loading the 3D map…', 'About 30 MB the first time, then it’s cached.', 0);
    const THREE = await import('/vendor/three.module.js'), { GLTFLoader } = await import('/vendor/loaders/GLTFLoader.js'),
      { OrbitControls } = await import('/vendor/controls/OrbitControls.js'), { MeshoptDecoder } = await import('/vendor/libs/meshopt_decoder.module.js'); THREE_ = THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: devicePixelRatio <= 1, powerPreference: 'high-performance' });
    let pr = Math.min(devicePixelRatio, 1); renderer.setPixelRatio(pr); renderer.outputColorSpace = THREE.SRGBColorSpace; box.insertBefore(renderer.domElement, tags);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x1d2a30); scene.fog = new THREE.Fog(0x1d2a30, 2600, 6000);
    const hemi = new THREE.HemisphereLight(0xdfe8f2, 0x56544c, 1.5), sun = new THREE.DirectionalLight(0xfff3e0, 1.6); sun.position.set(-600, 1400, 400); scene.add(hemi, sun);
    const camera = new THREE.PerspectiveCamera(45, 1, 2, 9000), controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.14; controls.maxPolarAngle = Math.PI * 0.47; controls.minDistance = 25; controls.maxDistance = 2600;
    controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE }; controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.screenSpacePanning = false; controls.panSpeed = 1.1;
    const gltf = await new Promise((ok, no) => { const L = new GLTFLoader(); L.setMeshoptDecoder(MeshoptDecoder);
      L.load('/county-3d.glb?v=3', ok, e => { if (e.total) say('Loading the 3D map…', `${Math.round(e.loaded / 1e6)} of ${Math.round(e.total / 1e6)} MB`, e.loaded / e.total); }, no); });
    say('Building the 3D map…', '', 1);
    // the model on the 2D map's grid
    const s = G2M * Math.hypot(T[0][0], T[1][0]), root = new THREE.Group(); root.matrixAutoUpdate = false;
    root.matrix.set(G2M * T[0][0], 0, G2M * T[0][1], G2M * T[0][2], 0, s, 0, 0, G2M * T[1][0], 0, G2M * T[1][1], G2M * T[1][2], 0, 0, 0, 1);
    root.add(gltf.scene); scene.add(root); root.updateMatrixWorld(true);
    // simple lighting instead of the model's physically based surfaces: looks the same from above, costs far less
    const mats = new Map(), cheap = m => { if (!m || m.isMeshLambertMaterial) return m; let c = mats.get(m); const blocks = m.name === 'Far blocks';
      if (!c) mats.set(m, c = new THREE.MeshLambertMaterial({ map: m.map || null, color: m.color, alphaTest: m.alphaTest, transparent: m.transparent, side: blocks ? THREE.DoubleSide : m.side, vertexColors: m.vertexColors, flatShading: blocks })); return c; };
    gltf.scene.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(cheap) : cheap(o.material); });
    // detail levels: "<mesh>|far|big|mid|small|<tile>" parts, chosen by the camera's distance to each; Q is the quality step
    const parts = [], hasFar = new Set(); gltf.scene.traverse(o => { const m = /^(.*)\|(far|big|mid|small)\|(.*)$/.exec(o.name || ''); if (!m || !o.isMesh) return; o.geometry.computeBoundingSphere(); const c = o.geometry.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
      parts.push({ o, level: m[2], key: m[1] + '|' + m[3], c, r: o.geometry.boundingSphere.radius * s }); if (m[2] === 'far') hasFar.add(m[1] + '|' + m[3]); });
    const QS = [{ far: 950, mid: 650, small: 300, trees: 1 }, { far: 600, mid: 380, small: 160, trees: 0.6 }, { far: 330, mid: 200, small: 0, trees: 0 }]; let Q = 0;
    const levels = () => { const cp = camera.position, q = QS[Q]; for (const p of parts) { const d = cp.distanceTo(p.c) - p.r;
      p.o.visible = p.level === 'far' ? d >= q.far : p.level === 'big' ? (!hasFar.has(p.key) || d < q.far) : d < (p.level === 'mid' ? q.mid : q.small); } };
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
    // trees: a chunk loader. The county is cut into squares (chunks) 80 m across; each tree kind keeps its trees grouped by chunk,
    // and only the chunks on screen near where you're looking (or between you and it) are loaded into what's drawn: full trees in the
    // chunks close to the camera, a much simpler copy of each tree (made here, once) in the rest, only a third of those toward the edge,
    // none past that or when zoomed far out. What's drawn is only rebuilt when a chunk loads, unloads or changes ring.
    const CH = 80, CN = Math.ceil(W / CH), NC = CN * CN, cOf = (x, z) => Math.min(CN - 1, Math.max(0, Math.floor(z / CH))) * CN + Math.min(CN - 1, Math.max(0, Math.floor(x / CH)));
    const cLo = new Float32Array(NC).fill(1e9), cHi = new Float32Array(NC).fill(-1e9), trees = [], simple = await simplifier(), list = []; gltf.scene.traverse(o => { if (o.isInstancedMesh) list.push(o); });
    for (const o of list) { o.frustumCulled = false; const src = o.instanceMatrix.array.slice(), m = new THREE.Matrix4(), n = o.count, ch = new Int32Array(n);
      for (let i = 0; i < n; i++) { m.fromArray(src, i * 16).premultiply(o.matrixWorld); const c = ch[i] = cOf(m.elements[12], m.elements[14]), y = m.elements[13]; if (y < cLo[c]) cLo[c] = y; if (y > cHi[c]) cHi[c] = y; }
      // sorted by chunk, and inside each chunk every third tree first, so "a third of this chunk" is just the start of its block
      const order = [...Array(n).keys()].sort((i, j) => ch[i] - ch[j] || (i % 3 ? 1 : 0) - (j % 3 ? 1 : 0) || i - j), all = new Float32Array(n * 16), start = new Int32Array(NC), len = new Int32Array(NC), few = new Int32Array(NC);
      order.forEach((i, k) => { all.set(src.subarray(i * 16, i * 16 + 16), k * 16); const c = ch[i]; if (!len[c]) start[c] = k; len[c]++; if (!(i % 3)) few[c]++; });
      const f = new THREE.InstancedMesh(simple(o.geometry), o.material, n); f.frustumCulled = false; f.visible = false; f.position.copy(o.position); f.quaternion.copy(o.quaternion); f.scale.copy(o.scale); o.parent.add(f);
      trees.push({ o, f, all, n, start, len, few }); }
    root.updateMatrixWorld(true);
    const boxes = []; for (let c = 0; c < NC; c++) if (cHi[c] > -1e8) boxes[c] = new THREE.Box3(new THREE.Vector3(c % CN * CH - 15, cLo[c] - 5, Math.floor(c / CN) * CH - 15), new THREE.Vector3(c % CN * CH + CH + 15, cHi[c] + 45, Math.floor(c / CN) * CH + CH + 15));
    const fr = new THREE.Frustum(), FM = new THREE.Matrix4(), state = new Uint8Array(NC); let chunkSig = '', loaded = 0;   // state: 0 not loaded, 1 a third simple, 2 all simple, 3 all full
    const fill = (mesh, all, pick) => { const a = mesh.instanceMatrix.array; let k = 0;
      for (let c = 0; c < NC; c++) { const m = pick(c); if (!m) continue; a.set(all.subarray(m[0] * 16, (m[0] + m[1]) * 16), k * 16); k += m[1]; }
      mesh.visible = k > 0; mesh.count = k; const im = mesh.instanceMatrix; im.clearUpdateRanges(); if (k) { im.addUpdateRange(0, k * 16); im.needsUpdate = true; } };
    const cullTrees = () => { const t = controls.target, cp = camera.position, d = cp.distanceTo(t), k = QS[Q].trees, far = d > 820 || !k, F = 300 * (k || 1), R = Math.min(520, Math.max(200, d * 0.9)) * (k || 1), R2 = Math.min(760, R * 1.45);   // F: full trees only this close to the camera
      const sx = t.x - cp.x, sz = t.z - cp.z, sl = sx * sx + sz * sz || 1;   // the stretch of ground from under the camera to where it looks
      camera.updateMatrixWorld(); fr.setFromProjectionMatrix(FM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)); let sig = Q + ':'; loaded = 0;
      for (let c = 0; c < NC; c++) { let st = 0; const bx = boxes[c];
        if (bx && !far) { const x = (c % CN + 0.5) * CH, z = (Math.floor(c / CN) + 0.5) * CH, u = Math.min(1, Math.max(0, ((x - cp.x) * sx + (z - cp.z) * sz) / sl)), cd = Math.max(0, Math.hypot(x - cp.x - u * sx, z - cp.z - u * sz) - CH * 0.71);
          if (cd < R2 && fr.intersectsBox(bx)) st = cd >= R ? 1 : bx.distanceToPoint(cp) < F ? 3 : 2; }
        state[c] = st; if (st) { loaded++; sig += c + 'xabc'[st]; } }
      if (sig === chunkSig) return; chunkSig = sig;
      for (const T2 of trees) { fill(T2.o, T2.all, c => state[c] === 3 && [T2.start[c], T2.len[c]]); fill(T2.f, T2.all, c => state[c] === 2 ? [T2.start[c], T2.len[c]] : state[c] === 1 && [T2.start[c], T2.few[c]]); } };
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
    // automatic quality: while moving, if frames take too long on this computer, step the detail down (once per step, and say so)
    let lastT = 0, slowN = 0, fastN = 0;
    const pace = (moving, now) => { const dt = now - lastT; lastT = now; if (!moving || dt > 250) { slowN = fastN = 0; return; }
      if (dt > 34) slowN++; else { fastN++; if (fastN > 20) slowN = Math.max(0, slowN - 1), fastN = 0; }
      if (slowN >= 18 && Q < QS.length - 1) { Q++; slowN = 0; if (Q === 2 && pr > 0.75) { pr = 0.75; renderer.setPixelRatio(pr); }
        say(Q === 1 ? 'Lowered the 3D detail' : 'Lowered the 3D detail again', 'This computer was struggling, so far-off detail and trees are reduced to keep it smooth.'); setTimeout(() => say(''), 5000); } };
    const draw = () => { raf = 0; if (!active) return; const moving = controls.update() || dragging, now = performance.now(); pace(moving, now);
      levels(); cullTrees(); placeMarks(); renderer.render(scene, camera); if (moving) ask(); };
    let dragging = false; renderer.domElement.addEventListener('pointerdown', () => { dragging = true; }); addEventListener('pointerup', () => { dragging = false; ask(); });
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
    // warm-up: send every part and tree to the graphics card now, behind the loading note, so zooming in later doesn't stutter
    for (const p of parts) p.o.visible = true; for (const T2 of trees) for (const mesh of [T2.o, T2.f]) { mesh.visible = true; mesh.count = T2.n; mesh.instanceMatrix.array.set(T2.all); mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceMatrix.needsUpdate = true; }
    resize(); overview(); renderer.render(scene, camera); chunkSig = '';
    overview(); setTheme(theme); say('');
    // check it can keep up: a weak graphics chip gets told how to go back to 2D
    const t0 = performance.now(); renderer.render(scene, camera); renderer.getContext().finish(); const first = performance.now() - t0;
    if (first > 600) { say('This computer is slow at 3D', 'If the CAD lags, pick 2D under the map style button.'); setTimeout(() => say(''), 7000); }
    S = { ask, flyTo, overview, dolly, setTheme, resize, first, info: () => ({ calls: renderer.info.render.calls, tris: renderer.info.render.triangles, trees: trees.reduce((n, t2) => n + (t2.o.visible ? t2.o.count : 0) + (t2.f.visible ? t2.f.count : 0), 0), chunks: loaded, first }) };
    return S; })().catch(e => { loading = null; say('The 3D map could not load', `${String(e.message || e).slice(0, 120)}<br>Pick 2D under the map style button.`); throw e; });

  window.map3d = {
    setActive: on => { active = !!on; box.style.display = on ? '' : 'none'; if (on) load().then(s => { s.resize(); s.ask(); }).catch(() => {}); },
    setTheme: t => { theme = t; S?.setTheme(t); },
    zoomIn: () => S?.dolly(0.75), zoomOut: () => S?.dolly(1.33), fit: () => S?.overview(), flyTo: (x, y) => S?.flyTo(x, y), info: () => S?.info() };
})();
