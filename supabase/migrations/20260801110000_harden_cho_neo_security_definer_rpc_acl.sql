-- Harden Chợ Neo SECURITY DEFINER RPCs.
-- The application invokes these functions with the Supabase service role.
-- Keep a defensive auth.uid() check for any non-service execution in case
-- database privileges are changed independently of this migration.

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

  if coalesce(auth.role(), '') <> 'service_role'
     and (auth.uid() is null or auth.uid() <> p_user_id) then
    raise exception 'identity-mismatch' using errcode = '42501';
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

  execute $sql$
    insert into public.cho_neo_member_profiles as member (
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
    values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    on conflict (user_id) do update
    set approved_at = coalesce(member.approved_at, excluded.approved_at),
        avatar_key = excluded.avatar_key,
        display_name = excluded.display_name,
        invitation_id = excluded.invitation_id,
        last_seen_at = excluded.last_seen_at,
        membership_status = excluded.membership_status,
        nail_role = excluded.nail_role,
        normalized_display_name = excluded.normalized_display_name,
        updated_at = excluded.updated_at
    where member.membership_status not in ('suspended', 'rejected')
  $sql$
  using
    now_value,
    p_avatar_key,
    p_display_name,
    invitation_row.id,
    now_value,
    'verified_nail_member',
    p_nail_role,
    p_normalized_display_name,
    now_value,
    p_user_id;

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

create or replace function public.reserve_cho_neo_openai_usage(
  p_member_user_id uuid,
  p_monthly_request_limit integer,
  p_daily_member_request_limit integer,
  p_estimated_tokens integer default 0
)
returns table (
  allowed boolean,
  reason text,
  global_requests integer,
  member_requests integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', now())::date;
  day_start date := now()::date;
  global_row public.cho_neo_openai_usage_windows%rowtype;
  member_row public.cho_neo_openai_usage_windows%rowtype;
  safe_estimated_tokens integer := greatest(coalesce(p_estimated_tokens, 0), 0);
begin
  if p_member_user_id is null then
    return query select false, 'missing-member'::text, 0, 0;
    return;
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and (auth.uid() is null or auth.uid() <> p_member_user_id) then
    raise exception 'identity-mismatch' using errcode = '42501';
  end if;

  if coalesce(p_monthly_request_limit, 0) <= 0
     or coalesce(p_daily_member_request_limit, 0) <= 0 then
    return query select false, 'invalid-limit'::text, 0, 0;
    return;
  end if;

  insert into public.cho_neo_openai_usage_windows (
    scope_type,
    scope_key,
    window_start
  )
  values
    ('global_month', 'cho-neo-openai', month_start),
    ('member_day', p_member_user_id::text, day_start)
  on conflict (scope_type, scope_key, window_start) do nothing;

  select *
    into global_row
  from public.cho_neo_openai_usage_windows
  where scope_type = 'global_month'
    and scope_key = 'cho-neo-openai'
    and window_start = month_start
  for update;

  select *
    into member_row
  from public.cho_neo_openai_usage_windows
  where scope_type = 'member_day'
    and scope_key = p_member_user_id::text
    and window_start = day_start
  for update;

  if global_row.request_count >= p_monthly_request_limit then
    return query select false, 'global-limit'::text, global_row.request_count, member_row.request_count;
    return;
  end if;

  if member_row.request_count >= p_daily_member_request_limit then
    return query select false, 'member-limit'::text, global_row.request_count, member_row.request_count;
    return;
  end if;

  update public.cho_neo_openai_usage_windows
  set request_count = request_count + 1,
      estimated_token_count = estimated_token_count + safe_estimated_tokens,
      updated_at = now()
  where scope_type = 'global_month'
    and scope_key = 'cho-neo-openai'
    and window_start = month_start
  returning * into global_row;

  update public.cho_neo_openai_usage_windows
  set request_count = request_count + 1,
      estimated_token_count = estimated_token_count + safe_estimated_tokens,
      updated_at = now()
  where scope_type = 'member_day'
    and scope_key = p_member_user_id::text
    and window_start = day_start
  returning * into member_row;

  return query select true, 'reserved'::text, global_row.request_count, member_row.request_count;
end;
$$;

create or replace function public.reserve_cho_neo_openai_usage_v2(
  p_member_user_id uuid,
  p_monthly_request_limit integer,
  p_daily_member_request_limit integer,
  p_estimated_tokens integer default 0,
  p_cooldown_seconds integer default 0,
  p_monthly_token_limit integer default 0,
  p_idempotency_key text default null
)
returns table (
  allowed boolean,
  reason text,
  reservation_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  month_start date := date_trunc('month', now())::date;
  day_start date := now()::date;
  safe_estimated_tokens integer := greatest(coalesce(p_estimated_tokens, 0), 0);
  safe_cooldown_seconds integer := greatest(coalesce(p_cooldown_seconds, 0), 0);
  safe_monthly_token_limit integer := greatest(coalesce(p_monthly_token_limit, 0), 0);
  global_row public.cho_neo_openai_usage_windows%rowtype;
  member_row public.cho_neo_openai_usage_windows%rowtype;
  existing public.cho_neo_openai_usage_reservations%rowtype;
  created public.cho_neo_openai_usage_reservations%rowtype;
begin
  if p_member_user_id is null then
    return query select false, 'missing-member'::text, null::uuid;
    return;
  end if;

  if coalesce(auth.role(), '') <> 'service_role'
     and (auth.uid() is null or auth.uid() <> p_member_user_id) then
    raise exception 'identity-mismatch' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_idempotency_key, '')), '') is null then
    return query select false, 'missing-idempotency-key'::text, null::uuid;
    return;
  end if;

  select * into existing
  from public.cho_neo_openai_usage_reservations
  where idempotency_key = p_idempotency_key
  for update;

  if found then
    return query select true, 'idempotent'::text, existing.id;
    return;
  end if;

  insert into public.cho_neo_openai_usage_windows (scope_type, scope_key, window_start)
  values
    ('global_month', 'cho-neo-openai', month_start),
    ('member_day', p_member_user_id::text, day_start)
  on conflict (scope_type, scope_key, window_start) do nothing;

  select * into global_row
  from public.cho_neo_openai_usage_windows
  where scope_type = 'global_month'
    and scope_key = 'cho-neo-openai'
    and window_start = month_start
  for update;

  select * into member_row
  from public.cho_neo_openai_usage_windows
  where scope_type = 'member_day'
    and scope_key = p_member_user_id::text
    and window_start = day_start
  for update;

  if p_monthly_request_limit <= 0 or p_daily_member_request_limit <= 0 then
    return query select false, 'invalid-limit'::text, null::uuid;
    return;
  end if;

  if global_row.request_count >= p_monthly_request_limit then
    return query select false, 'global-limit'::text, null::uuid;
    return;
  end if;

  if safe_monthly_token_limit > 0
     and global_row.estimated_token_count + safe_estimated_tokens > safe_monthly_token_limit then
    return query select false, 'global-token-limit'::text, null::uuid;
    return;
  end if;

  if member_row.request_count >= p_daily_member_request_limit then
    return query select false, 'member-limit'::text, null::uuid;
    return;
  end if;

  if safe_cooldown_seconds > 0 and exists (
    select 1
    from public.cho_neo_openai_usage_reservations recent
    where recent.member_user_id = p_member_user_id
      and recent.created_at > now() - make_interval(secs => safe_cooldown_seconds)
      and recent.status in ('reserved', 'succeeded')
  ) then
    return query select false, 'cooldown'::text, null::uuid;
    return;
  end if;

  update public.cho_neo_openai_usage_windows
  set request_count = request_count + 1,
      estimated_token_count = estimated_token_count + safe_estimated_tokens,
      updated_at = now()
  where scope_type = 'global_month'
    and scope_key = 'cho-neo-openai'
    and window_start = month_start;

  update public.cho_neo_openai_usage_windows
  set request_count = request_count + 1,
      estimated_token_count = estimated_token_count + safe_estimated_tokens,
      updated_at = now()
  where scope_type = 'member_day'
    and scope_key = p_member_user_id::text
    and window_start = day_start;

  insert into public.cho_neo_openai_usage_reservations (
    idempotency_key, member_user_id, month_start, day_start, estimated_tokens
  )
  values (
    p_idempotency_key, p_member_user_id, month_start, day_start, safe_estimated_tokens
  )
  returning * into created;

  return query select true, 'reserved'::text, created.id;
end;
$$;

create or replace function public.finalize_cho_neo_openai_usage(
  p_reservation_id uuid,
  p_success boolean,
  p_actual_tokens integer default 0
)
returns table (ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation public.cho_neo_openai_usage_reservations%rowtype;
  safe_actual_tokens integer := greatest(coalesce(p_actual_tokens, 0), 0);
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server-only' using errcode = '42501';
  end if;

  select * into reservation
  from public.cho_neo_openai_usage_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return query select false, 'missing-reservation'::text;
    return;
  end if;

  if reservation.status <> 'reserved' then
    return query select true, 'idempotent'::text;
    return;
  end if;

  if p_success then
    update public.cho_neo_openai_usage_reservations
    set status = 'succeeded', actual_tokens = safe_actual_tokens, finalized_at = now()
    where id = p_reservation_id;
    return query select true, 'succeeded'::text;
    return;
  end if;

  update public.cho_neo_openai_usage_windows
  set request_count = greatest(request_count - 1, 0),
      estimated_token_count = greatest(estimated_token_count - reservation.estimated_tokens, 0),
      updated_at = now()
  where (scope_type = 'global_month' and scope_key = 'cho-neo-openai' and window_start = reservation.month_start)
     or (scope_type = 'member_day' and scope_key = reservation.member_user_id::text and window_start = reservation.day_start);

  update public.cho_neo_openai_usage_reservations
  set status = 'failed', actual_tokens = safe_actual_tokens, finalized_at = now()
  where id = p_reservation_id;
  return query select true, 'released'::text;
end;
$$;

revoke all on function public.redeem_cho_neo_member_invitation(
  text, uuid, text, text, text, text
) from public;
revoke all on function public.redeem_cho_neo_member_invitation(
  text, uuid, text, text, text, text
) from anon, authenticated;
grant execute on function public.redeem_cho_neo_member_invitation(
  text, uuid, text, text, text, text
) to service_role;

revoke all on function public.reserve_cho_neo_openai_usage(
  uuid, integer, integer, integer
) from public;
revoke all on function public.reserve_cho_neo_openai_usage(
  uuid, integer, integer, integer
) from anon, authenticated;
grant execute on function public.reserve_cho_neo_openai_usage(
  uuid, integer, integer, integer
) to service_role;

revoke all on function public.reserve_cho_neo_openai_usage_v2(
  uuid, integer, integer, integer, integer, integer, text
) from public;
revoke all on function public.reserve_cho_neo_openai_usage_v2(
  uuid, integer, integer, integer, integer, integer, text
) from anon, authenticated;
grant execute on function public.reserve_cho_neo_openai_usage_v2(
  uuid, integer, integer, integer, integer, integer, text
) to service_role;

revoke all on function public.finalize_cho_neo_openai_usage(
  uuid, boolean, integer
) from public;
revoke all on function public.finalize_cho_neo_openai_usage(
  uuid, boolean, integer
) from anon, authenticated;
grant execute on function public.finalize_cho_neo_openai_usage(
  uuid, boolean, integer
) to service_role;

select pg_notify('pgrst', 'reload schema');
