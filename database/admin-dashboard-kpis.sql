-- Migration for an existing Supabase database.
-- Dashboard KPIs are calculated from live data.

create or replace function public.get_admin_dashboard_kpis()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  with bounds as (
    select
      date_trunc('month', now()) as current_start,
      date_trunc('month', now()) - interval '1 month' as previous_start
  ),
  metrics as (
    select
      (select count(*)::numeric from public.profiles where role = 'customer') as customers,
      (select count(*)::numeric from public.orders where status = 'delivered') as orders,
      (select coalesce(sum(total), 0)::numeric from public.orders where status = 'delivered') as revenue,
      (select coalesce(avg(total), 0)::numeric from public.orders where status = 'delivered') as average_basket,
      (select count(*)::numeric from public.profiles, bounds
       where role = 'customer' and created_at >= bounds.current_start) as customers_current,
      (select count(*)::numeric from public.profiles, bounds
       where role = 'customer' and created_at >= bounds.previous_start and created_at < bounds.current_start) as customers_previous,
      (select count(*)::numeric from public.orders, bounds
       where status = 'delivered' and created_at >= bounds.current_start) as orders_current,
      (select count(*)::numeric from public.orders, bounds
       where status = 'delivered' and created_at >= bounds.previous_start and created_at < bounds.current_start) as orders_previous,
      (select coalesce(sum(total), 0)::numeric from public.orders, bounds
       where status = 'delivered' and created_at >= bounds.current_start) as revenue_current,
      (select coalesce(sum(total), 0)::numeric from public.orders, bounds
       where status = 'delivered' and created_at >= bounds.previous_start and created_at < bounds.current_start) as revenue_previous,
      (select coalesce(avg(total), 0)::numeric from public.orders, bounds
       where status = 'delivered' and created_at >= bounds.current_start) as average_basket_current,
      (select coalesce(avg(total), 0)::numeric from public.orders, bounds
       where status = 'delivered' and created_at >= bounds.previous_start and created_at < bounds.current_start) as average_basket_previous
  )
  select jsonb_build_object(
    'customers', customers,
    'orders', orders,
    'revenue', revenue,
    'average_basket', average_basket,
    'customers_delta_percent', round(((customers_current - customers_previous) / nullif(customers_previous, 0) * 100)::numeric, 2),
    'orders_delta_percent', round(((orders_current - orders_previous) / nullif(orders_previous, 0) * 100)::numeric, 2),
    'revenue_delta_percent', round(((revenue_current - revenue_previous) / nullif(revenue_previous, 0) * 100)::numeric, 2),
    'average_basket_delta_percent', round(((average_basket_current - average_basket_previous) / nullif(average_basket_previous, 0) * 100)::numeric, 2)
  ) into result
  from metrics;

  return result;
end;
$$;

grant execute on function public.get_admin_dashboard_kpis() to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table public.profiles;
  end if;
end;
$$;
