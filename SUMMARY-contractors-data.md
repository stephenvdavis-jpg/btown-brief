# Contractor Directory — Data Build Summary

**Branch:** `feat/contractors` · **Built:** 2026-07-19

## What shipped

A business-level contractor/handyman directory layer on top of the existing
DFS licensing-rolls backbone (`data/contractors.json`, from a prior session):

- **`data/contractors/directory.json`** — 10 publishable business listings.
- **`data/contractors/review-queue.json`** — 7 items needing your judgment call,
  each with a `review_reason` and `evidence_needed`.
- **`data/contractors/excluded.json`** — 1,486 dropped records, each with a reason
  (`individual-without-business`, `non-contractor`, or `out-of-scope`).
- **`data/contractors/directory.csv`** — spreadsheet mirror of `directory.json`.
- **`data/contractors/places-cache.json`** — cached Google Places responses (place_id
  + basic/contact fields only — no ratings or review text, per Places ToS) so a rerun
  doesn't re-bill.
- **`data/contractors/source/05-contractor-dataset.json`** — a copy of the input dataset,
  kept in the worktree so this build is self-contained and reproducible.
- **`scripts/build_contractors_directory.py`** — the build script; rerun it any time the
  source dataset or the hand-reviewed VBRA decision table changes.
- **`js/contractors.js`**, **`contractors.html`** — updated to fetch `directory.json` and
  render it as the page's existing "Vetted picks" section, on top of the unchanged
  licensing-rolls list.

## The starting dataset

1,504 rows: 1,467 VT DFS individual license holders (Electrician/Plumber/Gas
Installer/Oil Installer, live pull from `data.vermont.gov`, 224 already expired) + 37
VBRA Remodelers Directory entries (12 of those are VBRA's own "non-trade associate
member" tier — lenders, insurers, a fiber ISP, an accounting firm, two design firms
VBRA itself classifies as associate rather than builder members).

## Method

**DFS rows (1,467) → all excluded, as `individual-without-business`.** This is the
single biggest decision in this build, so here's the reasoning: Steve's rule #1 requires
grouping individual license holders into a business only where the data supports it
(shared business/employer name, shared address, or shared phone), and requires
independent verification before listing an unaffiliated individual as a business. This
particular DFS pull carries **none** of those fields — just name, license info, town,
and zip. No street address, no phone, no business name at all. There is nothing to
group on and nothing to verify against. Rather than guess (e.g., searching Google for
each of 1,467 names and hoping the right "Smith Electric" comes up for the right John
Smith — a real risk in a state with this many trade licensees sharing common surnames),
every DFS row was excluded with an honest reason. The existing licensing-rolls list on
the page (`data/contractors.json`, unchanged by this build) still shows these people —
it was already correctly labeled "a name here means a current state license, nothing
more," which is exactly what this data supports. Of the 1,467, 224 already have expired
licenses (noted per-row in `excluded.json`, not treated differently — they're excluded
either way for lack of business identity, not because of expiry).

**VBRA rows (37) → read individually (small enough to do by hand, which rule #8
requires anyway for anything short of a mechanical fact-check):**
1. The 12 "Non-trade VBRA associate member" rows → excluded, `non-contractor`.
2. Of the remaining 25 trade rows, 2 are suppliers by their own business name (Hauke
   Building Supply, Goodro Lumber) despite VBRA's category tag → excluded.
3. 1 is an out-of-state duplicate-name entity (a second, unrelated "Allen Pools & Spas"
   in Lebanon, NH) → excluded.
4. 4 more are headquartered in a VT county that does **not** border Chittenden
   (Geobarns/White River Junction-Windsor, Carroll Concrete/Newport-Orleans, Ennis
   Construction/Quechee-Windsor, Cocoplum Appliances/Brattleboro-Windham) → excluded,
   `out-of-scope`. This is objective VT county-adjacency geography, not a taste call.
5. The remaining candidates and the businesses in an **adjacent** county (Franklin,
   Grand Isle, Addison — VBRA tags them as serving Chittenden even though their HQ
   isn't in it) went to Google Places for confirmation.
6. VBRA's own auto-guessed `category` field (a keyword match against ~180 service tags,
   flagged in its own schema notes as needing a human pass) was corrected against the
   business's own name where the name made the real trade obvious — e.g. "BLUE SKY
   ROOFING" was tagged "General Contractor," corrected to Roofing; "Green State
   Builders" was tagged "Appliances," corrected to General Contractor & Remodeler.

**Google Places (legacy Find Place From Text + Place Details).** A working key was
found in `~/btown-brief-prompts/secrets.env` (`GOOGLE_MAPS_API_KEY`, already used by
`btown-guide-work/tools/refresh-hours.py`) and verified against 3 test calls before the
batch — legacy Places still works on this project, matching your prior experience.
18 businesses were shortlisted (everything that was a publish or review-queue
candidate); each got a Find Place From Text search on `"{business name}, {town}, VT"`
followed by a Place Details call for `name, formatted_address,
formatted_phone_number, website` when exactly one candidate came back. **32 Places API
calls total** across the whole build (well under the 350-call ceiling) — cached to
`places-cache.json` by query text so a rerun is free.

A candidate only stays in the **publish** tier if Places returns exactly one confident
match. Zero or multiple candidates demotes it to the review queue instead (3 cases: Culligan
Water Technologies initially returned 2 candidates on the first pass and resolved to 1
on a retry — Google's fuzzy text search isn't perfectly deterministic — but Builders
Installed Products and Godbout Development stayed ambiguous both times and are queued
with the full candidate list attached so you can pick manually). Where Places confirmed
a physical address, that address's town **replaced** VBRA's self-reported town in the
final listing — a few VBRA rows had a stale or wrong town (BLUE SKY ROOFING listed
itself as Colchester; Places' confirmed office is actually in Richmond, still
in-county). One genuinely interesting find: two separate VBRA rows both named "Hayward
Design Build" (one listed South Hero, one Colchester, different phone numbers) resolved
to the **identical** Google place_id — proof they're one business with two stale VBRA
profile entries, not two businesses. They're merged into a single review-queue item
(HQ is South Hero, Grand Isle County — adjacent, not in Chittenden — so it's queued for
your service-area call either way).

Per-row Places output only ever stores `place_id`, `formatted_address`,
`formatted_phone_number`, and `website` — no ratings, review counts, or review text, per
the caching rules in the research brief.

## Counts

| Stage | Count |
|---|---|
| Input rows | 1,504 |
| -> Published (`directory.json`) | **10** |
| -> Review queue (`review-queue.json`) | **7** |
| -> Excluded (`excluded.json`) | **1,486** |
| &nbsp;&nbsp;&nbsp;- individual-without-business (DFS, no business ID data) | 1,467 |
| &nbsp;&nbsp;&nbsp;- non-contractor (VBRA associate members) | 12 |
| &nbsp;&nbsp;&nbsp;- out-of-scope (supplier / out-of-state dup / out-of-county) | 7 |
| Google Places calls made | 32 (of 350 budget) |

**Published, by category:** General Contractor & Remodeler 5, Electrician 1, Flooring 1,
Pool & Spa 1, Roofing 1, Windows & Doors 1.

**Review queue themes:** adjacent-county HQ needing a service-area call (Bourbeau
Custom Homes, Chevalier Drilling, H.J. LeBoeuf & Son, and the merged Hayward Design
Build) — 4; ambiguous/no confident Google Places match (Builders Installed Products,
Godbout Development) — 2; residential-vs-commercial scope call (Dousevicz, Inc.) — 1.

**Categories with zero published listings this pass:** Plumber, HVAC & Heat Pumps,
Handyman, Painting, Landscaping. See gaps below — this reflects real data limitations,
not a screening decision against those trades.

## Known gaps and recommended next steps

1. **DFS individual rows carry no business-identifying data in this pull.** The live
   Socrata source (`https://data.vermont.gov/resource/cy8e-89cz.json`) actually has a
   `street_address` column per the research brief's documented schema — it just wasn't
   carried into the JSON/CSV this build reads. **Recommended next step:** re-pull the
   live API with `street_address` included, filtered to the same Chittenden zip codes,
   and look for DFS individuals sharing an exact street address with 2+ other license
   holders — that's real corroboration for "this looks like a business," per rule #1.
   Even then, treat matches as review-queue candidates, not auto-publish (home
   addresses shared by roommates/family would produce false positives). This is the
   single highest-value next step — it's the only path to populating Plumber and HVAC &
   Heat Pumps (Gas/Oil Installer) categories from this dataset at all.
2. **No handyman source exists in this dataset at all** (a known gap carried over from
   the research brief — handymen are unlicensed in VT, so no state registry covers
   them). The Handyman category is empty because no handyman rows were ever gathered,
   not because any were screened out. Per your rule, every future handyman row needs
   manual review regardless of source — a good source to try next: a Front Porch Forum
   "recommend a handyman" search (manual, per the research brief's FPF ToS guidance) or
   reader email submissions via the page's existing "Are you one of these people?" box.
3. **Efficiency Vermont's EEN list still isn't pulled.** Confirmed again this pass: the
   "Find a Contractor" tool at `efficiencyvermont.com/find-contractor-retailer` is a
   client-side JS widget with hash-fragment routing — a plain scrape returns the empty
   search form. This would populate HVAC & Heat Pumps specifically (EEN membership is
   required for HVAC/weatherization/electrical trade partners). Manual steps: either
   (a) `firecrawl-interact` to fill the zip field, submit, and read the rendered result
   list for each Chittenden County zip, or (b) email `een@efficiencyvermont.com`
   directly and ask about a data-sharing arrangement — both untried this pass.
4. **OPR Act 182 Residential Contractor Registry still has no bulk export.** Manual
   steps for you: visit `https://sos.vermont.gov/opr/find-a-professional/`, search or
   select "Residential Contractors," and check whether a "Profession Roster Download"
   button appears (mentioned on OPR's general pages but not reachable without logging
   into the interactive Pega portal). If it exports a CSV, treat it like DFS: pull,
   filter to Chittenden zips, and this build's script can be extended to ingest it —
   critically, it should carry actual business names (Act 182 registers residential
   contracting businesses, not individuals the way DFS does), which would unlock a much
   larger General Contractor & Remodeler / Handyman-adjacent layer.
5. **VBRA directory pages 2-3 (members 51-110, of which the research brief separately
   found 80 total serve Chittenden) were never captured** — only page 1's 50 members
   (41 tagging Chittenden, deduped to 37) made it into this dataset. Re-scraping with
   `firecrawl-interact` to click through VBRA's AJAX pagination would roughly double the
   VBRA-sourced candidate pool.
6. **No BBB matching was performed** (`bbb_profile_url` is null on every row) — BBB's
   directory search pages are `robots.txt`-disallowed, so this has to be a manual,
   per-business lookup, same as the research brief found. Not attempted this pass.
7. **The 7 phone-number mismatches flagged in `other_signals`** (Places' phone differs
   from VBRA's listed phone for Floor Coverings International, Green State Builders,
   Allen Pools & Spas, GORDON'S WINDOW DECOR, Culligan Water Technologies, Bourbeau
   Custom Homes, Dousevicz) are all still published or queued — a differing phone
   between a VBRA membership contact and a business's public Google listing is common
   (regional office vs. local branch, owner's cell vs. front desk) and isn't on its own
   evidence of a wrong match, especially where the business name, address town, and
   website all lined up. Flagged for your quick glance, not blocking.

## Verification performed

- Google Places legacy API confirmed working with 3 test calls before the batch run
  (Find Place From Text + Place Details, both via proper `GET` requests — an early
  `curl` test without `-G` silently POSTed and returned a misleading "must use an API
  key" error; fixed before any real calls ran).
- `python3 scripts/build_contractors_directory.py` reconciles its own output: published
  + queued + excluded + merged-duplicates must equal the 1,504 input rows, or the totals
  printed at the end won't match. Currently 10 + 7 + 1,486 + 1 = 1,504. Confirmed.
- `node --check js/contractors.js` passes; the `directory.json` -> `curatedCard` shape
  adapter was hand-traced against the real 10-row output in Python to confirm the
  rendered `name` / `trade` / `notes` / `review_links` fields come out correctly — not
  verified in an actual browser render this pass, since the page skeleton itself wasn't
  otherwise touched.
- Every published listing's `google_maps_url` and `website` were spot-checked by eye
  against the cached Places response for plausibility (right town, right business type).

## Security notes

- The Google Maps API key was read from `~/btown-brief-prompts/secrets.env` into the
  environment only, exactly as `refresh-hours.py` already does — it is **not** written
  to any file in this repo. `places-cache.json` stores only `place_id`,
  `formatted_address`, `formatted_phone_number`, and `website` per business — no
  ratings, review counts, or review text, per the Places ToS caching rules documented
  in the research brief.

## Open questions (your calls)

1. **The 4 adjacent-county businesses** (Bourbeau Custom Homes, Chevalier Drilling,
   H.J. LeBoeuf & Son, Hayward Design Build) — VBRA's own directory tags them as serving
   Chittenden even though their HQ is in a neighboring county. Publish with a "serves
   Chittenden, based in [county]" note, or hold to a strict Chittenden-HQ bar?
2. **Dousevicz, Inc.** — a commercial contractor VBRA member in Essex Junction. Does a
   homeowner-facing directory want commercial-only contractors at all?
3. **Builders Installed Products / Godbout Development** — Google Places couldn't
   confidently disambiguate either (candidate lists are attached in the review queue).
   Do you recognize either business well enough to confirm by hand, or should they stay
   excluded?
