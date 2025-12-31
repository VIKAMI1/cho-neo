import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Server-side Supabase client (anon role)
const supabase = createClient(supabaseUrl, supabaseAnon);

type SpaceKey = "vent" | "brag";

export async function GET() {
  const { data, error } = await supabase
    .from("posts")
    .select("id, body, created_at, space")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data }, { status: 200 });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => ({}));
  const rawBody = (json.body ?? "").toString();
  const rawSpace = (json.space ?? "").toString();

  const body = rawBody.trim();
  const space: SpaceKey = rawSpace === "brag" ? "brag" : "vent"; // default → vent

  if (!body) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }

  // For now we keep your auth check as-is
  const auth = await supabase.auth.getUser();

  if (!auth.data.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { error } = await supabase.from("posts").insert({
    user_id: auth.data.user.id,
    body,
    space,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
