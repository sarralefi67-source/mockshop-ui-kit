-- newsletter_subscribers had an INSERT policy for `anon` (public signup
-- form) and one for `authenticated` gated on is_admin() — but no policy let
-- a logged-in *non-admin* customer subscribe themselves. That broke the
-- newsletter checkbox in compte/index and the signup form's newsletter
-- opt-in (403 as soon as the user has a session).

create policy "authenticated self-subscribes to newsletter"
on public.newsletter_subscribers
for insert
to authenticated
with check (true);
