export class Metrics {
  constructor() { this.reset(); }
  reset() {
    this.frames = [];
    this.physics = [];
    this.render = [];
    this.stepCount = 0;
    this.elapsed = 0;
  }
  add(frameMs, physicsMs, renderMs, steps) {
    this.frames.push(frameMs); this.physics.push(physicsMs); this.render.push(renderMs);
    this.stepCount += steps; this.elapsed += frameMs / 1000;
    if (this.frames.length > 1200) { this.frames.shift(); this.physics.shift(); this.render.shift(); }
  }
  summary(windowSize = this.frames.length) {
    const frames = this.frames.slice(-windowSize);
    const physics = this.physics.slice(-windowSize);
    const render = this.render.slice(-windowSize);
    const avg = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const sortedFps = frames.map(ms => 1000 / Math.max(ms, 0.001)).sort((a, b) => a - b);
    const lowCount = Math.max(1, Math.ceil(sortedFps.length * 0.01));
    return {
      fps: frames.length ? 1000 / avg(frames) : 0,
      frameMs: avg(frames),
      avgPhysicsMs: avg(physics),
      maxPhysicsMs: physics.length ? Math.max(...physics) : 0,
      renderMs: avg(render),
      minFps: sortedFps.length ? sortedFps[0] : 0,
      onePercentLow: sortedFps.length ? avg(sortedFps.slice(0, lowCount)) : 0,
      stepsPerSec: this.elapsed ? this.stepCount / this.elapsed : 0,
    };
  }
}

export class AutoBenchmark {
  constructor(hooks) {
    this.hooks = hooks;
    this.counts = [500, 1000, 2000, 3000, 5000, 7500, 10000];
    this.running = false;
  }
  async run() {
    if (this.running) return;
    this.running = true;
    try {
      for (let i = 0; i < this.counts.length && this.running; i++) {
        const count = this.counts[i];
        await this.hooks.setup(count);
        await this.wait(5, `Warmup ${count} coins`, i);
        if (!this.running) break;
        this.hooks.beginMeasure();
        await this.wait(10, `Measuring ${count} coins`, i);
        if (!this.running) break;
        this.hooks.finishMeasure(count);
      }
    } finally {
      this.running = false;
      this.hooks.done();
    }
  }
  wait(seconds, label, index) {
    return new Promise(resolve => {
      const start = performance.now();
      const tick = () => {
        const elapsed = (performance.now() - start) / 1000;
        this.hooks.progress(label, Math.min(elapsed / seconds, 1), index, this.counts.length);
        if (!this.running || elapsed >= seconds) resolve(); else requestAnimationFrame(tick);
      };
      tick();
    });
  }
  cancel() { this.running = false; }
}

export function downloadCsv(results, device) {
  const columns = ['device','userAgent','coinCount','colliderType','hullSides','solverSubSteps','physicsHz','durationSec','avgFps','minFps','onePercentLow','avgFrameMs','avgPhysicsMs','maxPhysicsMs'];
  const quote = value => `"${String(value).replaceAll('"', '""')}"`;
  const rows = results.map(r => [device.platform, device.userAgent, r.coinCount, r.colliderType, r.hullSides, r.solverSubSteps, 60, 10, r.avgFps, r.minFps, r.onePercentLow, r.avgFrameMs, r.avgPhysicsMs, r.maxPhysicsMs]);
  const csv = [columns, ...rows].map(row => row.map(quote).join(',')).join('\r\n');
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const filename = `box3d_benchmark_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


