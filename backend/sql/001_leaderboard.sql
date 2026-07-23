-- Public training leaderboard: adds course_code + counted tracking to
-- predictions (so only a user's first attempt per course/target ranks),
-- and the two RPCs the /leaderboard endpoint calls. Run once in the
-- Supabase SQL editor.

alter table predictions
  add column if not exists course_code text,
  add column if not exists counted boolean not null default false;

create index if not exists predictions_user_course_target_idx
  on predictions (user_id, course_code, target);

-- Backfill course_code for existing rows from the section's course.
update predictions p
set course_code = b.course_code
from bidding_table_info b
where p.course_id = b.course_id
  and p.course_code is null;

-- Backfill counted: each user's earliest scored training row per
-- (course_code, target) counts; later attempts at the same course don't.
with first_attempt as (
  select distinct on (user_id, course_code, target) id
  from predictions
  where mode = 'training' and score is not null and course_code is not null
  order by user_id, course_code, target, created_at asc
)
update predictions
set counted = true
where id in (select id from first_attempt);

create or replace function training_leaderboard(
  p_limit int,
  p_weekly boolean default false,
  p_min_games int default 10
)
returns table (
  user_id uuid,
  display_name text,
  avg_score numeric,
  avg_error_pct numeric,
  predictions bigint
)
language sql
stable
as $$
  select
    p.user_id,
    pr.display_name,
    round(avg(p.score)::numeric, 2) as avg_score,
    round((avg(p.error_pct) * 100)::numeric, 2) as avg_error_pct,
    count(*) as predictions
  from predictions p
  join profiles pr on pr.id = p.user_id
  where p.counted
    and p.mode = 'training'
    and (
      not p_weekly
      or p.created_at >= date_trunc('week', now() at time zone 'Asia/Singapore')
    )
  group by p.user_id, pr.display_name
  having count(*) >= p_min_games
  order by avg_score desc
  limit p_limit;
$$;

create or replace function top_scores(p_limit int)
returns table (
  display_name text,
  course_code text,
  target text,
  score numeric,
  error_pct numeric,
  created_at timestamptz
)
language sql
stable
as $$
  select
    pr.display_name,
    p.course_code,
    p.target,
    p.score,
    round((p.error_pct * 100)::numeric, 2) as error_pct,
    p.created_at
  from predictions p
  join profiles pr on pr.id = p.user_id
  where p.counted and p.mode = 'training'
  order by p.score desc, p.error_pct asc, p.created_at asc
  limit p_limit;
$$;
