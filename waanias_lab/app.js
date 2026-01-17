import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

const isMobile =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  window.innerWidth < 800;

// --- AUDIO ---
let audioCtx,
  osc1,
  osc2,
  gainNode,
  isAudioInit = false;
function initAudio() {
  if (isAudioInit) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  audioCtx = new AudioContext();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = 0;
  gainNode.connect(audioCtx.destination);
  osc1 = audioCtx.createOscillator();
  osc1.frequency.value = 110;
  osc1.connect(gainNode);
  osc1.start();
  osc2 = audioCtx.createOscillator();
  osc2.frequency.value = 112;
  osc2.connect(gainNode);
  osc2.start();
  isAudioInit = true;
}
function toggleAudio(isPlaying) {
  if (!isAudioInit) initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const now = audioCtx.currentTime;
  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.linearRampToValueAtTime(
    isPlaying ? 0.05 : 0,
    now + (isPlaying ? 1 : 0.5)
  );
}

// --- ASSETS ---
function createVeinTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "#999999";
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 40; i++) {
    const startX = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(startX, 0);
    ctx.bezierCurveTo(
      startX + (Math.random() * 100 - 50),
      size / 3,
      startX + (Math.random() * 100 - 50),
      (size * 2) / 3,
      startX,
      size
    );
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}
function createParticles() {
  const count = isMobile ? 100 : 300;
  const geometry = new THREE.BufferGeometry();
  const pos = [],
    vel = [];
  for (let i = 0; i < count; i++) {
    pos.push(
      (Math.random() - 0.5) * 25,
      (Math.random() - 0.5) * 25,
      (Math.random() - 0.5) * 25
    );
    vel.push(
      (Math.random() - 0.5) * 0.015,
      (Math.random() - 0.5) * 0.015,
      (Math.random() - 0.5) * 0.015
    );
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geometry.userData = { velocities: vel };
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    })
  );
}

// --- BACKGROUND GENERATOR (THE FIX) ---
function updateBackground(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 2;
  canvas.height = 512; // 1D Gradient
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 512);

  if (type === "space") {
    grad.addColorStop(0, "#02020a");
    grad.addColorStop(0.5, "#0a0a20");
    grad.addColorStop(1, "#1b1b3a");
  } else if (type === "sunset") {
    grad.addColorStop(0, "#2b102f");
    grad.addColorStop(0.5, "#5e2846");
    grad.addColorStop(1, "#a85751");
  } else if (type === "forest") {
    grad.addColorStop(0, "#0a150f");
    grad.addColorStop(0.5, "#142820");
    grad.addColorStop(1, "#243d30");
  } else {
    grad.addColorStop(0, "#000000");
    grad.addColorStop(1, "#111111");
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 512);
  scene.background = new THREE.CanvasTexture(canvas);
}

// --- SCENE ---
const scene = new THREE.Scene();
updateBackground("space"); // Default

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 15);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.strength = 0.5;
bloomPass.radius = 0.5;
bloomPass.threshold = 0.1;
composer.addPass(bloomPass);

scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const pl = new THREE.PointLight(0xffffff, 1.2, 100);
pl.position.set(10, 10, 10);
scene.add(pl);
const bl = new THREE.PointLight(0xff0066, 1.0, 100);
bl.position.set(-10, 5, -10);
scene.add(bl);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = false;

// --- OBJECTS ---
const flowerGroup = new THREE.Group();
flowerGroup.position.y = 2;
scene.add(flowerGroup);
const particles = createParticles();
scene.add(particles);
const stemGroup = new THREE.Group(),
  petalGroup = new THREE.Group();
flowerGroup.add(stemGroup);
flowerGroup.add(petalGroup);

const petalGeo = new THREE.SphereGeometry(
  0.5,
  isMobile ? 16 : 32,
  isMobile ? 8 : 16
);
petalGeo.translate(0, 0.5, 0);
const thornGeo = new THREE.ConeGeometry(0.08, 0.4, 8);
thornGeo.translate(0, 0.2, 0);
const stemPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0.5, -4, 0),
  new THREE.Vector3(0, -8, 0),
]);
const stemGeo = new THREE.TubeGeometry(stemPath, 20, 0.15, 8, false);
const veinTex = createVeinTexture();
const baseMat = new THREE.MeshPhongMaterial({
  shininess: 30,
  side: THREE.DoubleSide,
  map: veinTex,
  bumpMap: veinTex,
  bumpScale: 0.05,
  emissive: 0x000000,
  specular: 0x222222,
});
const stemMat = new THREE.MeshPhongMaterial({
  color: 0x339933,
  shininess: 5,
  flatShading: true,
});

function generateStem() {
  stemGroup.clear();
  stemGroup.add(new THREE.Mesh(stemGeo, stemMat));
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Object3D();
    p.rotation.z = (i / 3) * (Math.PI * 2);
    const s = new THREE.Mesh(petalGeo, stemMat);
    s.scale.set(0.6, 4, 0.1);
    s.rotation.x = -2.0;
    s.position.y = -0.2;
    p.add(s);
    stemGroup.add(p);
  }
  for (let i = 1; i < 20 - 1; i++) {
    const t = i / 20;
    const pt = stemPath.getPointAt(t);
    const tan = stemPath.getTangentAt(t);
    if (Math.random() < 0.2) {
      const th = new THREE.Mesh(thornGeo, stemMat);
      th.position.copy(pt);
      th.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      th.rotateX(Math.PI / 2);
      th.rotateZ(Math.random() * Math.PI * 2);
      stemGroup.add(th);
    }
    if (t > 0.3 && Math.random() < 0.15) {
      const lf = new THREE.Mesh(petalGeo, stemMat);
      lf.scale.set(0.5, 1.5, 0.05);
      lf.position.copy(pt);
      lf.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      lf.rotateX(Math.PI / 2);
      lf.rotateZ(Math.random() * Math.PI * 2);
      stemGroup.add(lf);
    }
  }
}
function generatePetals() {
  petalGroup.clear();
  const count = parseInt(document.getElementById("petalCount").value);
  const bloom = parseFloat(document.getElementById("bloomRadius").value);
  const len = parseFloat(document.getElementById("petalLength").value);
  const wid = parseFloat(document.getElementById("petalWidth").value);
  const colorVal = document.getElementById("petalColor").value;
  for (let i = 0; i < count; i++) {
    for (let r = 0; r < 4; r++) {
      const pivot = new THREE.Object3D();
      pivot.rotation.z = (i / count) * (Math.PI * 2) + r * 0.5;
      const mat = baseMat.clone();
      const col = new THREE.Color(colorVal);
      const hsl = {};
      col.getHSL(hsl);
      mat.color.setHSL(hsl.h, hsl.s, hsl.l + (r * 0.1 - 0.1));
      if (r < 2) mat.emissive.setHSL(hsl.h, hsl.s, hsl.l * 0.1);
      const petal = new THREE.Mesh(petalGeo, mat);
      petal.rotation.x = bloom + r * 0.3;
      const scale = 1 - r * 0.25;
      petal.scale.set(scale * wid, scale * len, scale * 0.1);
      pivot.add(petal);
      petalGroup.add(pivot);
    }
  }
}

// --- LOGIC ---
function updateInput(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function bindInput(sliderId, numId) {
  const s = document.getElementById(sliderId),
    n = document.getElementById(numId);
  s.addEventListener("input", () => {
    n.value = s.value;
    generatePetals();
    saveState();
  });
  n.addEventListener("input", () => {
    s.value = n.value;
    generatePetals();
    saveState();
  });
}
bindInput("petalCount", "petalCountNum");
bindInput("bloomRadius", "bloomRadiusNum");
bindInput("petalLength", "petalLengthNum");
bindInput("petalWidth", "petalWidthNum");
document.getElementById("petalColor").addEventListener("input", () => {
  generatePetals();
  saveState();
});

// BACKGROUND LISTENER (Now calls the Texture Generator)
document.getElementById("bgSelect").addEventListener("change", (e) => {
  updateBackground(e.target.value);
  saveState();
});

const ui = document.getElementById("ui-container");
const openBtn = document.getElementById("show-ui-btn");
const actionbar = document.querySelector(".action-bar");
const studioMsg = document.getElementById("studio-msg");

document
  .getElementById("hide-ui-btn")
  .addEventListener("click", () => ui.classList.add("hidden"));
openBtn.addEventListener("click", () => ui.classList.remove("hidden"));

document.getElementById("mutateBtn").addEventListener("click", () => {
  const rCount = Math.floor(Math.random() * 45) + 5;
  const rColor = new THREE.Color().setHSL(
    Math.random(),
    0.5 + Math.random() * 0.5,
    0.4 + Math.random() * 0.2
  );

  updateInput("petalCount", rCount);
  updateInput("petalCountNum", rCount);
  updateInput("bloomRadius", (Math.random() * 1.5).toFixed(1));
  updateInput("bloomRadiusNum", document.getElementById("bloomRadius").value);
  updateInput("petalLength", (Math.random() * 5 + 2).toFixed(1));
  updateInput("petalLengthNum", document.getElementById("petalLength").value);
  updateInput("petalWidth", (Math.random() * 1.9 + 0.1).toFixed(1));
  updateInput("petalWidthNum", document.getElementById("petalWidth").value);
  document.getElementById("petalColor").value = "#" + rColor.getHexString();

  // REMOVED: Background randomization code.
  // Now the background stays whatever the user selected.

  generatePetals();
  saveState();
});

let isBreathing = false,
  breatheTime = 0;
const breatheBtn = document.getElementById("breatheBtn");
breatheBtn.addEventListener("click", () => {
  isBreathing = !isBreathing;
  breatheBtn.classList.toggle("active");
  breatheBtn.innerText = isBreathing ? "Stop Breathing" : "Start Breathing";
  toggleAudio(isBreathing);
});
function updateBreathing() {
  if (!isBreathing) return;
  breatheTime += 0.02;
  const val = 0.5 + Math.sin(breatheTime) * 0.3;
  document.getElementById("bloomRadius").value = val;
  document.getElementById("bloomRadiusNum").value = val.toFixed(2);
  generatePetals();
}

// --- STUDIO MODE ---
let studioMode = false;
document.getElementById("studioBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  studioMode = true;
  ui.classList.add("hidden");
  actionbar.classList.add("hidden");
  openBtn.classList.add("hidden");
  studioMsg.style.opacity = "1";
  setTimeout(() => (studioMsg.style.opacity = "0"), 3000);
});

function exitStudio() {
  if (studioMode) {
    studioMode = false;
    ui.classList.remove("hidden");
    actionbar.classList.remove("hidden");
    openBtn.classList.remove("hidden");
    studioMsg.style.opacity = "0";
  }
}
window.addEventListener("click", exitStudio);
window.addEventListener("touchstart", exitStudio);

// --- SNAP ---
document.getElementById("saveBtn").addEventListener("click", async (e) => {
  e.stopPropagation();
  composer.render();
  const dataURL = renderer.domElement.toDataURL("image/png");
  if (isMobile && navigator.share) {
    const blob = await (await fetch(dataURL)).blob();
    const file = new File([blob], "waania-flower.png", {
      type: "image/png",
    });
    try {
      await navigator.share({ files: [file], title: "My Flower" });
    } catch (e) {}
  } else {
    const link = document.createElement("a");
    link.download = "waania-flower.png";
    link.href = dataURL;
    link.click();
  }
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

function saveState() {
  const state = {
    count: document.getElementById("petalCount").value,
    bloom: document.getElementById("bloomRadius").value,
    length: document.getElementById("petalLength").value,
    width: document.getElementById("petalWidth").value,
    color: document.getElementById("petalColor").value,
    bg: document.getElementById("bgSelect").value,
  };
  localStorage.setItem("waania-flower-state", JSON.stringify(state));
}
function loadState() {
  const state = JSON.parse(localStorage.getItem("waania-flower-state"));
  if (state) {
    updateInput("petalCount", state.count);
    updateInput("petalCountNum", state.count);
    updateInput("bloomRadius", state.bloom);
    updateInput("bloomRadiusNum", state.bloom);
    updateInput("petalLength", state.length);
    updateInput("petalLengthNum", state.length);
    updateInput("petalWidth", state.width);
    updateInput("petalWidthNum", state.width);
    document.getElementById("petalColor").value = state.color;
    if (state.bg) {
      updateBackground(state.bg);
      document.getElementById("bgSelect").value = state.bg;
    }
    generatePetals();
  }
}

generateStem();
localStorage.getItem("waania-flower-state") ? loadState() : generatePetals();

function animate() {
  requestAnimationFrame(animate);
  updateBreathing();
  controls.update();
  const pos = particles.geometry.attributes.position.array;
  const vel = particles.geometry.userData.velocities;
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] += vel[i];
    pos[i + 1] += vel[i + 1];
    pos[i + 2] += vel[i + 2];
    if (pos[i] > 15) pos[i] = -15;
    if (pos[i] < -15) pos[i] = 15;
    if (pos[i + 1] > 15) pos[i + 1] = -15;
    if (pos[i + 1] < -15) pos[i + 1] = 15;
    if (pos[i + 2] > 15) pos[i + 2] = -15;
    if (pos[i + 2] < -15) pos[i + 2] = 15;
  }
  particles.geometry.attributes.position.needsUpdate = true;
  composer.render();
}
animate();
