-- Durable Hỏi Chợ Neo submission guardrails.
-- Server routes reserve these guards before writing or calling an external provider.

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
  VALUES (
    p_member_user_id,
    p_action_type,
    v_window_start
  )
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
  uuid,
  text,
  text,
  uuid,
  uuid,
  text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.reserve_cho_neo_submission_guard(
  uuid,
  text,
  text,
  uuid,
  uuid,
  text
) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_cho_neo_submission_guard(
  uuid,
  text,
  text,
  uuid,
  uuid,
  text
) TO service_role;

SELECT pg_notify('pgrst', 'reload schema');
