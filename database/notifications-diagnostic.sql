-- Diagnostic des notifications de stock.
--
-- A executer tel quel dans l'editeur SQL Supabase : renvoie un tableau de
-- verifications. Chaque ligne repond a une question precise, dans l'ordre ou
-- il faut se la poser.
--
-- Lecture des resultats :
--
--   * « trigger ... present » vaut 0
--       -> notifications-low-stock.sql n'a pas ete execute, ou a echoue.
--
--   * les compteurs « sous le seuil » valent 0
--       -> aucun produit n'est concerne : rien a signaler, c'est normal.
--         Baissez un stock a la main pour tester (voir la fin du fichier).
--
--   * « RLS forcee » vaut true
--       -> meme le proprietaire est soumis aux policies, l'insert du trigger
--         est refuse. Rejouez notifications-low-stock.sql, qui remet
--         `no force row level security`.
--
--   * « proprietaire fonction » differe de « proprietaire table »
--       -> le trigger SECURITY DEFINER ne contourne pas RLS. Rejouez
--         notifications-low-stock.sql, qui aligne les proprietaires.

select 'trigger produits present'                  as verification,
       (select count(*)::text from pg_trigger
        where tgname = 'trg_notify_low_stock_product')                       as valeur
union all
select 'trigger variantes present',
       (select count(*)::text from pg_trigger
        where tgname = 'trg_notify_low_stock_variant')
union all
select 'produits actifs sous le seuil (<= 5)',
       (select count(*)::text from public.products
        where is_active = true and coalesce(stock_quantity, 0) <= 5)
union all
select 'variantes sous le seuil (<= 5)',
       (select count(*)::text from public.product_variants
        where coalesce(stock_quantity, 0) <= 5)
union all
select 'notifications de stock enregistrees',
       (select count(*)::text from public.notifications where type = 'stock')
union all
select 'notifications toutes categories',
       (select count(*)::text from public.notifications)
union all
select 'RLS active sur notifications',
       (select relrowsecurity::text from pg_class
        where oid = 'public.notifications'::regclass)
union all
select 'RLS forcee sur notifications',
       (select relforcerowsecurity::text from pg_class
        where oid = 'public.notifications'::regclass)
union all
select 'proprietaire table notifications',
       (select pg_get_userbyid(relowner)::text from pg_class
        where oid = 'public.notifications'::regclass)
union all
select 'proprietaire fonction produits',
       coalesce((select pg_get_userbyid(proowner)::text from pg_proc
                 where proname = 'notify_low_stock_product'), 'fonction absente')
union all
select 'proprietaire fonction variantes',
       coalesce((select pg_get_userbyid(proowner)::text from pg_proc
                 where proname = 'notify_low_stock_variant'), 'fonction absente')
union all
select 'role courant', current_user::text;

-- ---------------------------------------------------------------------------
-- Test de bout en bout
-- ---------------------------------------------------------------------------
-- Force un produit en rupture, puis verifie qu'une alerte a bien ete creee.
-- Remplacez le SKU, executez les trois instructions ensemble, et remettez le
-- stock ensuite.
--
--   update public.products set stock_quantity = 0 where sku = 'VOTRE-SKU';
--
--   select created_at, title, body
--   from public.notifications
--   where type = 'stock'
--   order by created_at desc
--   limit 3;
--
--   update public.products set stock_quantity = 10 where sku = 'VOTRE-SKU';
--
-- Si l'update passe mais qu'aucune ligne n'apparait, l'insert du trigger est
-- refuse : le bloc `exception` le transforme en warning. Ces warnings sont
-- visibles dans Logs > Postgres du tableau de bord Supabase.
