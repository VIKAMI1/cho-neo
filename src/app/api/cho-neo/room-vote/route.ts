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
  const result = await app.get(await getAuthenticatedChoNeoUserId(request));

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
  const result = await app.post(body ?? {}, await getAuthenticatedChoNeoUserId(request));

  return NextResponse.json(result.body, {
    headers: { "Cache-Control": "no-store" },
    status: result.status,
  });
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
  async findActiveMemberProfile(): ReturnType<
    ChoNeoRoomVoteRepository["findActiveMemberProfile"]
  > {
    throw new Error("room-vote-missing-supabase-config");
  }

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
