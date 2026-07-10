# Burlington Pulse — build summary (feat/chatter)

**What shipped:** `chatter.html` ("What Burlington Is Talking About") — the neighborhood-chatter
page: a separate information economy from the journalism side. It's the community talking,
always linked back to the original threads, with rumor-vs-fact separation built into the UI.
It extends the newsletter's Wednesday **Burlington City Pulse** section (the weekly r/burlington
roundup) into an always-on view, and cross-links it rather than duplicating it. The existing
r/GoodBurlington "From the community" block on index.html is untouched.

## The page (chatter.html + js/chatter.js + css/style.css additions)

- **Today** — trending topics over a rolling 72-hour window with direction arrows:
  🔥 hot · ↗ rising · ↘ fading (steady topics get a quiet dot). Every topic expands to
  its source threads; every link is a reddit permalink (always link back — hard rule).
- **The good stuff** — rotating highlight slots, positive-first: Most useful neighbor
  question · Funniest local post · Most debated · Someone needs help · Something people
  keep recommending · Emerging rumor. The rumor card is ALWAYS badged "Unverified" with
  dashed-coral styling — separating chatter from established fact is the brand. Slots
  simply don't render when nothing qualifies (no forced weak picks).
- **Around the groups** — Facebook groups and Craigslist appear ONLY as clean link-out
  cards. Nothing is scraped from either (Craigslist actively blocks fetches; Facebook is
  off-limits). Slots are plain HTML in chatter.html — Stephen can edit freely.
- **The rougher stuff** — complaints/crime chatter in a `<details>` collapsed by default.
  The page reads positive-first; the grit is one tap away, not gone.
- Standard page chrome: site header + dark toggle, newsletter bar, note-card tying into
  the Wednesday City Pulse + tip email, auto-injected Ko-fi/newsletter/about strip
  (community.js), site footer. Mobile-first, matches existing tokens/classes throughout.
- Index gets a fifth "💬 Burlington Pulse" card under "Get into Burlington life".

## The pipeline (scripts/refresh_chatter.py)

- **Sources**: r/burlington + r/vermont. Reddit's JSON listings are tried first
  (www/old/api hosts) but currently 403 from BOTH this machine and GitHub Actions —
  the reliable primary is Stephen's public Inoreader streams (`?n=100`, ~13 days of
  history, full post bodies). Reddit metadata (scores/comments) enriches when reachable.
- **Topics**: deterministic keyless clustering (weighted token/bigram overlap on
  titles+bodies), stable topic ids, labels from the representative post.
- **Direction**: `data/chatter-seen.json` keeps 7 days of per-topic activity snapshots
  (ids/metrics only — no content); each run compares activity vs ~24h ago. Arrows start
  differentiating after the first day of snapshots — a fresh checkout shows "steady".
- **Safety filter**: posts pairing accusation language with a private individual's name
  (public officials whitelisted) or doxx-y address/phone patterns are excluded from ALL
  public output and routed to the private tips inbox instead.
- **Optional LLM polish**: with the `ANTHROPIC_API_KEY` repo secret set (same pattern as
  the weather read drafts; model `CHATTER_MODEL`, default claude-sonnet-5) one call
  rewrites topic labels into headline style and re-judges slot picks/safety flags
  (flags can only be added, never removed). Without the key the deterministic
  heuristics run alone — the page never depends on the LLM.
- Failure behavior matches the repo pattern: any fetch/parse failure keeps the last good
  files; the page never goes blank. `--fixtures`, `--selftest`, `--dry-run` for dev.
- **Automation**: `.github/workflows/refresh-chatter.yml`, 4x daily (≈6:40/10:40/14:40/18:40 ET),
  commits `data/chatter.json` + `data/chatter-seen.json` only.

## The private tip line (NOT part of the public page)

The repo is **public**, so all private paths are gitignored and local-only:
`data/tips-inbox.md`, `data/fpf-digests/`, `data/fpf-dropbox/`, `.chatter-dev/`.

- `data/tips-inbox.md` — newsletter leads, never auto-published: safety-flagged posts,
  high-engagement rough threads, every rumor candidate, newsworthiness matches (fire,
  lawsuit, layoffs, closings…). Deduped by URL; written only on local runs (skipped in CI).
- **Front Porch Forum is a tip line only.** Two intake paths, both local:
  (a) drop digest emails Stephen receives into `data/fpf-digests/` (.eml/.txt/.html);
  (b) the newsletter workflow's in-browser session reads can drop notes into
  `data/fpf-dropbox/`. `scripts/ingest_fpf.py` parses both into tips-inbox leads, each
  stamped "PRIVATE tip line — never quote, link, or summarize publicly; verify
  independently." FPF content never touches chatter.json, the page, or git. Per
  Stephen's ruling the public page doesn't even link to FPF.

## What a compliant Facebook integration could look like later

No scraping under any realistic reading of FB's ToS. Legitimate options, in order of effort:
1. Keep link-out slots (current state) — zero risk, real value.
2. Stephen (as a group member) manually drops notable-post notes into `data/fpf-dropbox/`-style
   local notes → tips inbox → City Pulse writeups with permission from posters.
3. A "community correspondents" pattern: group admins email a weekly highlight to
   BtownBrief@gmail.com (the tip email is already on the page).
4. Meta's Graph API only exposes groups the app administers — if Stephen ever runs his own
   BTown Brief FB group, its posts could be ingested legitimately via a page/app token.

## Codex's role + review

- `scripts/refresh_chatter.py` and `scripts/ingest_fpf.py` were implemented by GPT-5.6 Sol
  (Codex) against a written spec, then I reviewed all 614 lines, tightened two slot
  heuristics after a live run (generic words like "missing"/"heard" deep in post bodies
  were mis-slotting posts), and re-ran everything.
- A second, independent Codex read-only review of the whole branch found 2 critical +
  2 high findings, all verified and fixed: Unicode/overlapping-name bypasses of the
  safety filter, LLM output trusted too much (labels now must be name-free and share
  cluster vocabulary; flag additions capped), suppressed post ids leaking into the
  committed chatter-seen.json, and gitignore-only protection (the workflow now has a
  tripwire that fails if private paths ever become tracked). Plus: URL-scheme guard in
  chatter.js, trend-baseline window (18–30h), mode-label bug, <5-posts ingestion guard,
  focus-visible outlines, badge contrast.

## Verification performed

- `refresh_chatter.py --selftest` and `ingest_fpf.py --selftest` pass; `py_compile` and
  `node --check js/chatter.js` clean.
- Fixture runs are idempotent (no duplicate tips; snapshots grow by one per run).
- **Live run against real sources**: 27 r/burlington posts ingested via Inoreader
  (Reddit JSON 403s from this machine AND GitHub's IPs — the existing hourly Action's
  reddit.json has been empty for the same reason). Output: 8 topics, 2 honest highlight
  slots ("lost chicken!" → Someone needs help; piña-colada hunt → recommendation),
  3 rough items, 4 private tips including one safety-filter catch (a post naming and
  insulting a private individual — absent from every public file, present in tips).
- Safety matrix (9 cases: accented/ALL-CAPS names, person-seeking phrasing, public
  officials, business names, phone-number doxx) all pass.
- **Browser (observed)**: desktop render, topic expansion with reddit-permalink source
  rows, all dynamic links reddit-only, 8 group cards correct, rough section collapsed
  by default with 3 items, dark toggle flips `data-theme` with dark background applied,
  Ko-fi strip auto-injected, zero console errors, zero horizontal overflow at desktop.
- **Not fully observed**: real-device 390px rendering (headless-Chrome screenshots clip
  ~15% on ALL site pages including shipped volunteer.html — a headless viewport
  artifact, not a chatter bug; the page uses the same responsive patterns as shipped
  pages and adds explicit 560px wrap rules). The LLM refinement path was code-reviewed
  and schema-validated but not exercised live (no ANTHROPIC_API_KEY on this machine).

## Handoff — what's left (any session can pick this up)

1. Stephen reviews the page locally: `cd ~/Desktop/btown-brief-worktrees/chatter &&
   python3 -m http.server 8000` → http://localhost:8000/chatter.html (a server may
   already be running). Nothing is pushed/deployed — the branch is local-only.
2. If happy: push `feat/chatter`, open a PR, merge — the workflow starts running on
   GitHub (optionally set the `ANTHROPIC_API_KEY` repo secret first for better labels).
3. Fix the Inoreader **r/Vermont** rule — that tag stream stopped updating 2026-07-04
   (r/burlington is current), so r/vermont contributes nothing until it's fixed.
4. Optional polish captured but not done: glance at the page on a real phone;
   consider Opus/another pass on highlight-slot copy once the LLM refinement runs.

## Open questions

1. **Name policy strictness.** Current rule: a name-shaped string only suppresses a post
   when paired with hostile terms, person-seeking phrasing ("has anyone seen Jane Doe"),
   or a phone/address. Purely positive mentions ("Thanks to Jane Doe for helping") stay
   public — flagging all names gutted half the page because Burlington business names
   (Taco Gordo, Original Skiff) look like person names. Is that the line you want, or
   should positive name mentions also be tips-only? (The LLM pass, once enabled, may add
   flags for nuance but can never unflag.)
2. **r/Vermont Inoreader rule is broken since July 4** — needs a fix on the Inoreader
   side; the pipeline already handles its return automatically.
3. **Wednesday City Pulse workflow tie-in**: should the newsletter's weekly roundup start
   from `data/tips-inbox.md` + the live page (a "review the Pulse week" checklist in the
   newsletter repo), instead of re-reading reddit from scratch?
4. **No confirmable Burlington VT foodies Facebook group exists** (the indexed one is
   Burlington, MA) — the food slot was omitted rather than guessed. Want a different
   food community linked there?
5. **First-day arrows**: directions differentiate only after ~24h of snapshots (4 runs);
   until then most topics read "rising"/"steady". Expected, not a bug.
6. **Pre-existing repo quirk noticed** (untouched): css/style.css line ~3112 has a
   malformed section-banner comment ("BURLINGTON RIGHT NOW" banner missing its opening
   `/*`), and index's reddit.json/"From the community" has been empty since Reddit
   started blocking GitHub runners — the Inoreader approach used here could fix that
   section too if you want.
