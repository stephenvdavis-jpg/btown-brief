# Housing Hub + Jobs Added This Week — build notes

Branch: `feat/housing-jobs` · Pages: `housing.html`, `jobs.html`
(This file follows the `SUMMARY-restaurants.md` precedent — the repo's root
`SUMMARY.md` belongs to the weather dashboard.)

## What shipped

### housing.html — the housing hub
- **Property-manager directory: 24 companies**, every listings link and
  contact link verified live on 2026-07-10 (HTTP checked + content
  confirmed). Where a company publishes a real email, the contact action is
  a direct `mailto:` — the page's whole premise is "email the manager."
  16 of 24 have direct email; the rest link to their contact page. Filter
  chips: downtown / near campus / affordable / big portfolios / small &
  local.
- **Links layer: 10 sources** (Zillow, Apartments.com, Craigslist, FB
  Marketplace, two FB groups, Front Porch Forum, UVM Off-Campus Housing,
  Seven Days Classifieds, PadMapper), each with an honest one-liner and a
  gotcha (scam warnings on Craigslist/FB). Front Porch Forum is link-only
  by design and never scraped.
- **Rent snapshot instead of live Rent Watch** — see terms notes below.
  Three tiles: ZORI typical asking rent ($2,095/mo, May 2026, +1.6% YoY)
  and HUD FY2026 fair-market 1BR ($1,651) / 2BR ($2,140). Hand-updated in
  `data/housing.json`; the ZORI tile carries the required Zillow
  attribution in its source line.

### jobs.html — added this week
- Newest Burlington-area postings (title, employer, pay when listed,
  posted date, direct link) from five sources via `scripts/refresh_jobs.py`,
  refreshed Mon/Wed/Fri by `.github/workflows/refresh-jobs.yml`
  (keep-last-good per source, commit-if-changed, same contract as the
  weather refresh).
- Auto-expire twice over: the script prunes postings older than 21 days,
  and `js/jobs.js` hides anything older than 14 days client-side, so a
  stalled Action can never leave stale "new" jobs up.
- Filters: city & state / no degree needed / $25+/hr / weekend / seasonal —
  chips hide themselves in weeks when no posting carries the tag (tag
  heuristics documented in the script).
- "Go straight to the big employers" row: UVMMC, UVM, State of VT,
  GlobalFoundries, Dealer.com/Cox.

## Directory completeness

High confidence every entry is real, active, and managing residential
rentals in Chittenden County. Named candidates that were researched and
deliberately **dropped**: Coburn & Feeley (folded into Full Circle 2019),
Neville Companies and Pomerleau (commercial-only), Hickok & Boardman and
Flat Fee (sales brokerages), Vermont Rental Solutions (central VT),
Green Mountain PM (no Chittenden operation), Buchanan Rentals (no trace),
"Simply Better" (TX/NY brand — the local operation is Rieley Properties,
included). Known gap: mom-and-pop landlords who only post to
Craigslist/Zillow/FPF, and single-building leasing offices run by
out-of-state managers (Riverhouse and Cascades in Winooski, parts of
Cambrian Rise) — a possible "notable buildings" follow-up pass.

## Source terms notes

- **Scraped (feed-friendly): Seven Days Jobs** — their own UI exposes the
  WordPress `job_feed` RSS; syndication is what RSS is for. **UVM** —
  PeopleAdmin's built-in Atom feed. **State of Vermont** — public
  server-rendered career-site HTML. **UVM Med Center** — SEO
  recruitment-marketing site emitting schema.org JobPosting JSON-LD (built
  to be machine-read). All fetched once per run with an identified UA;
  we store title/employer/pay/date/link only, never descriptions.
- **City of Burlington (governmentjobs.com/NEOGOV)** — public government
  job board fetched via the site's own XHR endpoint, one request per run.
  NEOGOV's platform ToS frowns on automated access, so this is the one
  gray-zone source; volume is 3 requests/week with links straight back to
  them. Drop it if they ever object — the city posts to Seven Days too.
- **Link-only, never scraped: Craigslist** (ToS explicitly prohibits, and
  they litigate; RSS is dead) and **Indeed** (no public API, Cloudflare 403s
  scrapers, ToS prohibits). **Front Porch Forum** link-only per Stephen's
  standing rule.
- **Rent Watch verdict**: live listing counts / new-since-yesterday deltas
  would require scraping Zillow, Apartments.com or Craigslist — all three
  expressly prohibit automated access, and CoStar (Apartments.com) actively
  litigates. Shipped instead: a monthly snapshot from Zillow Research ZORI
  (free to republish with attribution) and HUD Fair Market Rents (public
  domain). ZORI updates monthly ~2–3 weeks after month end; HUD annually
  (FY2026 effective Oct 1 2025).

## Verification

Both pages were rendered against a local server (`python3 -m http.server`)
with real data, via Chrome (screenshots + DOM probes) and headless Chrome
(`--headless=new --dump-dom`, i.e. post-JavaScript output):

- **housing.html**: 24 manager cards, 16 direct-email actions (+1
  note-card mailto), 23 phone links, 10 source cards with gotchas, 3 rent
  tiles, footer strip injected, two-column grid at ≥720px, single-column
  mobile confirmed by screenshot.
- **jobs.html**: 29 of 30 postings render (one aged past the 14-day
  client window and was correctly hidden — the auto-expire works), 7 pay
  badges, "Last checked Friday, July 10" stamp, 5 employer cards, footer
  strip injected, and the Weekend chip correctly hid itself (no
  weekend-tagged postings this week) while city/no-degree/$25+/seasonal
  stayed.
- **refresh_jobs.py** ran repeatedly against the live endpoints: a full
  30 postings with all five sources contributing (the exact per-source
  split shifts run to run — UVM is the largest, City of Burlington carries
  the pay data, UVMMC settles to its couple of genuinely-recent postings
  once older ones age past 21 days). `py_compile`/`node --check` clean;
  field contract validated against what `js/jobs.js` consumes.
- No repo test suite or linters exist; nothing else to run.
- **Desktop-width visual pass (done, Opus session)**: full-page 1280px
  screenshots of both pages — two-column directory, rent strip, job rows
  with green pay badges and coral "today" markers all render as intended.

## Independent review & fixes (Opus 4.8 session)

An independent Codex (GPT-5.6 Sol) read-only review of the whole branch
diff raised 10 findings; the substantive ones were fixed and re-verified:

- **Security (the important one):** job/listing/source URLs now pass a
  scheme allowlist before being rendered as `href`s (http(s) for links,
  plus mailto for contacts). `esc()` escapes markup but does **not**
  neutralize a `javascript:`/`data:` URL — and since `refresh_jobs.py`
  ingests external feed content, an unescaped link was a latent stored-XSS
  path. Verified the allowlist blocks `javascript:`/`data:`/null in all
  casings while passing every real link (0 blocked on the live data).
- **`refresh_jobs.py` correctness:** recognize `Posted yesterday` (was
  raising and silently failing the *entire* City source — the only source
  with pay — on most runs, since "yesterday" is the commonest posting age);
  a single unparseable City item now skips itself instead of the source;
  removed a UVMMC ref "watermark" that permanently skipped jobs it had
  never actually fetched (UVMMC coverage improved from 2 to its true
  recent set); the 30-row cap no longer evicts carried-forward rows from a
  *failed* source, so keep-last-good actually holds; dates truncate to the
  Burlington day and the 21-day cutoff is Burlington-local; dedupe prefers
  the newest posting.
- **`jobs.js`:** age is now whole-calendar-day math in Burlington's zone
  (the old noon/elapsed-ms math made "today" and the 14-day expiry depend
  on the viewer's clock and timezone); stable sort comparator; guards
  against non-array / null-element data.
- **`housing.js`:** `String(phone)` guard; `Array.isArray` guards; the
  load-error handler now clears every loading region, not just the
  directory.
- **Documented, not changed** (finding #5): the per-source fetch treats
  "one item parsed" as success, so a future upstream markup change that
  leaves a single recognizable item could commit a near-empty source set
  rather than falling back. A robust fix needs per-source sharp-drop
  thresholds (legit volumes differ a lot); deferred as over-engineering
  for now. Keep-last-good still covers total failure and per-item errors.

Re-verified after the fixes: `refresh_jobs.py` runs clean twice (5/5
sources, 30 postings, no rows older than 21 days), both JS files pass
`node --check`, and both pages render correctly headless.

## Provenance (Fable 5 → Opus 4.8 handoff)

Stephen's weekly Fable 5 quota ran out mid-build (2026-07-10); the work
was finished under **Opus 4.8** (resets Sunday 2026-07-12 4pm, may get a
later Fable pass). **Fable-era:** the two pages, all research, the
`data/*.json`, and `refresh_jobs.py` (Codex-written from a Fable spec;
diff inspected, output validated). **Opus-4.8-era:** the independent Codex
review, the desktop visual pass, and the review-driven fixes above
(commit `0415150`, trailer `Co-Authored-By: Claude Opus 4.8`).

## Decisions on the open questions (Opus 4.8, Stephen said "use your best judgment")

1. **Nav linking — DONE.** Added "🏠 Find Housing" and "💼 Jobs This Week"
   as the first two cards in index.html's "Get into Burlington life"
   community-card grid (the site's own pattern for surfacing standalone
   pages — same as volunteer/clubs/projects). Put them first because
   apartment- and job-hunters check daily and are high-intent. The pages
   also cross-link each other + index in their header nav.
2. **NEOGOV gray zone — KEEP the City auto-fetch.** It's a public
   government job board, one gentle XHR request per run (3×/week), links
   straight back to them, stores only metadata — and it's the *only*
   source with salary data. If NEOGOV ever objects, drop `fetch_city` from
   `SOURCES`; the city also posts to Seven Days, which we already read.
3. **Rent upkeep — AUTOMATED the ZORI tile.** New `scripts/refresh_rent.py`
   + `.github/workflows/refresh-rent.yml` pull the Burlington-metro ZORI
   number monthly (20th) and update just that tile, keep-last-good, Zillow
   attribution preserved. Verified live: it independently reproduces the
   current $2,095 / +1.6% / May 2026 figure. The two HUD Fair Market Rent
   tiles change once a year (each October) and stay hand-updated — not
   worth automating an annual number.
4. **Directory maintenance — reader-sourced + periodic manual re-verify.**
   The page's note-card already invites "a link or contact here is wrong"
   corrections by email; that plus a manual re-verify a couple of times a
   year is the right weight for 24 hand-picked entries. Not automated
   (contact pages/emails have no reliable liveness signal worth scripting).
5. **Notable-buildings sidebar — SKIPPED for v1.** The directory already
   covers the managers a renter realistically emails. The single-building
   leasing offices (Riverhouse, Cascades, some Cambrian Rise buildings) are
   reached via each building's own site, not a management brand — a clean
   follow-up if the page proves popular, but scope creep for launch.

## Remaining (Stephen's call, nothing blocking)

- HUD FMR tiles: hand-update the two numbers each October from
  huduser.gov (once a year).
- Consider the notable-buildings sidebar (#5) if the page gets traction.
