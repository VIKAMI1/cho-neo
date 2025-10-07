"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-browser";

type Post = { id: number; body: string; created_at: string };

export default function Home() {
  const supabase = createClient();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");

  useEffect(() => {
    let mounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUserEmail(data.user?.email ?? null);
    });

    const load = async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, body, created_at")
        .order("created_at", { ascending: false });
      if (mounted) setPosts(data ?? []);
    };
    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getUser().then(({ data }) =>
        setUserEmail(data.user?.email ?? null)
      );
      load();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const addPost = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    // call our server route (this runs lilt on the server)
    const r = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body: trimmed }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      alert(j.error || `Failed (${r.status})`);
      return;
    }

    setBody("");
    // reload posts after successful insert
    const { data } = await supabase
      .from("posts")
      .select("id, body, created_at")
      .order("created_at", { ascending: false });
    setPosts(data ?? []);
  };

  const refreshPosts = async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("id, body, created_at")
      .order("created_at", { ascending: false });
    if (error) alert(error.message);
    else setPosts(data ?? []);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">VIKAMI Chợ (MVP + lilt)</h1>
        {userEmail ? (
          <button className="text-sm underline" onClick={signOut}>
            Sign out
          </button>
        ) : (
          <Link className="text-sm underline" href="/login">
            Sign in
          </Link>
        )}
      </header>

      {userEmail && (
        <div className="flex gap-2">
          <input
            className="border p-2 flex-1"
            placeholder="Post something…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPost()}
          />
          <button className="border px-4" onClick={addPost}>Post</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Latest posts</h2>
        <button className="text-sm underline" onClick={refreshPosts}>
          Refresh
        </button>
      </div>

      <section className="space-y-3">
        {posts.length === 0 && <div className="opacity-60">No posts yet.</div>}
        {posts.map((p) => (
          <article key={p.id} className="border p-3 rounded">
            <div className="text-sm opacity-70">
              {new Date(p.created_at).toLocaleString()}
            </div>
            <div>{p.body}</div>
          </article>
        ))}
      </section>
    </main>
  );
}
