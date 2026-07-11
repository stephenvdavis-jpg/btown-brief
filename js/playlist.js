/* Community playlist.
   Live mode: reads/writes the shared Supabase project via the RPCs in
   db/quick-wins.sql — submissions land in a moderation queue (pending),
   votes are one-per-visitor-per-track, the list self-sorts by votes.
   Fallback mode (before the SQL has been run, or offline): shows the
   starter picks from data/playlist.json and turns the form into a
   pre-filled email to Steve — still moderated, just by inbox. */
(function () {
  'use strict';

  var esc = window.BTBC.esc;
  var track = window.BTBC.track;

  var SUPABASE_URL = 'https://jnouvwxomrcffqwilqkq.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_RkMJQopffWlV6DSwCRkndQ_Xw6GJMf3';

  var liveMode = false;
  var tracks = [];       // current week's list (live or seeds)
  var votedIds = {};     // local echo of this visitor's votes
  try { votedIds = JSON.parse(localStorage.getItem('btb-playlist-voted') || '{}'); } catch (e) {}

  /* ISO week key like 2026-W28 for a given date — matches what the SQL expects. */
  function isoWeekKeyOf(date) {
    var d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // Thursday of that week
    var week1 = new Date(d.getFullYear(), 0, 4);
    var week = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    return d.getFullYear() + '-W' + String(week).padStart(2, '0');
  }

  /* The list runs in TWO-WEEK periods. A period is keyed by the ISO week
     of its starting Monday (fortnights anchored to Mon 2026-01-05), so the
     key format the SQL validates stays the same. */
  function periodKey() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    var monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    var epoch = new Date(2026, 0, 5); // a Monday
    var weeks = Math.round((monday - epoch) / 604800000);
    if (((weeks % 2) + 2) % 2 !== 0) monday.setDate(monday.getDate() - 7);
    return isoWeekKeyOf(monday);
  }

  function rpc(fn, args) {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    }).then(function (res) {
      if (!res.ok) throw new Error(fn + ' failed: ' + res.status);
      return res.text().then(function (t) { return t ? JSON.parse(t) : null; });
    });
  }

  function platformLabel(url) {
    try {
      var host = new URL(url).hostname.replace(/^www\./, '');
      if (host.indexOf('spotify') !== -1) return '▶ Spotify';
      if (host.indexOf('music.apple') !== -1) return '▶ Apple Music';
      if (host.indexOf('youtube') !== -1 || host === 'youtu.be') return '▶ YouTube';
      if (host.indexOf('bandcamp') !== -1) return '▶ Bandcamp';
      if (host.indexOf('soundcloud') !== -1) return '▶ SoundCloud';
      if (host.indexOf('tidal') !== -1) return '▶ Tidal';
      return '▶ Listen';
    } catch (e) { return '▶ Listen'; }
  }

  function trackHTML(t) {
    var voted = t.id && votedIds[t.id];
    var voteBtn = '';
    if (liveMode) {
      voteBtn =
        '<button class="pl-vote' + (voted ? ' voted' : '') + '" data-id="' + esc(t.id) + '" type="button" aria-label="Upvote ' + esc(t.song) + '">' +
          '<span class="pl-vote-count">' + (t.votes || 0) + '</span>' +
          '<span class="pl-vote-label">' + (voted ? 'voted' : 'vote') + '</span>' +
        '</button>';
    }
    return (
      '<div class="pl-track">' +
        voteBtn +
        '<div class="pl-track-info">' +
          '<div class="pl-track-title">' + esc(t.song) + ' <span class="pl-track-artist">— ' + esc(t.artist) + '</span></div>' +
          (t.why ? '<p class="pl-track-why">“' + esc(t.why) + '”' + (t.submitter ? ' <span>— ' + esc(t.submitter) + '</span>' : '') + '</p>' : '') +
          '<div class="pl-track-meta">' +
            (t.is_local ? '<span class="pl-badge pl-badge-local">🍁 Local artist</span>' : '') +
          '</div>' +
        '</div>' +
        '<a class="pl-listen" href="' + esc(t.url) + '" target="_blank" rel="noopener">' + platformLabel(t.url) + '</a>' +
      '</div>'
    );
  }

  function render() {
    var localOnly = document.getElementById('local-only').checked;
    var list = document.getElementById('pl-list');
    var count = document.getElementById('pl-count');
    var visible = tracks.filter(function (t) { return !localOnly || t.is_local; });

    if (!visible.length) {
      list.innerHTML = '<p class="page-empty">' + (localOnly
        ? 'No local-artist tracks on the list yet — add one below!'
        : 'Nothing on this week’s list yet. Yours could be the first — add a song below.') + '</p>';
    } else {
      list.innerHTML = visible.map(trackHTML).join('');
    }

    count.textContent = liveMode
      ? visible.length + ' songs on the current list — upvote your favorites'
      : 'Starter picks while the community list warms up — add yours below';
  }

  /* ---------- past winners (top track of each earlier period) ---------- */
  function renderWinners(rows) {
    if (!rows || !rows.length) return;
    var wrap = document.getElementById('pl-winners');
    var list = document.getElementById('pl-winners-list');
    list.innerHTML = rows.map(function (t) {
      return (
        '<div class="pl-track pl-track-winner">' +
          '<span class="pl-winner-trophy" aria-hidden="true">🏆</span>' +
          '<div class="pl-track-info">' +
            '<div class="pl-track-title">' + esc(t.song) + ' <span class="pl-track-artist">— ' + esc(t.artist) + '</span></div>' +
            '<div class="pl-track-meta">' +
              '<span class="pl-badge">' + t.votes + ' vote' + (t.votes === 1 ? '' : 's') + '</span>' +
              (t.is_local ? '<span class="pl-badge pl-badge-local">🍁 Local artist</span>' : '') +
              (t.submitter ? '<span class="pl-badge">picked by ' + esc(t.submitter) + '</span>' : '') +
            '</div>' +
          '</div>' +
          '<a class="pl-listen" href="' + esc(t.url) + '" target="_blank" rel="noopener">' + platformLabel(t.url) + '</a>' +
        '</div>'
      );
    }).join('');
    wrap.hidden = false;
  }

  /* ---------- load ---------- */
  var seedsPromise = window.BTBC.fetchJSON('data/playlist.json').catch(function () { return { seeds: [] }; });

  seedsPromise.then(function (cfg) {
    if (cfg.theme && cfg.theme.title) {
      document.getElementById('theme-title').textContent = cfg.theme.title;
      document.getElementById('theme-sub').textContent = cfg.theme.sub || '';
      document.getElementById('theme-banner').hidden = false;
    }
    return rpc('btb_playlist_get', { p_week: periodKey() }).then(function (rows) {
      liveMode = true;
      tracks = rows || [];
      if (!tracks.length && cfg.seeds && cfg.seeds.length) {
        // Live but empty period: show seeds below a fresh-list note, unvotable.
        liveMode = false;
        tracks = cfg.seeds;
      }
      render();
      // Winners wall: the top track of every earlier two-week period.
      rpc('btb_playlist_winners', { p_current: periodKey() })
        .then(renderWinners).catch(function () {});
    }).catch(function () {
      tracks = (cfg.seeds || []);
      render();
    });
  });

  /* ---------- voting ---------- */
  document.getElementById('pl-list').addEventListener('click', function (e) {
    var btn = e.target.closest('.pl-vote');
    if (!btn || !liveMode) return;
    var id = btn.getAttribute('data-id');
    if (votedIds[id]) return;
    votedIds[id] = true;
    localStorage.setItem('btb-playlist-voted', JSON.stringify(votedIds));
    btn.classList.add('voted');
    btn.querySelector('.pl-vote-label').textContent = 'voted';
    rpc('btb_playlist_vote', { p_track: id, p_voter: window.BTBC.visitorId() }).then(function (n) {
      btn.querySelector('.pl-vote-count').textContent = n;
      var t = tracks.filter(function (x) { return x.id === id; })[0];
      if (t) t.votes = n;
      track('playlist-vote');
    }).catch(function () { /* leave the optimistic UI */ });
  });

  /* ---------- submitting ---------- */
  document.getElementById('pl-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var form = e.target;
    var status = document.getElementById('pl-status');
    var submitBtn = document.getElementById('pl-submit');
    var f = {
      song: form.song.value.trim(),
      artist: form.artist.value.trim(),
      url: form.url.value.trim(),
      why: form.why.value.trim(),
      submitter: form.submitter.value.trim(),
      is_local: form.is_local.checked,
    };
    if (!f.song || !f.artist || !f.url) return;

    status.hidden = false;
    status.className = 'pl-form-status';
    status.textContent = 'Sending…';
    submitBtn.disabled = true;

    rpc('btb_playlist_submit', {
      p_song: f.song, p_artist: f.artist, p_url: f.url, p_why: f.why,
      p_name: f.submitter, p_is_local: f.is_local, p_week: periodKey(),
    }).then(function () {
      status.className = 'pl-form-status ok';
      status.textContent = '🎉 Got it! Your song is in the review queue and should appear within a day.';
      form.reset();
      submitBtn.disabled = false;
      track('playlist-submit');
    }).catch(function () {
      // Fallback: pre-filled email — still a moderation queue, via inbox.
      var body = 'Song: ' + f.song + '\nArtist: ' + f.artist + '\nLink: ' + f.url +
        '\nWhy: ' + f.why + '\nName: ' + f.submitter + '\nLocal artist: ' + (f.is_local ? 'yes' : 'no');
      status.className = 'pl-form-status err';
      status.innerHTML = 'The submission service isn’t reachable — <a href="mailto:BtownBrief@gmail.com?subject=' +
        encodeURIComponent('Playlist submission: ' + f.song) + '&body=' + encodeURIComponent(body) +
        '">click here to send it by email instead</a>.';
      submitBtn.disabled = false;
    });
  });

  document.getElementById('local-only').addEventListener('change', render);
})();
