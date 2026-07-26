-- Harden Chợ Neo gossip writes before Guest Pass rollout.
-- Browser clients may read visible messages, but inserts must go through the
-- server route that verifies the Supabase user and active Thẻ Chợ Neo profile.

create extension if not exists pgcrypto;

create table if not exists public.cho_neo_gossip_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text not null default 'front-counter',
  author_user_id uuid null references auth.users(id) on delete set null,
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
  add column if not exists author_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists report_count integer not null default 0,
  add column if not exists reported_at timestamptz null,
  add column if not exists hidden_at timestamptz null,
  add column if not exists removed_at timestamptz null;

create index if not exists cho_neo_gossip_messages_visible_idx
  on public.cho_neo_gossip_messages (room_id, hidden_at, created_at desc);

create index if not exists cho_neo_gossip_messages_author_user_idx
  on public.cho_neo_gossip_messages (author_user_id, created_at desc)
  where author_user_id is not null;

create index if not exists cho_neo_gossip_messages_reported_idx
  on public.cho_neo_gossip_messages (room_id, report_count desc, reported_at desc)
  where report_count > 0;

alter table public.cho_neo_gossip_messages enable row level security;

grant select on public.cho_neo_gossip_messages to anon, authenticated;
revoke insert on public.cho_neo_gossip_messages from anon, authenticated;
revoke update on public.cho_neo_gossip_messages from anon, authenticated;
revoke delete on public.cho_neo_gossip_messages from anon, authenticated;
revoke truncate on public.cho_neo_gossip_messages from anon, authenticated;
revoke references on public.cho_neo_gossip_messages from anon, authenticated;
revoke trigger on public.cho_neo_gossip_messages from anon, authenticated;

drop policy if exists "Cho Neo gossip messages can be inserted"
  on public.cho_neo_gossip_messages;

drop policy if exists "Cho Neo prototype can insert front counter messages"
  on public.cho_neo_gossip_messages;

drop policy if exists "Cho Neo visitors can report visible gossip messages"
  on public.cho_neo_gossip_messages;

drop policy if exists "Cho Neo shared gossip visible messages are readable"
  on public.cho_neo_gossip_messages;

create policy "Cho Neo shared gossip visible messages are readable"
  on public.cho_neo_gossip_messages
  for select
  to anon, authenticated
  using (hidden_at is null and removed_at is null);
