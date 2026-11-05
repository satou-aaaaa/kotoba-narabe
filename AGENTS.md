# AGENTS.md

ことばならべ：ばらばらになった字を並べかえて、言葉を1つ作る1日3問の言葉パズル。`index.html` と `gen.js`（問題の決め方）・`words.js`（言葉）を GitHub Pages で公開する。

## 準備（最初に一度）

```bash
bash scripts/setup.sh   # Node.js（版は .nvmrc）を確かめ、検査の依存とブラウザを入れる。何度実行してもよい
```

## push する前の確認

```bash
node qa/run.mjs   # 言葉のデータ（答えが1つかを JMdict の全部の読みで数え直す）・字の並び（全部の言葉×20通り）・3問の組み方（3年分）・並べる/戻す/答える/ヒント・続きから・上級・言葉帳・スマホ幅・PWA（CI の QA と同じ）
```

## このリポジトリの決まり

- `words.js`・`tools/kana.txt` は `python3 tools/make-data.py <jamdict.db>` で JMdict から作る（手で直さない）。漢字で書くよく使う名詞、読みはひらがなだけ。答えは1つ（同じ字の組み合わせで書ける読みが JMdict のほかの言葉に無い。QA が `tools/kana.txt`＝4〜8字のすべての読みで数え直す）。つらい言葉（死・殺など）は `NG` で外す（QA が見る）。
- JMdict は © EDRDG、CC BY-SA 4.0。`words.js`・`tools/kana.txt` も CC BY-SA 4.0 で、遊び方と README に出どころを書く（消さない）。
- 問題は `gen.js` が決める：言葉は難しさごとの並びを周ごとに種で混ぜて1日1つずつ（1周するまで同じ言葉は出ない。`wordOf`）、字の並びは種で混ぜ、答えと同じ場所の字は5字まで0・6字から1つまで（同じ字が多くて0にできない言葉は2つまで。`scramble`）。今日の3問は4字・5字・6字、上級は7字と8字（`LV`）。`gen.js` や `words.js` を変えると過去の日の問題も変わるので、変えた PR に一言書く。
- 今日の3問・上級は日本時間の日付から作る種（`seedOf`）で決まり、だれでも同じ。`Math.random()` は練習の問題の種だけ（QA が数を見る）。
- ★はまちがい＋ヒントの数（0で★3・2まで★2・それ以上★1）。ちがう並びで答えると、場所が合った字だけ緑で残る。ヒントは2回まで（左から1字を正しい場所に置く・漢字を見せる）。上級はヒントなし。時間制限は付けない。
- 今日の3問・上級は1日1回で、途中で閉じても並べた字・緑の字・ヒントのまま続きから。保存してあった並べ方は、札を1回ずつ・緑の字が答えと同じかを確かめてから使う（`valid`）。途中経過はモードごとに分けて保存し（`runs.d`・`runs.h`・`runs.p`）、練習で今日・上級の途中を消さない。答えを入れる前に、保存した進み具合が画面と同じ問題か確かめる。記録は保存の前に読み直す。保存に失敗したあとは、途中経過を時刻でなく進み具合で選び、言葉帳の数は多いほうを残す（shared-workflows `incidents/2026-11-04-daily-game-save-gaps.md`）。
- 共有は遊ぶ人が押したときに開くリンク（X・LINE・Web Share・コピー）だけ。シェアの文に言葉（答え）を出さない（🟩一発・🟨2回までまちがい・🟧もっと・💡ヒント）。
- 文字は少なめ・一画面一問。お笑いの言葉は入れない（QA が見る）。ほかの作品の名前・キャラ・見た目は使わない。
- 感想は「感想を送る」から GitHub の Issue フォーム（`.github/ISSUE_TEMPLATE/feedback.yml`、ラベル「感想」）を開くだけ。項目は shared-workflows の `template/.github/ISSUE_TEMPLATE/feedback.yml` と同じにし、名前・メールは聞かない。週1で shared-workflows `routines/game-feedback.md` が読んで直す。
- 応援は Ko-fi（https://ko-fi.com/satouaaaaa）へのただのリンクだけ。今日の3問・上級を初めて終えて全部一発（まちがい・ヒントなし）のときだけ、結果の画面の下に1行（共有フォルダ kofi/app-guide.md）。遊ぶのは無料のまま、有料版は置かない。
- 外へ通信しない。外から読むのは Google Fonts の文字だけ（CSP の `connect-src 'self'` を広げない）。記録は遊ぶ人のブラウザ（localStorage）だけ。
- 同じ日はどの端末でも同じ問題にする：乱数は `sort` の比較の中で引かない（QA が見る）。少し遅れて動く処理（setTimeout）は、画面が替わっていたら何もしない。
- 押せる所は高さ44px以上、幅320pxでも8字のますと札はそれぞれ1行（QA が見る）。機能を足す・直すたびに `qa/run.mjs` に検査を足す。乱数で組む部分は何千回も作って確かめる（shared-workflows `incidents/2026-10-31-roppo-empty-village.md`）。
- PWA（`manifest.webmanifest`・`sw.js`・`icon-*.png`）：画面のファイルを足したら `sw.js` の `SHELL` にも足し、中身を大きく変えたら `CACHE` の版を上げる。アイコンは `node tools/make-icons.cjs`、SNS 用の絵 `og.png` は `node tools/make-og.cjs`（今日の問題を入れない）。
- 公開リポジトリなので、個人情報・鍵を入れない。

## 公開

- GitHub Pages は `main` のルート（`/`）を公開する。PR の QA と Secret scan が ✅ になると `automerge.yml` が自動でマージする。止めたいときは下書きにするか、ラベル「自動マージしない」を付ける。
- `sw.js`・`manifest.webmanifest` を変える PR は自動ではマージされない（`hold_paths`）。CodeRabbit のレビューを待ち、手でマージする直前に今の head へのレビューを読み直す（shared-workflows `incidents/2026-11-01-roppo-merged-before-review.md`）。CodeRabbit は PR に `@coderabbitai review` とコメントして頼む。

## 共通のきまり

- PR の作り方・マージの仕方は satou-aaaaa/shared-workflows の `routines/pr.md`、全体のきまりは `routines/common.md` に従う。
- CI の部品は shared-workflows の共通部品を呼ぶ。リポジトリ側の .github/workflows には呼び出しと設定値だけを書く。
- Claude 以外の AI・人が作業するときは、shared-workflows の `routines/tool-map.md` と `routines/without-claude.md` を読む。
