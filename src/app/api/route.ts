import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";
import { runLilt, makeServerEnv } from "@/lib/lilt";

const RULE = `(and (is-signed-in) (< (profiles-count) 8888))`;

export async function POST(req: Request) {
  const supa = await createServerSupabase();
  const { data: { user } } = await supa.auth.getUser();
  const { body } = (await req.json()) as { body: string };

  const env = { userId: user?.id ?? null, supabase: await makeServerEnv() };
  const ok = await runLilt(RULE, env as any);
  if (!ok) return NextResponse.json({ error: "Rule denied" }, { status: 403 });

  if (!user || !body?.trim()) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const { error } = await supa
    .from("posts")
    .insert({ body: body.trim(), author_id: user.id });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true }, { status: 200 });
}
