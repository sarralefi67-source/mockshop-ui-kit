-- Fix: is_admin() returned NULL (not false) when the calling user has no row
-- in public.profiles (e.g. right after signup, before the profile-creation
-- trigger fires, or if the profile row was deleted).
--
-- RLS policies using `using (is_admin())` were NOT affected: Postgres treats
-- a NULL policy qualifier as a deny, same as false.
--
-- BUT every admin RPC (get_admin_customers_list, get_admin_dashboard_kpis,
-- get_admin_monthly_sales, get_admin_low_stock_products, get_admin_recent_orders)
-- uses `if not public.is_admin() then raise exception ... end if;` — and
-- PL/pgSQL's IF treats a NULL condition as false, so `not NULL` = NULL also
-- skips the exception. Any authenticated user without a profiles row could
-- call these RPCs and receive full customer PII / revenue data.
--
-- Fix: coalesce to false so the function never returns NULL, and pin
-- search_path (missing here, present on every other SECURITY DEFINER
-- function in this project) as defense in depth.

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  p_role text;
begin
  select role into p_role from public.profiles where id = auth.uid();
  return coalesce(p_role = 'admin', false);
end;
$$;
