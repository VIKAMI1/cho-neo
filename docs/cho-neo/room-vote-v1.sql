-- Cho Neo Room Vote V1
-- Run this in Supabase before enabling persistent public room voting.
-- PostgreSQL/Supabase runtime acceptance remains a required pre-deployment gate.

create extension if not exists pgcrypto;

create table if not exists public.cho_neo_room_votes (
  id uuid primary key default gen_random_uuid(),
  poll_key text not null,
  option_key text not null,
  voter_hash text not null,
  optional_reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cho_neo_room_votes_poll_key_check
    check (poll_key = 'cho-neo-room-vote-v1'),
  constraint cho_neo_room_votes_option_key_check
    check (option_key in (
      'show-off',
      'owner-corner',
      'nail-tech-corner',
      'waterfront'
    )),
  constraint cho_neo_room_votes_reason_length_check
    check (optional_reason is null or char_length(optional_reason) <= 280)
);

create unique index if not exists cho_neo_room_votes_one_vote_per_visitor_idx
  on public.cho_neo_room_votes (poll_key, voter_hash);

create index if not exists cho_neo_room_votes_poll_option_idx
  on public.cho_neo_room_votes (poll_key, option_key);

create or replace function public.set_cho_neo_room_votes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_cho_neo_room_votes_updated_at
  on public.cho_neo_room_votes;

create trigger set_cho_neo_room_votes_updated_at
  before update on public.cho_neo_room_votes
  for each row
  execute function public.set_cho_neo_room_votes_updated_at();

alter table public.cho_neo_room_votes enable row level security;

drop policy if exists "Cho Neo room vote results are readable"
  on public.cho_neo_room_votes;

create policy "Cho Neo room vote results are readable"
  on public.cho_neo_room_votes
  for select
  using (poll_key = 'cho-neo-room-vote-v1');

drop policy if exists "Cho Neo visitors can insert room votes"
  on public.cho_neo_room_votes;

create policy "Cho Neo visitors can insert room votes"
  on public.cho_neo_room_votes
  for insert
  with check (
    poll_key = 'cho-neo-room-vote-v1'
    and option_key in (
      'show-off',
      'owner-corner',
      'nail-tech-corner',
      'waterfront'
    )
    and char_length(voter_hash) between 32 and 128
    and (optional_reason is null or char_length(optional_reason) <= 280)
  );

drop policy if exists "Cho Neo visitors can update their room vote"
  on public.cho_neo_room_votes;

create policy "Cho Neo visitors can update their room vote"
  on public.cho_neo_room_votes
  for update
  using (poll_key = 'cho-neo-room-vote-v1')
  with check (
    poll_key = 'cho-neo-room-vote-v1'
    and option_key in (
      'show-off',
      'owner-corner',
      'nail-tech-corner',
      'waterfront'
    )
    and char_length(voter_hash) between 32 and 128
    and (optional_reason is null or char_length(optional_reason) <= 280)
  );
