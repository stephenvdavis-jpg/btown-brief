/* Clubs directory — renders data/clubs.json grouped by category.
   featured: true entries render first, in a highlighted card. */
(function () {
  'use strict';

  var esc = window.BTBC.esc;
  var CATEGORY_META = [
    ['Running', '🏃'], ['Biking', '🚲'], ['Hiking & Outdoors', '🥾'],
    ['Games & Puzzles', '🎲'], ['Books', '📚'], ['Sports & Rec', '⚽'],
    ['Making & Crafts', '🧶'], ['Language', '🗣️'], ['Music', '🎶'],
    ['Dance', '💃'], ['Social', '🍻'], ['Other', '✨'],
  ];

  function cardHTML(club) {
    var cls = 'dir-card' + (club.featured ? ' dir-card-featured' : '');
    return (
      '<a class="' + cls + '" href="' + esc(club.url) + '" target="_blank" rel="noopener">' +
        '<div class="dir-card-head">' +
          '<span class="dir-card-name">' + esc(club.name) + '</span>' +
          (club.when ? '<span class="dir-card-when">' + esc(club.when) + '</span>' : '') +
        '</div>' +
        '<p class="dir-card-what">' + esc(club.what) + '</p>' +
        '<span class="dir-card-arrow" aria-hidden="true">↗</span>' +
      '</a>'
    );
  }

  window.BTBC.fetchJSON('data/clubs.json').then(function (data) {
    var clubs = data.clubs || [];
    var list = document.getElementById('clubs-list');
    var html = '';

    var featured = clubs.filter(function (c) { return c.featured; });
    if (featured.length) {
      html += '<div class="dir-grid">' + featured.map(cardHTML).join('') + '</div>';
    }

    CATEGORY_META.forEach(function (meta) {
      var cat = meta[0], emoji = meta[1];
      var group = clubs.filter(function (c) { return !c.featured && c.category === cat; });
      if (!group.length) return;
      html += '<h2 class="section-label">' + emoji + ' ' + esc(cat) + '</h2>' +
              '<div class="dir-grid">' + group.map(cardHTML).join('') + '</div>';
    });

    // Categories outside the preset order still render.
    var known = CATEGORY_META.map(function (m) { return m[0]; });
    var stray = clubs.filter(function (c) { return !c.featured && known.indexOf(c.category) === -1; });
    if (stray.length) {
      html += '<h2 class="section-label">More</h2><div class="dir-grid">' + stray.map(cardHTML).join('') + '</div>';
    }

    list.innerHTML = html || '<p class="page-empty">No groups yet.</p>';
    document.getElementById('clubs-count').textContent =
      clubs.length + ' groups and counting — know one that belongs here? Scroll down.';
  }).catch(function () {
    document.getElementById('clubs-list').innerHTML =
      '<p class="page-empty">Could not load the list. Run a local server (<code>python3 -m http.server 8000</code>) if you’re previewing from disk.</p>';
  });
})();
