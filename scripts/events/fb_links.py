#!/usr/bin/env python3
"""Open (or print) the 7 Facebook city discover pages for an event window.

Facebook is login-walled, so the events pipeline never scrapes it — instead you
open these pages in YOUR logged-in Chrome, run Easy Scraper on each, and drop the
CSVs into data/events/imports/facebook/ (see that folder's README).

Usage:
  python3 scripts/events/fb_links.py            # open a new Chrome window, next 30 days
  python3 scripts/events/fb_links.py --days 60  # wider window
  python3 scripts/events/fb_links.py --print     # just print the URLs, don't open
  python3 scripts/events/fb_links.py --start 2026-08-01 --end 2026-08-31
"""
from __future__ import annotations

import argparse
import subprocess
from datetime import date, timedelta

# location_id per city — from the newsletter pipeline (edition_links.py).
CITIES = [
    ("Burlington", "112673872077767"),
    ("South Burlington", "104067936295520"),
    ("Shelburne", "104330269602994"),
    ("Williston", "104022752967049"),
    ("Essex Junction", "112631562083722"),
    ("Winooski", "111971618819845"),
    ("Colchester", "109526772398915"),
]

TEMPLATE = (
    "https://www.facebook.com/events/?date_filter_option=CUSTOM_DATE_RANGE"
    "&discover_tab=CUSTOM&end_date={end}T05:00:00.000Z"
    "&location_id={loc}&start_date={start}T05:00:00.000Z"
)


def build(start: str, end: str):
    return [(name, TEMPLATE.format(start=start, end=end, loc=loc))
            for name, loc in CITIES]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=30, help="window length (default 30)")
    ap.add_argument("--start", help="YYYY-MM-DD (default: today)")
    ap.add_argument("--end", help="YYYY-MM-DD (default: start + days)")
    ap.add_argument("--print", dest="print_only", action="store_true",
                    help="print URLs instead of opening Chrome")
    args = ap.parse_args()

    start = args.start or date.today().isoformat()
    end = args.end or (date.fromisoformat(start) + timedelta(days=args.days)).isoformat()
    links = build(start, end)

    print(f"Facebook event windows {start} → {end}:\n")
    for name, url in links:
        print(f"# {name}\n{url}\n")

    if args.print_only:
        return
    # open all 7 in one new Chrome window (uses your logged-in profile)
    subprocess.run(["open", "-na", "Google Chrome", "--args", "--new-window",
                    *[u for _, u in links]], check=False)
    print("Opened 7 tabs in a new Chrome window. Run Easy Scraper on each, then "
          "drop the CSVs into data/events/imports/facebook/.")


if __name__ == "__main__":
    main()
