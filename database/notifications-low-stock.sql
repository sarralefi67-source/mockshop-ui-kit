-- Alerte de stock : notifie l'admin quand un produit (ou une variante) passe
-- sous le seuil, ou tombe en rupture. Complète database/notifications.sql, qui
-- couvre déjà les nouveaux avis et les nouvelles commandes.
--
-- Deux évènements distincts sont signalés :
--   * franchissement du seuil (on passe d'au-dessus à en dessous) ;
--   * rupture (le stock atteint zéro), TOUJOURS signalée même si le produit
--     était déjà sous le seuil — c'est l'évènement qui compte vraiment.
--
-- En revanche on ne notifie pas à chaque vente d'un produit déjà bas : un
-- produit à 3 unités générerait une ligne à chaque commande et la boîte de
-- réception deviendrait inutilisable.
--
-- Le seuil est la constante `v_threshold` des deux fonctions. Pour le changer,
-- modifiez-la et rejouez ce fichier.

create or replace function public.notify_low_stock_product()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold constant integer := 5;
  v_old integer := coalesce(OLD.stock_quantity, 0);
  v_new integer := coalesce(NEW.stock_quantity, 0);
begin
  -- Réassort, ou stock inchangé : rien à signaler.
  if v_new >= v_old then
    return NEW;
  end if;

  -- Rupture : toujours signalée. Sinon un produit déjà à 3 unités tomberait à
  -- zéro sans que personne ne soit prévenu.
  -- Sinon : uniquement au franchissement du seuil.
  if v_new > 0 and not (v_old > v_threshold and v_new <= v_threshold) then
    return NEW;
  end if;

  -- Une alerte de stock ne doit jamais faire échouer la transaction qui l'a
  -- déclenchée : ce trigger tourne à l'intérieur de public.create_order, et
  -- une commande vaut mieux qu'une notification.
  begin
    insert into public.notifications (type, title, body, link)
    values (
      'stock',
      case when v_new = 0 then 'Rupture de stock' else 'Stock faible' end,
      NEW.name || ' — ' || v_new::text || ' en stock',
      '/admin/produits?produit=' || NEW.id
    );
  exception when others then
    raise warning 'notify_low_stock_product: %', sqlerrm;
  end;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_low_stock_product on public.products;
create trigger trg_notify_low_stock_product
after update of stock_quantity on public.products
for each row execute function public.notify_low_stock_product();

create or replace function public.notify_low_stock_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold constant integer := 5;
  v_old integer := coalesce(OLD.stock_quantity, 0);
  v_new integer := coalesce(NEW.stock_quantity, 0);
  v_product_name text;
begin
  if v_new >= v_old then
    return NEW;
  end if;

  if v_new > 0 and not (v_old > v_threshold and v_new <= v_threshold) then
    return NEW;
  end if;

  select name into v_product_name from public.products where id = NEW.product_id;

  begin
    insert into public.notifications (type, title, body, link)
    values (
      'stock',
      case when v_new = 0 then 'Rupture de stock' else 'Stock faible' end,
      concat_ws(
        ' — ',
        coalesce(v_product_name, 'Produit'),
        nullif(NEW.sku, ''),
        v_new::text || ' en stock'
      ),
      '/admin/produits?produit=' || NEW.product_id
    );
  exception when others then
    raise warning 'notify_low_stock_variant: %', sqlerrm;
  end;

  return NEW;
end;
$$;

drop trigger if exists trg_notify_low_stock_variant on public.product_variants;
create trigger trg_notify_low_stock_variant
after update of stock_quantity on public.product_variants
for each row execute function public.notify_low_stock_variant();

-- ---------------------------------------------------------------------------
-- Droits d'insertion des triggers
-- ---------------------------------------------------------------------------
-- Meme raison que dans database/notifications.sql : un trigger SECURITY DEFINER
-- ne contourne les policies RLS que s'il appartient au proprietaire de la table
-- et que `force row level security` est inactif. Sinon l'insert est refuse par
-- `with check (public.is_admin())`, faux dans le contexte d'un client qui
-- commande -- et le bloc `exception` ci-dessus le rend silencieux.
alter table public.notifications no force row level security;

do $$
declare
  v_owner text;
  v_fn text;
begin
  select pg_get_userbyid(relowner) into v_owner
  from pg_class where oid = 'public.notifications'::regclass;

  foreach v_fn in array array[
    'public.notify_low_stock_product()',
    'public.notify_low_stock_variant()'
  ] loop
    begin
      execute format('alter function %s owner to %I', v_fn, v_owner);
    exception when others then
      raise notice 'proprietaire inchange pour % : %', v_fn, sqlerrm;
    end;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- État des lieux à l'installation
-- ---------------------------------------------------------------------------
-- Les triggers ne réagissent qu'aux baisses futures. Sans ce balayage, un
-- catalogue déjà en stock faible n'émettrait aucune alerte tant qu'aucune
-- vente n'a lieu — ce qui donne l'impression que rien ne fonctionne.
--
-- Idempotent : on n'insère pas si une alerte non lue existe déjà pour le
-- produit.
insert into public.notifications (type, title, body, link)
select
  'stock',
  case when coalesce(p.stock_quantity, 0) = 0 then 'Rupture de stock' else 'Stock faible' end,
  p.name || ' — ' || coalesce(p.stock_quantity, 0)::text || ' en stock',
  '/admin/produits?produit=' || p.id
from public.products p
where p.is_active = true
  and coalesce(p.stock_quantity, 0) <= 5
  and not exists (
    select 1
    from public.notifications n
    where n.type = 'stock'
      and n.is_read = false
      and n.body like p.name || ' —%'
  );

-- Idem pour les variantes : sur un catalogue a variantes, products.stock_quantity
-- est un agregat souvent au-dessus du seuil alors que des variantes precises
-- sont en rupture. Sans ce second balayage, elles passaient inapercues.
insert into public.notifications (type, title, body, link)
select
  'stock',
  case when coalesce(v.stock_quantity, 0) = 0 then 'Rupture de stock' else 'Stock faible' end,
  concat_ws(' — ', p.name, nullif(v.sku, ''), coalesce(v.stock_quantity, 0)::text || ' en stock'),
  '/admin/produits?produit=' || p.id
from public.product_variants v
join public.products p on p.id = v.product_id
where p.is_active = true
  and coalesce(v.is_active, true) = true
  and coalesce(v.stock_quantity, 0) <= 5
  and not exists (
    select 1
    from public.notifications n
    where n.type = 'stock'
      and n.is_read = false
      and n.body like '%' || coalesce(nullif(v.sku, ''), p.name) || '%'
  );

-- Rattrapage des alertes deja enregistrees : leur lien ne portait pas
-- l'identifiant du produit, donc un clic n'ouvrait aucune fiche. Le nom du
-- produit ouvre le corps de la notification, ce qui permet de la relier.
update public.notifications n
set link = '/admin/produits?produit=' || p.id
from public.products p
where n.type = 'stock'
  and coalesce(n.link, '') = '/admin/produits'
  and n.body like p.name || ' —%';

-- ---------------------------------------------------------------------------
-- Vérification
-- ---------------------------------------------------------------------------
-- Les triggers sont-ils bien en place ?
--
--   select tgname, tgrelid::regclass
--   from pg_trigger
--   where tgname in ('trg_notify_low_stock_product', 'trg_notify_low_stock_variant');
--
-- Les alertes générées :
--
--   select created_at, title, body
--   from public.notifications
--   where type = 'stock'
--   order by created_at desc;
--
-- Test manuel de bout en bout (remplacez le SKU) :
--
--   update public.products set stock_quantity = 0
--   where sku = 'VOTRE-SKU';
--   select title, body from public.notifications
--   where type = 'stock' order by created_at desc limit 1;
