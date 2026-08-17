-- Restore the audited Production Owner Pulse definition to source control.
-- This RPC is intentionally server-only; no browser or authenticated caller is
-- part of the P0.3 boundary.

create or replace function public.cho_neo_owner_pulse()
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  member_stats jsonb;
  invitation_stats jsonb;
  content_stats jsonb;
  feedback_stats jsonb;
  top_rooms jsonb;
begin
  select jsonb_build_object(
    'verified_members', count(*) filter (where membership_status = 'verified_nail_member'),
    'seen_24h', count(*) filter (
      where membership_status = 'verified_nail_member'
        and last_seen_at >= now() - interval '24 hours'
    ),
    'seen_7d', count(*) filter (
      where membership_status = 'verified_nail_member'
        and last_seen_at >= now() - interval '7 days'
    ),
    'new_7d', count(*) filter (
      where membership_status = 'verified_nail_member'
        and created_at >= now() - interval '7 days'
    ),
    'returned_7d', count(*) filter (
      where membership_status = 'verified_nail_member'
        and last_seen_at >= now() - interval '7 days'
        and last_seen_at > created_at + interval '1 hour'
    )
  )
  into member_stats
  from public.cho_neo_member_profiles;

  select jsonb_build_object(
    'total_links', count(*),
    'active_links', count(*) filter (
      where status = 'issued'
        and revoked_at is null
        and coalesce(use_count, 0) < coalesce(max_uses, 1)
        and expires_at > now()
    ),
    'uses', coalesce(sum(use_count), 0),
    'revoked', count(*) filter (where status = 'revoked' or revoked_at is not null),
    'expired_links', count(*) filter (
      where status = 'issued'
        and revoked_at is null
        and expires_at <= now()
    )
  )
  into invitation_stats
  from public.cho_neo_member_invitations;

  select jsonb_build_object(
    'chat_24h', (select count(*) from public.cho_neo_gossip_messages where created_at >= now() - interval '24 hours' and hidden_at is null and removed_at is null),
    'chat_7d', (select count(*) from public.cho_neo_gossip_messages where created_at >= now() - interval '7 days' and hidden_at is null and removed_at is null),
    'questions_24h', (select count(*) from public.cho_neo_questions where created_at >= now() - interval '24 hours'),
    'questions_7d', (select count(*) from public.cho_neo_questions where created_at >= now() - interval '7 days'),
    'answers_24h', (select count(*) from public.cho_neo_answers where created_at >= now() - interval '24 hours'),
    'answers_7d', (select count(*) from public.cho_neo_answers where created_at >= now() - interval '7 days')
  )
  into content_stats;

  select jsonb_build_object(
    'events_24h', count(*) filter (where kind = 'event' and created_at >= now() - interval '24 hours'),
    'events_7d', count(*) filter (where kind = 'event' and created_at >= now() - interval '7 days'),
    'sessions_24h', count(distinct anonymous_session_id) filter (
      where kind = 'event'
        and created_at >= now() - interval '24 hours'
        and nullif(anonymous_session_id, '') is not null
    ),
    'sessions_7d', count(distinct anonymous_session_id) filter (
      where kind = 'event'
        and created_at >= now() - interval '7 days'
        and nullif(anonymous_session_id, '') is not null
    ),
    'tracking_since', min(created_at)
  )
  into feedback_stats
  from public.cho_neo_feedback;

  select coalesce(
    jsonb_agg(jsonb_build_object('room', ranked.room, 'enters', ranked.enters) order by ranked.enters desc),
    '[]'::jsonb
  )
  into top_rooms
  from (
    select room, count(*)::bigint as enters
    from public.cho_neo_feedback
    where kind = 'event'
      and event_name = 'room_entered'
      and created_at >= now() - interval '7 days'
      and nullif(room, '') is not null
    group by room
    order by count(*) desc
    limit 8
  ) ranked;

  return jsonb_build_object(
    'generated_at', now(),
    'members', member_stats,
    'invitations', invitation_stats,
    'content', content_stats,
    'traffic', feedback_stats,
    'top_rooms', top_rooms
  );
end;
$function$;

revoke execute on function public.cho_neo_owner_pulse() from public;
revoke execute on function public.cho_neo_owner_pulse() from anon, authenticated;
grant execute on function public.cho_neo_owner_pulse() to service_role;
