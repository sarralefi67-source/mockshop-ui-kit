-- Migration for an existing Supabase database.
-- Counts direct children for every category.

alter table public.categories
  add column if not exists subcategories_count integer not null default 0;

create or replace function public.count_category_subcategories(p_category_id uuid)
returns integer
language sql
stable
as $$
  select count(*)::integer
  from public.categories
  where parent_id = p_category_id
    and id <> p_category_id;
$$;

create or replace function public.refresh_category_subcategories_count()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.parent_id is not null then
      update public.categories
      set subcategories_count = public.count_category_subcategories(old.parent_id)
      where id = old.parent_id;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and old.parent_id is distinct from new.parent_id then
    if old.parent_id is not null then
      update public.categories
      set subcategories_count = public.count_category_subcategories(old.parent_id)
      where id = old.parent_id;
    end if;
  end if;

  if new.parent_id is not null then
    update public.categories
    set subcategories_count = public.count_category_subcategories(new.parent_id)
    where id = new.parent_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_categories_subcategories_count on public.categories;
create trigger trg_categories_subcategories_count
after insert or update of parent_id or delete on public.categories
for each row
execute function public.refresh_category_subcategories_count();

update public.categories as category
set subcategories_count = public.count_category_subcategories(category.id);
