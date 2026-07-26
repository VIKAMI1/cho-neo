import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  SupabaseRoomVoteRepository,
  type ChoNeoRoomVoteRepository,
} from "@/lib/cho-neo/room-vote-repository";
import {
  createRoomVoteApplication,
  type RoomVotePostBody,
} from "@/lib/cho-neo/room-vote-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const app = createRoomVoteApplication({
    hashSecret: getRoomVoteHashSecret(),
    repository: createRoomVoteRepository(),
  });
  const result = await app.get(request.headers.get("x-cho-neo-room-vote-token"));

  return NextResponse.json(result.body, {
    headers: { "Cache-Control": "no-store" },
    status: result.status,
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RoomVotePostBody | null;
  const app = createRoomVoteApplication({
    hashSecret: getRoomVoteHashSecret(),
    repository: createRoomVoteRepository(),
  });
  const result = await app.post(body ?? {});

  return NextResponse.json(result.body, {
    headers: { "Cache-Control": "no-store" },
    status: result.status,
  });
}

function createRoomVoteRepository(): ChoNeoRoomVoteRepository {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new MissingRoomVoteRepository();
  }

  return new SupabaseRoomVoteRepository(
    createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
      },
    }),
  );
}

function getRoomVoteHashSecret() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

class MissingRoomVoteRepository implements ChoNeoRoomVoteRepository {
  async listVotes(): ReturnType<ChoNeoRoomVoteRepository["listVotes"]> {
    throw new Error("room-vote-missing-supabase-config");
  }

  async findSelection(): ReturnType<ChoNeoRoomVoteRepository["findSelection"]> {
    throw new Error("room-vote-missing-supabase-config");
  }

  async upsertVote(): ReturnType<ChoNeoRoomVoteRepository["upsertVote"]> {
    throw new Error("room-vote-missing-supabase-config");
  }
}
