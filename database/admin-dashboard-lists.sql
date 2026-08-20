-- Migration for an existing Supabase database.
-- Live dashboard lists: low stock products and recent orders.

create or replace function public.get_admin_low_stock_products(p_limit integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(items) order by items.stock_quantity asc, items.name asc)
    from (
      select
        products.id,
        products.name,
        products.stock_quantity,
        (
          select product_images.url
          from public.product_images
          where product_images.product_id = products.id
          order by product_images.is_main desc nulls last, product_images.position asc
          limit 1
        ) as image_url
      from public.products
      where products.stock_quantity <= 5
      order by products.stock_quantity asc, products.name asc
      limit greatest(p_limit, 1)
    ) as items
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_admin_low_stock_products(integer) to authenticated;

create or replace function public.get_admin_recent_orders(p_limit integer default 5)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(items) order by items.created_at desc)
    from (
      select
        orders.id,
        orders.order_number as reference,
        orders.status,
        orders.total,
        orders.created_at,
        coalesce(
          orders.shipping_address ->> 'governorate',
          orders.shipping_address ->> 'city'
        ) as governorate,
        coalesce(
          nullif(trim(concat_ws(' ', profiles.first_name, profiles.last_name)), ''),
          profiles.email,
          'Client'
        ) as customer_name
      from public.orders
      left join public.profiles on profiles.id = orders.user_id
      order by orders.created_at desc nulls last
      limit greatest(p_limit, 1)
    ) as items
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_admin_recent_orders(integer) to authenticated;
