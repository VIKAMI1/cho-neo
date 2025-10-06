import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { runLilt, makeServerEnv } from "@/lib/lilt";

const POST_RULE = `(and (is-signed-in) (< (profiles-count) 8888))`;

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, body, created_at")
    .order("created_at", { ascending: false });

  async function addPost(formData: FormData) {
    "use server";
    const supa = await createServerSupabase();
    const { data: { user } } = await supa.auth.getUser();

    const env = { userId: user?.id ?? null, supabase: await makeServerEnv() };
    const ok = await runLilt(POST_RULE, env as any);
    if (!ok) throw new Error("Rule denied: sign in or member cap reached.");

    const body = String(formData.get("body") || "").trim();
    if (!body) return;

    await supa.from("posts").insert({ body, author_id: user!.id });
    revalidatePath("/");
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VIKAMI Chợ (MVP + lilt)</h1>
        {user ? (
          <form action={async () => { "use server";
            const s = await createServerSupabase();
            await s.auth.signOut();
          }}>
            <button className="text-sm underline">Sign out</button>
          </form>
        ) : <a className="text-sm underline" href="/login">Sign in</a>}
      </header>

      {user && (
        <form action={addPost} className="flex gap-2">
          <input name="body" placeholder="Post something…" className="border p-2 flex-1" />
          <button className="border px-4">Post</button>
        </form>
      )}

      <section className="space-y-3">
        {(posts ?? []).map(p => (
          <article key={p.id} className="border p-3 rounded">
            <div className="text-sm opacity-70">{new Date(p.created_at).toLocaleString()}</div>
            <div>{p.body}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
