-- Numérotation des commandes : CMD-AAAAMMJJ-N, N repartant à 1 chaque jour.
-- Remplace 'ORD-' || nextval('order_number_seq'), qui donnait des numéros
-- opaques, sans repère de date, et démarrés arbitrairement à 1000.
--
-- Corrige au passage le trigger de schema.sql, qui n'est pas du SQL valide :
--
--   create trigger trg_orders_number before insert on orders
--     for each row execute procedure (
--       begin ... end;
--     );
--
-- `execute procedure` attend un nom de fonction, pas un bloc. L'instruction
-- échoue donc à l'exécution de schema.sql, et sans ce trigger le insert de
-- public.create_order viole la contrainte NOT NULL sur orders.order_number.

-- Compteur par jour. Une ligne par journée, incrémentée de façon atomique.
create table if not exists public.order_number_counters (
  day date primary key,
  last_value integer not null default 0
);

-- Aucune policy : la table n'est jamais lue ni écrite directement par un
-- client, uniquement par generate_order_number() qui est SECURITY DEFINER.
alter table public.order_number_counters enable row level security;

create or replace function public.generate_order_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := current_date;
  v_next integer;
begin
  -- UPSERT ... RETURNING : atomique. Deux commandes passées dans la même
  -- milliseconde ne peuvent pas obtenir le même numéro, alors qu'un
  -- `select max(...) + 1` aurait laissé passer un doublon (order_number est
  -- UNIQUE : la seconde commande aurait échoué).
  insert into public.order_number_counters as c (day, last_value)
  values (v_day, 1)
  on conflict (day) do update set last_value = c.last_value + 1
  returning c.last_value into v_next;

  return 'CMD-' || to_char(v_day, 'YYYYMMDD') || '-' || v_next::text;
end;
$$;

create or replace function public.orders_set_defaults()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.generate_order_number();
  end if;
  if new.created_at is null then
    new.created_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orders_number on public.orders;
create trigger trg_orders_number
before insert on public.orders
for each row execute function public.orders_set_defaults();

-- public.order_number_seq n'est plus utilisée. Elle est laissée en place
-- volontairement : la supprimer ferait échouer ce script si un objet y
-- référait encore, et une séquence inutilisée ne coûte rien.
