import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c0f);
scene.fog = new THREE.Fog(0x0a0c0f, 10, 30);

const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 0.05, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xe7e0d6, 0x151a20, 2.2));
const key = new THREE.DirectionalLight(0xfff6ea, 3.2);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9db4d0, 1.15);
rim.position.set(-4, 4.5, -4);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6.5, 96),
  new THREE.MeshStandardMaterial({ color: 0x12161b, roughness: 0.92 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// STEP 1: ORIGINAL HUMAN BASE MESH
// Built from deliberate anatomical cross-sections and clean polygon strips.
// No sphere/capsule/marching-cubes body mash. This is an original character blockout
// with human proportions intended to become the sculpt/retopo source.

const skin = new THREE.MeshStandardMaterial({
  color: 0xb7a293,
  roughness: 0.72,
  metalness: 0,
  flatShading: false
});

const darkSkin = new THREE.MeshStandardMaterial({
  color: 0x9b8477,
  roughness: 0.78,
  metalness: 0,
  flatShading: false
});

function loft(rings, radial = 20, material = skin, name = 'loft') {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let r = 0; r < rings.length; r++) {
    const ring = rings[r];
    for (let i = 0; i < radial; i++) {
      const a = (i / radial) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      positions.push(ring.x + ca * ring.rx, ring.y, ring.z + sa * ring.rz);
      normals.push(ca, 0, sa);
      uvs.push(i / radial, r / Math.max(1, rings.length - 1));
    }
  }

  for (let r = 0; r < rings.length - 1; r++) {
    for (let i = 0; i < radial; i++) {
      const a = r * radial + i;
      const b = r * radial + ((i + 1) % radial);
      const c = (r + 1) * radial + ((i + 1) % radial);
      const d = (r + 1) * radial + i;
      indices.push(a, b, d, b, c, d);
    }
  }

  const bottom = positions.length / 3;
  const top = bottom + 1;
  positions.push(rings[0].x, rings[0].y, rings[0].z);
  positions.push(rings[rings.length - 1].x, rings[rings.length - 1].y, rings[rings.length - 1].z);
  for (let i = 0; i < radial; i++) {
    const n = (i + 1) % radial;
    indices.push(bottom, n, i);
    const t0 = (rings.length - 1) * radial + i;
    const t1 = (rings.length - 1) * radial + n;
    indices.push(top, t0, t1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();

  const mesh = new THREE.Mesh(g, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function tubeBetween(points, radii, radial = 14, material = skin, name = 'limb') {
  return loft(points.map((p, i) => ({
    x: p[0], y: p[1], z: p[2], rx: radii[i], rz: radii[i] * 0.9
  })), radial, material, name);
}

function makeFoot(side) {
  const s = side;
  return loft([
    {x:s*0.115,y:0.045,z:0.075,rx:0.105,rz:0.18},
    {x:s*0.115,y:0.09,z:0.06,rx:0.10,rz:0.18},
    {x:s*0.115,y:0.17,z:0.015,rx:0.09,rz:0.15},
  ], 18, skin, `${side < 0 ? 'L' : 'R'} foot`);
}

function makeLeg(side) {
  const s = side;
  const thigh = tubeBetween([
    [s*0.14,0.20,0.0],[s*0.145,0.55,0.0],[s*0.145,0.95,0.0],
    [s*0.13,1.30,0.005],[s*0.125,1.48,0.0]
  ], [0.135,0.155,0.17,0.145,0.12], 18, skin, `${s<0?'L':'R'} thigh`);
  const calf = tubeBetween([
    [s*0.125,1.46,0.0],[s*0.12,1.70,0.0],[s*0.11,2.02,0.0],
    [s*0.10,2.32,0.0],[s*0.105,2.52,0.0]
  ], [0.12,0.105,0.095,0.09,0.095], 18, skin, `${s<0?'L':'R'} lower leg`);
  return [thigh, calf];
}

const torso = loft([
  {x:0,y:1.35,z:0.0,rx:0.29,rz:0.19},{x:0,y:1.48,z:0.0,rx:0.31,rz:0.20},
  {x:0,y:1.66,z:0.0,rx:0.255,rz:0.17},{x:0,y:1.86,z:0.0,rx:0.235,rz:0.165},
  {x:0,y:2.10,z:0.0,rx:0.275,rz:0.185},{x:0,y:2.34,z:0.0,rx:0.325,rz:0.205},
  {x:0,y:2.52,z:0.0,rx:0.37,rz:0.20},{x:0,y:2.62,z:0.0,rx:0.34,rz:0.18},
], 24, skin, 'Torso');

const pelvis = loft([
  {x:0,y:1.34,z:-0.005,rx:0.30,rz:0.20},{x:0,y:1.43,z:-0.01,rx:0.32,rz:0.205},
  {x:0,y:1.53,z:-0.005,rx:0.305,rz:0.20},{x:0,y:1.62,z:0.0,rx:0.27,rz:0.18},
], 24, skin, 'Pelvis');

const chest = loft([
  {x:0,y:2.20,z:0.02,rx:0.29,rz:0.18},{x:0,y:2.33,z:0.04,rx:0.325,rz:0.20},
  {x:0,y:2.45,z:0.05,rx:0.35,rz:0.205},{x:0,y:2.55,z:0.02,rx:0.355,rz:0.19},
], 24, skin, 'Chest');

const neck = loft([
  {x:0,y:2.54,z:0.0,rx:0.12,rz:0.105},{x:0,y:2.68,z:0.0,rx:0.105,rz:0.095},
  {x:0,y:2.82,z:0.0,rx:0.10,rz:0.09},
], 18, skin, 'Neck');

const head = loft([
  {x:0,y:2.82,z:0.01,rx:0.13,rz:0.115},{x:0,y:2.93,z:0.02,rx:0.18,rz:0.15},
  {x:0,y:3.10,z:0.025,rx:0.205,rz:0.165},{x:0,y:3.27,z:0.02,rx:0.19,rz:0.155},
  {x:0,y:3.39,z:0.01,rx:0.145,rz:0.125},{x:0,y:3.46,z:0.035,rx:0.105,rz:0.095},
], 24, skin, 'Head');

const jaw = loft([
  {x:0,y:2.89,z:0.09,rx:0.145,rz:0.10},{x:0,y:2.98,z:0.13,rx:0.17,rz:0.11},
  {x:0,y:3.07,z:0.14,rx:0.16,rz:0.11},
], 20, skin, 'Face');

function makeArm(side) {
  const s = side;
  const upper = tubeBetween([
    [s*0.33,2.52,0.0],[s*0.46,2.42,0.0],[s*0.58,2.20,0.0],[s*0.64,1.98,0.0]
  ], [0.115,0.12,0.105,0.095], 18, skin, `${s<0?'L':'R'} upper arm`);
  const fore = tubeBetween([
    [s*0.64,1.98,0.0],[s*0.66,1.77,0.0],[s*0.66,1.56,0.0],[s*0.655,1.37,0.0]
  ], [0.095,0.085,0.075,0.07], 18, skin, `${s<0?'L':'R'} forearm`);
  const palm = loft([
    {x:s*0.655,y:1.34,z:0,rx:0.065,rz:0.055},{x:s*0.655,y:1.25,z:0,rx:0.07,rz:0.06},
    {x:s*0.655,y:1.18,z:0,rx:0.06,rz:0.05}
  ], 16, skin, `${s<0?'L':'R'} hand`);
  const fingers = [];
  for (let i = 0; i < 4; i++) {
    const z = (i - 1.5) * 0.022;
    fingers.push(tubeBetween([
      [s*0.655,1.20,z],[s*(0.655 + 0.012*(i-1.5)),1.09,z],
      [s*(0.655 + 0.018*(i-1.5)),1.02,z]
    ], [0.019,0.016,0.012], 8, skin, `${s<0?'L':'R'} finger ${i+1}`));
  }
  return [upper, fore, palm, ...fingers];
}

function makeShoulder(side) {
  const s = side;
  return loft([
    {x:s*0.29,y:2.48,z:0,rx:0.13,rz:0.13},{x:s*0.39,y:2.47,z:0,rx:0.13,rz:0.125},
    {x:s*0.47,y:2.42,z:0,rx:0.11,rz:0.11},
  ], 18, skin, `${s<0?'Left':'Right'} shoulder`);
}
const shoulderL = makeShoulder(-1);
const shoulderR = makeShoulder(1);

function makeEar(side) {
  const s = side;
  return loft([
    {x:s*0.17,y:3.12,z:0.0,rx:0.035,rz:0.025},{x:s*0.205,y:3.13,z:0.0,rx:0.04,rz:0.028},
    {x:s*0.215,y:3.08,z:0.0,rx:0.028,rz:0.022}
  ], 12, skin, `${s<0?'L':'R'} ear`);
}

const nose = loft([
  {x:0,y:3.12,z:0.145,rx:0.055,rz:0.045},{x:0,y:3.08,z:0.19,rx:0.045,rz:0.04},
  {x:0,y:3.04,z:0.205,rx:0.035,rz:0.032},
], 12, darkSkin, 'Nose');

const character = new THREE.Group();
character.name = 'LIFE EMPIRE Original Human Base';
character.add(
  pelvis, torso, chest, neck, head, jaw, nose,
  shoulderL, shoulderR, makeEar(-1), makeEar(1), makeFoot(-1), makeFoot(1)
);
for (const side of [-1,1]) {
  for (const part of makeLeg(side)) character.add(part);
  for (const part of makeArm(side)) character.add(part);
}

const eyeMat = new THREE.MeshStandardMaterial({color:0x17191c, roughness:0.35});
for (const s of [-1,1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 10), eyeMat);
  eye.scale.set(1, 0.75, 0.55);
  eye.position.set(s*0.075,3.15,0.16);
  eye.castShadow = true;
  character.add(eye);
}

scene.add(character);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.62, 64),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 })
);
shadow.rotation.x = -Math.PI/2;
shadow.position.y = 0.006;
scene.add(shadow);

let yaw = 0;
let pitch = 0.02;
let distance = 5.6;
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

renderer.domElement.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  yaw -= (e.clientX - lastX) * 0.006;
  pitch += (e.clientY - lastY) * 0.004;
  pitch = Math.max(-0.32, Math.min(0.32, pitch));
  lastX = e.clientX;
  lastY = e.clientY;
  updateCamera();
});
renderer.domElement.addEventListener('pointerup', () => dragging = false);
renderer.domElement.addEventListener('pointercancel', () => dragging = false);
renderer.domElement.addEventListener('wheel', (e) => {
  distance = Math.max(4.5, Math.min(7.0, distance + e.deltaY * 0.003));
  updateCamera();
}, {passive:true});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.setAnimationLoop(() => renderer.render(scene, camera));
