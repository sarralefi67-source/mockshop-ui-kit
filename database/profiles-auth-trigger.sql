-- Create a profile from the metadata submitted during Supabase signup.
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.email,
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    phone = excluded.phone;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles that were created before this trigger was installed.
update public.profiles as profiles
set
  first_name = users.raw_user_meta_data ->> 'first_name',
  last_name = users.raw_user_meta_data ->> 'last_name',
  email = users.email,
  phone = users.raw_user_meta_data ->> 'phone'
from auth.users as users
where profiles.id = users.id
  and (
    profiles.first_name is null
    or profiles.last_name is null
    or profiles.email is null
    or profiles.phone is null
  );