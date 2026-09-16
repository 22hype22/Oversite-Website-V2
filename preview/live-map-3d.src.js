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
scene.fog = new THREE.Fog(0x232A33, 900, 3000);

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

// ── ground: the map itself ──
const loader = new THREE.TextureLoader();
const tex = loader.load(MAP_LIGHT, () => { loading.classList.add('off'); renderer.shadowMap.needsUpdate = true; });
const texDark = loader.load(MAP_DARK);
for (const t of [tex, texDark]) { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); }
const ground = new THREE.Mesh(new THREE.PlaneGeometry(W, W),
  new THREE.MeshStandardMaterial({ map: tex, color: 0xE4E7EB, roughness: 1, metalness: 0 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(W / 2, 0, W / 2); ground.receiveShadow = true;
scene.add(ground);
// apron beyond the map edge
const apron = new THREE.Mesh(new THREE.PlaneGeometry(W * 4, W * 4), new THREE.MeshStandardMaterial({ color: 0x1C2128, roughness: 1 }));
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
const towerRank = GEO.buildings.map((b, i) => [b[5], i]).filter(([h]) => h > 20).sort((a, b) => b[0] - a[0]).map(([, i]) => i);
const wallColour = (hex, k, i) => { const r = towerRank.indexOf(i); if (r >= 0 && TOWER[r] != null) return C.setHex(TOWER[r]); return roofColour(hex || '#888888', k); };
GEO.buildings.forEach(([x, y, L, Wd, ang, h, k, hex], i) => {
  P.set(x, 0, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang); Sc.set(L, h, Wd);
  bld.setMatrixAt(i, M.compose(P, Q, Sc));
  wallColour(hex, k, i).offsetHSL(0, 0, (rnd() - 0.5) * 0.04);
  bld.setColorAt(i, C);
});
scene.add(bld);

// ── trees: pines, broadleaf and cherry, sized like the in-game ones ──
const tMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4A3728, roughness: 1 });
const pineGeo = new THREE.ConeGeometry(3.2, 11, 7); pineGeo.translate(0, 7.5, 0);
const leafGeo = new THREE.IcosahedronGeometry(4.2, 1); leafGeo.translate(0, 7.2, 0);
const trunkGeo = new THREE.CylinderGeometry(0.5, 0.7, 4, 5); trunkGeo.translate(0, 2, 0);
const species = GEO.trees.map((_, i) => { const r = rnd(); return r < 0.42 ? 0 : r < 0.92 ? 1 : 2; });   // 0 pine, 1 broadleaf, 2 cherry
const nPine = species.filter(s => s === 0).length, nLeaf = species.length - nPine;
const pines = new THREE.InstancedMesh(pineGeo, tMat, nPine), leafs = new THREE.InstancedMesh(leafGeo, tMat, nLeaf), trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, nLeaf);
for (const m of [pines, leafs, trunks]) { m.castShadow = true; m.receiveShadow = true; }
const TREE_COL = { light: [0x214A28, 0x3C7A34, 0xE8B0C4], dark: [0x2A3A2E, 0x3A4A3C, 0x6E5560] };
const treeIdx = []; let ip = 0, il = 0;
GEO.trees.forEach(([x, y, s], i) => {
  const sp = species[i], sc = s * (0.55 + rnd() * 0.35);
  P.set(x, 0, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28);
  if (sp === 0) { Sc.set(sc, sc * (0.9 + rnd() * 0.4), sc); pines.setMatrixAt(ip, M.compose(P, Q, Sc)); treeIdx.push([0, ip++]); }
  else { Sc.set(sc, sc * (0.85 + rnd() * 0.3), sc); leafs.setMatrixAt(il, M.compose(P, Q, Sc)); trunks.setMatrixAt(il, M.compose(P, Q, Sc)); treeIdx.push([sp, il++]); }
});
const colourTrees = theme => { const T = TREE_COL[theme] || TREE_COL.light; let sd2 = 11; const r2 = () => (sd2 = (sd2 * 16807) % 2147483647) / 2147483647;
  treeIdx.forEach(([sp, idx]) => { C.setHex(T[sp]).offsetHSL((r2() - 0.5) * 0.04, 0, (r2() - 0.5) * 0.10); (sp === 0 ? pines : leafs).setColorAt(idx, C); });
  pines.instanceColor.needsUpdate = true; leafs.instanceColor.needsUpdate = true; };
colourTrees('light');
scene.add(pines, leafs, trunks);

// ── routes (same polylines as the 2D page) ──
const pathOf = pts => { const cp = new THREE.CurvePath(); for (let i = 1; i < pts.length; i++)
  cp.add(new THREE.LineCurve3(new THREE.Vector3(pts[i - 1][0], 1.4, pts[i - 1][1]), new THREE.Vector3(pts[i][0], 1.4, pts[i][1]))); return cp; };
const ROUTE_A = [[1332, 275], [1340, 520], [1350, 760], [1350, 1000], [1352, 1452], [300, 1452]];
const ROUTE_B = [[188, 792], [660, 792], [660, 988], [1180, 988], [1240, 1040], [1240, 1330], [1350, 1330]];
const routeA = pathOf(ROUTE_A), routeB = pathOf(ROUTE_B);
const tube = (curve, color, r, op) => { const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, r, 6, false),
  new THREE.MeshBasicMaterial({ color, transparent: op < 1, opacity: op, depthWrite: false })); m.renderOrder = 2; return m; };
scene.add(tube(routeA, 0xF0F2F5, 1.6, 0.85), tube(routeA, 0xF0F2F5, 5.5, 0.08));
scene.add(tube(routeB, 0xB8D94A, 1.8, 0.95), tube(routeB, 0xB8D94A, 6.5, 0.10));

const stopGeo = new THREE.CylinderGeometry(5, 5, 1.2, 24), ringGeo = new THREE.RingGeometry(5, 6.6, 32);
const addStop = ([x, y], color) => {
  const s = new THREE.Mesh(stopGeo, new THREE.MeshBasicMaterial({ color: 0x0B0B0C })); s.position.set(x, 1.5, y);
  const r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.set(x, 2.2, y);
  scene.add(s, r);
};
[[1332, 275], [1348, 640], [1352, 1452], [880, 1452], [300, 1452]].forEach(p => addStop(p, 0xF0F2F5));
[[188, 792], [660, 988], [1240, 1330], [1350, 1330]].forEach(p => addStop(p, 0xB8D94A));

// ── vehicles ──
const busGeo = new THREE.BoxGeometry(14, 5.5, 6); busGeo.translate(0, 2.75, 0);
const mkBus = color => { const b = new THREE.Mesh(busGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.55, roughness: 0.5 }));
  scene.add(b); return b; };
const UN = window.UNITS || [], COL = { pd: 0x4C8DFF, fd: 0xE24B4B, dot: 0xE9C24C };
const cars = UN.map((u, i) => mkBus(i === 0 ? 0xF0F2F5 : COL[u.dept]));
const incident = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xE24B4B }));
incident.position.set(1160, 4, 1092); scene.add(incident);
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
const projectTip = p => { V.set(p.x, 8, p.z).project(camera);
  tip.style.left = ((V.x + 1) / 2 * innerWidth) + 'px'; tip.style.top = ((1 - V.y) / 2 * innerHeight) + 'px';
  tip.style.opacity = V.z < 1 ? 1 : 0; };

// ── controls wiring ──
const dolly = f => { const d = camera.position.clone().sub(controls.target); camera.position.copy(controls.target).add(d.multiplyScalar(f)); controls.update(); };
const zfit = document.getElementById('zfit');
const toggleFollow = () => { follow = !follow; zfit?.setAttribute('aria-pressed', follow); controls.autoRotate = false; if (!follow) reset(); };

// ── themes ──
const THEMES = {
  light: { bg: 0x232A33, hemi: [0xC9D8EE, 0x4A4F55, 1.35], sun: [0xFFF1DC, 2.6], exp: 1.15, ground: 0xE4E7EB, apron: 0x1C2128, map: tex,
         },
  dark:  { bg: 0x121214, hemi: [0xB9C2D0, 0x2A2C31, 1.15], sun: [0xE8ECF2, 1.5], exp: 1.0, ground: 0xF2F2F2, apron: 0x111113, map: texDark,
         },
};
const setTheme = name => { const T = THEMES[name] || THEMES.light;
  scene.background.setHex(T.bg); scene.fog.color.setHex(T.bg);
  hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2];
  sun.color.setHex(T.sun[0]); sun.intensity = T.sun[1]; renderer.toneMappingExposure = T.exp;
  ground.material.color.setHex(T.ground); if (ground.material.map !== T.map) { ground.material.map = T.map; ground.material.needsUpdate = true; }
  apron.material.color.setHex(T.apron);
  // recolour buildings and trees for the theme
  let sd = 3; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  GEO.buildings.forEach(([, , , , , , k, hex], i) => { wallColour(hex, k, i).offsetHSL(0, 0, (rn() - 0.5) * 0.04);
    if (name === 'dark') { const hsl = {}; C.getHSL(hsl); C.setHSL(hsl.h, hsl.s * 0.25, 0.16 + hsl.l * 0.35); }
    bld.setColorAt(i, C); });
  bld.instanceColor.needsUpdate = true; colourTrees(name); };

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
  UN.forEach((u, i) => { cars[i].position.set(u.x, 0.2, u.y); cars[i].rotation.y = -u.heading; });
  const hp = UN[0] ? { x: UN[0].x, z: UN[0].y } : { x: FOCUS.x, z: FOCUS.z };
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
