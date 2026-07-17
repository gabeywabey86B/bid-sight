-- Score rescale (0-100 -> 0-1.0) + per-school leaderboards: rescales all
-- stored scores to the new 0-1 scale, denormalizes school_department onto
-- predictions (write-time, mirroring course_code), and re-creates the two
-- leaderboard RPCs with an optional p_school filter. Run once in the
-- Supabase SQL editor, AFTER 001_leaderboard.sql.
--
-- Pre-check (run separately if unsure): score must be numeric/float, not int:
--   select data_type from information_schema.columns
--   where table_name = 'predictions' and column_name = 'score';

-- Rescale existing 0-100 scores to 0-1. Divide rather than recompute from
-- error_pct so the result is exact regardless of what SCORING_K was when
-- each row was written. The score > 1 guard makes re-runs safe (idempotent);
-- an old-scale row could only have score <= 1 at error_pct >= ~19.8 (a
-- 1980%+ miss), which we accept skipping.
update predictions
set score = round((score / 100.0)::numeric, 3)
where score is not null and score > 1;

-- School column, denormalized at write time like course_code (see README:
-- write-time counting rationale). Backfill existing rows from the course's
-- school; DISTINCT ON because bidding_table_info has many rows per
-- course_code (the second order-by key makes the pick deterministic for
-- cross-listed courses).
alter table predictions
  add column if not exists school_department text;

update predictions p
set school_department = b.school_department
from (
  select distinct on (course_code) course_code, school_department
  from bidding_table_info
  where school_department is not null
  order by course_code, school_department
) b
where p.course_code = b.course_code
  and p.school_department is null;

-- Re-create the RPCs with an optional school filter. The old signatures must
-- be dropped first: create-or-replace with a new parameter list would create
-- an OVERLOAD, and named-param RPC calls omitting p_school would then fail
-- with "function is not unique". p_school defaults to null so a backend that
-- still calls with the old params keeps working during the deploy window.
-- No new index: boards only scan counted training rows (small), and the
-- school filter rides the same scan.

drop function if exists training_leaderboard(int, boolean, int);

create or replace function training_leaderboard(
  p_limit int,
  p_weekly boolean default false,
  p_min_games int default 10,
  p_school text default null
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
    round(avg(p.score)::numeric, 3) as avg_score,
    round((avg(p.error_pct) * 100)::numeric, 2) as avg_error_pct,
    count(*) as predictions
  from predictions p
  join profiles pr on pr.id = p.user_id
  where p.counted
    and p.mode = 'training'
    and (p_school is null or p.school_department = p_school)
    and (
      not p_weekly
      or p.created_at >= date_trunc('week', now() at time zone 'Asia/Singapore')
    )
  group by p.user_id, pr.display_name
  having count(*) >= p_min_games
  order by avg_score desc
  limit p_limit;
$$;

drop function if exists top_scores(int);

create or replace function top_scores(p_limit int, p_school text default null)
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
  where p.counted
    and p.mode = 'training'
    and (p_school is null or p.school_department = p_school)
  order by p.score desc, p.error_pct asc, p.created_at asc
  limit p_limit;
$$;
