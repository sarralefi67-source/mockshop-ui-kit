-- Migration for an existing Supabase database.
-- Category activation is not used by the application.

alter table public.categories
  drop column if exists is_active;
