-- Friends: one-way instant-follow (no request/accept) + a friends-filtered
-- variant of the training leaderboard.

create table if not exists friends (
  user_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

-- No policies: every table in this app is read/written exclusively through
-- the backend's service-role client, never through RLS-scoped roles.
alter table friends enable row level security;

-- Old 4-arg signature must be dropped first, same reason as 002's drop
-- before adding p_school: a create-or-replace with a new param list creates
-- an ambiguous overload for named-param RPC calls.
drop function if exists training_leaderboard(int, boolean, int, text);

create or replace function training_leaderboard(
  p_limit int,
  p_weekly boolean default false,
  p_min_games int default 10,
  p_school text default null,
  p_friends_of uuid default null
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
    and (
      p_friends_of is null
      or p.user_id = p_friends_of
      or p.user_id in (select friend_id from friends where user_id = p_friends_of)
    )
  group by p.user_id, pr.display_name
  having count(*) >= p_min_games
  order by avg_score desc
  limit p_limit;
$$;
