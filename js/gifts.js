/* Burlington Gift Guide — renders data/gifts.json by category. */
(function () {
  'use strict';

  var esc = window.BTBC.esc;

  function cardHTML(gift) {
    var price = gift.price_approx ? 'about ' + gift.price : gift.price;
    return (
      '<article class="dir-card">' +
        '<div class="dir-card-head">' +
          '<span class="dir-card-name">' + esc(gift.name) + '</span>' +
          '<span class="dir-card-when">' + esc(price) + '</span>' +
        '</div>' +
        '<p class="dir-card-what"><strong>' + esc(gift.item) + '</strong></p>' +
        '<p class="dir-card-maker">' + esc(gift.where) + ' · ' + esc(gift.neighborhood) + '</p>' +
        '<p class="dir-card-what">' + esc(gift.why) + '</p>' +
        '<a class="btb-strip-link" href="' + esc(gift.url) + '" target="_blank" rel="noopener">Shop ' + esc(gift.name) + ' →</a>' +
      '</article>'
    );
  }

  function categoryHTML(category) {
    return (
      '<section id="' + esc(category.id) + '" aria-labelledby="' + esc(category.id) + '-title">' +
        '<h2 class="section-label" id="' + esc(category.id) + '-title">' + esc(category.title) + '</h2>' +
        '<p class="dir-card-maker">' + esc(category.intro) + '</p>' +
        '<div class="dir-grid">' + category.gifts.map(cardHTML).join('') + '</div>' +
      '</section>'
    );
  }

  window.BTBC.fetchJSON('data/gifts.json').then(function (data) {
    var categories = data.categories || [];
    var jump = document.getElementById('gift-jump');
    var list = document.getElementById('gifts-list');

    jump.innerHTML = categories.map(function (category) {
      return '<a class="quick-chip" href="#' + esc(category.id) + '">' + esc(category.title) + '</a>';
    }).join('');
    list.innerHTML = categories.map(categoryHTML).join('') ||
      '<p class="page-empty">No gifts are listed yet.</p>';
  }).catch(function () {
    document.getElementById('gift-jump').innerHTML = '';
    document.getElementById('gifts-list').innerHTML =
      '<p class="page-empty">Could not load the gift guide. Run a local server (<code>python3 -m http.server 8000</code>) if you’re previewing from disk.</p>';
  });
})();
