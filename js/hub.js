/* ============================================================
   THE LAKE HOUR — guide hub

   Everything on this page is real. The sky phase comes from the
   actual sunrise/sunset in data/weather/latest.json, the orb sits
   where the sun actually is, and the tiles count live rows out of
   the same files the individual pages use.

   Every panel degrades on its own: a fetch that fails leaves its
   tile quiet rather than taking the page down.
============================================================ */
(function () {
  'use strict';

  var TZ = 'America/New_York';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- helpers ---------- */

  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(url + ' ' + r.status);
      return r.json();
    });
  }

  // Burlington's wall clock, whatever timezone the reader is in.
  function btParts(d) {
    var f = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', weekday: 'short'
    });
    var out = {};
    f.formatToParts(d).forEach(function (p) { out[p.type] = p.value; });
    return out;
  }

  function clockLabel(d) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, hour: 'numeric', minute: '2-digit'
    }).format(d);
  }

  function relMinutes(ms) { return Math.round(ms / 60000); }

  function humanGap(mins) {
    if (mins < 1) return 'any minute now';
    if (mins < 60) return mins + ' min';
    var h = Math.floor(mins / 60), m = mins % 60;
    return m ? h + 'h ' + m + 'm' : h + 'h';
  }

  /* ---------- the sky ---------- */

  function skyPhase(now, rise, set) {
    var GOLD = 75 * 60000;   // the long Champlain golden hour
    var DUSK = 45 * 60000;   // afterglow once the sun is down
    var DAWN = 60 * 60000;
    var MORN = 90 * 60000;

    if (now < rise - DAWN) return 'night';
    if (now < rise) return 'dawn';
    if (now < rise + MORN) return 'morning';
    if (now < set - GOLD) return 'day';
    if (now < set) return 'golden';
    if (now < set + DUSK) return 'dusk';
    return 'night';
  }

  var GREY = /(cloud|overcast|rain|shower|snow|fog|mist|storm|drizzle|haze)/i;

  /* ---------- the hero photograph ----------
     Drop images into assets/sky/ named for the phase they belong to:

       assets/sky/dawn.jpg  morning.jpg  day.jpg
                  golden.jpg  dusk.jpg   night.jpg

     Optionally add assets/sky/credits.json — { "golden": "North Beach, July" }
     — and the caption appears bottom-right.

     Any phase without a photo simply keeps the drawn sky, so this is safe to
     ship half-finished and fill in as the shots come back.
  */
  var photoTried = {};

  function loadPhaseImage(phase) {
    if (photoTried[phase]) return;
    photoTried[phase] = true;

    // Try the hour's own photograph; fall back to assets/sky/default.jpg while
    // the set is still being shot; fall back to the drawn sky if neither exists.
    tryImage('assets/sky/' + phase + '.jpg', phase, function () {
      tryImage('assets/sky/default.jpg', phase, null);
    });
  }

  function tryImage(src, phase, onFail) {
    var img = new Image();
    img.onload = function () {
      // Don't dress the page for an hour we've since moved out of.
      if (document.documentElement.getAttribute('data-phase') !== phase) return;
      // A relative url() inside a custom property resolves against the STYLESHEET
      // (css/hub.css), not this page — so hand CSS an absolute URL.
      var abs = new URL(src, document.baseURI).href;
      document.documentElement.style.setProperty('--sky-img', 'url("' + abs + '")');
      document.documentElement.setAttribute('data-art', 'photo');
      showCredit(phase);
    };
    img.onerror = function () { if (onFail) onFail(); };
    img.src = src;
  }

  var credits = null;
  function showCredit(phase) {
    var el = $('credit');
    if (!el) return;
    function put() {
      var c = credits && credits[phase];
      el.textContent = c ? c : '';
    }
    if (credits) return put();
    getJSON('assets/sky/credits.json')
      .then(function (d) { credits = d || {}; put(); })
      .catch(function () { credits = {}; });
  }

  function paintSky(weather) {
    var root = document.documentElement;
    var now = Date.now();

    var sun = (weather && weather.sun) || {};
    var rise = sun.sunrise ? new Date(sun.sunrise).getTime() : null;
    var set = sun.sunset ? new Date(sun.sunset).getTime() : null;

    // No sun data? Fall back to a plausible clock-based guess rather
    // than leaving the page in its default blue.
    if (!rise || !set) {
      var hr = parseInt(btParts(new Date(now)).hour, 10);
      var guess = hr < 5 || hr >= 21 ? 'night' : hr < 7 ? 'dawn' : hr < 9 ? 'morning' :
                  hr < 19 ? 'day' : hr < 20 ? 'golden' : 'dusk';
      root.setAttribute('data-phase', guess);
      loadPhaseImage(guess);
      return;
    }

    // The sun may already have set today; look ahead to tomorrow so the
    // "sunrise in ..." line stays truthful through the night.
    var phase = skyPhase(now, rise, set);
    root.setAttribute('data-phase', phase);
    loadPhaseImage(phase);

    var cond = (weather.now && weather.now.description) || '';
    if (GREY.test(cond)) root.setAttribute('data-sky', 'grey');
    else root.removeAttribute('data-sky');

    placeOrb(now, rise, set, phase, sun);
    writeConditions(now, rise, set, phase, weather, sun);
  }

  // Put the sun (or moon) where it actually is in its arc.
  function placeOrb(now, rise, set, phase, sun) {
    var orb = $('orb');
    var glint = $('glint');
    if (!orb) return;

    var isNight = (phase === 'night');
    var p;

    if (isNight) {
      orb.classList.add('moon');
      // Track the moon across the dark hours from last sunset to next sunrise.
      var nextRise = sun.sunrise_tomorrow ? new Date(sun.sunrise_tomorrow).getTime() : rise + 86400000;
      var from = (now > set) ? set : rise - 86400000;
      var to = (now > set) ? nextRise : rise;
      p = (now - from) / (to - from);
    } else {
      orb.classList.remove('moon');
      p = (now - rise) / (set - rise);
    }
    p = Math.max(0, Math.min(1, p));

    // Left to right across the sky; a sine arc for the height.
    var x = 8 + p * 84;                       // percent
    var y = 74 - Math.sin(p * Math.PI) * 56;  // percent, lower number = higher up

    orb.style.left = x + '%';
    orb.style.top = y + '%';

    // The glitter path on the water only makes sense under a low sun.
    if (glint) {
      var low = !isNight && (phase === 'golden' || phase === 'dusk' || phase === 'dawn');
      glint.style.left = x + '%';
      glint.style.opacity = low ? '0.9' : (isNight ? '0.35' : '0.25');
    }
  }

  function writeConditions(now, rise, set, phase, weather, sun) {
    var el = $('conditions');
    if (!el) return;

    var bits = [];
    bits.push('<strong>' + clockLabel(new Date(now)) + '</strong>');

    // The single most Burlington fact: how long until the sun hits the lake.
    if (now < set && now > rise) {
      bits.push('sunset in ' + humanGap(relMinutes(set - now)));
    } else if (now >= set) {
      var nr = sun.sunrise_tomorrow ? new Date(sun.sunrise_tomorrow).getTime() : rise + 86400000;
      bits.push('sunrise in ' + humanGap(relMinutes(nr - now)));
    } else {
      bits.push('sunrise in ' + humanGap(relMinutes(rise - now)));
    }

    var w = weather.now || {};
    if (typeof w.temp_f === 'number') bits.push('<strong>' + Math.round(w.temp_f) + '°</strong>');
    if (w.description) bits.push(w.description.toLowerCase());

    el.innerHTML = bits.join('<span class="sep">·</span>');
  }

  /* ---------- the live tiles ---------- */

  function tileOpenNow() {
    return getJSON('data/restaurants.json').then(function (data) {
      var list = data.restaurants || [];
      if (!window.BTFood) throw new Error('food-lib missing');
      var t = window.BTFood.now();          // { day, minutes } in Burlington time
      var open = 0;
      list.forEach(function (r) {
        var hours = r.hours;
        if (typeof hours === 'string') { try { hours = JSON.parse(hours); } catch (e) { return; } }
        if (!hours) return;
        if (window.BTFood.isOpenAt(hours, t.day, t.minutes)) open++;
      });
      set$('open-count', String(open));
      set$('open-sub', 'of ' + list.length + ' places serving now');
      stat('stat-restaurants', open + ' open');
    });
  }

  function tileTonight() {
    return getJSON('data/events/events.json').then(function (data) {
      var evs = data.events || [];
      var today = btParts(new Date());
      var key = today.year + '-' + today.month + '-' + today.day;
      var now = Date.now();

      // "Tonight" = starts today, Burlington time, and hasn't already ended.
      var left = evs.filter(function (e) {
        if (!e.start) return false;
        var p = btParts(new Date(e.start));
        if (p.year + '-' + p.month + '-' + p.day !== key) return false;
        var endMs = e.end ? new Date(e.end).getTime() : new Date(e.start).getTime() + 7200000;
        return endMs >= now;
      });

      set$('tonight-count', String(left.length));
      set$('tonight-sub', left.length ? 'still to come across town' : 'all wrapped up for today');
      stat('stat-events', left.length + ' today');
    });
  }

  function tileLake(weather) {
    var gage = (weather && weather.lake_gage) || {};
    var temp = gage.water_temp_f;
    if (typeof temp === 'number') {
      set$('lake-temp', Math.round(temp) + '<span class="unit">°F</span>');
    } else {
      set$('lake-temp', '—');
    }

    return getJSON('data/weather/beaches.json').then(function (data) {
      var beaches = data.beaches || [];
      var green = beaches.filter(function (b) { return b.status === 'green'; }).length;
      var el = $('lake-sub');
      if (!el || !beaches.length) return;
      if (green === beaches.length) {
        el.innerHTML = '<span class="yes">All ' + green + ' beaches open</span>';
      } else if (green === 0) {
        el.innerHTML = '<span class="no">No beaches open</span>';
      } else {
        el.innerHTML = '<span class="yes">' + green + '</span> of ' + beaches.length + ' beaches open';
      }
      stat('stat-weather', green + '/' + beaches.length + ' beaches');
    });
  }

  function statChanges() {
    return getJSON('data/changes/changes.json').then(function (data) {
      var items = data.events || [];
      if (items.length) stat('stat-changes', items.length + ' new');
    });
  }

  function statDeals() {
    return getJSON('data/deals.json').then(function (data) {
      var list = data.deals || [];
      if (!list.length || !window.BTFood) return;
      var t = window.BTFood.now();
      var today = list.filter(function (d) {
        try { return window.BTFood.dealAppliesToday(d, t); } catch (e) { return false; }
      });
      if (today.length) stat('stat-deals', today.length + ' today');
    });
  }

  function set$(id, html) { var el = $(id); if (el) el.innerHTML = html; }
  function stat(id, text) { var el = $(id); if (el) el.textContent = text; }

  /* ---------- go ---------- */

  function init() {
    // The sky is the whole point — paint it first, and keep it honest
    // by repainting every minute so an open tab doesn't drift.
    getJSON('data/weather/latest.json')
      .then(function (weather) {
        paintSky(weather);
        setInterval(function () { paintSky(weather); }, 60000);
        tileLake(weather).catch(noop);
      })
      .catch(function () {
        paintSky({});   // still pick a phase off the clock
      });

    tileOpenNow().catch(noop);
    tileTonight().catch(noop);
    statChanges().catch(noop);
    statDeals().catch(noop);
  }

  function noop() {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
