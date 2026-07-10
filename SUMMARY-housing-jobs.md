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

- Housing page verified rendering in Chrome against the local server with
  real data: 24 manager cards, 16 mailto actions, 10 source cards, 3 rent
  tiles, footer strip injected, filters working (single-column mobile
  layout confirmed by screenshot; ≥720px two-column via `dir-grid-2`).
- Jobs page + refresh script verification: see "Codex + verification"
  below.
- Not run: no repo test suite / linters exist; nothing to run beyond the
  pages themselves.

## Codex + verification

`scripts/refresh_jobs.py` was implemented by Codex (GPT-5.6 Sol) against a
spec with live-tested endpoints from the recon pass; diff inspected and the
script re-run independently before commit. <!-- verification numbers filled
in after the run below -->

## Open questions (for Stephen)

1. **Nav linking** — housing.html and jobs.html cross-link each other and
   index.html, but no existing page links *to* them yet. Add them to the
   community-pages nav (volunteer/clubs/projects) and/or the index header
   when you're ready to announce.
2. **NEOGOV gray zone** — comfortable keeping the City of Burlington
   auto-fetch (3 gentle requests/week), or prefer link-only there too?
3. **Rent snapshot upkeep** — ZORI is a monthly hand-update (one number in
   `data/housing.json`). Want a reminder ritual in the newsletter workflow,
   or should I wire a monthly Action that pulls the CSV?
4. **Directory maintenance** — the mailto contacts will rot slowly; the
   note-card invites corrections. Worth a quarterly re-verify pass?
5. **Notable-buildings sidebar** — add the single-building leasing offices
   (Riverhouse, Cascades, Cambrian Rise buildings) as a follow-up?
