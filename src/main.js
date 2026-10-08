import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0e);
scene.fog = new THREE.Fog(0x090b0e, 8, 30);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe8edf5, 0x18202a, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 3.4);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const fill = new THREE.DirectionalLight(0x91a9c7, 1.25);
fill.position.set(-4, 4, 2);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(7, 96),
  new THREE.MeshStandardMaterial({ color: 0x11161c, roughness: 0.92 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const skin = new THREE.MeshStandardMaterial({ color: 0x777d84, roughness: 0.58, metalness: 0 });
const dark = new THREE.MeshStandardMaterial({ color: 0x343a42, roughness: 0.72 });
const joint = new THREE.MeshStandardMaterial({ color: 0x606871, roughness: 0.6 });

function add(parent, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(...position);
  m.scale.set(...scale);
  m.rotation.set(...rotation);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function capsule(parent, radius, length, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  return add(parent, new THREE.CapsuleGeometry(radius, length, 12, 20), material, position, scale, rotation);
}

function sphere(parent, radius, material, position, scale = [1, 1, 1]) {
  return add(parent, new THREE.SphereGeometry(radius, 24, 16), material, position, scale);
}

function lathe(parent, points, material, position, scale = [1, 1, 1]) {
  return add(parent, new THREE.LatheGeometry(points, 32), material, position, scale);
}

// STEP 1: continuous human base-mesh study.
// This is intentionally a neutral anatomical base, not clothing, hair or final skin.
const human = new THREE.Group();
human.position.y = 0.03;
scene.add(human);

// Pelvis + torso: ring profile gives the body one continuous human silhouette.
lathe(human, [
  new THREE.Vector2(0.25, 0.86),
  new THREE.Vector2(0.42, 0.98),
  new THREE.Vector2(0.46, 1.15),
  new THREE.Vector2(0.39, 1.36),
  new THREE.Vector2(0.36, 1.58),
  new THREE.Vector2(0.43, 1.78),
  new THREE.Vector2(0.50, 1.98),
  new THREE.Vector2(0.47, 2.16),
  new THREE.Vector2(0.35, 2.31),
  new THREE.Vector2(0.22, 2.40)
], skin, [0, 0, 0], [1, 1, 0.78]);

// Neck and head blockout with a jaw transition.
capsule(human, 0.145, 0.20, skin, [0, 2.48, 0], [1, 1, 0.9]);
lathe(human, [
  new THREE.Vector2(0.14, 2.48),
  new THREE.Vector2(0.25, 2.52),
  new THREE.Vector2(0.33, 2.61),
  new THREE.Vector2(0.36, 2.75),
  new THREE.Vector2(0.35, 2.91),
  new THREE.Vector2(0.31, 3.05),
  new THREE.Vector2(0.23, 3.15),
  new THREE.Vector2(0.10, 3.19),
  new THREE.Vector2(0.0, 3.20)
], skin, [0, 0, 0], [0.94, 1, 0.86]);

// Ears are part of the base anatomy; facial detail comes later.
for (const side of [-1, 1]) {
  sphere(human, 0.075, joint, [side * 0.34, 2.79, 0], [0.48, 1.05, 0.68]);
}

// Shoulders, arms, elbows, forearms and hands.
for (const side of [-1, 1]) {
  sphere(human, 0.20, skin, [side * 0.48, 2.25, 0], [1.08, 0.92, 0.86]);
  capsule(human, 0.145, 0.45, skin, [side * 0.58, 1.96, 0], [1, 1, 1], [0, 0, side * 0.06]);
  sphere(human, 0.135, joint, [side * 0.62, 1.64, 0], [1, 0.96, 0.94]);
  capsule(human, 0.115, 0.50, skin, [side * 0.63, 1.39, 0], [1, 1.02, 1], [0, 0, side * 0.03]);
  sphere(human, 0.115, skin, [side * 0.63, 1.10, 0], [0.95, 1.05, 0.9]);
  capsule(human, 0.105, 0.18, skin, [side * 0.63, 0.96, 0.02], [1, 1, 0.78]);
  for (let finger = 0; finger < 5; finger++) {
    const x = side * (0.63 + (finger - 2) * 0.027);
    capsule(human, 0.016, 0.09, skin, [x, 0.84, 0.025], [1, 1, 0.82]);
  }
}

// Legs: hips -> thighs -> knees -> shins -> ankles -> feet.
for (const side of [-1, 1]) {
  const x = side * 0.20;
  capsule(human, 0.16, 0.58, skin, [x, 0.67, 0], [1.03, 1.08, 1]);
  sphere(human, 0.15, joint, [x, 0.35, 0], [1, 0.92, 0.96]);
  capsule(human, 0.125, 0.58, skin, [x, 0.16, 0], [1, 1.10, 1]);
  capsule(human, 0.10, 0.18, skin, [x, -0.10, 0.06], [1.1, 1, 1.25]);
  add(human, new THREE.BoxGeometry(0.28, 0.16, 0.62), dark, [x, -0.19, 0.12]);
}

// Topology inspection overlay. Edges are deliberately visible for STEP 1.
const topology = new THREE.Group();
human.traverse((object) => {
  if (!object.isMesh || object.geometry.type === 'BoxGeometry') return;
  const edges = new THREE.EdgesGeometry(object.geometry, 18);
  const lines = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x171a1f, transparent: true, opacity: 0.52 })
  );
  lines.position.copy(object.position);
  lines.rotation.copy(object.rotation);
  lines.scale.copy(object.scale);
  topology.add(lines);
});
human.add(topology);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.78, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.006;
scene.add(shadow);

// Camera: orbit the model so the user can inspect the base from every angle.
let yaw = 0.38;
let pitch = 0.06;
let distance = 5.7;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateCamera() {
  const targetY = 1.53;
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
  pitch = Math.max(-0.20, Math.min(0.30, pitch));
  lastX = event.clientX;
  lastY = event.clientY;
  updateCamera();
});
renderer.domElement.addEventListener('pointerup', () => { dragging = false; });
renderer.domElement.addEventListener('wheel', (event) => {
  distance = Math.max(4.1, Math.min(8, distance + event.deltaY * 0.003));
  updateCamera();
}, { passive: true });

let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.016;
  human.position.y = 0.03 + Math.sin(time * 1.4) * 0.002;
  shadow.scale.setScalar(1 - Math.sin(time * 1.4) * 0.008);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
