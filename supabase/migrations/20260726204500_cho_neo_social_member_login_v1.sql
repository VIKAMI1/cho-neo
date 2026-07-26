-- Chợ Neo Social Member Login V1
-- Evolves the prior unshipped visitor profile model into OAuth-backed nail membership.

do $$
begin
  if to_regclass('public.cho_neo_member_profiles') is null
     and to_regclass('public.cho_neo_guest_profiles') is not null then
    alter table public.cho_neo_guest_profiles
      rename to cho_neo_member_profiles;
  end if;
end $$;

create table if not exists public.cho_neo_member_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  normalized_display_name text not null,
  avatar_key text null,
  nail_role text null,
  membership_status text not null default 'pending',
  invitation_id uuid null,
  invited_by_user_id uuid null references auth.users(id) on delete set null,
  approved_at timestamptz null,
  suspended_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint cho_neo_member_profiles_display_name_length_check
    check (char_length(display_name) between 2 and 24),
  constraint cho_neo_member_profiles_nail_role_check
    check (
      nail_role is null or nail_role in (
        'nail_technician',
        'salon_owner',
        'nail_student',
        'supplier',
        'educator',
        'other_industry'
      )
    ),
  constraint cho_neo_member_profiles_status_check
    check (
      membership_status in (
        'pending',
        'verified_nail_member',
        'suspended',
        'rejected'
      )
    )
);

alter table public.cho_neo_member_profiles
  add column if not exists nail_role text null,
  add column if not exists membership_status text not null default 'pending',
  add column if not exists invitation_id uuid null,
  add column if not exists invited_by_user_id uuid null references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz null,
  add column if not exists suspended_at timestamptz null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists last_seen_at timestamptz not null default now();

update public.cho_neo_member_profiles
set membership_status = case
  when status = 'active' then 'pending'
  when status = 'banned' then 'suspended'
  when status = 'suspended' then 'suspended'
  else membership_status
end
where to_jsonb(public.cho_neo_member_profiles) ? 'status';

create table if not exists public.cho_neo_member_invitations (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  status text not null default 'issued',
  issued_by_user_id uuid null references auth.users(id) on delete set null,
  intended_role text null,
  expires_at timestamptz not null,
  max_uses integer not null default 1,
  use_count integer not null default 0,
  redeemed_by_user_id uuid null references auth.users(id) on delete set null,
  redeemed_at timestamptz null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null,
  constraint cho_neo_member_invitations_status_check
    check (status in ('issued', 'redeemed', 'revoked', 'expired')),
  constraint cho_neo_member_invitations_role_check
    check (
      intended_role is null or intended_role in (
        'nail_technician',
        'salon_owner',
        'nail_student',
        'supplier',
        'educator',
        'other_industry'
      )
    ),
  constraint cho_neo_member_invitations_uses_check
    check (max_uses > 0 and use_count >= 0 and use_count <= max_uses)
);

alter table public.cho_neo_member_profiles
  drop constraint if exists cho_neo_member_profiles_invitation_id_fkey;

alter table public.cho_neo_member_profiles
  add constraint cho_neo_member_profiles_invitation_id_fkey
  foreign key (invitation_id)
  references public.cho_neo_member_invitations(id)
  on delete set null;

create index if not exists cho_neo_member_profiles_status_idx
  on public.cho_neo_member_profiles (membership_status);

create index if not exists cho_neo_member_invitations_status_expires_idx
  on public.cho_neo_member_invitations (status, expires_at);

create or replace function public.redeem_cho_neo_member_invitation(
  p_code_hash text,
  p_user_id uuid,
  p_display_name text,
  p_normalized_display_name text,
  p_avatar_key text,
  p_nail_role text
)
returns table (
  user_id uuid,
  display_name text,
  normalized_display_name text,
  avatar_key text,
  nail_role text,
  membership_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.cho_neo_member_invitations%rowtype;
  now_value timestamptz := now();
begin
  if p_user_id is null then
    raise exception 'missing-user' using errcode = 'P0001';
  end if;

  select *
    into invitation_row
  from public.cho_neo_member_invitations
  where code_hash = p_code_hash
  for update;

  if not found then
    raise exception 'invalid-invitation' using errcode = 'P0001';
  end if;

  if invitation_row.status = 'revoked' then
    raise exception 'revoked-invitation' using errcode = 'P0001';
  end if;

  if invitation_row.expires_at <= now_value then
    update public.cho_neo_member_invitations
    set status = 'expired'
    where id = invitation_row.id and status = 'issued';
    raise exception 'expired-invitation' using errcode = 'P0001';
  end if;

  if invitation_row.status <> 'issued'
     or invitation_row.use_count >= invitation_row.max_uses then
    raise exception 'used-invitation' using errcode = 'P0001';
  end if;

  if invitation_row.intended_role is not null
     and invitation_row.intended_role <> p_nail_role then
    raise exception 'role-mismatch' using errcode = 'P0001';
  end if;

  update public.cho_neo_member_invitations
  set redeemed_at = now_value,
      redeemed_by_user_id = p_user_id,
      status = case
        when invitation_row.use_count + 1 >= invitation_row.max_uses
          then 'redeemed'
        else 'issued'
      end,
      use_count = invitation_row.use_count + 1
  where id = invitation_row.id;

  insert into public.cho_neo_member_profiles (
    approved_at,
    avatar_key,
    display_name,
    invitation_id,
    last_seen_at,
    membership_status,
    nail_role,
    normalized_display_name,
    updated_at,
    user_id
  )
  values (
    now_value,
    p_avatar_key,
    p_display_name,
    invitation_row.id,
    now_value,
    'verified_nail_member',
    p_nail_role,
    p_normalized_display_name,
    now_value,
    p_user_id
  )
  on conflict (user_id) do update
  set approved_at = coalesce(public.cho_neo_member_profiles.approved_at, excluded.approved_at),
      avatar_key = excluded.avatar_key,
      display_name = excluded.display_name,
      invitation_id = excluded.invitation_id,
      last_seen_at = excluded.last_seen_at,
      membership_status = excluded.membership_status,
      nail_role = excluded.nail_role,
      normalized_display_name = excluded.normalized_display_name,
      updated_at = excluded.updated_at
  where public.cho_neo_member_profiles.membership_status <> 'suspended'
    and public.cho_neo_member_profiles.membership_status <> 'rejected';

  return query
  select
    profile.user_id,
    profile.display_name,
    profile.normalized_display_name,
    profile.avatar_key,
    profile.nail_role,
    profile.membership_status
  from public.cho_neo_member_profiles profile
  where profile.user_id = p_user_id
    and profile.membership_status = 'verified_nail_member';
end;
$$;

revoke all on function public.redeem_cho_neo_member_invitation(
  text,
  uuid,
  text,
  text,
  text,
  text
) from anon, authenticated;

create or replace function public.set_cho_neo_member_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_cho_neo_member_profiles_updated_at
  on public.cho_neo_member_profiles;

create trigger set_cho_neo_member_profiles_updated_at
  before update on public.cho_neo_member_profiles
  for each row
  execute function public.set_cho_neo_member_profiles_updated_at();

alter table public.cho_neo_member_profiles enable row level security;
alter table public.cho_neo_member_invitations enable row level security;

grant select on public.cho_neo_member_profiles to authenticated;
revoke insert on public.cho_neo_member_profiles from anon, authenticated;
revoke update on public.cho_neo_member_profiles from anon, authenticated;
revoke delete on public.cho_neo_member_profiles from anon, authenticated;
revoke truncate on public.cho_neo_member_profiles from anon, authenticated;
revoke references on public.cho_neo_member_profiles from anon, authenticated;
revoke trigger on public.cho_neo_member_profiles from anon, authenticated;

revoke all on public.cho_neo_member_invitations from anon, authenticated;

drop policy if exists "Cho Neo guest profiles are owner readable"
  on public.cho_neo_member_profiles;
drop policy if exists "Cho Neo users can create their own guest profile"
  on public.cho_neo_member_profiles;
drop policy if exists "Cho Neo users can update their own active guest profile"
  on public.cho_neo_member_profiles;
drop policy if exists "Cho Neo member profiles are owner readable"
  on public.cho_neo_member_profiles;

create policy "Cho Neo member profiles are owner readable"
  on public.cho_neo_member_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Cho Neo visitors can insert room votes"
  on public.cho_neo_room_votes;
drop policy if exists "Cho Neo visitors can update their room vote"
  on public.cho_neo_room_votes;

create policy "Cho Neo verified members can insert room votes"
  on public.cho_neo_room_votes
  for insert
  to authenticated
  with check (
    voter_user_id = auth.uid()
    and exists (
      select 1
      from public.cho_neo_member_profiles profile
      where profile.user_id = auth.uid()
        and profile.membership_status = 'verified_nail_member'
        and profile.suspended_at is null
    )
  );

create policy "Cho Neo verified members can update their room vote"
  on public.cho_neo_room_votes
  for update
  to authenticated
  using (
    voter_user_id = auth.uid()
    and exists (
      select 1
      from public.cho_neo_member_profiles profile
      where profile.user_id = auth.uid()
        and profile.membership_status = 'verified_nail_member'
        and profile.suspended_at is null
    )
  )
  with check (
    voter_user_id = auth.uid()
    and exists (
      select 1
      from public.cho_neo_member_profiles profile
      where profile.user_id = auth.uid()
        and profile.membership_status = 'verified_nail_member'
        and profile.suspended_at is null
    )
  );

revoke insert on public.cho_neo_gossip_messages from anon, authenticated;
revoke update on public.cho_neo_gossip_messages from anon, authenticated;
revoke delete on public.cho_neo_gossip_messages from anon, authenticated;
revoke truncate on public.cho_neo_gossip_messages from anon, authenticated;
revoke references on public.cho_neo_gossip_messages from anon, authenticated;
revoke trigger on public.cho_neo_gossip_messages from anon, authenticated;
