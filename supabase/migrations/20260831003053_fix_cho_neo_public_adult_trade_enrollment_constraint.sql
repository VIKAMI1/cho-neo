-- The member profile table was originally created as a guest profile table,
-- so its primary key retained the legacy constraint name after the table rename.
-- Canonicalize the name expected by the public adult trade enrollment function.

alter table public.cho_neo_member_profiles
  rename constraint cho_neo_guest_profiles_pkey
  to cho_neo_member_profiles_pkey;
