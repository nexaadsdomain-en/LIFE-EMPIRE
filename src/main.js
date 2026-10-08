import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { MarchingCubes } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/objects/MarchingCubes.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c0f);
scene.fog = new THREE.Fog(0x0a0c0f, 9, 28);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe7e0d6, 0x151a20, 2.1));
const key = new THREE.DirectionalLight(0xfff8ee, 3.0);
key.position.set(3.5, 6.5, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fb4cc, 1.0);
rim.position.set(-4, 4, -3);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 96),
  new THREE.MeshStandardMaterial({ color: 0x12161b, roughness: 0.94 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// STEP 1: one continuous human base surface.
// This pass is about believable human proportions and silhouette before sculpting.
const clay = new THREE.MeshStandardMaterial({
  color: 0xb8a99c,
  roughness: 0.82,
  metalness: 0,
  flatShading: false
});

const RES = 72;
const FIELD_W = 1.65;
const FIELD_H = 3.65;
const FIELD_D = 0.95;
const body = new MarchingCubes(RES, clay, false, false);
body.isolation = 0;
body.position.set(0, FIELD_H / 2, 0);
body.scale.set(FIELD_W, FIELD_H, FIELD_D);
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

function smoothMin(a, b, k = 0.065) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function humanSdf(x, y, z) {
  const parts = [];

  // Feet, shins, knees and thighs: long human leg proportions, not cylinders.
  for (const s of [-1, 1]) {
    parts.push(ellipsoidSdf(x, y, z, s * 0.105, 0.105, 0.075, 0.12, 0.09, 0.22));
    parts.push(capsuleSdf(x, y, z, s * 0.105, 0.14, 0, s * 0.105, 0.78, 0, 0.105));
    parts.push(ellipsoidSdf(x, y, z, s * 0.105, 0.80, 0, 0.125, 0.13, 0.12));
    parts.push(capsuleSdf(x, y, z, s * 0.105, 0.86, 0, s * 0.13, 1.48, 0.005, 0.145));
    parts.push(ellipsoidSdf(x, y, z, s * 0.14, 1.45, 0.01, 0.17, 0.20, 0.16));
  }

  // Pelvis and hips. Glute volume sits subtly behind the pelvis instead of forming a giant ball.
  parts.push(ellipsoidSdf(x, y, z, 0, 1.50, 0.00, 0.32, 0.27, 0.21));
  parts.push(ellipsoidSdf(x, y, z, -0.16, 1.48, -0.08, 0.19, 0.22, 0.16));
  parts.push(ellipsoidSdf(x, y, z, 0.16, 1.48, -0.08, 0.19, 0.22, 0.16));

  // Waist, abdomen and rib cage: a clear natural taper from pelvis to chest.
  parts.push(ellipsoidSdf(x, y, z, 0, 1.78, 0.00, 0.255, 0.30, 0.175));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.08, 0.00, 0.285, 0.33, 0.19));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.38, 0.00, 0.34, 0.34, 0.215));

  // Subtle chest volumes, integrated into the rib cage rather than oversized separate spheres.
  parts.push(ellipsoidSdf(x, y, z, -0.145, 2.43, 0.135, 0.145, 0.16, 0.105));
  parts.push(ellipsoidSdf(x, y, z,  0.145, 2.43, 0.135, 0.145, 0.16, 0.105));

  // Shoulders, neck and head.
  for (const s of [-1, 1]) {
    parts.push(ellipsoidSdf(x, y, z, s * 0.335, 2.53, 0, 0.16, 0.15, 0.16));
    parts.push(capsuleSdf(x, y, z, s * 0.43, 2.52, 0, s * 0.64, 2.24, 0, 0.11));
    parts.push(capsuleSdf(x, y, z, s * 0.64, 2.24, 0, s * 0.70, 1.91, 0, 0.085));
    parts.push(ellipsoidSdf(x, y, z, s * 0.70, 1.83, 0, 0.10, 0.125, 0.085));

    // Hand mass first; fingers remain simple until the sculpt/retopology stages.
    parts.push(ellipsoidSdf(x, y, z, s * 0.70, 1.70, 0.00, 0.085, 0.15, 0.065));
    for (let i = -1; i <= 1; i++) {
      parts.push(capsuleSdf(
        x, y, z,
        s * (0.68 + i * 0.016), 1.63, -0.008 + i * 0.015,
        s * (0.67 + i * 0.016), 1.50, -0.012 + i * 0.015,
        0.022
      ));
    }
  }

  parts.push(capsuleSdf(x, y, z, 0, 2.62, 0, 0, 2.84, 0, 0.105));
  parts.push(ellipsoidSdf(x, y, z, 0, 3.10, 0.015, 0.205, 0.27, 0.18));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.94, 0.005, 0.18, 0.15, 0.155));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.90, 0.135, 0.10, 0.09, 0.07));

  let d = parts[0];
  for (let i = 1; i < parts.length; i++) d = smoothMin(d, parts[i]);
  return d;
}

for (let z = 0; z < RES; z++) {
  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const fx = x / (RES - 1);
      const fy = y / (RES - 1);
      const fz = z / (RES - 1);
      const wx = (fx - 0.5) * FIELD_W;
      const wy = fy * FIELD_H;
      const wz = (fz - 0.5) * FIELD_D;
      body.field[x + RES * (y + RES * z)] = -humanSdf(wx, wy, wz);
    }
  }
}
body.update();
body.geometry.computeVertexNormals();

const wire = new THREE.LineSegments(
  new THREE.WireframeGeometry(body.geometry),
  new THREE.LineBasicMaterial({ color: 0x25201d, transparent: true, opacity: 0.12 })
);
body.add(wire);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.72, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.006;
scene.add(shadow);

let yaw = 0;
let pitch = 0.02;
let distance = 5.7;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateCamera() {
  const targetY = 1.72;
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
  pitch = Math.max(-0.35, Math.min(0.35, pitch));
  lastX = event.clientX;
  lastY = event.clientY;
  updateCamera();
});
renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
renderer.domElement.addEventListener('pointercancel', () => { dragging = false; });
renderer.domElement.addEventListener('wheel', (event) => {
  distance = Math.max(4.2, Math.min(7.0, distance + event.deltaY * 0.003));
  updateCamera();
}, { passive: true });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
