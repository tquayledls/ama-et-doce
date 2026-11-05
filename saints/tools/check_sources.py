#!/usr/bin/env python3
"""Check every source link in a Saint of the Day entry.

Usage: python3 saints/tools/check_sources.py saints/entries/<file>.html

For each <li> in the final Sources list it:
  * fetches the link (must return HTTP 200);
  * if the link has a text fragment (#:~:text=...), confirms that phrase is on the page,
    so the browser can scroll to and highlight it.
Footnote markers [n] in the body must match the number of Sources entries.
Exit code 1 if anything fails.

Helper for writing links:  python3 saints/tools/check_sources.py --link URL "exact phrase"
prints URL#:~:text=<encoded phrase>.
"""
import html, re, sys, time, urllib.parse, urllib.request

UA = "Mozilla/5.0 (SaintOfTheDay)"

def frag_link(url, phrase):
    enc = urllib.parse.quote(phrase, safe="")  # encodes , - & as required by the spec
    enc = enc.replace("-", "%2D")
    return f"{url.split('#')[0]}#:~:text={enc}"

def norm(s):
    s = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", s)
    s = html.unescape(re.sub(r"<[^>]+>", " ", s))
    for a, b in (("’", "'"), ("‘", "'"), ("“", '"'), ("”", '"'), ("\xa0", " ")):
        s = s.replace(a, b)
    s = re.sub(r"\s+", " ", s)
    return re.sub(r" ([,.;:?!])", r"\1", s).lower()   # links inside a sentence leave "God ," after tag stripping

def fetch(url):
    last = None
    for wait in (0, 2, 4, 8):
        time.sleep(wait)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.status, r.read().decode("utf-8", "ignore")
        except urllib.error.HTTPError as e:
            last = e.code
            if e.code in (403, 404, 410):
                break
        except Exception as e:
            last = e
    return last, ""

def main(path):
    src = open(path, encoding="utf-8").read()
    at = src.find("<h3>Sources</h3>")
    if at < 0:
        sys.exit("No <h3>Sources</h3> section found.")
    body, tail = src[:at], src[at:]
    items = re.findall(r"<li>(.*?)</li>", tail, re.S)
    markers = sorted({int(n) for n in re.findall(r"\[(\d+)\]", body)})
    ok = True
    if markers != list(range(1, len(items) + 1)):
        print(f"FAIL markers {markers[:5]}..{markers[-5:]} do not match {len(items)} sources")
        ok = False
    cache = {}
    for i, it in enumerate(items, 1):
        links = re.findall(r'href="([^"]+)"', it)
        if not links:
            print(f"FAIL [{i}] no link"); ok = False; continue
        url = html.unescape(links[0])
        base, _, frag = url.partition("#")
        if base not in cache:
            cache[base] = fetch(base)
        status, text = cache[base]
        if status != 200:
            print(f"FAIL [{i}] HTTP {status} {base}"); ok = False; continue
        m = re.match(r":~:text=([^&]+)", frag)
        if m:
            phrase = urllib.parse.unquote(m.group(1).split(",")[0])
            if norm(phrase) not in norm(text):
                print(f"FAIL [{i}] phrase not on page: {phrase!r}"); ok = False; continue
            print(f"ok   [{i}] {base}  -> \"{phrase}\"")
        else:
            print(f"ok   [{i}] {base}  (no text fragment{'; ' + frag if frag else ''})")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    if len(sys.argv) == 4 and sys.argv[1] == "--link":
        print(frag_link(sys.argv[2], sys.argv[3]))
    elif len(sys.argv) == 2:
        main(sys.argv[1])
    else:
        sys.exit(__doc__)
