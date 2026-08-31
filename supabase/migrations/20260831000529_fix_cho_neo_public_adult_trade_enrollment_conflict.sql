-- Qualify the upsert conflict target because the table-returning function's
-- output column named user_id is also a PL/pgSQL variable.

create or replace function public.enroll_cho_neo_public_adult_trade_member(
  p_user_id uuid,
  p_display_name text,
  p_normalized_display_name text,
  p_avatar_key text,
  p_nail_role text,
  p_adult_attested boolean,
  p_agreement_version text
)
returns table (
  user_id uuid,
  display_name text,
  normalized_display_name text,
  avatar_key text,
  nail_role text,
  membership_status text,
  agreement_version text,
  agreement_accepted_at timestamptz,
  adult_attested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_profile public.cho_neo_member_profiles%rowtype;
  now_value timestamptz := now();
begin
  if p_user_id is null then
    raise exception 'missing-user' using errcode = 'P0001';
  end if;

  if p_adult_attested is distinct from true then
    raise exception 'adult-attestation-required' using errcode = 'P0001';
  end if;

  if p_agreement_version is distinct from 'cho-neo-community-agreement-v2' then
    raise exception 'agreement-version-mismatch' using errcode = 'P0001';
  end if;

  if p_nail_role is null or p_nail_role not in (
    'nail_technician',
    'salon_owner',
    'nail_student',
    'supplier',
    'educator'
  ) then
    raise exception 'trade-role-required' using errcode = 'P0001';
  end if;

  select *
    into existing_profile
  from public.cho_neo_member_profiles as member_profile
  where member_profile.user_id = p_user_id
  for update;

  if found and existing_profile.membership_status in ('suspended', 'rejected') then
    raise exception 'member-restricted' using errcode = 'P0001';
  end if;

  insert into public.cho_neo_member_profiles as member (
    adult_attested_at,
    agreement_accepted_at,
    agreement_version,
    approved_at,
    avatar_key,
    display_name,
    last_seen_at,
    membership_status,
    nail_role,
    normalized_display_name,
    onboarding_source,
    updated_at,
    user_id
  )
  values (
    now_value,
    now_value,
    p_agreement_version,
    now_value,
    p_avatar_key,
    p_display_name,
    now_value,
    'verified_nail_member',
    p_nail_role,
    p_normalized_display_name,
    'public_adult_trade_v1',
    now_value,
    p_user_id
  )
  on conflict on constraint cho_neo_member_profiles_pkey do update
  set adult_attested_at = coalesce(member.adult_attested_at, excluded.adult_attested_at),
      agreement_accepted_at = excluded.agreement_accepted_at,
      agreement_version = excluded.agreement_version,
      approved_at = coalesce(member.approved_at, excluded.approved_at),
      avatar_key = excluded.avatar_key,
      display_name = excluded.display_name,
      last_seen_at = excluded.last_seen_at,
      membership_status = 'verified_nail_member',
      nail_role = excluded.nail_role,
      normalized_display_name = excluded.normalized_display_name,
      onboarding_source = coalesce(member.onboarding_source, excluded.onboarding_source),
      updated_at = excluded.updated_at
  where member.membership_status not in ('suspended', 'rejected');

  return query
  select
    profile.user_id,
    profile.display_name,
    profile.normalized_display_name,
    profile.avatar_key,
    profile.nail_role,
    profile.membership_status,
    profile.agreement_version,
    profile.agreement_accepted_at,
    profile.adult_attested_at
  from public.cho_neo_member_profiles profile
  where profile.user_id = p_user_id
    and profile.membership_status = 'verified_nail_member';
end;
$$;

revoke all on function public.enroll_cho_neo_public_adult_trade_member(
  uuid,
  text,
  text,
  text,
  text,
  boolean,
  text
) from public, anon, authenticated;

grant execute on function public.enroll_cho_neo_public_adult_trade_member(
  uuid,
  text,
  text,
  text,
  text,
  boolean,
  text
) to service_role;

select pg_notify('pgrst', 'reload schema');

