#!/usr/bin/env python3
"""
Refresh the one monthly number in the housing-page rent snapshot: the Zillow
Observed Rent Index (ZORI) tile in data/housing.json (the stat with
"key": "zori"). The two HUD Fair Market Rent tiles change once a year and
stay hand-updated.

Source: Zillow's public research CSV (keyless, free to republish with the
"Zillow Observed Rent Index (ZORI)" attribution the tile already carries):
  https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_month.csv
We read the "Burlington, VT" metro row, take the latest month, and compute
the year-over-year change from the value twelve months earlier.

Contract (same as the other refreshers): on any failure — fetch error,
row/column not found, unparseable value — data/housing.json is left exactly
as-is and the script exits 0, so the workflow simply finds nothing to commit
and the last good number keeps showing.

Run:  python3 scripts/refresh_rent.py
"""

import csv
import io
import json
import os
import sys
import urllib.request
from datetime import datetime

ZORI_CSV = ("https://files.zillowstatic.com/research/public_csvs/zori/"
            "Metro_zori_uc_sfrcondomfr_sm_month.csv")
REGION = "Burlington, VT"
UA = "btownbrief.com housing page (stephenvdavis@gmail.com)"
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "housing.json")


def fetch_csv():
    req = urllib.request.Request(ZORI_CSV, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def month_columns(header):
    """Indexes of the YYYY-MM-DD date columns, in file order (chronological)."""
    cols = []
    for i, name in enumerate(header):
        try:
            datetime.strptime(name, "%Y-%m-%d")
            cols.append(i)
        except ValueError:
            continue
    return cols


def burlington_snapshot(text):
    """(latest_rent_float, yoy_percent_or_None, 'Month YYYY') for Burlington."""
    reader = csv.reader(io.StringIO(text))
    header = next(reader)
    region_col = header.index("RegionName")
    date_cols = month_columns(header)
    if not date_cols:
        raise ValueError("no date columns in ZORI CSV")

    row = next((r for r in reader if r[region_col].strip() == REGION), None)
    if row is None:
        raise ValueError(f"{REGION!r} not found in ZORI CSV")

    # Walk newest-first to the last month this metro actually reports.
    latest_idx = next((i for i in reversed(date_cols) if row[i].strip()), None)
    if latest_idx is None:
        raise ValueError(f"no rent values for {REGION!r}")
    latest = float(row[latest_idx])
    month_label = datetime.strptime(header[latest_idx], "%Y-%m-%d").strftime("%B %Y")

    # Value from ~12 months earlier for the year-over-year figure.
    order = date_cols.index(latest_idx)
    yoy = None
    if order >= 12:
        prior_idx = date_cols[order - 12]
        if row[prior_idx].strip():
            prior = float(row[prior_idx])
            if prior:
                yoy = (latest - prior) / prior * 100
    return latest, yoy, month_label


def build_tile(latest, yoy, month_label):
    value = f"${latest:,.0f}/mo"
    if yoy is None:
        label = "Typical asking rent, Burlington metro"
    else:
        label = f"Typical asking rent, Burlington metro ({yoy:+.1f}% in a year)"
    return {
        "value": value,
        "label": label,
        "source": f"Zillow Observed Rent Index (ZORI), {month_label}",
    }


def main():
    try:
        latest, yoy, month_label = burlington_snapshot(fetch_csv())
        tile = build_tile(latest, yoy, month_label)
    except Exception as exc:  # noqa: BLE001 — keep-last-good on any failure
        print(f"rent refresh skipped ({exc}); housing.json unchanged", file=sys.stderr)
        return 0

    with open(OUT, encoding="utf-8") as f:
        data = json.load(f)
    stats = (data.get("rent") or {}).get("stats") or []
    target = next((s for s in stats if s.get("key") == "zori"), None)
    if target is None:
        print("no zori tile in housing.json; nothing to update", file=sys.stderr)
        return 0

    if all(target.get(k) == v for k, v in tile.items()):
        print(f"ZORI already current ({tile['value']}, {month_label}).")
        return 0

    target.update(tile)
    data["updated"] = datetime.now().date().isoformat()
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"updated ZORI tile: {tile['value']} ({month_label}).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
