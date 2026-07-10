-- ============================================================
-- BTown quick wins — one-time Supabase setup
-- Run this ONCE in the Supabase SQL editor for the shared games
-- project (jnouvwxomrcffqwilqkq). It creates:
--   1. btb_events            — donate/newsletter/about click counter
--   2. btb_playlist_tracks   — community playlist submissions
--   3. btb_playlist_votes    — upvotes (one per visitor per track)
-- plus the RPC functions the site calls. Until this runs, the
-- pages work fine: tracking silently no-ops and the playlist
-- shows the starter picks from data/playlist.json.
--
-- MODERATION: new submissions land with status = 'pending' and
-- never appear on the site. To approve: Table Editor →
-- btb_playlist_tracks → set status to 'approved' (and tick
-- is_local if it's a Vermont artist). Set 'rejected' to hide.
--
-- WHICH DONATE COPY WORKS? After a week or two, run:
--   select event, variant, count(*) from btb_events
--   where event = 'strip-donate' group by 1, 2;
-- ============================================================

-- 1. Click counter -------------------------------------------------
create table if not exists btb_events (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  event      text not null,
  page       text,
  variant    text
);
alter table btb_events enable row level security; -- no policies: RPC-only

create or replace function btb_track_event(p_event text, p_page text, p_variant text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event is null or length(p_event) > 64 then return; end if;
  insert into btb_events (event, page, variant)
  values (p_event, left(p_page, 128), left(p_variant, 16));
end $$;

grant execute on function btb_track_event(text, text, text) to anon;

-- 2. Playlist ------------------------------------------------------
create table if not exists btb_playlist_tracks (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  week_key   text not null,               -- e.g. '2026-W28', set by the client
  song       text not null,
  artist     text not null,
  url        text not null,
  why        text,
  submitter  text,
  is_local   boolean not null default false,
  status     text not null default 'pending'  -- pending | approved | rejected
);
alter table btb_playlist_tracks enable row level security;

create table if not exists btb_playlist_votes (
  track_id   uuid not null references btb_playlist_tracks(id) on delete cascade,
  voter      text not null,
  created_at timestamptz not null default now(),
  primary key (track_id, voter)
);
alter table btb_playlist_votes enable row level security;

-- Submit: always lands in the moderation queue (status = 'pending').
create or replace function btb_playlist_submit(
  p_song text, p_artist text, p_url text, p_why text,
  p_name text, p_is_local boolean, p_week text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_song), '')  = '' or length(p_song)  > 120 then raise exception 'bad song'; end if;
  if coalesce(trim(p_artist), '') = '' or length(p_artist) > 120 then raise exception 'bad artist'; end if;
  if p_url is null or p_url !~* '^https?://' or length(p_url) > 500 then raise exception 'bad url'; end if;
  if p_week is null or p_week !~ '^\d{4}-W\d{2}$' then raise exception 'bad week'; end if;
  insert into btb_playlist_tracks (song, artist, url, why, submitter, is_local, week_key)
  values (trim(p_song), trim(p_artist), trim(p_url),
          left(trim(coalesce(p_why, '')), 280),
          left(trim(coalesce(p_name, '')), 60),
          coalesce(p_is_local, false), p_week);
end $$;

grant execute on function btb_playlist_submit(text, text, text, text, text, boolean, text) to anon;

-- Read: approved tracks for a week, best-voted first.
create or replace function btb_playlist_get(p_week text)
returns table (
  id uuid, song text, artist text, url text, why text,
  submitter text, is_local boolean, votes bigint
)
language sql security definer set search_path = public stable as $$
  select t.id, t.song, t.artist, t.url, t.why, t.submitter, t.is_local,
         count(v.voter) as votes
  from btb_playlist_tracks t
  left join btb_playlist_votes v on v.track_id = t.id
  where t.status = 'approved' and t.week_key = p_week
  group by t.id
  order by votes desc, t.created_at asc;
$$;

grant execute on function btb_playlist_get(text) to anon;

-- Vote: one per visitor per track; returns the new count.
create or replace function btb_playlist_vote(p_track uuid, p_voter text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if coalesce(trim(p_voter), '') = '' or length(p_voter) > 80 then raise exception 'bad voter'; end if;
  if not exists (select 1 from btb_playlist_tracks where id = p_track and status = 'approved') then
    raise exception 'unknown track';
  end if;
  insert into btb_playlist_votes (track_id, voter) values (p_track, trim(p_voter))
  on conflict do nothing;
  select count(*) into n from btb_playlist_votes where track_id = p_track;
  return n;
end $$;

grant execute on function btb_playlist_vote(uuid, text) to anon;
