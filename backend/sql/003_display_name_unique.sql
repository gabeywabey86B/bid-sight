-- Duplicate-username protection: dedupe existing rows, enforce uniqueness,
-- and make the signup trigger collision-safe (also picks up Google OAuth's
-- full_name/name metadata keys, not just password-signup's display_name).

with dupes as (
  select id, display_name,
         row_number() over (partition by lower(display_name) order by created_at) as rn
  from public.profiles
)
update public.profiles p
set display_name = p.display_name || '-' || d.rn
from dupes d
where d.id = p.id and d.rn > 1;

create unique index if not exists profiles_display_name_lower_idx
  on public.profiles (lower(display_name));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  base_name text;
  candidate text;
  suffix int := 1;
begin
  base_name := coalesce(
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );
  candidate := base_name;

  loop
    begin
      insert into public.profiles (id, display_name)
      values (new.id, candidate)
      on conflict (id) do nothing;
      exit;
    exception when unique_violation then
      suffix := suffix + 1;
      candidate := base_name || '-' || suffix;
    end;
  end loop;

  return new;
end;
$$;
