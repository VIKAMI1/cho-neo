import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHO_NEO_AVATARS,
  isValidVillageNickname,
} from "@/lib/cho-neo/avatar-identity";
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
const SUPABASE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

type GossipMessageRow = {
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

export async function GET() {
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
    .map(rowToMessage);

  return NextResponse.json(
    { messages, mode: "shared" },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const supabase = createChoNeoSupabaseClient();

  if (!supabase) {
    return sharedMemoryUnavailable({
      detail: "Missing Supabase URL or key for Cho Neo shared memory.",
      operation: "POST",
      reason: "missing-env",
    });
  }

  const body = await request.json().catch(() => null);
  const avatarId = typeof body?.avatarId === "string" ? body.avatarId.trim() : "";
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";
  const text = typeof body?.text === "string" ? body.text.trim() : "";

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

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      avatar_id: avatarId,
      nickname,
      reactions: {},
      room_id: FRONT_COUNTER_ROOM_ID,
      text,
    })
    .select(LEGACY_MESSAGE_SELECT)
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

  return NextResponse.json(
    { message: rowToMessage(savedRow), mode: "shared" },
    { headers: { "Cache-Control": "no-store" }, status: 201 }
  );
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
    return reportMessage(messageId);
  }

  if (action === "hide" || action === "remove") {
    return updateMessageAsHost({
      action,
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

async function reportMessage(messageId: string) {
  const supabase = createChoNeoSupabaseServiceClient();

  if (!supabase) {
    return sharedMemoryUnavailable({
      detail: "Missing Supabase service role key for Cho Neo report tools.",
      operation: "PATCH",
      reason: "missing-service-role",
    });
  }

  const lookupResult = await lookupMessageForPatch(supabase, messageId);

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

  return updatedMessageResponse(data as GossipMessageRow[] | null);
}

async function lookupMessageForPatch(
  supabase: { from: (table: string) => any },
  messageId: string
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

  const idAndRoomResult = await supabase
    .from(TABLE_NAME)
    .select("id, room_id, hidden_at, report_count")
    .eq("id", messageId)
    .eq("room_id", FRONT_COUNTER_ROOM_ID)
    .is("hidden_at", null)
    .maybeSingle();
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
  action: "hide" | "remove";
  hostKey: string;
  messageId: string;
}) {
  // V1 scaffold: replace this shared secret with real host auth/session checks
  // before opening broader moderation access.
  if (!process.env.CHO_NEO_HOST_TOOLS_KEY || input.hostKey !== process.env.CHO_NEO_HOST_TOOLS_KEY) {
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
  const update =
    input.action === "hide"
      ? { hidden_at: now }
      : { removed_at: now, text: "This message was removed by the village host." };

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
      detail: input.detail,
      error: "Shared Gossip Café memory is unavailable.",
      reason: input.reason,
    },
    { status: 503 }
  );
}
