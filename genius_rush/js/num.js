// 巨大数ユーティリティ。値はすべて log10 で持つので、無量大数を超えても壊れない。
(() => {
  'use strict';
  const UNITS = ['', '万', '億', '兆', '京', '垓', '秭', '穣', '溝', '澗', '正', '載', '極',
    '恒河沙', '阿僧祇', '那由他', '不可思議', '無量大数'];
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const sup = n => String(n).split('').map(c => SUP[+c]).join('');

  // L = log10(値) → { num: '12.3', unit: '億' }
  function parts(L) {
    if (!isFinite(L) || L < 0) L = 0;
    if (L < 4) {
      return { num: Math.floor(Math.pow(10, L) + 1e-6).toLocaleString('en-US'), unit: '' };
    }
    // 無量大数(10^68)を超えたら「◯◯無量大数」「◯◯無量大数²」…と積み上げる
    let depth = 0;
    while (L >= 72) { L -= 68; depth++; }
    const i = Math.min(17, Math.floor(L / 4 + 1e-9));
    const m = Math.pow(10, L - 4 * i) * (1 + 1e-9);
    let num;
    if (m < 10) num = (Math.floor(m * 100) / 100).toFixed(2);
    else if (m < 100) num = (Math.floor(m * 10) / 10).toFixed(1);
    else num = String(Math.floor(m));
    let unit = UNITS[i];
    if (depth > 0) unit += '無量大数' + (depth > 1 ? sup(depth) : '');
    return { num, unit };
  }

  function fmt(L) {
    const p = parts(L);
    return p.num + p.unit;
  }

  // log10(10^a + 10^b)
  function add(a, b) {
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (hi - lo > 15) return hi;
    return hi + Math.log10(1 + Math.pow(10, lo - hi));
  }

  window.GR = window.GR || {};
  window.GR.Num = { parts, fmt, add };
})();
