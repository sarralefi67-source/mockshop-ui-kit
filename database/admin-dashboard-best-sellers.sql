-- Best sellers by month for the admin dashboard chart.
-- Sales are copied to an immutable ledger when an order is delivered, so
-- deleting the order later does not erase its contribution to the history.

alter table public.product_images
  add column if not exists variant_value uuid references public.attribute_values(id) on delete set null;

create index if not exists idx_product_images_variant_value
  on public.product_images(variant_value);

create table if not exists public.sales_ledger (
  order_item_id uuid primary key,
  order_id uuid not null,
  delivered_at timestamptz not null,
  product_id uuid,
  variant_id uuid,
  product_name text not null,
  sku text,
  quantity integer not null,
  revenue numeric(10,3) not null
);

create index if not exists idx_sales_ledger_delivered_at
  on public.sales_ledger(delivered_at);

alter table public.sales_ledger enable row level security;
drop policy if exists "admins can read sales ledger" on public.sales_ledger;
create policy "admins can read sales ledger"
  on public.sales_ledger for select
  using (public.is_admin());

create or replace function public.capture_delivered_order_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  delivered_at_value timestamptz;
begin
  if tg_table_name = 'orders' then
    if new.status is distinct from 'delivered' or old.status = 'delivered' then
      return new;
    end if;
    delivered_at_value := coalesce(new.created_at, now());
    insert into public.sales_ledger (
      order_item_id, order_id, delivered_at, product_id, variant_id,
      product_name, sku, quantity, revenue
    )
    select oi.id, new.id, delivered_at_value, oi.product_id, oi.variant_id,
      oi.product_name, oi.sku, oi.quantity, oi.total
    from public.order_items oi
    on conflict (order_item_id) do nothing;
    return new;
  end if;

  if new.order_id is not null and exists (
    select 1 from public.orders o where o.id = new.order_id and o.status = 'delivered'
  ) then
    select coalesce(o.created_at, now()) into delivered_at_value
    from public.orders o
    where o.id = new.order_id;
    insert into public.sales_ledger (
      order_item_id, order_id, delivered_at, product_id, variant_id,
      product_name, sku, quantity, revenue
    ) values (
      new.id, new.order_id, delivered_at_value, new.product_id, new.variant_id,
      new.product_name, new.sku, new.quantity, new.total
    ) on conflict (order_item_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_capture_delivered_order on public.orders;
create trigger trg_capture_delivered_order
after update of status on public.orders
for each row execute function public.capture_delivered_order_items();

drop trigger if exists trg_capture_delivered_order_item on public.order_items;
create trigger trg_capture_delivered_order_item
after insert or update on public.order_items
for each row execute function public.capture_delivered_order_items();

-- Backfill delivered orders that existed before this migration was applied.
insert into public.sales_ledger (
  order_item_id, order_id, delivered_at, product_id, variant_id,
  product_name, sku, quantity, revenue
)
select oi.id, o.id, coalesce(o.created_at, now()), oi.product_id,
  oi.variant_id, oi.product_name, oi.sku, oi.quantity, oi.total
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.status = 'delivered'
on conflict (order_item_id) do nothing;

drop function if exists public.get_admin_best_sellers(integer, date, integer);

create or replace function public.get_admin_best_sellers(
  p_days integer default 180,
  p_end_date date default current_date,
  p_limit integer default 5
)
returns table (
  month text,
  product_id uuid,
  variant_id uuid,
  product_name text,
  sku text,
  image_url text,
  quantity bigint,
  revenue numeric
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  start_date date := p_end_date - greatest(p_days, 1) + 1;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  with top_products as (
    select
      oi.product_id,
      oi.variant_id,
      oi.product_name,
      oi.sku,
      coalesce(variant_image.url, variant_product_image.url, product_image.url) as image_url,
      sum(oi.quantity)::bigint as total_quantity
    from public.sales_ledger oi
    left join lateral (
      select vi.url
      from public.variant_images vi
      where vi.variant_id = oi.variant_id
      order by vi.position
      limit 1
    ) as variant_image on true
    left join lateral (
      select pi.url
      from public.product_images pi
      where pi.product_id = oi.product_id
        and oi.variant_id is not null
        and exists (
          select 1
          from public.variant_attribute_values vav
          where vav.variant_id = oi.variant_id
            and vav.attribute_value_id::text = pi.variant_value
        )
      order by pi.position
      limit 1
    ) as variant_product_image on true
    left join lateral (
      select pi.url
      from public.product_images pi
      where pi.product_id = oi.product_id
        and pi.is_main = true
      order by pi.position
      limit 1
    ) as product_image on true
    where oi.delivered_at >= start_date
      and oi.delivered_at < p_end_date + 1
    group by oi.product_id, oi.variant_id, oi.product_name, oi.sku, variant_image.url, variant_product_image.url, product_image.url
    order by total_quantity desc, oi.product_name
    limit greatest(p_limit, 1)
  ),
  periods as (
    select generate_series(
      date_trunc('month', start_date)::date,
      date_trunc('month', p_end_date)::date,
      interval '1 month'
    )::date as period_start
  )
  select
    to_char(periods.period_start, 'YYYY-MM') as month,
    top_products.product_id,
    top_products.variant_id,
    top_products.product_name,
    top_products.sku,
    top_products.image_url,
    coalesce(sum(oi.quantity), 0)::bigint as quantity,
    coalesce(sum(oi.revenue), 0)::numeric as revenue
  from periods
  cross join top_products
  left join public.sales_ledger oi
    on oi.product_id is not distinct from top_products.product_id
   and oi.variant_id is not distinct from top_products.variant_id
   and oi.product_name = top_products.product_name
    and oi.sku is not distinct from top_products.sku
   and oi.delivered_at >= periods.period_start
   and oi.delivered_at < periods.period_start + interval '1 month'
  group by periods.period_start, top_products.product_id, top_products.variant_id, top_products.product_name, top_products.sku, top_products.image_url
  order by periods.period_start, top_products.product_name;
end;
$$;

grant execute on function public.get_admin_best_sellers(integer, date, integer) to authenticated;
