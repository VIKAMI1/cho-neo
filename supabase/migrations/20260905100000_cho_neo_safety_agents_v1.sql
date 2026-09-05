-- Chợ Neo safety agents V1.
-- This table stores only safety signals and actions, never private message text.
-- It is server-only and must be applied to non-production before persistent
-- moderation telemetry is available.

create table if not exists public.cho_neo_safety_events (
  id uuid primary key default gen_random_uuid(),
  subject_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  introduction_id uuid references public.cho_neo_introductions(id) on delete set null,
  source text not null,
  action text not null,
  severity text not null,
  score smallint not null default 0,
  signal_codes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  agent_version text not null,
  review_status text not null default 'open',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  reviewed_at timestamptz,
  constraint cho_neo_safety_events_source check (source in ('language', 'behavior')),
  constraint cho_neo_safety_events_action check (action in ('warn', 'throttle', 'block', 'review')),
  constraint cho_neo_safety_events_severity check (severity in ('medium', 'high', 'critical')),
  constraint cho_neo_safety_events_score check (score between 0 and 100),
  constraint cho_neo_safety_events_review_status check (review_status in ('open', 'reviewing', 'resolved'))
);

create index if not exists cho_neo_safety_events_review_idx
  on public.cho_neo_safety_events (review_status, created_at desc);

create index if not exists cho_neo_safety_events_subject_idx
  on public.cho_neo_safety_events (subject_user_id, created_at desc);

alter table public.cho_neo_safety_events enable row level security;
revoke all on public.cho_neo_safety_events from anon, authenticated;

comment on table public.cho_neo_safety_events is
  'Private server-side safety signals for Chợ Neo. Never store message bodies here.';
comment on column public.cho_neo_safety_events.metadata is
  'Non-content telemetry only: provider degradation, counters, or versioned signal context.';
