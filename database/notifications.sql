-- Replaces the ad-hoc "count pending reviews live" bell logic with a real
-- notifications inbox: persists even if no admin was online when the event
-- happened, supports read/unread, and is extensible to other event types
-- later (low stock...) by adding more triggers. Deux evenements sont cables :
-- nouvel avis client et nouvelle commande.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Admin-only in both directions: this is purely an internal admin tool, no
-- customer-facing read path at all.
create policy "admin full access notifications"
on public.notifications
for all
to public
using (public.is_admin())
with check (public.is_admin());

-- New review submitted -> notification row. SECURITY DEFINER so the
-- inserting customer (who has no access to public.notifications under RLS)
-- can still trigger this.
create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (type, title, body, link)
  values (
    'review',
    'Nouvel avis client',
    nullif(concat_ws(' — ', repeat('★', greatest(least(NEW.rating, 5), 0)), nullif(NEW.comment, '')), ''),
    '/admin/avis?review=' || NEW.id
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_new_review on public.reviews;
create trigger trg_notify_new_review
after insert on public.reviews
for each row execute function public.notify_new_review();

-- Nouvelle commande -> notification. SECURITY DEFINER pour la meme raison que
-- ci-dessus : le client qui commande n'a aucun acces a public.notifications.
--
-- Volontairement sans le montant : public.create_order insere la commande avec
-- total = 0 puis met les totaux a jour a la fin de la transaction (une fois les
-- lignes et le coupon traites). Au moment du AFTER INSERT, le total vaut donc
-- encore 0 et l'afficher serait trompeur. order_number, lui, est bien renseigne
-- (trigger BEFORE INSERT, cf. schema.sql).
create or replace function public.notify_new_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (type, title, body, link)
  values (
    'order',
    concat_ws(' ', 'Nouvelle commande', nullif(NEW.order_number, '')),
    nullif(
      concat_ws(
        ' — ',
        nullif(NEW.shipping_address->>'full_name', ''),
        nullif(NEW.shipping_address->>'governorate', '')
      ),
      ''
    ),
    '/admin/commandes?order=' || NEW.id
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_new_order on public.orders;
create trigger trg_notify_new_order
after insert on public.orders
for each row execute function public.notify_new_order();

-- Rattrapage des notifications creees avant que le lien ne porte l'identifiant :
-- elles pointaient vers la page seule, donc un clic n'ouvrait aucune fiche.
-- Pour une commande, le numero figure dans le titre, ce qui permet de retrouver
-- la ligne. Idempotent : la clause where exclut les liens deja completes.
update public.notifications n
set link = '/admin/commandes?order=' || o.id
from public.orders o
where n.type = 'order'
  and coalesce(n.link, '') = '/admin/commandes'
  and n.title like '%' || o.order_number;

-- Les anciens avis ('Nouvel avis client', sans identifiant dans le titre) ne
-- sont pas rattrapables : ils continuent d'ouvrir /admin/avis sans selection.
-- Les nouveaux portent bien leur identifiant.

-- ---------------------------------------------------------------------------
-- Droits d'insertion des triggers
-- ---------------------------------------------------------------------------
-- Les triggers ci-dessus sont SECURITY DEFINER : ils s'executent avec les
-- droits du PROPRIETAIRE de la fonction. En PostgreSQL, le proprietaire d'une
-- table echappe a ses policies RLS -- sauf si `force row level security` est
-- actif, ou si la fonction appartient a un autre role que la table.
--
-- Dans ces deux cas l'insert tombe sur la policy `with check (public.is_admin())`,
-- qui est FAUSSE dans le contexte d'un client qui commande ou qui depose un
-- avis. Resultat : aucune notification, et aucune erreur visible cote client.
--
-- On aligne donc explicitement le proprietaire des fonctions sur celui de la
-- table, et on s'assure que RLS n'est pas forcee pour le proprietaire.
alter table public.notifications no force row level security;

do $$
declare
  v_owner text;
  v_fn text;
begin
  select pg_get_userbyid(relowner) into v_owner
  from pg_class where oid = 'public.notifications'::regclass;

  foreach v_fn in array array[
    'public.notify_new_review()',
    'public.notify_new_order()'
  ] loop
    begin
      execute format('alter function %s owner to %I', v_fn, v_owner);
    exception when others then
      raise notice 'proprietaire inchange pour % : %', v_fn, sqlerrm;
    end;
  end loop;
end;
$$;

-- Live badge/toast updates in the admin panel.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
