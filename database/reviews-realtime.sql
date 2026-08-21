-- Let the admin panel subscribe to new review submissions in real time
-- (see database/admin-dashboard-kpis.sql for the same pattern already used
-- on orders/profiles). Realtime still enforces the table's RLS per
-- subscriber, so a customer session only ever sees their own inserts while
-- an admin session (is_admin()) sees all of them — exactly what the
-- "new review" notification in /admin needs.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;
end;
$$;
