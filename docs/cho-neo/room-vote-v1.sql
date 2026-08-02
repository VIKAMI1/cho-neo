-- Cho Neo Room Vote V1 reference SQL
-- The executable repository migration is:
-- supabase/migrations/20260726185000_cho_neo_guest_pass_v1.sql
-- Use this document for operational review before enabling persistent public room voting.
-- PostgreSQL/Supabase runtime acceptance remains a required pre-deployment gate.

create extension if not exists pgcrypto;

create table if not exists public.cho_neo_room_votes (
  id uuid primary key default gen_random_uuid(),
  poll_key text not null,
  option_key text not null,
  voter_hash text null,
  voter_user_id uuid null references auth.users(id) on delete cascade,
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

create table if not exists public.cho_neo_guest_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  normalized_display_name text not null,
  avatar_key text null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint cho_neo_guest_profiles_display_name_length_check
    check (char_length(display_name) between 2 and 24),
  constraint cho_neo_guest_profiles_avatar_key_check
    check (
      avatar_key is null
      or avatar_key in (
        'young-nail-tech',
        'auntie-owner',
        'quiet-listener',
        'gossip-auntie',
        'weekend-warrior',
        'salon-queen',
        'ong-dia-buddy',
        'new-village-guest',
        'uncle-coffee',
        'bubble-tea-tech',
        'product-hunter',
        'market-runner',
        'golden-scissors',
        'lucky-cat-friend',
        'front-counter-pro'
      )
    ),
  constraint cho_neo_guest_profiles_status_check
    check (status in ('active', 'banned', 'suspended'))
);

create unique index if not exists cho_neo_room_votes_one_vote_per_visitor_idx
  on public.cho_neo_room_votes (poll_key, voter_hash);

create unique index if not exists cho_neo_room_votes_one_vote_per_user_idx
  on public.cho_neo_room_votes (poll_key, voter_user_id)
  where voter_user_id is not null;

create index if not exists cho_neo_room_votes_poll_option_idx
  on public.cho_neo_room_votes (poll_key, option_key);

create index if not exists cho_neo_guest_profiles_status_idx
  on public.cho_neo_guest_profiles (status);

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
alter table public.cho_neo_guest_profiles enable row level security;

create or replace function public.set_cho_neo_guest_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_cho_neo_guest_profiles_updated_at
  on public.cho_neo_guest_profiles;

create trigger set_cho_neo_guest_profiles_updated_at
  before update on public.cho_neo_guest_profiles
  for each row
  execute function public.set_cho_neo_guest_profiles_updated_at();

drop policy if exists "Cho Neo guest profiles are owner readable"
  on public.cho_neo_guest_profiles;

create policy "Cho Neo guest profiles are owner readable"
  on public.cho_neo_guest_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Cho Neo users can create their own guest profile"
  on public.cho_neo_guest_profiles;

create policy "Cho Neo users can create their own guest profile"
  on public.cho_neo_guest_profiles
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'active'
  );

drop policy if exists "Cho Neo users can update their own active guest profile"
  on public.cho_neo_guest_profiles;

create policy "Cho Neo users can update their own active guest profile"
  on public.cho_neo_guest_profiles
  for update
  to authenticated
  using (auth.uid() = user_id and status = 'active')
  with check (auth.uid() = user_id and status = 'active');

drop policy if exists "Cho Neo visitors can read their own room vote"
  on public.cho_neo_room_votes;

create policy "Cho Neo visitors can read their own room vote"
  on public.cho_neo_room_votes
  for select
  to authenticated
  using (
    poll_key = 'cho-neo-room-vote-v1'
    and voter_user_id = auth.uid()
  );

drop policy if exists "Cho Neo visitors can insert room votes"
  on public.cho_neo_room_votes;

create policy "Cho Neo visitors can insert room votes"
  on public.cho_neo_room_votes
  for insert
  to authenticated
  with check (
    poll_key = 'cho-neo-room-vote-v1'
    and voter_user_id = auth.uid()
    and option_key in (
      'show-off',
      'owner-corner',
      'nail-tech-corner',
      'waterfront'
    )
    and (voter_hash is null or char_length(voter_hash) between 32 and 128)
    and (optional_reason is null or char_length(optional_reason) <= 280)
    and exists (
      select 1
      from public.cho_neo_guest_profiles profile
      where profile.user_id = auth.uid()
        and profile.status = 'active'
    )
  );

drop policy if exists "Cho Neo visitors can update their room vote"
  on public.cho_neo_room_votes;

create policy "Cho Neo visitors can update their room vote"
  on public.cho_neo_room_votes
  for update
  to authenticated
  using (
    poll_key = 'cho-neo-room-vote-v1'
    and voter_user_id = auth.uid()
  )
  with check (
    poll_key = 'cho-neo-room-vote-v1'
    and voter_user_id = auth.uid()
    and option_key in (
      'show-off',
      'owner-corner',
      'nail-tech-corner',
      'waterfront'
    )
    and (voter_hash is null or char_length(voter_hash) between 32 and 128)
    and (optional_reason is null or char_length(optional_reason) <= 280)
    and exists (
      select 1
      from public.cho_neo_guest_profiles profile
      where profile.user_id = auth.uid()
        and profile.status = 'active'
    )
  );
