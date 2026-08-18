-- Chợ Neo Lộc economic authority V1.
-- Shopify is intentionally not connected here. This migration only records
-- server-authorized economic entitlements and their one-use redemption state.

create extension if not exists pgcrypto;

create table if not exists public.cho_neo_loc_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  campaign_key text not null default 'vikami-green-pilot-v1',
  source text not null default 'xin-xam',
  reward_percent integer not null default 10,
  scope_key text not null default 'vikami-pilot-selected-products',
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz null,
  redemption_reference text null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now(),
  constraint cho_neo_loc_entitlements_campaign_check
    check (campaign_key = 'vikami-green-pilot-v1'),
  constraint cho_neo_loc_entitlements_source_check
    check (source = 'xin-xam'),
  constraint cho_neo_loc_entitlements_reward_check
    check (reward_percent = 10),
  constraint cho_neo_loc_entitlements_scope_check
    check (scope_key = 'vikami-pilot-selected-products'),
  constraint cho_neo_loc_entitlements_expiry_check
    check (expires_at = issued_at + interval '48 hours'),
  constraint cho_neo_loc_entitlements_redemption_reference_check
    check (redemption_reference is null or btrim(redemption_reference) <> '')
);

create unique index if not exists cho_neo_loc_entitlements_user_campaign_key
  on public.cho_neo_loc_entitlements (user_id, campaign_key);

create unique index if not exists cho_neo_loc_entitlements_redemption_reference_key
  on public.cho_neo_loc_entitlements (redemption_reference)
  where redemption_reference is not null;

alter table public.cho_neo_loc_entitlements enable row level security;

revoke all on table public.cho_neo_loc_entitlements from public;
revoke all on table public.cho_neo_loc_entitlements from anon;
revoke all on table public.cho_neo_loc_entitlements from authenticated;
grant select, insert, update on table public.cho_neo_loc_entitlements to service_role;

create or replace function public.issue_cho_neo_loc_v1(p_user_id uuid)
returns table (
  id uuid,
  user_id uuid,
  campaign_key text,
  source text,
  reward_percent integer,
  scope_key text,
  issued_at timestamptz,
  expires_at timestamptz,
  redeemed_at timestamptz,
  redemption_reference text,
  revoked_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  issued_at_value timestamptz := statement_timestamp();
begin
  if p_user_id is null then
    raise exception 'missing-user' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.cho_neo_member_profiles profile
    where profile.user_id = p_user_id
      and profile.membership_status = 'verified_nail_member'
  ) then
    raise exception 'ineligible-member' using errcode = 'P0001';
  end if;

  insert into public.cho_neo_loc_entitlements (
    user_id,
    campaign_key,
    source,
    reward_percent,
    scope_key,
    issued_at,
    expires_at
  )
  values (
    p_user_id,
    'vikami-green-pilot-v1',
    'xin-xam',
    10,
    'vikami-pilot-selected-products',
    issued_at_value,
    issued_at_value + interval '48 hours'
  )
  on conflict (user_id, campaign_key) do nothing;

  return query
  select
    entitlement.id,
    entitlement.user_id,
    entitlement.campaign_key,
    entitlement.source,
    entitlement.reward_percent,
    entitlement.scope_key,
    entitlement.issued_at,
    entitlement.expires_at,
    entitlement.redeemed_at,
    entitlement.redemption_reference,
    entitlement.revoked_at
  from public.cho_neo_loc_entitlements entitlement
  where entitlement.user_id = p_user_id
    and entitlement.campaign_key = 'vikami-green-pilot-v1';
end;
$$;

create or replace function public.redeem_cho_neo_loc_v1(
  p_entitlement_id uuid,
  p_redemption_reference text
)
returns table (
  id uuid,
  user_id uuid,
  campaign_key text,
  source text,
  reward_percent integer,
  scope_key text,
  issued_at timestamptz,
  expires_at timestamptz,
  redeemed_at timestamptz,
  redemption_reference text,
  revoked_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  entitlement_row public.cho_neo_loc_entitlements%rowtype;
  redemption_reference_value text := btrim(p_redemption_reference);
  redeemed_at_value timestamptz := statement_timestamp();
begin
  if p_entitlement_id is null then
    raise exception 'missing-entitlement' using errcode = 'P0001';
  end if;

  if redemption_reference_value is null or redemption_reference_value = '' then
    raise exception 'missing-redemption-reference' using errcode = 'P0001';
  end if;

  select *
    into entitlement_row
  from public.cho_neo_loc_entitlements entitlement
  where entitlement.id = p_entitlement_id
  for update;

  if not found then
    raise exception 'entitlement-not-found' using errcode = 'P0001';
  end if;

  if entitlement_row.revoked_at is not null then
    raise exception 'entitlement-revoked' using errcode = 'P0001';
  end if;

  if entitlement_row.redeemed_at is not null then
    raise exception 'entitlement-already-redeemed' using errcode = 'P0001';
  end if;

  if entitlement_row.expires_at <= redeemed_at_value then
    raise exception 'entitlement-expired' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.cho_neo_loc_entitlements existing
    where existing.redemption_reference = redemption_reference_value
  ) then
    raise exception 'redemption-reference-used' using errcode = 'P0001';
  end if;

  update public.cho_neo_loc_entitlements entitlement
  set redeemed_at = redeemed_at_value,
      redemption_reference = redemption_reference_value
  where entitlement.id = entitlement_row.id
    and entitlement.redeemed_at is null
    and entitlement.revoked_at is null
    and entitlement.expires_at > redeemed_at_value;

  return query
  select
    entitlement.id,
    entitlement.user_id,
    entitlement.campaign_key,
    entitlement.source,
    entitlement.reward_percent,
    entitlement.scope_key,
    entitlement.issued_at,
    entitlement.expires_at,
    entitlement.redeemed_at,
    entitlement.redemption_reference,
    entitlement.revoked_at
  from public.cho_neo_loc_entitlements entitlement
  where entitlement.id = entitlement_row.id;
end;
$$;

revoke execute on function public.issue_cho_neo_loc_v1(uuid) from public;
revoke execute on function public.issue_cho_neo_loc_v1(uuid) from anon;
revoke execute on function public.issue_cho_neo_loc_v1(uuid) from authenticated;
grant execute on function public.issue_cho_neo_loc_v1(uuid) to service_role;

revoke execute on function public.redeem_cho_neo_loc_v1(uuid, text) from public;
revoke execute on function public.redeem_cho_neo_loc_v1(uuid, text) from anon;
revoke execute on function public.redeem_cho_neo_loc_v1(uuid, text) from authenticated;
grant execute on function public.redeem_cho_neo_loc_v1(uuid, text) to service_role;

select pg_notify('pgrst', 'reload schema');
