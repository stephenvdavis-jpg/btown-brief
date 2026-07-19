/* Volunteer page — two data sources:
   - data/volunteers/fresh.json: specific, dated/cadence shifts, each verified on
     the org's OWN page. Auto-expires client-side 14 days after last_checked
     (MAX_FRESH_AGE_DAYS), same pattern as js/jobs.js, so a listing that never
     gets reverified just disappears instead of going stale on the page.
   - data/volunteers/orgs.json: an evergreen "go volunteer here" directory.
     Not dated shifts — a monthly spot-check keeps the links live (see the
     file's own review_cadence comment).
   Quick filters (chips) apply to both lists with AND-together tag matching.
   Most orgs carry no practical-filter tags at all — that data isn't guessed,
   only recorded when the source text says so — so an org without a tag just
   never matches a checked filter. That's expected, not a bug. */
(function () {
  'use strict';

  var esc = window.BTBC.esc;
  var MAX_FRESH_AGE_DAYS = 14;
  var DAY_MS = 24 * 60 * 60 * 1000;

  var TAG_LABELS = {
    quick: '~2 hours',
    outdoor: 'outdoors',
    onetime: 'one-time',
    recurring: 'recurring',
    friends: 'bring friends',
  };

  var ORG_CATEGORY_ORDER = [
    'Food Security', 'Housing & Homelessness', 'Animals', 'Youth & Education',
    'Domestic Violence & Safety', 'Seniors', 'Environment & Farming',
    'Transportation & Active Living', 'Recreation & Outdoors',
    'Libraries & Literacy', 'Health & Wellness',
  ];

  var fresh = [];
  var orgs = [];

  // Only http(s) links are ever rendered — esc() stops markup injection but
  // not a "javascript:" URL slipping into a data file, which would still
  // run on click.
  function safeUrl(url) {
    return /^https?:\/\//i.test(url || '') ? url : '#';
  }

  // Calendar-day math, not elapsed-milliseconds: last_checked is a Burlington
  // date (YYYY-MM-DD), so age is the whole-day difference from today in
  // Burlington — independent of the viewer's own timezone/clock.
  function dayNumber(ymd) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
    return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY_MS) : NaN;
  }

  function todayNumber() {
    return dayNumber(new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }));
  }

  function daysAgo(iso) {
    return todayNumber() - dayNumber(iso);
  }

  function checkedLabel(iso) {
    var d = daysAgo(iso);
    if (d <= 0) return 'checked today';
    if (d === 1) return 'checked yesterday';
    return 'checked ' + d + ' days ago';
  }

  function activeTags() {
    return Array.prototype.slice
      .call(document.querySelectorAll('#vol-filters input:checked'))
      .map(function (el) { return el.value; });
  }

  function tagPills(tags) {
    return (tags || []).map(function (t) {
      return '<span class="dir-tag">' + esc(TAG_LABELS[t] || t) + '</span>';
    }).join('');
  }

  /* ---------- fresh opportunities ---------- */

  function freshCardHTML(item) {
    return (
      '<a class="dir-card vol-fresh-card" href="' + esc(safeUrl(item.url)) + '" target="_blank" rel="noopener">' +
        '<div class="dir-card-head">' +
          '<span class="dir-card-name">' + esc(item.title || item.org) + '</span>' +
          '<span class="vol-fresh-checked">' + esc(checkedLabel(item.last_checked)) + '</span>' +
        '</div>' +
        '<p class="dir-card-what">' +
          '<strong>' + esc(item.org) + '</strong>' +
          (item.title ? ' — ' + esc(item.blurb) : esc(item.blurb)) +
        '</p>' +
        '<p class="vol-fresh-meta">' +
          (item.date ? '📅 ' + esc(item.date) : '') +
          (item.location ? (item.date ? ' · ' : '') + '📍 ' + esc(item.location) : '') +
        '</p>' +
        '<div class="dir-card-tags">' + tagPills(item.tags) + '</div>' +
        '<span class="dir-card-arrow" aria-hidden="true">↗</span>' +
      '</a>'
    );
  }

  function renderFresh() {
    var tags = activeTags();
    var list = document.getElementById('vol-fresh-list');

    var matching = fresh.filter(function (item) {
      return tags.every(function (t) { return (item.tags || []).indexOf(t) !== -1; });
    });

    if (!fresh.length) {
      list.innerHTML = '<p class="page-empty">No specific opportunities verified in the last 14 days — check back soon, or browse the organizations below.</p>';
    } else if (!matching.length) {
      list.innerHTML = '<p class="page-empty">Nothing verified fresh matches that combination right now — try unchecking a filter, or browse the organizations below.</p>';
    } else {
      list.innerHTML = '<div class="dir-grid">' + matching.map(freshCardHTML).join('') + '</div>';
    }
  }

  /* ---------- evergreen org directory ---------- */

  function orgCardHTML(org) {
    var cats = (org.categories || []).map(function (c) {
      return '<span class="dir-tag">' + esc(c) + '</span>';
    }).join('');
    return (
      '<a class="dir-card" href="' + esc(safeUrl(org.url)) + '" target="_blank" rel="noopener">' +
        '<div class="dir-card-head">' +
          '<span class="dir-card-name">' + esc(org.org) + '</span>' +
          '<span class="dir-card-when">' + esc(org.town) + '</span>' +
        '</div>' +
        '<p class="dir-card-what">' + esc(org.blurb) + '</p>' +
        '<div class="dir-card-tags">' + cats + tagPills(org.tags) + '</div>' +
        '<span class="dir-card-arrow" aria-hidden="true">↗</span>' +
      '</a>'
    );
  }

  function render() {
    var tags = activeTags();
    var list = document.getElementById('vol-list');
    var count = document.getElementById('vol-count');

    var matching = orgs.filter(function (org) {
      return tags.every(function (t) { return (org.tags || []).indexOf(t) !== -1; });
    });

    var cats = ORG_CATEGORY_ORDER.filter(function (c) {
      return matching.some(function (o) { return (o.categories || [])[0] === c; });
    });
    matching.forEach(function (o) {
      var primary = (o.categories || [])[0];
      if (primary && cats.indexOf(primary) === -1) cats.push(primary);
    });

    if (!matching.length) {
      list.innerHTML = '<p class="page-empty">Nothing in the directory is tagged for that combination — try unchecking a filter, most orgs here just haven’t had these specifics confirmed yet.</p>';
    } else {
      list.innerHTML = cats.map(function (cat) {
        var cards = matching
          .filter(function (o) { return (o.categories || [])[0] === cat; })
          .map(orgCardHTML).join('');
        return '<h3 class="detail-section-label">' + esc(cat) + '</h3><div class="dir-grid">' + cards + '</div>';
      }).join('');
    }

    count.textContent = tags.length
      ? matching.length + ' of ' + orgs.length + ' organizations match'
      : orgs.length + ' local organizations — every link goes straight to their own volunteer page';
  }

  function renderAll() {
    renderFresh();
    render();
  }

  Promise.all([
    window.BTBC.fetchJSON('data/volunteers/fresh.json'),
    window.BTBC.fetchJSON('data/volunteers/orgs.json'),
  ]).then(function (results) {
    var freshData = results[0], orgsData = results[1];

    fresh = (Array.isArray(freshData.opportunities) ? freshData.opportunities : [])
      .filter(function (item) {
        return item && item.url && typeof item.last_checked === 'string' &&
          daysAgo(item.last_checked) <= MAX_FRESH_AGE_DAYS;
      })
      .sort(function (a, b) { return a.last_checked < b.last_checked ? 1 : -1; });

    orgs = Array.isArray(orgsData.organizations) ? orgsData.organizations : [];

    renderAll();
  }).catch(function () {
    document.getElementById('vol-fresh-list').innerHTML =
      '<p class="page-empty">Could not load listings. Run a local server (<code>python3 -m http.server 8000</code>) if you’re previewing from disk.</p>';
    document.getElementById('vol-list').innerHTML = '';
  });

  document.getElementById('vol-filters').addEventListener('change', renderAll);
})();
