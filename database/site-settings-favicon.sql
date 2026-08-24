-- Icône du site (favicon) : l'onglet du navigateur affichait /favicon.ico, un
-- fichier statique livré avec le code et donc non modifiable depuis l'admin.
-- On la range dans site_settings pour qu'elle soit éditable depuis
-- /admin/parametres, comme le téléphone ou les réseaux sociaux.

alter table public.site_settings
  add column if not exists favicon_url text;

-- Bucket dédié aux fichiers d'identité du site, calqué sur le bucket "banners"
-- (cf. database/banners.sql) : lecture publique — le favicon est demandé par
-- tous les visiteurs, y compris anonymes — et écriture réservée aux admins.
insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

drop policy if exists "public read site bucket" on storage.objects;
create policy "public read site bucket"
on storage.objects for select
to public
using (bucket_id = 'site');

drop policy if exists "admin insert site bucket" on storage.objects;
create policy "admin insert site bucket"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site' and public.is_admin());

drop policy if exists "admin update site bucket" on storage.objects;
create policy "admin update site bucket"
on storage.objects for update
to authenticated
using (bucket_id = 'site' and public.is_admin());

drop policy if exists "admin delete site bucket" on storage.objects;
create policy "admin delete site bucket"
on storage.objects for delete
to authenticated
using (bucket_id = 'site' and public.is_admin());
