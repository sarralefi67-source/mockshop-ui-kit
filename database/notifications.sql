-- Replaces the ad-hoc "count pending reviews live" bell logic with a real
-- notifications inbox: persists even if no admin was online when the event
-- happened, supports read/unread, and is extensible to other event types
-- later (orders, low stock...) by adding more triggers — only the review
-- trigger is wired for now, matching what was actually asked for.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;

-- Admin-only in both directions: this is purely an internal admin tool, no
-- customer-facing read path at all.
create policy "admin full access notifications"
on public.notifications
for all
to public
using (public.is_admin())
with check (public.is_admin());

-- New review submitted -> notification row. SECURITY DEFINER so the
-- inserting customer (who has no access to public.notifications under RLS)
-- can still trigger this.
create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (type, title, body, link)
  values (
    'review',
    'Nouvel avis client',
    nullif(concat_ws(' — ', repeat('★', greatest(least(NEW.rating, 5), 0)), nullif(NEW.comment, '')), ''),
    '/admin/avis'
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_new_review on public.reviews;
create trigger trg_notify_new_review
after insert on public.reviews
for each row execute function public.notify_new_review();

-- Live badge/toast updates in the admin panel.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
