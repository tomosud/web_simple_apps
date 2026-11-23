// 背景ワープ（#bg）とパーティクル（#fx）
(() => {
  'use strict';
  const app = document.getElementById('app');
  const bgC = document.getElementById('bg'), fxC = document.getElementById('fx');
  const b = bgC.getContext('2d'), c = fxC.getContext('2d');
  let W = 0, H = 0;
  const MAX_P = 700;
  const P = [];
  const stars = [];
  const st = { speed: 0.6, target: 0.6, hue: 190, targetHue: 190, fever: false, low: false };

  function resize() {
    const r = app.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    for (const cv of [bgC, fxC]) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    b.fillStyle = '#05030f'; b.fillRect(0, 0, W, H);
  }

  for (let i = 0; i < 150; i++) {
    stars.push({ a: Math.random() * 6.283, r: Math.random() * 500, z: 0.3 + Math.random() * 0.7, h: Math.random() * 60 - 30 });
  }

  function drawBg(dt, now) {
    st.speed += (st.target - st.speed) * Math.min(1, dt * 3);
    st.hue += (st.targetHue - st.hue) * Math.min(1, dt * 3);
    b.globalCompositeOperation = 'source-over';
    b.fillStyle = 'rgba(5,3,15,0.3)';
    b.fillRect(0, 0, W, H);
    b.globalCompositeOperation = 'lighter';
    const cx = W / 2, cy = H * 0.36, maxR = Math.hypot(W, H) * 0.75;
    b.lineCap = 'round';
    for (const s of stars) {
      const r0 = s.r;
      s.r += (30 + s.r * 1.7) * s.z * st.speed * dt;
      const co = Math.cos(s.a), si = Math.sin(s.a);
      const hue = st.fever ? (now * 0.25 + s.h * 6) % 360 : st.hue + s.h;
      b.strokeStyle = `hsla(${hue},100%,${60 + s.z * 15}%,${Math.min(1, s.r / maxR * 1.6 + 0.12)})`;
      b.lineWidth = s.z * 1.5 * (0.5 + s.r / maxR * 1.6);
      b.beginPath();
      b.moveTo(cx + co * r0, cy + si * r0);
      b.lineTo(cx + co * s.r, cy + si * s.r);
      b.stroke();
      if (s.r > maxR) { s.r = 2 + Math.random() * 24; s.a = Math.random() * 6.283; }
    }
  }

  function push(p) { if (P.length < MAX_P) P.push(p); }

  // 火花
  function burst(x, y, o = {}) {
    const n = Math.round((o.n || 24) * (st.low ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, sp = (o.speed || 420) * (0.3 + Math.random() * 0.9);
      push({
        k: 0, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: o.grav || 300,
        life: 0, max: (o.life || 0.6) * (0.6 + Math.random() * 0.6),
        size: (o.size || 3) * (0.6 + Math.random() * 0.8),
        hue: (o.hue != null ? o.hue : 45) + Math.random() * (o.spread != null ? o.spread : 30) - 15, delay: 0,
      });
    }
  }

  // コイン噴水
  function coins(x, y, n = 12) {
    n = Math.round(n * (st.low ? 0.5 : 1));
    for (let i = 0; i < n; i++) {
      push({
        k: 1, x, y, vx: (Math.random() - 0.5) * 520, vy: -480 - Math.random() * 520, g: 1900,
        life: 0, max: 1.15, size: 7 + Math.random() * 5, spin: Math.random() * 6.283, vs: 8 + Math.random() * 10,
        delay: Math.random() * 0.12,
      });
    }
  }

  // 画面上からコインの雨
  function rain(n = 60, dur = 1.2) {
    n = Math.round(n * (st.low ? 0.4 : 1));
    for (let i = 0; i < n; i++) {
      push({
        k: 1, x: Math.random() * W, y: -20, vx: (Math.random() - 0.5) * 80, vy: 250 + Math.random() * 350, g: 1500,
        life: 0, max: 2.2, size: 7 + Math.random() * 6, spin: Math.random() * 6.283, vs: 8 + Math.random() * 10,
        delay: Math.random() * dur,
      });
    }
  }

  // 衝撃波リング
  function ring(x, y, hue = 45, r1 = 0) {
    push({ k: 2, x, y, r0: 10, r1: r1 || Math.max(W, H) * 0.55, life: 0, max: 0.55, hue, delay: 0 });
  }

  function drawFx(dt) {
    c.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      if (p.delay > 0) { p.delay -= dt; continue; }
      p.life += dt;
      if (p.life >= p.max || p.y > H + 40) { P.splice(i, 1); continue; }
      const t = p.life / p.max;
      if (p.k === 2) {
        const e = 1 - Math.pow(1 - t, 3);
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `hsla(${p.hue},100%,70%,${1 - t})`;
        c.lineWidth = 8 * (1 - t) + 1;
        c.beginPath(); c.arc(p.x, p.y, p.r0 + (p.r1 - p.r0) * e, 0, 6.283); c.stroke();
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.k === 0) {
        c.globalCompositeOperation = 'lighter';
        c.strokeStyle = `hsla(${p.hue},100%,68%,${1 - t})`;
        c.lineWidth = p.size * (1 - t * 0.6);
        c.lineCap = 'round';
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035); c.stroke();
      } else {
        p.spin += p.vs * dt;
        const sx = Math.max(0.16, Math.abs(Math.cos(p.spin)));
        c.globalCompositeOperation = 'source-over';
        c.globalAlpha = t > 0.6 ? (1 - t) * 2.5 : 1;
        c.fillStyle = '#ffb400';
        c.beginPath(); c.ellipse(p.x, p.y, p.size * sx, p.size, 0, 0, 6.283); c.fill();
        c.fillStyle = '#fff3a0';
        c.beginPath(); c.ellipse(p.x, p.y - p.size * 0.12, p.size * sx * 0.62, p.size * 0.62, 0, 0, 6.283); c.fill();
        c.globalAlpha = 1;
      }
    }
    c.globalCompositeOperation = 'source-over';
  }

  function update(dt, now) {
    if (!W) return;
    drawBg(dt, now);
    drawFx(dt);
  }

  window.GR = window.GR || {};
  window.GR.FX = {
    resize, update, burst, coins, rain, ring,
    setEnergy(speed, hue) { st.target = speed; st.targetHue = hue; },
    setFever(f) { st.fever = f; },
    setLow(l) { st.low = l; },
    size: () => ({ W, H }),
  };
})();
