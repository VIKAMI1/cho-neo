alter table public.cho_neo_member_invitations
  add column if not exists recipient_name text null,
  add column if not exists recipient_contact text null;
