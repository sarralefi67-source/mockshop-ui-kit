-- Badge « Nouveau » piloté depuis /admin/produits.
--
-- Jusqu'ici le badge était déduit de products.created_at (30 jours glissants,
-- cf. NEW_WINDOW_DAYS dans src/lib/catalog.ts), donc non modifiable par
-- l'administrateur. On le matérialise en colonne pour qu'il soit pilotable,
-- et on reprend la règle des 30 jours comme valeur de départ.

alter table public.products
  add column if not exists is_new boolean not null default false;

update public.products
set is_new = true
where is_new = false
  and created_at is not null
  and created_at > now() - interval '30 days';

-- Index partiel : la boutique ne filtre jamais sur is_new = false.
create index if not exists products_is_new_idx
  on public.products (is_new)
  where is_new;
