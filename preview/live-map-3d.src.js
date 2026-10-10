import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GEO = JSON.parse(document.getElementById('geo').textContent);
const LM = JSON.parse(document.getElementById('landmarks').textContent);   // photo-measured objects, preview/newmap/landmarks.json
const ST = 1 / 3.5;                                                        // world units per stud (see REFERENCE.md)
const inClear = (x, y) => LM.clear.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
GEO.buildings = GEO.buildings.filter(([x, y]) => !inClear(x, y));
for (const o of LM.heights || []) for (const b of GEO.buildings) if (Math.abs(b[0] - o.x) < o.r && Math.abs(b[1] - o.y) < o.r) { b[5] = o.h * ST; if (o.colour) { b[6] = 9; b[7] = o.colour; } }   // photo-measured heights win
const MAP_LIGHT = document.getElementById('mapsrc').getAttribute('href');
const MAP_DARK = document.getElementById('mapsrc-dark').getAttribute('href');
const W = 2000;                           // world units, same grid as the 2D page
const view = document.getElementById('view3d');
const stage = document.getElementById('stage');
const loading = document.getElementById('loading');

// ── renderer / scene ──
const BIG = innerWidth * innerHeight > 1.6e6;
const renderer = new THREE.WebGLRenderer({ antialias: !BIG && devicePixelRatio <= 1, powerPreference: 'high-performance' });
let pr = Math.min(devicePixelRatio, BIG ? 0.9 : 1.0); renderer.setPixelRatio(pr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;      // the city is static: bake the shadow map once
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x232A33);
scene.fog = new THREE.Fog(0x232A33, 1500, 5200);

const camera = new THREE.PerspectiveCamera(42, 1, 1, 6000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.16;   // short glide after release, then stops
controls.maxPolarAngle = Math.PI * 0.46; controls.minDistance = 90; controls.maxDistance = 2200;
controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
// left button slides the map, middle (or right) button orbits, wheel zooms
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.ROTATE, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.screenSpacePanning = false;   // pan along the ground plane
controls.panSpeed = 1.2;
renderer.domElement.addEventListener('pointerdown', () => { controls.autoRotate = false; }, { once: true });
renderer.domElement.addEventListener('pointerdown', () => { controls._dragging = true; }); addEventListener('pointerup', () => { controls._dragging = false; });

// ── light ──
const hemi = new THREE.HemisphereLight(0xC9D8EE, 0x4A4F55, 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xFFF1DC, 2.6);
sun.position.set(1000 + 520, 900, 1000 - 380);
sun.target.position.set(1000, 0, 1000);
sun.castShadow = true;
sun.shadow.mapSize.set(1536, 1536);
Object.assign(sun.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 100, far: 3000 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.8;
scene.add(sun, sun.target);

// ── ground: the map draped over the heightmap ──
const HMAX = 150, HN = 512;
let hdata = null;                                  // Float32Array of heights (HN x HN), filled once the heightmap loads
const heightAt = (x, y) => { if (!hdata) return 0; const u = Math.min(Math.max(x / W * (HN - 1), 0), HN - 1.001), v = Math.min(Math.max(y / W * (HN - 1), 0), HN - 1.001);
  const i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * HN + i;
  return (hdata[k] * (1 - fu) + hdata[k + 1] * fu) * (1 - fv) + (hdata[k + HN] * (1 - fu) + hdata[k + HN + 1] * fu) * fv; };
const SEG = 191;
const groundGeo = new THREE.PlaneGeometry(W, W, SEG, SEG); groundGeo.rotateX(-Math.PI / 2); groundGeo.translate(W / 2, 0, W / 2);
const loader = new THREE.TextureLoader();
const tex = loader.load(MAP_LIGHT, () => { loading.classList.add('off'); renderer.shadowMap.needsUpdate = true; });
const texDark = loader.load(MAP_DARK);
for (const t of [tex, texDark]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }
const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ map: tex, color: 0xE4E7EB, roughness: 1, metalness: 0 }));
ground.receiveShadow = true; ground.castShadow = true;
scene.add(ground);
const onTerrain = [];                              // callbacks to re-seat things once heights are known
const hm = new Image(); hm.onload = () => {
  const c = document.createElement('canvas'); c.width = c.height = HN; const g = c.getContext('2d'); g.drawImage(hm, 0, 0, HN, HN);
  const px = g.getImageData(0, 0, HN, HN).data; hdata = new Float32Array(HN * HN);
  for (let i = 0; i < HN * HN; i++) hdata[i] = px[i * 4] / 255 * HMAX;
  const pos = groundGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
  pos.needsUpdate = true; groundGeo.computeVertexNormals();
  for (const f of onTerrain) f(); renderer.shadowMap.needsUpdate = true;
};
hm.src = document.getElementById('heightsrc').getAttribute('href');
// apron beyond the map edge
const apron = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, W * 4), new THREE.MeshStandardMaterial({ color: 0x376069, roughness: 1, metalness: 0 }));
apron.rotation.x = -Math.PI / 2; apron.position.set(W / 2, -0.5, W / 2); scene.add(apron);

// ── buildings: footprint colour from the map, storeys as facade bands ──
const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
const bMat = new THREE.MeshStandardMaterial({ roughness: 0.78, metalness: 0.05 });
bMat.onBeforeCompile = sh => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying float vNy;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n{ vec4 wp = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp = instanceMatrix * wp;\n#endif\n wp = modelMatrix * wp; vWP = wp.xyz; vNy = normal.y; }');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying float vNy;')
    .replace('#include <color_fragment>', `#include <color_fragment>
{
  float side = 1.0 - step(0.9, abs(vNy));
  float f = fract(vWP.y / 3.6);
  float band = smoothstep(0.42, 0.50, f) * (1.0 - smoothstep(0.86, 0.94, f));     // window band on each floor
  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11));
  vec3 glass = mix(vec3(0.62, 0.72, 0.86), vec3(0.20, 0.26, 0.36), smoothstep(0.0, 1.0, f));   // sky-lit glass
  vec3 dark = mix(diffuseColor.rgb, glass, 0.75);                                     // dark buildings: reflective glass bands
  vec3 light = diffuseColor.rgb * 0.62;                                               // light buildings: recessed windows
  diffuseColor.rgb = mix(diffuseColor.rgb, lum < 0.28 ? dark : light, band * side);
  diffuseColor.rgb *= 1.0 - 0.10 * step(0.9, vNy);                                   // roof a touch darker
  diffuseColor.rgb *= 1.0 - 0.18 * (1.0 - smoothstep(0.0, 1.2, vWP.y - floor(vWP.y / 3.6) * 3.6)) * side * step(0.9, 1.0 - step(3.0, vWP.y)); // ground-floor plinth shade
}`);
};
const bld = new THREE.InstancedMesh(box, bMat, GEO.buildings.length);
bld.castShadow = bld.receiveShadow = true;
const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), C = new THREE.Color();
const palette = [[0xC4C8CE, 0xD7DAE0], [0x2B2E33, 0x3A3E45], [0x6F5B4C, 0x8A7460]];
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const roofColour = (hex, k) => { C.set(hex); const hsl = {}; C.getHSL(hsl);
  // roofs read darker and flatter than walls in the top-down map: lift and mute them into wall colours
  if (k === 1 && hsl.l < 0.25) C.setHSL(hsl.h, Math.min(0.25, hsl.s), 0.14 + hsl.l * 0.5);          // dark glass
  else if (k === 0) C.setHSL(hsl.h, Math.min(0.08, hsl.s), Math.min(0.86, 0.55 + hsl.l * 0.4));       // concrete / white
  else C.setHSL(hsl.h, Math.min(0.42, hsl.s * 1.1), Math.min(0.62, 0.30 + hsl.l * 0.55));            // brick / painted
  return C; };
// the two downtown towers are glass in game: tallest dark, second blue
const TOWER = { 0: 0x1C2027, 1: 0x2C4C80 };
const towerRank = GEO.buildings.map((b, i) => [b[5], i]).filter(([h], i) => h > 20 && GEO.buildings[i][6] !== 9).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
const wallColour = (hex, k, i) => { if (k === 9) return C.set(hex); const r = towerRank.indexOf(i); if (r >= 0 && TOWER[r] != null) return C.setHex(TOWER[r]); return roofColour(hex || '#888888', k); };
// small, low, dark- or colour-roofed footprints are houses: walls plus a hip roof in the map's roof colour
const isHouse = ([, , L, Wd, , h, k]) => k === 8 || (k !== 9 && k !== 0 && h <= 7.3 && L * Wd < 1000);
const houseIdx = GEO.buildings.map((b, i) => isHouse(b) ? i : -1).filter(i => i >= 0);
const roofGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); roofGeo.rotateY(Math.PI / 4); roofGeo.translate(0, 0.5, 0);
const roofMat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true });
const roofs = new THREE.InstancedMesh(roofGeo, roofMat, houseIdx.length); roofs.castShadow = roofs.receiveShadow = true; scene.add(roofs);
const WALL_H = 4.2, ROOF_H = 3.4;
const houseStoreys = b => (b[2] * b[3] > 560 ? 2 : 1);                 // bigger footprints are two-storey colonials
const wallH = b => b[6] === 8 ? b[5] : WALL_H + (houseStoreys(b) - 1) * 3.4;
const WALLS = { light: [0xE8E6E0, 0xE8E6E0, 0xE8E6E0, 0xD9C28E, 0xD9C28E, 0xBFC3C8], dark: [0x3A3A3E, 0x3A3A3E, 0x3A3A3E, 0x4A4234, 0x4A4234, 0x33363A] };
const placeBuildings = () => { GEO.buildings.forEach(([x, y, L, Wd, ang, h, k], i) => {
  const base = heightAt(x, y) - 1.5, house = isHouse(GEO.buildings[i]);
  P.set(x, base, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang); Sc.set(L, (house ? wallH(GEO.buildings[i]) : h) + 1.5, Wd);
  bld.setMatrixAt(i, M.compose(P, Q, Sc)); }); bld.instanceMatrix.needsUpdate = true;
  houseIdx.forEach((i, r) => { const [x, y, L, Wd, ang] = GEO.buildings[i];
    P.set(x, heightAt(x, y) + wallH(GEO.buildings[i]) - 0.05, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang); Sc.set(L * 1.12, ROOF_H, Wd * 1.12);
    roofs.setMatrixAt(r, M.compose(P, Q, Sc)); }); roofs.instanceMatrix.needsUpdate = true; };
const colourBuildings = theme => { let sd = 3; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  GEO.buildings.forEach((b, i) => { const [, , , , , , k, hex] = b;
    if (k === 8) { C.set(hex); if (theme === 'dark') { const hsl = {}; C.getHSL(hsl); C.setHSL(hsl.h, hsl.s * 0.4, 0.18); } }
    else if (isHouse(b)) { const w = WALLS[theme === 'dark' ? 'dark' : 'light']; C.setHex(w[Math.floor(rn() * w.length)]).offsetHSL(0, 0, (rn() - 0.5) * 0.05); }   // white / tan / grey walls
    else { wallColour(hex, k, i).offsetHSL(0, 0, (rn() - 0.5) * 0.04); if (theme === 'dark') { const hsl = {}; C.getHSL(hsl); C.setHSL(hsl.h, hsl.s * 0.25, 0.16 + hsl.l * 0.35); } }
    bld.setColorAt(i, C); });
  houseIdx.forEach((i, r) => { const hsl = {}; C.set(GEO.buildings[i][7] || '#555').getHSL(hsl);
    const blue = hsl.h > 0.52 && hsl.h < 0.72 && hsl.s > 0.12, pick = GEO.buildings[i][6] === 8 ? 0.99 : rn();   // pinned hip roofs are grey
    if (blue || pick < 0.22) C.setHSL(0.61, 0.42, theme === 'dark' ? 0.15 : 0.25);                       // dark blue shingles
    else if (pick < 0.42) C.setHSL(0.07, 0.35, theme === 'dark' ? 0.13 : 0.22);                            // brown
    else if (pick < 0.55) C.setHSL(0.6, 0.05, theme === 'dark' ? 0.10 : 0.14);                             // charcoal
    else C.setHSL(0.6, 0.04, theme === 'dark' ? 0.16 : 0.34);                                              // grey
    C.offsetHSL(0, 0, (rn() - 0.5) * 0.05); roofs.setColorAt(r, C); });
  bld.instanceColor.needsUpdate = true; roofs.instanceColor.needsUpdate = true; };
colourBuildings('light'); placeBuildings(); onTerrain.push(placeBuildings);
scene.add(bld);

// ── trees: pines, broadleaf and cherry, sized like the in-game ones ──
const tMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4A3728, roughness: 1 });
const pineGeo = new THREE.ConeGeometry(1.7, 9.4, 7); pineGeo.translate(0, 5.0, 0);          // ~33 studs (photos 002, 013)
const leafGeo = new THREE.IcosahedronGeometry(2.6, 1); leafGeo.translate(0, 4.4, 0);         // ~22 studs crown top
const trunkGeo = new THREE.CylinderGeometry(0.28, 0.4, 2.8, 5); trunkGeo.translate(0, 1.4, 0);
const species = GEO.trees.map((_, i) => { const r = rnd(); return r < 0.40 ? 0 : r < 0.78 ? 1 : r < 0.92 ? 3 : 2; });   // 0 pine, 1 broadleaf, 2 cherry, 3 autumn
const nPine = species.filter(s => s === 0).length, nLeaf = species.length - nPine;
const pines = new THREE.InstancedMesh(pineGeo, tMat, nPine), leafs = new THREE.InstancedMesh(leafGeo, tMat, nLeaf), trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, nLeaf);
for (const m of [pines, leafs, trunks]) { m.castShadow = true; m.receiveShadow = true; }
const TREE_COL = { light: [0x214A28, 0x3C7A34, 0xE8B0C4, 0xC8742E], dark: [0x2A3A2E, 0x3A4A3C, 0x6E5560, 0x5A4634] };
const treeIdx = [];
const houseCells = new Set(); for (const i of houseIdx) { const [x, y] = GEO.buildings[i]; houseCells.add(`${Math.floor(x / 40)},${Math.floor(y / 40)}`); }
const nearHouse = (x, y) => { const cx = Math.floor(x / 40), cy = Math.floor(y / 40); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (houseCells.has(`${cx + a},${cy + b}`)) return true; return false; };
GEO.trees = GEO.trees.filter(([x, y]) => !nearHouse(x, y) || rnd() < 0.45);
const CLEAR = LM.clear.map(([x0, y0, x1, y1]) => [x0, x1, y0, y1]);
GEO.trees = GEO.trees.filter(([x, y]) => !CLEAR.some(([x0, x1, y0, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1));
const treeXf = GEO.trees.map((t, i) => { const sp = species[i], sc = t[2] * (0.55 + rnd() * 0.35); return [sp, sc, sp === 0 ? sc * (0.9 + rnd() * 0.4) : sc * (0.85 + rnd() * 0.3), rnd() * 6.28]; });
const placeTrees = () => { let ip = 0, il = 0; treeIdx.length = 0;
  GEO.trees.forEach(([x, y], i) => { const [sp, sc, sy, rot] = treeXf[i];
    P.set(x, heightAt(x, y) - 0.5, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot); Sc.set(sc, sy, sc);
    if (sp === 0) { pines.setMatrixAt(ip, M.compose(P, Q, Sc)); treeIdx.push([0, ip++]); }
    else { leafs.setMatrixAt(il, M.compose(P, Q, Sc)); trunks.setMatrixAt(il, M.compose(P, Q, Sc)); treeIdx.push([sp, il++]); } });
  pines.instanceMatrix.needsUpdate = leafs.instanceMatrix.needsUpdate = trunks.instanceMatrix.needsUpdate = true; };
placeTrees(); onTerrain.push(placeTrees);
const colourTrees = theme => { const T = TREE_COL[theme] || TREE_COL.light; let sd2 = 11; const r2 = () => (sd2 = (sd2 * 16807) % 2147483647) / 2147483647;
  treeIdx.forEach(([sp, idx]) => { C.setHex(T[sp]).offsetHSL((r2() - 0.5) * 0.04, 0, (r2() - 0.5) * 0.10); (sp === 0 ? pines : leafs).setColorAt(idx, C); });
  pines.instanceColor.needsUpdate = true; leafs.instanceColor.needsUpdate = true; };
colourTrees('light');
scene.add(pines, leafs, trunks);

// ── landmarks: pier, shops, office, lifeguard towers, palms, measured from the reference photos ──
const lmGroup = new THREE.Group(); scene.add(lmGroup);
const DECK_TOP = 15 * ST;
const lmMat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true });
const unitBox = new THREE.BoxGeometry(1, 1, 1); unitBox.translate(0, 0.5, 0);
const unitCyl = new THREE.CylinderGeometry(1, 1, 1, 8); unitCyl.translate(0, 0.5, 0);
const hipGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1); hipGeo.rotateY(Math.PI / 4); hipGeo.translate(0, 0.5, 0);
const frondGeo = new THREE.BoxGeometry(4.4, 0.1, 1.0); frondGeo.translate(2.1, 0, 0); frondGeo.rotateZ(-0.55);
const addBox = (x, y, L, Wd, ang, y0, h, mat) => { const m = new THREE.Mesh(unitBox, mat); m.position.set(x, y0, y); m.rotation.y = -ang; m.scale.set(L, h, Wd); m.castShadow = m.receiveShadow = true; lmGroup.add(m); return m; };
const addCyl = (x, y, r, y0, h, mat) => { const m = new THREE.Mesh(unitCyl, mat); m.position.set(x, y0, y); m.scale.set(r, h, r); m.castShadow = true; lmGroup.add(m); return m; };
const groundY = (x, y) => Math.max(heightAt(x, y), 0);
const placeLandmarks = () => {
  for (const m of [...lmGroup.children]) lmGroup.remove(m);
  const deckMat = lmMat(0x7A5236), timber = lmMat(0x5E4330), concrete = lmMat(0xB9BCC0);
  for (const d of LM.decks) { const L = d.x1 - d.x0, Wd = d.y1 - d.y0, t = d.thick * ST;
    addBox((d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2, L, Wd, 0, DECK_TOP - t, t, deckMat);
    const r = d.pile_r * ST, mat = d.pile === 'timber' ? timber : concrete;
    for (let x = d.x0 + r * 2; x <= d.x1 - r; x += d.spacing) for (let y = d.y0 + 1.5; y <= d.y1 - 1; y += d.spacing) { const g = groundY(x, y) - 0.5; addCyl(x, y, r, g, DECK_TOP - t - g, mat); } }
  for (const rl of LM.rails) { const mat = lmMat(rl.colour), h = rl.h * ST;
    for (let i = 1; i < rl.pts.length; i++) { const [ax, ay] = rl.pts[i - 1], [bx, by] = rl.pts[i], L = Math.hypot(bx - ax, by - ay), a = Math.atan2(by - ay, bx - ax);
      addBox((ax + bx) / 2, (ay + by) / 2, L, 0.14, a, DECK_TOP + h - 0.14, 0.14, mat);
      const n = Math.max(1, Math.round(L / 2.5)); for (let k = 0; k <= n; k++) addBox(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, 0.12, 0.12, 0, DECK_TOP, h, mat); } }
  for (const b of LM.boxes) { const lift = b.base === 'deck' ? 0 : 0.3, y0 = b.base === 'deck' ? DECK_TOP : groundY(b.x, b.y) - lift, h = b.h * ST + lift;
    addBox(b.x, b.y, b.L, b.W, b.ang, y0, h, lmMat(b.colour));
    if (b.roof === 'hip') { const r = new THREE.Mesh(hipGeo, lmMat(b.roof_colour)); r.position.set(b.x, y0 + h - 0.05, b.y); r.rotation.y = -b.ang; r.scale.set(b.L * 1.15, b.roof_h * ST, b.W * 1.15); r.castShadow = true; lmGroup.add(r); } }
  const mastMat = lmMat(0xD8DCE0);
  for (const m of LM.masts) addCyl(m.x, m.y, m.r * ST, DECK_TOP + 24 * ST, (m.h - 24) * ST, mastMat);
  for (const p of LM.posts) { const g = groundY(p.x, p.y) - 0.2; addCyl(p.x, p.y, p.r * ST, g, p.h * ST + 0.2, lmMat(p.colour)); }
  const lgMat = lmMat(0xC9A66B), legMat = lmMat(0x8A7355), lgRoof = lmMat(0x6B7B8C);
  for (const t of LM.lifeguard) { const g = groundY(t.x, t.y); addBox(t.x, t.y, 8 * ST, 8 * ST, 0, g + 7 * ST, 5 * ST, lgMat); addBox(t.x, t.y, 9 * ST, 9 * ST, 0, g + 12 * ST, 0.25, lgRoof);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addCyl(t.x + dx * 3.2 * ST, t.y + dy * 3.2 * ST, 0.5 * ST, g - 0.2, 7.2 * ST, legMat); }
  // palms: a leaning trunk and seven fronds each
  const pts = []; for (const ln of LM.palms.lines) { if (ln.pts) pts.push(...ln.pts); else { const n = Math.max(1, Math.round(Math.hypot(ln.to[0] - ln.from[0], ln.to[1] - ln.from[1]) / ln.step)); for (let i = 0; i <= n; i++) pts.push([ln.from[0] + (ln.to[0] - ln.from[0]) * i / n, ln.from[1] + (ln.to[1] - ln.from[1]) * i / n]); } }
  const trunkM = new THREE.InstancedMesh(unitCyl, lmMat(0x8C7351), pts.length), frondM = new THREE.InstancedMesh(frondGeo, lmMat(0x4E8A3A), pts.length * 7);
  trunkM.castShadow = frondM.castShadow = true; let sd = 5; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const E = new THREE.Euler(), top = new THREE.Vector3(), q2 = new THREE.Quaternion();
  pts.forEach(([x, y], i) => { const h = LM.palms.h * ST * (0.85 + rn() * 0.3), lean = (rn() - 0.5) * 0.18, dir = rn() * 6.28, g = groundY(x, y) - 0.3;
    E.set(lean * Math.sin(dir), 0, lean * Math.cos(dir)); Q.setFromEuler(E); P.set(x, g, y); Sc.set(0.28, h, 0.28); trunkM.setMatrixAt(i, M.compose(P, Q, Sc));
    top.set(0, h, 0).applyQuaternion(Q).add(P);
    for (let k = 0; k < 7; k++) { E.set(0, dir + k * 6.28 / 7, 0); q2.setFromEuler(E); Sc.set(0.9 + rn() * 0.2, 1, 1); frondM.setMatrixAt(i * 7 + k, M.compose(top, q2, Sc)); } });
  lmGroup.add(trunkM, frondM); };
placeLandmarks(); onTerrain.push(placeLandmarks);



// ── water tower (south-west park): one thick tapered column under a broad rounded tank ──
const wt = new THREE.Group();
const wtMat = new THREE.MeshStandardMaterial({ color: 0xF2F3F5, roughness: 0.45 });
const wtTank = new THREE.Mesh(new THREE.SphereGeometry(7.5, 24, 16), wtMat); wtTank.scale.set(1, 0.82, 1); wtTank.position.y = 27; wtTank.castShadow = true;
const wtCol = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 23, 14), wtMat); wtCol.position.y = 11.5; wtCol.castShadow = true;
const wtCap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 1.2, 10), wtMat); wtCap.position.y = 33.4;
wt.add(wtTank, wtCol, wtCap);
wt.position.set(498, 0, 1145); scene.add(wt); onTerrain.push(() => { wt.position.y = heightAt(498, 1145) - 0.3; });

// ── vehicles ──
// a car at real size (about 18 x 7.5 studs), facing +x: body, glass cabin, and a light bar for emergency units. Grows with camera distance so it stays visible.
const CAR_L = 18 * ST, CAR_W = 7.6 * ST, CAR_H = 4.6 * ST;
const bodyGeo = new THREE.BoxGeometry(CAR_L, CAR_H * 0.55, CAR_W); bodyGeo.translate(0, CAR_H * 0.275 + 0.15, 0);
const cabGeo = new THREE.BoxGeometry(CAR_L * 0.5, CAR_H * 0.42, CAR_W * 0.9); cabGeo.translate(-CAR_L * 0.06, CAR_H * 0.55 + CAR_H * 0.21 + 0.15, 0);
const barGeo = new THREE.BoxGeometry(CAR_L * 0.1, CAR_H * 0.09, CAR_W * 0.4);
const glassMat = new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.25, metalness: 0.3 });
const barRed = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xff3b3b, emissiveIntensity: 0.6 }), barBlue = new THREE.MeshStandardMaterial({ color: 0x3b7bff, emissive: 0x3b7bff, emissiveIntensity: 0.6 });   // steady: the API does not say when lights are on
const mkBus = (color, lights) => { const g = new THREE.Group(); g.rotation.order = 'YXZ';
  const paint = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.45, metalness: 0.1 });
  g.add(new THREE.Mesh(bodyGeo, paint), new THREE.Mesh(cabGeo, glassMat));
  if (lights) { const top = CAR_H * 0.97 + 0.15 + CAR_H * 0.045; const a = new THREE.Mesh(barGeo, barRed), b = new THREE.Mesh(barGeo, barBlue); a.position.set(-CAR_L * 0.06, top, -CAR_W * 0.2); b.position.set(-CAR_L * 0.06, top, CAR_W * 0.2); g.add(a, b); }
  g.userData.paint = paint; g.userData.pitch = 0; g.userData.roll = 0; scene.add(g); return g; };
const dropCar = c => { scene.remove(c); c.userData.paint?.dispose(); };
let UN = window.UNITS || []; const COL = { pd: 0x4C8DFF, fd: 0xE24B4B, dot: 0xE9C24C };
const carFor = (u, i) => mkBus(i === 0 ? 0xF0F2F5 : COL[u.dept], u.dept === 'pd' || u.dept === 'fd');
let cars = UN.map(carFor);
addEventListener('units', () => { for (const c of cars) dropCar(c); UN = window.UNITS || []; cars = UN.map(carFor); });
const incident = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xE24B4B }));
incident.visible = false; scene.add(incident);
const incRing = new THREE.Mesh(new THREE.RingGeometry(10, 12, 40), new THREE.MeshBasicMaterial({ color: 0xE24B4B, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false })); incRing.rotation.x = -Math.PI / 2; incRing.visible = false; scene.add(incRing);
let focusCall = null;
addEventListener('focuscall', e => { focusCall = e.detail; incident.visible = incRing.visible = !!focusCall; if (focusCall) { incident.position.set(focusCall.x, heightAt(focusCall.x, focusCall.y) + 4, focusCall.y); incRing.position.set(focusCall.x, heightAt(focusCall.x, focusCall.y) + 1.5, focusCall.y); } });
addEventListener('calls', () => { if (focusCall && !(window.CALLS || []).includes(focusCall)) { focusCall = null; incident.visible = incRing.visible = false; } });
const glow = new THREE.Mesh(new THREE.RingGeometry(16, 18, 48), new THREE.MeshBasicMaterial({ color: 0xF0F2F5, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
glow.rotation.x = -Math.PI / 2; glow.position.y = 1.8; scene.add(glow);
const pulse = glow.clone(); pulse.material = glow.material.clone(); scene.add(pulse);


// ── camera ──
const FOCUS = new THREE.Vector3(700, 0, 1380);
let follow = false;
const reset = () => { controls.target.copy(FOCUS); camera.position.set(FOCUS.x + 470, 600, FOCUS.z + 720); controls.update(); };
let sizeW = 0, sizeH = 0;
const resize = () => { const w = innerWidth, h = innerHeight; if (w === sizeW && h === sizeH) return; sizeW = w; sizeH = h; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
addEventListener('resize', resize); resize(); reset();

// ── screen-space tooltip ──
const tip = document.getElementById('tip'), V = new THREE.Vector3();
const projectTip = p => { V.set(p.x, heightAt(p.x, p.z) + 8, p.z).project(camera);
  tip.style.left = ((V.x + 1) / 2 * innerWidth) + 'px'; tip.style.top = ((1 - V.y) / 2 * innerHeight) + 'px';
  tip.style.opacity = V.z < 1 ? 1 : 0; };

// ── controls wiring ──
const dolly = f => { const d = camera.position.clone().sub(controls.target); camera.position.copy(controls.target).add(d.multiplyScalar(f)); controls.update(); };
const zfit = document.getElementById('zfit');
const toggleFollow = () => { follow = !follow; zfit?.setAttribute('aria-pressed', follow); controls.autoRotate = false; if (!follow) reset(); };

// ── themes ──
const THEMES = {
  light: { bg: 0x2A3340, hemi: [0xC9D8EE, 0x4A4F55, 1.35], sun: [0xFFF1DC, 2.6], exp: 1.15, ground: 0xE4E7EB, apron: 0x376069, map: tex,
         },
  dark:  { bg: 0x121214, hemi: [0xB9C2D0, 0x2A2C31, 1.15], sun: [0xE8ECF2, 1.5], exp: 1.0, ground: 0xF2F2F2, apron: 0x111113, map: texDark,
         },
};
const setTheme = name => { const T = THEMES[name] || THEMES.light;
  scene.background.setHex(T.bg); scene.fog.color.setHex(T.bg); scene.fog.near = 1500; scene.fog.far = 5200;
  hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2];
  sun.color.setHex(T.sun[0]); sun.intensity = T.sun[1]; renderer.toneMappingExposure = T.exp;
  ground.material.color.setHex(T.ground); if (ground.material.map !== T.map) { ground.material.map = T.map; ground.material.needsUpdate = true; }
  apron.material.color.setHex(T.apron);
  colourBuildings(name); colourTrees(name); };

// ── loop ──
const clock = new THREE.Clock();
// adaptive resolution: if frames are slow, drop the pixel ratio (and climb back when they are fast)
let acc = 0, n = 0;
const adapt = dt => { acc += dt; if (++n < 40) return; const avg = acc / n; acc = n = 0;
  const want = avg > 0.03 ? Math.max(0.6, pr - 0.15) : (avg < 0.014 ? Math.min(Math.min(devicePixelRatio, BIG ? 0.9 : 1.0), pr + 0.15) : pr);
  if (want !== pr) { pr = want; renderer.setPixelRatio(pr); } };
renderer.shadowMap.needsUpdate = true;
// pacing: full frame rate only while something on the map is changing; otherwise let the GPU rest so clicks and page animations stay smooth
let lastDrawn = 0, lastInteract = 0, quietUntil = 0;
controls.addEventListener('change', () => { lastInteract = performance.now(); });
const quiet = () => { quietUntil = performance.now() + 550; };              // a page transition is running: give it the GPU
addEventListener('viewchange', quiet); addEventListener('mdt', quiet);
const frame = () => {
  const t = performance.now(), moving = UN.some(u => u.m && Math.hypot(u.m.Dv[0], u.m.Dv[1]) > 0.3);
  // full display rate only while the person is moving the camera; moving units look smooth at 30; behind the MDT tablet the map barely shows, so 5 is plenty.
  // Every frame here also costs the page's clicks and scrolling, so the map never draws more than it needs to.
  const steering = controls._dragging || !!flight || t - lastInteract < 900;
  const fps = document.body.classList.contains('mdt-open') ? 5 : t < quietUntil ? 20 : steering ? 0 : (moving || follow) ? 30 : 12;   // 0 = every display frame
  if (fps && t - lastDrawn < 1000 / fps - 3) return;
  lastDrawn = t;
  const dt = Math.min(clock.getDelta(), 0.1), now = clock.elapsedTime; if (!fps) adapt(dt); else acc = n = 0;   // only judge speed at full rate
  const camD = camera.position.distanceTo(controls.target), grow = Math.min(6, Math.max(1, camD / 160));
  UN.forEach((u, i) => { const c = cars[i]; if (!c) return; const ch = Math.cos(u.heading), sh = Math.sin(u.heading), f = CAR_L * 0.45, w = CAR_W * 0.45;
    const hc = heightAt(u.x, u.y), hf = heightAt(u.x + ch * f, u.y + sh * f), hb = heightAt(u.x - ch * f, u.y - sh * f), hl = heightAt(u.x + sh * w, u.y - ch * w), hr = heightAt(u.x - sh * w, u.y + ch * w);
    const k = 1 - Math.exp(-dt * 8); c.userData.pitch += (Math.atan2(hf - hb, 2 * f) - c.userData.pitch) * k; c.userData.roll += (Math.atan2(hl - hr, 2 * w) - c.userData.roll) * k;   // sit on the slope
    c.position.set(u.x, Math.max(hc, (hf + hb) / 2), u.y); c.rotation.set(c.userData.roll * 0.6, -u.heading, c.userData.pitch); c.scale.setScalar(grow);
    c.visible = !window.DEPT_FILTER || u.dept === window.DEPT_FILTER; });   // the LE / FD / DOT chips filter the 3D map too
  const hp = UN[0] ? { x: UN[0].x, z: UN[0].y } : { x: FOCUS.x, z: FOCUS.z }; const hy = heightAt(hp.x, hp.z);
  const lead = !!UN[0] && (!window.DEPT_FILTER || UN[0].dept === window.DEPT_FILTER); glow.visible = pulse.visible = lead; tip.style.display = lead ? '' : 'none';
  if (UN[0]) { const u = UN[0], key = u.name + '|' + u.crew.join(',') + '|' + (u.postal || '') + '|' + (u.model || ''); if (tip.dataset.key !== key) { tip.dataset.key = key;
    tip.querySelector('.k').textContent = u.name; tip.querySelector('.s').textContent = u.crew.join(', '); const v = tip.querySelector('.v'); v.textContent = u.postal || '10-8'; const sm = document.createElement('small'); sm.textContent = u.postal ? 'postal' : ''; v.appendChild(sm);
    const md = document.createElement('div'); md.className = 's'; md.textContent = u.live ? (u.model || '') : 'available'; v.appendChild(md); } }
  glow.position.y = hy + 1.8; pulse.position.y = hy + 1.8;
  glow.position.x = pulse.position.x = hp.x; glow.position.z = pulse.position.z = hp.z;
  const k = (now % 2.4) / 2.4; pulse.scale.setScalar(1 + k * 1.6); pulse.material.opacity = 0.5 * (1 - k);
  if (incRing.visible) { const q = (now % 1.6) / 1.6; incRing.scale.setScalar(0.5 + q * 1.4); incRing.material.opacity = 0.8 * (1 - q); }
  if (flight) { const k = Math.min(1, (performance.now() - flight.t0) / flight.ms), e = 1 - Math.pow(1 - k, 3); controls.target.lerpVectors(flight.T0, flight.T, e); camera.position.lerpVectors(flight.P0, flight.P, e); if (k >= 1) flight = null; }
  else if (follow) controls.target.lerp(new THREE.Vector3(hp.x, 0, hp.z), 0.06);
  controls.target.x = Math.max(-100, Math.min(W + 100, controls.target.x)); controls.target.z = Math.max(-100, Math.min(W + 100, controls.target.z));   // never orbit away from the map
  controls.update(); projectTip(hp);
  renderer.render(scene, camera);
};
let active = false;
const setActive = on => { if (on === active) return; active = on; renderer.setAnimationLoop(on ? frame : null); if (on) { clock.getDelta(); resize(); } };
let flight = null;
const flyTo = (x, z, dist = 520, az = 0.9, smooth = false) => { const y = heightAt(x, z); const T = new THREE.Vector3(x, y, z), P = new THREE.Vector3(x + Math.sin(az) * dist * 0.75, y + dist * 0.62, z + Math.cos(az) * dist * 0.75);
  if (!smooth) { controls.target.copy(T); camera.position.copy(P); controls.update(); return; }
  follow = false; flight = { t0: performance.now(), ms: 900, T0: controls.target.clone(), P0: camera.position.clone(), T, P }; };
const rayc = new THREE.Raycaster(), ndc = new THREE.Vector2();
const pick = (cx, cy) => { ndc.set(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); rayc.setFromCamera(ndc, camera); const hit = rayc.intersectObject(ground, false)[0]; return hit ? [hit.point.x, hit.point.z] : null; };
addEventListener('showcall', e => { const c = e.detail; if (c && Number.isFinite(c.x)) flyTo(c.x, c.y, 380); });   // "Show on live map" from a call card
window.map3d = { zoomIn: () => dolly(0.78), zoomOut: () => dolly(1.28), toggleFollow, setTheme, setActive, reset, flyTo, pick,
  pose: () => [...camera.position.toArray(), ...controls.target.toArray()].map(n => +n.toFixed(2)), controls, info: () => ({ frames: renderer.info.render.frame, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, geos: renderer.info.memory.geometries, tex: renderer.info.memory.textures, pr, objects: (() => { let n = 0; scene.traverse(() => n++); return n; })() }) };
window.map3dReady = true;
setActive(true);
