import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const GEO = JSON.parse(document.getElementById('geo').textContent);
const MAP_LIGHT = document.getElementById('mapsrc').getAttribute('href');
const MAP_DARK = document.getElementById('mapsrc-dark').getAttribute('href');
const W = 2000;                           // world units, same grid as the 2D page
const view = document.getElementById('view3d');
const stage = document.getElementById('stage');
const loading = document.getElementById('loading');

// ── renderer / scene ──
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
let pr = Math.min(devicePixelRatio, 1.5); renderer.setPixelRatio(pr);
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

// ── light ──
const hemi = new THREE.HemisphereLight(0xC9D8EE, 0x4A4F55, 1.35); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xFFF1DC, 2.6);
sun.position.set(1000 + 520, 900, 1000 - 380);
sun.target.position.set(1000, 0, 1000);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -1300, right: 1300, top: 1300, bottom: -1300, near: 100, far: 3000 });
sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.8;
scene.add(sun, sun.target);

// ── ground: the map draped over the heightmap ──
const HMAX = 110, HN = 512;
let hdata = null;                                  // Float32Array of heights (HN x HN), filled once the heightmap loads
const heightAt = (x, y) => { if (!hdata) return 0; const u = Math.min(Math.max(x / W * (HN - 1), 0), HN - 1.001), v = Math.min(Math.max(y / W * (HN - 1), 0), HN - 1.001);
  const i = u | 0, j = v | 0, fu = u - i, fv = v - j, k = j * HN + i;
  return (hdata[k] * (1 - fu) + hdata[k + 1] * fu) * (1 - fv) + (hdata[k + HN] * (1 - fu) + hdata[k + HN + 1] * fu) * fv; };
const SEG = 255;
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
const apron = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, W * 4), new THREE.MeshStandardMaterial({ color: 0x2B4658, roughness: 0.35, metalness: 0.1 }));
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
const pineGeo = new THREE.ConeGeometry(2.9, 17, 7); pineGeo.translate(0, 9.5, 0);
const leafGeo = new THREE.IcosahedronGeometry(4.6, 1); leafGeo.translate(0, 8.0, 0);
const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 5, 5); trunkGeo.translate(0, 2.5, 0);
const species = GEO.trees.map((_, i) => { const r = rnd(); return r < 0.40 ? 0 : r < 0.78 ? 1 : r < 0.92 ? 3 : 2; });   // 0 pine, 1 broadleaf, 2 cherry, 3 autumn
const nPine = species.filter(s => s === 0).length, nLeaf = species.length - nPine;
const pines = new THREE.InstancedMesh(pineGeo, tMat, nPine), leafs = new THREE.InstancedMesh(leafGeo, tMat, nLeaf), trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, nLeaf);
for (const m of [pines, leafs, trunks]) { m.castShadow = true; m.receiveShadow = true; }
const TREE_COL = { light: [0x214A28, 0x3C7A34, 0xE8B0C4, 0xC8742E], dark: [0x2A3A2E, 0x3A4A3C, 0x6E5560, 0x5A4634] };
const treeIdx = [];
const houseCells = new Set(); for (const i of houseIdx) { const [x, y] = GEO.buildings[i]; houseCells.add(`${Math.floor(x / 40)},${Math.floor(y / 40)}`); }
const nearHouse = (x, y) => { const cx = Math.floor(x / 40), cy = Math.floor(y / 40); for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) if (houseCells.has(`${cx + a},${cy + b}`)) return true; return false; };
GEO.trees = GEO.trees.filter(([x, y]) => !nearHouse(x, y) || rnd() < 0.45);
const CLEAR = [[212, 312, 1432, 1472], [846, 900, 1660, 1710]];            // tunnel approach, cave mouth
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

// ── routes (same polylines as the 2D page) ──
const pathOf = pts => { const cp = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++) {
  const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 12));
  for (let s = 0; s < n; s++) { const t0 = s / n, t1 = (s + 1) / n;
    cp.add(new THREE.LineCurve3(new THREE.Vector3(ax + (bx - ax) * t0, heightAt(ax + (bx - ax) * t0, ay + (by - ay) * t0) + 1.4, ay + (by - ay) * t0),
      new THREE.Vector3(ax + (bx - ax) * t1, heightAt(ax + (bx - ax) * t1, ay + (by - ay) * t1) + 1.4, ay + (by - ay) * t1))); } } return cp; };
const ROUTE_A = [[1332, 275], [1340, 520], [1350, 760], [1350, 1000], [1352, 1452], [300, 1452], [222, 1452]];   // ends inside the tunnel
const ROUTE_B = [[188, 792], [660, 792], [660, 988], [1180, 988], [1240, 1040], [1240, 1330], [1350, 1330]];
const routeGroup = new THREE.Group(); scene.add(routeGroup);
const tube = (curve, color, r, op) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, r, 6, false),
  new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, depthWrite: false })); m.renderOrder = 2; return m; };
const buildRoutes = () => { for (const m of [...routeGroup.children]) { m.geometry.dispose(); routeGroup.remove(m); }
  const routeA = pathOf(ROUTE_A), routeB = pathOf(ROUTE_B);
  routeGroup.add(tube(routeA, 0xF0F2F5, 1.6, 0.85), tube(routeA, 0xF0F2F5, 5.5, 0.08), tube(routeB, 0xB8D94A, 1.8, 0.95), tube(routeB, 0xB8D94A, 6.5, 0.10)); };
buildRoutes(); onTerrain.push(buildRoutes);

const stopGeo = new THREE.CylinderGeometry(5, 5, 1.2, 24), ringGeo = new THREE.RingGeometry(5, 6.6, 32);
const stops = [];
const addStop = ([x, y], color) => {
  const s = new THREE.Mesh(stopGeo, new THREE.MeshBasicMaterial({ color: 0x0B0B0C })); s.position.set(x, 1.5, y);
  const r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.set(x, 2.2, y);
  scene.add(s, r); stops.push([s, r, x, y]);
};
onTerrain.push(() => { for (const [s, r, x, y] of stops) { const h = heightAt(x, y); s.position.y = h + 1.5; r.position.y = h + 2.2; } });
[[1332, 275], [1348, 640], [1352, 1452], [880, 1452], [300, 1452]].forEach(p => addStop(p, 0xF0F2F5));
[[188, 792], [660, 988], [1240, 1330], [1350, 1330]].forEach(p => addStop(p, 0xB8D94A));

// ── water tower (south-west park): one thick tapered column under a broad rounded tank ──
const wt = new THREE.Group();
const wtMat = new THREE.MeshStandardMaterial({ color: 0xF2F3F5, roughness: 0.45 });
const wtTank = new THREE.Mesh(new THREE.SphereGeometry(7.5, 24, 16), wtMat); wtTank.scale.set(1, 0.82, 1); wtTank.position.y = 27; wtTank.castShadow = true;
const wtCol = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.2, 23, 14), wtMat); wtCol.position.y = 11.5; wtCol.castShadow = true;
const wtCap = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.6, 1.2, 10), wtMat); wtCap.position.y = 33.4;
wt.add(wtTank, wtCol, wtCap);
wt.position.set(380, 0, 1100); scene.add(wt); onTerrain.push(() => { wt.position.y = heightAt(380, 1100) - 0.3; });

// ── tunnel portal where the westbound road enters the hill ──
const tunnel = new THREE.Group();
const stone = new THREE.MeshStandardMaterial({ color: 0x8E9196, roughness: 0.95 });
const bore = new THREE.Mesh(new THREE.BoxGeometry(60, 9, 15), new THREE.MeshBasicMaterial({ color: 0x07080A })); bore.position.set(-30, 4.5, 0); tunnel.add(bore);
const headwall = new THREE.Mesh(new THREE.BoxGeometry(3, 14, 26), stone); headwall.position.set(0, 7, 0); headwall.castShadow = true; tunnel.add(headwall);
const arch = new THREE.Mesh(new THREE.RingGeometry(6.2, 8.4, 28, 1, 0, Math.PI), stone); arch.rotation.y = Math.PI / 2; arch.position.set(1.6, 4.6, 0); tunnel.add(arch);
const cutout = new THREE.Mesh(new THREE.BoxGeometry(3.4, 9.2, 15), new THREE.MeshBasicMaterial({ color: 0x07080A })); cutout.position.set(0, 4.5, 0); tunnel.add(cutout);
for (const dz of [-14, 14]) { const wing = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 2), stone); wing.position.set(-4, 4, dz); wing.rotation.y = dz < 0 ? 0.35 : -0.35; tunnel.add(wing); }
tunnel.position.set(236, 0, 1452); scene.add(tunnel); onTerrain.push(() => { tunnel.position.y = heightAt(300, 1452) - 0.2; });

// ── cave at the foot of the south-east hill, opening onto the river ──
const cave = new THREE.Group();
const caveMat = new THREE.MeshBasicMaterial({ color: 0x06070A });
const mouth = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), caveMat); mouth.scale.set(1.3, 0.8, 1); cave.add(mouth);
const throat = new THREE.Mesh(new THREE.BoxGeometry(30, 12, 22), caveMat); throat.position.set(15, 5, 0); cave.add(throat);
const lip = new THREE.Mesh(new THREE.TorusGeometry(12.5, 1.6, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x9A9DA2, roughness: 1 })); lip.rotation.y = Math.PI / 2; lip.scale.set(1, 0.8, 1.3); cave.add(lip);
cave.position.set(866, 0, 1684);                             // mouth at the river bank, throat runs east into the hill
scene.add(cave); onTerrain.push(() => { cave.position.y = heightAt(858, 1684) + 0.3; });

// ── vehicles ──
const busGeo = new THREE.BoxGeometry(14, 5.5, 6); busGeo.translate(0, 2.75, 0);
const mkBus = color => { const b = new THREE.Mesh(busGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.5 }));
  scene.add(b); return b; };
const UN = window.UNITS || [], COL = { pd: 0x4C8DFF, fd: 0xE24B4B, dot: 0xE9C24C };
const cars = UN.map((u, i) => mkBus(i === 0 ? 0xF0F2F5 : COL[u.dept]));
const incident = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xE24B4B }));
incident.position.set(1160, 4, 1092); scene.add(incident); onTerrain.push(() => { incident.position.y = heightAt(1160, 1092) + 4; });
const glow = new THREE.Mesh(new THREE.RingGeometry(16, 18, 48), new THREE.MeshBasicMaterial({ color: 0xF0F2F5, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }));
glow.rotation.x = -Math.PI / 2; glow.position.y = 1.8; scene.add(glow);
const pulse = glow.clone(); pulse.material = glow.material.clone(); scene.add(pulse);


// ── camera ──
const FOCUS = new THREE.Vector3(1040, 0, 1060);
let follow = false;
const reset = () => { controls.target.copy(FOCUS); camera.position.set(FOCUS.x + 470, 600, FOCUS.z + 720); controls.update(); };
const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
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
  light: { bg: 0x2A3340, hemi: [0xC9D8EE, 0x4A4F55, 1.35], sun: [0xFFF1DC, 2.6], exp: 1.15, ground: 0xE4E7EB, apron: 0x2B4658, map: tex,
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
  const want = avg > 0.03 ? Math.max(0.75, pr - 0.25) : (avg < 0.014 ? Math.min(Math.min(devicePixelRatio, 1.5), pr + 0.25) : pr);
  if (want !== pr) { pr = want; renderer.setPixelRatio(pr); } };
renderer.shadowMap.needsUpdate = true;
const frame = () => {
  const dt = Math.min(clock.getDelta(), 0.05), now = clock.elapsedTime; adapt(dt);
  UN.forEach((u, i) => { cars[i].position.set(u.x, heightAt(u.x, u.y) + 0.2, u.y); cars[i].rotation.y = -u.heading; });
  const hp = UN[0] ? { x: UN[0].x, z: UN[0].y } : { x: FOCUS.x, z: FOCUS.z }; const hy = heightAt(hp.x, hp.z);
  glow.position.y = hy + 1.8; pulse.position.y = hy + 1.8;
  glow.position.x = pulse.position.x = hp.x; glow.position.z = pulse.position.z = hp.z;
  const k = (now % 2.4) / 2.4; pulse.scale.setScalar(1 + k * 1.6); pulse.material.opacity = 0.5 * (1 - k);
  if (follow) controls.target.lerp(new THREE.Vector3(hp.x, 0, hp.z), 0.06);
  controls.update(); projectTip(hp);
  renderer.render(scene, camera);
};
let active = false;
const setActive = on => { if (on === active) return; active = on; renderer.setAnimationLoop(on ? frame : null); if (on) { clock.getDelta(); resize(); } };
const flyTo = (x, z, dist = 520, az = 0.9) => { controls.target.set(x, 0, z); camera.position.set(x + Math.sin(az) * dist * 0.75, dist * 0.62, z + Math.cos(az) * dist * 0.75); controls.update(); };
window.map3d = { zoomIn: () => dolly(0.78), zoomOut: () => dolly(1.28), toggleFollow, setTheme, setActive, reset, flyTo,
  pose: () => [...camera.position.toArray(), ...controls.target.toArray()].map(n => +n.toFixed(2)), controls };
setActive(true);
