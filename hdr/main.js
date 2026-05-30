import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.querySelector('#scene');
const scoreValue = document.querySelector('#scoreValue');
const streakValue = document.querySelector('#streakValue');
const energyValue = document.querySelector('#energyValue');
const exposureSlider = document.querySelector('#exposureSlider');
const exposureValue = document.querySelector('#exposureValue');
const dynamicRangeLabel = document.querySelector('#dynamicRangeLabel');
const gameOverOverlay = document.querySelector('#gameOverOverlay');
const finalScore = document.querySelector('#finalScore');
const restartButton = document.querySelector('#restartButton');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030714);
scene.fog = new THREE.FogExp2(0x050918, 0.03);

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);
camera.position.set(0, 2.5, 16);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.45, 0.7, 0.25);
composer.addPass(bloomPass);

const clock = new THREE.Clock();
const screenPoint = new THREE.Vector3();

const state = {
  score: 0,
  streak: 0,
  energy: 100,
  exposure: Number(exposureSlider.value),
  gameOver: false,
  targets: [],
  bursts: [],
  ripples: [],
  tapFlash: 0,
};

const goodPalettes = [
  [0x5dd6ff, 0x8af7ff],
  [0xffbe5c, 0xfff27d],
  [0xae89ff, 0xff8af0],
];

const badPalette = [0xff496d, 0xff7e88];

const baseGeometries = [
  new THREE.IcosahedronGeometry(0.72, 0),
  new THREE.OctahedronGeometry(0.78, 0),
  new THREE.TetrahedronGeometry(0.92, 0),
];

const ambientLight = new THREE.HemisphereLight(0xa8f1ff, 0x040812, 0.9);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xcfeaff, 1.4);
keyLight.position.set(4, 8, 10);
scene.add(keyLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(14, 96),
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.05, 0.1, 0.18),
    emissive: new THREE.Color(0.02, 0.06, 0.08),
    emissiveIntensity: 1.15,
    metalness: 0.2,
    roughness: 0.8,
  }),
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -4.2;
scene.add(floor);

for (let index = 0; index < 7; index += 1) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.3 + index * 1.35, 0.035, 12, 160),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.05, 0.12, 0.22),
      emissive: new THREE.Color(0.04 + index * 0.008, 0.15, 0.24),
      emissiveIntensity: 1.15 - index * 0.07,
      roughness: 0.4,
      metalness: 0.1,
    }),
  );
  ring.rotation.x = Math.PI * 0.5;
  ring.position.y = -3.7 + index * 0.02;
  scene.add(ring);
}

const coreGroup = new THREE.Group();
scene.add(coreGroup);

const core = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.94, 2),
  new THREE.MeshStandardMaterial({
    color: new THREE.Color(0.22, 0.52, 1.05),
    emissive: new THREE.Color(0.18, 0.55, 1.0),
    emissiveIntensity: 2.45,
    metalness: 0.1,
    roughness: 0.15,
  }),
);
coreGroup.add(core);

const coreHalo = new THREE.Mesh(
  new THREE.TorusGeometry(1.95, 0.09, 24, 160),
  new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.4, 1.0, 1.35),
    transparent: true,
    opacity: 0.78,
  }),
);
coreHalo.rotation.x = Math.PI / 2;
coreGroup.add(coreHalo);

const starPositions = new Float32Array(180 * 3);
const starColors = new Float32Array(180 * 3);
for (let i = 0; i < 180; i += 1) {
  const i3 = i * 3;
  const radius = 10 + Math.random() * 24;
  const theta = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 16;
  starPositions[i3] = Math.cos(theta) * radius;
  starPositions[i3 + 1] = y;
  starPositions[i3 + 2] = Math.sin(theta) * radius - 10;

  const tint = Math.random();
  starColors[i3] = 0.4 + tint * 0.6;
  starColors[i3 + 1] = 0.6 + tint * 0.8;
  starColors[i3 + 2] = 0.9 + tint * 1.2;
}

const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
const stars = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({
    size: 0.13,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
scene.add(stars);

function makeTarget(index) {
  const group = new THREE.Group();
  const geometry = baseGeometries[index % baseGeometries.length];
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 4,
    metalness: 0.1,
    roughness: 0.2,
    clearcoat: 1,
    reflectivity: 0.4,
  });
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  const shell = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    }),
  );
  shell.scale.setScalar(1.18);
  group.add(shell);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.05, 14, 56),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
    }),
  );
  halo.rotation.x = Math.PI * 0.5;
  group.add(halo);

  scene.add(group);

  const target = {
    index,
    group,
    mesh,
    shell,
    halo,
    type: 'good',
    life: 0,
    maxLife: 0,
    drift: new THREE.Vector3(),
    home: new THREE.Vector3(),
    pulseOffset: Math.random() * Math.PI * 2,
    spin: new THREE.Vector3(),
    radius: 64,
    time: Math.random() * 10,
  };

  resetTarget(target, true);
  return target;
}

function resetTarget(target, initial = false) {
  const isGood = Math.random() > 0.22;
  const palette = isGood ? goodPalettes[Math.floor(Math.random() * goodPalettes.length)] : badPalette;
  const primary = new THREE.Color(palette[0]);
  const secondary = new THREE.Color(palette[1]);

  target.type = isGood ? 'good' : 'bad';
  target.maxLife = isGood ? 4.8 + Math.random() * 2.2 : 5.5 + Math.random() * 2.3;
  target.life = target.maxLife;
  target.time = Math.random() * 20;

  target.home.set(
    -6 + Math.random() * 12,
    -1.4 + Math.random() * 6.2,
    -4 + Math.random() * 5.4,
  );
  target.drift.set(
    (Math.random() - 0.5) * 0.65,
    (Math.random() - 0.5) * 0.35,
    (Math.random() - 0.5) * 0.28,
  );
  target.spin.set(
    0.5 + Math.random() * 1.1,
    0.4 + Math.random() * 1.2,
    0.3 + Math.random() * 0.9,
  );
  target.radius = isGood ? 72 : 64;

  target.group.position.copy(target.home);
  target.group.scale.setScalar(initial ? 0.8 : 0.1);

  target.mesh.material.color.copy(primary);
  target.mesh.material.emissive.copy(primary).multiplyScalar(isGood ? 1.2 : 0.8);
  target.mesh.material.emissiveIntensity = isGood ? 6 + Math.random() * 4 : 2.4;
  target.shell.material.color.copy(secondary);
  target.halo.material.color.copy(secondary);
  target.halo.scale.setScalar(isGood ? 1 : 0.78);
}

function spawnBurst(position, colorHex, strength = 1) {
  const count = 34;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const color = new THREE.Color(colorHex);

  for (let i = 0; i < count; i += 1) {
    const i3 = i * 3;
    positions[i3] = position.x;
    positions[i3 + 1] = position.y;
    positions[i3 + 2] = position.z;

    const spread = 1.6 * strength;
    velocities[i3] = (Math.random() - 0.5) * spread;
    velocities[i3 + 1] = (Math.random() - 0.35) * spread;
    velocities[i3 + 2] = (Math.random() - 0.5) * spread;

    const jitter = 0.8 + Math.random() * 0.5;
    colors[i3] = color.r * jitter;
    colors[i3 + 1] = color.g * jitter;
    colors[i3 + 2] = color.b * jitter;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.24 + strength * 0.08,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  state.bursts.push({
    points,
    positions,
    velocities,
    life: 0.8 + strength * 0.18,
    age: 0,
  });
}

function spawnRipple(position, colorHex) {
  const ripple = new THREE.Mesh(
    new THREE.RingGeometry(0.3, 0.38, 48),
    new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    }),
  );
  ripple.position.copy(position);
  ripple.lookAt(camera.position);
  scene.add(ripple);
  state.ripples.push({ mesh: ripple, age: 0, life: 0.45 });
}

function updateHud() {
  scoreValue.textContent = String(state.score);
  streakValue.textContent = String(state.streak);
  energyValue.textContent = String(Math.max(0, Math.round(state.energy)));
}

function setExposure(value) {
  state.exposure = value;
  renderer.toneMappingExposure = value;
  bloomPass.strength = 0.16 + value * 0.18;
  bloomPass.radius = 0.05 + value * 0.07;
  exposureValue.textContent = `${value.toFixed(2)}x`;
}

function endGame() {
  state.gameOver = true;
  finalScore.textContent = `Score ${state.score}`;
  gameOverOverlay.classList.remove('hidden');
}

function resetGame() {
  state.score = 0;
  state.streak = 0;
  state.energy = 100;
  state.gameOver = false;
  state.tapFlash = 0;
  gameOverOverlay.classList.add('hidden');

  for (const target of state.targets) {
    resetTarget(target);
  }

  for (const burst of state.bursts) {
    scene.remove(burst.points);
    burst.points.geometry.dispose();
    burst.points.material.dispose();
  }
  state.bursts.length = 0;

  for (const ripple of state.ripples) {
    scene.remove(ripple.mesh);
    ripple.mesh.geometry.dispose();
    ripple.mesh.material.dispose();
  }
  state.ripples.length = 0;

  updateHud();
}

function updateDynamicRangeLabel() {
  if (!window.matchMedia) {
    dynamicRangeLabel.textContent = 'Display: dynamic-range query unavailable';
    return;
  }

  const query = window.matchMedia('(dynamic-range: high)');
  dynamicRangeLabel.textContent = query.matches
    ? 'Display: HDR / EDR capable screen detected'
    : 'Display: standard dynamic range screen';
}

function projectTarget(target) {
  screenPoint.copy(target.group.position).project(camera);
  return {
    x: (screenPoint.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-screenPoint.y * 0.5 + 0.5) * canvas.clientHeight,
    z: screenPoint.z,
  };
}

function onPointerDown(event) {
  if (state.gameOver) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  let closest = null;
  let minDistance = Infinity;

  for (const target of state.targets) {
    const screen = projectTarget(target);
    if (screen.z < -1 || screen.z > 1) {
      continue;
    }

    const dx = screen.x - x;
    const dy = screen.y - y;
    const distance = Math.hypot(dx, dy);
    const threshold = target.radius * target.group.scale.x;
    if (distance < threshold && distance < minDistance) {
      minDistance = distance;
      closest = target;
    }
  }

  if (!closest) {
    state.streak = 0;
    state.energy = Math.max(0, state.energy - 1);
    state.tapFlash = 0.35;
    updateHud();
    if (state.energy <= 0) {
      endGame();
    }
    return;
  }

  if (closest.type === 'good') {
    state.score += 120 + state.streak * 18;
    state.streak += 1;
    state.energy = Math.min(100, state.energy + 3);
    spawnBurst(closest.group.position, closest.mesh.material.emissive.getHex(), 1.1);
    spawnRipple(closest.group.position, closest.halo.material.color.getHex());
  } else {
    state.score = Math.max(0, state.score - 80);
    state.streak = 0;
    state.energy = Math.max(0, state.energy - 10);
    spawnBurst(closest.group.position, closest.mesh.material.emissive.getHex(), 0.9);
    spawnRipple(closest.group.position, 0xff5d73);
  }

  resetTarget(closest);
  closest.group.scale.setScalar(0.12);
  updateHud();

  if (state.energy <= 0) {
    endGame();
  }
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
}

function animateTargets(elapsed, delta) {
  for (const target of state.targets) {
    target.life -= delta;
    target.time += delta;

    if (target.life <= 0) {
      if (target.type === 'good') {
        state.streak = Math.max(0, state.streak - 1);
      }
      resetTarget(target);
    }

    const lifeProgress = 1 - target.life / target.maxLife;
    const pulse = 0.86 + Math.sin(elapsed * 3.4 + target.pulseOffset) * 0.08;
    const grow = Math.min(1, target.group.scale.x + delta * 2.8);

    target.group.scale.setScalar(grow * pulse);
    target.group.position.x = target.home.x + Math.sin(target.time * 1.2 + target.index) * (0.35 + target.drift.x);
    target.group.position.y = target.home.y + Math.cos(target.time * 1.6 + target.index * 0.4) * (0.22 + target.drift.y);
    target.group.position.z = target.home.z + Math.sin(target.time * 1.4 + target.index * 0.7) * (0.2 + target.drift.z);
    target.group.rotation.x += delta * target.spin.x;
    target.group.rotation.y += delta * target.spin.y;
    target.group.rotation.z += delta * target.spin.z;

    target.halo.rotation.z += delta * (target.type === 'good' ? 1.3 : -1.1);
    target.shell.material.opacity = target.type === 'good' ? 0.32 + lifeProgress * 0.12 : 0.24;
    target.mesh.material.emissiveIntensity *= 0.997;
    target.mesh.material.emissiveIntensity += target.type === 'good' ? 0.03 : 0.012;
  }
}

function animateBursts(delta) {
  for (let index = state.bursts.length - 1; index >= 0; index -= 1) {
    const burst = state.bursts[index];
    burst.age += delta;
    const positions = burst.points.geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      burst.velocities[i + 1] -= delta * 1.15;
      positions[i] += burst.velocities[i] * delta;
      positions[i + 1] += burst.velocities[i + 1] * delta;
      positions[i + 2] += burst.velocities[i + 2] * delta;
    }

    burst.points.geometry.attributes.position.needsUpdate = true;
    burst.points.material.opacity = Math.max(0, 1 - burst.age / burst.life);

    if (burst.age >= burst.life) {
      scene.remove(burst.points);
      burst.points.geometry.dispose();
      burst.points.material.dispose();
      state.bursts.splice(index, 1);
    }
  }
}

function animateRipples(delta) {
  for (let index = state.ripples.length - 1; index >= 0; index -= 1) {
    const ripple = state.ripples[index];
    ripple.age += delta;
    const progress = ripple.age / ripple.life;
    ripple.mesh.scale.setScalar(1 + progress * 4.5);
    ripple.mesh.material.opacity = 0.85 * (1 - progress);
    ripple.mesh.lookAt(camera.position);

    if (ripple.age >= ripple.life) {
      scene.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.mesh.material.dispose();
      state.ripples.splice(index, 1);
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.033);
  const elapsed = clock.elapsedTime;

  coreGroup.rotation.y += delta * 0.45;
  coreGroup.rotation.x = Math.sin(elapsed * 0.6) * 0.12;
  core.position.y = Math.sin(elapsed * 1.5) * 0.16;
  core.material.emissiveIntensity = 2.45 + Math.sin(elapsed * 3.1) * 0.35 + state.tapFlash * 0.9;
  coreHalo.scale.setScalar(1 + Math.sin(elapsed * 2.4) * 0.05 + state.tapFlash * 0.08);
  stars.rotation.y += delta * 0.02;

  if (!state.gameOver) {
    animateTargets(elapsed, delta);
    animateBursts(delta);
    animateRipples(delta);
    updateHud();
  }

  state.tapFlash = Math.max(0, state.tapFlash - delta * 1.8);
  composer.render();
}

for (let index = 0; index < 7; index += 1) {
  state.targets.push(makeTarget(index));
}

exposureSlider.addEventListener('input', () => {
  setExposure(Number(exposureSlider.value));
});

restartButton.addEventListener('click', () => {
  resetGame();
});

canvas.addEventListener('pointerdown', onPointerDown);
window.addEventListener('resize', resize);

setExposure(state.exposure);
updateHud();
updateDynamicRangeLabel();
resize();
animate();
