-- Tìm Bạn Trong Nghề V1: private cards, owner-assisted introductions,
-- mutual consent, expiry, blocking, and reporting. There is no public directory.

create table if not exists public.cho_neo_matching_profiles (
  user_id uuid primary key references public.cho_neo_member_profiles(user_id) on delete cascade,
  city text not null,
  situation text not null,
  looking_for text not null,
  can_share text not null,
  status text not null default 'active',
  consent_version text not null,
  consent_accepted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cho_neo_matching_profiles_city_length check (char_length(city) between 2 and 60),
  constraint cho_neo_matching_profiles_situation_length check (char_length(situation) between 2 and 80),
  constraint cho_neo_matching_profiles_looking_for_length check (char_length(looking_for) between 2 and 240),
  constraint cho_neo_matching_profiles_can_share_length check (char_length(can_share) between 2 and 240),
  constraint cho_neo_matching_profiles_status check (status in ('active', 'paused'))
);

create table if not exists public.cho_neo_introductions (
  id uuid primary key default gen_random_uuid(),
  member_a_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  member_b_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  member_a_decision text not null default 'pending',
  member_b_decision text not null default 'pending',
  match_note text not null,
  icebreaker text not null,
  expires_at timestamptz not null,
  opened_at timestamptz,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cho_neo_introductions_distinct_members check (member_a_user_id <> member_b_user_id),
  constraint cho_neo_introductions_member_order check (member_a_user_id::text < member_b_user_id::text),
  constraint cho_neo_introductions_a_decision check (member_a_decision in ('pending', 'accepted', 'passed')),
  constraint cho_neo_introductions_b_decision check (member_b_decision in ('pending', 'accepted', 'passed')),
  constraint cho_neo_introductions_match_note_length check (char_length(match_note) between 2 and 240),
  constraint cho_neo_introductions_icebreaker_length check (char_length(icebreaker) between 2 and 240),
  constraint cho_neo_introductions_expiry check (expires_at > created_at)
);

create table if not exists public.cho_neo_matching_blocks (
  blocker_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  blocked_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  constraint cho_neo_matching_blocks_distinct_members check (blocker_user_id <> blocked_user_id)
);

create table if not exists public.cho_neo_matching_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  reported_user_id uuid not null references public.cho_neo_member_profiles(user_id) on delete cascade,
  introduction_id uuid not null references public.cho_neo_introductions(id) on delete cascade,
  reason text not null,
  details text,
  review_status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint cho_neo_matching_reports_distinct_members check (reporter_user_id <> reported_user_id),
  constraint cho_neo_matching_reports_reason check (reason in ('sales', 'recruiting', 'harassment', 'unsafe', 'other')),
  constraint cho_neo_matching_reports_details_length check (details is null or char_length(details) <= 500),
  constraint cho_neo_matching_reports_review_status check (review_status in ('open', 'reviewing', 'resolved'))
);

create index if not exists cho_neo_matching_profiles_status_city_idx
  on public.cho_neo_matching_profiles (status, lower(city));
create index if not exists cho_neo_introductions_member_a_idx
  on public.cho_neo_introductions (member_a_user_id, created_at desc);
create index if not exists cho_neo_introductions_member_b_idx
  on public.cho_neo_introductions (member_b_user_id, created_at desc);
create unique index if not exists cho_neo_introductions_one_live_pair_idx
  on public.cho_neo_introductions (member_a_user_id, member_b_user_id)
  where member_a_decision <> 'passed' and member_b_decision <> 'passed';
create index if not exists cho_neo_matching_reports_review_idx
  on public.cho_neo_matching_reports (review_status, created_at desc);

alter table public.cho_neo_matching_profiles enable row level security;
alter table public.cho_neo_introductions enable row level security;
alter table public.cho_neo_matching_blocks enable row level security;
alter table public.cho_neo_matching_reports enable row level security;

revoke all on public.cho_neo_matching_profiles from anon, authenticated;
revoke all on public.cho_neo_introductions from anon, authenticated;
revoke all on public.cho_neo_matching_blocks from anon, authenticated;
revoke all on public.cho_neo_matching_reports from anon, authenticated;

-- These policies provide defense in depth. The application still performs all
-- mutations through authenticated server routes and the service role.
create policy cho_neo_matching_profiles_select_own
  on public.cho_neo_matching_profiles for select to authenticated
  using (user_id = (select auth.uid()));
create policy cho_neo_introductions_select_participating
  on public.cho_neo_introductions for select to authenticated
  using ((select auth.uid()) in (member_a_user_id, member_b_user_id));
create policy cho_neo_matching_blocks_select_own
  on public.cho_neo_matching_blocks for select to authenticated
  using (blocker_user_id = (select auth.uid()));
create policy cho_neo_matching_reports_select_own
  on public.cho_neo_matching_reports for select to authenticated
  using (reporter_user_id = (select auth.uid()));
