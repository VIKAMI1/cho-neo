import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  getHoiGiDayTextError,
  HOI_GI_DAY_CONTRIBUTION_MAX_LENGTH,
  HOI_GI_DAY_QUESTION_MAX_LENGTH,
  getHoiChoNeoContinuation,
  isHoiGiDayFeedbackType,
  isHoiGiDayTopic,
  normalizeHoiGiDayText,
  type HoiGiDayDestination,
  type HoiGiDayFeedbackType,
  type HoiGiDayTopic,
} from "@/lib/cho-neo/hoi-gi-day";
import { answerWithHoiGiDayAi } from "@/lib/cho-neo/hoi-gi-day-ai";
import {
  CHO_NEO_MEMBER_PROFILE_TABLE,
  mapChoNeoMemberProfileRow,
} from "@/lib/cho-neo/member-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HoiGiDayQuestionRow = {
  author_user_id?: string;
  created_at: string;
  destination: HoiGiDayDestination;
  id: string;
  question_text: string;
  question_topic: HoiGiDayTopic;
  status: string;
};

type HoiGiDayAnswerRow = {
  answer_source: "neopao" | "community" | "reviewed";
  answer_text: string;
  created_at: string;
  id: string;
  question_id: string;
};

type SubmissionGuardResult = {
  allowed: boolean;
  guard_id: string | null;
  reason: string;
};

export async function GET() {
  const supabase = createChoNeoSupabaseClient();
  if (!supabase) return publicQuestionsResponse([]);

  const questionsResult = await supabase
    .from("cho_neo_questions")
    .select("id, question_text, question_topic, destination, status, created_at")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(40);

  if (questionsResult.error || !questionsResult.data) {
    return publicQuestionsResponse([]);
  }

  const questions = questionsResult.data as HoiGiDayQuestionRow[];
  const questionIds = questions.map((question) => question.id);
  const answersResult = questionIds.length
    ? await supabase
        .from("cho_neo_answers")
        .select("id, question_id, answer_source, answer_text, created_at")
        .in("question_id", questionIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  const answers = (answersResult.data ?? []) as HoiGiDayAnswerRow[];
  const answersByQuestion = new Map<string, HoiGiDayAnswerRow[]>();

  for (const answer of answers) {
    const list = answersByQuestion.get(answer.question_id) ?? [];
    list.push(answer);
    answersByQuestion.set(answer.question_id, list);
  }

  return publicQuestionsResponse(
    questions.map((question) => ({
      answers: (answersByQuestion.get(question.id) ?? []).map(publicAnswer),
      ...publicQuestion(question),
    })),
  );
}

export async function POST(request: Request) {
  const userId = await getAuthenticatedChoNeoUserId(request);
  if (!userId) {
    return NextResponse.json(
      {
        error: "Đăng nhập và xác nhận thành viên Chợ Neo trước khi hỏi hoặc góp ý nha.",
        reason: "missing-session",
      },
      { status: 401 },
    );
  }

  const supabase = createChoNeoSupabaseServiceClient();
  if (!supabase) return unavailable("missing-service-role");

  const profile = await getVerifiedMemberProfile(supabase, userId);
  if (!profile) {
    return NextResponse.json(
      {
        error: "Xác nhận thành viên ngành nail trước khi dùng phòng này nha.",
        reason: "unverified-cho-neo-member",
      },
      { status: 403 },
    );
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const action = body?.action;

  if (action === "feedback") return saveFeedback(supabase, userId, body ?? {});
  if (action !== "ask") {
    return NextResponse.json({ error: "Hành động chưa hợp lệ." }, { status: 400 });
  }

  return saveQuestion(supabase, userId, body ?? {});
}

async function saveQuestion(
  supabase: ReturnType<typeof createChoNeoSupabaseServiceClient> & object,
  userId: string,
  body: Record<string, unknown>,
) {
  const rawQuestionError = getHoiGiDayTextError(
    body.questionText,
    HOI_GI_DAY_QUESTION_MAX_LENGTH,
  );
  if (rawQuestionError) return NextResponse.json({ error: rawQuestionError }, { status: 400 });

  const questionText = normalizeHoiGiDayText(body.questionText);
  const questionError = getHoiGiDayTextError(
    questionText,
    HOI_GI_DAY_QUESTION_MAX_LENGTH,
  );
  if (questionError) return NextResponse.json({ error: questionError }, { status: 400 });

  const guard = await reserveSubmissionGuard(
    supabase,
    userId,
    "question",
    sha256(questionText),
  );
  if (!guard.allowed) return submissionGuardResponse(guard.reason, "question");

  const destination: HoiGiDayDestination = "neopao";

  const topic: HoiGiDayTopic = isHoiGiDayTopic(body.questionTopic)
    ? body.questionTopic
    : "general";
  const { data: question, error: questionErrorResult } = await supabase
    .from("cho_neo_questions")
    .insert({
      author_user_id: userId,
      destination,
      question_text: questionText,
      question_topic: topic,
      status: "pending_review",
    })
    .select("id, question_text, question_topic, destination, status, created_at, author_user_id")
    .single();

  if (questionErrorResult || !question) return unavailable("question-save-failed");

  if (guard.guard_id) {
    await supabase
      .from("cho_neo_submission_guards")
      .update({ question_id: question.id })
      .eq("id", guard.guard_id);
  }

  let ai;
  try {
    ai = await answerWithHoiGiDayAi(
      questionText,
      topic,
      userId,
      supabase,
      question.id,
    );
  } catch {
    await markQuestionUnpublished(supabase, question.id, "answer-generation-failed");
    return questionPublicationFailure("answer-generation-failed");
  }

  const { data: answer, error: answerError } = await supabase
    .from("cho_neo_answers")
    .insert({
      answer_source: "neopao",
      answer_text: ai.answerText,
      model_name: ai.model,
      provider_metadata: { generated: ai.source === "neopao", reason: ai.reason },
      question_id: question.id,
    })
    .select("id, question_id, answer_source, answer_text, created_at")
    .single();

  if (answerError || !answer) {
    await markQuestionUnpublished(supabase, question.id, "answer-save-failed");
    return questionPublicationFailure("answer-save-failed");
  }

  const { data: publishedQuestion, error: publishError } = await supabase
    .from("cho_neo_questions")
    .update({ status: "published", publication_error: null })
    .eq("id", question.id)
    .eq("status", "pending_review")
    .select("id, question_text, question_topic, destination, status, created_at, author_user_id")
    .single();

  if (publishError || !publishedQuestion) {
    await markQuestionUnpublished(supabase, question.id, "question-publish-failed");
    return questionPublicationFailure("question-publish-failed");
  }

  return NextResponse.json(
    {
      answer: publicAnswer(answer as HoiGiDayAnswerRow),
      question: publicQuestion(publishedQuestion as HoiGiDayQuestionRow),
    },
    { status: 201 },
  );
}

async function saveFeedback(
  supabase: ReturnType<typeof createChoNeoSupabaseServiceClient> & object,
  userId: string,
  body: Record<string, unknown>,
) {
  const questionId = typeof body.questionId === "string" ? body.questionId.trim() : "";
  const answerId = typeof body.answerId === "string" ? body.answerId.trim() : "";
  const feedbackType = body.feedbackType;
  if (!questionId || !answerId || !isHoiGiDayFeedbackType(feedbackType)) {
    return NextResponse.json({ error: "Góp ý chưa đủ thông tin." }, { status: 400 });
  }

  const rawContributionError = body.contributionText
    ? getHoiGiDayTextError(body.contributionText, HOI_GI_DAY_CONTRIBUTION_MAX_LENGTH)
    : null;
  if (rawContributionError) {
    return NextResponse.json({ error: rawContributionError }, { status: 400 });
  }

  const contributionText = normalizeHoiGiDayText(body.contributionText);
  const contributionError = contributionText
    ? getHoiGiDayTextError(contributionText, HOI_GI_DAY_CONTRIBUTION_MAX_LENGTH)
    : null;
  if (contributionError) return NextResponse.json({ error: contributionError }, { status: 400 });
  if ((feedbackType === "addition" || feedbackType === "correction") && !contributionText) {
    return NextResponse.json(
      { error: "Viết thêm một dòng kinh nghiệm trước khi gửi nha." },
      { status: 400 },
    );
  }

  const { data: answer, error: answerError } = await supabase
    .from("cho_neo_answers")
    .select("id, question_id")
    .eq("id", answerId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (answerError || !answer) {
    return NextResponse.json({ error: "Câu trả lời này không còn mở góp ý." }, { status: 404 });
  }

  const question = await supabase
    .from("cho_neo_questions")
    .select("id")
    .eq("id", questionId)
    .eq("status", "published")
    .maybeSingle();
  if (question.error || !question.data) {
    return NextResponse.json({ error: "Câu trả lời này không còn mở góp ý." }, { status: 404 });
  }

  const guard = await reserveSubmissionGuard(
    supabase,
    userId,
    "feedback",
    sha256(contributionText),
    {
      feedbackType: feedbackType as HoiGiDayFeedbackType,
      questionId,
      targetId: answerId,
    },
  );
  if (!guard.allowed) return submissionGuardResponse(guard.reason, "feedback");

  const { error } = await supabase.from("cho_neo_answer_feedback").insert({
    answer_id: answerId,
    author_user_id: userId,
    contribution_text: contributionText || null,
    feedback_type: feedbackType as HoiGiDayFeedbackType,
    question_id: questionId,
    review_status: "pending_review",
  });
  if (error) return feedbackUnavailable("feedback-save-failed");
  return NextResponse.json({ reviewStatus: "pending_review" }, { status: 201 });
}

async function reserveSubmissionGuard(
  supabase: ReturnType<typeof createChoNeoSupabaseServiceClient> & object,
  userId: string,
  actionType: "question" | "feedback",
  contentHash: string,
  input: {
    feedbackType?: HoiGiDayFeedbackType;
    questionId?: string;
    targetId?: string;
  } = {},
): Promise<SubmissionGuardResult> {
  const { data, error } = await supabase.rpc("reserve_cho_neo_submission_guard", {
    p_action_type: actionType,
    p_content_hash: contentHash,
    p_feedback_type: input.feedbackType ?? null,
    p_member_user_id: userId,
    p_question_id: input.questionId ?? null,
    p_target_id: input.targetId ?? null,
  });

  if (error) {
    return {
      allowed: false,
      guard_id: null,
      reason: actionType === "question"
        ? "publishing-guard-unavailable"
        : "feedback-guard-unavailable",
    };
  }

  const row = (Array.isArray(data) ? data[0] : data) as SubmissionGuardResult | null;
  if (!row) {
    return {
      allowed: false,
      guard_id: null,
      reason: actionType === "question"
        ? "publishing-guard-unavailable"
        : "feedback-guard-unavailable",
    };
  }

  return {
    allowed: row.allowed === true,
    guard_id: row.guard_id ?? null,
    reason: row.reason || "publishing-guard-unavailable",
  };
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function submissionGuardResponse(reason: string, actionType: "question" | "feedback") {
  const status = reason.startsWith("duplicate-")
    ? 409
    : reason.endsWith("cooldown") || reason.endsWith("daily-limit")
      ? 429
      : 503;
  const error = actionType === "question"
    ? "Câu hỏi này chưa thể gửi lúc này. Thử lại sau nha."
    : "Góp ý này chưa thể gửi lúc này. Thử lại sau nha.";
  return NextResponse.json({ error, reason }, { status });
}

async function markQuestionUnpublished(
  supabase: ReturnType<typeof createChoNeoSupabaseServiceClient> & object,
  questionId: string,
  reason: string,
) {
  await supabase
    .from("cho_neo_questions")
    .update({ publication_error: reason, status: "rejected" })
    .eq("id", questionId)
    .neq("status", "published");
}

function questionPublicationFailure(reason: string) {
  return NextResponse.json(
    {
      error: "Câu hỏi chưa được đăng vì câu trả lời chưa được lưu an toàn.",
      reason,
    },
    { status: 503 },
  );
}

function feedbackUnavailable(reason: string) {
  return NextResponse.json(
    {
      error: "Góp ý chưa được lưu an toàn. Thử lại sau nha.",
      reason,
    },
    { status: 503 },
  );
}

function publicQuestion(question: HoiGiDayQuestionRow) {
  return {
    createdAt: question.created_at,
    destination: question.destination,
    questionId: question.id,
    questionText: question.question_text,
    questionTopic: question.question_topic,
    continuation: getHoiChoNeoContinuation(question.question_topic),
  };
}

function publicAnswer(answer: HoiGiDayAnswerRow) {
  return {
    answerId: answer.id,
    answerSource: answer.answer_source,
    answerText: answer.answer_text,
    createdAt: answer.created_at,
  };
}

function publicQuestionsResponse(questions: unknown[]) {
  return NextResponse.json(
    { mode: "published", questions },
    { headers: { "Cache-Control": "no-store" }, status: 200 },
  );
}

async function getAuthenticatedChoNeoUserId(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !supabaseKey) return null;

  const { data, error } = await createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  }).auth.getUser(token);
  if (error || !data.user || data.user.is_anonymous) return null;
  return data.user.id;
}

async function getVerifiedMemberProfile(
  supabase: { from: (table: string) => any },
  userId: string,
) {
  const { data, error } = await supabase
    .from(CHO_NEO_MEMBER_PROFILE_TABLE)
    .select("user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status, suspended_at")
    .eq("user_id", userId)
    .eq("membership_status", "verified_nail_member")
    .is("suspended_at", null)
    .maybeSingle();
  if (error || !data) return null;
  return mapChoNeoMemberProfileRow(data);
}

function createChoNeoSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

function createChoNeoSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

function unavailable(reason: string) {
  return NextResponse.json(
    {
      error: "Phòng đang thiếu một kết nối an toàn. Câu hỏi chưa được gửi đi.",
      reason,
    },
    { status: 503 },
  );
}
