import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { MarchingCubes } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/objects/MarchingCubes.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c0f);
scene.fog = new THREE.Fog(0x0a0c0f, 7, 24);

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.05, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe7e0d6, 0x151a20, 2.0));
const key = new THREE.DirectionalLight(0xfff8ee, 3.0);
key.position.set(3.5, 6.5, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fb4cc, 1.15);
rim.position.set(-4, 4, -3);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 96),
  new THREE.MeshStandardMaterial({ color: 0x12161b, roughness: 0.94 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// STEP 1 is a single continuous surface. No boxes, capsules or separate mannequin parts.
// It is deliberately a neutral clay base: anatomy and proportions first, topology/retopo next.
const clay = new THREE.MeshStandardMaterial({
  color: 0xb8a99c,
  roughness: 0.82,
  metalness: 0.0,
  flatShading: false
});

const RES = 52;
const ISO = 0;
const FIELD_SIZE = 3.56;
const body = new MarchingCubes(RES, clay, false, false);
body.isolation = ISO;
body.position.set(0, -1.78, 0);
body.scale.set(FIELD_SIZE * 0.78, FIELD_SIZE, FIELD_SIZE * 0.72);
body.castShadow = true;
body.receiveShadow = true;
scene.add(body);

function ellipsoidSdf(x, y, z, cx, cy, cz, rx, ry, rz) {
  return Math.sqrt(
    ((x - cx) / rx) ** 2 +
    ((y - cy) / ry) ** 2 +
    ((z - cz) / rz) ** 2
  ) - 1;
}

function capsuleSdf(x, y, z, ax, ay, az, bx, by, bz, r) {
  const pax = x - ax, pay = y - ay, paz = z - az;
  const bax = bx - ax, bay = by - ay, baz = bz - az;
  const denom = bax * bax + bay * bay + baz * baz;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay + paz * baz) / denom));
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  const dz = paz - baz * h;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

function smoothMin(a, b, k = 0.055) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function addPart(parts, sdf) {
  parts.push(sdf);
}

function humanSdf(x, y, z) {
  const parts = [];

  // Pelvis and a tapered ribcage/abdomen profile.
  addPart(parts, ellipsoidSdf(x, y, z, 0, 0.72, 0.02, 0.36, 0.30, 0.24));
  addPart(parts, ellipsoidSdf(x, y, z, 0, 1.04, 0, 0.30, 0.42, 0.20));
  addPart(parts, ellipsoidSdf(x, y, z, 0, 1.48, 0, 0.27, 0.62, 0.19));
  addPart(parts, ellipsoidSdf(x, y, z, 0, 1.98, 0, 0.39, 0.47, 0.265));
  addPart(parts, ellipsoidSdf(x, y, z, 0, 2.27, 0, 0.34, 0.26, 0.23));

  // Neck, skull and jaw. Facial planes are kept simple for the base-mesh stage.
  addPart(parts, capsuleSdf(x, y, z, 0, 2.32, 0, 0, 2.53, 0, 0.13));
  addPart(parts, ellipsoidSdf(x, y, z, 0, 2.82, 0.02, 0.215, 0.27, 0.19));
  addPart(parts, ellipsoidSdf(x, y, z, 0, 2.64, -0.01, 0.19, 0.17, 0.17));
  addPart(parts, ellipsoidSdf(x, y, z, 0, 2.72, -0.135, 0.135, 0.12, 0.07));

  for (const s of [-1, 1]) {
    // Shoulder girdle and long, natural A-pose arms.
    addPart(parts, ellipsoidSdf(x, y, z, s * 0.39, 2.23, 0, 0.19, 0.18, 0.18));
    addPart(parts, capsuleSdf(x, y, z, s * 0.46, 2.18, 0, s * 0.67, 1.84, 0, 0.12));
    addPart(parts, capsuleSdf(x, y, z, s * 0.67, 1.84, 0, s * 0.69, 1.43, 0, 0.095));
    addPart(parts, ellipsoidSdf(x, y, z, s * 0.69, 1.26, 0, 0.105, 0.15, 0.09));
    addPart(parts, capsuleSdf(x, y, z, s * 0.65, 1.20, 0, s * 0.59, 1.07, -0.01, 0.038));
    addPart(parts, capsuleSdf(x, y, z, s * 0.69, 1.15, 0, s * 0.69, 0.99, 0, 0.042));

    // Thigh, knee, calf and foot.
    addPart(parts, capsuleSdf(x, y, z, s * 0.17, 0.72, 0, s * 0.18, 0.30, 0, 0.145));
    addPart(parts, ellipsoidSdf(x, y, z, s * 0.18, 0.31, -0.05, 0.12, 0.12, 0.075));
    addPart(parts, capsuleSdf(x, y, z, s * 0.18, 0.30, 0, s * 0.18, -0.07, 0.02, 0.10));
    addPart(parts, ellipsoidSdf(x, y, z, s * 0.18, 0.08, 0.055, 0.105, 0.22, 0.09));
    addPart(parts, ellipsoidSdf(x, y, z, s * 0.18, -0.17, 0.08, 0.135, 0.12, 0.24));

    // Neutral anatomical chest and glute volumes; no clothing yet.
    addPart(parts, ellipsoidSdf(x, y, z, s * 0.17, 1.95, -0.20, 0.17, 0.18, 0.09));
    addPart(parts, ellipsoidSdf(x, y, z, s * 0.18, 0.73, 0.15, 0.20, 0.25, 0.12));
  }

  let d = parts[0];
  for (let i = 1; i < parts.length; i++) d = smoothMin(d, parts[i]);
  return d;
}

// Build the continuous base surface directly into the Marching Cubes field.
// Field coordinates map to a 1x1x1 cube; y is remapped to the 3.56m character height.
for (let z = 0; z < RES; z++) {
  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const fx = x / (RES - 1);
      const fy = y / (RES - 1);
      const fz = z / (RES - 1);
      const wx = (fx - 0.5) * 1.42;
      const wy = fy * 3.56 - 0.28;
      const wz = (fz - 0.5) * 0.82;
      const d = humanSdf(wx, wy, wz);
      body.field[x + RES * (y + RES * z)] = -d;
    }
  }
}
body.update();
body.geometry.computeVertexNormals();

// Wireframe is an inspection aid for STEP 1. It is the actual generated surface, not a fake skeleton.
const wire = new THREE.LineSegments(
  new THREE.WireframeGeometry(body.geometry),
  new THREE.LineBasicMaterial({ color: 0x25201d, transparent: true, opacity: 0.18 })
);
body.add(wire);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.72, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.30 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.006;
scene.add(shadow);

let yaw = 0.22;
let pitch = 0.03;
let distance = 4.65;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateCamera() {
  const targetY = 1.54;
  camera.position.set(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    targetY + Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance
  );
  camera.lookAt(0, targetY, 0);
}
updateCamera();

renderer.domElement.addEventListener('pointerdown', (event) => {
  dragging = true;
  lastX = event.clientX;
  lastY = event.clientY;
  renderer.domElement.setPointerCapture(event.pointerId);
});
renderer.domElement.addEventListener('pointermove', (event) => {
  if (!dragging) return;
  yaw -= (event.clientX - lastX) * 0.006;
  pitch += (event.clientY - lastY) * 0.004;
  pitch = Math.max(-0.24, Math.min(0.32, pitch));
  lastX = event.clientX;
  lastY = event.clientY;
  updateCamera();
});
renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
renderer.domElement.addEventListener('pointercancel', () => { dragging = false; });
renderer.domElement.addEventListener('wheel', (event) => {
  distance = Math.max(3.7, Math.min(6.5, distance + event.deltaY * 0.003));
  updateCamera();
}, { passive: true });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
});
