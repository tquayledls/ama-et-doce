#!/usr/bin/env python3
"""Build the Saint of the Day website (hosted on Netlify) from the daily pages.

Usage (from the repo root):  python3 saints/tools/build_site.py

Reads saints/SAINTS_LOG.md (rows in date order) and the matching saints/pages/<date>-<slug>.html,
then writes the static site that Netlify publishes (see netlify.toml at the repo root):
  saints/site/index.html          the newest saint's page, plus an archive of every earlier day
  saints/site/days/<slug>.html    a standalone page for each day
  saints/site/print/<slug>.pdf    the pocket print edition for each day, when it exists
  saints/site/404.html            a simple not-found page
It also writes saints/artifact/index.html, the same home page in the form the claude.ai
shared page needs (no <!doctype>), for as long as that page is still published.
Netlify redeploys automatically whenever these files are pushed to GitHub.
"""
import html, os, re, shutil, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
DESCRIPTION = ("A Catholic saint each day: life, painting, a famous excerpt, and uses for catechesis, "
               "apologetics, theology and prayer, with every claim footnoted.")

def head_tags(title, desc):
    e = html.escape
    return ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<meta name="description" content="{e(desc)}">\n'
            f'<meta property="og:title" content="{e(title)}">\n'
            f'<meta property="og:description" content="{e(desc)}">\n'
            '<meta property="og:type" content="website">\n'
            '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E'
            '%3Ctext y=%22.9em%22 font-size=%2290%22%3E%E2%9C%A0%3C/text%3E%3C/svg%3E">\n')

def split(page):
    i = page.index('<div class="lit-band"')
    return page[:i], page[i:]

def rows():
    out = []
    for line in open(os.path.join(ROOT, "SAINTS_LOG.md"), encoding="utf-8"):
        m = re.match(r"\|\s*\d+\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+?)\s*\|.*entries/([\w.-]+)\.html", line)
        if m and os.path.exists(os.path.join(ROOT, "pages", m.group(3) + ".html")):
            out.append((m.group(1), m.group(2), m.group(3)))
    return out

SITE_CSS = """<style>
.site-nav { display: flex; flex-wrap: wrap; gap: .4rem 1.25rem; padding-block: 1rem 0; font-family: var(--label); font-size: .85rem; letter-spacing: .06em; }
.site-nav a { color: var(--lapis); text-decoration: none; }
.site-nav a:hover, .site-nav a:focus-visible { text-decoration: underline; }
.site-nav .home { color: var(--fg); font-weight: 700; margin-right: auto; }
.archive { margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--rule); display: grid; gap: .9rem; max-width: 40rem; scroll-margin-top: 1rem; }
.archive h2 { font-family: var(--label); font-weight: 700; font-size: .95rem; letter-spacing: .09em; color: var(--lapis); margin: 0; }
.archive ol { list-style: none; margin: 0; padding: 0; display: grid; gap: .45rem; }
.archive li { display: grid; grid-template-columns: 7.5rem minmax(0, 1fr); gap: 1rem; align-items: baseline; }
.archive time { font-family: var(--label); font-size: .82rem; letter-spacing: .05em; color: var(--muted); font-variant-numeric: tabular-nums; }
.archive a { color: var(--lapis); text-underline-offset: .15em; }
</style>
"""

def nav(prefix, slug, has_pdf):
    links = [f'<a class="home" href="{prefix}index.html">✠ Saint of the Day</a>',
             f'<a href="{prefix}index.html#archive">All saints</a>']
    if has_pdf:
        links.append(f'<a href="{prefix}print/{slug}.pdf">Pocket edition (PDF)</a>')
    return '<nav class="site-nav" aria-label="Site">' + "".join(links) + "</nav>\n"

def with_nav(body, nav_html):
    return body.replace('<div class="wrap">', '<div class="wrap">\n' + nav_html, 1)

REPO = "https://github.com/tquayledls/ama-et-doce"
# Netlify's open source plan requires a link to Netlify on every page; the text must read
# "This site is powered by Netlify". The other spans link the licenses and Code of Conduct.
NETLIFY_LINK = '<a href="https://www.netlify.com">This site is powered by Netlify</a>'
FOOT_EXTRA = (f'\n    <span>{NETLIFY_LINK}</span>'
              f'\n    <span>Open source: <a href="{REPO}/blob/HEAD/LICENSE">MIT</a> code, '
              f'<a href="{REPO}/blob/HEAD/CONTENT-LICENSE.md">CC BY 4.0</a> text &middot; '
              f'<a href="{REPO}/blob/HEAD/CODE_OF_CONDUCT.md">Code of Conduct</a></span>\n  ')

def with_footer(body):
    return body.replace("</footer>", FOOT_EXTRA + "</footer>", 1)

def archive_html(rs, prefix):
    items = "\n".join(
        f'<li><time datetime="{d}">{html.escape(d)}</time><a href="{prefix}days/{s}.html">{html.escape(n)}</a></li>'
        for d, n, s in reversed(rs))
    return ('<section class="archive" id="archive" aria-label="All saints">\n<h2>All saints</h2>\n'
            f"<ol>\n{items}\n</ol>\n</section>\n")

def main():
    rs = rows()
    if not rs:
        sys.exit("No logged saints with built pages.")
    site = os.path.join(ROOT, "site")
    for sub in ("days", "print"):
        os.makedirs(os.path.join(site, sub), exist_ok=True)

    pdfs = set()
    for d, name, slug in rs:
        src = os.path.join(ROOT, "print", slug + ".pdf")
        if os.path.exists(src):
            shutil.copyfile(src, os.path.join(site, "print", slug + ".pdf"))
            pdfs.add(slug)

    for d, name, slug in rs:
        head, body = split(open(os.path.join(ROOT, "pages", slug + ".html"), encoding="utf-8").read())
        body = with_footer(with_nav(body, nav("../", slug, slug in pdfs)))
        open(os.path.join(site, "days", slug + ".html"), "w", encoding="utf-8").write(
            head_tags(f"{name}: Saint of the Day", DESCRIPTION) + head + SITE_CSS
            + "</head>\n<body>\n" + body + "\n</body>\n</html>\n")

    d, name, slug = rs[-1]
    head, body = split(open(os.path.join(ROOT, "pages", slug + ".html"), encoding="utf-8").read())
    head = re.sub(r"<title>.*?</title>", "<title>Saint of the Day</title>", head, count=1, flags=re.S)
    body = with_footer(with_nav(body, nav("", slug, slug in pdfs)))
    body = body.replace('<footer class="foot">', archive_html(rs, "") + '<footer class="foot">', 1)
    open(os.path.join(site, "index.html"), "w", encoding="utf-8").write(
        head_tags("Saint of the Day", DESCRIPTION) + head + SITE_CSS + "</head>\n<body>\n" + body + "\n</body>\n</html>\n")

    # claude.ai shared page: same home page, without the document wrapper the artifact adds itself
    os.makedirs(os.path.join(ROOT, "artifact"), exist_ok=True)
    open(os.path.join(ROOT, "artifact", "index.html"), "w", encoding="utf-8").write(head + SITE_CSS + body)

    open(os.path.join(site, "404.html"), "w", encoding="utf-8").write(
        head_tags("Page not found: Saint of the Day", DESCRIPTION)
        + "<title>Page not found</title>\n<style>body{font-family:Georgia,serif;max-width:36rem;margin:4rem auto;"
        "padding:0 16px;line-height:1.6;color:#1B2232;background:#F2F3F6}a{color:#27478F}</style>\n</head>\n<body>\n"
        "<h1>Page not found</h1>\n<p>That page isn't here. <a href=\"/ama-et-doce/\">Go to today's saint</a>.</p>\n"
        f"<p><small>{NETLIFY_LINK}</small></p>\n</body>\n</html>\n")
    print(f"Wrote site/index.html (today: {name}), {len(rs)} day pages, {len(pdfs)} PDFs")

if __name__ == "__main__":
    main()
