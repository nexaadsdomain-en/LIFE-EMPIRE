import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { MarchingCubes } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/objects/MarchingCubes.js';

const app = document.querySelector('#app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
scene.fog = new THREE.Fog(0x0b0d10, 9, 22);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.05, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xf0e7dc, 0x171b21, 2.0));

const key = new THREE.DirectionalLight(0xfff4e8, 3.8);
key.position.set(4.5, 7.5, 5.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);

const fill = new THREE.DirectionalLight(0xc8d8ef, 1.15);
fill.position.set(-4, 4, -5);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(7, 96),
  new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// STEP 1 — ORIGINAL HUMAN BASE
// One continuous anatomical surface. This is deliberately a human base,
// not a collection of visible primitives and not a kitbash.

const FIELD_W = 2.25;
const FIELD_H = 4.10;
const FIELD_D = 1.25;
const RES = 80;

const skin = new THREE.MeshStandardMaterial({
  color: 0xb8947f,
  roughness: 0.68,
  metalness: 0.0
});

const human = new MarchingCubes(RES, skin, false, false, 900000);
human.isolation = 0;
human.position.y = FIELD_H * 0.5;
human.scale.set(FIELD_W, FIELD_H, FIELD_D);
human.castShadow = true;
human.receiveShadow = true;
human.name = 'LIFE EMPIRE — Human Base Surface';

function ellipsoid(p, c, r) {
  const x = (p.x - c.x) / r.x;
  const y = (p.y - c.y) / r.y;
  const z = (p.z - c.z) / r.z;
  return Math.sqrt(x*x + y*y + z*z) - 1;
}

function capsule(p, a, b, radius) {
  const abx = b.x-a.x, aby = b.y-a.y, abz = b.z-a.z;
  const apx = p.x-a.x, apy = p.y-a.y, apz = p.z-a.z;
  const t = THREE.MathUtils.clamp((apx*abx + apy*aby + apz*abz) / (abx*abx + aby*aby + abz*abz), 0, 1);
  const qx = apx-abx*t, qy = apy-aby*t, qz = apz-abz*t;
  return Math.sqrt(qx*qx + qy*qy + qz*qz) - radius;
}

function smoothMin(a, b, k) {
  const h = THREE.MathUtils.clamp(0.5 + 0.5 * (b-a) / k, 0, 1);
  return THREE.MathUtils.lerp(b, a, h) - k*h*(1-h);
}

function smoothUnion(list, k = 0.09) {
  let d = list[0];
  for (let i = 1; i < list.length; i++) d = smoothMin(d, list[i], k);
  return d;
}

function humanSdf(p) {
  const parts = [];

  // Feet and lower legs: long, believable adult proportions.
  for (const s of [-1, 1]) {
    parts.push(ellipsoid(p, {x:s*0.155, y:0.105, z:0.075}, {x:0.135, y:0.085, z:0.225}));
    parts.push(capsule(p, {x:s*0.15,y:0.18,z:0}, {x:s*0.145,y:1.18,z:0}, 0.125));
    parts.push(capsule(p, {x:s*0.145,y:1.05,z:0}, {x:s*0.19,y:2.00,z:0}, 0.165));
    parts.push(ellipsoid(p, {x:s*0.145,y:1.14,z:0.015}, {x:0.14,y:0.15,z:0.14}));
  }

  // Pelvis and glute mass, kept restrained.
  parts.push(ellipsoid(p, {x:0,y:1.66,z:0}, {x:0.36,y:0.39,z:0.235}));
  parts.push(ellipsoid(p, {x:-0.16,y:1.67,z:-0.045}, {x:0.20,y:0.25,z:0.205}));
  parts.push(ellipsoid(p, {x: 0.16,y:1.67,z:-0.045}, {x:0.20,y:0.25,z:0.205}));

  // Abdomen/waist: narrower than ribcage and pelvis.
  parts.push(capsule(p, {x:0,y:1.72,z:0}, {x:0,y:2.48,z:0}, 0.255));
  parts.push(ellipsoid(p, {x:0,y:2.08,z:0.005}, {x:0.275,y:0.40,z:0.205}));

  // Rib cage with a natural shoulder line, not exaggerated.
  parts.push(ellipsoid(p, {x:0,y:2.50,z:0}, {x:0.43,y:0.54,z:0.235}));
  parts.push(ellipsoid(p, {x:0,y:2.70,z:0.015}, {x:0.47,y:0.28,z:0.225}));

  // Neck.
  parts.push(capsule(p, {x:0,y:2.66,z:0}, {x:0,y:2.96,z:0}, 0.115));

  // Head: cranial mass + jaw/chin for a recognizable human silhouette.
  parts.push(ellipsoid(p, {x:0,y:3.25,z:0.005}, {x:0.205,y:0.275,z:0.185}));
  parts.push(ellipsoid(p, {x:0,y:3.08,z:0.035}, {x:0.17,y:0.20,z:0.16}));
  parts.push(ellipsoid(p, {x:0,y:3.00,z:0.075}, {x:0.115,y:0.12,z:0.115}));

  // Shoulders and arms in a relaxed A-pose.
  for (const s of [-1, 1]) {
    parts.push(ellipsoid(p, {x:s*0.39,y:2.66,z:0}, {x:0.16,y:0.15,z:0.16}));
    parts.push(capsule(p, {x:s*0.40,y:2.63,z:0}, {x:s*0.61,y:2.18,z:0.005}, 0.125));
    parts.push(capsule(p, {x:s*0.61,y:2.18,z:0.005}, {x:s*0.68,y:1.60,z:0.01}, 0.105));
    parts.push(ellipsoid(p, {x:s*0.68,y:1.49,z:0.01}, {x:0.09,y:0.14,z:0.075}));

    // Thumb and finger mass are integrated into the hand silhouette.
    parts.push(capsule(p, {x:s*0.68,y:1.48,z:0.0}, {x:s*0.72,y:1.29,z:0.015}, 0.052));
    parts.push(capsule(p, {x:s*0.68,y:1.47,z:-0.04}, {x:s*0.70,y:1.28,z:-0.04}, 0.032));
    parts.push(capsule(p, {x:s*0.68,y:1.47,z:0.04}, {x:s*0.70,y:1.29,z:0.04}, 0.032));
  }

  return smoothUnion(parts, 0.085);
}

const p = new THREE.Vector3();
for (let z = 0; z < RES; z++) {
  const fz = z / (RES - 1);
  for (let y = 0; y < RES; y++) {
    const fy = y / (RES - 1);
    for (let x = 0; x < RES; x++) {
      const fx = x / (RES - 1);
      p.set(
        (fx - 0.5) * FIELD_W,
        fy * FIELD_H,
        (fz - 0.5) * FIELD_D
      );
      human.field[x + RES * (y + RES * z)] = -humanSdf(p);
    }
  }
}
human.update();
human.geometry.computeVertexNormals();
scene.add(human);

// Facial definition sits on the continuous head surface.
const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xe8e5df, roughness: 0.35 });
const irisMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.28 });

function addEye(x) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 20, 14), eyeWhite);
  eye.scale.set(1.15, 0.72, 0.52);
  eye.position.set(x, 3.22, 0.165);
  eye.castShadow = true;
  human.add(eye);

  const iris = new THREE.Mesh(new THREE.SphereGeometry(0.021, 16, 12), irisMat);
  iris.scale.set(1.0, 0.85, 0.45);
  iris.position.set(x, 3.22, 0.201);
  human.add(iris);
}
addEye(-0.073);
addEye(0.073);

const nose = new THREE.Mesh(
  new THREE.SphereGeometry(0.045, 18, 14),
  skin
);
nose.scale.set(0.72, 1.0, 1.55);
nose.position.set(0, 3.11, 0.19);
nose.castShadow = true;
human.add(nose);

for (const s of [-1, 1]) {
  const ear = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 10),
    skin
  );
  ear.scale.set(0.48, 1.35, 0.7);
  ear.position.set(s*0.195, 3.16, 0.005);
  ear.castShadow = true;
  human.add(ear);
}

// Clean hair cap makes the base immediately read as a game character.
const hair = new THREE.Mesh(
  new THREE.SphereGeometry(0.215, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
  new THREE.MeshStandardMaterial({ color: 0x211b18, roughness: 0.78 })
);
hair.scale.set(1.03, 0.90, 0.98);
hair.position.set(0, 3.36, -0.01);
hair.castShadow = true;
human.add(hair);

const browMat = new THREE.MeshStandardMaterial({ color: 0x1f1917, roughness: 0.7 });
for (const s of [-1, 1]) {
  const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.065, 5, 10), browMat);
  brow.rotation.z = s * 0.12;
  brow.rotation.y = 0.12;
  brow.position.set(s*0.073, 3.285, 0.17);
  human.add(brow);
}

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.72, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.008;
scene.add(shadow);

let yaw = 0;
let pitch = 0.03;
let distance = 5.15;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateCamera() {
  const targetY = 1.92;
  camera.position.set(
    Math.sin(yaw) * Math.cos(pitch) * distance,
    targetY + Math.sin(pitch) * distance,
    Math.cos(yaw) * Math.cos(pitch) * distance
  );
  camera.lookAt(0, targetY, 0);
}
updateCamera();

renderer.domElement.addEventListener('pointerdown', e => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e => {
  if (!dragging) return;
  yaw -= (e.clientX - lastX) * 0.006;
  pitch += (e.clientY - lastY) * 0.004;
  pitch = Math.max(-0.34, Math.min(0.34, pitch));
  lastX = e.clientX;
  lastY = e.clientY;
  updateCamera();
});
renderer.domElement.addEventListener('pointerup', () => dragging = false);
renderer.domElement.addEventListener('pointercancel', () => dragging = false);
renderer.domElement.addEventListener('wheel', e => {
  distance = THREE.MathUtils.clamp(distance + e.deltaY * 0.003, 4.2, 6.6);
  updateCamera();
}, { passive: true });

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
