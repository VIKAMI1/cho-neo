BEGIN;

DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    missing := array_append(missing, 'table auth.users');
  END IF;
  IF to_regclass('public.cho_neo_questions') IS NULL THEN
    missing := array_append(missing, 'table public.cho_neo_questions');
  END IF;
  IF to_regclass('public.cho_neo_answers') IS NULL THEN
    missing := array_append(missing, 'table public.cho_neo_answers');
  END IF;
  IF to_regclass('public.cho_neo_answer_feedback') IS NULL THEN
    missing := array_append(missing, 'table public.cho_neo_answer_feedback');
  END IF;
  IF to_regprocedure('auth.role()') IS NULL THEN
    missing := array_append(missing, 'function auth.role()');
  END IF;
  IF to_regprocedure('gen_random_uuid()') IS NULL THEN
    missing := array_append(missing, 'function gen_random_uuid()');
  END IF;

  IF cardinality(missing) > 0 THEN
    RAISE EXCEPTION
      'B2 prerequisite check failed; no migration or test data was applied: %',
      array_to_string(missing, ', ');
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.cho_neo_submission_guard_windows (
  member_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  window_start date NOT NULL,
  submission_count integer NOT NULL DEFAULT 0,
  last_submitted_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (member_user_id, action_type, window_start),
  CONSTRAINT cho_neo_submission_guard_windows_action_check
    CHECK (action_type IN ('question', 'feedback')),
  CONSTRAINT cho_neo_submission_guard_windows_count_check
    CHECK (submission_count >= 0)
);

CREATE TABLE IF NOT EXISTS public.cho_neo_submission_guards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL,
  question_id uuid NULL REFERENCES public.cho_neo_questions(id) ON DELETE CASCADE,
  target_id uuid NULL REFERENCES public.cho_neo_answers(id) ON DELETE CASCADE,
  feedback_type text NULL,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cho_neo_submission_guards_action_check
    CHECK (action_type IN ('question', 'feedback')),
  CONSTRAINT cho_neo_submission_guards_hash_check
    CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT cho_neo_submission_guards_shape_check
    CHECK (
      (action_type = 'question'
       AND target_id IS NULL
       AND feedback_type IS NULL)
      OR
      (action_type = 'feedback'
       AND question_id IS NOT NULL
       AND target_id IS NOT NULL
       AND feedback_type IN ('correct', 'addition', 'correction'))
    )
);

CREATE INDEX IF NOT EXISTS cho_neo_submission_guards_duplicate_idx
  ON public.cho_neo_submission_guards (
    member_user_id,
    action_type,
    content_hash,
    created_at DESC
  );

CREATE INDEX IF NOT EXISTS cho_neo_submission_guards_feedback_idx
  ON public.cho_neo_submission_guards (
    member_user_id,
    action_type,
    question_id,
    target_id,
    feedback_type,
    created_at DESC
  );

ALTER TABLE public.cho_neo_submission_guard_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cho_neo_submission_guards ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cho_neo_submission_guard_windows FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.cho_neo_submission_guards FROM PUBLIC, anon, authenticated;

ALTER TABLE public.cho_neo_questions
  ADD COLUMN IF NOT EXISTS publication_error text NULL;

CREATE OR REPLACE FUNCTION public.reserve_cho_neo_submission_guard(
  p_member_user_id uuid,
  p_action_type text,
  p_content_hash text,
  p_question_id uuid DEFAULT NULL,
  p_target_id uuid DEFAULT NULL,
  p_feedback_type text DEFAULT NULL
)
RETURNS TABLE (
  allowed boolean,
  reason text,
  guard_id uuid
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_window_start date := current_date;
  v_window public.cho_neo_submission_guard_windows%rowtype;
  v_guard_id uuid;
  v_daily_limit integer;
  v_cooldown_seconds integer;
  v_duplicate_seconds integer := 24 * 60 * 60;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'server-only' USING errcode = '42501';
  END IF;

  IF p_member_user_id IS NULL
     OR p_action_type NOT IN ('question', 'feedback')
     OR p_content_hash IS NULL
     OR p_content_hash !~ '^[0-9a-f]{64}$' THEN
    RETURN QUERY SELECT false, 'invalid-submission-guard'::text, NULL::uuid;
    RETURN;
  END IF;

  IF p_action_type = 'question' THEN
    v_daily_limit := 6;
    v_cooldown_seconds := 90;
    IF p_question_id IS NOT NULL
       OR p_target_id IS NOT NULL
       OR p_feedback_type IS NOT NULL THEN
      RETURN QUERY SELECT false, 'invalid-submission-guard'::text, NULL::uuid;
      RETURN;
    END IF;
  ELSE
    v_daily_limit := 20;
    v_cooldown_seconds := 15;
    IF p_question_id IS NULL
       OR p_target_id IS NULL
       OR p_feedback_type NOT IN ('correct', 'addition', 'correction') THEN
      RETURN QUERY SELECT false, 'invalid-submission-guard'::text, NULL::uuid;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.cho_neo_submission_guard_windows (
    member_user_id,
    action_type,
    window_start
  )
  VALUES (p_member_user_id, p_action_type, v_window_start)
  ON CONFLICT (member_user_id, action_type, window_start) DO NOTHING;

  SELECT *
  INTO v_window
  FROM public.cho_neo_submission_guard_windows AS guard_window
  WHERE guard_window.member_user_id = p_member_user_id
    AND guard_window.action_type = p_action_type
    AND guard_window.window_start = v_window_start
  FOR UPDATE;

  IF EXISTS (
    SELECT 1
    FROM public.cho_neo_submission_guards AS existing_guard
    WHERE existing_guard.member_user_id = p_member_user_id
      AND existing_guard.action_type = p_action_type
      AND existing_guard.content_hash = p_content_hash
      AND existing_guard.created_at >= now() - make_interval(secs => v_duplicate_seconds)
      AND (
        p_action_type = 'question'
        OR (
          existing_guard.question_id = p_question_id
          AND existing_guard.target_id = p_target_id
          AND existing_guard.feedback_type = p_feedback_type
        )
      )
  ) THEN
    RETURN QUERY SELECT false, CASE
      WHEN p_action_type = 'question' THEN 'duplicate-question'
      ELSE 'duplicate-feedback'
    END::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_window.submission_count >= v_daily_limit THEN
    RETURN QUERY SELECT false, CASE
      WHEN p_action_type = 'question' THEN 'question-daily-limit'
      ELSE 'feedback-daily-limit'
    END::text, NULL::uuid;
    RETURN;
  END IF;

  IF v_window.last_submitted_at IS NOT NULL
     AND v_window.last_submitted_at > now() - make_interval(secs => v_cooldown_seconds) THEN
    RETURN QUERY SELECT false, CASE
      WHEN p_action_type = 'question' THEN 'question-cooldown'
      ELSE 'feedback-cooldown'
    END::text, NULL::uuid;
    RETURN;
  END IF;

  INSERT INTO public.cho_neo_submission_guards (
    member_user_id,
    action_type,
    question_id,
    target_id,
    feedback_type,
    content_hash
  )
  VALUES (
    p_member_user_id,
    p_action_type,
    p_question_id,
    p_target_id,
    p_feedback_type,
    p_content_hash
  )
  RETURNING id INTO v_guard_id;

  UPDATE public.cho_neo_submission_guard_windows AS guard_window
  SET submission_count = guard_window.submission_count + 1,
      last_submitted_at = now(),
      updated_at = now()
  WHERE guard_window.member_user_id = p_member_user_id
    AND guard_window.action_type = p_action_type
    AND guard_window.window_start = v_window_start;

  RETURN QUERY SELECT true, 'reserved'::text, v_guard_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_cho_neo_submission_guard(
  uuid, text, text, uuid, uuid, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.reserve_cho_neo_submission_guard(
  uuid, text, text, uuid, uuid, text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_cho_neo_submission_guard(
  uuid, text, text, uuid, uuid, text
) TO service_role;

CREATE TEMP TABLE b2_test_ids (
  member_user_id uuid PRIMARY KEY,
  other_user_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO b2_test_ids
VALUES (gen_random_uuid(), gen_random_uuid());

CREATE TEMP TABLE b2_call_results (
  role_name text NOT NULL,
  operation text NOT NULL,
  sqlstate text NOT NULL,
  error_message text NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE b2_function_signatures (
  function_name text PRIMARY KEY,
  function_signature text NOT NULL
) ON COMMIT DROP;

CREATE TEMP TABLE b2_privilege_matrix (
  function_name text PRIMARY KEY,
  public_execute boolean NOT NULL,
  anon_execute boolean NOT NULL,
  authenticated_execute boolean NOT NULL,
  service_role_execute boolean NOT NULL
) ON COMMIT DROP;

INSERT INTO b2_function_signatures
VALUES (
  'reserve_cho_neo_submission_guard',
  'public.reserve_cho_neo_submission_guard(uuid,text,text,uuid,uuid,text)'
);

INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data
)
SELECT
  users_to_create.user_id,
  'authenticated',
  'authenticated',
  users_to_create.user_id::text || '@b2.invalid',
  '',
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb
FROM (
  SELECT ids.member_user_id AS user_id FROM b2_test_ids AS ids
  UNION ALL
  SELECT ids.other_user_id AS user_id FROM b2_test_ids AS ids
) AS users_to_create
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON b2_test_ids TO anon, authenticated, service_role;
GRANT INSERT, SELECT ON b2_call_results TO anon, authenticated, service_role;
GRANT SELECT ON b2_function_signatures TO anon, authenticated, service_role;
GRANT SELECT ON b2_privilege_matrix TO anon, authenticated, service_role;

INSERT INTO b2_privilege_matrix
SELECT
  signatures.function_name,
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
FROM b2_function_signatures AS signatures;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM b2_privilege_matrix AS matrix
    WHERE matrix.public_execute
       OR matrix.anon_execute
       OR matrix.authenticated_execute
       OR NOT matrix.service_role_execute
  ) THEN
    RAISE EXCEPTION
      'B2 privilege assertion failed: PUBLIC/anon/authenticated must be false and service_role must be true';
  END IF;
END;
$$;

DO $$
DECLARE
  v_is_security_definer boolean;
BEGIN
  SELECT procedure_row.prosecdef
  INTO v_is_security_definer
  FROM pg_proc AS procedure_row
  WHERE procedure_row.oid = 'public.reserve_cho_neo_submission_guard(uuid,text,text,uuid,uuid,text)'::regprocedure;

  IF v_is_security_definer IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'B2 assertion failed: guard RPC must be SECURITY INVOKER';
  END IF;
END;
$$;

SELECT
  routine_schema,
  routine_name,
  privilege_type,
  grantee
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'reserve_cho_neo_submission_guard'
ORDER BY grantee, privilege_type;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'anon', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM public.reserve_cho_neo_submission_guard(
      gen_random_uuid(),
      'question',
      repeat('a', 64)
    );
    RAISE EXCEPTION 'B2 assertion failed: anon call unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501'
       OR SQLERRM NOT LIKE 'permission denied for function reserve_cho_neo_submission_guard%' THEN
      RAISE EXCEPTION
        'B2 assertion failed: anon expected permission denied for function, got % %',
        SQLSTATE,
        SQLERRM;
    END IF;
    INSERT INTO pg_temp.b2_call_results
    VALUES ('anon', 'reserve_cho_neo_submission_guard', SQLSTATE, SQLERRM);
  END;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.reserve_cho_neo_submission_guard(
      gen_random_uuid(),
      'question',
      repeat('b', 64)
    );
    RAISE EXCEPTION 'B2 assertion failed: authenticated call unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> '42501'
       OR SQLERRM NOT LIKE 'permission denied for function reserve_cho_neo_submission_guard%' THEN
      RAISE EXCEPTION
        'B2 assertion failed: authenticated expected permission denied for function, got % %',
        SQLSTATE,
        SQLERRM;
    END IF;
    INSERT INTO pg_temp.b2_call_results
    VALUES ('authenticated', 'reserve_cho_neo_submission_guard', SQLSTATE, SQLERRM);
  END;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
SELECT set_config('request.jwt.claim.sub', ids.member_user_id::text, true)
FROM b2_test_ids AS ids;
SET LOCAL ROLE service_role;

CREATE TEMP TABLE b2_test_content (
  question_id uuid PRIMARY KEY,
  answer_one_id uuid NOT NULL,
  answer_two_id uuid NOT NULL
) ON COMMIT DROP;

INSERT INTO b2_test_content
VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

INSERT INTO public.cho_neo_questions (
  id,
  author_user_id,
  question_text,
  question_topic,
  destination,
  status
)
SELECT
  content.question_id,
  ids.member_user_id,
  'B2 temporary pending question',
  'general',
  'neopao',
  'pending_review'
FROM b2_test_content AS content
CROSS JOIN b2_test_ids AS ids;

DO $$
DECLARE
  v_member_user_id uuid;
  v_question_id uuid;
  v_guard_id uuid;
  v_reason text;
  v_allowed boolean;
  v_public_pending_count integer;
BEGIN
  SELECT ids.member_user_id INTO v_member_user_id FROM pg_temp.b2_test_ids AS ids;
  SELECT content.question_id INTO v_question_id FROM pg_temp.b2_test_content AS content;

  SELECT guard.allowed, guard.reason, guard.guard_id
  INTO v_allowed, v_reason, v_guard_id
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'question',
    repeat('1', 64)
  ) AS guard;

  IF NOT v_allowed OR v_reason <> 'reserved' OR v_guard_id IS NULL THEN
    RAISE EXCEPTION 'B2 assertion failed: first question guard was not reserved';
  END IF;

  UPDATE public.cho_neo_submission_guards
  SET question_id = v_question_id
  WHERE id = v_guard_id;

  SELECT count(*)
  INTO v_public_pending_count
  FROM public.cho_neo_questions AS question
  WHERE question.id = v_question_id
    AND question.status = 'published';

  IF v_public_pending_count <> 0 THEN
    RAISE EXCEPTION
      'B2 assertion failed: pending question was visible to the public query';
  END IF;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'question',
    repeat('1', 64)
  ) AS guard;

  IF v_allowed OR v_reason <> 'duplicate-question' THEN
    RAISE EXCEPTION
      'B2 assertion failed: duplicate question expected duplicate-question, got % %',
      v_allowed,
      v_reason;
  END IF;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'question',
    repeat('2', 64)
  ) AS guard;

  IF v_allowed OR v_reason <> 'question-cooldown' THEN
    RAISE EXCEPTION
      'B2 assertion failed: second question expected question-cooldown, got % %',
      v_allowed,
      v_reason;
  END IF;

  UPDATE public.cho_neo_submission_guard_windows
  SET submission_count = 6,
      last_submitted_at = now() - interval '2 minutes'
  WHERE member_user_id = v_member_user_id
    AND action_type = 'question'
    AND window_start = current_date;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'question',
    repeat('3', 64)
  ) AS guard;

  IF v_allowed OR v_reason <> 'question-daily-limit' THEN
    RAISE EXCEPTION
      'B2 assertion failed: seventh question expected question-daily-limit, got % %',
      v_allowed,
      v_reason;
  END IF;

  UPDATE public.cho_neo_submission_guard_windows
  SET submission_count = 0,
      last_submitted_at = now() - interval '2 minutes'
  WHERE member_user_id = v_member_user_id
    AND action_type = 'question'
    AND window_start = current_date;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'question',
    repeat('4', 64)
  ) AS guard;

  IF NOT v_allowed OR v_reason <> 'reserved' THEN
    RAISE EXCEPTION
      'B2 assertion failed: legitimate post-cooldown question was not reserved';
  END IF;
END;
$$;

INSERT INTO public.cho_neo_answers (
  id,
  question_id,
  answer_source,
  answer_text
)
SELECT
  content.answer_one_id,
  content.question_id,
  'neopao',
  'B2 temporary answer one'
FROM b2_test_content AS content
UNION ALL
SELECT
  content.answer_two_id,
  content.question_id,
  'neopao',
  'B2 temporary answer two'
FROM b2_test_content AS content;

UPDATE public.cho_neo_questions AS question
SET status = 'published'
FROM b2_test_content AS content
WHERE question.id = content.question_id;

DO $$
DECLARE
  v_member_user_id uuid;
  v_question_id uuid;
  v_answer_one_id uuid;
  v_answer_two_id uuid;
  v_allowed boolean;
  v_reason text;
BEGIN
  SELECT ids.member_user_id INTO v_member_user_id FROM pg_temp.b2_test_ids AS ids;
  SELECT content.question_id, content.answer_one_id, content.answer_two_id
  INTO v_question_id, v_answer_one_id, v_answer_two_id
  FROM pg_temp.b2_test_content AS content;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'feedback',
    repeat('a', 64),
    v_question_id,
    v_answer_one_id,
    'correct'
  ) AS guard;

  IF NOT v_allowed OR v_reason <> 'reserved' THEN
    RAISE EXCEPTION 'B2 assertion failed: first feedback guard was not reserved';
  END IF;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'feedback',
    repeat('a', 64),
    v_question_id,
    v_answer_one_id,
    'correct'
  ) AS guard;

  IF v_allowed OR v_reason <> 'duplicate-feedback' THEN
    RAISE EXCEPTION
      'B2 assertion failed: duplicate feedback expected duplicate-feedback, got % %',
      v_allowed,
      v_reason;
  END IF;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'feedback',
    repeat('b', 64),
    v_question_id,
    v_answer_two_id,
    'addition'
  ) AS guard;

  IF v_allowed OR v_reason <> 'feedback-cooldown' THEN
    RAISE EXCEPTION
      'B2 assertion failed: second feedback expected feedback-cooldown, got % %',
      v_allowed,
      v_reason;
  END IF;

  UPDATE public.cho_neo_submission_guard_windows
  SET submission_count = 20,
      last_submitted_at = now() - interval '1 minute'
  WHERE member_user_id = v_member_user_id
    AND action_type = 'feedback'
    AND window_start = current_date;

  SELECT guard.allowed, guard.reason
  INTO v_allowed, v_reason
  FROM public.reserve_cho_neo_submission_guard(
    v_member_user_id,
    'feedback',
    repeat('c', 64),
    v_question_id,
    v_answer_two_id,
    'correction'
  ) AS guard;

  IF v_allowed OR v_reason <> 'feedback-daily-limit' THEN
    RAISE EXCEPTION
      'B2 assertion failed: twenty-first feedback expected feedback-daily-limit, got % %',
      v_allowed,
      v_reason;
  END IF;
END;
$$;

SELECT
  role_name,
  operation,
  sqlstate,
  error_message
FROM b2_call_results
ORDER BY role_name, operation;

SELECT 'B2_DATABASE_PROOF_PASSED' AS result;

ROLLBACK;
