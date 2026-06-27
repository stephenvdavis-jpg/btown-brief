# Things To Do in Burlington

A curated guide to Burlington, Vermont — built for the Burlington Brief.

Static HTML + vanilla JavaScript, no build step required. Works in any browser; deploys to GitHub Pages by pushing the folder.

---

## Previewing Locally

You need a local web server because browsers block data file loading on `file://` URLs.

**Easiest way (built into Python):**

```bash
cd /path/to/btown-brief
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

**To stop it:** press `Ctrl + C` in the terminal.

---

## Deploying to GitHub Pages

1. Create a new GitHub repository (e.g. `btown-brief`)
2. Push this entire folder to the `main` branch:

```bash
cd /path/to/btown-brief
git init
git add .
git commit -m "Initial site"
git remote add origin https://github.com/YOUR_USERNAME/btown-brief.git
git push -u origin main
```

3. In the GitHub repository: **Settings → Pages → Source → Deploy from branch → `main`, `/ (root)`**
4. Your site will be live at `https://YOUR_USERNAME.github.io/btown-brief/` in a minute or two.

---

## Adding or Editing Content

### Adding a Place (things.json)

Open `data/things.json`. Each entry follows this shape:

```json
{
  "id": "unique-hyphenated-id",
  "name": "Place Name",
  "group": "Food & Drink",
  "category": "Restaurant",
  "neighborhood": "Downtown / Church St",
  "cost_tier": "$",
  "cost_note": "Entrees $12–18",
  "season": ["Year-Round"],
  "time_of_day": ["Afternoon", "Evening"],
  "indoor_outdoor": "Both",
  "good_for": ["Date Night", "Locals' Pick"],
  "vibe": ["Cozy", "Local Institution"],
  "blurb": "One or two sentences. Lead with a specific — a dish, a price, a detail — not the category. No banned phrases (see below).",
  "why_special": "The one thing that makes this different from everywhere else like it.",
  "address": "123 Main Street, Burlington, VT",
  "coords": [44.4774, -73.2140],
  "website": "https://example.com",
  "image": null,
  "has_guide": false,
  "guide_id": null,
  "source": "how you know this",
  "last_verified": "2026-06"
}
```

**Controlled vocabulary** — values for each field must come from this list:

| Field | Valid values |
|---|---|
| `group` | Food & Drink, Outdoors, Culture, Live & Events, Do & Play, Shopping |
| `cost_tier` | Free, $, $$, $$$ |
| `indoor_outdoor` | Indoor, Outdoor, Both |
| `season` | Spring, Summer, Fall, Winter, Year-Round |
| `time_of_day` | Morning, Afternoon, Evening, Late Night |
| `good_for` | Date Night, Groups & Friends, Solo, Family & Kids, Rainy Day, Sunny Day, Cheap Eats, Quick Stop, Half Day, Special Occasion, Visitors, Locals' Pick |
| `vibe` | Laid-back, Lively, Romantic, Quirky, Iconic, Underrated, Scenic, Cozy, Lakeside, Historic, Outdoor Seating, Dog-Friendly, Kid-Friendly, Local Institution |
| `neighborhood` | Downtown / Church St, Old North End, New North End, South End, Hill Section, UVM / University, Waterfront, Winooski, South Burlington, Essex / Essex Jct, Williston, Shelburne, Colchester, Greater Burlington |

For the full list see `data/taxonomy.json`.

**Banned phrases in blurbs:** "perfect for," "must-visit," "nestled in," "hidden gem," "boasts," "vibrant." Cut them.

**Required:** at least one verifiable specific per entry (a price, a year, a named dish, a measurable fact).

### Finding coordinates

Go to [Google Maps](https://maps.google.com), right-click the location, click the coordinates that appear. Paste them as `[latitude, longitude]`.

### Adding a curated event (events.json)

Open `data/events.json` and add an object:

```json
{
  "id": "evt-example",
  "name": "Event Name",
  "date": "2026-07-04",
  "date_display": "Fri Jul 4",
  "note": "Short description — what, where, time",
  "link": null,
  "hidden": false
}
```

Events past their date stay in the file but can be hidden by setting `"hidden": true`.

### Adding a Guide (guides.json)

Open `data/guides.json`. There are three guide types:

**Roundup** — automatically pulls from `things.json` using filters:
```json
{
  "id": "my-roundup",
  "type": "roundup",
  "title": "Guide Title",
  "tagline": "One sentence tease.",
  "cover_class": "guide-card-cover-outdoor",
  "intro": "Intro text. Separate paragraphs with a blank line.",
  "filter": {
    "good_for": ["Date Night"],
    "cost_tier": ["$", "$$"]
  },
  "sort": "featured"
}
```

**Itinerary** — ordered list of place IDs:
```json
{
  "id": "my-itinerary",
  "type": "itinerary",
  "title": "A Good Day",
  "tagline": "One sentence tease.",
  "cover_class": "guide-card-cover-night",
  "intro": "Intro text.",
  "items": ["foam-brewers", "waterfront-park", "leunigs-bistro"]
}
```

**Cover classes** available: `guide-card-cover-outdoor`, `guide-card-cover-food`, `guide-card-cover-date`, `guide-card-cover-night`, `guide-card-cover-free`, `guide-card-cover-family`, `guide-card-cover-roundup`, `guide-card-cover-place`.

---

## File Structure

```
btown-brief/
├── index.html          ← All the HTML (don't need to edit this)
├── css/
│   └── style.css       ← All the styles
├── js/
│   ├── app.js          ← List mode, filtering, detail drawer
│   └── guides.js       ← Guides mode
├── data/
│   ├── things.json     ← Master list of places — edit this
│   ├── guides.json     ← Guide definitions — edit this
│   ├── events.json     ← Upcoming events strip — edit this
│   └── taxonomy.json   ← Controlled vocabularies (rarely needs editing)
├── assets/
│   └── img/            ← Place images go here (optional)
└── README.md
```

---

## Dark Mode

The dark mode toggle in the header switches themes in-memory. It resets on page reload — no settings are saved.

---

## Questions / Bugs

File an issue at the Burlington Brief or reach out to the site editor. To add yourself as an editor: push access to the GitHub repository.
