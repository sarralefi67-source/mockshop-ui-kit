-- Migration for an existing Supabase database.
-- Allow administrators to display customer profiles and their related data.

drop policy if exists "admins read customer profiles" on public.profiles;
create policy "admins read customer profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins read customer orders" on public.orders;
create policy "admins read customer orders"
on public.orders
for select
to authenticated
using (public.is_admin());

drop policy if exists "admins read customer addresses" on public.addresses;
create policy "admins read customer addresses"
on public.addresses
for select
to authenticated
using (public.is_admin());

create or replace function public.get_admin_customers_list()
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
    select jsonb_agg(row_to_json(items) order by items.created_at desc nulls last)
    from (
      select
        profiles.id,
        profiles.first_name,
        profiles.last_name,
        profiles.email,
        profiles.phone,
        profiles.created_at,
        coalesce(stats.order_count, 0)::int as order_count,
        coalesce(stats.total_spent, 0)::numeric as total_spent
      from public.profiles
      left join (
        select
          orders.user_id,
          count(*)::int as order_count,
          coalesce(sum(orders.total), 0)::numeric as total_spent
        from public.orders
        group by orders.user_id
      ) as stats on stats.user_id = profiles.id
      where profiles.role = 'customer'
      order by profiles.created_at desc nulls last
    ) as items
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.get_admin_customers_list() to authenticated;
