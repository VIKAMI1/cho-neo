-- Shared Gossip Cafe Memory V1
-- Run this in Supabase before enabling shared Front Counter messages.

create extension if not exists pgcrypto;

create table if not exists public.cho_neo_gossip_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'front-counter',
  avatar_id text not null,
  nickname text not null,
  text text not null,
  reactions jsonb not null default '{}'::jsonb,
  report_count integer not null default 0,
  reported_at timestamptz null,
  hidden_at timestamptz null,
  removed_at timestamptz null,
  created_at timestamptz not null default now()
);

alter table public.cho_neo_gossip_messages
  add column if not exists report_count integer not null default 0,
  add column if not exists reported_at timestamptz null,
  add column if not exists removed_at timestamptz null;

create index if not exists cho_neo_gossip_messages_visible_idx
  on public.cho_neo_gossip_messages (room_id, hidden_at, created_at desc);

create index if not exists cho_neo_gossip_messages_reported_idx
  on public.cho_neo_gossip_messages (room_id, report_count desc, reported_at desc)
  where report_count > 0;

alter table public.cho_neo_gossip_messages enable row level security;

drop policy if exists "Cho Neo shared gossip visible messages are readable"
  on public.cho_neo_gossip_messages;

create policy "Cho Neo shared gossip visible messages are readable"
  on public.cho_neo_gossip_messages
  for select
  using (hidden_at is null);

drop policy if exists "Cho Neo prototype can insert front counter messages"
  on public.cho_neo_gossip_messages;

create policy "Cho Neo prototype can insert front counter messages"
  on public.cho_neo_gossip_messages
  for insert
  with check (
    room_id = 'front-counter'
    and hidden_at is null
    and removed_at is null
    and report_count = 0
    and char_length(trim(nickname)) between 2 and 24
    and char_length(trim(text)) between 1 and 180
  );

drop policy if exists "Cho Neo visitors can report visible gossip messages"
  on public.cho_neo_gossip_messages;

create policy "Cho Neo visitors can report visible gossip messages"
  on public.cho_neo_gossip_messages
  for update
  using (
    room_id = 'front-counter'
    and hidden_at is null
  )
  with check (
    room_id = 'front-counter'
    and hidden_at is null
  );

grant update (report_count, reported_at) on public.cho_neo_gossip_messages to anon;
