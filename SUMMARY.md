# Burlington Right Now — build summary (feat/weather)

Turn weather-checking into Burlington life: one page (`weather.html`) that answers
"what's it like out, what should I do about it, and can I swim?" — plus Stephen's
own daily read, drafted automatically and published only after his review.

## What shipped

| Piece | Where |
|---|---|
| Data pipeline (hourly) | `scripts/refresh_weather.py` → `data/weather/latest.json`, `beaches.json` |
| Automation | `.github/workflows/refresh-weather.yml` (hourly :45 + 5:40 AM ET draft run) |
| Dashboard | `weather.html` + `js/life.js` + `js/theme.js` + styles in `css/style.css` |
| Life scores (6 + ski stub) | computed client-side in `js/life.js`, formulas documented in-file |
| Can I Swim board | city ArcGIS beach tracker → `beaches.json` → per-beach 🟢🟡🔴 |
| My Read | `scripts/draft_read.py` (+ `scripts/outlets.py`) → `read-draft.json` queue → `scripts/approve_read.py` → `read.json` |
| Shared weather brain | `prompts/weather-read.md`; newsletter repo's CLAUDE.md + run-edition skill now point at it |
| List-page hooks | teaser strip under the daylight arc + weather-pill menu item |

## Data coverage (all keyless, all verified live 2026-07-10)

- **NWS api.weather.gov** (grid BTV/89,56): KBTV observation (temp/feels/humidity/wind,
  metric→US converted), 7-day + hourly forecast, apparentTemperature & skyCover grid
  layers (joined into the hourly array), active alerts, and the **Area Forecast
  Discussion** — KEY MESSAGES parsed out for the read. 4–5 AFD issuances/day.
- **Lake Champlain recreational forecast** (NWS product `REC`, ~2:30 AM/PM daily
  Apr–Dec): all three lake zones parsed (wind knots, gusts, waves ft per period),
  plus its UV line and USGS gage table. Off-season: issuance stops; a stale product
  (>24 h) renders as "suspended" client-side.
- **USGS 04294500** (Lake Champlain at Burlington): water temp + lake level every
  15 min. Level bands: <99 normal, 99–100 elevated, ≥100 flood (NWS flood stage).
- **AirNow** (keyless `airnowgovapi.com/reportingarea` — the endpoint behind
  airnow.gov): observed AQI from the real Burlington monitor (VT DEC) + the
  forecaster's discussion text. Fallback: Open-Meteo CAMS model AQI. Undocumented
  endpoint — coded defensively, falls back automatically.
- **Open-Meteo**: sunrise/sunset/UV, and the **multi-model spread** (GFS vs ECMWF vs
  ICON daily highs/precip) — the quantitative "where forecasts diverge" signal.
- **City of Burlington beach tracker** (first-party ArcGIS,
  `maps.burlingtonvt.gov/.../BTV_Beach_Status`): per-beach Open/Alert/Closed covering
  BOTH E. coli (sampled Mon+Thu, posted by 11 AM Tue/Fri; closed >235 MPN/100mL) and
  cyanobacteria (visual checks daily from 11 AM in season, posted by noon). N/S
  sample pairs collapse worst-of into the five dashboard beaches. Stale rows (>72 h,
  i.e. off-season) render "no current data". VT DOH cyanobacteria tracker
  (`services.arcgis.com/YKJ5JtnaPQ2jDbX8/...`) verified as a corroborating source but
  not wired in — the city feed already includes cyano status.
- **Outlets for the daily read only** (`scripts/outlets.py`, never load-bearing):
  Weather Underground embedded TWC forecast (also = weather.com's data), WCAX's
  displayed numbers + meteorologist-written discussion, NBC5's latest First Warning
  article headline/lede. AccuWeather is bot-blocked — dropped.

Failure contract everywhere: each section fetches independently; a failure keeps the
last good data (same as `refresh-data.yml`). The site never sees a broken file.

## Life-score formula rationale

All scores: a **feels-like comfort trapezoid** (full credit in an ideal band, sloping
to zero over a slack range) minus activity-specific penalties, clamped 0–10. Verdicts:
8+ great / 6+ good / 4+ fair / else skip. Every card's "why?" drawer shows the actual
terms, so the math is public. Scores recompute per remaining hour of today, which also
yields the "better around 5 PM" / "good until about 9 PM" hints (suggestions confined
to waking hours except open-window).

- **Patio** — ideal feels 64–82. Rain is the killer (weight 7); wind >10 mph steals
  napkins (0.35/mph over); AQ at light exertion (×0.7); dark+cool −2, but warm summer
  nights stay prime time.
- **Sunset** — scored at the sunset hour, not now. 25–65% sky cover is the sweet spot
  (clouds are the canvas: peak at ~40%); bare-clear scores 7.5; overcast decays fast.
  Rain at sunset weight 8; AQI >100 smoke −2 (mutes color); waterfront chill a minor
  −1.5 max.
- **Swimming** — water temp dominates: 72°+ →10, 68+ →8.5, 64+ →6.5, 60+ →4.5, <60
  hard-capped at 3 regardless of the air. Cool shore air up to −4; broad-lake waves ≥2 ft
  −1.5/ft; rain/storm weight 6; after dark −4. Posted advisories live on the swim board
  rather than in this number.
- **Running** — ideal feels 42–64 (runners run warm). Dewpoint is the honest misery
  index: −0.25/degree over 55 (cap 4). AQ gets the biggest exertion multiplier (×1.5).
  Light rain barely matters (weight 3).
- **Open-window** — evaluated over the next ~14 h (the overnight is the point): outside
  temp 55–68 (sleep-science band), dewpoint over 60 = sticky air (−0.3/deg, cap 3.5),
  rain blowing in (5), smoke coming in (×1.3).
- **Dog-walk** — wide band (feels 35–75; dogs love brisk). Hot-pavement paw risk: sunny
  + ≥85° + daylight = −2.5. Rain 5, AQ ×1.0.
- **Ski** — stubbed card ("back this winter"); slot reserved in `SCORE_META`/render.

## My Read + review queue

Morning Action run (5:40 AM ET) builds a source packet (NWS + AFD + lake + gage +
model spread + AQI + WU/WCAX/NBC5) and, when the `ANTHROPIC_API_KEY` secret exists,
drafts the report per `prompts/weather-read.md` — hook first, casual numbers, model
divergence as story, practical closing call, 90–180 words. The draft lands in
`data/weather/read-draft.json` (committed, but **never displayed**). Approval:
`python3 scripts/approve_read.py [--edit] [--push]` promotes it to
`data/weather/read.json`, which the page shows with its approval timestamp. A draft
written from today's live packet is sitting in the queue now as a worked example.

**One weather brain:** the newsletter pipeline (`~/Desktop/newsletter`) step 6 now
reads `latest.json` + the approved `read.json` + the same prompt file before adding
its WCAX/NBC5 gathers — dashboard and newsletter can't disagree.

## Verification performed

- `refresh_weather.py` run repeatedly: 10/10 sections fresh, real values spot-checked
  against sources (81° KBTV obs, lake 70°/96.65 ft matching the REC product's own gage
  table, AQI 56 Moderate = wildfire smoke day, Euro-vs-GFS precip divergence 93% vs 25%).
- `outlets.py` and `draft_read.py` run live; packet verified complete; no-key fallback
  produces a packet-only draft as designed.
- Page verified in Chrome on localhost: hero stats, sun arc, sources row, My Read
  render; why-drawer toggles with correct term breakdowns; swim board shows all five
  beaches green with today's sample times; dark mode; footer strip (Ko-fi/newsletter/
  about) and attribution. No console errors. Mobile relies on the same ≤560px
  media-query patterns as the rest of the site (the browser extension wouldn't shrink
  below ~1450px to eyeball it).
- `data/weather/read.json` intentionally absent from the branch: the section stays
  hidden until Stephen approves his first read.

## Open questions

1. **Publish cadence of commits** — hourly data commits will dominate the repo history
   (like refresh-data already does). Fine, or want the weather Action squashed/less
   frequent overnight?
2. **First approved read** — a demo draft is queued for 2026-07-10; run
   `python3 scripts/approve_read.py --edit` to review/publish it (or discard).
3. **ANTHROPIC_API_KEY secret** — add it in repo Settings → Secrets to get generated
   drafts each morning (suggested model set via `WEATHER_READ_MODEL`, default
   claude-sonnet-5; the prompt is the quality lever). Without it the queue still fills
   with packets.
4. **Model divergence in the header?** — right now the spread only feeds the read.
   Could add a small "models disagree today" badge when high-spread ≥5° or PoP spread
   ≥40.
5. **VT DOH tracker as second opinion** — worth wiring in as a "state says" column if
   the city feed ever lags (it froze once before, winter 2025).
6. **Ski slot** — winter data sources to line up: Bolton/Smuggs/Stowe snow reports
   (scrape-hostile), NOHRSC snow depth, VT ski areas association feed. Decide the
   season's sources before December.
7. **weather.html discoverability** — teaser + pill menu now; want a proper nav tab
   ("Right Now") next to The List / Guides instead?
