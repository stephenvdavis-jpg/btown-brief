# The Sunset Page — build notes (feat/sunset)

`sunset.html` — a dedicated Lake Champlain sunset tracker. The hero **is** the
forecast: the sky gradient, glow, and cloud bands are painted from tonight's
computed score and cloud mix, so a 9 looks molten and a 2 looks like dishwater
before you read a single number.

## What's on the page

- **Tonight's score (0–10) + confidence chip + verdict** ("GO OUTSIDE NOW" /
  "Worth a walk" / "Skip it tonight"), recomputed from live data on every load
  and ticking through the evening. After sunset + 20 min the hero flips to
  tomorrow's outlook.
- **Timing rail**: countdown (per-second inside the last 90 min), golden hour
  (sunset − 45 min), and a "leave downtown by" line (sunset − 25 min ≈ 15-min
  walk from Church St + time to claim a spot; between leave-by and sunset it
  switches to "Hustle — you can still make Battery Park").
- **Vitals**: air temp, lake temp with the can-you-stand-in-it verdict
  (USGS Burlington gage), wind at the waterfront.
- **Factor breakdown** ("the forecast, shown working") — every factor with its
  delta, a signed bar, and a plain-language explanation, so readers learn to
  read the sky themselves.
- **Best spots**: 8 seeded viewing spots, re-ranked live by community upvotes
  (one per visitor per spot, same identity key as the games).
- **Gallery**: 6 of Stephen's shots seeded (picked from ~54 in
  `~/Desktop/Newsletter photos` by visual triage), rendered from
  `data/sunset-gallery.json`. Submission stub: form → Supabase moderation
  queue, plus the existing mailto and Google Form as file paths.
- **"Was tonight actually good?"** — 1–5 one-tap rating, open from 15 min
  before sunset to 4 h after, stored **with the score we predicted** — the
  seed of the self-correcting loop. An accuracy table ("How honest is this
  thing?") renders once ratings exist.
- Full OG/Twitter meta with a 1200×630 crop of the best photo, so shared
  links unfurl properly.

## How the score works (the rationale)

A sunset is light hitting the underside of clouds; the score starts at 5.0
(a clear Champlain evening with the Adirondack silhouette is never a zero)
and moves:

| Factor | Range | Why |
|---|---|---|
| High-cloud canvas (high + 0.6·mid) | 0 → +2.5 | 30–55% cirrus/altocumulus is the classic banger deck; ~0% = clean but plain; >90% smothers the sun |
| Low cloud deck | 0 → −7 | The killer: a low wall blocks the light path to the horizon (power 1.6 so a full deck is fatal, scattered isn't) |
| Humidity at sunset | 0 → −1.5 | Muggy air scatters color to milk (penalty ramps 65→90% RH) |
| Visibility | +0.5 → −2 | ≥24 km = Champlain-crystal bonus; <10 km haze penalty |
| Rain chance at sunset | −3 · pop | Proportional, never fatal — showers can set up rainbow skies |
| Air quality | 0 / −0.5 / −1.5 / −3.5 | AQI bands; copy notes thin smoke can deepen reds while thick smoke kills |
| Post-frontal air | +0.75 | Regex over the NWS forecast-discussion text for front-passage + drier-airmass language — Burlington's classic setup |

**Confidence** (High/Medium/Low) comes from lead time (<3 h = tight), NWS vs.
Open-Meteo cloud agreement, model rain spread (from `models` in latest.json),
and data freshness; the "why" is spelled out under the factor list.

**Data**: `data/weather/latest.json` (existing hourly pipeline — NWS, AirNow,
USGS, AFD, sun times) + a live client-side Open-Meteo call for the one thing
the pipeline lacks: **cloud layers** (low/mid/high) and visibility. Client-side
Open-Meteo is the established pattern here (`js/sun.js`, `js/weather.js`).
If Open-Meteo is down, the score degrades to NWS total sky cover and says so;
confidence is capped.

## Community backend

`db/sunset.sql` (drafted by Codex, reviewed) — run once in the Supabase SQL
editor of the shared games project. Creates spot votes, nightly ratings
(rating + predicted, PK night+voter), and the photo moderation queue, all
RPC-only like `db/quick-wins.sql`. **Until it runs, every community feature
no-ops silently** — the page is fully functional without it.

Moderation ritual: approved photos are added by hand to
`data/sunset-gallery.json` + `assets/img/sunset/`; the queue is just intake.

## Preview overrides (for testing/screenshots)

- `?ssmin=38` — pretend it's 38 min before sunset (negative = after)
- `?sscore=9.2` — force the score (sky + verdict follow)

## Verification performed

- Page loads on live data (localhost): score 5.8/Medium for tonight
  (Jul 10 — clear post-frontal night, 0% canvas: sane read), countdown/golden/
  leave-by all consistent with the 8:38 PM sunset, vitals correct (82°/74°/9 mph),
  AQI-smoke and post-frontal factors both firing, spots + gallery + form render.
- Codex browser run covering forced-score skies, verdict labels, the
  post-sunset tomorrow-flip + rating card, 390 px mobile, and dark mode
  (see report in the session scratchpad; results summarized in the PR/handoff).
- SQL not executed anywhere — it's a file, nothing deployed.

## Data gaps & honest limitations

- **No cloud-base height or horizon-gap detection.** The famous "sun slips
  under the deck at the last second" effect needs cloud-base + a clear gap on
  the NW horizon; no free source gives this cleanly. The AFD regex is a crude
  proxy for airmass quality.
- **Smoke is AQI at the surface**, not an aloft-smoke column; a high smoke
  layer with clean surface air will be under-penalized.
- **Predictions are only logged when someone rates.** There's no nightly
  server-side snapshot of the predicted score; the `predicted` value rides in
  with each rating (computed client-side at rating time from that hour's
  data — consistent enough for tuning). A tiny addition to
  `refresh_weather.py` could log a canonical nightly prediction later.
- Lake temp is the Burlington USGS gage (surface, harbor) — fine for
  "can I stand in it," not beach-specific.
- Golden hour is a flat sunset−45 min, not solar-elevation math. Close enough
  in Burlington summer; drifts a bit in winter.
- `walk_min` on spots is from the top of Church Street, eyeballed from maps.

## Open questions (for Stephen)

1. **Run `db/sunset.sql`** in the Supabase SQL editor when ready — votes,
   ratings, and the photo queue light up with zero code changes.
2. The 6 seeded photos are my picks from your folder (plus `IMG_9737` — the
   otter-sculpture crowd shot — as a strong alternate). Swap/add freely in
   `data/sunset-gallery.json`; dates are null until you fill them in.
3. OG image is a 1200×630 crop of the willow-silhouette shot — confirm you're
   happy with that as "the" share image.
4. Where should the page live in the nav? It's linked from nowhere yet;
   obvious candidates: header of weather.html, the sunset life-score card, and
   the index header. Left unlinked on purpose pending your call.
5. The rating emojis (🌫️🌥️🌇🌅🌋) — keep or swap for plain 1–5?
6. Newsletter tie-in: the score could be quoted in the weather section the
   same way the life scores are — say the word and I'll wire it into the
   weather-brain prompt.
