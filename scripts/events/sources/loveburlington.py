"""Love Burlington (loveburlington.org) — downtown Burlington's event calendar.

The /events page embeds a Time.ly ("Timely") calendar widget
(https://calendar.time.ly/vfaca7kw). The widget is an Angular SPA, so we call
the JSON API it uses, with the public API key shipped inside the widget's own
JS bundle (calendar.time.ly/<ver>/main.js):

    GET https://timelyapp.time.ly/api/calendars/info?url=<calendar url>
        -> resolves the numeric calendar id (54705107)
    GET https://timelyapp.time.ly/api/calendars/<id>/events
        ?group_by_date=1&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&per_page=&page=
        (header X-Api-Key: <key>)

The API returns one instance per occurrence date for recurring series
(verified: "Pub Hour", "The Ultimate Chocolate Tasting" appear under each
date). Long multi-day spans (exhibits, camps) come back once under their
start date; we expand those to one occurrence per day inside the window —
verified honest because single-day API queries return the span for any date
inside it. Expanded middle days are emitted as all-day (we only know the
span's opening/closing datetimes, not per-day hours).

`cost` is used verbatim when present; `cost_display` is a widget settings
code, NOT a price, and is ignored. free=True only from an explicit
"Free Event" category. Note: loveburlington.com (.com) is an unrelated
parked domain; the org's site is .org and briefly refused connections
during development — transient, retried fine.
"""
from __future__ import annotations

import re
import sys
import urllib.parse
from datetime import date, datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).parents[1]))
import common
from common import TZ, log, make_event

SOURCE = "loveburlington"
LABEL = "Love Burlington"

CAL_URL = "https://calendar.time.ly/vfaca7kw"
API_BASE = "https://timelyapp.time.ly/api"
# Public key embedded in the Time.ly widget bundle (main.js: apiKey:"...").
API_KEY = "c6e5e0363b5925b28552de8805464c66f25ba0ce"
CAL_ID = 54705107          # "Love Burlington Calendar" (fallback if info fails)
PER_PAGE = 50
MAX_PAGES = 30

_HDRS = {"X-Api-Key": API_KEY, "Accept": "application/json"}

# "Free with admission/membership" is conditional, not free — block
# common.parse_price from flagging it free off the bare word "free".
_CONDITIONAL_FREE = re.compile(r"\bfree\s+(with|for\s+member)", re.I)

# Time.ly taxonomy_category title -> our category (unambiguous ones only;
# the rest fall through to common.classify()). "Free Event" is handled as
# the free flag, not a category.
_CAT_MAP = {
    "live music": "music",
    "family fun": "family",
    "educational": "learning",
    "class": "learning",
    "sports": "sports",
    "art": "art",
    "food": "food-drink",
    "drink": "food-drink",
}


def _calendar_id() -> int:
    try:
        info = common.fetch_json(
            API_BASE + "/calendars/info?url=" + urllib.parse.quote(CAL_URL, safe=""),
            headers=_HDRS)
        return int(info["data"]["id"])
    except Exception as e:
        log(f"  [{SOURCE}] calendar info lookup failed ({e}); "
            f"using cached id {CAL_ID}")
        return CAL_ID


def _fetch_items(cal_id: int, lo: date, hi: date) -> list[dict]:
    items: list[dict] = []
    for page in range(1, MAX_PAGES + 1):
        params = urllib.parse.urlencode({
            "group_by_date": 1, "start_date": lo.isoformat(),
            "end_date": hi.isoformat(), "per_page": PER_PAGE, "page": page,
        })
        data = common.fetch_json(
            f"{API_BASE}/calendars/{cal_id}/events?{params}", headers=_HDRS)["data"]
        for evs in (data.get("items") or {}).values():
            items.extend(evs)
        if not data.get("has_next"):
            break
    else:
        log(f"  [{SOURCE}] WARNING: hit {MAX_PAGES}-page safety cap")
    log(f"  [{SOURCE}] {len(items)} instances (API total {data.get('total')})")
    return items


def _parse_local(s: str, tz) -> datetime:
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=tz)


def _venue(item: dict):
    """(venue, address, town) from the taxonomy_venue attached to the item."""
    vx = (item.get("taxonomies") or {}).get("taxonomy_venue") or []
    if not vx:
        return None, None, None
    v = vx[0]
    town = (v.get("city") or "").strip() or None
    return ((v.get("title") or "").strip() or None,
            (v.get("address") or "").strip() or None,
            town.title() if town else None)


def _cats(item: dict) -> list[str]:
    cx = (item.get("taxonomies") or {}).get("taxonomy_category") or []
    return [(c.get("title") or "").strip() for c in cx]


def _is_allday(item: dict, sdt: datetime, edt: datetime | None) -> bool:
    if item.get("allday"):
        return True
    # Time.ly stores date-only events as 00:00:00 -> 23:59:xx
    return (edt is not None and sdt.time() == datetime.min.time()
            and edt.date() == sdt.date() and (edt.hour, edt.minute) == (23, 59))


def fetch(window_start: date, window_end: date) -> list[dict]:
    cal_id = _calendar_id()
    items = _fetch_items(cal_id, window_start, window_end)

    # ids that occur on >1 distinct date in the window = recurring series
    dates_per_id: dict = {}
    for it in items:
        try:
            dates_per_id.setdefault(it["id"], set()).add(it["start_datetime"][:10])
        except Exception:
            pass

    events: list[dict] = []
    seen: set[tuple] = set()
    for it in items:
        try:
            if it.get("event_status") == "cancelled":
                continue
            key = (it.get("id"), it.get("instance"))
            if key in seen:
                continue
            seen.add(key)

            tz = TZ
            if it.get("timezone"):
                try:
                    tz = ZoneInfo(it["timezone"])
                except Exception:
                    pass
            sdt = _parse_local(it["start_datetime"], tz)
            edt = _parse_local(it["end_datetime"], tz) if it.get("end_datetime") else None

            url = it.get("url") or it.get("canonical_url")
            if not url:
                log(f"  [{SOURCE}] skipped (no url): {it.get('title')!r}")
                continue

            cats = _cats(it)
            category = None
            for c in cats:
                category = _CAT_MAP.get(c.lower())
                if category:
                    break
            free = True if any(c.lower() == "free event" for c in cats) else None
            if _CONDITIONAL_FREE.search(it.get("cost") or ""):
                free = False
            venue, address, town = _venue(it)
            base = dict(
                source=SOURCE, title=it["title"], url=url,
                venue=venue, address=address, town=town,
                price=it.get("cost"), free=free, category=category,
                description=it.get("description_short"),
            )
            allday = _is_allday(it, sdt, edt)

            # ---- multi-day span (exhibit / camp / festival): one per day
            overnight = (edt is not None and edt.date() == sdt.date() + timedelta(days=1)
                         and edt.time() <= sdt.time())
            if edt is not None and edt.date() > sdt.date() and not overnight:
                through = (f"Through {edt.date().strftime('%B')} "
                           f"{edt.date().day}, {edt.date().year}")
                d = max(sdt.date(), window_start)
                while d <= min(edt.date(), window_end):
                    if d == sdt.date() and not allday:
                        events.append(make_event(**base, start=sdt, recurring=through))
                    else:   # per-day hours unknown -> all-day, never guessed
                        events.append(make_event(**base, start=d, recurring=through))
                    d += timedelta(days=1)
                continue

            # ---- single occurrence
            if not (window_start <= sdt.date() <= window_end):
                continue
            recurring = ("Multiple dates" if len(dates_per_id.get(it["id"], ())) > 1
                         else None)
            if allday:
                events.append(make_event(**base, start=sdt.date(), recurring=recurring))
            else:
                events.append(make_event(**base, start=sdt, end=edt,
                                         recurring=recurring))
        except Exception as e:
            log(f"  [{SOURCE}] skipped item {it.get('id')!r}: {e}")
    return events
