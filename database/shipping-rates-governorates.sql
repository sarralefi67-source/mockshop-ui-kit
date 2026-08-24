-- Charge les 24 gouvernorats tunisiens dans public.shipping_rates, pour que
-- l'onglet Livraison de /admin/parametres affiche la liste complete et permette
-- d'ajuster les tarifs (un par un, ou tous d'un coup) sans avoir a creer chaque
-- ligne a la main.

-- Index unique d'abord : sans lui, le `on conflict (governorate)` ci-dessous
-- n'a rien sur quoi s'appuyer. Il protege aussi public.create_order, qui fait
-- `select price into v_shipping ... where governorate = p_governorate` : avec
-- deux lignes pour le meme gouvernorat, PL/pgSQL prend silencieusement la
-- premiere et le client peut se voir facturer le mauvais tarif.
-- Si cette instruction echoue avec "could not create unique index", la table
-- contient deja deux lignes pour un meme gouvernorat : supprimez le doublon
-- (garder celui dont le prix est correct) puis relancez le script.
create unique index if not exists shipping_rates_governorate_key
  on public.shipping_rates (governorate);

-- Tarif par defaut aligne sur ce qu'annonce le footer de la boutique ("7 DT").
-- `on conflict do nothing` : les gouvernorats deja parametres gardent leur prix.
insert into public.shipping_rates (governorate, price, is_active)
select g, 7.000, true
from (values
  ('Ariana'), ('Béja'), ('Ben Arous'), ('Bizerte'),
  ('Gabès'), ('Gafsa'), ('Jendouba'), ('Kairouan'),
  ('Kasserine'), ('Kébili'), ('Le Kef'), ('Mahdia'),
  ('La Manouba'), ('Médenine'), ('Monastir'), ('Nabeul'),
  ('Sfax'), ('Sidi Bouzid'), ('Siliana'), ('Sousse'),
  ('Tataouine'), ('Tozeur'), ('Tunis'), ('Zaghouan')
) as t(g)
on conflict (governorate) do nothing;
