-- categories had no public SELECT policy (only "admin full access categories",
-- ALL, is_admin()) — the storefront category pages would get zero rows for
-- any non-admin visitor. Mirrors the "public read active products" pattern.

create policy "public read categories"
on public.categories
for select
to public
using (true);
