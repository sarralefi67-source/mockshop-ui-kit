-- Tarif de livraison unique pour toute la Tunisie.
--
-- Le client livre partout au meme prix : le bareme par gouvernorat
-- (public.shipping_rates + database/shipping-rates-governorates.sql) n'a plus
-- de raison d'etre. Le tarif devient un simple champ de la table singleton
-- public.site_settings, editable dans /admin/parametres.
--
-- 0 signifie livraison GRATUITE, pas "tarif absent" : le panier et le checkout
-- affichent alors "Gratuite" au lieu de "0,000 DT".
--
-- ===========================================================================
-- ORDRE D'EXECUTION -- important
--   1. database/create-order-rpc.sql   (rejouer : la fonction cesse de lire
--                                       shipping_rates)
--   2. ce fichier                      (ajoute le champ, puis supprime la
--                                       table devenue inutile)
-- Entre les deux, une commande passee echouerait : faites-le hors trafic.
-- ===========================================================================

alter table public.site_settings
  add column if not exists shipping_price numeric(10, 3) not null default 0;

-- Reprend le tarif deja en place plutot que d'en inventer un : on prend le
-- moins cher des gouvernorats actifs (le plus proche d'un "tarif unique"
-- annonce au client), avec 7 DT en repli -- ce qu'affiche le footer.
do $$
declare
  v_price numeric;
begin
  if to_regclass('public.shipping_rates') is not null then
    execute 'select min(price) from public.shipping_rates where is_active = true'
      into v_price;
  end if;

  update public.site_settings
  set shipping_price = coalesce(v_price, 7.000)
  where shipping_price = 0;
end;
$$;

-- Plus aucun code ne la lit : ni create_order (cf. ordre d'execution ci-dessus),
-- ni le checkout, ni /admin/parametres. Son trigger d'audit part avec elle.
drop table if exists public.shipping_rates;
