#!/usr/bin/env python3
"""Renumber an entry's footnotes in order of first appearance, keeping Sources and print notes in step.

Usage: python3 saints/tools/renumber_notes.py saints/entries/<file>.html [saints/print/<file>.notes.html]
"""
import re, sys

def main(entry, notes=None):
    s = open(entry, encoding="utf-8").read()
    at = s.index("<h3>Sources</h3>")
    body, tail = s[:at], s[at:]
    items = re.findall(r"<li>.*?</li>", tail, re.S)
    order = []
    for m in re.findall(r"\[(\d+)\]", body):
        k = int(m)
        if k not in order:
            order.append(k)
    unused = [k for k in range(1, len(items) + 1) if k not in order]
    if unused:
        sys.exit(f"Sources never cited: {unused}")
    new = {old: i + 1 for i, old in enumerate(order)}
    body = re.sub(r"\[(\d+)\]", lambda m: f"[{new[int(m.group(1))]}]", body)
    ol = "<ol>\n" + "\n".join(items[k - 1] for k in order) + "\n</ol>\n"
    tail = re.sub(r"<ol>.*</ol>\s*", ol, tail, count=1, flags=re.S)
    open(entry, "w", encoding="utf-8").write(body + tail)
    if notes:
        p = re.findall(r"<li>.*?</li>", open(notes, encoding="utf-8").read(), re.S)
        open(notes, "w", encoding="utf-8").write("<ol>\n" + "\n".join(p[k - 1] for k in order) + "\n</ol>\n")
    print(f"Renumbered {len(order)} notes in reading order")

if __name__ == "__main__":
    main(*sys.argv[1:])
