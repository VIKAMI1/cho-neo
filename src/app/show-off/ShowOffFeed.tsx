"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function supabaseBrowser() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

type FeedPost = {
  id: string;
  user_id: string;
  created_at: string;
  caption: string | null;
  expires_at: string;
  media: Array<{ id: string; sort_order: number; url: string }>;
  fire_count: number;
  nail_count: number;
  eyes_count: number;
};

const EMOJIS = ["🔥", "💅", "👀"] as const;

export default function ShowOffFeed() {
  const supabase = useMemo(() => supabaseBrowser(), []);
  const [feed, setFeed] = useState<FeedPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadFeed() {
    const { data, error } = await supabase
      .from("showoff_feed")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    setFeed((data ?? []) as unknown as FeedPost[]);
  }

  useEffect(() => {
    loadFeed().catch((e) => setError(e?.message ?? "Failed to load."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function react(post_id: string, emoji: (typeof EMOJIS)[number]) {
    setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in to react.");

      const user_id = u.user.id;

      const ins = await supabase.from("showoff_reactions").insert([{ post_id, user_id, emoji }]);
      if (ins.error) {
        // toggle off
        const del = await supabase
          .from("showoff_reactions")
          .delete()
          .eq("post_id", post_id)
          .eq("user_id", user_id)
          .eq("emoji", emoji);
        if (del.error) throw del.error;
      }

      await loadFeed();
    } catch (e: any) {
      setError(e?.message ?? "Reaction failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Show-Off</h1>
          <p className="text-sm opacity-80">Reactions only. Keep it clean.</p>
        </div>

        <a className="rounded-xl border px-4 py-2 text-sm shadow-sm" href="/show-off/new">
          New Post
        </a>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm">{error}</div>}

      <div className="space-y-4">
        {feed.length === 0 ? (
          <div className="rounded-2xl border p-6 text-sm opacity-80">No Show-Off posts yet.</div>
        ) : (
          feed.map((p) => (
            <div key={p.id} className="rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs opacity-70">{new Date(p.created_at).toLocaleString()}</div>
                <div className="text-xs opacity-70">expires {new Date(p.expires_at).toLocaleDateString()}</div>
              </div>

              {p.media?.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {p.media.slice(0, 3).map((m) => (
                    <div key={m.id} className="relative aspect-square overflow-hidden rounded-xl border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.url} alt="showoff" className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {p.caption && <div className="mt-3 text-sm">{p.caption}</div>}

              <div className="mt-4 flex items-center gap-2 text-sm">
                <button onClick={() => react(p.id, "🔥")} className="rounded-xl border px-3 py-1">
                  🔥 {p.fire_count ?? 0}
                </button>
                <button onClick={() => react(p.id, "💅")} className="rounded-xl border px-3 py-1">
                  💅 {p.nail_count ?? 0}
                </button>
                <button onClick={() => react(p.id, "👀")} className="rounded-xl border px-3 py-1">
                  👀 {p.eyes_count ?? 0}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
