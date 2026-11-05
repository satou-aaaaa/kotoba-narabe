// SNS で貼られたときの絵（og.png 1200×630）を作る。今日の問題は入れず、見本の字だけ。
// 使い方: node tools/make-og.cjs（qa/ の playwright を使う）
const path = require("path");
const { chromium } = require(path.join(__dirname, "..", "qa", "node_modules", "playwright"));
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  const cards = [["い", "#8a8170"], ["と", "#2f8a5b"], ["け", "#8a8170"]];
  const html = cards.map((c, i) => `<div style="position:absolute;left:${700 + i * 150}px;top:${200 + (i % 2) * 60}px;width:130px;height:130px;background:#fffdf7;border:5px solid ${c[1]};border-radius:22px;display:flex;align-items:center;justify-content:center;transform:rotate(${(i - 1) * 6}deg);box-shadow:0 6px 0 #26323a22;font-size:78px;font-weight:900;color:#26323a">${c[0]}</div>`).join("");
  await p.setContent(`<body style="margin:0;font-family:'Noto Sans CJK JP','IPAPGothic',sans-serif">
  <div style="width:1200px;height:630px;box-sizing:border-box;padding:70px 80px;background:#e8e4f0;color:#26323a;position:relative;overflow:hidden">
    <div style="font-size:34px;color:#9b3220;letter-spacing:.1em">だれでも同じ 1日3問・3分</div>
    <div style="font-size:100px;font-weight:900;margin-top:16px;letter-spacing:.04em">ことばならべ</div>
    <div style="font-size:40px;margin-top:18px;line-height:1.5">ばらばらの字から、<br>言葉を作れる？</div>
    ${html}
  </div></body>`);
  await p.screenshot({ path: path.join(__dirname, "..", "og.png") });
  await b.close();
})();
