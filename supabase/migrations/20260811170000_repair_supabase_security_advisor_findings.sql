-- Repair current Supabase Security Advisor findings without changing app data.
-- Xin Xam now uses local seed data in the app, so legacy public table access
-- should be closed by default while preserving the tables and their rows.

alter table if exists public.xinxam_sticks enable row level security;
alter table if exists public.xinxam_draws enable row level security;

revoke all on table public.xinxam_sticks from PUBLIC;
revoke all on table public.xinxam_sticks from anon;
revoke all on table public.xinxam_sticks from authenticated;
grant all on table public.xinxam_sticks to service_role;

revoke all on table public.xinxam_draws from PUBLIC;
revoke all on table public.xinxam_draws from anon;
revoke all on table public.xinxam_draws from authenticated;
grant all on table public.xinxam_draws to service_role;

-- The current app no longer calls the legacy draw_xinxam RPC. Keep it in place
-- for audit/history, but remove browser-callable EXECUTE grants.
do $$
declare
  function_signature regprocedure;
begin
  for function_signature in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'draw_xinxam'
  loop
    execute format('revoke all on function %s from PUBLIC', function_signature);
    execute format('revoke all on function %s from anon', function_signature);
    execute format('revoke all on function %s from authenticated', function_signature);
    execute format('grant execute on function %s to service_role', function_signature);
  end loop;
end $$;

-- Preserve the existing showoff_feed API contract while making the view run as
-- the querying role, so showoff_posts/media/reactions RLS remains authoritative.
alter view if exists public.showoff_feed set (security_invoker = true);

revoke all on table public.showoff_feed from PUBLIC;
revoke all on table public.showoff_feed from anon;
revoke all on table public.showoff_feed from authenticated;

grant select on table public.showoff_feed to anon;
grant select on table public.showoff_feed to authenticated;
