-- ============================================================
-- BTown sunset tracker — one-time Supabase setup
-- Run this ONCE in the Supabase SQL editor for the shared games
-- project (jnouvwxomrcffqwilqkq). It creates:
--   1. btb_sunset_spot_votes  — sunset spot upvotes
--   2. btb_sunset_ratings     — nightly accuracy ratings
--   3. btb_sunset_photo_queue — moderated photo submissions
-- plus the RPC functions the site calls. Until this runs, the
-- sunset tracker works fine: community features silently no-op.
-- ============================================================

-- 1. Spot upvotes -------------------------------------------------
create table if not exists btb_sunset_spot_votes (
  spot_id    text not null,
  voter      text not null,
  created_at timestamptz default now(),
  primary key (spot_id, voter)
);
alter table btb_sunset_spot_votes enable row level security; -- no policies: RPC-only

-- Vote: one per visitor per spot; returns the new count.
create or replace function btb_sunset_spot_vote(p_spot text, p_voter text)
returns bigint
language plpgsql security definer set search_path = public as $$
declare n bigint;
begin
  if coalesce(trim(p_spot), '') = '' or length(p_spot) > 60 then raise exception 'bad spot'; end if;
  if coalesce(trim(p_voter), '') = '' or length(p_voter) > 80 then raise exception 'bad voter'; end if;
  insert into btb_sunset_spot_votes (spot_id, voter) values (trim(p_spot), trim(p_voter))
  on conflict do nothing;
  select count(*) into n from btb_sunset_spot_votes where spot_id = trim(p_spot);
  return n;
end $$;

grant execute on function btb_sunset_spot_vote(text, text) to anon;

-- Read: vote counts for all spots.
create or replace function btb_sunset_spot_counts()
returns table (spot_id text, votes bigint)
language sql security definer set search_path = public stable as $$
  select v.spot_id, count(*) as votes
  from btb_sunset_spot_votes v
  group by v.spot_id;
$$;

grant execute on function btb_sunset_spot_counts() to anon;

-- 2. Nightly accuracy ratings -------------------------------------
create table if not exists btb_sunset_ratings (
  night_key  date not null,
  voter      text not null,
  rating     int not null check (rating between 1 and 5),
  predicted  numeric,
  created_at timestamptz default now(),
  primary key (night_key, voter)
);
alter table btb_sunset_ratings enable row level security; -- no policies: RPC-only

-- Rate: one rating per visitor per night; later ratings replace it.
create or replace function btb_sunset_rate(
  p_night date, p_voter text, p_rating int, p_predicted numeric
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_voter), '') = '' or length(p_voter) > 80 then raise exception 'bad voter'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'bad rating'; end if;
  if p_night is null or p_night > current_date + 1 or p_night < current_date - 2 then raise exception 'bad night'; end if;
  if p_predicted is not null and p_predicted not between 0 and 10 then raise exception 'bad predicted'; end if;
  insert into btb_sunset_ratings (night_key, voter, rating, predicted)
  values (p_night, trim(p_voter), p_rating, p_predicted)
  on conflict (night_key, voter) do update
  set rating = excluded.rating, predicted = excluded.predicted;
end $$;

grant execute on function btb_sunset_rate(date, text, int, numeric) to anon;

-- Read: per-night accuracy, newest night first.
create or replace function btb_sunset_accuracy(p_limit int default 30)
returns table (night_key date, avg_rating numeric, avg_predicted numeric, n bigint)
language sql security definer set search_path = public stable as $$
  select r.night_key, avg(r.rating) as avg_rating,
         avg(r.predicted) as avg_predicted, count(*) as n
  from btb_sunset_ratings r
  group by r.night_key
  order by r.night_key desc
  limit least(greatest(coalesce(p_limit, 30), 1), 90);
$$;

grant execute on function btb_sunset_accuracy(int) to anon;

-- 3. Photo submission moderation queue ----------------------------
create table if not exists btb_sunset_photo_queue (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  credit     text not null,
  contact    text,
  photo_url  text,
  note       text,
  status     text not null default 'pending'
);
alter table btb_sunset_photo_queue enable row level security; -- no policies: RPC-only

-- Submit: always lands in the moderation queue (status = 'pending').
create or replace function btb_sunset_photo_submit(
  p_credit text, p_contact text, p_photo_url text, p_note text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_credit), '') = '' or length(p_credit) > 80 then raise exception 'bad credit'; end if;
  if length(p_contact) > 120 then raise exception 'bad contact'; end if;
  if length(p_photo_url) > 500 then raise exception 'bad photo url'; end if;
  if length(p_note) > 500 then raise exception 'bad note'; end if;
  insert into btb_sunset_photo_queue (credit, contact, photo_url, note, status)
  values (trim(p_credit), trim(p_contact), trim(p_photo_url), trim(p_note), 'pending');
end $$;

grant execute on function btb_sunset_photo_submit(text, text, text, text) to anon;
