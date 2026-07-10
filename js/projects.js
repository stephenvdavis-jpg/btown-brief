/* Community projects — renders data/projects.json grouped by category. */
(function () {
  'use strict';

  var esc = window.BTBC.esc;
  var CATEGORY_META = [
    ['Newsletters & News', '📬'], ['Podcasts & Radio', '🎙️'],
    ['Tools & Data', '🛠️'], ['Community', '🏘️'],
    ['History & Photos', '🏛️'], ['Other', '✨'],
  ];

  function cardHTML(p) {
    return (
      '<a class="dir-card" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
        '<div class="dir-card-head"><span class="dir-card-name">' + esc(p.name) + '</span></div>' +
        '<p class="dir-card-what">' + esc(p.what) + '</p>' +
        (p.maker ? '<p class="dir-card-maker">made by ' + esc(p.maker) + '</p>' : '') +
        '<span class="dir-card-arrow" aria-hidden="true">↗</span>' +
      '</a>'
    );
  }

  window.BTBC.fetchJSON('data/projects.json').then(function (data) {
    var projects = data.projects || [];
    var list = document.getElementById('projects-list');
    var html = '';

    CATEGORY_META.forEach(function (meta) {
      var cat = meta[0], emoji = meta[1];
      var group = projects.filter(function (p) { return p.category === cat; });
      if (!group.length) return;
      html += '<h2 class="section-label">' + emoji + ' ' + esc(cat) + '</h2>' +
              '<div class="dir-grid">' + group.map(cardHTML).join('') + '</div>';
    });

    var known = CATEGORY_META.map(function (m) { return m[0]; });
    var stray = projects.filter(function (p) { return known.indexOf(p.category) === -1; });
    if (stray.length) {
      html += '<h2 class="section-label">More</h2><div class="dir-grid">' + stray.map(cardHTML).join('') + '</div>';
    }

    list.innerHTML = html || '<p class="page-empty">No projects yet.</p>';
  }).catch(function () {
    document.getElementById('projects-list').innerHTML =
      '<p class="page-empty">Could not load the list. Run a local server (<code>python3 -m http.server 8000</code>) if you’re previewing from disk.</p>';
  });
})();
