-- Migration for an existing Supabase database.
-- Monthly sales for the dashboard chart, based on delivered orders.

drop function if exists public.get_admin_monthly_sales(integer);

create or replace function public.get_admin_monthly_sales(p_days integer default 180, p_end_date date default current_date)
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
  with periods as (
    select generate_series(
      case when p_days <= 31 then p_end_date - greatest(p_days, 1) + 1 else date_trunc('month', p_end_date) - ((greatest(p_days, 1) / 30) * interval '1 month') end,
      case when p_days <= 31 then p_end_date else date_trunc('month', p_end_date) end,
      case when p_days <= 31 then interval '1 day' else interval '1 month' end
    ) as period_start
  )
  select
    case when p_days <= 31 then to_char(periods.period_start, 'YYYY-MM-DD') else to_char(periods.period_start, 'YYYY-MM') end as month,
    coalesce(sum(orders.total), 0)::numeric as total
  from periods
  left join public.orders
    on orders.status = 'delivered'
   and orders.created_at >= periods.period_start
   and orders.created_at < periods.period_start + case when p_days <= 31 then interval '1 day' else interval '1 month' end
  group by periods.period_start
  order by periods.period_start;
end;
$$;

grant execute on function public.get_admin_monthly_sales(integer, date) to authenticated;
