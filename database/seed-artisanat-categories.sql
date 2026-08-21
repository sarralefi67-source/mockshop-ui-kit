-- Starter categories for the Yadawi rebrand (Tunisian artisanat). These are
-- real rows in public.categories, not mock data — editable/removable anytime
-- from /admin/categories. parent_id is left out on purpose: the existing
-- trigger (database/categories-parent-id.sql) sets it to the row's own id
-- for root categories.

insert into public.categories (name, slug, description)
values
  ('Poterie', 'poterie', 'Céramiques et poteries artisanales tunisiennes, tournées et cuites à la main.'),
  ('Tapis', 'tapis', 'Tapis et tissages traditionnels, laine et fibres naturelles.'),
  ('Maroquinerie', 'maroquinerie', 'Sacs, ceintures et articles en cuir travaillé à la main.'),
  ('Bois d''olivier', 'bois-olivier', 'Objets sculptés dans le bois d''olivier tunisien.'),
  ('Bijoux', 'bijoux', 'Bijoux artisanaux, argent et perles traditionnelles.'),
  ('Textile', 'textile', 'Tissus, broderies et vêtements traditionnels.')
on conflict (slug) do nothing;
