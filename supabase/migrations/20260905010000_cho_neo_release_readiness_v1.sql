-- Chợ Neo release-readiness guards.
-- Keep public enrollment throttling and one-active-introduction enforcement
-- shared across all server instances and protected by service-role-only RPCs.

create table if not exists public.cho_neo_enrollment_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null,
  attempt_count integer not null,
  constraint cho_neo_enrollment_rate_limits_key_length check (char_length(bucket_key) between 1 and 200),
  constraint cho_neo_enrollment_rate_limits_attempt_count check (attempt_count between 0 and 6)
);

alter table public.cho_neo_enrollment_rate_limits enable row level security;
revoke all on public.cho_neo_enrollment_rate_limits from public, anon, authenticated;

create or replace function public.consume_cho_neo_enrollment_attempt(
  p_key text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bucket public.cho_neo_enrollment_rate_limits%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server-only';
  end if;

  if p_key is null or char_length(trim(p_key)) not between 1 and 200 then
    raise exception 'invalid-rate-limit-key';
  end if;

  -- The lock also covers the first request, before a bucket row exists.
  perform pg_advisory_xact_lock(hashtextextended(trim(p_key), 0));

  select *
    into current_bucket
    from public.cho_neo_enrollment_rate_limits
   where bucket_key = trim(p_key)
   for update;

  if not found then
    insert into public.cho_neo_enrollment_rate_limits (
      bucket_key,
      window_started_at,
      attempt_count
    ) values (trim(p_key), now(), 1);
    return true;
  end if;

  if current_bucket.window_started_at <= now() - interval '60 seconds' then
    update public.cho_neo_enrollment_rate_limits
       set window_started_at = now(),
           attempt_count = 1
     where bucket_key = trim(p_key);
    return true;
  end if;

  if current_bucket.attempt_count >= 6 then
    return false;
  end if;

  update public.cho_neo_enrollment_rate_limits
     set attempt_count = attempt_count + 1
   where bucket_key = trim(p_key);
  return true;
end;
$$;

revoke all on function public.consume_cho_neo_enrollment_attempt(text) from public;
revoke all on function public.consume_cho_neo_enrollment_attempt(text) from anon, authenticated;
grant execute on function public.consume_cho_neo_enrollment_attempt(text) to service_role;

create or replace function public.create_cho_neo_introduction(
  p_created_by uuid,
  p_expires_at timestamptz,
  p_icebreaker text,
  p_match_note text,
  p_member_a_user_id uuid,
  p_member_b_user_id uuid
)
returns table (
  id uuid,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'server-only';
  end if;

  if p_member_a_user_id is null
     or p_member_b_user_id is null
     or p_member_a_user_id >= p_member_b_user_id then
    raise exception 'member-order-invalid';
  end if;

  if p_expires_at <= now() or p_expires_at > now() + interval '168 hours' then
    raise exception 'introduction-expiry-invalid';
  end if;

  if char_length(coalesce(p_match_note, '')) not between 2 and 240
     or char_length(coalesce(p_icebreaker, '')) not between 2 and 240 then
    raise exception 'introduction-text-invalid';
  end if;

  -- Lock both members in canonical order so two simultaneous admin requests
  -- cannot introduce either member to two different people.
  perform pg_advisory_xact_lock(hashtextextended(p_member_a_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended(p_member_b_user_id::text, 0));

  if exists (
    select 1
      from public.cho_neo_introductions
     where table_closed_at is null
       and expires_at > now()
       and member_a_decision <> 'passed'
       and member_b_decision <> 'passed'
       and (member_a_user_id in (p_member_a_user_id, p_member_b_user_id)
         or member_b_user_id in (p_member_a_user_id, p_member_b_user_id))
  ) then
    raise exception 'member-has-active-introduction';
  end if;

  return query
  insert into public.cho_neo_introductions (
    created_by,
    expires_at,
    icebreaker,
    match_note,
    member_a_user_id,
    member_b_user_id
  ) values (
    p_created_by,
    p_expires_at,
    p_icebreaker,
    p_match_note,
    p_member_a_user_id,
    p_member_b_user_id
  )
  returning cho_neo_introductions.id, cho_neo_introductions.expires_at;
end;
$$;

revoke all on function public.create_cho_neo_introduction(uuid, timestamptz, text, text, uuid, uuid) from public;
revoke all on function public.create_cho_neo_introduction(uuid, timestamptz, text, text, uuid, uuid) from anon, authenticated;
grant execute on function public.create_cho_neo_introduction(uuid, timestamptz, text, text, uuid, uuid) to service_role;

-- Keep rate-limit buckets bounded without requiring application memory.
create extension if not exists pg_cron with schema pg_catalog;

do $$
declare
  existing_job record;
  expected_command text := 'delete from public.cho_neo_enrollment_rate_limits where window_started_at < now() - interval ''1 day'';';
begin
  select jobid, schedule, command, active
    into existing_job
    from cron.job
   where jobname = 'cho-neo-enrollment-rate-retention-v1';

  if existing_job.jobid is null then
    perform cron.schedule(
      'cho-neo-enrollment-rate-retention-v1',
      '37 * * * *',
      expected_command
    );
  elsif existing_job.schedule <> '37 * * * *'
     or existing_job.command <> expected_command
     or existing_job.active is distinct from true then
    raise exception 'cho-neo-enrollment-rate-retention-v1 job conflicts with the expected definition';
  end if;
end;
$$;
