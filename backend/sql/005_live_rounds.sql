-- LIVE auction rounds: admin manually configures rounds, users bid once each,
-- closing clears seats to the top-N bids. Round-closing math (avg/min/max/median)
-- happens in Python (see routers/live.py), so this migration is pure DDL.

alter table public.profiles add column is_admin boolean not null default false;

create table public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references public.profiles(id),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now()
);

create table public.live_rounds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.live_sessions(id) on delete cascade,
  round_label text not null,
  course_code text not null,
  section text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  seats_allocated int not null check (seats_allocated >= 0),
  status text not null default 'draft' check (status in ('draft','open','closed')),
  clearing_price numeric,
  seats_filled int,
  bid_count int,
  avg_bid numeric,
  min_bid numeric,
  max_bid numeric,
  median_bid numeric,
  created_at timestamptz not null default now()
);

create index live_rounds_status_idx on public.live_rounds (status);

create table public.live_bids (
  id uuid primary key default gen_random_uuid(),
  round_id uuid references public.live_rounds(id) on delete cascade,
  user_id uuid references public.profiles(id),
  amount numeric not null check (amount > 0),
  is_winner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (round_id, user_id)
);

alter table public.live_sessions enable row level security;
alter table public.live_rounds enable row level security;
alter table public.live_bids enable row level security;
