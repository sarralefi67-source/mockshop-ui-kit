-- Hero banners for the storefront homepage, manageable from /admin/banners.

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  image_url text not null,
  link_url text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.banner_products (
  banner_id uuid not null references public.banners(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  position integer not null default 0,
  primary key (banner_id, product_id)
);

alter table public.banner_products enable row level security;

create policy "public read banner products"
on public.banner_products
for select
to public
using (true);

create policy "admin full access banner products"
on public.banner_products
for all
to public
using (public.is_admin())
with check (public.is_admin());

alter table public.banners enable row level security;

create policy "public read active banners"
on public.banners
for select
to public
using (is_active = true);

create policy "admin full access banners"
on public.banners
for all
to public
using (public.is_admin())
with check (public.is_admin());

-- Include banners in the admin audit log (see database/admin-audit-log-triggers.sql).
drop trigger if exists trg_admin_audit on public.banners;
create trigger trg_admin_audit
after insert or update or delete on public.banners
for each row execute function public.log_admin_action();

-- Storage bucket for banner images, mirroring the existing "products" bucket:
-- public read (images must display on the public homepage), admin-only write.
insert into storage.buckets (id, name, public)
values ('banners', 'banners', true)
on conflict (id) do nothing;

create policy "public read banners bucket"
on storage.objects for select
to public
using (bucket_id = 'banners');

create policy "admin insert banners bucket"
on storage.objects for insert
to authenticated
with check (bucket_id = 'banners' and public.is_admin());

create policy "admin update banners bucket"
on storage.objects for update
to authenticated
using (bucket_id = 'banners' and public.is_admin());

create policy "admin delete banners bucket"
on storage.objects for delete
to authenticated
using (bucket_id = 'banners' and public.is_admin());
