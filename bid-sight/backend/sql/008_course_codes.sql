-- Distinct course codes for the admin ladder picker.
--
-- Same approach as the existing training_schools() function: bidding_table_info
-- is ~191k rows, so paging through it in Python to dedupe is slow and flaky.
-- Let Postgres do the distinct.

create or replace function public.course_codes()
returns table (course_code text)
language sql
stable
as $$
  select distinct b.course_code
  from public.bidding_table_info b
  where b.course_code is not null
  order by 1
$$;
