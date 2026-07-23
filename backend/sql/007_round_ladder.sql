-- BOSS round ladder: a ladder is the set of live_rounds sharing
-- (session_id, course_code, section) -- the same grouping _is_locked_out
-- already uses. Capacity is the seats_allocated of the round_index = 0 row.
-- round_index exists only because created_at cannot reliably order a batch
-- insert of 12 rows.
--
-- live_bids -> live_rounds -> live_sessions already cascade on delete
-- (migration 005), so deleting a session needs no new DDL.

alter table public.live_rounds add column round_index int;

create index live_rounds_ladder_idx
  on public.live_rounds (session_id, course_code, section, round_index);
