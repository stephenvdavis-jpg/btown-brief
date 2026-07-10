/* Housing page — renders data/housing.json.
   Two sections: the property-manager directory (filterable by tag,
   filters AND together like volunteer.js) and the "everywhere else
   to look" links layer. Manager cards are divs (not one big <a>)
   because each has two distinct actions: listings and contact. */
(function () {
  'use strict';

  var esc = window.BTBC.esc;
  var TAG_LABELS = {
    student: 'near campus',
    downtown: 'downtown',
    affordable: 'affordable / nonprofit',
    senior: 'seniors',
    'large-portfolio': 'big portfolio',
    'small-local': 'small & local',
    waitlist: 'waitlist',
  };

  var managers = [];

  function activeTags() {
    return Array.prototype.slice
      .call(document.querySelectorAll('#pm-filters input:checked'))
      .map(function (el) { return el.value; });
  }

  function telHref(phone) {
    return 'tel:+1' + phone.replace(/\D/g, '');
  }

  function managerCardHTML(pm) {
    var tags = (pm.tags || []).map(function (t) {
      return '<span class="dir-tag">' + esc(TAG_LABELS[t] || t) + '</span>';
    }).join('');

    var actions = '';
    if (pm.listings_url) {
      actions += '<a class="pm-action pm-action-listings" href="' + esc(pm.listings_url) +
        '" target="_blank" rel="noopener">See open units ↗</a>';
    }
    if (pm.contact_url) {
      var isMail = pm.contact_url.indexOf('mailto:') === 0;
      actions += '<a class="pm-action" href="' + esc(pm.contact_url) + '"' +
        (isMail ? '' : ' target="_blank" rel="noopener"') + '>' +
        (isMail ? '✉️ Email them' : 'Contact ↗') + '</a>';
    }
    if (pm.phone) {
      actions += '<a class="pm-action" href="' + telHref(pm.phone) + '">📞 ' + esc(pm.phone) + '</a>';
    }

    return (
      '<div class="dir-card pm-card">' +
        '<div class="dir-card-head"><span class="dir-card-name">' + esc(pm.name) + '</span></div>' +
        '<p class="dir-card-what">' + esc(pm.what) + '</p>' +
        (pm.notes ? '<p class="pm-note">' + esc(pm.notes) + '</p>' : '') +
        '<div class="dir-card-tags">' + tags + '</div>' +
        '<div class="pm-actions">' + actions + '</div>' +
      '</div>'
    );
  }

  function sourceCardHTML(src) {
    return (
      '<a class="dir-card" href="' + esc(src.url) + '" target="_blank" rel="noopener">' +
        '<div class="dir-card-head"><span class="dir-card-name">' + esc(src.name) + '</span></div>' +
        '<p class="dir-card-what">' + esc(src.good_for) + '</p>' +
        (src.gotcha ? '<p class="pm-gotcha">⚠︎ ' + esc(src.gotcha) + '</p>' : '') +
        '<span class="dir-card-arrow" aria-hidden="true">↗</span>' +
      '</a>'
    );
  }

  function renderManagers() {
    var tags = activeTags();
    var list = document.getElementById('pm-list');
    var count = document.getElementById('pm-count');

    var matching = managers.filter(function (pm) {
      return tags.every(function (t) { return (pm.tags || []).indexOf(t) !== -1; });
    });

    if (!matching.length) {
      list.innerHTML = '<p class="page-empty">No managers match that combination — uncheck a filter.</p>';
    } else {
      list.innerHTML = '<div class="dir-grid dir-grid-2">' + matching.map(managerCardHTML).join('') + '</div>';
    }

    count.textContent = tags.length
      ? matching.length + ' of ' + managers.length + ' companies match'
      : managers.length + ' companies — email a few directly and skip the listing-site refresh war';
  }

  window.BTBC.fetchJSON('data/housing.json').then(function (data) {
    managers = data.managers || [];
    renderManagers();
    document.getElementById('source-list').innerHTML =
      (data.sources || []).map(sourceCardHTML).join('');
  }).catch(function () {
    document.getElementById('pm-list').innerHTML =
      '<p class="page-empty">Could not load the directory. Run a local server (<code>python3 -m http.server 8000</code>) if you’re previewing from disk.</p>';
  });

  document.getElementById('pm-filters').addEventListener('change', renderManagers);
})();
