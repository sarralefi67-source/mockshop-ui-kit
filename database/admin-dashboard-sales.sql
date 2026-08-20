-- Migration for an existing Supabase database.
-- Monthly sales for the dashboard chart, based on delivered orders.

create or replace function public.get_admin_monthly_sales(p_months integer default 6)
returns table (month text, total numeric)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;

  return query
  with months as (
    select generate_series(
      date_trunc('month', current_date) - ((greatest(p_months, 1) - 1) * interval '1 month'),
      date_trunc('month', current_date),
      interval '1 month'
    ) as month_start
  )
  select
    to_char(months.month_start, 'YYYY-MM') as month,
    coalesce(sum(orders.total), 0)::numeric as total
  from months
  left join public.orders
    on orders.status = 'delivered'
   and orders.created_at >= months.month_start
   and orders.created_at < months.month_start + interval '1 month'
  group by months.month_start
  order by months.month_start;
end;
$$;

grant execute on function public.get_admin_monthly_sales(integer) to authenticated;
