import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const app = document.querySelector('#app');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0c0f);
scene.fog = new THREE.Fog(0x0a0c0f, 9, 34);

const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
app.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xfff7ef, 0x20262e, 2.4));
const key = new THREE.DirectionalLight(0xfff2df, 4.2);
key.position.set(4, 7, 5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0x9db8d9, 1.5);
rim.position.set(-4, 4, -3);
scene.add(rim);

const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 96), new THREE.MeshStandardMaterial({ color: 0x15191e, roughness: 0.9 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const M = (color, roughness = 0.55, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const skin = new THREE.MeshPhysicalMaterial({ color: 0x7a4933, roughness: 0.58, metalness: 0, sheen: 0.12 });
const skinDark = M(0x5b3024, 0.65);
const white = M(0xf1ece3, 0.32);
const iris = M(0x21140d, 0.25);
const hair = M(0x120e0d, 0.78);
const shirt = M(0x26384d, 0.68);
const pants = M(0x171a20, 0.78);
const shoe = M(0x08090b, 0.42, 0.05);
const lip = M(0x421d1c, 0.58);

function mesh(parent, geometry, material, p, s = [1,1,1], r = [0,0,0]) {
  const o = new THREE.Mesh(geometry, material);
  o.position.set(...p); o.scale.set(...s); o.rotation.set(...r);
  o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
function capsule(parent, radius, length, material, p, s=[1,1,1], r=[0,0,0]) {
  return mesh(parent, new THREE.CapsuleGeometry(radius, length, 16, 32), material, p, s, r);
}
function sphere(parent, radius, material, p, s=[1,1,1]) {
  return mesh(parent, new THREE.SphereGeometry(radius, 48, 32), material, p, s);
}
function lathe(parent, points, material, p, scale=[1,1,1]) {
  return mesh(parent, new THREE.LatheGeometry(points, 48), material, p, scale);
}

const human = new THREE.Group();
human.position.y = 0.02;
scene.add(human);

// BODY — smoother anatomical silhouette instead of block/mannequin geometry.
for (const side of [-1, 1]) {
  const x = side * 0.19;
  capsule(human, 0.15, 0.58, pants, [x, 0.72, 0], [1.02, 1.08, 1.0]);
  sphere(human, 0.145, pants, [x, 0.38, 0], [1.0, 0.9, 0.96]);
  capsule(human, 0.125, 0.60, pants, [x, 0.20, 0], [1.0, 1.08, 1.0]);
  mesh(human, new THREE.BoxGeometry(0.29, 0.16, 0.62), shoe, [x, -0.13, 0.09]);
}

// Hip and torso use a lathed profile for a natural waist-to-chest transition.
lathe(human, [
  new THREE.Vector2(0.28,0.95), new THREE.Vector2(0.43,1.05), new THREE.Vector2(0.46,1.20),
  new THREE.Vector2(0.39,1.42), new THREE.Vector2(0.37,1.68), new THREE.Vector2(0.47,1.91),
  new THREE.Vector2(0.51,2.10), new THREE.Vector2(0.40,2.28), new THREE.Vector2(0.27,2.38), new THREE.Vector2(0.18,2.43)
], shirt, [0,0,0]);
mesh(human, new THREE.TorusGeometry(0.18,0.032,12,40,Math.PI*1.65), shirt, [0,2.39,0.02], [1.45,1,0.7], [Math.PI/2,0,0]);

// Arms: shoulder -> upper arm -> elbow -> forearm -> wrist.
for (const side of [-1,1]) {
  sphere(human,0.19,shirt,[side*0.48,2.22,0],[1.05,0.9,0.85]);
  capsule(human,0.145,0.45,shirt,[side*0.57,1.92,0],[1,1,1],[0,0,side*0.08]);
  sphere(human,0.135,shirt,[side*0.61,1.61,0],[1,0.95,0.95]);
  capsule(human,0.115,0.48,shirt,[side*0.62,1.36,0],[1,1.02,1],[0,0,side*0.04]);
  sphere(human,0.12,skin,[side*0.62,1.08,0],[0.92,1.05,0.9]);
  capsule(human,0.105,0.18,skin,[side*0.62,0.94,0.02],[1,1,0.78]);
  for(let f=0;f<5;f++) {
    const fx=side*(0.62+(f-2)*0.026);
    capsule(human,0.017,0.095,skin,[fx,0.82,0.025],[1,1,0.8]);
  }
}

capsule(human,0.145,0.20,skin,[0,2.49,0],[1,1,0.92]);

// HEAD — custom cranium/jaw profile plus anatomical facial landmarks.
lathe(human,[
  new THREE.Vector2(0.16,2.48), new THREE.Vector2(0.25,2.53), new THREE.Vector2(0.34,2.62),
  new THREE.Vector2(0.37,2.76), new THREE.Vector2(0.35,2.91), new THREE.Vector2(0.31,3.04),
  new THREE.Vector2(0.23,3.14), new THREE.Vector2(0.10,3.19), new THREE.Vector2(0.0,3.20)
],skin,[0,0,0],[0.92,1,0.86]);
sphere(human,0.20,skin,[-0.16,2.72,0.19],[1.2,0.82,0.58]);
sphere(human,0.20,skin,[0.16,2.72,0.19],[1.2,0.82,0.58]);
sphere(human,0.17,skin,[0,2.56,0.17],[1.15,0.55,0.62]);

for(const side of [-1,1]) {
  sphere(human,0.085,skin,[side*0.34,2.80,0],[0.52,1.15,0.72]);
  sphere(human,0.043,skinDark,[side*0.347,2.80,0.045],[0.42,1,0.34]);
}

sphere(human,0.365,hair,[0,3.12,-0.005],[0.94,0.78,0.90]);
mesh(human,new THREE.SphereGeometry(0.28,48,24,0,Math.PI*2,0,Math.PI*0.50),hair,[0,3.06,0.17],[1.14,0.55,0.72]);

for(const side of [-1,1]) {
  const x=side*0.125;
  sphere(human,0.064,white,[x,2.85,0.303],[1.18,0.72,0.52]);
  sphere(human,0.036,iris,[x,2.85,0.345],[1,1,0.45]);
  sphere(human,0.013,white,[x-side*0.008,2.862,0.363],[1,1,0.7]);
  capsule(human,0.018,0.11,hair,[x,2.945,0.318],[1,1,0.55],[0,0,side*0.08]);
  capsule(human,0.010,0.09,skinDark,[x,2.79,0.312],[1,1,0.4],[0,0,-side*0.02]);
}

// Nose bridge, tip and nostrils.
capsule(human,0.045,0.16,skin,[0,2.77,0.31],[0.72,1,0.72]);
sphere(human,0.072,skin,[0,2.69,0.33],[1,0.75,0.72]);
for(const side of [-1,1]) sphere(human,0.026,skinDark,[side*0.046,2.68,0.348],[1,0.55,0.55]);

// Mouth and chin.
sphere(human,0.070,lip,[0,2.58,0.307],[1.05,0.30,0.40]);
sphere(human,0.062,lip,[0,2.545,0.309],[1.05,0.28,0.38]);
sphere(human,0.13,skin,[0,2.47,0.18],[1,0.55,0.68]);

const shadow=mesh(scene,new THREE.CircleGeometry(0.76,64),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:0.36}),[0,0.006,0]);
shadow.rotation.x=-Math.PI/2;

human.userData.character={type:'human',rigReady:true,skinMeshReady:true,heightMeters:3.20,proportions:'adult-human',next:'production-skinned-glTF'};

// Third-person inspection camera — full body stays framed; drag to orbit.
let yaw=0.48, pitch=0.08, distance=6.2;
let dragging=false,lastX=0,lastY=0;
function updateCamera(){
  const target=new THREE.Vector3(0,1.58,0);
  const x=Math.sin(yaw)*Math.cos(pitch)*distance;
  const y=Math.sin(pitch)*distance+1.58;
  const z=Math.cos(yaw)*Math.cos(pitch)*distance;
  camera.position.set(x,y,z);
  camera.lookAt(target);
}
updateCamera();
renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId);});
renderer.domElement.addEventListener('pointermove',e=>{if(!dragging)return;yaw-=(e.clientX-lastX)*0.006;pitch+=(e.clientY-lastY)*0.004;pitch=Math.max(-0.18,Math.min(0.28,pitch));lastX=e.clientX;lastY=e.clientY;updateCamera();});
renderer.domElement.addEventListener('pointerup',()=>dragging=false);
renderer.domElement.addEventListener('wheel',e=>{distance=Math.max(4.4,Math.min(8.5,distance+e.deltaY*0.003));updateCamera();},{passive:true});

let t=0;
function animate(){
  requestAnimationFrame(animate); t+=0.016;
  human.position.y=0.02+Math.sin(t*1.7)*0.005;
  human.rotation.y=Math.sin(t*0.30)*0.018;
  shadow.scale.setScalar(1-Math.sin(t*1.7)*0.012);
  renderer.render(scene,camera);
}
animate();

addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);
});
