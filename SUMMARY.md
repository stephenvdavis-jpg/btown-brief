# Quick Wins — feat/quick-wins

Five additions, all on this branch, all verified rendering locally (mobile-width + dark mode). No existing URL was renamed or removed; everything is additive. Nothing has been pushed or deployed — review first, then push.

**To preview:** `python3 -m http.server 8000` in this folder → http://localhost:8000

---

## 1. Donate presence + the BTown strip (every page)

- A shared **BTown strip** now renders once per page, above the footer, on all five pages (`js/community.js` injects it): a highlighted Ko-fi donate card + "The free newsletter" (btownbrief.com) + "It's just me — meet Stephen" (about-me).
- **Two copy variants** live in `js/community.js`:
  - **A (personal, live):** "One local guy builds all of this… a coffee keeps it going" → *☕ Buy me a coffee*
  - **B (civic, ready):** "Keep Burlington's local info free… chip in to keep it that way" → *❤️ Chip in on Ko-fi*
  - Swap by changing `ACTIVE_DONATE_VARIANT = 'A'` to `'B'` — one character.
- **Click counter:** every strip click (donate/newsletter/about) posts to the shared games Supabase project with the active variant + page. Until you run `db/quick-wins.sql` (below) it silently no-ops. To see what's working: `select event, variant, count(*) from btb_events group by 1,2;`
- **Not naggy:** the old tiny "Donate ❤️" link in the index support-line was consolidated into the strip, so each page has exactly one donate placement.
- **Games arcade note:** the arcade hub (`btownbrief.github.io` repo) is a separate repo, so I didn't touch it. Recommended placement there: the same strip component pasted above its footer — after the game cabinets, never inside the play flow. A game-over screen is the emotional high point, but the hub footer is the tasteful start. Copy `js/community.js` + the `.btb-strip` CSS block when ready.
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

- **Weekly theme banner** (edit `data/playlist.json` → `theme`), **submission form** (song, artist, any-platform link, why-you-love-it, optional name, local-artist checkbox), **upvoting** (one vote per visitor per track; the list self-sorts by votes), and a **🍁 local musicians filter**. Platform auto-detected from the link (Spotify/Apple/YouTube/Bandcamp/SoundCloud badges).
- **Moderation queue:** submissions land as `pending` in Supabase and never appear until you flip them to `approved` in the Table Editor (tick `is_local` there too). Fresh list each ISO week.
- **One-time setup:** run `db/quick-wins.sql` in the Supabase SQL editor (same shared games project). Until then the page shows five verified starter picks (Phish, Grace Potter, Noah Kahan, Rough Francis, Kat Wright) and the form falls back to a pre-filled email to you — still moderated, just by inbox.

---

## What was verified

- All 5 pages served locally and screenshotted at phone width, light + dark mode; no console errors.
- Volunteer filters tested (2 hours + outdoors → correct 3 orgs); playlist form fallback tested end-to-end; JSON files validated; JS syntax-checked.
- Every volunteer/club/project URL curl-checked (only Facebook/Phoenix Books block bots; they work in real browsers).
- Not verified: the Supabase RPCs themselves (they don't exist until you run `db/quick-wins.sql`) — the fallback paths are what's proven.

## Open questions

1. **Supabase setup** — want me to walk you through running `db/quick-wins.sql` (2 minutes in the SQL editor)? Playlist voting and the donate click-counter stay dormant until then.
2. **Beehiiv volunteer page** — replace its content with a link to the new page, keep both, or have it redirect? Your call; I didn't touch it.
3. **A/B testing donate copy** — variant A is live. Simplest honest test: run A for two weeks, flip to B for two, compare `btb_events` counts. Want a random 50/50 split per visitor instead? Easy to add later.
4. **Arcade strip** — say the word and I'll add the strip to the hub repo (`btownbrief.github.io`) as a separate branch there.
5. **Playlist weekly reset** — each Monday starts an empty week (old songs stay in the DB under their week). If you'd rather have lists roll over or show "last week's winners," that's a small change.
6. **Clubs entries flagged "verify"** by research (schedules that shift seasonally): Bolters Run Club day/time, Local Motion ride schedule, VCC trivia, Burlington Adult Social Sports season, Knot Knite recency, pickleball open-play times, both choruses' join windows. All linked pages are live; the cadence text is what to spot-check.
7. **BTV Daily & CCHS** — BTV Daily's site copyright reads 2024 (is the email still landing?), and cchsvt.org is HTTP-only. Both included; drop them if you'd rather be strict.
