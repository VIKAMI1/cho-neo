import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHO_NEO_AVATARS,
  isValidVillageNickname,
} from "@/lib/cho-neo/avatar-identity";
import { isChoNeoGossipPostingDisabled } from "@/lib/cho-neo/env-flags";
import {
  CHO_NEO_MEMBER_PROFILE_TABLE,
  mapChoNeoMemberProfileRow,
} from "@/lib/cho-neo/member-identity";
import {
  FRONT_COUNTER_MESSAGE_CAP,
  FRONT_COUNTER_MESSAGE_TEXT_LIMIT,
  type FrontCounterMessage,
} from "@/lib/cho-neo/gossip-front-counter";

const FRONT_COUNTER_ROOM_ID = "front-counter";
const TABLE_NAME = "cho_neo_gossip_messages";
const MESSAGE_SELECT =
  "id, room_id, avatar_id, nickname, text, reactions, report_count, reported_at, hidden_at, removed_at, created_at";
const LEGACY_MESSAGE_SELECT =
  "id, room_id, avatar_id, nickname, text, reactions, hidden_at, created_at";
const OWNED_MESSAGE_SELECT =
  "id, room_id, author_user_id, avatar_id, nickname, text, reactions, hidden_at, created_at";
const SUPABASE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const POST_RATE_LIMIT_WINDOW_MS = 60_000;
const POST_RATE_LIMIT_MAX = 5;
const REPORT_RATE_LIMIT_WINDOW_MS = 60_000;
const REPORT_RATE_LIMIT_MAX = 10;
const DUPLICATE_WINDOW_MS = 10 * 60_000;
const postRateBuckets = new Map<string, number[]>();
const reportRateBuckets = new Map<string, number[]>();
const recentPostFingerprints = new Map<string, number>();
const recentReportFingerprints = new Map<string, number>();

export const dynamic = "force-dynamic";

type GossipMessageRow = {
  author_user_id?: string | null;
  avatar_id: string;
  created_at: string;
  hidden_at?: string | null;
  id: string;
  nickname: string;
  reactions: FrontCounterMessage["reactions"] | null;
  removed_at?: string | null;
  report_count?: number | null;
  reported_at?: string | null;
  room_id?: string;
  text: string;
};

type GossipMessageLookupRow = {
  hidden_at: string | null;
  id: string;
  report_count: number | null;
  room_id: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);

  if (url.searchParams.get("hostReview") === "1") {
    return getHostReviewMessages(request.headers.get("X-Cho-Neo-Host-Key") ?? "");
  }

  const supabase = createChoNeoSupabaseClient();

  if (!supabase) {
    return sharedMemoryUnavailable({
      detail: "Missing Supabase URL or key for Cho Neo shared memory.",
      operation: "GET",
      reason: "missing-env",
    });
  }

  const result = await supabase
    .from(TABLE_NAME)
    .select(MESSAGE_SELECT)
    .eq("room_id", FRONT_COUNTER_ROOM_ID)
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .limit(FRONT_COUNTER_MESSAGE_CAP);
  let data = result.data as GossipMessageRow[] | null;
  let error = result.error;

  if (error && isMissingModerationColumns(error)) {
    const legacyResult = await supabase
      .from(TABLE_NAME)
      .select(LEGACY_MESSAGE_SELECT)
      .eq("room_id", FRONT_COUNTER_ROOM_ID)
      .is("hidden_at", null)
      .order("created_at", { ascending: false })
      .limit(FRONT_COUNTER_MESSAGE_CAP);

    data = legacyResult.data as GossipMessageRow[] | null;
    error = legacyResult.error;
  }

  if (error) {
    return sharedMemoryUnavailable({
      detail: error.message,
      operation: "GET",
      reason: error.code ?? "supabase-select-error",
    });
  }

  const messages = ((data ?? []) as GossipMessageRow[])
    .reverse()
    .map(rowToPublicMessage);

  return NextResponse.json(
    { messages, mode: "shared" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

async function getHostReviewMessages(hostKey: string) {
  if (!isValidHostKey(hostKey)) {
    return NextResponse.json({ error: "Host tools are locked." }, { status: 403 });
  }

  const supabase = createChoNeoSupabaseServiceClient();

  if (!supabase) {
    return sharedMemoryUnavailable({
      detail: "Missing Supabase service role key for Cho Neo host review.",
      operation: "GET",
      reason: "missing-service-role",
    });
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select(MESSAGE_SELECT)
    .eq("room_id", FRONT_COUNTER_ROOM_ID)
    .order("created_at", { ascending: false })
    .limit(FRONT_COUNTER_MESSAGE_CAP);

  if (error) {
    return sharedMemoryUnavailable({
      detail: error.message,
      operation: "GET",
      reason: error.code ?? "supabase-host-review-select-error",
    });
  }

  const messages = ((data ?? []) as GossipMessageRow[])
    .filter((row) => {
      return (
        (row.report_count ?? 0) > 0 ||
        !!row.hidden_at ||
        !!row.removed_at
      );
    })
    .reverse()
    .map(rowToMessage);

  return NextResponse.json(
    { messages, mode: "host-review" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  if (isPostingDisabled()) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_POSTING_DISABLED",
        error: "Quán đang tạm ngưng nhận câu mới, nhưng vẫn đọc được như thường.",
        reason: "posting-disabled",
      },
      { status: 503 }
    );
  }

  const clientKey = getClientKey(request);
  if (isPostRateLimited(clientKey)) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_POST_RATE_LIMITED",
        error: "Con gửi hơi nhanh. Nghỉ một nhịp rồi góp tiếp nha.",
        reason: "post-rate-limited",
      },
      { status: 429 }
    );
  }

  const userId = await getAuthenticatedChoNeoUserId(request);
  if (!userId) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_PASS_REQUIRED",
        error: "Vào Chợ Neo và xác nhận thành viên trước khi góp chuyện nha.",
        reason: "missing-cho-neo-member",
      },
      { status: 401 }
    );
  }

  const supabase = createChoNeoSupabaseServiceClient();

  if (!supabase) {
    return sharedMemoryUnavailable({
      detail: "Missing Supabase service role key for Cho Neo shared memory.",
      operation: "POST",
      reason: "missing-service-role",
    });
  }

  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  const profile = await getVerifiedChoNeoMemberProfile(supabase, userId);
  if (!profile) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_ACTIVE_PASS_REQUIRED",
        error: "Xác nhận thành viên ngành nail trước khi góp chuyện nha.",
        reason: "unverified-cho-neo-member",
      },
      { status: 400 }
    );
  }

  const avatarId = profile.avatarKey ?? profile.avatar.id;
  const nickname = profile.displayName;

  if (!CHO_NEO_AVATARS.some((avatar) => avatar.id === avatarId)) {
    return NextResponse.json({ error: "Choose a valid Cho Neo avatar." }, { status: 400 });
  }

  const nicknameValidation = isValidVillageNickname(nickname);

  if (!nicknameValidation.valid) {
    return NextResponse.json({ error: nicknameValidation.message }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Message cannot be blank." }, { status: 400 });
  }

  if (text.length > FRONT_COUNTER_MESSAGE_TEXT_LIMIT) {
    return NextResponse.json(
      { error: `Message must be ${FRONT_COUNTER_MESSAGE_TEXT_LIMIT} characters or fewer.` },
      { status: 400 }
    );
  }

  const unsafeTextReason = getUnsafeTextReason(text);
  if (unsafeTextReason) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_UNSAFE_TEXT",
        error: "Giữ câu này chung chung hơn một chút: không link, không HTML, không thông tin riêng tư.",
        reason: unsafeTextReason,
      },
      { status: 400 }
    );
  }

  if (isDuplicatePost(clientKey, text)) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_DUPLICATE_POST",
        error: "Câu này vừa được đặt lên bàn rồi.",
        reason: "duplicate-post",
      },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      author_user_id: userId,
      avatar_id: avatarId,
      nickname,
      reactions: {},
      room_id: FRONT_COUNTER_ROOM_ID,
      text,
    })
    .select(OWNED_MESSAGE_SELECT)
    .single();

  if (error) {
    return sharedMemoryUnavailable({
      detail: error.message,
      operation: "POST",
      reason: error.code ?? "supabase-insert-error",
    });
  }

  const savedRow = data as GossipMessageRow | null;

  if (!savedRow || !SUPABASE_UUID_PATTERN.test(savedRow.id)) {
    console.error("[cho-neo:gossip-front-counter] POST missing persisted id", {
      messageId: savedRow?.id,
    });

    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_POST_MISSING_ID",
        error: "Shared Gossip Café post did not return a database message id.",
        reason: "post-missing-database-id",
      },
      { status: 500 }
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[cho-neo:gossip-front-counter] POST inserted row", {
      messageId: savedRow.id,
      roomId: savedRow.room_id,
    });
    console.info("[cho-neo:gossip-front-counter] POST returned id", {
      messageId: savedRow.id,
    });
  }

  rememberPostFingerprint(clientKey, text);

  return NextResponse.json(
    { message: rowToPublicMessage(savedRow), mode: "shared" },
    { headers: { "Cache-Control": "no-store" }, status: 201 }
  );
}

async function getAuthenticatedChoNeoUserId(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseKey) {
    return null;
  }

  const { data, error } = await createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  }).auth.getUser(token);

  if (error || !data.user || data.user.is_anonymous) {
    return null;
  }

  return data.user.id;
}

async function getVerifiedChoNeoMemberProfile(
  supabase: { from: (table: string) => any },
  userId: string,
) {
  const { data, error } = await supabase
    .from(CHO_NEO_MEMBER_PROFILE_TABLE)
    .select("user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status")
    .eq("user_id", userId)
    .eq("membership_status", "verified_nail_member")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapChoNeoMemberProfileRow(data);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const action = typeof body?.action === "string" ? body.action : "";
  const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : "";

  if (process.env.NODE_ENV === "development") {
    console.info("[cho-neo:gossip-front-counter] PATCH received messageId", {
      action,
      messageId,
    });
  }

  if (!messageId) {
    return NextResponse.json({ error: "Missing message id." }, { status: 400 });
  }

  if (!SUPABASE_UUID_PATTERN.test(messageId)) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_INVALID_MESSAGE_ID",
        error: "Gossip Café moderation requires a database message id.",
        reason: "invalid-message-id",
      },
      { status: 400 }
    );
  }

  if (action === "report") {
    return reportMessage(request, messageId);
  }

  if (
    action === "hide" ||
    action === "markReviewed" ||
    action === "remove" ||
    action === "unhide"
  ) {
    return updateMessageAsHost({
      action: action as HostModerationAction,
      hostKey: request.headers.get("X-Cho-Neo-Host-Key") ?? "",
      messageId,
    });
  }

  return NextResponse.json({ error: "Unknown moderation action." }, { status: 400 });
}

function createChoNeoSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
}

function createChoNeoSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
  });
}

function isMissingModerationColumns(error: { code?: string; message?: string }) {
  const message = error.message ?? "";

  return (
    error.code === "42703" ||
    error.code === "PGRST204" ||
    message.includes("report_count") ||
    message.includes("reported_at") ||
    message.includes("removed_at")
  );
}

function isPostingDisabled() {
  return isChoNeoGossipPostingDisabled();
}

function getClientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const userAgent = request.headers.get("user-agent")?.slice(0, 80) ?? "unknown";
  return `${(forwarded || realIp || "local").slice(0, 80)}:${userAgent}`;
}

function isPostRateLimited(clientKey: string, now = Date.now()) {
  const recent = (postRateBuckets.get(clientKey) ?? []).filter(
    (timestamp) => now - timestamp < POST_RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= POST_RATE_LIMIT_MAX) {
    postRateBuckets.set(clientKey, recent);
    return true;
  }

  recent.push(now);
  postRateBuckets.set(clientKey, recent);
  return false;
}

function normalizePostFingerprint(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPostFingerprint(clientKey: string, text: string) {
  return `${clientKey}:${normalizePostFingerprint(text)}`;
}

function isDuplicatePost(clientKey: string, text: string, now = Date.now()) {
  const fingerprint = getPostFingerprint(clientKey, text);
  const lastSeenAt = recentPostFingerprints.get(fingerprint);
  prunePostFingerprints(now);
  return Boolean(lastSeenAt && now - lastSeenAt < DUPLICATE_WINDOW_MS);
}

function rememberPostFingerprint(clientKey: string, text: string, now = Date.now()) {
  prunePostFingerprints(now);
  recentPostFingerprints.set(getPostFingerprint(clientKey, text), now);
}

function prunePostFingerprints(now = Date.now()) {
  for (const [fingerprint, timestamp] of recentPostFingerprints) {
    if (now - timestamp >= DUPLICATE_WINDOW_MS) {
      recentPostFingerprints.delete(fingerprint);
    }
  }
}

function getUnsafeTextReason(text: string) {
  if (/<\/?[a-z][\s\S]*>/i.test(text)) return "html";
  if (/\b(?:https?:\/\/|www\.)\S+/i.test(text)) return "url";
  if (/\b(?:javascript:|data:text\/html|<script)\b/i.test(text)) return "script";
  if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text)) return "email";
  if (/(?:\+?\d[\d\s().-]{7,}\d)/.test(text)) return "phone";
  if (/\b(?:zalo|facebook|instagram|tiktok)\s*[:@]/i.test(text)) {
    return "social-contact";
  }
  return null;
}

async function reportMessage(request: Request, messageId: string) {
  const reporterUserId = await getAuthenticatedChoNeoUserId(request);
  if (!reporterUserId) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_PASS_REQUIRED",
        error: "Vào Chợ Neo và xác nhận thành viên trước khi báo cáo nha.",
        reason: "missing-cho-neo-member",
      },
      { status: 401 }
    );
  }

  const supabase = createChoNeoSupabaseServiceClient();

  if (!supabase) {
    return sharedMemoryUnavailable({
      detail: "Missing Supabase service role key for Cho Neo report tools.",
      operation: "PATCH",
      reason: "missing-service-role",
    });
  }

  const profile = await getVerifiedChoNeoMemberProfile(supabase, reporterUserId);
  if (!profile) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_ACTIVE_PASS_REQUIRED",
        error: "Xác nhận thành viên ngành nail trước khi báo cáo nha.",
        reason: "unverified-cho-neo-member",
      },
      { status: 400 }
    );
  }

  const clientKey = getClientKey(request);
  if (isReportRateLimited(clientKey)) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_REPORT_RATE_LIMITED",
        error: "Con báo cáo hơi nhanh. Nghỉ một nhịp rồi thử lại nha.",
        reason: "report-rate-limited",
      },
      { status: 429 }
    );
  }

  if (isDuplicateReport(reporterUserId, messageId)) {
    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_DUPLICATE_REPORT",
        error: "Câu này đã được báo cáo rồi.",
        reason: "duplicate-report",
      },
      { status: 409 }
    );
  }

  const lookupResult = await lookupMessageForPatch(supabase, messageId, {
    requireVisible: true,
  });

  if (lookupResult.response) {
    return lookupResult.response;
  }

  const currentMessage = lookupResult.message;
  const reportCount =
    typeof currentMessage.report_count === "number"
      ? currentMessage.report_count
      : 0;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      report_count: reportCount + 1,
      reported_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .eq("room_id", FRONT_COUNTER_ROOM_ID)
    .is("hidden_at", null)
    .select(MESSAGE_SELECT);

  if (error) {
    return sharedMemoryUnavailable({
      detail: error.message,
      operation: "PATCH",
      reason: error.code ?? "supabase-report-update-error",
    });
  }

  rememberReportFingerprint(reporterUserId, messageId);

  return publicUpdatedMessageResponse(data as GossipMessageRow[] | null);
}

function isReportRateLimited(clientKey: string, now = Date.now()) {
  const recent = (reportRateBuckets.get(clientKey) ?? []).filter(
    (timestamp) => now - timestamp < REPORT_RATE_LIMIT_WINDOW_MS,
  );
  if (recent.length >= REPORT_RATE_LIMIT_MAX) {
    reportRateBuckets.set(clientKey, recent);
    return true;
  }

  recent.push(now);
  reportRateBuckets.set(clientKey, recent);
  return false;
}

function getReportFingerprint(reporterUserId: string, messageId: string) {
  return `${reporterUserId}:${messageId}`;
}

function isDuplicateReport(
  reporterUserId: string,
  messageId: string,
  now = Date.now(),
) {
  const fingerprint = getReportFingerprint(reporterUserId, messageId);
  const lastSeenAt = recentReportFingerprints.get(fingerprint);
  pruneReportFingerprints(now);
  return Boolean(lastSeenAt && now - lastSeenAt < DUPLICATE_WINDOW_MS);
}

function rememberReportFingerprint(
  reporterUserId: string,
  messageId: string,
  now = Date.now(),
) {
  pruneReportFingerprints(now);
  recentReportFingerprints.set(getReportFingerprint(reporterUserId, messageId), now);
}

function pruneReportFingerprints(now = Date.now()) {
  for (const [fingerprint, timestamp] of recentReportFingerprints) {
    if (now - timestamp >= DUPLICATE_WINDOW_MS) {
      recentReportFingerprints.delete(fingerprint);
    }
  }
}

async function lookupMessageForPatch(
  supabase: { from: (table: string) => any },
  messageId: string,
  options: { requireVisible?: boolean } = {}
): Promise<
  | { message: GossipMessageLookupRow; response?: never }
  | { message?: never; response: NextResponse }
> {
  const idOnlyResult = await supabase
    .from(TABLE_NAME)
    .select("id, room_id, hidden_at, report_count")
    .eq("id", messageId)
    .maybeSingle();
  const idOnlyMessage = idOnlyResult.data as GossipMessageLookupRow | null;

  if (process.env.NODE_ENV === "development") {
    console.info("[cho-neo:gossip-front-counter] PATCH id-only lookup result", {
      error: idOnlyResult.error?.message,
      foundId: idOnlyMessage?.id,
      foundRoomId: idOnlyMessage?.room_id,
      hiddenAt: idOnlyMessage?.hidden_at,
    });
  }

  if (idOnlyResult.error) {
    return {
      response: sharedMemoryUnavailable({
        detail: idOnlyResult.error.message,
        operation: "PATCH",
        reason: idOnlyResult.error.code ?? "supabase-id-lookup-error",
      }),
    };
  }

  if (!idOnlyMessage) {
    return { response: messageNotFoundResponse() };
  }

  let idAndRoomQuery = supabase
    .from(TABLE_NAME)
    .select("id, room_id, hidden_at, report_count")
    .eq("id", messageId)
    .eq("room_id", FRONT_COUNTER_ROOM_ID);

  if (options.requireVisible) {
    idAndRoomQuery = idAndRoomQuery.is("hidden_at", null);
  }

  const idAndRoomResult = await idAndRoomQuery.maybeSingle();
  const idAndRoomMessage =
    idAndRoomResult.data as GossipMessageLookupRow | null;

  if (process.env.NODE_ENV === "development") {
    console.info("[cho-neo:gossip-front-counter] PATCH id + room lookup result", {
      error: idAndRoomResult.error?.message,
      foundId: idAndRoomMessage?.id,
      foundRoomId: idAndRoomMessage?.room_id,
      hiddenAt: idAndRoomMessage?.hidden_at,
      intendedRoomId: FRONT_COUNTER_ROOM_ID,
    });
  }

  if (idAndRoomResult.error) {
    return {
      response: sharedMemoryUnavailable({
        detail: idAndRoomResult.error.message,
        operation: "PATCH",
        reason: idAndRoomResult.error.code ?? "supabase-id-room-lookup-error",
      }),
    };
  }

  if (!idAndRoomMessage) {
    return {
      response: NextResponse.json(
        {
          code: "CHO_NEO_GOSSIP_MESSAGE_ROOM_MISMATCH",
          error: "Gossip Café message was not found in the Front Counter room.",
          foundRoomId: idOnlyMessage.room_id,
          intendedRoomId: FRONT_COUNTER_ROOM_ID,
          reason: "message-room-mismatch",
        },
        { status: 404 }
      ),
    };
  }

  return { message: idAndRoomMessage };
}

async function updateMessageAsHost(input: {
  action: HostModerationAction;
  hostKey: string;
  messageId: string;
}) {
  // V1 scaffold: replace this shared secret with real host auth/session checks
  // before opening broader moderation access.
  if (!isValidHostKey(input.hostKey)) {
    return NextResponse.json({ error: "Host tools are locked." }, { status: 403 });
  }

  const supabase = createChoNeoSupabaseServiceClient();

  if (!supabase) {
    return sharedMemoryUnavailable({
      detail: "Missing Supabase service role key for Cho Neo host tools.",
      operation: "PATCH",
      reason: "missing-service-role",
    });
  }

  const lookupResult = await lookupMessageForPatch(supabase, input.messageId);

  if (lookupResult.response) {
    return lookupResult.response;
  }

  const now = new Date().toISOString();
  const update = getHostModerationUpdate(input.action, now);

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(update)
    .eq("id", input.messageId)
    .eq("room_id", FRONT_COUNTER_ROOM_ID)
    .select(MESSAGE_SELECT);

  if (error) {
    return sharedMemoryUnavailable({
      detail: error.message,
      operation: "PATCH",
      reason: error.code ?? `supabase-${input.action}-update-error`,
    });
  }

  return updatedMessageResponse(data as GossipMessageRow[] | null);
}

type HostModerationAction = "hide" | "markReviewed" | "remove" | "unhide";

function getHostModerationUpdate(action: HostModerationAction, now: string) {
  switch (action) {
    case "hide":
      return { hidden_at: now };
    case "markReviewed":
      return { report_count: 0, reported_at: null };
    case "remove":
      return {
        removed_at: now,
        text: "This message was removed by the village host.",
      };
    case "unhide":
      return { hidden_at: null };
  }
}

function updatedMessageResponse(rows: GossipMessageRow[] | null) {
  if (!rows || rows.length === 0) {
    return messageNotFoundResponse();
  }

  if (rows.length > 1) {
    console.error("[cho-neo:gossip-front-counter]", {
      operation: "PATCH",
      reason: "multiple-messages-updated",
      updatedRows: rows.length,
    });

    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_MULTIPLE_MESSAGES_UPDATED",
        error: "Host tools touched more than one message.",
        reason: "multiple-messages-updated",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: rowToMessage(rows[0]), mode: "shared" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function publicUpdatedMessageResponse(rows: GossipMessageRow[] | null) {
  if (!rows || rows.length === 0) {
    return messageNotFoundResponse();
  }

  if (rows.length > 1) {
    console.error("[cho-neo:gossip-front-counter]", {
      operation: "PATCH",
      reason: "multiple-messages-updated",
      updatedRows: rows.length,
    });

    return NextResponse.json(
      {
        code: "CHO_NEO_GOSSIP_MULTIPLE_MESSAGES_UPDATED",
        error: "Host tools touched more than one message.",
        reason: "multiple-messages-updated",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { message: rowToPublicMessage(rows[0]), mode: "shared" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

function messageNotFoundResponse() {
  return NextResponse.json(
    {
      code: "CHO_NEO_GOSSIP_MESSAGE_NOT_FOUND",
      error: "Gossip Café message was not found.",
      reason: "message-not-found",
    },
    { status: 404 }
  );
}

function isValidHostKey(hostKey: string) {
  return !!process.env.CHO_NEO_HOST_TOOLS_KEY && hostKey === process.env.CHO_NEO_HOST_TOOLS_KEY;
}

function rowToMessage(row: GossipMessageRow): FrontCounterMessage {
  return {
    avatarId: row.avatar_id,
    createdAt: row.created_at,
    hiddenAt: row.hidden_at,
    id: row.id,
    nickname: row.nickname,
    reactions: row.reactions ?? {},
    removedAt: row.removed_at,
    reportCount: row.report_count ?? 0,
    reportedAt: row.reported_at,
    text: row.text,
  };
}

function rowToPublicMessage(row: GossipMessageRow): FrontCounterMessage {
  return {
    avatarId: row.avatar_id,
    createdAt: row.created_at,
    id: row.id,
    nickname: row.nickname,
    reactions: row.reactions ?? {},
    text: row.text,
  };
}

function sharedMemoryUnavailable(input: {
  detail: string;
  operation: "GET" | "PATCH" | "POST";
  reason: string;
}) {
  console.error("[cho-neo:gossip-front-counter]", {
    detail: input.detail,
    operation: input.operation,
    reason: input.reason,
  });

  return NextResponse.json(
    {
      code: "SHARED_GOSSIP_MEMORY_UNAVAILABLE",
      error: "Shared Gossip Café memory is unavailable.",
      reason: input.reason,
    },
    { status: 503 }
  );
}
