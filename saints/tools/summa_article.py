#!/usr/bin/env python3
"""Write the day's Summa Theologiae article for the Summa tab.

Usage (from the repo root):
  python3 saints/tools/summa_article.py --date 2026-11-05 \
      --image "File_name_on_Commons.jpg" --image-title "Theology" --image-artist "Raphael, 1509–11, Stanza della Segnatura, Vatican"
  python3 saints/tools/summa_article.py --seq 17 ...       (a specific article, by its number in saints/summa/INDEX.tsv)

Without --seq it takes the article after the last one in saints/SUMMA_LOG.md (or article 1).
The text comes from New Advent (English Dominican translation, 2nd rev. ed., 1920, public domain),
verbatim, with New Advent's encyclopedia links removed. It writes
saints/summa/<date>-<ref>.html and prints the SUMMA_LOG row to add.
"""
import argparse, html, os, re, sys, urllib.request

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
UA = "Mozilla/5.0 (SaintOfTheDay)"
PART_NAMES = {"I": "First Part", "I-II": "First Part of the Second Part", "II-II": "Second Part of the Second Part",
              "III": "Third Part", "Suppl.": "Supplement to the Third Part", "Appendix I": "Appendix I", "Appendix II": "Appendix II"}
EDITION = ("trans. Fathers of the English Dominican Province, 2nd rev. ed. (London: Burns Oates &amp; Washbourne, 1920)")

def index():
    rows = []
    for i, line in enumerate(open(os.path.join(ROOT, "summa", "INDEX.tsv"), encoding="utf-8"), 1):
        part, q, a, url, qtitle, atitle = line.rstrip("\n").split("\t")
        rows.append(dict(seq=i, part=part, q=int(q), a=int(a), url=url, qtitle=qtitle, atitle=atitle))
    return rows

def last_logged():
    p = os.path.join(ROOT, "SUMMA_LOG.md")
    seqs = [int(m.group(1)) for m in re.finditer(r"^\|\s*\d+\s*\|\s*[\d-]+\s*\|\s*(\d+)\s*\|", open(p, encoding="utf-8").read(), re.M)] if os.path.exists(p) else []
    return max(seqs) if seqs else 0

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "ignore")

def clean(p):
    p = re.sub(r"<a [^>]*>(.*?)</a>", r"\1", p, flags=re.S)        # drop encyclopedia / cross-reference links, keep words
    p = re.sub(r"<(?!/?(strong|em|i|b)\b)[^>]+>", "", p)            # keep only simple emphasis
    p = re.sub(r"\s+", " ", p).strip()
    return p

def ref(r):
    return f"{r['part']}, q.{r['q']}, a.{r['a']}"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True)
    ap.add_argument("--seq", type=int)
    ap.add_argument("--image", required=True, help="Wikimedia Commons file name (public-domain artwork)")
    ap.add_argument("--image-title", required=True)
    ap.add_argument("--image-artist", required=True)
    o = ap.parse_args()
    rows = index()
    seq = o.seq or last_logged() + 1
    if seq > len(rows):
        sys.exit("The whole Summa has been read.")
    r = rows[seq - 1]
    url = r["url"]
    page = fetch(url.split("#")[0])
    m = re.search(rf'<h2 id="article{r["a"]}">(.*?)</h2>(.*?)(?=<h2 id="article|<div class="pub")', page, re.S)
    if not m:
        sys.exit(f"Article not found on {url}")
    paras = [clean(p) for p in re.findall(r"<p>(.*?)</p>", m.group(2), re.S)]
    paras = [p for p in paras if p]
    atitle = re.sub(r"^Article \d+\.\s*", "", clean(m.group(1)))
    e = html.escape
    commons = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(o.image.removeprefix("File:").replace(" ", "_"), safe="(),_.-")
    body = []
    for p in paras:
        cls = ""
        if p.startswith("<strong>I answer that"):
            cls = ' class="respondeo"'
        elif p.startswith("<strong>On the contrary"):
            cls = ' class="sed-contra"'
        elif p.startswith("<strong>Reply to"):
            cls = ' class="reply"'
        elif p.startswith("<strong>Objection"):
            cls = ' class="objection"'
        body.append(f"<p{cls}>{p}</p>")
    part_name = PART_NAMES[r["part"]]
    out = (f"<h2>{e(atitle)}</h2>\n"
           f"<p><em>{e(part_name)}, Question {r['q']}: {e(r['qtitle'][:1].upper() + r['qtitle'][1:])}, Article {r['a']}</em>[2]</p>\n"
           f'<p class="art" data-commons="{e(o.image)}"><em>{e(o.image_title)}</em>, {e(o.image_artist)}[1]</p>\n'
           + "\n".join(body)
           + "\n\n<h3>Sources</h3>\n<ol>\n"
           f'<li>{e(o.image_title)}, {e(o.image_artist)}. Public-domain image, Wikimedia Commons. <a href="{e(commons)}">{e(commons.split("//")[1])}</a></li>\n'
           f'<li>Thomas Aquinas, <em>Summa Theologiae</em> {e(ref(r))}, {EDITION}. <a href="{e(url)}">{e(url.split("//")[1])}</a></li>\n'
           "</ol>\n")
    slug = f"{o.date}-summa-{r['part'].lower().replace('.', '').replace(' ', '-')}-q{r['q']}-a{r['a']}"
    os.makedirs(os.path.join(ROOT, "summa"), exist_ok=True)
    path = os.path.join(ROOT, "summa", slug + ".html")
    open(path, "w", encoding="utf-8").write(out)
    words = len(re.sub(r"<[^>]+>", " ", "\n".join(body)).split())
    print(f"Wrote {os.path.relpath(path, os.path.join(ROOT, '..'))} ({words} words)")
    print(f"SUMMA_LOG row: | n | {o.date} | {seq} | {ref(r)} | {atitle} | {o.image_title}, {o.image_artist} | [summa](summa/{slug}.html) |")

if __name__ == "__main__":
    import urllib.parse
    main()
