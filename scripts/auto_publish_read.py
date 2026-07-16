#!/usr/bin/env python3
"""
Auto-publish the morning weather read if Stephen hasn't approved it yet.

Runs from a scheduled Action just before 9 AM Burlington time. The manual
flow (scripts/approve_read.py) still works and still wins: if today's draft
is already approved, or read.json already carries today's date, this script
does nothing. It only promotes a draft that would otherwise miss the morning.

Unlike approve_read.py this never edits and never prompts — it publishes the
drafted text verbatim, so the site always has a same-day read by 9.
"""

import json
import os
import sys
from datetime import datetime, timezone

ROOT = os.path.join(os.path.dirname(__file__), "..")
DRAFT = os.path.join(ROOT, "data", "weather", "read-draft.json")
READ = os.path.join(ROOT, "data", "weather", "read.json")


def main():
    if not os.path.exists(DRAFT):
        print("No draft file — nothing to publish.")
        return
    with open(DRAFT) as f:
        draft = json.load(f)

    if draft.get("status") == "approved":
        print(f"Draft for {draft.get('date')} already approved — nothing to do.")
        return
    text = (draft.get("text") or "").strip()
    if not text:
        print("Draft has no generated text — leaving for manual review.")
        return

    if os.path.exists(READ):
        with open(READ) as f:
            current = json.load(f)
        if current.get("date") == draft.get("date"):
            print(f"read.json already carries {draft['date']} — nothing to do.")
            return

    read = {
        "date": draft["date"],
        "text": text,
        "approved_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "edited": False,
        "auto_published": True,
    }
    with open(READ, "w") as f:
        json.dump(read, f, indent=1, ensure_ascii=False)
    draft["status"] = "approved"
    with open(DRAFT, "w") as f:
        json.dump(draft, f, indent=1, ensure_ascii=False)
    print(f"Auto-published read for {read['date']}.")


if __name__ == "__main__":
    sys.exit(main())
