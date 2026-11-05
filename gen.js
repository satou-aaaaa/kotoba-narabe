// ことばならべ：ばらばらの字を並べて、言葉を1つ作る。種から問題（言葉と字の並び）を決める。
(function (root) {
  "use strict";
  const W = typeof module !== "undefined" ? require("./words.js") : root.KN_WORDS;
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function seedOf(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  // 難しさ：今日の3問はやさしい・ふつう・むずかしい。上級は7字と8字（ヒントなし）
  const LV = [
    { key: "e", name: "やさしい", len: 4 },
    { key: "n", name: "ふつう", len: 5 },
    { key: "d", name: "むずかしい", len: 6 },
    { key: "h7", name: "上級", len: 7 },
    { key: "h8", name: "上級", len: 8 },
  ];
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  // n 日目の言葉：言葉の並びを周ごとに種で混ぜ、1周するまで同じ言葉は出さない
  const permCache = {};
  function wordOf(lv, n) {
    const P = W[LV[lv].key], len = P.length, cyc = Math.floor(n / len), pos = ((n % len) + len) % len, ck = lv + ":" + cyc;
    if (!permCache[ck]) permCache[ck] = shuffle([...Array(len).keys()], rng(seedOf("kn:" + ck)));
    return permCache[ck][pos];
  }
  // 字の並び：答えと同じ場所にある字は1つまで（同じ字が2つあるときは字で比べる）
  function scramble(r, seed) {
    const R = rng(seed), ch = [...r];
    let best = null, bh = 1e9;
    for (let t = 0; t < 300; t++) {
      const o = shuffle([...ch.keys()], R), hit = o.filter((x, i) => ch[x] === ch[i]).length;
      if (hit < bh) { best = o; bh = hit; }
      if (hit <= (ch.length >= 6 ? 1 : 0)) break;
    }
    return best.map((x) => ch[x]);
  }
  // 問題：{ lv, w:[表記, よみ], tiles:[字…] }
  function make(lv, idx, seed) {
    const w = W[LV[lv].key][idx];
    return w ? { lv, idx, w, tiles: scramble(w[1], seed) } : null;
  }
  const B = { rng, seedOf, LV, W, shuffle, wordOf, scramble, make };
  if (typeof module !== "undefined") module.exports = B; else root.KNR = B;
})(this);
