-- Add the private, device-bound invitation onboarding contract.
-- The invitation token is still hashed and redeemed atomically by a server-only RPC.

alter table public.cho_neo_member_profiles
  add column if not exists agreement_version text null,
  add column if not exists agreement_accepted_at timestamptz null;

create or replace function public.redeem_cho_neo_private_invitation(
  p_code_hash text,
  p_user_id uuid,
  p_display_name text,
  p_normalized_display_name text,
  p_avatar_key text,
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
  agreement_accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_row public.cho_neo_member_invitations%rowtype;
  existing_profile public.cho_neo_member_profiles%rowtype;
  now_value timestamptz := now();
  role_value text;
begin
  if p_user_id is null then
    raise exception 'missing-user' using errcode = 'P0001';
  end if;

  if p_agreement_version is distinct from 'cho-neo-user-agreement-v1' then
    raise exception 'agreement-version-mismatch' using errcode = 'P0001';
  end if;

  select *
    into existing_profile
  from public.cho_neo_member_profiles
  where user_id = p_user_id
  for update;

  if found and existing_profile.membership_status in ('suspended', 'rejected') then
    raise exception 'member-restricted' using errcode = 'P0001';
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

  role_value := coalesce(invitation_row.intended_role, 'other_industry');

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

  insert into public.cho_neo_member_profiles as member (
    agreement_accepted_at,
    agreement_version,
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
    p_agreement_version,
    now_value,
    p_avatar_key,
    p_display_name,
    invitation_row.id,
    now_value,
    'verified_nail_member',
    role_value,
    p_normalized_display_name,
    now_value,
    p_user_id
  )
  on conflict (user_id) do update
  set agreement_accepted_at = excluded.agreement_accepted_at,
      agreement_version = excluded.agreement_version,
      approved_at = coalesce(member.approved_at, excluded.approved_at),
      avatar_key = excluded.avatar_key,
      display_name = excluded.display_name,
      invitation_id = excluded.invitation_id,
      last_seen_at = excluded.last_seen_at,
      membership_status = excluded.membership_status,
      nail_role = excluded.nail_role,
      normalized_display_name = excluded.normalized_display_name,
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
    profile.agreement_accepted_at
  from public.cho_neo_member_profiles profile
  where profile.user_id = p_user_id
    and profile.membership_status = 'verified_nail_member';
end;
$$;

revoke all on function public.redeem_cho_neo_private_invitation(
  text,
  uuid,
  text,
  text,
  text,
  text
) from public;

revoke all on function public.redeem_cho_neo_private_invitation(
  text,
  uuid,
  text,
  text,
  text,
  text
) from anon, authenticated;

grant execute on function public.redeem_cho_neo_private_invitation(
  text,
  uuid,
  text,
  text,
  text,
  text
) to service_role;

select pg_notify('pgrst', 'reload schema');
