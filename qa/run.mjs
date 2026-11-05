// ことばならべの検査。言葉のデータ（答えが1つかを JMdict の全部の読みで数え直す）・字の並び（全部の言葉×何十通り）・3問の組み方（3年分）・並べる/戻す/答える/ヒント・続きから・上級・言葉帳・記録・スマホ幅・PWA。
// 使い方: node qa/run.mjs   失敗があれば終了コード 1。結果は qa-report/report.md。
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = pathToFileURL(path.join(root, "index.html")).href;
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok: !!ok, detail });
const T = createRequire(import.meta.url)(path.join(root, "gen.js"));
const W = T.W, key = (r) => [...r].sort().join("");

// 1. 言葉のデータ
{
  const lens = { e: 4, n: 5, d: 6, h7: 7, h8: 8 }, bad = [];
  for (const k in lens) for (const w of W[k]) if (!new RegExp(`^[ぁ-ゖ]{${lens[k]}}$`).test(w[1]) || /[死殺葬屍呪遺棺骸刑獄墓弔喪病癌毒虐暴拷凶犯罪賊奴隷戦爆銃]/.test(w[0]) || new Set(w[1]).size < 3 || /[0-9０-９]/.test(w[0])) bad.push(w.join("/"));
  check("言葉はひらがなのよみで字の数どおり（4・5・6・7・8字）・同じ字だけの言葉や数字・つらい言葉を入れない", bad.length === 0 && W.e.length > 700 && W.n.length > 700 && W.d.length > 400 && W.h7.length > 250 && W.h8.length > 120, bad.slice(0, 3).join(","));
  const all = Object.values(W).flat();
  check("同じ言葉（よみ）は1回だけ", new Set(all.map((w) => w[1])).size === all.length);
  // 別の数え方：JMdict の4〜8字のすべての読み（tools/kana.txt）で、同じ字の組み合わせの読みを数える
  const kana = readFileSync(path.join(root, "tools/kana.txt"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")), by = new Map();
  for (const r of kana) { const k = key(r); if (!by.has(k)) by.set(k, new Set()); by.get(k).add(r); }
  const multi = all.filter((w) => { const s = by.get(key(w[1])); return !s || s.size !== 1 || !s.has(w[1]); });
  check("答えは1つ：同じ字の組み合わせで書ける読みが、JMdict のほかの言葉に無い（全部の言葉を数え直す）", kana.length > 100000 && multi.length === 0, multi.slice(0, 3).map((w) => w[1] + ":" + [...(by.get(key(w[1])) || [])].join("/")).join(","));
}
// 2. 字の並びと日ごとの言葉（ブラウザを使わない）
{
  const bad = [], same = [];
  T.LV.forEach((L, lv) => W[L.key].forEach((w, idx) => { for (let s = 0; s < 20; s++) { const p = T.make(lv, idx, T.seedOf(w[1] + s)), q = T.make(lv, idx, T.seedOf(w[1] + s)); const hit = p.tiles.filter((ch, i) => ch === w[1][i]).length; if (key(p.tiles.join("")) !== key(w[1]) || p.tiles.join("") === w[1] || hit > (w[1].length >= 6 ? 1 : 0) && !(new Set(w[1]).size < w[1].length && hit <= 2)) bad.push(`${w[1]}:${p.tiles.join("")}`); if (JSON.stringify(p) !== JSON.stringify(q)) same.push(w[1]); } }));
  check("字の並びは答えと同じ字・答えのままにならない・答えと同じ場所の字は5字までは0、6字からは1つまで（全部の言葉×20通り）", bad.length === 0, bad.slice(0, 3).join(","));
  check("同じ種からは同じ並びになる（だれでも同じ問題）", same.length === 0, same.slice(0, 3).join(","));
  const rep = [];
  T.LV.forEach((L, lv) => { const n = W[L.key].length, seen = new Set(); for (let d = 0; d < n; d++) seen.add(T.wordOf(lv, d)); if (seen.size !== n) rep.push(L.key); const s2 = new Set(); for (let d = n; d < 2 * n; d++) s2.add(T.wordOf(lv, d)); if (s2.size !== n) rep.push(L.key + "2"); });
  check("1周するまで同じ言葉は出ない（どの難しさも2周分）", rep.length === 0, rep.join(","));
}

const html = readFileSync(path.join(root, "index.html"), "utf8");
check("終えた回を消すのは同じ回のときだけ・0時を過ぎたホームの「今日」のボタンは描き直す（2026-11-04 CodeRabbit）", /c\.date === run\.date && c\.id === run\.id\) s2\.runs\[MODE\] = null/.test(html) && /\$\("go-d"\)\.onclick = \(\) => \(k !== todayKey\(\) \? home\(\)/.test(html));
check("別のタブで今日の分を終えたあと、古い画面から今日・上級をもう一度始めない（2026-11-04 CodeRabbit）", /\(mode === "d" && s\.days\[k\]\) \|\| \(mode === "h" && s\.hdays\[k\]\)\) return;/.test(html));
check("README の URL のすぐ後ろに全角の字を続けない（Link check が URL の一部と読む。2026-11-04）", !/https?:\/\/[\x21-\x7e]*[^\x00-\x7f]/.test(readFileSync(new URL("../README.md", import.meta.url), "utf8").replace(/\]\(https?:\/\/[^)\s]+\)/g, "").replace(/<https?:\/\/[^>\s]+>/g, "")));
check("別のタブで先に進んだ並べ方を、古いタブの並べ方で上書きしない（2026-11-04 CodeRabbit）", /r\.cur\.i === cur\.i && r\.cur\.moves > cur\.moves\)\) r\.cur =/.test(html));
{ // ひな形を写したリポジトリで、README・AGENTS.md に前のゲームの名前や URL が残らない（2026-11-05 CodeRabbit）
  const docs = ["README.md", "AGENTS.md", "manifest.webmanifest", "sw.js"].map((f) => [f, readFileSync(path.join(root, f), "utf8")]);
  const left = docs.filter(([, t]) => /しりとり|shiritori|github\.io\/(?!kotoba-narabe\/)[a-z0-9-]+\//.test(t)).map(([f]) => f);
  check("README・AGENTS.md・manifest・sw.js はこのゲームの名前と URL だけ（写し元のゲームが残らない）", left.length === 0 && /^# ことばならべ/.test(docs[0][1]) && /satou-aaaaa\.github\.io\/kotoba-narabe\//.test(docs[0][1]), left.join(",")); }
check("JMdict の出どころ（CC BY-SA 4.0）を遊び方と README に書く", /JMdict（© EDRDG、CC BY-SA 4\.0）/.test(html) && /CC BY-SA 4\.0/.test(readFileSync(path.join(root, "README.md"), "utf8")));
const ext = [...html.matchAll(/(?:src|href)="(https?:[^"]+)"/g)].map((m) => m[1]).filter((u) => !/^https:\/\/fonts\.googleapis\.com(\/|$)|^https:\/\/ko-fi\.com\/satouaaaaa$/.test(u));
check("外から読むのは文字（Google Fonts）だけ。スクリプト・広告・解析を入れない", ext.length === 0, ext.join(","));
check("CSP で通信先を自分だけにしている", /connect-src 'self'/.test(html) && !/connect-src[^;"]*https/.test(html));
check("Math.random は練習の問題選びだけ（今日の3問・上級は日付の種）", (html.match(/Math\.random/g) || []).length === 2 && /mode === "h" \? hardList\(k\) : \[\{ lv: opt, idx: Math\.floor\(Math\.random\(\)/.test(html) && !/Math\.random/.test(readFileSync(path.join(root, "gen.js"), "utf8")));
check("画面にお笑いの言葉を入れない（本物っぽく）", !/お笑い|ギャグ|ボケ|ツッコミ|なんでやねん|（うそ）/.test(html));
{ const og = (k) => (html.match(new RegExp(`<meta (?:property|name)="${k}" content="([^"]+)"`)) || [])[1] || "";
  const png = readFileSync(path.join(root, "og.png"));
  check("SNS で貼ると絵と題が出る（OGP・1200×630・絶対URL）", og("og:title") && og("og:description") && og("og:image") === "https://satou-aaaaa.github.io/kotoba-narabe/og.png" && og("twitter:card") === "summary_large_image" && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630); }
{ const fy = readFileSync(path.join(root, ".github/ISSUE_TEMPLATE/feedback.yml"), "utf8");
  check("感想フォームは名前・メールを聞かない（楽しさ・よかった所・直してほしい所だけ）・フォーム名は4字以上（3字以下だと GitHub がフォームを出さない。2026-11-05 CodeRabbit）", [...((fy.match(/^name: (.+)$/m) || [])[1] || "")].length > 3 && /id: fun/.test(fy) && /id: good/.test(fy) && /id: fix/.test(fy) && !/id: (name|email|mail)/.test(fy)); }
{ const sw = readFileSync(path.join(root, "sw.js"), "utf8"), mf = JSON.parse(readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  const shell = JSON.parse(sw.match(/SHELL = (\[[^\]]+\])/)[1].replace(/'/g, '"'));
  const need = ["./index.html", "./gen.js", "./words.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
  check("PWA：ネットの返事の保存は、イベントの中で waitUntil に預ける（遅れて届いた新しい版も保存できる）", /e\.waitUntil\(Promise\.race\(\[net\.then[^\n]*wait\(15000\)[^\n]*wait\(60000\)\]\)\)/.test(sw));
  check("PWA：sw.js は画面のファイルを全部保存し、外へ何も送らない", need.every((f) => shell.includes(f)) && !/https?:\/\//.test(sw.replace(/^\/\/.*$/gm, "")));
  check("PWA：manifest にアイコン2つと名前がある", mf.name === "ことばならべ" && mf.icons.length >= 2 && mf.start_url === "./"); }
{ const src = html + readFileSync(path.join(root, "gen.js"), "utf8");
  const bad = src.match(/\.sort\(\s*\([^)]*\)\s*=>[^\n;]*\b(R|rng|rand|Math\.random)\s*\(/g) || [];
  check("並べ替えの比較の中で乱数を引いていない（同じ日に人によって問題が変わらない）", bad.length === 0, bad.join(" | ")); }

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const isNoise = (t) => /fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED|net::ERR_/.test(t);
const errors = [];
const FIXED = new Date(new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10) + "T03:00:00Z");
async function newPage(w = 390, h = 844) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on("pageerror", (e) => errors.push(e.stack));
  page.on("console", (m) => { if (m.type() === "error" && !isNoise(m.text())) errors.push(m.text()); });
  await page.clock.setFixedTime(FIXED); // 時計を今日の昼（日本時間）に止める。QA の途中で0時をまたいでも「今日」が変わらない（2026-11-05 CodeRabbit）
  await page.goto(url);
  await page.evaluate(() => localStorage.clear()); await page.reload();
  return page;
}
const curT = (page) => page.evaluate(() => { const c = window.__kn.cur(); return { p: c.p, ans: c.ans, slots: c.slots.slice(), lock: c.lock.slice(), miss: c.miss, hints: c.hints, kan: c.kan, moves: c.moves, done: c.done, hard: c.hard }; });
// 残りのますを答えの字で埋めて答える
async function solveNow(page) {
  if (await page.locator("#clear:not([disabled])").count()) await page.click("#clear");
  const c = await curT(page), used = new Set(c.slots.filter((t) => t !== null));
  for (let j = 0; j < c.ans.length; j++) { if (c.slots[j] !== null) continue; const t = c.p.tiles.findIndex((ch, x) => ch === c.ans[j] && !used.has(x)); used.add(t); await page.click(`#tiles button[data-t="${t}"]`); }
  await page.click("#answer");
}
const KEY = "kotoba-narabe-v1";
try {
  const page = await newPage();
  // 3. 3問の組み方（日付の種）
  const sel = await page.evaluate(() => {
    const g = window.__kn, out = { bad: [], same: 0, dup: 0 };
    let prev = null;
    for (let n = 0; n < 365 * 3; n++) {
      const k = new Date(Date.parse("2026-11-05") + n * 864e5).toISOString().slice(0, 10);
      const d = g.dailyList(k).map(g.probOf), h = g.hardList(k).map(g.probOf);
      if (d.map((p) => p.tiles.length).join() !== "4,5,6" || h.map((p) => p.tiles.length).join() !== "7,8" || d.some((p) => !p)) out.bad.push(k);
      const sig = JSON.stringify(d.map((p) => p.w[1]));
      if (sig === prev) out.same++; prev = sig;
    }
    out.d1201 = JSON.stringify(g.dailyList("2026-12-01").map(g.probOf));
    // 1日目から1周のあいだ、どの難しさも同じ言葉が出ない（1日目は周の最初の言葉）
    out.cycle = [0, 1, 2, 3, 4].filter((lv) => { const n = g.T.W[g.T.LV[lv].key].length, s = new Set(); for (let d = 0; d < n; d++) { const k = new Date(Date.parse("2026-11-05") + d * 864e5).toISOString().slice(0, 10); s.add((lv < 3 ? g.dailyList(k)[lv] : g.hardList(k)[lv - 3]).idx); } return s.size !== n || (lv < 3 ? g.dailyList("2026-11-05")[lv] : g.hardList("2026-11-05")[lv - 3]).idx !== g.T.wordOf(lv, 0); });
    return out;
  });
  check("今日の3問は毎日4字・5字・6字、上級は7字と8字（3年分）", sel.bad.length === 0, sel.bad.slice(0, 3).join(","));
  check("前の日と同じ言葉にならない（3年分）", sel.same === 0);
  check("1日目から1周のあいだ、どの難しさも同じ言葉が出ない（1日目は周の最初の言葉。2026-11-05 CodeRabbit）", sel.cycle.length === 0, sel.cycle.join(","));
  { const ctx = await browser.newContext(); const p2 = await ctx.newPage(); await p2.goto(url);
    const d2 = await p2.evaluate(() => { const g = window.__kn; return JSON.stringify(g.dailyList("2026-12-01").map(g.probOf)); });
    await ctx.close();
    check("同じ日は別のブラウザで開いても同じ3問", sel.d1201 === d2); }

  // 4. 通しで遊ぶ
  check("初めて開くと遊び方が出る", await page.locator("#howto[open]").count() === 1);
  await page.click("#howto-ok");
  await page.click("#go-d");
  let c = await curT(page);
  check("1問目は4字：空きのます4つと字の札4枚が並び、答えるボタンは押せない", (await page.locator("#slots button").count()) === 4 && (await page.locator("#tiles button").count()) === 4 && (await page.locator("#answer[disabled]").count()) === 1 && (await page.textContent(".ask")).includes("4字"));
  await page.click('#tiles button[data-t="0"]');
  let n1 = await curT(page);
  check("札を押すと左のますに入り、その札は隠れる", n1.slots[0] === 0 && (await page.locator('#tiles button[data-t="0"].used').count()) === 1 && (await page.textContent("#slots")).includes(c.p.tiles[0]));
  await page.click('#slots button[data-j="0"]');
  n1 = await curT(page);
  check("ますの字を押すと札に戻る", n1.slots.every((t) => t === null) && (await page.locator("#tiles button.used").count()) === 0);
  // 出てきた並びのまま答える（答えとちがう並び）
  for (let t = 0; t < 4; t++) await page.click(`#tiles button[data-t="${t}"]`);
  await page.click("#answer");
  n1 = await curT(page);
  const hit = c.p.tiles.filter((ch, j) => ch === c.ans[j]).length;
  check("ちがう並びで答えると、まちがい1回・場所が合った字だけ緑で残り、ほかは札に戻る", !n1.done && n1.miss === 1 && n1.lock.filter(Boolean).length === hit && n1.slots.filter((t) => t !== null).length === hit && (await page.locator("#slots button.lock").count()) === hit && (await page.textContent("#left")).includes("まちがい 1"));
  await page.click("#hint");
  n1 = await curT(page);
  const j0 = c.p.tiles.map((ch, j) => ch === c.ans[j]).indexOf(false);
  check("ヒント1回目で、左から1字が正しい場所に緑で置かれる", n1.hints === 1 && n1.lock[j0] === true && c.p.tiles[n1.slots[j0]] === c.ans[j0]);
  await page.click("#hint");
  n1 = await curT(page);
  check("ヒント2回目で漢字の書き方が出て、ヒントはもう押せない", n1.hints === 2 && n1.kan && (await page.textContent("#kan")).includes(c.p.w[0]) && (await page.locator("#hint[disabled]").count()) === 1);
  await page.reload(); await page.click("#go-d");
  n1 = await curT(page);
  check("途中で閉じても、緑の字・まちがい・ヒントはそのまま（続きから）", n1.miss === 1 && n1.hints === 2 && n1.kan && n1.lock[j0] && (await page.textContent("#left")).includes("ヒント 2"));
  await page.click("#back"); await page.click("#go-p"); await page.locator(".lv button").first().click(); await page.click("#back"); await page.click("#go-d");
  check("練習を始めても、今日の途中経過は消えない", (await curT(page)).miss === 1 && (await page.evaluate(() => window.__kn.mode())) === "d");
  await solveNow(page);
  n1 = await curT(page);
  check("答えの並びで答えるとできあがり、まちがい1＋ヒント2で★1、よみと漢字が出る", n1.done && (await page.locator(".verdict .stars .off").textContent()).length === 2 && (await page.textContent("#kan")).includes(c.p.w[1]) && (await page.locator("#slots.win").count()) === 1);
  await page.click("#next");
  // 別のタブで先に進んでいたら、古い画面の答えは足さない
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.push({ m: 0, h: 0 }); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await solveNow(page);
  check("別のタブで先に進んでいたら、古い画面の答えは足さず今の問題を出し直す", (await page.evaluate(() => window.__kn.load().runs.d.res.length)) === 2 && (await page.textContent("header")).includes("3/3"));
  await page.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.res.pop(); localStorage.setItem(k, JSON.stringify(s)); }, KEY);
  await page.reload(); await page.click("#go-d");
  for (let j = 0; j < 2; j++) { await solveNow(page); await page.click("#next"); }
  const share = await page.textContent(".share");
  const r3 = await page.evaluate(() => { const g = window.__kn; return g.load().days[g.todayKey()].r; });
  const words = await page.evaluate(() => { const g = window.__kn; return g.dailyList(g.todayKey()).map(g.probOf).flatMap((p) => p.w); });
  check("3問で結果・シェアの文は番号と色だけ（言葉を出さない）", /ことばならべ #\d+/.test(share) && /^💡🟩🟩/.test(share.split("\n")[1] || "") && r3.length === 3 && !words.some((w) => share.includes(w)));
  check("X・LINE は押したときに開くリンクだけ", /^https:\/\/twitter\.com\/intent\/tweet\?text=/.test(await page.getAttribute("#toX", "href")) && /^https:\/\/line\.me\/R\/share\?text=/.test(await page.getAttribute("#toLine", "href")));
  check("結果に3問の言葉とまちがいの数が出る", (await page.locator(".res div").count()) === 3 && (await page.textContent(".res")).includes(c.p.w[0]));
  check("ヒントを使った日は Ko-fi のひとことを出さない", (await page.locator(".kofi").count()) === 0);
  check("今日の3問を終えると、取れた実績が結果に出る", (await page.textContent(".newach")).includes("はじめの一語"));
  await page.click("#back");
  check("ホームで連続1日・今日の結果を見るに変わる・作った言葉3", (await page.textContent(".stats")).includes("1連続の日") && (await page.textContent(".stats")).includes("3作った言葉") && (await page.textContent("#go-d")).includes("結果"));
  // 上級
  await page.click("#go-h");
  check("上級は7字の札が7枚・ヒントのボタンが無い", (await page.locator("#tiles button").count()) === 7 && (await page.locator("#hint").count()) === 0);
  await solveNow(page); await page.click("#next");
  check("上級の2問目は8字", (await page.locator("#tiles button").count()) === 8);
  await solveNow(page); await page.click("#next");
  check("上級を全部一発で初めて終えると、結果に Ko-fi のひとことが1行", (await page.locator(".kofi").count()) === 1 && (await page.textContent(".big")).includes("一発"));
  check("上級の8字を一発で終えると、実績「上級に挑む」「八字を一発」が出る", /上級に挑む/.test(await page.textContent(".newach")) && /八字を一発/.test(await page.textContent(".newach")));
  await page.click("#back"); await page.click("#go-h");
  check("2回目に結果を開いても Ko-fi のひとことは出ない", (await page.locator(".kofi").count()) === 0);
  await page.click("#back");
  // 練習：記録の日を増やさず、言葉帳には載る（練習の言葉は乱数なので、今日の言葉と同じでも数が合うように数える）
  await page.click("#go-p"); await page.locator(".lv button").nth(1).click();
  const pw = (await curT(page)).p.w[1], seen0 = await page.evaluate(() => Object.keys(window.__kn.load().seen));
  const expSeen = seen0.length + (seen0.includes(pw) ? 0 : 1);
  await solveNow(page); await page.click("#next");
  const after = await page.evaluate(() => { const s = window.__kn.load(); return { days: Object.keys(s.days).length, words: s.words, seen: Object.keys(s.seen).length }; });
  check("練習は今日の記録を増やさず、作った言葉と言葉帳には入る", after.days === 1 && after.words === 6 && after.seen === expSeen && (await page.locator(".share").count()) === 0);
  await page.click("#back"); await page.click("#go-ach");
  { const got = await page.locator(".achs div.got").count(), txt = await page.textContent(".achs");
    check("実績の画面：取れたものは★、まだのものは進み具合（一発の数は今日・上級だけで練習を数えない）", got >= 3 && txt.includes("4/10") && txt.includes(`${expSeen}/50`), `${got} ${txt.slice(0, 80)}`); }
  check("続けて遊んだ日の最長は、日付が1日ずつ続くところだけ数える", await page.evaluate(() => window.__kn.maxStreak({ "2026-01-01": 1, "2026-01-02": 1, "2026-01-04": 1, "2026-01-05": 1, "2026-01-06": 1 }) === 3 && window.__kn.maxStreak({}) === 0));
  await page.click("#back"); await page.click("#go-dex");
  check("言葉帳に作った言葉と字の数ごとの数が出る", (await page.locator(".dex div").count()) === expSeen && (await page.textContent(".dex")).includes(c.p.w[0]) && (await page.textContent("h1")).includes(`${expSeen}語`));
  await page.close();

  // 5. スマホ幅：はみ出さない・押せる所は44px以上・8字でもますは1行
  for (const w of [320, 390]) {
    const p3 = await newPage(w, 700); const fb2 = await p3.evaluate(() => { const a = document.querySelector("#howto #fb2"); return a ? a.getBoundingClientRect().height : 0; }); check(`幅${w}px：遊び方の「感想を送る」も高さ44px以上`, fb2 >= 44, `${fb2}px`); await p3.click("#howto-ok");
    const homeOk = await p3.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    await p3.click("#go-d");
    const r = await p3.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll("button, a")].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.id || e.textContent.trim().slice(0, 6)) }));
    check(`幅${w}px：横にはみ出さず、押せる所は高さ44px以上`, homeOk && !r.over && r.small.length === 0, r.small.join(","));
    await p3.click("#back"); await p3.click("#go-p"); await p3.click('.lv button[data-lv="4"]');
    const r8 = await p3.evaluate(() => { const s = [...document.querySelectorAll("#slots button")], t = [...document.querySelectorAll("#tiles button")]; return { rows: new Set(s.map((e) => e.offsetTop)).size, trows: new Set(t.map((e) => e.offsetTop)).size, minH: Math.min(...s.concat(t).map((e) => e.getBoundingClientRect().height)), minW: Math.min(...s.map((e) => e.getBoundingClientRect().width)), over: document.documentElement.scrollWidth > innerWidth }; });
    check(`幅${w}px：8字でもますと札はそれぞれ1行・高さ44px以上・はみ出さない`, r8.rows === 1 && r8.trows === 1 && r8.minH >= 44 && r8.minW >= 30 && !r8.over, JSON.stringify(r8));
    await p3.close();
  }
  { // 保存してあった並べ方が壊れていたら使わない
    const pv = await newPage(); await pv.click("#howto-ok");
    const broken = await pv.evaluate((k) => { const g = window.__kn, d = g.todayKey(), list = g.dailyList(d), p = g.probOf(list[0]), ans = [...p.w[1]]; const wrongT = p.tiles.findIndex((ch) => ch !== ans[0]); const cases = [{ slots: [wrongT, null, null, null], lock: [true, false, false, false] }, { slots: [0, 0, null, null], lock: [false, false, false, false] }, { slots: [9, null, null, null], lock: [false, false, false, false] }, { slots: "x", lock: [] }]; const out = []; for (const cc of cases) out.push(g.valid(p, Object.assign({ miss: 0, hints: 0, moves: 1, kan: false }, cc))); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, words: 0, kofi: {}, runs: { d: { mode: "d", date: d, list, res: [], cur: Object.assign({ i: 0, miss: 1, hints: 0, moves: 3, kan: false }, cases[0]), id: "a" } } })); return out; }, KEY);
    await pv.reload(); await pv.click("#go-d");
    check("壊れた途中経過（ちがう字が緑・同じ札が2回・ない札・形がちがう）は使わず、はじめから", broken.every((x) => x === false) && (await curT(pv)).slots.every((t) => t === null) && (await curT(pv)).miss === 0, JSON.stringify(broken));
    await pv.close(); }
  { // 別のタブで同じ問題のまちがいが多く保存されていたら、古いタブで答えても多いほうを記録する
    const pz = await newPage(); await pz.click("#howto-ok"); await pz.click("#go-d");
    await pz.evaluate((k) => { const s = JSON.parse(localStorage.getItem(k)); s.runs.d.cur = { i: 0, slots: [null, null, null, null], lock: [false, false, false, false], miss: 3, hints: 1, kan: false, moves: 999 }; localStorage.setItem(k, JSON.stringify(s)); }, KEY);
    await solveNow(pz);
    const rz = await pz.evaluate(() => window.__kn.load().runs.d.res[0]);
    check("別のタブで保存したまちがい・ヒントの数を、古いタブで答えても消さない（★を増やさない。2026-11-05 CodeRabbit）", rz && rz.m === 3 && rz.h === 1 && (await pz.locator(".verdict .stars .off").textContent()).length === 2, JSON.stringify(rz));
    await pz.close(); }
  { // 保存できないブラウザでも遊べる
    const pb = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pb.on("pageerror", (e) => errors.push(e.message));
    await pb.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("blocked"); }; });
    await pb.goto(url); await pb.click("#howto-ok"); await pb.click("#go-d");
    await pb.click('#tiles button[data-t="0"]');
    check("保存できないブラウザでも、今日の1問目で進める", (await pb.textContent("header")).includes("1/3") && (await curT(pb)).slots[0] === 0);
    await solveNow(pb);
    check("保存できないブラウザでも、1問目を作れる", (await curT(pb)).done);
    await pb.click("#back");
    check("保存できないブラウザでも、遊び方が何度も開かない", !(await pb.locator("#howto[open]").count()));
    await pb.close(); }
  { // 前の記録が残っていて、書き込みだけ失敗するとき
    const pq = await browser.newPage({ viewport: { width: 390, height: 844 } });
    pq.on("pageerror", (e) => errors.push(e.message));
    await pq.addInitScript(() => { const orig = Storage.prototype.setItem; orig.call(localStorage, "kotoba-narabe-v1", JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, words: 0, kofi: {}, runs: {} })); Storage.prototype.setItem = () => { throw new Error("full"); }; });
    await pq.goto(url); await pq.click("#go-d");
    check("前の記録があり書き込みだけ失敗しても、今日の1問目が始まる", (await pq.textContent("header")).includes("1/3"));
    await pq.close(); }
  { const pc = await newPage();
    await pc.evaluate((k) => { const g = window.__kn, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, words: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ m: 0, h: 0 })), id: "a" } } })); }, KEY);
    await pc.reload();
    check("最後の1問のあと閉じても、開き直すと結果へ進み今日の記録がつく", await pc.evaluate(() => { const g = window.__kn; return !!g.load().days[g.todayKey()] && !g.load().runs.d; }));
    await pc.close(); }
  { const pm = await newPage();
    await pm.evaluate((k) => { const g = window.__kn, d = g.todayKey(); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, words: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ m: 0, h: 0 })), id: "a" } } })); }, KEY);
    await pm.reload();
    const had = await pm.locator("#go-h").count();
    await pm.evaluate(() => { const RD = Date, off = 864e5; window.Date = class extends RD { constructor(...a) { if (a.length) super(...a); else super(RD.now() + off); } static now() { return RD.now() + off; } }; });
    if (had) await pm.click("#go-h");
    check("結果を開いたまま日付が変わったら、上級のボタンを押しても翌日の上級は始まらない", had > 0 && (await pm.evaluate(() => window.__kn.mode())) !== "h");
    await pm.close(); }
  { const pn = await newPage();
    await pn.evaluate((k) => { const g = window.__kn, d = new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10); localStorage.setItem(k, JSON.stringify({ v: 1, tut: true, days: {}, hdays: {}, seen: {}, words: 0, kofi: {}, runs: { d: { mode: "d", date: d, list: g.dailyList(d), res: [0, 1, 2].map(() => ({ m: 0, h: 0 })), id: "a" } } })); }, KEY);
    await pn.reload();
    check("前の日に終えて閉じても、翌日に開くとその日の記録がつく", await pn.evaluate(() => { const g = window.__kn; return !!g.load().days[new Date(Date.parse(g.todayKey()) - 864e5).toISOString().slice(0, 10)] && !g.load().runs.d; }));
    check("前の日の結果の画面からは、今日の上級を始められない（今日の分を先に）", !(await pn.locator("#go-h").count()));
    check("保存に失敗したあと別のタブが新しく保存していたら、古いメモリで上書きせずそちらを読む", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 1, tagA: 1 })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 2, tagB: 1 }))); const r = g.load(); mem = null; return !!r.tagB && !r.tagA; }, KEY));
    check("保存に失敗したあと別のタブが保存しても、両方の記録（日ごとの結果）を残し、言葉帳の数は多いほう", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(); mem = JSON.stringify(Object.assign({}, s0, { t: 5, days: { "2000-01-01": 1 }, seen: { ねこ: 9 } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, days: { "2000-01-02": 1 }, seen: { ねこ: 2 } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && !!r.days["2000-01-02"] && r.seen["ねこ"] === 9; }, KEY));
    check("保存に失敗したタブの時刻が進んでいても、別のタブで先に進んだ途中経過を古いメモリで戻さない", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [{ seed: 1, lv: 0, idx: 0 }], id: "x", res: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 99, runs: { d: Object.assign({}, base) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 1, runs: { d: Object.assign({}, base, { res: [{ m: 0, h: 0 }] }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("保存に失敗したタブにだけある途中経過は、別のタブが保存しても消さない（その日を終えた記録があれば null を使う・終えた回は日ごとの結果に残す）", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (a, b, dd) => { mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: a })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: b }, dd ? { days: Object.assign({}, s0.days, dd) } : {}))); const r = g.load(); mem = null; return r; }; const r1 = put({ d: base }, {}), r2 = put({ d: base }, { d: null }, { "2000-01-01": 1 }), r3 = put({ d: base }, { d: null }), r4 = put({ d: done }, { d: null }); return !!r1.runs.d && r1.runs.d.date === "2000-01-01" && r2.runs.d === null && !!r3.runs.d && r3.runs.d.date === "2000-01-01" && r4.runs.d === null && !!r4.days["2000-01-01"]; }, KEY));
    check("同じ進み具合なら、新しく保存したほうの途中経過を使う", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); const put = (ta, tb) => { mem = JSON.stringify(Object.assign({}, s0, { t: ta, runs: { d: Object.assign({}, base, { zz: "a" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: tb, runs: { d: Object.assign({}, base, { zz: "b" }) } }))); const r = g.load(); mem = null; return r.runs.d.zz; }; return put(9, 5) === "a" && put(5, 9) === "b"; }, KEY));
    check("結果を見る前に別のタブが次の日を保存しても、終えた日の記録を残す", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(); const base = { mode: "d", date: "2000-01-01", list: [1, 2, 3], tags: [1, 2, 3], id: "x", res: [], i: 0, hints: [0, 0, 0] }, done = Object.assign({}, base, { res: [0, 1, 2].map(() => ({ m: 0, g: 1, h: 0, f: 0, p: 90, n: 1 })), i: 3 }); mem = JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: done } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { date: "2000-01-02" }) } }))); const r = g.load(); mem = null; return !!r.days["2000-01-01"] && r.runs.d.date === "2000-01-02"; }, KEY));
    check("同じ問題の練習をやり直したら、前の回（終えたもの）と取り違えず新しい回を使う", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(), base = { mode: "p", date: "2000-01-01", list: [1], tags: [1], res: [], i: 0, hints: [] }; mem = JSON.stringify(Object.assign({}, s0, { t: 9, runs: { p: Object.assign({}, base, { id: "new" }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, runs: { p: Object.assign({}, base, { id: "old", res: [{}], i: 1 }) } }))); const r = g.load(); mem = null; return r.runs.p.id === "new"; }, KEY));
    check("時計が戻っても、保存の時刻 t は前より大きくなる", await pn.evaluate((K) => { const s0 = JSON.parse(localStorage.getItem(K)); const far = Date.now() + 1e9; localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: far }))); save(() => {}); return JSON.parse(localStorage.getItem(K)).t > far; }, KEY));
    check("進み具合は終えた問題の数を先に比べる（並べ替えた回数が多くても、終えた問題のある記録を消さない）", await pn.evaluate((K) => { const g = window.__kn, s0 = g.load(), base = { mode: "d", date: "2000-01-01", list: [{ seed: 1, lv: 0, idx: 0 }, { seed: 2, lv: 0, idx: 1 }], id: "x" }; mem = JSON.stringify(Object.assign({}, s0, { t: 9, runs: { d: Object.assign({}, base, { res: [], cur: { i: 0, slots: [null, null, null, null], lock: [false, false, false, false], miss: 0, hints: 0, kan: false, moves: 1500 } }) } })); localStorage.setItem(K, JSON.stringify(Object.assign({}, s0, { t: 5, runs: { d: Object.assign({}, base, { res: [{ m: 0, h: 0 }], cur: null }) } }))); const r = g.load(); mem = null; return r.runs.d.res.length === 1; }, KEY));
    check("できたときに別のタブで回が変わって保存できなかったら、できた画面を出さない", await pn.evaluate(() => /let saved = false/.test(solve.toString()) && /if \(!saved\)/.test(solve.toString())));
    await pn.evaluate(() => { location.hash = ""; }); await pn.reload(); await pn.click("#go-p"); await pn.click('.lv button[data-lv="3"]');
    check("練習の上級（7字）も、ヒントのボタンが無い", (await pn.locator("#hint").count()) === 0 && (await pn.evaluate(() => window.__kn.cur().hard)) === true);
    await pn.close(); }
} catch (e) {
  check("QA の操作が最後まで完了する", false, e.message.split("\n")[0]);
} finally {
  await browser.close();
}
check("画面のエラーが無い", errors.length === 0, errors.slice(0, 3).join(" | "));

const ng = results.filter((r) => !r.ok);
const md = `# ことばならべ QA\n\n${results.map((r) => `- ${r.ok ? "✅" : "❌"} ${r.name}${r.detail ? `（${r.detail}）` : ""}`).join("\n")}\n\n${ng.length ? `❌ ${ng.length}件` : `✅ ${results.length}項目すべて通過`}\n`;
mkdirSync(path.join(root, "qa-report"), { recursive: true });
writeFileSync(path.join(root, "qa-report/report.md"), md);
console.log(md);
process.exit(ng.length ? 1 : 0);
