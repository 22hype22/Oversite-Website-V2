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
controls.enableDamping = true; controls.dampingFactor = 0.08;
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

// ── buildings ──
const box = new THREE.BoxGeometry(1, 1, 1); box.translate(0, 0.5, 0);
const bMat = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0.05, flatShading: true });
const bld = new THREE.InstancedMesh(box, bMat, GEO.buildings.length);
bld.castShadow = bld.receiveShadow = true;
const M = new THREE.Matrix4(), P = new THREE.Vector3(), Q = new THREE.Quaternion(), Sc = new THREE.Vector3(), C = new THREE.Color();
const palette = [[0xD3D7DD, 0xE3E6EB], [0x3E434B, 0x50565F], [0x8A745F, 0xA08A72]];
let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
GEO.buildings.forEach(([x, y, L, Wd, ang, h, k], i) => {
  P.set(x, 0, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -ang); Sc.set(L, h, Wd);
  bld.setMatrixAt(i, M.compose(P, Q, Sc));
  C.setHex(palette[k][rnd() < 0.5 ? 0 : 1]).offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
  bld.setColorAt(i, C);
});
scene.add(bld);

// ── trees ──
const cone = new THREE.ConeGeometry(3.2, 9, 6); cone.translate(0, 4.5, 0);
const tMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
const trees = new THREE.InstancedMesh(cone, tMat, GEO.trees.length);
trees.castShadow = true; trees.receiveShadow = true;
GEO.trees.forEach(([x, y, s], i) => {
  P.set(x, 0, y); Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd() * 6.28); Sc.set(s, s * (0.9 + rnd() * 0.5), s);
  trees.setMatrixAt(i, M.compose(P, Q, Sc));
  C.setHex(0x2F5A2B).offsetHSL((rnd() - 0.5) * 0.05, 0, (rnd() - 0.5) * 0.12);
  trees.setColorAt(i, C);
});
scene.add(trees);

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
           bld: palette, tree: 0x2F5A2B },
  dark:  { bg: 0x121214, hemi: [0xB9C2D0, 0x2A2C31, 1.15], sun: [0xE8ECF2, 1.5], exp: 1.0, ground: 0xF2F2F2, apron: 0x111113, map: texDark,
           bld: [[0x3C3F46, 0x474B53], [0x2A2D33, 0x33373E], [0x3A3D44, 0x44484F]], tree: 0x2B3A2E },
};
const setTheme = name => { const T = THEMES[name] || THEMES.light;
  scene.background.setHex(T.bg); scene.fog.color.setHex(T.bg);
  hemi.color.setHex(T.hemi[0]); hemi.groundColor.setHex(T.hemi[1]); hemi.intensity = T.hemi[2];
  sun.color.setHex(T.sun[0]); sun.intensity = T.sun[1]; renderer.toneMappingExposure = T.exp;
  ground.material.color.setHex(T.ground); if (ground.material.map !== T.map) { ground.material.map = T.map; ground.material.needsUpdate = true; }
  apron.material.color.setHex(T.apron);
  // recolour buildings and trees for the theme (deterministic variation, same seed as construction)
  let sd = 3; const rn = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  GEO.buildings.forEach(([, , , , , , k], i) => { C.setHex(T.bld[k][rn() < 0.5 ? 0 : 1]).offsetHSL(0, 0, (rn() - 0.5) * 0.06); bld.setColorAt(i, C); });
  GEO.trees.forEach((_, i) => { rn(); rn(); C.setHex(T.tree).offsetHSL((rn() - 0.5) * 0.05, 0, (rn() - 0.5) * 0.12); trees.setColorAt(i, C); });
  bld.instanceColor.needsUpdate = true; trees.instanceColor.needsUpdate = true; };

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
window.map3d = { zoomIn: () => dolly(0.78), zoomOut: () => dolly(1.28), toggleFollow, setTheme, setActive, reset };
setActive(true);
