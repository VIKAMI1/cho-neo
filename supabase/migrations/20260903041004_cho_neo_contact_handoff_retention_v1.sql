-- Remove private contact handoffs after a table is no longer eligible to hold
-- them. Message bodies and report evidence keep their existing 30-day safety
-- policy; this job only removes contact handoffs.

create index if not exists cho_neo_contact_handoffs_retention_idx
  on public.cho_neo_contact_handoffs (shared_at, introduction_id, user_id);

do $$
declare
  expected_job_name constant text := 'cho-neo-contact-handoff-retention-v1';
  expected_schedule constant text := '27 * * * *';
  expected_command constant text := $retention$
    with stale_handoffs as (
      select handoff.introduction_id, handoff.user_id
      from public.cho_neo_contact_handoffs as handoff
      join public.cho_neo_introductions as introduction
        on introduction.id = handoff.introduction_id
      where introduction.table_closed_at is not null
         or introduction.expires_at <= now()
         or introduction.member_a_decision = 'passed'
         or introduction.member_b_decision = 'passed'
         or exists (
           select 1
           from public.cho_neo_matching_blocks as block
           where (
             block.blocker_user_id = introduction.member_a_user_id
             and block.blocked_user_id = introduction.member_b_user_id
           )
           or (
             block.blocker_user_id = introduction.member_b_user_id
             and block.blocked_user_id = introduction.member_a_user_id
           )
         )
         or exists (
           select 1
           from public.cho_neo_matching_reports as report
           where report.introduction_id = introduction.id
         )
      order by handoff.shared_at, handoff.introduction_id, handoff.user_id
      limit 500
    )
    delete from public.cho_neo_contact_handoffs as handoff
    using stale_handoffs
    where handoff.introduction_id = stale_handoffs.introduction_id
      and handoff.user_id = stale_handoffs.user_id;
  $retention$;
  existing_schedule text;
  existing_command text;
  existing_active boolean;
begin
  if not exists (
    select 1
    from cron.job
    where jobname = expected_job_name
  ) then
    perform cron.schedule(
      expected_job_name,
      expected_schedule,
      expected_command
    );
  else
    select schedule, command, active
      into existing_schedule, existing_command, existing_active
    from cron.job
    where jobname = expected_job_name;

    if existing_schedule is distinct from expected_schedule
       or existing_command is distinct from expected_command
       or existing_active is distinct from true then
      raise exception 'Chợ Neo contact retention cron job % has a conflicting definition; refusing to continue', expected_job_name
        using errcode = 'P0001';
    end if;
  end if;
end
$$;
