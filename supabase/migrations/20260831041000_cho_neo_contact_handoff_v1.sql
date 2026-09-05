-- Per-introduction contact handoff after mutual consent.
-- Chợ Neo does not host free-form chat. Contact details are private, revocable,
-- and visible only through the authenticated server route after both members
-- accept the introduction.

create table if not exists public.cho_neo_contact_handoffs (
  introduction_id uuid not null references public.cho_neo_introductions(id) on delete cascade,
  user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  method text not null,
  contact_value text not null,
  shared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (introduction_id, user_id),
  constraint cho_neo_contact_handoffs_method check (
    method in ('Facebook', 'Messenger', 'Instagram', 'WhatsApp', 'Khác')
  ),
  constraint cho_neo_contact_handoffs_value_length check (
    char_length(contact_value) between 3 and 180
  )
);

create index if not exists cho_neo_contact_handoffs_user_idx
  on public.cho_neo_contact_handoffs (user_id, updated_at desc);

alter table public.cho_neo_contact_handoffs enable row level security;
revoke all on public.cho_neo_contact_handoffs from anon, authenticated;

comment on table public.cho_neo_contact_handoffs is
  'Revocable contact details shared for one mutually accepted Chợ Neo introduction. Access is server-mediated.';
