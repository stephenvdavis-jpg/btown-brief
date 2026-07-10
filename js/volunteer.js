/* Volunteer page — renders data/volunteer.json with quick filters.
   Filters AND together: checking "2 hours" + "outdoors" shows orgs
   tagged with both. */
(function () {
  'use strict';

  var esc = window.BTBC.esc;
  var TAG_LABELS = {
    quick: '~2 hours',
    outdoor: 'outdoors',
    onetime: 'one-time',
    recurring: 'recurring',
    friends: 'bring friends',
  };
  var CATEGORY_ORDER = [
    'Environment & Outdoors', 'Animals', 'Food & Housing',
    'Kids & Families', 'Older Neighbors & Health', 'Arts & Civic Life',
  ];

  var orgs = [];

  function activeTags() {
    return Array.prototype.slice
      .call(document.querySelectorAll('#vol-filters input:checked'))
      .map(function (el) { return el.value; });
  }

  function cardHTML(org) {
    var tags = (org.tags || []).map(function (t) {
      return '<span class="dir-tag">' + esc(TAG_LABELS[t] || t) + '</span>';
    }).join('');
    return (
      '<a class="dir-card" href="' + esc(org.url) + '" target="_blank" rel="noopener">' +
        '<div class="dir-card-head"><span class="dir-card-name">' + esc(org.name) + '</span></div>' +
        '<p class="dir-card-what">' + esc(org.what) + '</p>' +
        '<div class="dir-card-tags">' + tags + '</div>' +
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

    var cats = CATEGORY_ORDER.filter(function (c) {
      return matching.some(function (o) { return o.category === c; });
    });
    // Any category not in the preset order still renders, at the end.
    matching.forEach(function (o) {
      if (cats.indexOf(o.category) === -1) cats.push(o.category);
    });

    if (!matching.length) {
      list.innerHTML = '<p class="page-empty">Nothing matches that combination — try unchecking a filter, or hit the United Way search above for this week’s full list.</p>';
    } else {
      list.innerHTML = cats.map(function (cat) {
        var cards = matching
          .filter(function (o) { return o.category === cat; })
          .map(cardHTML).join('');
        return '<h2 class="section-label">' + esc(cat) + '</h2><div class="dir-grid">' + cards + '</div>';
      }).join('');
    }

    count.textContent = tags.length
      ? matching.length + ' of ' + orgs.length + ' organizations match'
      : orgs.length + ' local organizations — every link goes straight to their volunteer page';
  }

  window.BTBC.fetchJSON('data/volunteer.json').then(function (data) {
    orgs = data.orgs || [];
    render();
  }).catch(function () {
    document.getElementById('vol-list').innerHTML =
      '<p class="page-empty">Could not load the list. Run a local server (<code>python3 -m http.server 8000</code>) if you’re previewing from disk.</p>';
  });

  document.getElementById('vol-filters').addEventListener('change', render);
})();
