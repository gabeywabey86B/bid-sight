grant usage on schema public to anon;
grant usage on schema public to authenticated;

grant select on public.bidding_table_info to anon;
grant select on public.bidding_table_info to authenticated;
grant select on public.section_info to anon;
grant select on public.section_info to authenticated;

alter table public.bidding_table_info enable row level security;
alter table public.section_info enable row level security;

drop policy if exists "Public can read bidding table info" on public.bidding_table_info;
create policy "Public can read bidding table info"
on public.bidding_table_info
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read section info" on public.section_info;
create policy "Public can read section info"
on public.section_info
for select
to anon, authenticated
using (true);
