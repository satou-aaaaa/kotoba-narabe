// ことばならべ：ばらばらの字を並べて、言葉を1つ作る。種から問題（言葉と字の並び）を決める。
(function (root) {
  "use strict";
  const W = typeof module !== "undefined" ? require("./words.js") : root.KN_WORDS;
  const NG = typeof module !== "undefined" ? require("./gender-ng.js") : root.KN_GENDER_NG;
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
  // 性別に寄った言葉（gender-ng.js）は、区切りの日 CUTOFF（日本時間）からの問題・練習で選ばない。
  // 区切りの日より前の日は wordOf のまま（過去の日の問題を変えない）。データ（words.js）には残す。
  const CUTOFF = "2026-11-07";
  const isNG = (w) => NG.some((g) => w[0].includes(g) || w[1].includes(g));
  const okCache = {};
  // 選んでよい言葉の番号（練習はこの中から選ぶ）
  function okIdx(lv) { const k = LV[lv].key; return okCache[k] || (okCache[k] = W[k].map((w, i) => (isNG(w) ? -1 : i)).filter((i) => i >= 0)); }
  const okPerm = {};
  function okPermOf(lv, cyc) { const ck = lv + ":" + cyc; if (!okPerm[ck]) { wordOf(lv, cyc * W[LV[lv].key].length); okPerm[ck] = permCache[ck].filter((i) => !isNG(W[LV[lv].key][i])); } return okPerm[ck]; }
  // n 日目（0から）の言葉。c は区切りの日の番号（0から）。c より前は wordOf のまま。
  // c からは、各周の並び（wordOf と同じ種）から外す言葉を抜いた並びを、c 日目の位置から続けて使う（1周するまで同じ言葉は出ない）。
  function dayWord(lv, n, c) {
    if (n < c) return wordOf(lv, n);
    const len = W[LV[lv].key].length, L = okIdx(lv).length;
    const c0 = Math.floor(c / len), p0 = ((c % len) + len) % len;
    wordOf(lv, c); // c の周の並びを作っておく
    const used = permCache[lv + ":" + c0].slice(0, p0).filter((i) => !isNG(W[LV[lv].key][i])).length;
    const t = c0 * L + used + (n - c);
    return okPermOf(lv, Math.floor(t / L))[t % L];
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
  const B = { rng, seedOf, LV, W, NG, CUTOFF, isNG, okIdx, dayWord, shuffle, wordOf, scramble, make };
  if (typeof module !== "undefined") module.exports = B; else root.KNR = B;
})(this);
