# Quick Wins — feat/quick-wins

Five additions, all on this branch, all verified rendering locally (mobile-width + dark mode). No existing URL was renamed or removed; everything is additive. Pushed as `feat/quick-wins` for review — merging to main is what deploys it.

**To preview:** `python3 -m http.server 8000` in this folder → http://localhost:8000

---

## 1. Donate presence + the BTown strip (every page)

- A shared **BTown strip** now renders once per page, above the footer, on all five pages (`js/community.js` injects it): a highlighted Ko-fi donate card + "The free newsletter" (btownbrief.com) + "It's just me — meet Stephen" (about-me).
- **Two copy variants** live in `js/community.js`:
  - **A (personal):** "One local guy builds all of this… a coffee keeps it going" → *☕ Buy me a coffee*
  - **B (civic):** "Keep Burlington's local info free… chip in to keep it that way" → *❤️ Chip in on Ko-fi*
  - Now running a **random sticky 50/50 split per visitor** (`ACTIVE_DONATE_VARIANT = 'AB'`); set it to `'A'` or `'B'` to pin one. Compare with: `select event, variant, count(*) from btb_events where event = 'strip-donate' group by 1,2;`
- **Click counter:** every strip click (donate/newsletter/about) posts to the shared games Supabase project with the active variant + page. Until you run `db/quick-wins.sql` (below) it silently no-ops. To see what's working: `select event, variant, count(*) from btb_events group by 1,2;`
- **Not naggy:** the old tiny "Donate ❤️" link in the index support-line was consolidated into the strip, so each page has exactly one donate placement.
- **Games arcade:** the strip is also added to the arcade hub repo (`btownbrief.github.io`, branch `feat/donate-strip`) — above its footer, after the game cabinets, never inside the play flow.
- Index also got a **"Get into Burlington life"** card row (top of the community section) linking the four new pages.

## 2. Volunteer page — `volunteer.html`

- "Help Burlington This Week" framing with **quick filters** that AND together: *I've got 2 hours · Outdoors · One-time · Recurring · Good with friends*.
- All ~32 orgs from your beehiiv "Burlington Volunteer Opportunities" page carried over, each tagged, grouped (Environment, Animals, Food & Housing, Kids & Families, Older Neighbors & Health, Arts & Civic), every link going straight to the org's volunteer page. Two Google-search-wrapped links from the old page were fixed to direct URLs; all links verified live.
- Big United Way NWVT ("find a shift this week") + Idealist buttons up top. Links out only — no scraping.
- Note at the bottom inviting orgs to email **BtownBrief@gmail.com** with opportunities.
- Data lives in `data/volunteer.json` — copy any entry to add an org.
- Your beehiiv page wasn't touched; when you're happy with this one, point it here (or just link it).

## 3. Clubs directory — `clubs.html`

- 38 researched-and-verified Burlington-area clubs and recurring groups across Running, Biking, Hiking, Games, Books, Sports & Rec, Making & Crafts, Language, Music, Dance, Social — each with name, one-liner, meeting cadence, and link.
- **Your Meetup group is featured at the top** in a highlighted card.
- Data lives in `data/clubs.json` — append an entry and the page regroups automatically. Invite note for club organizers to email you.

## 4. Community projects — `projects.html`

- 15 "people building things for Burlington" with warm one-liners and maker credits: fellow newsletters linked generously (BTV Daily, Good Govermont, The Winooski News, Seven Days, VTDigger), podcasts & community radio (Rumble Strip, Vermont Talks, Brave Little State, WBTV-LP 99.3), tools (UVM's ORCA / BTV Alerts), and community institutions (Front Porch Forum, Big Heavy World, Media Factory, Preservation Burlington, Chittenden County Historical Society).
- Data lives in `data/projects.json`. Invite note: "This page is for linking each other up, not competing."

## 5. Community playlist v1 — `playlist.html`

- **Theme banner per round** (edit `data/playlist.json` → `theme` every other Monday), **submission form** (song, artist, any-platform link, why-you-love-it, optional name, local-artist checkbox), **upvoting** (one vote per visitor per track; the list self-sorts by votes), and a **🍁 local musicians filter**. Platform auto-detected from the link (Spotify/Apple/YouTube/Bandcamp/SoundCloud badges).
- **Two-week rounds, winners kept:** the list resets every other Monday, and a **🏆 Past winners wall** shows the top-voted track of every earlier round, permanently.
- **Moderation queue:** submissions land as `pending` in Supabase and never appear until you flip them to `approved` in the Table Editor (tick `is_local` there too).
- **One-time setup:** run `db/quick-wins.sql` in the Supabase SQL editor (same shared games project). Until then the page shows five verified starter picks (Phish, Grace Potter, Noah Kahan, Rough Francis, Kat Wright) and the form falls back to a pre-filled email to you — still moderated, just by inbox.

---

## What was verified

- All 5 pages served locally and screenshotted at phone width, light + dark mode; no console errors.
- Volunteer filters tested (2 hours + outdoors → correct 3 orgs); playlist form fallback tested end-to-end; JSON files validated; JS syntax-checked.
- Every volunteer/club/project URL curl-checked (only Facebook/Phoenix Books block bots; they work in real browsers).
- Not verified: the Supabase RPCs themselves (they don't exist until you run `db/quick-wins.sql`) — the fallback paths are what's proven.

## Decisions (2026-07-10)

1. **Supabase setup** — Stephen runs `db/quick-wins.sql` once in the SQL editor (walkthrough provided); playlist voting/submissions and the click counter go live the moment it runs.
2. **Beehiiv volunteer page** — after this branch merges and deploys, add a prominent link from the beehiiv page to the new filterable page (do not edit beehiiv before the URL exists).
3. **A/B donate copy** — random sticky 50/50 per visitor, live now (`ACTIVE_DONATE_VARIANT = 'AB'`).
4. **Arcade strip** — done, on `feat/donate-strip` in the hub repo.
5. **Playlist cadence** — two-week rounds (not weekly), past winners stay on a permanent 🏆 wall.
6. **BTV Daily** — kept (Stephen confirms they still publish). CCHS kept too.

## Remaining to spot-check when convenient

- Clubs entries whose cadence shifts seasonally: Bolters Run Club day/time, Local Motion ride schedule, VCC trivia, Burlington Adult Social Sports season, Knot Knite recency, pickleball open-play times, both choruses' join windows. All linked pages are live; only the "when" text may drift.
