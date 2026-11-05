# ことばならべ

ばらばらになった字を並べかえて、言葉を1つ作る。だれでも同じ1日3問の言葉パズル。

- 遊ぶ: <https://satou-aaaaa.github.io/kotoba-narabe/>
- 字を押して上のますに並べ、全部並べたら「これで答える」。ちがっていたら、場所が合っていた字だけ緑で残ります。一度もまちがえずヒントも使わなければ★3つ。
- 答えは1つだけです。同じ字の組み合わせで書ける言葉が、辞書（JMdict の全部の言葉）にほかに無いものだけを出しています。
- 今日の3問（4字・5字・6字）はだれでも同じで1日1回。上級（7字と8字・ヒントなし）、練習、作った言葉が集まる言葉帳があります。時間制限はありません。
- 記録は遊ぶ人のブラウザにだけ残り、ゲームから自動で外へ送ることはありません。例外は2つ：文字（Google Fonts）を読み込むとき、まだ端末に保存が無ければ Google に IP アドレスが届きます。「Xで投稿」「LINEで送る」「結果をシェア」を押したときだけ、結果の文が選んだ先に渡ります（言葉は入りません）。

## 言葉のデータ

言葉は [JMdict](https://www.edrdg.org/jmdict/j_jmdict.html)（© Electronic Dictionary Research and Development Group）から、漢字で書くよく使う名詞を `tools/make-data.py` で選んだものです。JMdict は [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) で、`words.js`・`tools/kana.txt` も CC BY-SA 4.0 です。

## 開発

```bash
bash scripts/setup.sh   # 最初に一度
node qa/run.mjs         # 検査（CI と同じ）
python3 tools/make-data.py <jamdict.db>   # words.js・tools/kana.txt を作り直すとき（PyPI の jamdict-data の jamdict.db.xz を解いたもの）
```

感想は [Issue のフォーム](https://github.com/satou-aaaaa/kotoba-narabe/issues/new?template=feedback.yml) からどうぞ。
