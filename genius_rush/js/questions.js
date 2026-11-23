// 「誰でも解けるのに超難問っぽく見える」二択の問題ジェネレータ
(() => {
  'use strict';
  const R = n => Math.floor(Math.random() * n);
  const pick = a => a[R(a.length)];
  const range = (lo, hi) => lo + R(hi - lo + 1);

  const TAGS = [
    '【超難問】正答率 0.02%', '【天才認定試験】', '【人類未解決問題】', '【宇宙大学 入試問題】',
    '【IQ300以上 限定】', '【神の領域】', '【世紀の難問】', '【解けたら天才】', '【全知への扉】',
    '【AIも解けなかった】', '【千年に一度の難問】',
  ];

  const numCls = n => { const l = String(n).length; return l >= 5 ? 'xs' : l >= 3 ? 'sm' : ''; };
  const num = n => `<span class="num ${numCls(n)}">${n}</span>`;
  const emo = e => `<span class="emo">${e}</span>`;

  const SENSE = [
    ['速いのはどっち？', '🚀', '🐢'], ['熱いのはどっち？', '🔥', '🧊'], ['大きいのはどっち？', '🐘', '🐜'],
    ['空を飛ぶのはどっち？', '🦅', '🐟'], ['食べ物はどっち？', '🍣', '👟'], ['明るいのはどっち？', '☀️', '🌑'],
    ['重いのはどっち？', '🗻', '🎈'], ['強いのはどっち？', '🦁', '🐹'], ['冷たいのはどっち？', '🍦', '🍜'],
    ['丸いのはどっち？', '⚽', '📦'], ['泳ぐのはどっち？', '🐬', '🐓'], ['甘いのはどっち？', '🍰', '🌶️'],
    ['光るのはどっち？', '💡', '🥔'], ['乗り物はどっち？', '🚗', '🥦'], ['音が鳴るのはどっち？', '🔔', '🧦'],
  ];

  const COLORS = [
    ['赤い', '#ff3344'], ['青い', '#2a7bff'], ['黄色い', '#ffe14a'], ['緑の', '#3be37a'],
  ];

  const DEALS = [
    ['×100', '×2'], ['+100万', '+1'], ['1億円', '1円'], ['×1兆', '×10'], ['金塊', '石ころ'], ['無限', '3'],
  ];

  function numberPair(level) {
    let lo, hi;
    if (level < 2) { lo = 1; hi = 9; }
    else if (level < 4) { lo = 1; hi = 50; }
    else if (level < 7) { lo = 10; hi = 999; }
    else { lo = 1000; hi = 99999; }
    const a = range(lo, hi);
    let b = range(lo, hi);
    while (b === a) b = range(lo, hi);
    return [Math.max(a, b), Math.min(a, b)];
  }

  const MAKERS = {
    big(level) {
      const [hi, lo] = numberPair(level);
      return { text: '大きいのはどっち？', yes: num(hi), no: num(lo) };
    },
    small(level) {
      const [hi, lo] = numberPair(Math.min(level, 5));
      return { text: '<em class="trap">小さい</em>のはどっち？', yes: num(lo), no: num(hi), tag: '【ひっかけ注意】逆だぞ' };
    },
    more(level) {
      const g = pick(['●', '★', '◆', '♥']);
      const a = range(1, 9);
      let b = range(1, 9);
      const minDiff = level < 3 ? 3 : level < 6 ? 2 : 1;
      while (Math.abs(a - b) < minDiff) b = range(1, 9);
      const dots = n => `<span class="dots">${`<i>${g}</i>`.repeat(n)}</span>`;
      return { text: '多いのはどっち？', yes: dots(Math.max(a, b)), no: dots(Math.min(a, b)) };
    },
    calc(level) {
      let a, b, ans, op;
      if (level >= 5 && Math.random() < 0.4) {
        a = range(2, 5); b = range(2, 5); ans = a * b; op = '×';
      } else {
        const hi = level < 3 ? 5 : 9;
        a = range(1, hi); b = range(1, hi); ans = a + b; op = '+';
      }
      let wrong = ans + pick([-2, -1, 1, 2, 3]);
      if (wrong <= 0 || wrong === ans) wrong = ans + 1;
      return { text: `<span class="eq">${a} ${op} ${b} = ?</span>`, yes: num(ans), no: num(wrong) };
    },
    sense() {
      const s = pick(SENSE);
      return { text: s[0], yes: emo(s[1]), no: emo(s[2]) };
    },
    color() {
      const i = R(COLORS.length);
      let j = R(COLORS.length);
      while (j === i) j = R(COLORS.length);
      const sw = c => `<span class="swatch" style="background:${c};color:${c}"></span>`;
      return { text: `<em style="color:${COLORS[i][1]}">${COLORS[i][0]}</em>のはどっち？`, yes: sw(COLORS[i][1]), no: sw(COLORS[j][1]) };
    },
    deal() {
      const d = pick(DEALS);
      const h = s => `<span class="deal ${s.length >= 5 ? 'sm' : ''}">${s}</span>`;
      return { text: 'お得なのはどっち？', yes: h(d[0]), no: h(d[1]) };
    },
  };

  function next(level, lastType) {
    const pool = [['big', 3], ['more', 2], ['sense', 2.4], ['color', 1.5], ['deal', 1]];
    if (level >= 1) pool.push(['calc', 2]);
    if (level >= 3) pool.push(['small', 1.3]);
    const cand = pool.filter(p => p[0] !== lastType);
    let r = Math.random() * cand.reduce((s, p) => s + p[1], 0);
    let type = cand[0][0];
    for (const p of cand) { r -= p[1]; if (r <= 0) { type = p[0]; break; } }
    const m = MAKERS[type](level);
    const correct = R(2);
    return {
      type,
      tag: m.tag || pick(TAGS),
      text: m.text,
      a: correct === 0 ? m.yes : m.no,
      b: correct === 1 ? m.yes : m.no,
      correct,
    };
  }

  window.GR = window.GR || {};
  window.GR.Questions = { next };
})();
