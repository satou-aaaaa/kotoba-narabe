#!/usr/bin/env python3
"""ことばならべの言葉を JMdict から作る（標準ライブラリだけ）。

使い方: python3 tools/make-data.py <jamdict.db>
  jamdict.db は PyPI の jamdict-data（JMdict を SQLite にしたもの）の中の jamdict.db.xz を解いたもの。
決まり:
- 漢字で書く、よく使う名詞だけ（読みにも漢字の書き方にも、よく使う語の印）。接頭語・接尾語・助数詞・代名詞・数は外す。
- 読みはひらがなだけ（のばす棒「ー」は使わない）。同じ字だけの言葉は外す。
- 答えは1つ：同じ字の組み合わせで書ける読みが、JMdict のほかの言葉（よく使わない言葉も含めて全部）に無いこと。
- つらい言葉（死・殺など）は使わない。
- 難しさは字の数とよく使う度合い：やさしい＝4字（ichi1 と news1）、ふつう＝5字、むずかしい＝6字、上級＝7字と8字。
出力: words.js（[表記, よみ] の配列を難しさごとに）と tools/kana.txt（JMdict の4〜8字のすべての読み。QA が答えが1つか確かめ直す）。
JMdict は © EDRDG、CC BY-SA 4.0。words.js・tools/kana.txt も CC BY-SA 4.0。
"""
import sqlite3, sys, collections, json, os

NG = set("死殺葬屍姦淫娼尿糞呪遺棺骸刑獄墓弔喪病癌毒虐暴拷凶犯罪賊奴隷傷害戦爆銃兵敵怨憎痴災難疫患症菌腫屠骨亡惨禍")
HERE = os.path.dirname(os.path.abspath(__file__))
# 性別に寄った言葉（gender-ng.js。shared-workflows template/qa/a11y.mjs の WORDS）は作る段階で外す（2026-11-06 satou さん）
import re
with open(os.path.join(HERE, "..", "gender-ng.js"), encoding="utf-8") as f:
    GENDER_NG = json.loads(re.search(r"var NG = (\[.*?\]);", f.read(), re.S).group(1))
c = sqlite3.connect(sys.argv[1])

def hira(s):
    return "".join(chr(ord(ch) - 0x60) if "ァ" <= ch <= "ヶ" else ch for ch in s)
key = lambda r: "".join(sorted(r))

anag = collections.defaultdict(set)
for (t,) in c.execute("select text from Kana"):
    r = hira(t); anag[key(r)].add(r)
pri = collections.defaultdict(set)
for kid, t in c.execute("select kid,text from KNP"): pri[("r", kid)].add(t)
for kid, t in c.execute("select kid,text from KJP"): pri[("k", kid)].add(t)
pos = collections.defaultdict(set)
for idseq, t in c.execute("select s.idseq,p.text from Sense s join pos p on p.sid=s.ID"): pos[idseq].add(t)
kanji = collections.defaultdict(list)
for kid, idseq, t in c.execute("select ID,idseq,text from Kanji order by ID"): kanji[idseq].append((kid, t))
kana = collections.defaultdict(list)
for kid, idseq, t in c.execute("select ID,idseq,text from Kana order by ID"): kana[idseq].append((kid, t))

TOP = {"ichi1", "news1"}
GOOD = {"ichi1", "news1", "spec1"}
lv = {"e": [], "n": [], "d": [], "h7": [], "h8": []}
seen = set()
for idseq in sorted(kana):
    P = pos[idseq]
    if not any("noun (common)" in p for p in P): continue
    if any(("suffix" in p or "prefix" in p or "counter" in p or "pronoun" in p or "numeric" in p) for p in P): continue
    if not kanji.get(idseq): continue
    rk, r = kana[idseq][0]
    kk, kt = kanji[idseq][0]
    rp, kp = pri[("r", rk)], pri[("k", kk)]
    if not (rp & GOOD and kp & GOOD): continue
    if not all("ぁ" <= ch <= "ゖ" for ch in r) or r in seen: continue
    if set(kt) & NG or len(set(r)) < 3: continue
    if any(g in kt or g in r for g in GENDER_NG): continue
    if any("0" <= ch <= "9" or "０" <= ch <= "９" for ch in kt): continue
    if anag[key(r)] != {r}: continue  # 答えは1つ
    seen.add(r)
    n, top = len(r), TOP <= rp and "ichi1" in kp
    if n == 4 and top: lv["e"].append([kt, r])
    elif n == 5 and (rp & TOP): lv["n"].append([kt, r])
    elif n == 6: lv["d"].append([kt, r])
    elif n == 7: lv["h7"].append([kt, r])
    elif n == 8: lv["h8"].append([kt, r])
for k in lv: lv[k].sort(key=lambda w: w[1])
with open(os.path.join(HERE, "..", "words.js"), "w", encoding="utf-8") as f:
    f.write("// ことばならべの言葉（表記・よみ）。tools/make-data.py で JMdict から作る（手で直さない）。JMdict © EDRDG、CC BY-SA 4.0。\n")
    f.write("(function(r){var W=" + json.dumps(lv, ensure_ascii=False, separators=(",", ":")) + ";if(typeof module!=='undefined')module.exports=W;else r.KN_WORDS=W;})(this);\n")
# QA 用：JMdict の4〜8字のすべての読み（よく使わない言葉も含む）。答えの字の組み合わせで書けるのが答えだけか、QA が数え直す
allr = sorted({hira(t) for (t,) in c.execute("select text from Kana") if 4 <= len(t) <= 8})
with open(os.path.join(HERE, "kana.txt"), "w", encoding="utf-8") as f:
    f.write("# JMdict の4〜8字のすべての読み（tools/make-data.py が作る）。JMdict © EDRDG、CC BY-SA 4.0\n")
    f.write("\n".join(allr) + "\n")
print({k: len(v) for k, v in lv.items()}, len(allr), "読み")
