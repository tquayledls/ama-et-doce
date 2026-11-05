#!/usr/bin/env python3
"""Build the pocket prayer-book PDF (4 x 6 in) for a Saint of the Day entry.

Usage (from the repo root):
  python3 saints/tools/build_print.py \
    --email saints/entries/2026-11-01-bernard-of-clairvaux.html \
    --notes saints/print/2026-11-01-bernard-of-clairvaux.notes.html \
    --out saints/print/2026-11-01-bernard-of-clairvaux.pdf \
    --commons-file "San_Bernardo,_de_Juan_Correa_de_Vivar_(Museo_del_Prado).jpg" \
    --name "St. Bernard of Clairvaux" --titles "Abbot, Doctor of the Church" --feast "August 20" \
    --date "Sunday, November 1, 2026" --occasion "Solemnity of All Saints" --color white \
    --image-title "San Bernardo" --image-artist "Juan Correa de Vivar, 16th century, Museo del Prado"

The notes file is an <ol> with one <li> per footnote number in the entry: the WRITTEN citation
(author, title, edition, page or section), with no web addresses. Each [n] marker in the entry
becomes a real footnote at the foot of the printed page. The web "Sources" list and the
"Painting" section of the email are left out (the painting is on the title page).
"""
import argparse, html, io, os, re, subprocess, sys, tempfile
sys.path.insert(0, os.path.dirname(__file__))
from build_page import fetch_image, COLORS

HERE = os.path.dirname(os.path.abspath(__file__))

def main():
    a = argparse.ArgumentParser()
    for f in ("email", "notes", "out", "commons-file", "name", "titles", "feast", "date", "color", "image-title", "image-artist"):
        a.add_argument("--" + f, required=True)
    a.add_argument("--occasion", default="")
    o = a.parse_args()

    notes = re.findall(r"<li>(.*?)</li>", open(o.notes, encoding="utf-8").read(), re.S)
    if any(re.search(r"https?://|www\.|\b\w+\.(org|com|va|net)\b", n) for n in notes):
        sys.exit("Print notes must be written citations only: remove web addresses.")
    src = open(o.email, encoding="utf-8").read()
    src = src[: src.find("<h3>Sources</h3>")] if "<h3>Sources</h3>" in src else src
    markers = sorted({int(x) for x in re.findall(r"\[(\d+)\]", src)})
    if markers and markers[-1] > len(notes):
        sys.exit(f"Entry uses note [{markers[-1]}] but the notes file has only {len(notes)} entries.")

    s = re.sub(r"^\s*<h2>.*?</h2>\s*", "", src, count=1, flags=re.S)
    s = re.sub(r"^\s*<p><em>.*?</em></p>\s*", "", s, count=1, flags=re.S)
    pm = re.search(r"<h3>\s*(Painting|Image|Icon)[^<]*</h3>\s*<p>(.*?)</p>\s*", s, flags=re.S | re.I)
    img_note = ""
    if pm:
        first = re.search(r"\[(\d+)\]", pm.group(2))
        if first:
            img_note = True
        s = s[: pm.start()] + s[pm.end():]
    # Number footnotes in reading order; after a source's first full citation use its short form.
    full = [n.split("||")[0].strip() for n in notes]
    short = [(n.split("||")[1].strip() if "||" in n else n.strip()) for n in notes]
    seen, count, prev = set(), [0], [None]
    def cite(i):
        f = full[i]
        text = "Ibid." if prev[0] == f else (short[i] if f in seen else f)
        seen.add(f); prev[0] = f; count[0] += 1
        k = count[0]
        return f'<sup class="call">{k}</sup><span class="fn"><span class="num">{k}.</span> {text}</span>'
    if pm and img_note:
        img_note = cite(int(first.group(1)) - 1)
    s = re.sub(r"\[(\d+)\]", lambda m: cite(int(m.group(1)) - 1), s)
    s = re.sub(r"<a [^>]*>(.*?)</a>", r"\1", s, flags=re.S)  # no links on paper

    # Typographer's quotes in text (not inside tags)
    def curly(t):
        t = re.sub(r'(^|[\s(\[—–-])"', lambda m: m.group(1) + "\u201c", t)
        t = t.replace('"', "\u201d")
        t = re.sub(r"(^|[\s(\[—–-])'", lambda m: m.group(1) + "\u2018", t)
        return t.replace("'", "\u2019")
    s = re.sub(r">([^<]+)<", lambda m: ">" + curly(m.group(1)) + "<", s)

    out = []
    for part in re.split(r"(?=<h3>)", s.strip()):
        if not part.strip():
            continue
        h = re.match(r"<h3>(.*?)</h3>", part, re.S)
        cls = "intro"
        if h:
            t = h.group(1).lower()
            cls = "quote" if "excerpt" in t else "prayer" if "prayer" in t else ""
        part = re.sub(r"<p>([^<]*pray for us\.[^<]*)</p>\s*$", r'<p class="closing">\1</p>', part.strip())
        out.append(f'<section class="{cls}">\n{part}\n</section>')
    body = "\n".join(out)

    from PIL import Image
    im = Image.open(io.BytesIO(fetch_image(o.commons_file))).convert("RGB")
    im.thumbnail((1000, 1500))
    tmpdir = tempfile.mkdtemp(prefix="saintprint-")
    img_path = os.path.join(tmpdir, "painting.jpg")
    im.save(img_path, "JPEG", quality=90)

    e = html.escape
    page = open(os.path.join(HERE, "print_template.html"), encoding="utf-8").read()
    for k, v in {
        "{{NAME}}": e(o.name), "{{TITLES}}": e(o.titles), "{{FEAST}}": e(o.feast), "{{DATE}}": e(o.date),
        "{{OCCASION_LINE}}": f"<br>{e(o.occasion)}" if o.occasion else "",
        "{{COLOR}}": COLORS[o.color.lower()], "{{IMG}}": "file://" + img_path,
        "{{IMG_TITLE}}": e(o.image_title), "{{IMG_ARTIST}}": e(o.image_artist), "{{IMG_NOTE}}": img_note,
        "{{PAGED}}": "file://" + os.path.join(HERE, "vendor", "paged.polyfill.js"),
        "{{BODY}}": body,
    }.items():
        page = page.replace(k, v)
    html_path = os.path.join(tmpdir, "print.html")
    open(html_path, "w", encoding="utf-8").write(page)
    subprocess.run(["node", os.path.join(HERE, "render_pdf.js"), html_path, os.path.abspath(o.out)], check=True)

if __name__ == "__main__":
    main()
