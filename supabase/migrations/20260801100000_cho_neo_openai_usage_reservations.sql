-- Extend the accepted Chợ Neo usage windows with shared reservations.
-- This is the same ledger as 20260730193000; it adds cooldown,
-- idempotency, finalization, and safe release for short-lived provider calls.

create table if not exists public.cho_neo_openai_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  member_user_id uuid not null references auth.users(id) on delete cascade,
  month_start date not null,
  day_start date not null,
  estimated_tokens integer not null default 0,
  actual_tokens integer null,
  status text not null default 'reserved',
  created_at timestamptz not null default now(),
  finalized_at timestamptz null,
  constraint cho_neo_openai_usage_reservations_status_check
    check (status in ('reserved', 'succeeded', 'failed', 'released')),
  constraint cho_neo_openai_usage_reservations_estimated_tokens_check
    check (estimated_tokens >= 0),
  constraint cho_neo_openai_usage_reservations_actual_tokens_check
    check (actual_tokens is null or actual_tokens >= 0)
);

create index if not exists cho_neo_openai_usage_reservations_member_created_idx
  on public.cho_neo_openai_usage_reservations (member_user_id, created_at desc);

alter table public.cho_neo_openai_usage_reservations enable row level security;
revoke all on public.cho_neo_openai_usage_reservations from anon, authenticated;

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

revoke all on function public.reserve_cho_neo_openai_usage_v2(uuid, integer, integer, integer, integer, integer, text)
  from anon, authenticated;
revoke all on function public.finalize_cho_neo_openai_usage(uuid, boolean, integer)
  from anon, authenticated;

select pg_notify('pgrst', 'reload schema');
