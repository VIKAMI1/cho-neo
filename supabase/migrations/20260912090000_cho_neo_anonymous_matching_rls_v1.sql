-- Defense in depth for Chợ Neo matching data.
-- The application rejects anonymous users before matching queries. These
-- restrictive policies ensure the database also rejects anonymous reads if a
-- route or client is ever changed later.

drop policy if exists cho_neo_matching_profiles_reject_anonymous
  on public.cho_neo_matching_profiles;
create policy cho_neo_matching_profiles_reject_anonymous
  on public.cho_neo_matching_profiles
  as restrictive
  for select
  to authenticated
  using (((select (auth.jwt()->>'is_anonymous')::boolean) is false));

drop policy if exists cho_neo_introductions_reject_anonymous
  on public.cho_neo_introductions;
create policy cho_neo_introductions_reject_anonymous
  on public.cho_neo_introductions
  as restrictive
  for select
  to authenticated
  using (((select (auth.jwt()->>'is_anonymous')::boolean) is false));

drop policy if exists cho_neo_matching_blocks_reject_anonymous
  on public.cho_neo_matching_blocks;
create policy cho_neo_matching_blocks_reject_anonymous
  on public.cho_neo_matching_blocks
  as restrictive
  for select
  to authenticated
  using (((select (auth.jwt()->>'is_anonymous')::boolean) is false));

drop policy if exists cho_neo_matching_reports_reject_anonymous
  on public.cho_neo_matching_reports;
create policy cho_neo_matching_reports_reject_anonymous
  on public.cho_neo_matching_reports
  as restrictive
  for select
  to authenticated
  using (((select (auth.jwt()->>'is_anonymous')::boolean) is false));
