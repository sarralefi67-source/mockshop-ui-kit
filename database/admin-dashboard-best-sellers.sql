-- Best sellers by month for the admin dashboard chart.
-- Only delivered orders are included, matching get_admin_monthly_sales.

alter table public.product_images
  add column if not exists variant_value uuid references public.attribute_values(id) on delete set null;

create index if not exists idx_product_images_variant_value
  on public.product_images(variant_value);

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
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
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
    where o.status = 'delivered'
      and o.created_at >= start_date
      and o.created_at < p_end_date + 1
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
    coalesce(sum(oi.quantity) filter (where o.id is not null), 0)::bigint as quantity,
    coalesce(sum(oi.total) filter (where o.id is not null), 0)::numeric as revenue
  from periods
  cross join top_products
  left join public.order_items oi
    on oi.product_id is not distinct from top_products.product_id
   and oi.variant_id is not distinct from top_products.variant_id
   and oi.product_name = top_products.product_name
    and oi.sku is not distinct from top_products.sku
  left join public.orders o
    on o.id = oi.order_id
   and o.status = 'delivered'
   and o.created_at >= periods.period_start
   and o.created_at < periods.period_start + interval '1 month'
  group by periods.period_start, top_products.product_id, top_products.variant_id, top_products.product_name, top_products.sku, top_products.image_url
  order by periods.period_start, top_products.product_name;
end;
$$;

grant execute on function public.get_admin_best_sellers(integer, date, integer) to authenticated;
