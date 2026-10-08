import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';

const app = document.querySelector('#app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d10);
scene.fog = new THREE.Fog(0x0b0d10, 8, 24);

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.01, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xf2e9df, 0x11151b, 2.15));

const key = new THREE.DirectionalLight(0xfff1df, 3.6);
key.position.set(4.5, 7.5, 5.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);

const fill = new THREE.DirectionalLight(0xcbd9ee, 1.25);
fill.position.set(-4, 4, -5);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xd9e7ff, 0.75);
rim.position.set(0, 5, -6);
scene.add(rim);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(7, 96),
  new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.9 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// STEP 1 — REAL HUMAN BASE MESH
// This is a single continuous MakeHuman/MPFB2 anatomical body with real
// production-style topology and a real 52-bone humanoid skeleton.
// It replaces the previous procedural blob/SDF body completely.
const HUMAN_URL = 'https://raw.githubusercontent.com/nirholas/three.ws/main/public/avatars/parametric-base.glb';

const status = document.createElement('div');
status.textContent = 'LIFE EMPIRE  •  HUMAN BASE';
status.style.cssText = `
  position:fixed;left:22px;top:20px;z-index:5;
  padding:10px 14px;border:1px solid rgba(255,255,255,.12);
  border-radius:999px;background:rgba(8,10,13,.72);
  color:rgba(255,255,255,.82);font:600 12px/1.1 system-ui,sans-serif;
  letter-spacing:.12em;backdrop-filter:blur(10px);pointer-events:none;
`;
app.appendChild(status);

const loading = document.createElement('div');
loading.textContent = 'LOADING HUMAN BASE…';
loading.style.cssText = `
  position:fixed;inset:0;display:grid;place-items:center;z-index:4;
  color:rgba(255,255,255,.82);font:600 13px/1.2 system-ui,sans-serif;
  letter-spacing:.16em;pointer-events:none;
`;
app.appendChild(loading);

let human = null;
let mixer = null;
let idle = null;
let skeleton = null;

const loader = new GLTFLoader();
loader.load(
  HUMAN_URL,
  gltf => {
    human = gltf.scene;
    human.name = 'LIFE EMPIRE — Real Human Base';

    // The source is Y-up and faces +Z. Keep it as one mesh hierarchy;
    // do not add primitive body parts on top of it.
    const box = new THREE.Box3().setFromObject(human);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const targetHeight = 1.78;
    const scale = targetHeight / size.y;
    human.scale.setScalar(scale);
    human.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

    human.traverse(obj => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        if (obj.material) {
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const mat of materials) {
            if ('roughness' in mat) mat.roughness = Math.min(0.82, Math.max(0.28, mat.roughness));
          }
        }
      }
      if (obj.isBone) skeleton = obj.parent?.isSkeleton ? obj.parent : skeleton;
    });

    // Keep the original rig/skin intact. Only a restrained idle pose is driven.
    const bones = [];
    human.traverse(obj => { if (obj.isBone) bones.push(obj); });
    const findBone = names => bones.find(b => names.includes(b.name));
    const spine = findBone(['mixamorig:Spine', 'mixamorig:Spine1', 'Spine', 'spine']);
    const chest = findBone(['mixamorig:Spine2', 'Spine2', 'chest']);
    const neck = findBone(['mixamorig:Neck', 'Neck', 'neck']);

    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(human);
      const preferred = gltf.animations.find(a => /idle|breath|stand/i.test(a.name)) || gltf.animations[0];
      idle = mixer.clipAction(preferred);
      idle.play();
    }

    human.userData.idleBones = { spine, chest, neck };
    scene.add(human);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.008;
    scene.add(shadow);

    loading.remove();
    status.textContent = 'LIFE EMPIRE  •  REAL HUMAN BASE  •  STEP 1';
    updateCamera();
  },
  xhr => {
    if (xhr.total) {
      const pct = Math.round((xhr.loaded / xhr.total) * 100);
      loading.textContent = `LOADING HUMAN BASE  ${pct}%`;
    }
  },
  err => {
    console.error(err);
    loading.textContent = 'HUMAN BASE FAILED TO LOAD';
    status.textContent = 'LIFE EMPIRE  •  HUMAN BASE ERROR';
  }
);

let yaw = 0;
let pitch = 0.02;
let distance = 3.45;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateCamera() {
  const targetY = 0.93;
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
  distance = THREE.MathUtils.clamp(distance + e.deltaY * 0.0025, 2.4, 5.4);
  updateCamera();
}, { passive: true });

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  renderer.render(scene, camera);
});

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
