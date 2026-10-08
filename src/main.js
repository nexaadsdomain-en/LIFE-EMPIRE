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

// STEP 1 — REAL HUMAN BASE
// Vercel rewrites /human-base.glb to the exact human-base-rigged.glb source.
// The browser receives it from our own LIFE EMPIRE origin, avoiding CORS.
const HUMAN_URL = '/human-base.glb';

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
loading.textContent = 'LOADING REAL HUMAN BASE 0%';
loading.style.cssText = `
  position:fixed;inset:0;display:grid;place-items:center;z-index:4;
  color:rgba(255,255,255,.82);font:600 13px/1.2 system-ui,sans-serif;
  letter-spacing:.16em;pointer-events:none;
`;
app.appendChild(loading);

let mixer = null;

function showError(message) {
  console.error('[LIFE EMPIRE]', message);
  loading.textContent = message;
  loading.style.color = '#ffb4a8';
  status.textContent = 'LIFE EMPIRE  •  HUMAN BASE ERROR';
}

const loader = new GLTFLoader();
loader.load(
  HUMAN_URL,
  gltf => {
    const human = gltf.scene;
    human.name = 'LIFE EMPIRE — Real Human Base';

    // Correct the source coordinate orientation as one intact skinned hierarchy.
    human.rotation.x = Math.PI;
    human.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(human);
    const size = box.getSize(new THREE.Vector3());
    if (!Number.isFinite(size.y) || size.y <= 0) {
      showError('HUMAN BASE CHECK FAILED  •  INVALID SIZE');
      return;
    }

    human.scale.setScalar(1.78 / size.y);
    human.updateMatrixWorld(true);

    const fitted = new THREE.Box3().setFromObject(human);
    const center = fitted.getCenter(new THREE.Vector3());
    human.position.y -= fitted.min.y;
    human.position.x -= center.x;
    human.position.z -= center.z;
    human.updateMatrixWorld(true);

    let meshCount = 0;
    let boneCount = 0;
    human.traverse(obj => {
      if (obj.isMesh) {
        meshCount++;
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
        const mats = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
        for (const mat of mats) {
          if ('roughness' in mat) mat.roughness = Math.min(0.82, Math.max(0.28, mat.roughness));
        }
      }
      if (obj.isBone) boneCount++;
    });

    if (meshCount !== 1 || boneCount < 50) {
      showError(`HUMAN BASE CHECK FAILED  •  ${meshCount} MESH / ${boneCount} BONES`);
      return;
    }

    if (gltf.animations?.length) {
      mixer = new THREE.AnimationMixer(human);
      mixer.clipAction(gltf.animations[0]).play();
    }

    scene.add(human);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.72, 64),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.008;
    scene.add(shadow);

    loading.remove();
    status.textContent = `LIFE EMPIRE  •  REAL HUMAN BASE  •  STEP 1  •  ${boneCount} BONES`;
    updateCamera();
  },
  xhr => {
    if (xhr.total) loading.textContent = `LOADING REAL HUMAN BASE  ${Math.round((xhr.loaded / xhr.total) * 100)}%`;
    else loading.textContent = 'LOADING REAL HUMAN BASE…';
  },
  err => {
    console.error('LIFE EMPIRE human base load failed', err);
    showError('HUMAN BASE FAILED TO LOAD  •  SOURCE/NETWORK ERROR');
  }
);

let yaw = 0;
let pitch = 0.02;
let distance = 3.45;
let dragging = false;
let lastX = 0;
let lastY = 0;

function updateCamera() {
  const targetY = 0.90;
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
