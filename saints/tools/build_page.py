#!/usr/bin/env python3
"""Build the Saint of the Day web page (with the painting embedded) from the day's email HTML.

Usage:
  python3 saints/tools/build_page.py \
    --fathers saints/fathers/2026-11-05-knowing-god-through-his-works.html \
    --email saints/entries/2026-11-01-bernard-of-clairvaux.html \
    --out saints/pages/2026-11-01-bernard-of-clairvaux.html \
    --commons-file "San_Bernardo,_de_Juan_Correa_de_Vivar_(Museo_del_Prado).jpg" \
    --name "St. Bernard of Clairvaux" \
    --titles "Abbot, Doctor of the Church" \
    --feast "August 20" \
    --date "Sunday, November 1, 2026" \
    --occasion "Solemnity of All Saints" \
    --color white \
    --image-title "San Bernardo" --image-artist "Juan Correa de Vivar, 16th c., Museo del Prado"

The email HTML is the source of truth for the text. The script drops the email's <h2> title,
the italic subtitle paragraph right after it, and the "Painting" section, because the page
shows those in its own header and figure. The painting is downloaded from Wikimedia Commons,
resized, and embedded as a data: URI (artifact pages cannot load outside images).
"""
import argparse, base64, html, io, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

UA = "SaintOfTheDay/1.0 (personal daily devotional)"
COLORS = {  # liturgical color of the day -> swatch
    "white": "#E8E1CC", "gold": "#C9A246", "red": "#A3262A", "green": "#2F6B3E",
    "violet": "#5B3A7A", "rose": "#C77B95", "black": "#26262B",
}

def fetch_image(commons_file: str) -> bytes:
    """Download a Commons image once and cache it in saints/images/ (Wikimedia rate-limits repeat downloads)."""
    name = commons_file.removeprefix("File:").replace(" ", "_")
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "images")
    os.makedirs(cache_dir, exist_ok=True)
    cache = os.path.join(cache_dir, re.sub(r"[^A-Za-z0-9._-]", "_", name))
    if os.path.exists(cache) and os.path.getsize(cache) > 1000:
        return open(cache, "rb").read()
    base = "https://commons.wikimedia.org/wiki/Special:FilePath/" + urllib.parse.quote(name)
    last = None
    for url in (base + "?width=960", base):          # 960 is a standard Wikimedia thumbnail step
        for wait in (0, 5, 15, 30):
            time.sleep(wait)
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=60) as r:
                    data = r.read()
                if data[:3] == b"\xff\xd8\xff" or data[:8] == b"\x89PNG\r\n\x1a\n":
                    open(cache, "wb").write(data)
                    return data
                last = f"not an image ({data[:60]!r})"
            except urllib.error.HTTPError as e:
                last = e
                ra = e.headers.get("Retry-After") if e.headers else None
                if ra and ra.isdigit():
                    time.sleep(min(int(ra), 60))
            except Exception as e:
                last = e
    sys.exit(f"Could not download {name}: {last}")

def shrink(data: bytes) -> bytes:
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert("RGB")
    im.thumbnail((760, 1200))
    out = io.BytesIO()
    im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    return out.getvalue()

def link_notes(s: str, fn: str = "fn", ref: str = "ref") -> str:
    """[n] markers -> superscript links; each Sources <li> gets an anchor and a back-link."""
    src_at = s.find("<h3>Sources</h3>")
    head, tail = (s[:src_at], s[src_at:]) if src_at >= 0 else (s, "")
    seen = set()
    def marker(m):
        k = m.group(1)
        rid = "" if k in seen else f' id="{ref}-{k}"'
        seen.add(k)
        return f'<sup class="fn"{rid}><a href="#{fn}-{k}" aria-label="Source {k}">{k}</a></sup>'
    head = re.sub(r"\[(\d+)\]", marker, head)
    n = iter(range(1, 10000))
    def item(m):
        k = next(n)
        return f'<li id="{fn}-{k}"><a class="back" href="#{ref}-{k}" aria-label="Back to text">↩</a> '
    tail = re.sub(r"<li>", item, tail)
    return head + tail

def fathers_panel(src: str):
    """The Church Fathers reading (saints/fathers/<date>-<topic>.html) -> (tab label, tab panel HTML).

    Source layout: <h2>Topic</h2>, <p><em>Father(s) and work(s)</em></p>, a footnoted headnote,
    then one <h3> per excerpt (with optional <h4> chapter heads), then <h3>Sources</h3><ol>."""
    m = re.match(r"\s*<h2>(.*?)</h2>\s*<p><em>(.*?)</em></p>\s*", src, re.S)
    if not m:
        sys.exit("Church Fathers file must start with <h2>Topic</h2> and a <p><em>byline</em></p>.")
    topic, byline, rest = m.group(1).strip(), m.group(2).strip(), src[m.end():]
    reading = rest.split("<h3>Sources</h3>")[0]
    words = len(html.unescape(re.sub(r"<[^>]+>|\[\d+\]", " ", reading)).split())
    minutes = max(1, round(words / 230))
    rest = link_notes(rest, "ffn", "fref")
    parts = re.split(r"(?=<h3>)", rest.strip())
    out = []
    for p in parts:
        if not p.strip():
            continue
        if p.startswith("<h3>Sources</h3>"):
            out.append(f'<section class="sources">\n{p.strip()}\n</section>')
        elif p.startswith("<h3>"):
            out.append(f'<section class="excerpt">\n{p.strip()}\n</section>')
        else:
            out.append(f'<section class="headnote">\n{p.strip()}\n</section>')
    panel = ('<div class="tabpanel" id="fathers" role="tabpanel" aria-labelledby="tab-fathers">\n'
             '<article class="fathers">\n<header class="reading-head">\n'
             f'<p class="kicker">From the Church Fathers · about {minutes} min read</p>\n'
             f'<h2>{topic}</h2>\n<p class="byline">{byline}</p>\n</header>\n'
             + "\n".join(out) + "\n</article>\n</div>")
    return re.sub(r"<[^>]+>", "", topic), panel, minutes

def summa_panel(src: str):
    """The day's Summa article (saints/summa/<date>-summa-....html, written by summa_article.py) -> (tab label, panel).

    Source layout: <h2>Article title</h2>, <p><em>Part, Question, Article</em>[1]</p>,
    <p class="art" data-commons="File.jpg"><em>Title</em>, artist[2]</p>, the article's paragraphs, <h3>Sources</h3><ol>."""
    m = re.match(r'\s*<h2>(.*?)</h2>\s*<p><em>(.*?)</em>(.*?)</p>\s*<p class="art" data-commons="([^"]+)">(.*?)</p>\s*', src, re.S)
    if not m:
        sys.exit("Summa file must start with <h2>, the <p><em> reference line and the <p class=\"art\"> image line.")
    title, where, where_note, commons, caption, rest = m.group(1), m.group(2), m.group(3), html.unescape(m.group(4)), m.group(5), src[m.end():]
    words = len(html.unescape(re.sub(r"<[^>]+>|\[\d+\]", " ", rest.split("<h3>Sources</h3>")[0])).split())
    minutes = max(1, round(words / 230))
    img = shrink(fetch_image(commons))
    head = link_notes(f"<p>{where}{where_note}</p><figcaption>{caption}</figcaption>" + rest, "sfn", "sref")
    where_html, after = head.split("</p>", 1)
    cap_html, body = after.split("</figcaption>", 1)
    body, sources = body.split("<h3>Sources</h3>", 1)
    ref_m = re.search(r"(First Part of the Second Part|Second Part of the Second Part|First Part|Third Part|Supplement to the Third Part|Appendix II|Appendix I), Question (\d+).*Article (\d+)", where)
    short = {"First Part": "I", "First Part of the Second Part": "I-II", "Second Part of the Second Part": "II-II",
             "Third Part": "III", "Supplement to the Third Part": "Suppl.", "Appendix I": "App. I", "Appendix II": "App. II"}
    label = f"{short[ref_m.group(1)]}, q.{ref_m.group(2)}, a.{ref_m.group(3)}" if ref_m else "Summa"
    panel = ('<div class="tabpanel" id="summa" role="tabpanel" aria-labelledby="tab-summa">\n'
             '<article class="summa">\n'
             f'<figure class="summa-art"><img src="data:image/jpeg;base64,{base64.b64encode(img).decode()}" alt="">'
             f"<figcaption>{cap_html.removeprefix('<figcaption>')}</figcaption></figure>\n"
             '<header class="reading-head">\n'
             f'<p class="kicker">Summa Theologiae · {html.escape(label)} · about {minutes} min read</p>\n'
             f'<h2>{title}</h2>\n<p class="byline">{where_html.removeprefix("<p>")}</p>\n</header>\n'
             f'<section class="article-text">\n{body.strip()}\n</section>\n'
             f'<section class="sources">\n<h3>Sources</h3>{sources}\n</section>\n'
             "</article>\n</div>")
    return label, panel

def body_from_email(src: str) -> str:
    s = re.sub(r"^\s*<h2>.*?</h2>\s*", "", src, count=1, flags=re.S)
    s = re.sub(r"^\s*<p><em>.*?</em></p>\s*", "", s, count=1, flags=re.S)
    s = re.sub(r"<h3>\s*(Painting|Image|Icon)[^<]*</h3>\s*<p>.*?</p>\s*", "", s, count=1, flags=re.S | re.I)
    s = link_notes(s)
    # wrap each <h3> section in <section>
    parts = re.split(r"(?=<h3>)", s.strip())
    out = []
    for p in parts:
        if not p.strip():
            continue
        if p.startswith("<h3>"):
            out.append(f"<section>\n{p.strip()}\n</section>")
        else:
            out.append(f"<section class=\"intro\">\n{p.strip()}\n</section>")
    return "\n".join(out)

TEMPLATE = open(__file__.replace("build_page.py", "page_template.html"), encoding="utf-8").read()

def main():
    a = argparse.ArgumentParser()
    for f in ("email", "out", "commons-file", "name", "titles", "feast", "date", "color", "image-title", "image-artist"):
        a.add_argument("--" + f, required=True)
    a.add_argument("--occasion", default="")
    a.add_argument("--fathers", default="", help="saints/fathers/<date>-<topic>.html: the Church Fathers tab")
    a.add_argument("--summa", default="", help="saints/summa/<date>-summa-....html: the Summa tab")
    o = a.parse_args()
    color = o.color.lower()
    if color not in COLORS:
        sys.exit(f"--color must be one of {', '.join(COLORS)}")
    img = shrink(fetch_image(o.commons_file))
    commons_url = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(o.commons_file.removeprefix("File:").replace(" ", "_"), safe="(),_.-")
    e = html.escape
    tabs, panels = [], ""
    if o.fathers:
        topic, fathers, minutes = fathers_panel(open(o.fathers, encoding="utf-8").read())
        tabs.append(("fathers", f"Church Fathers <span>· {e(topic)}</span>"))
        panels += fathers + "\n"
    if o.summa:
        label, summa = summa_panel(open(o.summa, encoding="utf-8").read())
        tabs.append(("summa", f"Summa <span>· {e(label)}</span>"))
        panels += summa + "\n"
    tabs_html = ""
    if tabs:
        tabs_html = ('<div class="tabs" role="tablist" aria-label="Today\'s readings">'
                     '<a role="tab" id="tab-saint" href="#saint" aria-controls="saint" aria-selected="true">Saint of the Day</a>'
                     + "".join(f'<a role="tab" id="tab-{k}" href="#{k}" aria-controls="{k}" aria-selected="false">{v}</a>' for k, v in tabs)
                     + "</div>")
    page = TEMPLATE
    for k, v in {
        "{{NAME}}": e(o.name), "{{TITLES}}": e(o.titles), "{{FEAST}}": e(o.feast),
        "{{DATE}}": e(o.date), "{{OCCASION}}": e(o.occasion),
        "{{OCCASION_SEP}}": " · " if o.occasion else "",
        "{{COLOR_NAME}}": e(color.capitalize()), "{{COLOR}}": COLORS[color],
        "{{IMG}}": "data:image/jpeg;base64," + base64.b64encode(img).decode(),
        "{{IMG_TITLE}}": e(o.image_title), "{{IMG_ARTIST}}": e(o.image_artist),
        "{{IMG_URL}}": e(commons_url),
        "{{TABS}}": tabs_html, "{{FATHERS}}": panels,
        "{{BODY}}": body_from_email(open(o.email, encoding="utf-8").read()),
    }.items():
        page = page.replace(k, v)
    open(o.out, "w", encoding="utf-8").write(page)
    print(f"Wrote {o.out} ({len(page)//1024} KB, image {len(img)//1024} KB)")

if __name__ == "__main__":
    main()
