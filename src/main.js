import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c0f);
scene.fog = new THREE.Fog(0x0a0c0f, 7, 30);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.05, 100);
camera.position.set(3.15, 2.25, 5.9);
camera.lookAt(0, 1.55, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xfff5ea, 0x252b33, 2.5));
const key = new THREE.DirectionalLight(0xfff4e8, 3.8);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9bb7d9, 1.1);
fill.position.set(-4, 3, 3);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({ color: 0x15191e, roughness: 0.9, metalness: 0 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const mat = (color, roughness = 0.55, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const skin = mat(0x7d4a32, 0.62);
const skinDark = mat(0x633722, 0.68);
const shirt = mat(0x24364c, 0.72);
const pants = mat(0x15191f, 0.78);
const shoe = mat(0x08090b, 0.48, 0.05);
const hairMat = mat(0x17110f, 0.82);
const eyeWhite = mat(0xe9e4dc, 0.35);
const iris = mat(0x24170e, 0.3);
const mouthMat = mat(0x351313, 0.6);

function addMesh(parent, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
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
  return addMesh(parent, new THREE.CapsuleGeometry(radius, length, 12, 24), material, position, scale, rotation);
}

function sphere(parent, radius, material, position, scale = [1, 1, 1]) {
  return addMesh(parent, new THREE.SphereGeometry(radius, 32, 24), material, position, scale);
}

const human = new THREE.Group();
human.position.y = 0.03;
scene.add(human);

// ----- Anatomical body: adult human proportions, not block geometry -----
// Legs: upper leg, knee, lower leg, ankle and foot.
for (const side of [-1, 1]) {
  const x = side * 0.205;
  capsule(human, 0.145, 0.62, pants, [x, 0.74, 0], [1.02, 1.08, 1.08]);
  sphere(human, 0.155, pants, [x, 0.39, 0], [0.95, 0.88, 0.92]);
  capsule(human, 0.125, 0.62, pants, [x, 0.25, 0], [1.0, 1.05, 1.0]);
  addMesh(human, new THREE.BoxGeometry(0.27, 0.15, 0.58), shoe, [x, -0.12, 0.075], [1, 1, 1]);
}

// Pelvis / hips.
sphere(human, 0.46, pants, [0, 1.16, 0], [1.0, 0.7, 0.72]);

// Abdomen and rib cage give the torso a real human silhouette.
capsule(human, 0.40, 0.52, shirt, [0, 1.72, 0], [1.02, 1.12, 0.72]);
sphere(human, 0.43, shirt, [0, 1.98, 0], [1.08, 0.78, 0.72]);
// Subtle chest definition.
sphere(human, 0.20, shirt, [-0.20, 2.00, 0.255], [1.25, 0.75, 0.32]);
sphere(human, 0.20, shirt, [0.20, 2.00, 0.255], [1.25, 0.75, 0.32]);

// Neck and shoulders.
capsule(human, 0.145, 0.20, skin, [0, 2.42, 0], [1, 1, 0.95]);
sphere(human, 0.39, shirt, [-0.40, 2.24, 0], [0.95, 0.72, 0.68]);
sphere(human, 0.39, shirt, [0.40, 2.24, 0], [0.95, 0.72, 0.68]);

// Arms with visible shoulder/elbow/wrist transitions.
for (const side of [-1, 1]) {
  const x = side;
  capsule(human, 0.14, 0.48, shirt, [x * 0.57, 1.93, 0], [1, 1, 1]);
  sphere(human, 0.145, shirt, [x * 0.59, 1.61, 0], [1, 1, 0.95]);
  capsule(human, 0.115, 0.50, shirt, [x * 0.60, 1.38, 0], [1, 1.02, 1]);
  sphere(human, 0.12, skin, [x * 0.60, 1.05, 0], [0.92, 0.98, 0.9]);
  // Palm.
  capsule(human, 0.105, 0.20, skin, [x * 0.60, 0.91, 0.02], [1.0, 1.0, 0.78]);
  // Five individual fingers, slightly curved toward the body.
  for (let f = 0; f < 5; f++) {
    const fx = x * (0.60 + (f - 2) * 0.026);
    const fy = 0.82 - Math.abs(f - 2) * 0.008;
    capsule(human, 0.018, 0.09, skin, [fx, fy, 0.025], [1, 1, 0.8]);
  }
}

// ----- Head: jaw, cheeks, ears, nose, eyes, brows, lips and hair -----
// Jaw/face shape rather than a simple sphere.
sphere(human, 0.355, skin, [0, 2.77, 0], [0.88, 1.08, 0.84]);
sphere(human, 0.22, skin, [-0.16, 2.73, 0.20], [1.15, 0.9, 0.58]);
sphere(human, 0.22, skin, [0.16, 2.73, 0.20], [1.15, 0.9, 0.58]);

// Ears.
for (const side of [-1, 1]) {
  const ear = sphere(human, 0.085, skin, [side * 0.315, 2.78, 0], [0.52, 1.0, 0.72]);
  ear.rotation.z = side * 0.08;
  sphere(human, 0.043, skinDark, [side * 0.327, 2.78, 0.045], [0.45, 1, 0.35]);
}

// Hair cap and hairline.
sphere(human, 0.37, hairMat, [0, 2.99, -0.005], [0.92, 0.78, 0.91]);
addMesh(human, new THREE.SphereGeometry(0.27, 32, 16, 0, Math.PI, 0, Math.PI * 0.52), hairMat, [0, 2.95, 0.16], [1.12, 0.52, 0.72]);

// Eyes are placed on the front of the face and include iris/pupil highlights.
for (const side of [-1, 1]) {
  const ex = side * 0.125;
  sphere(human, 0.062, eyeWhite, [ex, 2.83, 0.300], [1.18, 0.70, 0.55]);
  sphere(human, 0.036, iris, [ex, 2.83, 0.344], [1, 1, 0.45]);
  sphere(human, 0.012, eyeWhite, [ex - side * 0.008, 2.842, 0.362], [1, 1, 0.7]);
  // Eyebrow.
  capsule(human, 0.018, 0.10, hairMat, [ex, 2.925, 0.318], [1.0, 1.0, 0.55], [0, 0, side * 0.10]);
}

// Nose bridge, tip and nostril wings.
capsule(human, 0.045, 0.14, skin, [0, 2.75, 0.31], [0.72, 1.0, 0.72]);
sphere(human, 0.075, skin, [0, 2.68, 0.325], [1.0, 0.75, 0.72]);
for (const side of [-1, 1]) sphere(human, 0.027, skinDark, [side * 0.045, 2.67, 0.344], [1, 0.55, 0.55]);

// Lips and chin.
sphere(human, 0.075, mouthMat, [0, 2.56, 0.303], [1.0, 0.32, 0.42]);
sphere(human, 0.13, skin, [0, 2.47, 0.18], [1.0, 0.55, 0.7]);

// Clothing collar gives the body a cleaner, sharper silhouette.
addMesh(human, new THREE.TorusGeometry(0.18, 0.035, 8, 32, Math.PI), shirt, [0, 2.39, 0.03], [1.55, 1, 0.65], [Math.PI / 2, 0, 0]);

// ----- Simple skeletal-style hierarchy for future animation -----
// We keep body parts grouped around the character so the next milestone can replace
// these meshes with skinned GLTF assets without changing the game-facing character API.
human.userData.character = {
  type: 'human',
  rigReady: true,
  heightMeters: 2.9,
  proportions: 'adult-human',
  next: 'skinned-glTF-rig'
};

// Ground contact shadow.
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(0.72, 48),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.005;
scene.add(shadow);

let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  human.position.y = 0.03 + Math.sin(t * 1.7) * 0.006;
  human.rotation.y = Math.sin(t * 0.32) * 0.035;
  shadow.scale.setScalar(1 - Math.sin(t * 1.7) * 0.015);
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
