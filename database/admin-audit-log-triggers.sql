-- Wire up public.admin_audit_log, which existed with its RLS policy
-- ("admin read audit log") but nothing ever wrote to it.
--
-- Uses a DB trigger rather than client-side logging calls: the trigger reads
-- the actual committed row (old/new), so it can't be forgotten on a new admin
-- feature and can't be forged by the client sending fake old_value/new_value.
--
-- Guarded by is_admin() so tables that also accept non-admin writes under RLS
-- (reviews: customers insert their own; newsletter_subscribers: anon public
-- signup) only log genuine admin-performed actions, not normal customer
-- traffic.

create or replace function public.log_admin_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return coalesce(new, old);
  end if;

  insert into public.admin_audit_log (admin_id, action, table_name, record_id, old_value, new_value)
  values (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    (case when TG_OP = 'DELETE' then old.id else new.id end),
    (case when TG_OP in ('UPDATE', 'DELETE') then to_jsonb(old) else null end),
    (case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(new) else null end)
  );

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    -- product_attributes and variant_attribute_values are excluded: they have
    -- composite primary keys (no single `id` column), which this generic
    -- trigger assumes. They're link tables anyway (low audit value).
    'products', 'product_variants', 'product_images', 'variant_images',
    'attributes', 'attribute_values',
    -- shipping_rates a ete supprimee (tarif unique, cf.
    -- database/shipping-flat-rate.sql) : la laisser ici ferait echouer le
    -- rejeu de ce fichier. Le tarif est desormais audite via site_settings.
    'categories', 'promotions', 'coupons', 'site_settings',
    'orders', 'order_items', 'reviews', 'newsletter_subscribers'
  ];
begin
  foreach t in array tables loop
    execute format(
      'drop trigger if exists trg_admin_audit on public.%I;
       create trigger trg_admin_audit
       after insert or update or delete on public.%I
       for each row execute function public.log_admin_action();',
      t, t
    );
  end loop;
end;
$$;
