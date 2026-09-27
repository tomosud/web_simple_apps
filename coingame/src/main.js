import { CoinRenderer } from './renderer.js?v=20260927e';
import { Metrics, AutoBenchmark, downloadCsv } from './benchmark.js?v=20260927e';
import { createUI, deviceInfo, renderOverlay } from './ui.js?v=20260927e';

const FIXED_DT = 1 / 60;
const MAX_SUB_STEPS = 1;
const ui = createUI();
const device = deviceInfo();
ui.el.device.textContent = JSON.stringify(device, null, 2);

let module;
let renderer;
let settings;
let transformView;
let statsView;
let running = false;
let accumulator = 0;
let lastTime = performance.now();
let lastOverlay = 0;
let results = [];
const liveMetrics = new Metrics();
const runMetrics = new Metrics();

function refreshViews(syncTransforms = true) {
  if (syncTransforms) {
    const ptr = module._get_transform_buffer();
    transformView = new Float32Array(module.HEAPF32.buffer, ptr, settings.coinCount * 8);
  }
  const statsPtr = module._get_stats_buffer();
  statsView = new Float32Array(module.HEAPF32.buffer, statsPtr, 4);
}

function rebuild(next = ui.read()) {
  settings = next;
  const ok = module._reset_world(settings.coinCount, settings.gravity, settings.friction, settings.restitution,
    settings.radius, settings.thickness, settings.segments, settings.colliderType, settings.solverSubSteps, Number(settings.continuous), Number(settings.lockTilt), settings.spawnMode, Number(settings.pusher),
    Number(settings.recycle), settings.seed);
  if (!ok) throw new Error('Box3D rejected the world settings or could not allocate memory.');
  renderer.rebuild(settings.coinCount, settings.radius, settings.thickness);
  renderer.setOptions(settings);
  refreshViews(true);
  renderer.sync(transformView, settings.coinCount);
  accumulator = 0;
  liveMetrics.reset();
  module._set_paused(Number(!running));
  ui.el.status.textContent = 'Ready';
  ui.el.status.className = 'ready';
}

function setRunning(value) {
  running = value;
  module?._set_paused(Number(!value));
  ui.el.start.disabled = value;
  ui.el.pause.disabled = !value;
  ui.el.status.textContent = value ? 'Running' : 'Paused';
  ui.el.status.className = value ? 'running' : 'ready';
  lastTime = performance.now();
}

function frame(now) {
  requestAnimationFrame(frame);
  const rawDelta = Math.max(0, (now - lastTime) / 1000);
  const frameDelta = Math.min(rawDelta, 0.25);
  lastTime = now;
  let steps = 0;
  let physicsMs = 0;
  let renderMs = 0;

  if (running && settings.mode !== 'render') {
    accumulator += frameDelta;
    const start = performance.now();
    while (accumulator >= FIXED_DT && steps < MAX_SUB_STEPS) {
      module._step_world(FIXED_DT);
      accumulator -= FIXED_DT;
      steps++;
    }
    if (steps === MAX_SUB_STEPS) accumulator = Math.min(accumulator, FIXED_DT);
    physicsMs = performance.now() - start;
  }

  if (settings.mode !== 'physics') {
    const start = performance.now();
    if (settings.mode === 'both' && running) {
      // A single bridge call exposes all transforms as a reusable linear-memory view.
      module._get_transform_buffer();
      if (transformView.buffer !== module.HEAPF32.buffer) refreshViews(true);
      renderer.sync(transformView, settings.coinCount);
    }
    renderer.animatePusher(frameDelta, settings.pusher && running);
    renderer.render();
    renderMs = performance.now() - start;
  }

  const frameMs = rawDelta * 1000;
  if (frameMs < 1000) {
    liveMetrics.add(frameMs, physicsMs, renderMs, steps);
    if (auto.running && runMetrics.elapsed >= 0) runMetrics.add(frameMs, physicsMs, renderMs, steps);
  }
  if (now - lastOverlay > 250) {
    module._get_stats_buffer();
    if (statsView.buffer !== module.HEAPF32.buffer) refreshViews(false);
    const recent = liveMetrics.summary(120);
    const total = liveMetrics.summary();
    renderOverlay(ui.el.overlay, {
      ...recent, running, coins: settings.coinCount, bodies: Math.round(statsView[0]), awake: Math.round(statsView[1]), contacts: Math.round(statsView[3]),
      avgFps: total.fps, totalAvgPhysics: total.avgPhysicsMs, maxPhysicsMs: total.maxPhysicsMs,
    });
    lastOverlay = now;
  }
}

function appendResult(coinCount, summary) {
  const result = { coinCount, colliderType: settings.colliderType === 1 ? 'Flat Box' : 'Prism Hull', hullSides: settings.segments, solverSubSteps: settings.solverSubSteps, avgFps: summary.fps, minFps: summary.minFps,
    onePercentLow: summary.onePercentLow, avgFrameMs: summary.frameMs,
    avgPhysicsMs: summary.avgPhysicsMs, maxPhysicsMs: summary.maxPhysicsMs };
  results.push(result);
  const row = ui.el.results.insertRow();
  [coinCount, result.colliderType, settings.segments, settings.solverSubSteps, summary.fps, summary.onePercentLow, summary.avgPhysicsMs, summary.maxPhysicsMs]
    .forEach((value, index) => { const cell = row.insertCell(); cell.textContent = index < 4 ? value : value.toFixed(2); });
  ui.el.csv.disabled = false;
}

const auto = new AutoBenchmark({
  setup: async count => {
    ui.el.coinCount.value = String(count);
    running = true;
    rebuild(ui.read());
    setRunning(true);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  },
  beginMeasure: () => runMetrics.reset(),
  finishMeasure: count => appendResult(count, runMetrics.summary()),
  progress: (label, progress, index, total) => {
    ui.el.autoProgress.textContent = `${label} · ${(progress * 100).toFixed(0)}% · case ${index + 1}/${total}`;
  },
  done: () => {
    ui.el.auto.disabled = false; ui.el.cancelAuto.disabled = true;
    ui.el.autoProgress.textContent = auto.running ? '' : 'Benchmark finished or cancelled.';
  },
});

function bindEvents() {
  ui.el.start.onclick = () => setRunning(true);
  ui.el.pause.onclick = () => setRunning(false);
  ui.el.reset.onclick = () => rebuild(settings);
  ui.el.apply.onclick = () => rebuild(ui.read());
  for (const id of ['renderCoins','shadows','wireframe','pixelRatio']) {
    ui.el[id].addEventListener('change', () => { settings = { ...settings, ...ui.read() }; renderer.setOptions(settings); });
  }
  ui.el.auto.onclick = () => {
    ui.el.auto.disabled = true; ui.el.cancelAuto.disabled = false; auto.run();
  };
  ui.el.cancelAuto.onclick = () => auto.cancel();
  ui.el.csv.onclick = () => downloadCsv(results, device);
  addEventListener('beforeunload', () => module?._destroy_world());
}

async function boot() {
  if (typeof window.createBox3DModule !== 'function') throw new Error('wasm/box3d_bridge.js was not found. Run scripts/build_wasm.bat.');
  module = await window.createBox3DModule({ locateFile: file => new URL(`../wasm/${file}`, import.meta.url).href + '?v=20260927e' });
  if (!module._init_world()) throw new Error('Box3D bridge failed to initialize.');
  renderer = new CoinRenderer(document.getElementById('viewport'));
  settings = ui.read();
  bindEvents();
  rebuild(settings);
  setRunning(false);
  requestAnimationFrame(frame);
}

boot().catch(error => {
  console.error(error);
  ui.el.status.textContent = 'Error'; ui.el.status.className = 'error';
  ui.el.fatal.hidden = false;
  ui.el.fatal.textContent = `${error.message}\n\nServe this folder over HTTP using run.bat; file:// is not supported.`;
});





