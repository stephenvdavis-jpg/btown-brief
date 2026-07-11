#!/usr/bin/env python3
"""Turn locally saved Front Porch Forum material into private tip lines.

FPF is a TIP LINE only: nothing here ever reaches a public page. It reads
digests Stephen saves into data/fpf-digests/ (the emails he receives as a
member) and notes dropped into data/fpf-dropbox/, and appends deduped leads
to data/tips-inbox.md — all gitignored, local-only.
"""

import argparse
from email import policy
from email.parser import BytesParser
import html
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(__file__), "..")
TIPS = os.path.join(ROOT, "data", "tips-inbox.md")
DIGESTS = os.path.join(ROOT, "data", "fpf-digests")
DROPBOX = os.path.join(ROOT, "data", "fpf-dropbox")
PROCESSED = os.path.join(DIGESTS, ".processed")
HEADER = "<!-- PRIVATE — newsletter leads, never publish directly; verify everything independently -->\n"
TAIL = ("Front Porch Forum (PRIVATE tip line — never quote, link, or summarize "
        "publicly; verify independently)")


# ----------------------------------------------------------------------
# Small text helpers
# ----------------------------------------------------------------------

def clean(value):
    return re.sub(r"\s+", " ", value or "").strip()


def strip_html(value):
    return clean(html.unescape(re.sub(r"(?s)<[^>]+>", " ", value or "")))


def first_80(value):
    value = clean(value).replace("*", "")  # asterisks would break the **…** dedup capture
    return value if len(value) <= 80 else (value[:80].rsplit(" ", 1)[0] or value[:80]).rstrip(" ,.;:-") + "…"


def snippet(value, limit=120):
    value = clean(value)
    return value if len(value) <= limit else (value[:limit].rsplit(" ", 1)[0] or value[:limit]).rstrip(" ,.;:-") + "…"


def norm(value):
    return re.sub(r"[^a-z0-9]+", " ", first_80(value).lower()).strip()


# ----------------------------------------------------------------------
# Reading raw digest content (raw HTML preserved — the FPF parser needs it)
# ----------------------------------------------------------------------

def raw_digest(path):
    """Raw content of a digest file: HTML for .html/.eml, text for .txt.
    Kept un-stripped so the structured FPF parser can see the markup."""
    if path.lower().endswith(".eml"):
        with open(path, "rb") as src:
            message = BytesParser(policy=policy.default).parse(src)
        body = (message.get_body(preferencelist=("html",))
                or message.get_body(preferencelist=("plain",)))
        return body.get_content() if body else ""
    with open(path, encoding="utf-8", errors="replace") as src:
        return src.read()


def looks_like_fpf(raw):
    return "frontporchforum" in raw.lower() or "front porch forum" in raw.lower()


# ----------------------------------------------------------------------
# FPF digest parser
#
# FPF renders each neighbor post as a 22px teal <h3> title, then a 14px
# <p><b>Author</b> • Street, Town</p> byline, then a 16px body paragraph.
# Paid ads reuse the same <h3> but carry a "Paid Ad" tag and no byline, and
# the "In This Issue" table of contents / section headers use <h6> or have no
# byline — so both fall out naturally when we require a real byline.
# ----------------------------------------------------------------------

FPF_SEG = re.compile(r"<h3[^>]*font-size:\s*22px[^>]*>(?P<title>.*?)</h3>(?P<seg>.*?)"
                     r"(?=<h3[^>]*font-size:\s*22px[^>]*>|$)", re.S)
FPF_BYLINE = re.compile(r"<p[^>]*font-size:\s*14px[^>]*>\s*<b>(?P<who>.*?)</b>(?P<loc>.*?)</p>", re.S)
FPF_BODY = re.compile(r"<p[^>]*font-size:\s*16px[^>]*>(?P<body>.*?)</p>", re.S)
FPF_EVENT = re.compile(r"<h6[^>]*>\s*<a[^>]*>(?P<title>.*?)</a>\s*</h6>\s*<p[^>]*>(?P<date>.*?)</p>", re.S)


def fpf_items(raw):
    """Return (kind, title, who, body) tuples: kind 'post' for neighbor posts,
    kind 'event' for Community Calendar entries (who holds the date)."""
    items = []
    for seg_match in FPF_SEG.finditer(raw):
        seg = seg_match.group("seg")
        if re.search(r">\s*Paid Ad\s*<", seg[:800]):
            continue  # advertisement, not community chatter
        byline = FPF_BYLINE.search(seg)
        if not byline:
            continue  # structural section (calendar, directory promo, TOC)
        title = strip_html(seg_match.group("title"))
        if not title:
            continue
        who = strip_html(byline.group("who"))
        loc = strip_html(byline.group("loc")).lstrip("•").strip(" •,")
        body_match = FPF_BODY.search(seg)
        body = strip_html(body_match.group("body")) if body_match else ""
        items.append(("post", title, (who + (", " + loc if loc else "")).strip(", "), body))
    calendar = re.search(r"Community Calendar(?P<cal>.*?)(?:Explore Postings|©\s*20|</body>|$)", raw, re.S)
    if calendar:
        for event in FPF_EVENT.finditer(calendar.group("cal")):
            title = strip_html(event.group("title"))
            if title:
                items.append(("event", title, strip_html(event.group("date")), ""))
    return items


# ----------------------------------------------------------------------
# Generic fallback parsers (dropbox notes, non-FPF digests)
# ----------------------------------------------------------------------

def digest_items(value):
    value = strip_html(value) if "<" in value and ">" in value else value
    value = value.replace("\r\n", "\n")
    chunks = re.split(r"\n\s*(?:-{4,}|={4,})\s*\n|(?=^#{1,4}\s+\S)", value, flags=re.M)
    items = []
    for chunk in chunks:
        lines = [clean(line.lstrip("# ")) for line in chunk.splitlines() if clean(line)]
        if not lines:
            continue
        starts = [0] + [i for i in range(1, len(lines)) if
                        (lines[i].isupper() or re.fullmatch(r"(?:[A-Z][^\s]*\s*){2,}", lines[i])) and i + 1 < len(lines)]
        for start, end in zip(starts, starts[1:] + [len(lines)]):
            item = clean(" ".join(lines[start:end]))
            if item:
                items.append(item)
    return items


def dropbox_items(value):
    blocks = re.split(r"\n\s*\n", value.replace("\r\n", "\n"))
    items = []
    for block in blocks:
        bullets = re.findall(r"(?m)^\s*[-*+]\s+(.+)$", block)
        if bullets:
            items.extend(clean(item) for item in bullets if clean(item))
        elif clean(block):
            items.append(clean(block))
    return items


# ----------------------------------------------------------------------
# Lead formatting — (display, dedup key) pairs
# ----------------------------------------------------------------------

def fpf_lead(kind, title, who, body):
    if kind == "event":
        return f"**FPF event: {first_80(title)}** — {who}", norm("event " + title + " " + who)
    display = f"**FPF: {first_80(title)}** — {who}" + (f" · {snippet(body)}" if body else "")
    return display, norm(title + " " + who)


def plain_lead(item):
    return f"**FPF: {first_80(item)}**", norm(item)


def leads_for(path, is_digest):
    if not is_digest:
        return [plain_lead(it) for it in dropbox_items(open(path, encoding="utf-8", errors="replace").read())]
    raw = raw_digest(path)
    if looks_like_fpf(raw):
        return [fpf_lead(*item) for item in fpf_items(raw)]
    return [plain_lead(it) for it in digest_items(raw)]


# ----------------------------------------------------------------------
# Private append-only ingestion
# ----------------------------------------------------------------------

def run():
    try:
        with open(TIPS, encoding="utf-8") as src:
            existing = src.read()
    except OSError:
        existing = HEADER
    known = {norm(match) for match in re.findall(r"\*\*FPF(?: event)?: (.*?)\*\*", existing)}
    try:
        with open(PROCESSED, encoding="utf-8") as src:
            processed = {line.strip() for line in src if line.strip()}
    except OSError:
        processed = set()

    files = []
    if os.path.isdir(DIGESTS):
        files += [(path, True) for path in (os.path.join(DIGESTS, name) for name in sorted(os.listdir(DIGESTS)))
                  if os.path.isfile(path) and os.path.splitext(path)[1].lower() in {".eml", ".txt", ".html"}]
    if os.path.isdir(DROPBOX):
        files += [(path, False) for path in (os.path.join(DROPBOX, name) for name in sorted(os.listdir(DROPBOX)))
                  if os.path.isfile(path) and os.path.splitext(path)[1].lower() in {".md", ".txt"}]

    lines, newly_processed = [], []
    for path, is_digest in files:
        name = os.path.basename(path)
        if is_digest and name in processed:
            continue
        try:
            entries = leads_for(path, is_digest)
        except Exception as exc:
            print(f"could not ingest {name}: {exc}", file=sys.stderr)
            continue
        for display, key in entries:
            if not key or key in known:
                continue
            known.add(key)
            lines.append(f"- [ ] {display} — {TAIL} · from {name}")
        if is_digest:
            newly_processed.append(name)

    if lines:
        os.makedirs(os.path.dirname(TIPS), exist_ok=True)
        with open(TIPS, "w", encoding="utf-8") as dst:
            dst.write(existing.rstrip() + "\n" + "\n".join(lines) + "\n")
    if newly_processed:
        os.makedirs(DIGESTS, exist_ok=True)
        with open(PROCESSED, "a", encoding="utf-8") as dst:
            for name in newly_processed:
                dst.write(name + "\n")
    print(f"added {len(lines)} FPF tips; processed {len(newly_processed)} digest files")
    return 0


# ----------------------------------------------------------------------
# Built-in offline check
# ----------------------------------------------------------------------

def selftest():
    sample = "Neighborhood Cleanup\nBring gloves Saturday morning.\n\n----\n\nLOST CAT\nOrange cat last seen near the park."
    items = digest_items(sample)
    assert len(items) == 2 and items[0].startswith("Neighborhood Cleanup") and items[1].startswith("LOST CAT")
    assert len(first_80("word " * 30)) <= 80
    assert norm("Hello, Neighbor!") == "hello neighbor"

    fpf = ('<div>frontporchforum.com</div>'
           '<h3 style="color: #355768; font-size: 22px; margin: 0 0 8px;">Lost Orange Cat</h3>'
           '<p style="font-size: 14px;"><b>Jane Doe</b>\n•\nMaple St, Burlington</p>'
           '<p style="font-size: 16px; line-height: 1.5;">Last seen near the park, please call.</p>'
           '<h3 style="color: #355768; font-size: 22px;">SkiEssentials Warehouse Sale</h3>'
           '<table><tr><td><a href="x">Paid Ad</a></td></tr></table>'
           '<p style="font-size: 16px;">Big warehouse sale this weekend.</p>'
           '<h3 style="color: #355768; font-size: 22px;">Community Calendar</h3>'
           '<h6><a href="x">World Cup Watch Party</a></h6><p>Jul 11, 2026, 5 PM</p></body>')
    assert looks_like_fpf(fpf)
    items = fpf_items(fpf)
    titles = [t for _, t, _, _ in items]
    assert "Lost Orange Cat" in titles, titles
    assert "SkiEssentials Warehouse Sale" not in titles, "paid ad should be skipped"
    assert any(k == "event" and t == "World Cup Watch Party" for k, t, _, _ in items), "calendar event missing"
    post = next(i for i in items if i[0] == "post")
    assert post[2] == "Jane Doe, Maple St, Burlington", post[2]
    disp, key = fpf_lead(*post)
    assert disp.startswith("**FPF: Lost Orange Cat** — Jane Doe") and "park" in disp
    print("ingest_fpf selftest passed")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser()
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    return selftest() if args.selftest else run()


if __name__ == "__main__":
    sys.exit(main())
