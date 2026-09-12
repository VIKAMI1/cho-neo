-- Keep trigger functions deterministic even if the database role search_path
-- changes. These functions only update the row's timestamp.
alter function public.set_cho_neo_member_profiles_updated_at()
  set search_path = pg_catalog, public;

alter function public.set_cho_neo_room_votes_updated_at()
  set search_path = pg_catalog, public;
