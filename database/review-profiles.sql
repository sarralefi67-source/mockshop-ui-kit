-- Public, minimal profile data used to display review author names.
-- Do not expose public SELECT access to the full profiles table: it contains
-- private contact details such as email and phone.
create or replace view public.review_profiles as
select id, first_name, last_name
from public.profiles;

grant select on public.review_profiles to anon, authenticated;
