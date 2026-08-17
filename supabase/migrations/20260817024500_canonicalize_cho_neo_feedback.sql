-- Canonical, data-preserving Chợ Neo feedback schema.
-- Existing rows are never rewritten or backfilled by this migration.

create table if not exists public.cho_neo_feedback (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'event',
  event_name text null,
  created_at timestamptz not null default now(),
  page_path text not null,
  room text null,
  device_type text null,
  anonymous_session_id text null,
  selected_village_mood text null,
  music_included boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  constraint cho_neo_feedback_kind_check
    check (kind in ('event', 'feedback'))
);

do $page_path_guard$
begin
  if exists (
    select 1
    from public.cho_neo_feedback
    where page_path is null
  ) then
    raise exception
      'Cannot canonicalize public.cho_neo_feedback: page_path contains NULL values; no backfill was attempted';
  end if;
end;
$page_path_guard$;

do $kind_guard$
begin
  if exists (
    select 1
    from public.cho_neo_feedback
    where kind is null
       or kind not in ('event', 'feedback')
  ) then
    raise exception
      'Cannot canonicalize public.cho_neo_feedback: kind contains NULL or unsupported values';
  end if;
end;
$kind_guard$;

alter table public.cho_neo_feedback
  alter column id set default gen_random_uuid(),
  alter column id set not null,
  alter column kind set default 'event',
  alter column kind set not null,
  alter column event_name drop default,
  alter column event_name drop not null,
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column page_path drop default,
  alter column page_path set not null,
  alter column room drop default,
  alter column room drop not null,
  alter column device_type drop default,
  alter column device_type drop not null,
  alter column anonymous_session_id drop default,
  alter column anonymous_session_id drop not null,
  alter column selected_village_mood drop default,
  alter column selected_village_mood drop not null,
  alter column music_included set default false,
  alter column music_included set not null,
  alter column payload set default '{}'::jsonb,
  alter column payload set not null;

alter table public.cho_neo_feedback
  drop constraint if exists cho_neo_feedback_kind_check;

alter table public.cho_neo_feedback
  add constraint cho_neo_feedback_kind_check
  check (kind in ('event', 'feedback'));

do $primary_key_guard$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.cho_neo_feedback'::regclass
      and contype = 'p'
  ) then
    alter table public.cho_neo_feedback
      add constraint cho_neo_feedback_pkey primary key (id);
  end if;
end;
$primary_key_guard$;

create index if not exists cho_neo_feedback_kind_created_at_idx
  on public.cho_neo_feedback (kind, created_at desc);

create index if not exists cho_neo_feedback_kind_event_name_created_at_idx
  on public.cho_neo_feedback (kind, event_name, created_at desc);

alter table public.cho_neo_feedback enable row level security;

revoke all privileges on table public.cho_neo_feedback from public;
revoke all privileges on table public.cho_neo_feedback from anon, authenticated;
revoke all privileges on table public.cho_neo_feedback from service_role;
grant select, insert on table public.cho_neo_feedback to service_role;
