-- Générer automatiquement un slug unique depuis le nom de catégorie.
create extension if not exists unaccent;

create or replace function public.generate_category_slug(
  p_name text,
  p_category_id uuid default null
)
returns text
language plpgsql
stable
as $$
declare
  base_slug text;
  candidate text;
  suffix integer := 2;
begin
  base_slug := lower(regexp_replace(unaccent(coalesce(p_name, '')), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '(^-|-$)', '', 'g');

  if base_slug = '' then
    base_slug := 'categorie';
  end if;

  candidate := base_slug;
  while exists (
    select 1
      from public.categories
     where slug = candidate
       and (p_category_id is null or id <> p_category_id)
  ) loop
    candidate := base_slug || '-' || suffix;
    suffix := suffix + 1;
  end loop;

  return candidate;
end;
$$;

create or replace function public.set_category_slug()
returns trigger
language plpgsql
as $$
begin
  new.slug := public.generate_category_slug(new.name, new.id);
  return new;
end;
$$;

drop trigger if exists trg_categories_set_slug on public.categories;
create trigger trg_categories_set_slug
before insert or update of name on public.categories
for each row
execute function public.set_category_slug();

-- Synchroniser les slugs déjà présents.
update public.categories
   set slug = public.generate_category_slug(name, id);
