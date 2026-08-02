BEGIN;

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
  missing_name text;
BEGIN
  FOREACH missing_name IN ARRAY ARRAY[
    'table auth.users',
    'table public.cho_neo_openai_usage_windows',
    'table public.cho_neo_openai_usage_reservations',
    'function auth.role()',
    'function auth.uid()',
    'function gen_random_uuid()'
  ] LOOP
    IF (missing_name LIKE 'table %' AND to_regclass(substr(missing_name, 7)) IS NULL)
       OR (missing_name LIKE 'function %' AND to_regprocedure(substr(missing_name, 10)) IS NULL) THEN
      missing := array_append(missing, missing_name);
    END IF;
  END LOOP;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION
      'B3 prerequisite check failed; no migration or test data was applied: %',
      array_to_string(missing, ', ');
  END IF;
END;
$$;

ALTER TABLE public.cho_neo_openai_usage_reservations
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

UPDATE public.cho_neo_openai_usage_reservations
SET expires_at = created_at + interval '60 seconds'
WHERE status = 'reserved' AND expires_at IS NULL;

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
RETURNS TABLE (allowed boolean, reason text, reservation_id uuid)
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
        estimated_token_count = greatest(usage_window.estimated_token_count - stale.estimated_tokens, 0),
        updated_at = now()
    WHERE (usage_window.scope_type = 'global_month'
           AND usage_window.scope_key = 'cho-neo-openai'
           AND usage_window.window_start = stale.month_start)
       OR (usage_window.scope_type = 'member_day'
           AND usage_window.scope_key = stale.member_user_id::text
           AND usage_window.window_start = stale.day_start);

    UPDATE public.cho_neo_openai_usage_reservations
    SET status = 'expired', actual_tokens = 0, finalized_at = now()
    WHERE id = stale.id AND status = 'reserved';
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
    idempotency_key, member_user_id, month_start, day_start, estimated_tokens, expires_at
  )
  VALUES (
    p_idempotency_key, p_member_user_id, month_start, day_start,
    safe_estimated_tokens, now() + interval '60 seconds'
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
          estimated_token_count - reservation.estimated_tokens + safe_actual_tokens, 0
        ),
        updated_at = now()
    WHERE (scope_type = 'global_month'
           AND scope_key = 'cho-neo-openai'
           AND window_start = reservation.month_start)
       OR (scope_type = 'member_day'
           AND scope_key = reservation.member_user_id::text
           AND window_start = reservation.day_start);
    UPDATE public.cho_neo_openai_usage_reservations
    SET status = 'succeeded', actual_tokens = safe_actual_tokens, finalized_at = now()
    WHERE id = p_reservation_id AND status = 'reserved';
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
  SET status = 'failed', actual_tokens = safe_actual_tokens, finalized_at = now()
  WHERE id = p_reservation_id AND status = 'reserved';
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
REVOKE ALL ON FUNCTION public.finalize_cho_neo_openai_usage(uuid, boolean, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_cho_neo_openai_usage(uuid, boolean, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_cho_neo_openai_usage(uuid, boolean, integer) TO service_role;

CREATE TEMP TABLE b3_test_ids (
  member_user_id uuid PRIMARY KEY,
  other_user_id uuid NOT NULL
) ON COMMIT DROP;
INSERT INTO b3_test_ids VALUES (gen_random_uuid(), gen_random_uuid());

CREATE TEMP TABLE b3_call_results (
  role_name text NOT NULL,
  function_name text NOT NULL,
  sqlstate text NOT NULL,
  message text NOT NULL
) ON COMMIT DROP;

-- Role-switched proof calls must reach the RPC ACL before touching the capture tables.
GRANT SELECT ON b3_test_ids TO service_role;
GRANT SELECT, INSERT ON b3_call_results TO service_role;
GRANT INSERT ON b3_call_results TO anon, authenticated;

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data
)
SELECT ids.user_id, 'authenticated', 'authenticated', ids.user_id::text || '@b3.invalid', '',
       now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb
FROM (
  SELECT member_user_id AS user_id FROM b3_test_ids
  UNION ALL
  SELECT other_user_id AS user_id FROM b3_test_ids
) AS ids
ON CONFLICT (id) DO NOTHING;

CREATE TEMP TABLE b3_function_signatures (
  function_name text PRIMARY KEY,
  function_signature text NOT NULL
) ON COMMIT DROP;
INSERT INTO b3_function_signatures VALUES
  ('reserve_cho_neo_openai_usage_v2', 'public.reserve_cho_neo_openai_usage_v2(uuid,integer,integer,integer,integer,integer,text)'),
  ('finalize_cho_neo_openai_usage', 'public.finalize_cho_neo_openai_usage(uuid,boolean,integer)');

CREATE TEMP TABLE b3_privilege_matrix (
  function_name text PRIMARY KEY,
  public_execute boolean NOT NULL,
  anon_execute boolean NOT NULL,
  authenticated_execute boolean NOT NULL,
  service_role_execute boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO b3_privilege_matrix
SELECT signatures.function_name,
  EXISTS (
    SELECT 1
    FROM pg_proc AS procedure_row
    CROSS JOIN LATERAL aclexplode(
      coalesce(procedure_row.proacl, acldefault('f', procedure_row.proowner))
    ) AS privilege
    WHERE procedure_row.oid = signatures.function_signature::regprocedure
      AND privilege.grantee = 0
      AND privilege.privilege_type = 'EXECUTE'
  ),
  has_function_privilege('anon', signatures.function_signature, 'EXECUTE'),
  has_function_privilege('authenticated', signatures.function_signature, 'EXECUTE'),
  has_function_privilege('service_role', signatures.function_signature, 'EXECUTE')
FROM b3_function_signatures AS signatures;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM b3_privilege_matrix
    WHERE public_execute OR anon_execute OR authenticated_execute OR NOT service_role_execute
  ) THEN
    RAISE EXCEPTION 'B3 privilege assertion failed: only service_role may execute v2 RPCs';
  END IF;
END;
$$;

SELECT routine_schema, routine_name, privilege_type, grantee
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name IN ('reserve_cho_neo_openai_usage_v2', 'finalize_cho_neo_openai_usage')
ORDER BY routine_name, grantee, privilege_type;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.reserve_cho_neo_openai_usage_v2(gen_random_uuid(), 10, 10, 10, 0, 1000, 'b3-anon');
    RAISE EXCEPTION 'B3 assertion failed: anon reservation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE 'permission denied for function reserve_cho_neo_openai_usage_v2%' THEN
      RAISE EXCEPTION 'B3 anon reservation expected permission denied for function, got % %', SQLSTATE, SQLERRM;
    END IF;
    INSERT INTO pg_temp.b3_call_results VALUES ('anon', 'reserve_cho_neo_openai_usage_v2', SQLSTATE, SQLERRM);
  END;
  BEGIN
    PERFORM public.finalize_cho_neo_openai_usage(gen_random_uuid(), false, 0);
    RAISE EXCEPTION 'B3 assertion failed: anon finalization unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE 'permission denied for function finalize_cho_neo_openai_usage%' THEN
      RAISE EXCEPTION 'B3 anon finalization expected permission denied for function, got % %', SQLSTATE, SQLERRM;
    END IF;
    INSERT INTO pg_temp.b3_call_results VALUES ('anon', 'finalize_cho_neo_openai_usage', SQLSTATE, SQLERRM);
  END;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  BEGIN
    PERFORM public.reserve_cho_neo_openai_usage_v2(gen_random_uuid(), 10, 10, 10, 0, 1000, 'b3-auth');
    RAISE EXCEPTION 'B3 assertion failed: authenticated reservation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE 'permission denied for function reserve_cho_neo_openai_usage_v2%' THEN
      RAISE EXCEPTION 'B3 authenticated reservation expected permission denied for function, got % %', SQLSTATE, SQLERRM;
    END IF;
    INSERT INTO pg_temp.b3_call_results VALUES ('authenticated', 'reserve_cho_neo_openai_usage_v2', SQLSTATE, SQLERRM);
  END;
  BEGIN
    PERFORM public.finalize_cho_neo_openai_usage(gen_random_uuid(), false, 0);
    RAISE EXCEPTION 'B3 assertion failed: authenticated finalization unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501' OR SQLERRM NOT LIKE 'permission denied for function finalize_cho_neo_openai_usage%' THEN
      RAISE EXCEPTION 'B3 authenticated finalization expected permission denied for function, got % %', SQLSTATE, SQLERRM;
    END IF;
    INSERT INTO pg_temp.b3_call_results VALUES ('authenticated', 'finalize_cho_neo_openai_usage', SQLSTATE, SQLERRM);
  END;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config('request.jwt.claim.sub', ids.member_user_id::text, true)
FROM b3_test_ids AS ids;
SET LOCAL ROLE service_role;

DO $$
DECLARE
  v_member_user_id uuid;
  v_other_user_id uuid;
  v_reservation_id uuid;
  v_late_reservation_id uuid;
  v_allowed boolean;
  v_reason text;
  v_before_global integer;
  v_before_member integer;
  v_after_global integer;
  v_after_member integer;
  v_before_tokens integer;
  v_after_tokens integer;
  v_late_before_requests integer;
  v_late_after_requests integer;
  v_late_before_tokens integer;
  v_late_after_tokens integer;
BEGIN
  SELECT ids.member_user_id, ids.other_user_id INTO v_member_user_id, v_other_user_id
  FROM pg_temp.b3_test_ids AS ids;

  SELECT allowed, reason, reservation_id
  INTO v_allowed, v_reason, v_reservation_id
  FROM public.reserve_cho_neo_openai_usage_v2(
    v_member_user_id, 100, 100, 100, 0, 1000000, 'b3-success'
  );
  IF NOT v_allowed OR v_reason <> 'reserved' OR v_reservation_id IS NULL THEN
    RAISE EXCEPTION 'B3 service reservation failed: % %', v_allowed, v_reason;
  END IF;

  SELECT request_count, estimated_token_count INTO v_before_global, v_before_tokens
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'global_month' AND scope_key = 'cho-neo-openai' AND window_start = current_date - (extract(day from current_date)::integer - 1);
  SELECT request_count INTO v_before_member
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'member_day' AND scope_key = v_member_user_id::text AND window_start = current_date;

  PERFORM ok, reason FROM public.finalize_cho_neo_openai_usage(v_reservation_id, true, 40);
  SELECT status, actual_tokens INTO v_reason, v_after_tokens
  FROM public.cho_neo_openai_usage_reservations
  WHERE id = v_reservation_id;
  IF v_reason <> 'succeeded' OR v_after_tokens <> 40 THEN
    RAISE EXCEPTION 'B3 success finalization did not persist actual tokens';
  END IF;
  SELECT estimated_token_count INTO v_after_tokens
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'global_month' AND scope_key = 'cho-neo-openai' AND window_start = current_date - (extract(day from current_date)::integer - 1);
  IF v_after_tokens <> greatest(v_before_tokens - 100 + 40, 0) THEN
    RAISE EXCEPTION 'B3 success reconciliation failed: expected %, got %', greatest(v_before_tokens - 100 + 40, 0), v_after_tokens;
  END IF;

  SELECT allowed, reason, reservation_id
  INTO v_allowed, v_reason, v_reservation_id
  FROM public.reserve_cho_neo_openai_usage_v2(
    v_member_user_id, 100, 100, 120, 0, 1000000, 'b3-failed'
  );
  IF NOT v_allowed OR v_reason <> 'reserved' THEN
    RAISE EXCEPTION 'B3 failed-call reservation failed: % %', v_allowed, v_reason;
  END IF;
  PERFORM ok, reason FROM public.finalize_cho_neo_openai_usage(v_reservation_id, false, 0);
  SELECT request_count, estimated_token_count INTO v_after_global, v_after_tokens
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'global_month' AND scope_key = 'cho-neo-openai' AND window_start = current_date - (extract(day from current_date)::integer - 1);
  SELECT request_count INTO v_after_member
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'member_day' AND scope_key = v_member_user_id::text AND window_start = current_date;
  IF v_after_global <> v_before_global OR v_after_member <> v_before_member THEN
    RAISE EXCEPTION 'B3 failed finalization did not release request counters';
  END IF;

  SELECT allowed, reason, reservation_id
  INTO v_allowed, v_reason, v_late_reservation_id
  FROM public.reserve_cho_neo_openai_usage_v2(
    v_member_user_id, 100, 100, 80, 0, 1000000, 'b3-expired'
  );
  IF NOT v_allowed OR v_reason <> 'reserved' THEN
    RAISE EXCEPTION 'B3 expiry reservation failed: % %', v_allowed, v_reason;
  END IF;
  UPDATE public.cho_neo_openai_usage_reservations
  SET expires_at = now() - interval '1 second'
  WHERE id = v_late_reservation_id;
  SELECT allowed, reason INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_openai_usage_v2(
    v_other_user_id, 100, 100, 50, 0, 1000000, 'b3-expiry-cleanup'
  );
  IF NOT v_allowed OR v_reason <> 'reserved' THEN
    RAISE EXCEPTION 'B3 stale cleanup reservation failed: % %', v_allowed, v_reason;
  END IF;
  SELECT status INTO v_reason
  FROM public.cho_neo_openai_usage_reservations WHERE id = v_late_reservation_id;
  IF v_reason <> 'expired' THEN
    RAISE EXCEPTION 'B3 stale reservation was not expired';
  END IF;
  SELECT request_count, estimated_token_count
  INTO v_late_before_requests, v_late_before_tokens
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'global_month'
    AND scope_key = 'cho-neo-openai'
    AND window_start = current_date - (extract(day from current_date)::integer - 1);
  PERFORM ok, reason FROM public.finalize_cho_neo_openai_usage(v_late_reservation_id, true, 80);
  PERFORM ok, reason FROM public.finalize_cho_neo_openai_usage(v_late_reservation_id, true, 80);

  SELECT request_count, estimated_token_count
  INTO v_late_after_requests, v_late_after_tokens
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'global_month' AND scope_key = 'cho-neo-openai' AND window_start = current_date - (extract(day from current_date)::integer - 1);
  IF v_late_after_requests <> v_late_before_requests
     OR v_late_after_tokens <> v_late_before_tokens THEN
    RAISE EXCEPTION 'B3 late/repeated finalization changed counters after expiry';
  END IF;

  SELECT estimated_token_count INTO v_before_tokens
  FROM public.cho_neo_openai_usage_windows
  WHERE scope_type = 'global_month' AND scope_key = 'cho-neo-openai' AND window_start = current_date - (extract(day from current_date)::integer - 1);
  SELECT allowed, reason INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_openai_usage_v2(
    v_member_user_id, 100, 100, 2, 0, v_before_tokens + 1, 'b3-token-cap'
  );
  IF v_allowed OR v_reason <> 'global-token-limit' THEN
    RAISE EXCEPTION 'B3 monthly token cap did not block over-cap reservation: % %', v_allowed, v_reason;
  END IF;
END;
$$;

-- Keep the matching dollar-quote terminator below when this proof is copied or regenerated.
DO $$
DECLARE
  v_capture_count integer;
BEGIN
  SELECT count(*)
  INTO v_capture_count
  FROM pg_temp.b3_call_results;

  IF v_capture_count <> 4 THEN
    RAISE EXCEPTION
      'B3 authorization assertion failed: expected four captured function permission denials, got %',
      v_capture_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.b3_call_results AS captured
    WHERE captured.sqlstate <> '42501'
       OR captured.message NOT LIKE 'permission denied for function %'
  ) THEN
    RAISE EXCEPTION
      'B3 authorization assertion failed: unauthorized calls did not fail with permission denied for function';
  END IF;
END;
$$;

SELECT role_name, function_name, sqlstate, message
FROM b3_call_results
ORDER BY role_name, function_name;

SELECT 'B3_DATABASE_PROOF_PASSED' AS result;

ROLLBACK;
