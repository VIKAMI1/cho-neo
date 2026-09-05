-- A private, text-only table opens after both members say hello.
-- Active tables do not show a countdown. The application treats a table as
-- quiet after seven days without activity and lets either participant keep it.

alter table public.cho_neo_introductions
  add column if not exists table_last_active_at timestamptz,
  add column if not exists table_closed_at timestamptz,
  add column if not exists table_closed_by uuid references public.cho_neo_member_profiles(user_id) on delete set null;

create table if not exists public.cho_neo_private_messages (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.cho_neo_introductions(id) on delete cascade,
  sender_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint cho_neo_private_messages_body_length check (char_length(body) between 1 and 500)
);

create index if not exists cho_neo_private_messages_intro_created_idx
  on public.cho_neo_private_messages (introduction_id, created_at);
create index if not exists cho_neo_private_messages_sender_rate_idx
  on public.cho_neo_private_messages (sender_user_id, introduction_id, created_at desc);
create index if not exists cho_neo_introductions_table_activity_idx
  on public.cho_neo_introductions (table_last_active_at)
  where table_closed_at is null;

alter table public.cho_neo_matching_reports
  add column if not exists message_evidence jsonb,
  add column if not exists evidence_expires_at timestamptz;

alter table public.cho_neo_private_messages enable row level security;
revoke all on public.cho_neo_private_messages from anon, authenticated;

comment on table public.cho_neo_private_messages is
  'Server-mediated text messages for one mutually accepted Chợ Neo introduction. Not a public or permanent inbox.';
comment on column public.cho_neo_matching_reports.message_evidence is
  'Temporary message snapshot retained only when a participant reports a safety concern.';

-- Delete abandoned/closed table messages after the 30-day safety window and
-- erase report evidence when its disclosed review window ends.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'cho-neo-private-table-retention',
  '17 * * * *',
  $retention$
    delete from public.cho_neo_private_messages as message
    using public.cho_neo_introductions as introduction
    where message.introduction_id = introduction.id
      and coalesce(
        introduction.table_closed_at,
        introduction.table_last_active_at,
        introduction.opened_at,
        introduction.created_at
      ) < now() - interval '30 days';

    update public.cho_neo_matching_reports
      set message_evidence = null,
          evidence_expires_at = null
      where evidence_expires_at <= now();
  $retention$
);

