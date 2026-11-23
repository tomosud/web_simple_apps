// WebAudio だけで鳴らす効果音とBGM（音声ファイルなし）
(() => {
  'use strict';
  let ctx = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  let muted = false;
  try { muted = localStorage.getItem('gr_mute') === '1'; } catch (e) { /* noop */ }

  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
    bgmBus = ctx.createGain(); bgmBus.gain.value = 0.55; bgmBus.connect(master);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  // o: { f, f2, t(相対秒), at(絶対秒), d, type, v, bus, lp }
  function tone(o) {
    if (!ctx) return;
    const t0 = o.at != null ? o.at : ctx.currentTime + (o.t || 0);
    const d = o.d || 0.12, v = o.v || 0.2;
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 6;
      osc.connect(f); node = f;
    }
    node.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + d + 0.03);
  }

  // o: { t, at, d, v, hp, lp, bus }
  function noise(o) {
    if (!ctx) return;
    const t0 = o.at != null ? o.at : ctx.currentTime + (o.t || 0);
    const d = o.d || 0.2, v = o.v || 0.2;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = noiseBuf; src.loop = true;
    let node = src;
    if (o.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; node.connect(f); node = f; }
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; node.connect(f); node = f; }
    g.gain.setValueAtTime(v, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    node.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0, Math.random() * 0.5); src.stop(t0 + d + 0.03);
  }

  const PENTA = [0, 2, 4, 7, 9];
  const comboFreq = n => {
    const i = Math.min(n, 19);
    return 523.25 * Math.pow(2, (Math.floor(i / 5) * 12 + PENTA[i % 5]) / 12);
  };

  let reachTimer = null;

  const sfx = {
    start() {
      [0, 4, 7, 12].forEach((s, i) => tone({ f: mtof(72 + s), t: i * 0.07, d: 0.16, v: 0.16 }));
    },
    correct(combo) {
      const f = comboFreq(combo);
      tone({ f, d: 0.09, v: 0.2 });
      tone({ f: f * 1.5, t: 0.06, d: 0.14, v: 0.18 });
      tone({ f: f * 2, t: 0.12, d: 0.2, v: 0.1, type: 'triangle' });
      noise({ d: 0.06, v: 0.08, hp: 6000 });
    },
    coin(n = 3) {
      for (let i = 0; i < n; i++) {
        tone({ f: 1318, t: i * 0.06, d: 0.05, v: 0.09 });
        tone({ f: 1760, t: i * 0.06 + 0.04, d: 0.12, v: 0.09 });
      }
    },
    wrong() {
      tone({ f: 180, f2: 55, d: 0.4, v: 0.3, type: 'sawtooth' });
      noise({ d: 0.3, v: 0.2, lp: 900 });
    },
    tick() { tone({ f: 1100, d: 0.03, v: 0.1, type: 'triangle' }); },
    reelStop() {
      tone({ f: 150, f2: 50, d: 0.14, v: 0.4, type: 'sine' });
      noise({ d: 0.05, v: 0.2, hp: 2000 });
    },
    boom() {
      tone({ f: 130, f2: 30, d: 0.6, v: 0.6, type: 'sine' });
      noise({ d: 0.5, v: 0.3, lp: 1400 });
    },
    reachStart() {
      sfx.reachStop();
      let k = 0;
      const beep = () => { tone({ f: k++ % 2 ? 1174 : 880, d: 0.17, v: 0.13, type: 'sawtooth', lp: 3000 }); };
      beep();
      reachTimer = setInterval(beep, 190);
    },
    reachStop() { if (reachTimer) { clearInterval(reachTimer); reachTimer = null; } },
    jackpot(tier = 1) {
      const notes = [0, 4, 7, 12, 16, 19, 24];
      const reps = tier >= 3 ? 3 : tier >= 2 ? 2 : 1;
      for (let r = 0; r < reps; r++) {
        notes.forEach((s, i) => {
          tone({ f: mtof(60 + s + r * 2), t: r * 0.5 + i * 0.065, d: 0.2, v: 0.17 });
          tone({ f: mtof(72 + s + r * 2), t: r * 0.5 + i * 0.065 + 0.03, d: 0.16, v: 0.07, type: 'triangle' });
        });
      }
      sfx.boom();
      noise({ d: 0.9, v: 0.16, hp: 5000 });
      sfx.coin(tier * 4);
    },
    miss() {
      tone({ f: 392, f2: 196, d: 0.35, v: 0.16, type: 'triangle' });
    },
    fever() {
      tone({ f: 110, f2: 1760, d: 0.8, v: 0.22, type: 'sawtooth', lp: 4000 });
      noise({ d: 0.8, v: 0.12, hp: 3000 });
      [0, 4, 7, 12].forEach(s => tone({ f: mtof(72 + s), t: 0.8, d: 0.7, v: 0.12, type: 'sawtooth', lp: 5000 }));
      noise({ t: 0.8, d: 0.8, v: 0.3, hp: 4000 });
      tone({ f: 120, f2: 30, t: 0.8, d: 0.7, v: 0.6, type: 'sine' });
    },
    rankUp() {
      [0, 5, 7, 12, 17].forEach((s, i) => tone({ f: mtof(76 + s), t: i * 0.05, d: 0.14, v: 0.13, type: 'triangle' }));
    },
    flip() {
      noise({ d: 0.08, v: 0.18, hp: 3000 });
      tone({ f: 700, f2: 1400, d: 0.1, v: 0.1, type: 'triangle' });
    },
    over() {
      [12, 8, 5, 0].forEach((s, i) => tone({ f: mtof(57 + s), t: i * 0.22, d: 0.4, v: 0.18, type: 'sawtooth', lp: 1800 }));
      tone({ f: 80, f2: 30, t: 0.7, d: 1.0, v: 0.5, type: 'sine' });
    },
  };

  // ---------- BGM（16ステップ×4小節のシーケンサ） ----------
  const BARS = [[45, [0, 3, 7]], [41, [0, 4, 7]], [48, [0, 4, 7]], [43, [0, 4, 7]]]; // Am F C G
  const BASS = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0];
  const bgm = { on: false, mode: 0, step: 0, next: 0, bpm: 132, timer: null };

  function playStep(step, t) {
    const bar = BARS[(step >> 4) & 3], s = step & 15, root = bar[0], ch = bar[1];
    const fever = bgm.mode === 2;
    if (s % 4 === 0) {
      tone({ f: 150, f2: 42, at: t, d: 0.16, v: 0.5, type: 'sine', bus: bgmBus });
    }
    if (s % 4 === 2) noise({ at: t, d: 0.05, v: 0.1, hp: 7000, bus: bgmBus });
    else if (fever || s % 2 === 1) noise({ at: t, d: 0.025, v: 0.045, hp: 8000, bus: bgmBus });
    if (s === 4 || s === 12) noise({ at: t, d: 0.11, v: 0.14, hp: 1500, lp: 6000, bus: bgmBus });
    if (BASS[s]) tone({ f: mtof(root - (s % 8 === 0 ? 12 : 0)), at: t, d: 0.13, v: 0.2, type: 'sawtooth', lp: 700, bus: bgmBus });
    if (s % 2 === 0 || fever) {
      const n = ch[((s >> 1) + (step >> 4)) % 3];
      tone({ f: mtof(root + 24 + n + (s % 8 >= 4 ? 12 : 0)), at: t, d: 0.09, v: fever ? 0.06 : 0.045, type: 'square', bus: bgmBus });
    }
    if (fever && s % 4 === 0) {
      tone({ f: mtof(root + 36 + ch[(s >> 2) % 3]), at: t, d: 0.22, v: 0.05, type: 'sawtooth', lp: 4000, bus: bgmBus });
    }
  }

  function sched() {
    if (!ctx || !bgm.on) return;
    if (bgm.next < ctx.currentTime) bgm.next = ctx.currentTime + 0.03;
    while (bgm.next < ctx.currentTime + 0.14) {
      playStep(bgm.step, bgm.next);
      bgm.next += 60 / (bgm.mode === 2 ? Math.max(bgm.bpm + 16, 168) : bgm.bpm) / 4;
      bgm.step = (bgm.step + 1) % 64;
    }
  }

  // mode: 0=停止 1=通常 2=FEVER
  function setMode(mode) {
    bgm.mode = mode;
    if (!ctx) return;
    if (mode === 0) {
      bgm.on = false;
      if (bgm.timer) { clearInterval(bgm.timer); bgm.timer = null; }
      return;
    }
    if (!bgm.on) {
      bgm.on = true; bgm.step = 0; bgm.next = ctx.currentTime + 0.05;
      bgm.timer = setInterval(sched, 25);
    }
  }
  function setTempo(bpm) { bgm.bpm = bpm; }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('gr_mute', m ? '1' : '0'); } catch (e) { /* noop */ }
    if (master) master.gain.value = m ? 0 : 0.7;
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  window.GR = window.GR || {};
  window.GR.Audio = { init, sfx, setMode, setTempo, setMuted, isMuted: () => muted };
})();
