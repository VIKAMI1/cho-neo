-- B3 forward repair for the accepted v2 OpenAI usage ledger.
-- Expired reservations release their counted capacity; success reconciles actual tokens.

ALTER TABLE public.cho_neo_openai_usage_reservations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

UPDATE public.cho_neo_openai_usage_reservations
SET expires_at = created_at + interval '60 seconds'
WHERE status = 'reserved'
  AND expires_at IS NULL;

CREATE INDEX IF NOT EXISTS cho_neo_openai_usage_reservations_expiry_idx
  ON public.cho_neo_openai_usage_reservations (expires_at)
  WHERE status = 'reserved';

ALTER TABLE public.cho_neo_openai_usage_reservations
  DROP CONSTRAINT IF EXISTS cho_neo_openai_usage_reservations_status_check;

ALTER TABLE public.cho_neo_openai_usage_reservations
  ADD CONSTRAINT cho_neo_openai_usage_reservations_status_check
  CHECK (status IN ('reserved', 'succeeded', 'failed', 'released', 'expired'));

CREATE OR REPLACE FUNCTION public.reserve_cho_neo_openai_usage_v2(
  p_member_user_id uuid,
  p_monthly_request_limit integer,
  p_daily_member_request_limit integer,
  p_estimated_tokens integer DEFAULT 0,
  p_cooldown_seconds integer DEFAULT 0,
  p_monthly_token_limit integer DEFAULT 0,
  p_idempotency_key text DEFAULT NULL
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  reservation_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  month_start date := date_trunc('month', now())::date;
  day_start date := now()::date;
  safe_estimated_tokens integer := greatest(coalesce(p_estimated_tokens, 0), 0);
  safe_cooldown_seconds integer := greatest(coalesce(p_cooldown_seconds, 0), 0);
  safe_monthly_token_limit integer := greatest(coalesce(p_monthly_token_limit, 0), 0);
  reservation_ttl interval := interval '60 seconds';
  global_row public.cho_neo_openai_usage_windows%rowtype;
  member_row public.cho_neo_openai_usage_windows%rowtype;
  existing public.cho_neo_openai_usage_reservations%rowtype;
  created public.cho_neo_openai_usage_reservations%rowtype;
  stale public.cho_neo_openai_usage_reservations%rowtype;
BEGIN
  IF p_member_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'missing-member'::text, NULL::uuid;
    RETURN;
  END IF;

  IF coalesce(auth.role(), '') <> 'service_role'
     AND (auth.uid() IS NULL OR auth.uid() <> p_member_user_id) THEN
    RAISE EXCEPTION 'identity-mismatch' USING errcode = '42501';
  END IF;

  IF nullif(trim(coalesce(p_idempotency_key, '')), '') IS NULL THEN
    RETURN QUERY SELECT false, 'missing-idempotency-key'::text, NULL::uuid;
    RETURN;
  END IF;

  -- Lock stale reservations before usage windows, matching finalization's lock order.
  FOR stale IN
    SELECT reservation_row.*
    FROM public.cho_neo_openai_usage_reservations AS reservation_row
    WHERE reservation_row.status = 'reserved'
      AND reservation_row.expires_at IS NOT NULL
      AND reservation_row.expires_at <= now()
    ORDER BY reservation_row.id
    FOR UPDATE
  LOOP
    UPDATE public.cho_neo_openai_usage_windows AS usage_window
    SET request_count = greatest(usage_window.request_count - 1, 0),
        estimated_token_count = greatest(
          usage_window.estimated_token_count - stale.estimated_tokens,
          0
        ),
        updated_at = now()
    WHERE (usage_window.scope_type = 'global_month'
           AND usage_window.scope_key = 'cho-neo-openai'
           AND usage_window.window_start = stale.month_start)
       OR (usage_window.scope_type = 'member_day'
           AND usage_window.scope_key = stale.member_user_id::text
           AND usage_window.window_start = stale.day_start);

    UPDATE public.cho_neo_openai_usage_reservations
    SET status = 'expired',
        actual_tokens = 0,
        finalized_at = now()
    WHERE id = stale.id
      AND status = 'reserved';
  END LOOP;

  SELECT * INTO existing
  FROM public.cho_neo_openai_usage_reservations
  WHERE idempotency_key = p_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    RETURN QUERY SELECT true, 'idempotent'::text, existing.id;
    RETURN;
  END IF;

  INSERT INTO public.cho_neo_openai_usage_windows (scope_type, scope_key, window_start)
  VALUES
    ('global_month', 'cho-neo-openai', month_start),
    ('member_day', p_member_user_id::text, day_start)
  ON CONFLICT (scope_type, scope_key, window_start) DO NOTHING;

  SELECT * INTO global_row
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'global_month'
    AND scope_key = 'cho-neo-openai'
    AND window_start = month_start
  FOR UPDATE;

  SELECT * INTO member_row
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'member_day'
    AND scope_key = p_member_user_id::text
    AND window_start = day_start
  FOR UPDATE;

  IF p_monthly_request_limit <= 0 OR p_daily_member_request_limit <= 0 THEN
    RETURN QUERY SELECT false, 'invalid-limit'::text, NULL::uuid;
    RETURN;
  END IF;

  IF global_row.request_count >= p_monthly_request_limit THEN
    RETURN QUERY SELECT false, 'global-limit'::text, NULL::uuid;
    RETURN;
  END IF;

  IF safe_monthly_token_limit > 0
     AND global_row.estimated_token_count + safe_estimated_tokens > safe_monthly_token_limit THEN
    RETURN QUERY SELECT false, 'global-token-limit'::text, NULL::uuid;
    RETURN;
  END IF;

  IF member_row.request_count >= p_daily_member_request_limit THEN
    RETURN QUERY SELECT false, 'member-limit'::text, NULL::uuid;
    RETURN;
  END IF;

  IF safe_cooldown_seconds > 0 AND EXISTS (
    SELECT 1
    FROM public.cho_neo_openai_usage_reservations AS recent
    WHERE recent.member_user_id = p_member_user_id
      AND recent.created_at > now() - make_interval(secs => safe_cooldown_seconds)
      AND recent.status IN ('reserved', 'succeeded')
  ) THEN
    RETURN QUERY SELECT false, 'cooldown'::text, NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.cho_neo_openai_usage_windows
  SET request_count = request_count + 1,
      estimated_token_count = estimated_token_count + safe_estimated_tokens,
      updated_at = now()
  WHERE scope_type = 'global_month'
    AND scope_key = 'cho-neo-openai'
    AND window_start = month_start;

  UPDATE public.cho_neo_openai_usage_windows
  SET request_count = request_count + 1,
      estimated_token_count = estimated_token_count + safe_estimated_tokens,
      updated_at = now()
  WHERE scope_type = 'member_day'
    AND scope_key = p_member_user_id::text
    AND window_start = day_start;

  INSERT INTO public.cho_neo_openai_usage_reservations (
    idempotency_key,
    member_user_id,
    month_start,
    day_start,
    estimated_tokens,
    expires_at
  )
  VALUES (
    p_idempotency_key,
    p_member_user_id,
    month_start,
    day_start,
    safe_estimated_tokens,
    now() + reservation_ttl
  )
  RETURNING * INTO created;

  RETURN QUERY SELECT true, 'reserved'::text, created.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_cho_neo_openai_usage(
  p_reservation_id uuid,
  p_success boolean,
  p_actual_tokens integer DEFAULT 0
)
RETURNS TABLE (ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation public.cho_neo_openai_usage_reservations%rowtype;
  safe_actual_tokens integer := greatest(coalesce(p_actual_tokens, 0), 0);
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'server-only' USING errcode = '42501';
  END IF;

  SELECT * INTO reservation
  FROM public.cho_neo_openai_usage_reservations
  WHERE id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'missing-reservation'::text;
    RETURN;
  END IF;

  IF reservation.status <> 'reserved' THEN
    RETURN QUERY SELECT true, 'idempotent'::text;
    RETURN;
  END IF;

  IF p_success THEN
    UPDATE public.cho_neo_openai_usage_windows
    SET estimated_token_count = greatest(
          estimated_token_count - reservation.estimated_tokens + safe_actual_tokens,
          0
        ),
        updated_at = now()
    WHERE (scope_type = 'global_month'
           AND scope_key = 'cho-neo-openai'
           AND window_start = reservation.month_start)
       OR (scope_type = 'member_day'
           AND scope_key = reservation.member_user_id::text
           AND window_start = reservation.day_start);

    UPDATE public.cho_neo_openai_usage_reservations
    SET status = 'succeeded',
        actual_tokens = safe_actual_tokens,
        finalized_at = now()
    WHERE id = p_reservation_id
      AND status = 'reserved';
    RETURN QUERY SELECT true, 'succeeded'::text;
    RETURN;
  END IF;

  UPDATE public.cho_neo_openai_usage_windows
  SET request_count = greatest(request_count - 1, 0),
      estimated_token_count = greatest(estimated_token_count - reservation.estimated_tokens, 0),
      updated_at = now()
  WHERE (scope_type = 'global_month'
         AND scope_key = 'cho-neo-openai'
         AND window_start = reservation.month_start)
     OR (scope_type = 'member_day'
         AND scope_key = reservation.member_user_id::text
         AND window_start = reservation.day_start);

  UPDATE public.cho_neo_openai_usage_reservations
  SET status = 'failed',
      actual_tokens = safe_actual_tokens,
      finalized_at = now()
  WHERE id = p_reservation_id
    AND status = 'reserved';
  RETURN QUERY SELECT true, 'released'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_cho_neo_openai_usage_v2(
  uuid, integer, integer, integer, integer, integer, text
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_cho_neo_openai_usage_v2(
  uuid, integer, integer, integer, integer, integer, text
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_cho_neo_openai_usage_v2(
  uuid, integer, integer, integer, integer, integer, text
) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_cho_neo_openai_usage(
  uuid, boolean, integer
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_cho_neo_openai_usage(
  uuid, boolean, integer
) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_cho_neo_openai_usage(
  uuid, boolean, integer
) TO service_role;

SELECT pg_notify('pgrst', 'reload schema');
