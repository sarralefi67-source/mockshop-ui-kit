-- Run this migration on an existing Supabase database.

alter table public.categories
  drop column if exists position;

alter table public.categories
  add column if not exists updated_at timestamptz default now();

create or replace function public.set_categories_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row
execute function public.set_categories_updated_at();
