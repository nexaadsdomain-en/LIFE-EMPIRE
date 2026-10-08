import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { MarchingCubes } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/objects/MarchingCubes.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c0f);
scene.fog = new THREE.Fog(0x0a0c0f, 8, 26);

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 100);
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
const key = new THREE.DirectionalLight(0xfff8ee, 3.2);
key.position.set(3.5, 6.5, 4.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9fb4cc, 1.1);
rim.position.set(-4, 4, -3);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 96),
  new THREE.MeshStandardMaterial({ color: 0x12161b, roughness: 0.94 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// STEP 1: one continuous clay surface. No boxes, spheres, capsules or mannequin parts.
// The field is intentionally larger than the character so the anatomy is never clipped.
const clay = new THREE.MeshStandardMaterial({
  color: 0xb8a99c,
  roughness: 0.82,
  metalness: 0,
  flatShading: false
});

const RES = 64;
const FIELD_W = 2.0;
const FIELD_H = 3.8;
const FIELD_D = 1.0;
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

function smoothMin(a, b, k = 0.075) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

function humanSdf(x, y, z) {
  const parts = [];

  for (const s of [-1, 1]) {
    parts.push(ellipsoidSdf(x, y, z, s * 0.18, 0.10, 0.075, 0.12, 0.11, 0.22));
    parts.push(capsuleSdf(x, y, z, s * 0.18, 0.18, 0, s * 0.18, 0.88, 0, 0.105));
    parts.push(ellipsoidSdf(x, y, z, s * 0.18, 0.90, -0.01, 0.125, 0.12, 0.105));
    parts.push(capsuleSdf(x, y, z, s * 0.18, 0.96, 0, s * 0.17, 1.62, 0.005, 0.145));
    parts.push(ellipsoidSdf(x, y, z, s * 0.17, 1.63, 0.12, 0.20, 0.25, 0.14));
    parts.push(ellipsoidSdf(x, y, z, s * 0.18, 2.22, -0.18, 0.17, 0.20, 0.10));
  }

  // Pelvis, abdomen and rib cage.
  parts.push(ellipsoidSdf(x, y, z, 0, 1.58, 0.015, 0.38, 0.29, 0.24));
  parts.push(ellipsoidSdf(x, y, z, 0, 1.87, 0.00, 0.31, 0.34, 0.21));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.20, 0.00, 0.29, 0.48, 0.20));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.52, 0.00, 0.42, 0.43, 0.27));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.78, 0.00, 0.34, 0.25, 0.22));

  // Neck and head.
  parts.push(capsuleSdf(x, y, z, 0, 2.74, 0, 0, 2.94, 0, 0.135));
  parts.push(ellipsoidSdf(x, y, z, 0, 3.17, 0.01, 0.225, 0.30, 0.20));
  parts.push(ellipsoidSdf(x, y, z, 0, 2.99, -0.01, 0.195, 0.16, 0.17));
  parts.push(ellipsoidSdf(x, y, z, 0, 3.02, -0.13, 0.14, 0.115, 0.075));

  // Shoulders, arms, palms and simplified fingers in a relaxed A-pose.
  for (const s of [-1, 1]) {
    parts.push(ellipsoidSdf(x, y, z, s * 0.40, 2.69, 0, 0.19, 0.18, 0.18));
    parts.push(capsuleSdf(x, y, z, s * 0.48, 2.67, 0, s * 0.72, 2.34, 0, 0.125));
    parts.push(capsuleSdf(x, y, z, s * 0.72, 2.34, 0, s * 0.78, 1.91, 0, 0.095));
    parts.push(ellipsoidSdf(x, y, z, s * 0.78, 1.82, 0, 0.105, 0.14, 0.09));
    for (let i = -1; i <= 1; i++) {
      parts.push(capsuleSdf(x, y, z, s * (0.75 + i * 0.018), 1.77, -0.015 + i * 0.018, s * (0.73 + i * 0.018), 1.62, -0.018 + i * 0.018, 0.032));
    }
  }

  let d = parts[0];
  for (let i = 1; i < parts.length; i++) d = smoothMin(d, parts[i]);
  return d;
}

// Marching Cubes uses a centered local cube. Map it directly to a 2m x 3.8m x 1m inspection volume.
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
  new THREE.LineBasicMaterial({ color: 0x25201d, transparent: true, opacity: 0.15 })
);
body.add(wire);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.85, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.006;
scene.add(shadow);

let yaw = 0;
let pitch = 0.02;
let distance = 5.25;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateCamera() {
  const targetY = 1.65;
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
  distance = Math.max(3.9, Math.min(7.0, distance + event.deltaY * 0.003));
  updateCamera();
}, { passive: true });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
