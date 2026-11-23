// 天才ラッシュ∞ 本体
(() => {
  'use strict';
  const { Num: N, Audio: A, FX, Questions: Q } = window.GR;
  const $ = id => document.getElementById(id);
  const app = $('app');
  const DEBUG = new URLSearchParams(location.search).has('debug'); // ?debug で時間切れなし

  const GAUGE_MAX = 5;
  const FEVER_L = 3; // FEVER中は獲得IQ ×1000

  // [log10(IQ)のしきい値, 称号]
  const RANKS = [
    [0, '凡人'], [2.3, '秀才'], [3, '天才'], [4, '超天才'], [8, '人類最高頭脳'], [12, '生ける伝説'],
    [16, '超越者'], [20, '銀河級知性'], [28, '宇宙の意思'], [40, '神'], [52, '創造主'],
    [68, '全知全能'], [100, '概念'], [136, '∞そのもの'],
  ];

  const PRAISE = [
    [1, ['正解！', 'ナイス！', '賢い！', 'お見事！']],
    [3, ['天才！', 'キレてる！', '冴えすぎ！', '頭脳明晰！']],
    [6, ['超天才！！', '異次元！！', '神速！！', '脳が光る！！']],
    [10, ['人類超越！！', 'IQ爆発！！', '覚醒！！', '歴史的頭脳！！']],
    [20, ['全知全能！！！', '神！！！', '宇宙の真理！！！', '思考が光速！！！']],
  ];
  const WRONG = ['深読みしすぎた！', '天才ゆえのミス！', '脳が速すぎた！', '常人には理解不能！'];
  const TIMEOUT = ['考えが深すぎた！', '熟考の天才！', '思考が宇宙へ！'];
  const SLOT_FLATTER = ['目押し精度 100% ─ 神の動体視力', 'この止め方、プロでも不可能', '0.001秒の見切り ─ 人間卒業', '確率を支配する者'];
  const LOSE_FLATTER = ['あえて外した ─ 次への布石', 'ハズレすら計算のうち', '運を温存する高等戦術'];

  // スロット：図柄と配当（L = 倍率の log10）
  const SYM = ['７', '才', '∞', '脳', '神', '天'];
  const PAY = {
    4: { L: 16, fever: 15, name: '神・降臨', tier: 4 },
    0: { L: 8, fever: 10, name: '超大当たり', tier: 3 },
    2: { L: 4, fever: 0, name: '大当たり', tier: 2 },
    3: { L: 3, fever: 0, name: '中当たり', tier: 1 },
    5: { L: 2, fever: 0, name: '当たり', tier: 1 },
    1: { L: 1, fever: 0, name: '小当たり', tier: 1 },
  };
  const AURA = ['#3aa0ff', '#3aa0ff', '#46ff8a', '#ff3355', '#ffd23f', '#ff2b6a'];

  const el = {
    stage: $('stage'), hud: $('hud'), lives: $('lives'), rank: $('rank'), mute: $('mute'),
    iq: $('iq'), iqNum: $('iqNum'), iqUnit: $('iqUnit'), mult: $('mult'), combo: $('combo'),
    comboChip: $('comboChip'), feverLeft: $('feverLeft'),
    praise: $('praise'), qTag: $('qTag'), qText: $('qText'), timer: $('timer'), timerBar: $('timerBar'),
    gauge: $('gauge'), cells: [...document.querySelectorAll('.g-cells i')],
    cA: $('cA'), cB: $('cB'),
    slot: $('slot'), slotFrame: $('slotFrame'), hope: $('hope'), slotResult: $('slotResult'), slotBtn: $('slotBtn'),
    reels: [...document.querySelectorAll('.reel')],
    cards: $('cards'), cardsMsg: $('cardsMsg'), cardsResult: $('cardsResult'), cardBtns: [...document.querySelectorAll('.card')],
    revive: $('revive'), reviveWord: $('reviveWord'), reviveBtn: $('reviveBtn'),
    pop: $('pop'), cutin: $('cutin'), flash: $('flash'),
    title: $('title'), bestIq: $('bestIq'), lowFx: $('lowFx'), startBtn: $('startBtn'),
    result: $('result'), resNew: $('resNew'), resNum: $('resNum'), resUnit: $('resUnit'),
    resRank: $('resRank'), resStats: $('resStats'), shareBtn: $('shareBtn'), retryBtn: $('retryBtn'),
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* noop */ } },
  };

  const S = {
    state: 'title', // title | lock | play | slot | cards | revive | over
    iqL: 2, dispL: 2, baseL: 1, multL: 0, dispMultL: 0,
    combo: 0, maxCombo: 0, correct: 0, lives: 3, level: 0,
    gauge: 0, bonusCount: 0, feverLeft: 0, reviveUsed: false, rankIdx: 0,
    q: null, qStart: 0, qLimit: 6, lastType: '',
    bestL: parseFloat(store.get('gr_best', '0')) || 0,
    lowFx: store.get('gr_lowfx', '0') === '1',
    resL: 0, resTarget: 0,
  };

  // ---------- 小物 ----------
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const mod = (n, m) => ((n % m) + m) % m;
  const timers = new Set();
  function later(ms, fn) {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }
  function cancel(id) { clearTimeout(id); timers.delete(id); }
  function clearAll() { timers.forEach(clearTimeout); timers.clear(); }

  function retrigger(node, cls) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
  }
  function center(node) {
    const r = node.getBoundingClientRect(), a = app.getBoundingClientRect();
    return { x: r.left - a.left + r.width / 2, y: r.top - a.top + r.height / 2 };
  }
  function vibrate(p) {
    if (S.lowFx) return;
    try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* noop */ }
  }
  function shake(big) {
    if (S.lowFx) return;
    app.classList.remove('shake-s', 'shake-l');
    void app.offsetWidth;
    app.classList.add(big ? 'shake-l' : 'shake-s');
  }
  function flash(color, strength = 0.6) {
    if (S.lowFx) return;
    el.flash.style.background = color;
    el.flash.style.setProperty('--fo', strength);
    retrigger(el.flash, 'on');
  }
  // 文字数に合わせて、横幅 widthU(--u単位) に収まるフォントサイズを返す
  function fitSize(text, maxU, widthU) {
    let w = 0;
    for (const ch of text) w += ch.charCodeAt(0) < 0x2000 ? 0.74 : 1;
    return `calc(var(--u) * ${Math.min(maxU, widthU / Math.max(1, w)).toFixed(2)})`;
  }
  function cutin(main, sub = '', cls = '') {
    el.cutin.className = cls;
    el.cutin.querySelector('.c1').style.fontSize = fitSize(main, 11.5, 86);
    el.cutin.querySelector('.c1').textContent = main;
    el.cutin.querySelector('.c2').textContent = sub;
    retrigger(el.cutin, 'on');
  }
  function praise(main, sub, bad) {
    el.praise.classList.toggle('bad', !!bad);
    el.praise.querySelector('.main').style.fontSize = fitSize(main, 13, 84);
    el.praise.querySelector('.main').textContent = main;
    el.praise.querySelector('.sub').textContent = sub || '';
    retrigger(el.praise, 'show');
  }
  function floatText(x, y, html) {
    const d = document.createElement('div');
    d.className = 'float';
    d.innerHTML = html;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    el.pop.appendChild(d);
    setTimeout(() => d.remove(), 1000);
  }
  // 「12.3億」→ 数字は英字フォント、単位は和文フォント
  function numHtml(L, prefix = '') {
    const p = N.parts(L);
    return `<span class="en">${prefix}${p.num.replace(/\.0+$/, '')}</span>${p.unit}`;
  }
  function setBonusResult(node, r1, r2, r3) {
    node.querySelector('.r1').innerHTML = r1 || '';
    node.querySelector('.r2').innerHTML = r2 || '';
    node.querySelector('.r3').innerHTML = r3 || '';
    if (r1 || r2) retrigger(node, 'show'); else node.classList.remove('show');
  }
  function topPercent(L) {
    const k = Math.max(1, Math.floor(L));
    return k <= 10 ? '0.' + '0'.repeat(k) + '1%' : `0.00…(0が${k}個)…01%`;
  }
  function rankIndex(L) {
    let i = 0;
    for (let k = 0; k < RANKS.length; k++) if (L >= RANKS[k][0]) i = k;
    return i;
  }

  // ---------- 表示 ----------
  function layout() {
    const r = app.getBoundingClientRect();
    app.style.setProperty('--u', (r.width / 100) + 'px');
    FX.resize();
    syncHudHeight();
    for (const reel of slot.reels) sizeReel(reel);
  }
  function syncHudHeight() {
    const a = app.getBoundingClientRect(), h = el.hud.getBoundingClientRect();
    app.style.setProperty('--hudH', Math.round(h.bottom - a.top + 6) + 'px');
  }
  function renderLives() {
    el.lives.innerHTML = [0, 1, 2].map(i => `<i class="${i < S.lives ? '' : 'off'}"></i>`).join('');
  }
  function renderGauge() {
    const n = Math.floor(S.gauge + 1e-6);
    el.cells.forEach((c, i) => c.classList.toggle('on', i < n));
    el.gauge.classList.toggle('full', S.gauge >= GAUGE_MAX);
  }
  function renderChips() {
    el.combo.textContent = S.combo;
    el.comboChip.classList.toggle('hot', S.combo >= 5);
    el.feverLeft.textContent = S.feverLeft;
  }
  const cache = { num: '', unit: '', mult: '' };
  function paintIQ(force) {
    const p = N.parts(S.dispL);
    if (force || p.num !== cache.num) { el.iqNum.textContent = p.num; cache.num = p.num; }
    if (force || p.unit !== cache.unit) {
      el.iqUnit.textContent = p.unit; cache.unit = p.unit;
      el.iqUnit.classList.toggle('long', p.unit.length >= 5);
    }
    const m = '×' + N.fmt(S.dispMultL);
    if (force || m !== cache.mult) { el.mult.textContent = m; cache.mult = m; }
  }
  function rollNumbers(dt) {
    const k = 1 - Math.exp(-dt * 9);
    if (S.dispL !== S.iqL) {
      const d = S.iqL - S.dispL;
      S.dispL = Math.abs(d) < 0.0004 ? S.iqL : S.dispL + d * k;
    }
    if (S.dispMultL !== S.multL) {
      const d = S.multL - S.dispMultL;
      S.dispMultL = Math.abs(d) < 0.0004 ? S.multL : S.dispMultL + d * k;
    }
    paintIQ(false);
    if (S.state === 'over' && S.resL !== S.resTarget) {
      const d = S.resTarget - S.resL;
      S.resL = Math.abs(d) < 0.0004 ? S.resTarget : S.resL + d * (1 - Math.exp(-dt * 3.2));
      const p = N.parts(S.resL);
      el.resNum.textContent = p.num;
      el.resUnit.textContent = p.unit;
      el.resUnit.classList.toggle('long', p.unit.length >= 5);
    }
  }
  function updateRank(silent) {
    const idx = rankIndex(S.iqL);
    if (idx === S.rankIdx) return;
    const up = idx > S.rankIdx;
    S.rankIdx = idx;
    el.rank.textContent = RANKS[idx][1];
    if (up && !silent) {
      retrigger(el.rank, 'up');
      cutin('RANK UP', '称号「' + RANKS[idx][1] + '」を獲得', 'gold');
      A.sfx.rankUp();
    }
  }
  function energy() {
    const fever = S.feverLeft > 0;
    FX.setEnergy(0.6 + Math.min(S.combo, 30) * 0.13 + (fever ? 3.5 : 0), 190 + Math.min(S.combo, 30) * 5);
  }

  // ---------- 進行 ----------
  function startGame() {
    clearAll();
    A.init();
    A.sfx.reachStop();
    Object.assign(S, {
      state: 'lock', iqL: 2, dispL: 2, baseL: 1, multL: 0, dispMultL: 0,
      combo: 0, maxCombo: 0, correct: 0, lives: 3, level: 0,
      gauge: 0, bonusCount: 0, feverLeft: 0, reviveUsed: false, rankIdx: 0, lastType: '',
    });
    for (const o of [el.title, el.result, el.slot, el.cards, el.revive]) o.classList.remove('on');
    app.classList.remove('fever');
    FX.setFever(false);
    el.rank.textContent = RANKS[0][1];
    el.qTag.textContent = ''; el.qText.textContent = '';
    for (const b of [el.cA, el.cB]) { b.className = 'choice ' + (b === el.cA ? 'ca' : 'cb'); b.firstElementChild.innerHTML = ''; }
    el.timerBar.style.transform = 'scaleX(1)';
    renderLives(); renderGauge(); renderChips(); paintIQ(true); energy();
    A.setTempo(130); A.setMode(1); A.sfx.start();
    cutin('READY?', 'あなたは、天才です。');
    later(950, nextQuestion);
  }

  function nextQuestion() {
    const q = Q.next(S.level, S.lastType);
    S.q = q; S.lastType = q.type;
    el.qTag.textContent = S.feverLeft > 0 ? '【覚醒FEVER】獲得IQ ×1000 ／ 無敵' : q.tag;
    el.qText.innerHTML = q.text;
    [el.cA, el.cB].forEach((b, i) => {
      b.className = 'choice ' + (i ? 'cb' : 'ca');
      b.firstElementChild.innerHTML = i ? q.b : q.a;
      retrigger(b, 'in');
    });
    S.qLimit = S.feverLeft > 0 ? 3 : S.correct < 3 ? 6 : Math.max(1.1, 3.6 - S.level * 0.22);
    if (DEBUG) S.qLimit = 99999;
    el.timer.classList.remove('danger');
    A.setTempo(130 + Math.min(S.level, 10) * 3);
    S.qStart = performance.now();
    S.state = 'play';
  }

  function answer(i) {
    if (S.state !== 'play') return;
    const t = (performance.now() - S.qStart) / 1000;
    if (i === S.q.correct) onCorrect(i, t); else onMiss(i);
  }

  function onCorrect(i, t) {
    S.state = 'lock';
    const btn = i ? el.cB : el.cA, other = i ? el.cA : el.cB;
    const frac = Math.max(0, 1 - t / S.qLimit);
    const fever = S.feverLeft > 0;
    S.combo++; S.correct++;
    S.maxCombo = Math.max(S.maxCombo, S.combo);

    const gainL = S.baseL + S.multL + Math.log10(1 + S.combo * 0.5) + Math.log10(1 + 3 * frac) + (fever ? FEVER_L : 0);
    S.iqL = N.add(S.iqL, gainL);
    S.baseL += 0.16; // 1問ごとに基礎値が約1.45倍
    S.level = Math.floor(S.correct / 6);

    btn.classList.add('ok'); other.classList.add('dim');
    const c = center(btn);
    const hue = fever ? Math.random() * 360 : 45;
    FX.burst(c.x, c.y, { n: 18 + Math.min(S.combo, 20) * 2, hue, spread: fever ? 120 : 30, speed: 460 + Math.min(S.combo, 20) * 20 });
    FX.coins(c.x, c.y, 5 + Math.min(S.combo, 15) + (fever ? 14 : 0));
    FX.ring(c.x, c.y, hue, 200 + Math.min(S.combo, 20) * 14);
    const gp = N.parts(gainL);
    floatText(c.x, c.y - 30, `+${gp.num}<span class="jp">${gp.unit}</span>`);
    retrigger(el.iq, 'bump');
    A.sfx.correct(S.combo);
    if (S.combo % 5 === 0 || fever) A.sfx.coin(2);
    vibrate(fever ? [20, 20, 30] : 15);
    if (S.combo >= 5 || fever) shake(fever);
    if (fever) flash('#fff', 0.22);

    let tier = PRAISE[0][1];
    for (const p of PRAISE) if (S.combo >= p[0]) tier = p[1];
    const speedWord = t < 0.6 ? '神速' : t < 1.2 ? '超速' : '解答';
    praise(pick(tier), `${speedWord} ${t.toFixed(2)}秒 ｜ 人類上位 ${topPercent(1 + S.combo * 0.5)}`);

    if (fever) {
      S.feverLeft--;
      if (S.feverLeft === 0) endFever();
    } else {
      S.gauge = Math.min(GAUGE_MAX, S.gauge + 1 + (frac > 0.6 ? 0.5 : 0));
    }
    renderGauge(); renderChips(); energy(); updateRank();

    later(Math.max(210, 330 - S.level * 12), () => {
      if (S.gauge >= GAUGE_MAX && S.feverLeft === 0) startBonus();
      else nextQuestion();
    });
  }

  // i: 押したボタン（時間切れは -1）
  function onMiss(i) {
    S.state = 'lock';
    const fever = S.feverLeft > 0;
    const right = S.q.correct ? el.cB : el.cA;
    if (i >= 0) (i ? el.cB : el.cA).classList.add('ng');
    right.classList.add('hint');
    S.combo = 0;
    A.sfx.wrong();
    shake(true);
    vibrate([60, 40, 60]);
    flash(fever ? '#fff' : '#ff0033', 0.4);
    if (fever) {
      S.feverLeft--;
      praise('ノーダメージ！', '覚醒中の天才は傷つかない', true);
      if (S.feverLeft === 0) endFever();
    } else {
      S.lives--;
      praise(pick(i < 0 ? TIMEOUT : WRONG), 'あなたは悪くない。問題が悪い。', true);
    }
    renderLives(); renderChips(); energy();
    later(950, () => {
      if (S.lives <= 0) { if (S.reviveUsed) gameOver(); else startRevive(); }
      else if (S.gauge >= GAUGE_MAX && S.feverLeft === 0) startBonus();
      else nextQuestion();
    });
  }

  function startFever(n) {
    S.feverLeft += n;
    app.classList.add('fever');
    FX.setFever(true);
    A.setMode(2); A.sfx.fever();
    flash('#fff', 0.8); shake(true); vibrate([40, 30, 40, 30, 120]);
    const s = FX.size();
    FX.rain(90, 1.4);
    FX.ring(s.W / 2, s.H * 0.4, 50);
    cutin('覚醒 FEVER', `${n}問のあいだ 獲得IQ ×1000 ／ 無敵`, 'rainbow');
    renderChips(); energy();
    later(1200, nextQuestion);
  }
  function endFever() {
    app.classList.remove('fever');
    FX.setFever(false);
    A.setMode(1);
  }

  function showBonus(node) {
    syncHudHeight();
    node.classList.add('on');
  }

  function startBonus() {
    S.state = 'lock';
    S.gauge = 0; S.bonusCount++;
    renderGauge();
    const isCards = S.bonusCount % 3 === 0;
    cutin('BONUS CHANCE', isCards ? '天啓の三択' : '神託スロット', 'gold');
    A.sfx.rankUp();
    flash('#ffd23f', 0.35);
    later(800, isCards ? startCards : startSlot);
  }

  // ---------- スロット ----------
  const slot = { reels: [], out: null, idx: 0, phase: 'idle', autoT: 0, fever: 0 };
  el.reels.forEach((node, i) => {
    slot.reels.push({ node, cells: [...node.querySelectorAll('.cell')], pos: i * 2, speed: 15, mode: 'stop', h: 60 });
  });
  function sizeReel(r) {
    const h = r.node.clientHeight / 2;
    if (h > 0) { r.h = h; r.node.style.fontSize = Math.round(h * 0.8) + 'px'; }
  }
  function drawReel(r) {
    const base = Math.floor(r.pos), frac = r.pos - base;
    for (let k = 0; k < 4; k++) {
      const off = k - 1; // -1=通過済み(下) 0=中央 1,2=これから来る(上)
      const sym = mod(base + off, 6);
      const cell = r.cells[k];
      if (cell._s !== sym) { cell._s = sym; cell.textContent = SYM[sym]; cell.className = 'cell s' + sym; }
      cell.style.transform = `translateY(${((frac - off) * r.h).toFixed(1)}px)`;
    }
  }

  // 結果は回す前に決まっている（タップのタイミングは無関係）
  function rollSlot() {
    const win = s => ({ reels: [s, s, s], win: s, revive: null, reach: true });
    const first = S.bonusCount === 1;
    const r = Math.random();
    if (first) return win(r < 0.25 ? 0 : r < 0.7 ? 2 : 3); // 初回は必ず気持ちよく当たる
    if (r < 0.02) return win(4);
    if (r < 0.12) return win(0);
    if (r < 0.32) return win(2);
    if (r < 0.44) return win(3);
    if (r < 0.57) return win(5);
    if (r < 0.70) return win(1);
    if (Math.random() < 0.62) {
      // リーチ外れ（あと1コマ）。一部は「復活」で大当たりに化ける
      const s = pick([0, 0, 0, 2, 4]);
      const revive = Math.random() < 0.28;
      const near = revive || Math.random() < 0.5 ? mod(s - 1, 6) : mod(s + 1, 6);
      return { reels: [s, s, near], win: null, revive: revive ? s : null, reach: true };
    }
    const a = Math.floor(Math.random() * 6);
    const b2 = mod(a + 1 + Math.floor(Math.random() * 5), 6);
    return { reels: [a, b2, Math.floor(Math.random() * 6)], win: null, revive: null, reach: false };
  }
  function hopeStars(out) {
    let n;
    if (out.win != null) n = [0, 2, 3, 4, 5][PAY[out.win].tier] + (Math.random() < 0.4 ? 1 : 0);
    else if (out.revive != null) n = 3;
    else if (out.reach) n = 2 + Math.floor(Math.random() * 3);
    else n = 1 + Math.floor(Math.random() * 2);
    return Math.max(1, Math.min(5, n));
  }

  function startSlot() {
    S.state = 'slot';
    slot.out = rollSlot();
    slot.idx = 0; slot.phase = 'spin'; slot.fever = 0;
    const stars = hopeStars(slot.out);
    el.hope.textContent = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    el.slotFrame.className = 'slot-frame' + (stars === 5 ? ' rainbow' : '');
    el.slotFrame.style.setProperty('--aura', AURA[stars]);
    el.slot.style.setProperty('--aura', AURA[stars]);
    setBonusResult(el.slotResult, '', '', '');
    el.slotBtn.textContent = 'STOP';
    el.slotBtn.className = 'bigbtn stop';
    showBonus(el.slot);
    slot.reels.forEach((r, i) => {
      sizeReel(r);
      r.mode = 'spin'; r.speed = 15 + i * 3; r.pos = Math.random() * 6;
      r.node.classList.add('spin'); r.node.classList.remove('hit');
      r.onEnd = null;
    });
    if (stars >= 4) { flash(AURA[stars], 0.4); A.sfx.boom(); vibrate(80); }
    slotAuto(1900);
  }
  function slotAuto(ms) {
    cancel(slot.autoT);
    slot.autoT = later(ms, slotTap);
  }
  function tweenReel(r, to, dur, ease, onEnd) {
    r.mode = 'tween'; r.from = r.pos; r.to = to; r.t0 = performance.now(); r.dur = dur; r.ease = ease; r.onEnd = onEnd;
    r.node.classList.remove('spin');
  }
  const easeOutBack = t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

  function slotTap() {
    if (S.state !== 'slot') return;
    if (slot.phase === 'done') { finishSlot(); return; }
    if (slot.phase !== 'spin') return;
    cancel(slot.autoT);
    const i = slot.idx, r = slot.reels[i], o = slot.out;
    const reach = i === 2 && o.reels[0] === o.reels[1];
    let P = Math.ceil(r.pos + (reach ? 13 : 3));
    while (mod(P, 6) !== o.reels[i]) P++;
    slot.phase = 'stopping';
    vibrate(12);
    tweenReel(r, P, reach ? 2700 : 420, reach ? easeOutQuart : easeOutBack, () => reelStopped(i));
  }

  function reelStopped(i) {
    A.sfx.reelStop(); shake(false); vibrate(25);
    const o = slot.out;
    slot.idx = i + 1;
    if (slot.idx < 3) {
      slot.phase = 'spin';
      if (slot.idx === 2 && o.reels[0] === o.reels[1]) {
        // リーチ
        const hot = o.reels[0] === 0 || o.reels[0] === 4;
        slot.reels[0].node.classList.add('hit'); slot.reels[1].node.classList.add('hit');
        slot.reels[2].speed = 26;
        el.slotFrame.classList.add('reach');
        A.sfx.reachStart();
        cutin('リーチ!!', hot ? '激アツ ─ 止めるのは君だ' : 'TAPで運命を決めろ', hot ? 'rainbow' : 'gold');
        flash(hot ? '#ff0033' : '#ffd23f', 0.4);
        slotAuto(3200);
      } else {
        slotAuto(1900);
      }
      return;
    }
    // 3つ止まった
    A.sfx.reachStop();
    el.slotFrame.classList.remove('reach');
    slot.phase = 'wait';
    if (o.win != null) { slotWin(o.win, false); return; }
    if (o.revive != null) {
      setBonusResult(el.slotResult, '……ハズレ？', '', '');
      A.sfx.miss();
      later(1000, () => {
        flash('#fff', 0.9); shake(true); A.sfx.boom(); vibrate([80, 40, 160]);
        cutin('復活!!!', '運命をねじ曲げた', 'rainbow');
        const r = slot.reels[2];
        tweenReel(r, r.pos + 1, 500, easeOutBack, () => { A.sfx.reelStop(); slotWin(o.revive, true); });
      });
      return;
    }
    slotLose(o.reach);
  }

  function slotWin(sym, revived) {
    const pay = PAY[sym];
    S.iqL += pay.L; S.multL += pay.L;
    slot.fever = pay.fever;
    slot.reels.forEach(r => r.node.classList.add('hit'));
    const s = FX.size(), c = center(el.slotFrame);
    FX.rain(30 + pay.tier * 45, 1.0 + pay.tier * 0.3);
    FX.ring(c.x, c.y, 45);
    FX.burst(c.x, c.y, { n: 30 + pay.tier * 20, hue: pay.tier >= 3 ? 0 : 45, spread: pay.tier >= 3 ? 360 : 40, speed: 700 });
    if (pay.tier >= 3) later(250, () => FX.ring(s.W / 2, s.H / 2, 300));
    flash(pay.tier >= 3 ? '#fff' : '#ffd23f', pay.tier >= 2 ? 0.8 : 0.5);
    shake(true);
    vibrate(pay.tier >= 3 ? [60, 40, 60, 40, 200] : [40, 30, 80]);
    A.sfx.jackpot(pay.tier);
    retrigger(el.iq, 'bump');
    setBonusResult(el.slotResult,
      `${SYM[sym]}${SYM[sym]}${SYM[sym]} ${pay.name}!!`,
      'IQ ' + numHtml(pay.L, '×'),
      revived ? '外れた運命すら書き換える ─ 神の領域' : pick(SLOT_FLATTER));
    slotDone(pay.tier >= 3 ? 3400 : 2600, 900);
  }
  function slotLose(wasReach) {
    const L = Math.log10(2);
    S.iqL += L; S.multL += L;
    A.sfx.miss();
    setBonusResult(el.slotResult, wasReach ? '惜しい！あと1コマ！' : 'ハズレ', '参加賞 IQ <span class="en">×2</span>', pick(LOSE_FLATTER));
    slotDone(1900, 500);
  }
  function slotDone(autoMs, lockMs) {
    later(lockMs, () => {
      slot.phase = 'done';
      el.slotBtn.textContent = 'NEXT';
      el.slotBtn.className = 'bigbtn next';
    });
    slotAuto(autoMs);
  }
  function finishSlot() {
    cancel(slot.autoT);
    slot.phase = 'idle';
    S.state = 'lock';
    el.slot.classList.remove('on');
    updateRank();
    if (slot.fever) later(250, () => startFever(slot.fever));
    else later(250, nextQuestion);
  }
  function updateReels(now, dt) {
    for (const r of slot.reels) {
      if (r.mode === 'spin') {
        r.pos += r.speed * dt;
      } else if (r.mode === 'tween') {
        const t = Math.min(1, (now - r.t0) / r.dur);
        const before = Math.floor(r.pos);
        r.pos = r.from + (r.to - r.from) * r.ease(t);
        if (r.dur > 1000 && Math.floor(r.pos) !== before) A.sfx.tick();
        if (t >= 1) {
          r.pos = r.to; r.mode = 'stop';
          const cb = r.onEnd; r.onEnd = null;
          drawReel(r);
          if (cb) cb();
          continue;
        }
      }
      drawReel(r);
    }
  }

  // ---------- 三択カード ----------
  const cards = { picked: -1, autoT: 0, done: false };
  function startCards() {
    S.state = 'cards';
    cards.picked = -1; cards.done = false;
    el.cardBtns.forEach(c => { c.className = 'card'; c.querySelector('.front').innerHTML = ''; });
    el.cardsMsg.textContent = '直感で1枚えらべ';
    setBonusResult(el.cardsResult, '', '', '');
    showBonus(el.cards);
    cards.autoT = later(8000, () => pickCard(1));
  }
  function pickCard(i) {
    if (S.state !== 'cards') return;
    if (cards.done) { finishCards(); return; }
    if (cards.picked >= 0) return;
    cancel(cards.autoT);
    cards.picked = i;
    // 選んだカードが必ず最高の1枚になる
    const L = 2 + Math.floor(Math.random() * 4) + (Math.random() < 0.15 ? 4 : 0);
    const others = Math.random() < 0.5 ? ['dead', 'lose'] : ['lose', 'dead'];
    const mine = el.cardBtns[i];
    mine.querySelector('.front').innerHTML = 'IQ<br>' + numHtml(L, '×');
    mine.classList.add('flip', 'win');
    A.sfx.flip(); vibrate(20);
    el.cardsMsg.textContent = '……';
    later(650, () => {
      let k = 0;
      el.cardBtns.forEach((c, j) => {
        if (j === i) return;
        const kind = others[k++];
        c.querySelector('.front').innerHTML = kind === 'dead' ? '即死<br>ゲーム<br>オーバー' : 'IQ<br><span class="en">×2</span>';
        c.classList.add('flip', kind);
      });
      A.sfx.flip();
    });
    later(1300, () => {
      S.iqL += L; S.multL += L;
      const c = center(mine);
      FX.coins(c.x, c.y, 30); FX.ring(c.x, c.y, 45); FX.rain(50, 0.9);
      flash('#ffd23f', 0.6); shake(true); vibrate([40, 30, 90]);
      A.sfx.jackpot(L >= 6 ? 2 : 1);
      retrigger(el.iq, 'bump');
      el.cardsMsg.textContent = '危機回避率 100%';
      setBonusResult(el.cardsResult, '直感的中!!', 'IQ ' + numHtml(L, '×'), '3枚中、最高の1枚を一発で選択 ─ 第六感 SSS');
      later(700, () => { cards.done = true; });
      cards.autoT = later(2400, finishCards);
    });
  }
  function finishCards() {
    if (S.state !== 'cards') return;
    cancel(cards.autoT);
    S.state = 'lock';
    el.cards.classList.remove('on');
    updateRank();
    later(250, nextQuestion);
  }

  // ---------- ラストチャンス ----------
  const rv = { phase: 'idle', word: 0, last: 0, result: false, autoT: 0 };
  function setReviveWord(w) {
    rv.word = w;
    el.reviveWord.textContent = w === 0 ? '復活' : '終了';
    el.reviveWord.classList.toggle('end', w === 1);
  }
  function startRevive() {
    S.state = 'revive';
    S.reviveUsed = true;
    rv.result = Math.random() < 0.5;
    rv.phase = 'spin'; rv.last = 0;
    el.reviveWord.classList.remove('fix');
    setReviveWord(0);
    showBonus(el.revive);
    A.sfx.reachStart();
    cutin('LAST CHANCE', '天才は、一度では終わらない', 'gold');
    rv.autoT = later(4500, reviveTap);
  }
  function updateRevive(now) {
    if (rv.phase !== 'spin') return;
    if (now - rv.last > 85) { rv.last = now; setReviveWord(1 - rv.word); A.sfx.tick(); }
  }
  function reviveTap() {
    if (S.state !== 'revive' || rv.phase !== 'spin') return;
    cancel(rv.autoT);
    rv.phase = 'slow';
    A.sfx.reachStop();
    vibrate(15);
    const final = rv.result ? 0 : 1;
    const gaps = [130, 170, 230, 310, 420, 580];
    if ((rv.word + gaps.length) % 2 !== final) gaps.push(760);
    let t = 0;
    gaps.forEach((g, k) => {
      t += g;
      later(t, () => {
        setReviveWord(1 - rv.word); A.sfx.tick();
        if (k === gaps.length - 1) later(650, reviveEnd);
      });
    });
  }
  function reviveEnd() {
    retrigger(el.reviveWord, 'fix');
    if (rv.result) {
      S.lives = 1;
      renderLives();
      flash('#fff', 0.9); shake(true); vibrate([60, 40, 200]);
      A.sfx.jackpot(2);
      const s = FX.size();
      FX.rain(70, 1.2); FX.ring(s.W / 2, s.H / 2, 45);
      cutin('復活!!!', '不死鳥の頭脳', 'rainbow');
      later(1500, () => { el.revive.classList.remove('on'); S.state = 'lock'; nextQuestion(); });
    } else {
      A.sfx.wrong();
      later(1000, () => { el.revive.classList.remove('on'); gameOver(); });
    }
  }

  // ---------- リザルト ----------
  function gameOver() {
    S.state = 'over';
    clearAll();
    A.sfx.reachStop();
    endFever();
    A.setMode(0); A.sfx.over();
    const isBest = S.iqL > S.bestL + 1e-9;
    if (isBest) { S.bestL = S.iqL; store.set('gr_best', String(S.iqL)); }
    S.resL = 0; S.resTarget = S.iqL;
    el.resNum.textContent = '0'; el.resUnit.textContent = '';
    el.resNew.classList.toggle('on', isBest);
    el.resRank.innerHTML = `<small>あなたの称号</small>${RANKS[rankIndex(S.iqL)][1]}`;
    el.resStats.innerHTML = [
      ['正解数', S.correct + ' 問'],
      ['最大COMBO', S.maxCombo],
      ['最終倍率', '×' + N.fmt(S.multL)],
      ['頭脳の量', '天才 ' + N.fmt(Math.max(0, S.iqL - Math.log10(150))) + ' 人分'],
      ['人類上位', topPercent(S.iqL)],
      ['自己ベスト', N.fmt(S.bestL)],
    ].map(r => `<li>${r[0]}<b>${r[1]}</b></li>`).join('');
    el.shareBtn.textContent = '結果をシェア';
    el.result.classList.add('on');
    FX.setEnergy(0.5, 280);
    later(1300, () => {
      const s = FX.size();
      FX.rain(isBest ? 140 : 60, 1.6);
      FX.ring(s.W / 2, s.H * 0.3, 45);
      flash('#ffd23f', 0.5);
      A.sfx.jackpot(isBest ? 3 : 1);
      vibrate([40, 30, 120]);
    });
  }

  async function share() {
    const text = `【天才ラッシュ∞】IQ ${N.fmt(S.iqL)}（${RANKS[rankIndex(S.iqL)][1]}）に到達！ #天才ラッシュ`;
    const url = location.origin + location.pathname;
    try {
      if (navigator.share) await navigator.share({ text, url });
      else { await navigator.clipboard.writeText(text + ' ' + url); el.shareBtn.textContent = 'コピーしました'; }
    } catch (e) { /* キャンセル等 */ }
  }

  // ---------- ループ ----------
  let last = performance.now();
  function frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (S.state === 'play') {
      const f = 1 - (now - S.qStart) / 1000 / S.qLimit;
      el.timerBar.style.transform = `scaleX(${Math.max(0, f).toFixed(3)})`;
      el.timer.classList.toggle('danger', f < 0.3);
      if (f <= 0) onMiss(-1);
    }
    rollNumbers(dt);
    if (S.state === 'slot') updateReels(now, dt);
    else if (S.state === 'revive') updateRevive(now);
    FX.update(dt, now);
    requestAnimationFrame(frame);
  }

  // ---------- 入力 ----------
  const press = (node, fn) => node.addEventListener('pointerdown', e => { e.preventDefault(); fn(e); });
  press(el.cA, () => answer(0));
  press(el.cB, () => answer(1));
  press(el.slot, slotTap);
  el.cardBtns.forEach((c, i) => press(c, e => { e.stopPropagation(); pickCard(i); }));
  press(el.cards, () => { if (cards.done) finishCards(); });
  press(el.revive, reviveTap);
  // 音の解錠のため、開始系は click で受ける（iOS対策）
  el.startBtn.addEventListener('click', startGame);
  el.retryBtn.addEventListener('click', () => { if (S.state === 'over') startGame(); });
  el.shareBtn.addEventListener('click', share);
  el.mute.addEventListener('click', () => {
    A.setMuted(!A.isMuted());
    el.mute.classList.toggle('off', A.isMuted());
  });
  el.lowFx.addEventListener('change', () => {
    S.lowFx = el.lowFx.checked;
    store.set('gr_lowfx', S.lowFx ? '1' : '0');
    app.classList.toggle('lowfx', S.lowFx);
    FX.setLow(S.lowFx);
  });

  document.addEventListener('keydown', e => {
    if (e.repeat) return;
    const k = e.key;
    const go = k === ' ' || k === 'Enter' || k === 'ArrowDown';
    if (S.state === 'play') {
      if (k === 'ArrowLeft' || k === 'a' || k === '1') answer(0);
      else if (k === 'ArrowRight' || k === 'd' || k === '2') answer(1);
    } else if (S.state === 'slot' && go) slotTap();
    else if (S.state === 'cards') {
      if (cards.done && go) finishCards();
      else if (k === 'ArrowLeft' || k === '1') pickCard(0);
      else if (go || k === '2') pickCard(1);
      else if (k === 'ArrowRight' || k === '3') pickCard(2);
    } else if (S.state === 'revive' && go) reviveTap();
    else if ((S.state === 'title' || S.state === 'over') && (k === ' ' || k === 'Enter')) startGame();
    if (go || k.startsWith('Arrow')) e.preventDefault();
  });

  // 誤操作（拡大・長押しメニュー）を止める
  document.addEventListener('gesturestart', e => e.preventDefault());
  document.addEventListener('dblclick', e => e.preventDefault());
  document.addEventListener('contextmenu', e => e.preventDefault());

  // 裏に回っていた時間は制限時間に数えない
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = performance.now();
    else if (hiddenAt) { S.qStart += performance.now() - hiddenAt; hiddenAt = 0; last = performance.now(); }
  });

  // ---------- 起動 ----------
  el.mute.classList.toggle('off', A.isMuted());
  el.lowFx.checked = S.lowFx;
  app.classList.toggle('lowfx', S.lowFx);
  FX.setLow(S.lowFx);
  el.bestIq.textContent = S.bestL > 0 ? N.fmt(S.bestL) : '---';
  renderLives(); renderGauge(); paintIQ(true);
  layout();
  window.addEventListener('resize', layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  requestAnimationFrame(frame);

  if (DEBUG) window.GR.debug = { S, slot, startSlot, startCards, startRevive, startFever, gameOver, startBonus };
})();
