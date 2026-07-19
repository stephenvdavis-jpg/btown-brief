# Volunteer Page Refresh — Build Summary

**Branch:** `feat/volunteer-refresh` · **Built:** 2026-07-19

## What changed

The volunteer page leaned too hard on United Way NWVT's Volunteer Connection and Idealist
as if they were live feeds of fresh opportunities. UWNWVT's platform has no public feed or
API (confirmed in `/Users/stephendavis/Desktop/newsletter/reference/research/06-volunteer-listings.md`
— the only unauthenticated JSON endpoint is an agency-name autocomplete, not opportunity
data), and a permission-based partnership request to Megan Bridges (UWNWVT's volunteer
engagement director) is drafted but **not yet sent**. So this pass rebuilds the page around
two honest, self-sufficient sections instead of presenting either platform as complete or
current.

### 1. Fresh Volunteer Opportunities (new)
7 specific, dated/cadence opportunities, each verified today directly on the organization's
own volunteer page (never United Way, Idealist, or Front Porch Forum):

- **Intervale Center** — Gleaning & Food Access (weekly, direct SignUpGenius link);
  Conservation Nursery (weekly Tue/Wed/Fri mornings, direct SignUpGenius link)
- **Community Sailing Center** — Suds & Sailboats (third Thursday monthly through Oct 2026)
- **Humane Society of Chittenden County** — Morning Cat & Small Animal Care (7 mornings/week);
  Group Volunteer Day (groups up to 15, direct link to their group-volunteering page)
- **COTS** — Activity Facilitator and Respite Provider (both at the Family Shelter, distinct
  weekly schedules)

Each card shows a "checked N days/today ago" badge and only a short original blurb — never
a reproduced description. `js/volunteer.js` hides any entry whose `last_checked` is more
than 14 days old (`MAX_FRESH_AGE_DAYS`), reusing the same Burlington-timezone day-math
pattern already shipped in `js/jobs.js`. Verified the boundary in a scratch copy (not
committed): an item at exactly 14 days old still renders, at 15 days it's dropped.

### 2. Organizations That Welcome Volunteers (new evergreen directory)
All 19 orgs from `06-volunteer-starter-data.json` (each individually verified live on the
research pass, 2026-07-17), grouped by their own primary category. Practical filter tags
(quick/outdoor/onetime/recurring/friends) are **not** applied by inference — only 5 of the
19 orgs get a tag, and only because the starter dataset's own blurb text says so explicitly
("ongoing," "nightly," "always needs help," "group volunteer days," "teams"). The other 14
orgs carry no filter tags; they still show up when no filter is checked, they just won't
match a checked filter. The page copy says this directly so it doesn't read as a bug.

### 3. More Places To Browse (demoted, not removed)
United Way NWVT Volunteer Connection, Idealist, and Vermont Connector moved from the
top-of-page hero CTA into a supplemental section near the bottom, with revised copy:
"Neither is guaranteed current or complete — always confirm the date, time, and
availability directly with the organization before you show up." United Way's copy
specifically flags that postings can sit stale.

### 4. Filters
Same five chips (quick/outdoor/onetime/recurring/friends), AND-combined, now applied
independently to both the fresh list and the evergreen directory. A note under the chip
row states plainly that filters only match confirmed data, so an unfiltered view still
shows everything.

### 5. Submission ask (updated)
The "run an org that needs volunteers" note now requests: organization name, the
opportunity, date or cadence, location, time commitment, and a public signup link — matching
the fields the new fresh.json schema actually needs.

## Data files (new layout)

- `data/volunteers/fresh.json` — specific opportunities. **Review cadence: re-verify each
  entry against the org's own page before it turns 14 days old**, then bump `last_checked`.
  If a listing is no longer current, remove it — don't leave a stale date.
- `data/volunteers/orgs.json` — evergreen directory. **Review cadence: monthly spot-check**
  that each URL still resolves and the org is still recruiting (the original research pass
  already caught one org, Shelburne Farms, that had stopped accepting volunteers — this is
  a real failure mode, not hypothetical).
- Both files carry the cadence in their own `_comment`/`review_cadence` fields, not just here.
- Old `data/volunteer.json` (single file, 30 hand-maintained orgs + a dead unused `databases`
  field) was removed — nothing referenced it after the split, and its filter tags predated
  this pass's "never guess" rule so weren't safe to carry forward as-is.

## Verification performed

- Served locally with `python3 -m http.server` from the worktree; confirmed
  `data/volunteers/fresh.json` (7 items) and `data/volunteers/orgs.json` (19 items) both
  parse and load.
- Rendered via headless Chrome (`--dump-dom`, i.e. post-JavaScript output): 26 total
  `dir-card` links (7 fresh + 19 evergreen), all 11 evergreen category headers render, nav
  (4 `mode-btn` links) and the footer donate/newsletter/about strip both render unchanged.
- Console log checked for JS errors — clean (only Chrome's own internal verbose/network
  histogram noise, no app errors).
- 14-day expiry boundary tested in an isolated scratch copy under the scratchpad directory
  (never committed to the repo): patched two entries to 15 and 29 days old and confirmed
  they dropped out of the fresh list while a 14-day-old entry still rendered.
- Filter AND-logic sanity-checked directly against the shipped JSON (Python, mirroring the
  JS predicate): `outdoor` → the 3 fresh items that say so, 0 orgs (correctly, since no org
  blurb used the literal word); `friends` → 2 fresh + 2 orgs; `onetime` → 1 fresh, 0 orgs.
- Did not click-test the filter checkboxes in a live browser interaction (headless
  `--dump-dom` doesn't drive click events) — confidence instead comes from the JS logic
  being structurally identical to the already-shipped, already-verified `clubs.js`/`jobs.js`
  filter code, plus the direct data-level sanity check above.
- Did not screenshot for visual/CSS review — relied on reusing existing `.dir-card`,
  `.big-link`, `.section-label`, `.chip-row` classes and adding only small, low-risk
  additions (`.vol-filter-note`, `.vol-section-sub`, `.vol-fresh-checked`, `.vol-fresh-meta`).

## Open items

- **United Way partnership request still pending.** The draft outreach email to Megan
  Bridges (`megan@unitedwaynwvt.org`) in `06-volunteer-listings.md` has not been sent. Once
  she responds (API key, CSV handoff, or manual-pull blessing), a v2 pass can layer
  UWNWVT-sourced fresh opportunities in alongside the org-verified ones, per the build plan
  in that research doc.
- **Fresh list is intentionally short (7 items, 4 orgs).** Ten org pages were scraped for
  this pass; three (Green Mountain Habitat, Birds of Vermont, ECHO) had only generic
  "come volunteer anytime" copy without a specific enough date/cadence to distinguish from
  their evergreen listing, so they were left out of Fresh rather than padded in.
- **Evergreen directory has zero orgs tagged `quick` or `outdoor`.** Not a bug — the starter
  dataset's blurbs never use those literal words, and the task's "never guess" rule means
  they're left blank rather than inferred from context (e.g. Intervale's farm work is very
  likely outdoors, but the source text doesn't say so).
- Not committed: `.firecrawl` scrape cache lives under the scratchpad directory, not the repo.
