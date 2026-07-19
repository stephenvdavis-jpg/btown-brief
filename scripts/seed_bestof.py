#!/usr/bin/env python3
"""Seed data/best-of-reddit.json from the frozen research dataset.

Source: data/bestof-raw.json — a checked-in, untouched copy of
~/Desktop/newsletter/reference/research/02-bestof-data.json (the merged
2023 + 2025 "Best of r/burlington" lists, 310 entries). This script is a
one-time/rerunnable transform, not part of the automated refresh pipeline —
the Tier-1 directory content doesn't change on a schedule, only when Steve
re-runs the research/merge step by hand (e.g. a future 2027 edition).

Adds the optional Seven Days comparison fields (`sevendays_url`,
`sevendays_note`) at both the category and entry level, per Steve's
decision to preserve room for that comparison without scraping Seven Days
now. Every one starts null/empty; fill in by hand later.

Run: python3 scripts/seed_bestof.py
"""

import json
import os
import re

ROOT = os.path.join(os.path.dirname(__file__), "..")
RAW = os.path.join(ROOT, "data", "bestof-raw.json")
OUT = os.path.join(ROOT, "data", "best-of-reddit.json")


def slugify(value):
    value = re.sub(r"[’'\"]", "", value.lower())
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:60] or "entry"


def category_id(title):
    return slugify(title)


def main():
    with open(RAW, encoding="utf-8") as src:
        raw = json.load(src)

    meta = raw["meta"]
    taxonomy = meta["taxonomy"]

    # Group entries by category, preserving the taxonomy's declared order.
    by_category = {cat: [] for cat in taxonomy}
    for entry in raw["entries"]:
        cat = entry["category"]
        by_category.setdefault(cat, []).append(entry)

    seen_ids = set()
    categories = []
    for cat_title in taxonomy:
        entries_raw = by_category.get(cat_title, [])
        if not entries_raw:
            continue
        # Alphabetical within a category, "active"/"comment-suggestion"
        # entries before "2023-only" so the page can default-show the
        # confirmed set and tuck the stale ones into an expander.
        status_rank = {"active": 0, "comment-suggestion": 0, "2023-only": 1}
        entries_raw = sorted(
            entries_raw,
            key=lambda e: (status_rank.get(e["status"], 2), e["question"].lower()),
        )
        cat_id = category_id(cat_title)
        entries = []
        for entry in entries_raw:
            base_id = cat_id + "--" + slugify(entry["question"])
            entry_id = base_id
            suffix = 2
            while entry_id in seen_ids:
                entry_id = f"{base_id}-{suffix}"
                suffix += 1
            seen_ids.add(entry_id)
            entries.append({
                "id": entry_id,
                "question": entry["question"],
                "status": entry["status"],
                "notes": entry.get("notes"),
                "sevendays_url": None,
                "sevendays_note": None,
                "sources": [
                    {
                        "year": s["year"],
                        "thread_url": s["thread_url"],
                        "label": s["label"],
                    }
                    for s in entry["sources"]
                ],
            })
        categories.append({
            "id": cat_id,
            "title": cat_title,
            "sevendays_url": None,
            "sevendays_note": None,
            "counts": {
                "active": sum(1 for e in entries if e["status"] in ("active", "comment-suggestion")),
                "2023_only": sum(1 for e in entries if e["status"] == "2023-only"),
                "total": len(entries),
            },
            "entries": entries,
        })

    output = {
        "generated": meta["generated"],
        "note": (
            "Tier 1: a categorized directory of recurring “best X” questions "
            "r/burlington has already asked, merged from the 2023 and 2025 community "
            "list threads. Each entry links straight to its Reddit thread(s) — the "
            "actual crowd answer lives in that thread's comments, one click away. "
            "No named-winner extraction here by design; see SUMMARY-best-of-reddit.md."
        ),
        "sources": raw["meta"]["sources"],
        "counts": raw["meta"]["counts"],
        "categories": categories,
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as dst:
        json.dump(output, dst, indent=2, ensure_ascii=False)
        dst.write("\n")

    total = sum(c["counts"]["total"] for c in categories)
    print(f"wrote {OUT}: {len(categories)} categories, {total} entries")


if __name__ == "__main__":
    main()
