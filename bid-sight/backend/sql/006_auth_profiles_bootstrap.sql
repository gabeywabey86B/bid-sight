-- Repair auth.users -> profiles bootstrap for OAuth and password users.
-- Ensures the trigger exists for future users and backfills missing profiles.

create unique index if not exists profiles_display_name_lower_idx
  on public.profiles (lower(display_name));

create or replace function public.create_profile_for_user(
  user_id uuid,
  user_email text,
  user_meta jsonb
)
returns void
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
    user_meta->>'display_name',
    user_meta->>'full_name',
    user_meta->>'name',
    split_part(user_email, '@', 1)
  );
  candidate := base_name;

  loop
    begin
      insert into public.profiles (id, display_name)
      values (user_id, candidate)
      on conflict (id) do nothing;
      return;
    exception when unique_violation then
      suffix := suffix + 1;
      candidate := base_name || '-' || suffix;
    end;
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  perform public.create_profile_for_user(new.id, new.email, new.raw_user_meta_data);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

do $$
declare
  auth_user auth.users%rowtype;
begin
  for auth_user in
    select *
    from auth.users u
    where not exists (
      select 1
      from public.profiles p
      where p.id = u.id
    )
  loop
    perform public.create_profile_for_user(
      auth_user.id,
      auth_user.email,
      auth_user.raw_user_meta_data
    );
  end loop;
end;
$$;
