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

export const dynamic = "force-dynamic";

type GossipMessageRow = {
  avatar_id: string;
  created_at: string;
  id: string;
  nickname: string;
  reactions: FrontCounterMessage["reactions"] | null;
  text: string;
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

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("id, avatar_id, nickname, text, reactions, created_at")
    .eq("room_id", FRONT_COUNTER_ROOM_ID)
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .limit(FRONT_COUNTER_MESSAGE_CAP);

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
    .select("id, avatar_id, nickname, text, reactions, created_at")
    .single();

  if (error) {
    return sharedMemoryUnavailable({
      detail: error.message,
      operation: "POST",
      reason: error.code ?? "supabase-insert-error",
    });
  }

  return NextResponse.json(
    { message: rowToMessage(data as GossipMessageRow), mode: "shared" },
    { headers: { "Cache-Control": "no-store" }, status: 201 }
  );
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

function rowToMessage(row: GossipMessageRow): FrontCounterMessage {
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
  operation: "GET" | "POST";
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
