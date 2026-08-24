-- Coordonnees de la boutique (telephone / e-mail / adresse) et liens des
-- reseaux sociaux, jusqu'ici codes en dur dans Header.tsx, Footer.tsx et la
-- page /contact. Editables depuis /admin/parametres.
--
-- Table singleton : une seule ligne possible, garantie par un id uuid fige par
-- CHECK. On garde un uuid (plutot qu'un booleen) parce que le trigger d'audit
-- admin ecrit `new.id` dans admin_audit_log.record_id, qui est un uuid.

create table if not exists public.site_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'
    check (id = '00000000-0000-0000-0000-000000000001'),
  phone text,
  email text,
  address text,
  instagram_url text,
  facebook_url text,
  tiktok_url text,
  whatsapp_url text,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

-- Ligne unique, initialisee avec les valeurs qui etaient en dur dans le code.
insert into public.site_settings (phone, email, address, instagram_url, tiktok_url, whatsapp_url)
values (
  '+216 71 000 000',
  'contact@Artisanat.tn',
  'Avenue Habib Bourguiba, Tunis',
  'https://instagram.com/votre_compte',
  'https://www.tiktok.com/@votre_compte',
  'https://wa.me/21671000000'
)
on conflict (id) do nothing;

alter table public.site_settings enable row level security;

-- Lecture publique : ces coordonnees s'affichent dans le header et le footer de
-- toutes les pages, donc y compris pour les visiteurs anonymes.
drop policy if exists "public read site settings" on public.site_settings;
create policy "public read site settings"
on public.site_settings
for select
to public
using (true);

drop policy if exists "admin full access site settings" on public.site_settings;
create policy "admin full access site settings"
on public.site_settings
for all
to public
using (public.is_admin())
with check (public.is_admin());

-- Trace les modifications dans le journal admin (cf. admin-audit-log-triggers.sql).
drop trigger if exists trg_admin_audit on public.site_settings;
create trigger trg_admin_audit
after insert or update or delete on public.site_settings
for each row execute function public.log_admin_action();
