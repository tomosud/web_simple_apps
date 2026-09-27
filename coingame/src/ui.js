export function createUI() {
  const ids = ['status','start','pause','reset','apply','auto','cancelAuto','csv','coinCount','mode','spawnMode','segments','pixelRatio','gravity','friction','restitution','radius','thickness','seed','renderCoins','shadows','wireframe','pusher','recycle','overlay','results','autoProgress','device','panel','togglePanel','fatal'];
  const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
  const read = () => ({
    coinCount: Math.min(10000, Math.max(1, Number(el.coinCount.value))), mode: el.mode.value,
    spawnMode: Number(el.spawnMode.value), segments: Number(el.segments.value), pixelRatio: el.pixelRatio.value,
    gravity: Number(el.gravity.value), friction: Number(el.friction.value), restitution: Number(el.restitution.value),
    radius: Number(el.radius.value), thickness: Number(el.thickness.value), seed: Number(el.seed.value) | 0,
    renderCoins: el.renderCoins.checked, shadows: el.shadows.checked, wireframe: el.wireframe.checked,
    pusher: el.pusher.checked, recycle: el.recycle.checked,
  });
  el.togglePanel.onclick = () => el.panel.classList.toggle('hidden');
  return { el, read };
}

export function deviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.userAgentData?.platform || navigator.platform || 'Unavailable',
    screen: `${screen.width} × ${screen.height}`,
    devicePixelRatio,
    hardwareConcurrency: navigator.hardwareConcurrency ?? 'Unavailable',
  };
}

export function renderOverlay(element, data) {
  const f = value => Number(value || 0).toFixed(1);
  element.innerHTML = `<strong>${data.running ? 'RUNNING' : 'PAUSED'}</strong><dl>
    <dt>Coins</dt><dd>${data.coins.toLocaleString()}</dd><dt>FPS</dt><dd>${f(data.fps)}</dd>
    <dt>Frame</dt><dd>${f(data.frameMs)} ms</dd><dt>Physics</dt><dd>${f(data.avgPhysicsMs)} ms</dd>
    <dt>Render</dt><dd>${f(data.renderMs)} ms</dd><dt>Physics steps/s</dt><dd>${f(data.stepsPerSec)}</dd>
    <dt>Bodies</dt><dd>${data.bodies}</dd><dt>Active / sleeping</dt><dd>${data.awake} / ${Math.max(0, data.coins - data.awake)}</dd>
    <dt>Average FPS</dt><dd>${f(data.avgFps)}</dd><dt>1% low</dt><dd>${f(data.onePercentLow)}</dd>
    <dt>Avg / max physics</dt><dd>${f(data.totalAvgPhysics)} / ${f(data.maxPhysicsMs)} ms</dd>
  </dl>`;
}
