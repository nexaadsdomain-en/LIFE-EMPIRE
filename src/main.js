import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
scene.fog = new THREE.Fog(0x0b0d10, 8, 28);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
camera.position.set(3.8, 2.35, 5.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xffffff, 0x30343b, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(4, 7, 5);
key.castShadow = true;
scene.add(key);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x171a1f, roughness: 0.85 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function mat(color, roughness = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

// Human-shaped foundation: proportioned head, neck, torso, pelvis, limbs, hands and feet.
const human = new THREE.Group();
const skin = mat(0x7b4a32, 0.62);
const shirt = mat(0x26364a, 0.72);
const pants = mat(0x171a20, 0.82);
const shoes = mat(0x090a0c, 0.5);

const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.78, 8, 16), shirt);
torso.position.y = 1.72; torso.scale.set(0.95, 1, 0.62); torso.castShadow = true; human.add(torso);

const pelvis = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.25, 8, 16), pants);
pelvis.position.y = 1.12; pelvis.scale.set(1, 0.72, 0.66); pelvis.castShadow = true; human.add(pelvis);

const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.22, 16), skin);
neck.position.y = 2.38; neck.castShadow = true; human.add(neck);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 18), skin);
head.position.y = 2.78; head.scale.set(0.88, 1.06, 0.9); head.castShadow = true; human.add(head);

// Hair mass, ears, eyes and mouth landmarks establish a recognizably human face.
const hair = new THREE.Mesh(new THREE.SphereGeometry(0.325, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.56), mat(0x15110f));
hair.position.set(0, 2.92, -0.015); hair.scale.set(0.9, 0.78, 0.92); hair.castShadow = true; human.add(hair);
for (const x of [-0.27, 0.27]) {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), skin);
  ear.position.set(x, 2.78, 0); ear.scale.set(0.6, 1, 0.7); human.add(ear);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), mat(0x101010));
  eye.position.set(x * 0.48, 2.83, 0.292); human.add(eye);
}
const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 16, Math.PI), mat(0x3a1717));
mouth.position.set(0, 2.67, 0.292); mouth.rotation.x = Math.PI / 2; human.add(mouth);

function limb(x, y, z, sx, sy, sz, material, rot = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.z = rot;
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.58, 8, 12), material);
  m.scale.set(sx, sy, sz); m.castShadow = true; g.add(m); human.add(g); return g;
}

const leftArm = limb(-0.53, 1.83, 0, 1, 1, 1, shirt, -0.05);
const rightArm = limb(0.53, 1.83, 0, 1, 1, 1, shirt, 0.05);
for (const [x, arm] of [[-0.53,leftArm],[0.53,rightArm]]) {
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 10), skin);
  hand.position.set(0, -0.49, 0); hand.castShadow = true; arm.add(hand);
}
const leftLeg = limb(-0.2, 0.67, 0, 1, 1.05, 1, pants, 0);
const rightLeg = limb(0.2, 0.67, 0, 1, 1.05, 1, pants, 0);
for (const [x, leg] of [[-0.2,leftLeg],[0.2,rightLeg]]) {
  const foot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.16, 0.52), shoes);
  foot.position.set(0, -0.52, 0.08); foot.castShadow = true; leg.add(foot);
}

human.position.y = 0.08;
scene.add(human);

let t = 0;
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;
  // Subtle breathing establishes a living idle pose without committing to an animation system yet.
  torso.scale.y = 1 + Math.sin(t * 1.8) * 0.008;
  human.rotation.y = Math.sin(t * 0.35) * 0.025;
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
