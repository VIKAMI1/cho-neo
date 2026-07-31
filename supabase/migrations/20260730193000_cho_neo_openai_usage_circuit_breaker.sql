-- Chợ Neo OpenAI usage circuit breaker.
-- Shared monthly and per-member daily accounting for Ông Địa provider calls.

create extension if not exists pgcrypto;

create table if not exists public.cho_neo_openai_usage_windows (
  scope_type text not null,
  scope_key text not null,
  window_start date not null,
  request_count integer not null default 0,
  estimated_token_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope_type, scope_key, window_start),
  constraint cho_neo_openai_usage_windows_scope_type_check
    check (scope_type in ('global_month', 'member_day')),
  constraint cho_neo_openai_usage_windows_request_count_check
    check (request_count >= 0),
  constraint cho_neo_openai_usage_windows_estimated_token_count_check
    check (estimated_token_count >= 0)
);

alter table public.cho_neo_openai_usage_windows enable row level security;

revoke all on public.cho_neo_openai_usage_windows from anon, authenticated;

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

revoke all on function public.reserve_cho_neo_openai_usage(
  uuid,
  integer,
  integer,
  integer
) from anon, authenticated;

select pg_notify('pgrst', 'reload schema');
