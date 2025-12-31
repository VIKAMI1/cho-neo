// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import { XinXamButton } from "@/components/XinXamButton";
import ShowOffFeed from "@/app/show-off/ShowOffFeed";
import ShowOffUploader from "@/app/show-off/new/ShowOffUploader";

type SpaceKey = "vent" | "brag";

type Post = {
  id: number;
  body: string;
  created_at: string;
  space: SpaceKey;
  user_id: string;
  hidden: boolean;
};

type Reply = {
  id: number;
  post_id: number;
  body: string;
  created_at: string;
  user_id: string;
  hidden: boolean;
};

type WorkerQuote = {
  id: string;
  tag?: string;
  text: string;
};

type OngDiaStrip = {
  date: string;
  quote: WorkerQuote;
  draw_index: 0 | 1;
  refresh_remaining: 0 | 1;
  message?: string;
};

type Mood = "chill" | "warning" | "hustle";

const supabase = createClient();

const SPACE_META: Record<
  SpaceKey,
  { title: string; subtitle: string; placeholder: string }
> = {
  vent: {
    title: "Góc Xả Hơi",
    subtitle:
      "Xả nhẹ cho đỡ nặng lòng. Không tên thật, không số phone, không địa chỉ.",
    placeholder: "Nói một câu cho nhẹ người…",
  },
  brag: {
    title: "Show Off",
    subtitle:
      "Khoe bộ móng, góc tiệm, đồ nghề. Khoe để vui, không khoe để hơn thua.",
    placeholder: "Hôm nay muốn khoe gì nè…",
  },
};

const MOOD_LABEL: Record<Mood, string> = {
  chill: "Chợ khá chill",
  warning: "Chợ hơi căng",
  hustle: "Chợ máu lửa",
};

const MOOD_CLASSES: Record<Mood, string> = {
  chill: "bg-emerald-50 text-emerald-800 border-emerald-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  hustle: "bg-orange-50 text-orange-900 border-orange-200",
};

function tagToMood(tag?: string): Mood {
  const t = (tag ?? "").toLowerCase();
  if (t.includes("hustle")) return "hustle";
  if (t.includes("boundary") || t.includes("drama") || t.includes("warning"))
    return "warning";
  return "chill";
}

function shortId(uid: string) {
  return uid ? `${uid.slice(0, 6)}…` : "ẩn danh…";
}

function fmtUtc(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function getOrCreateVisitorId(): string {
  try {
    const existing = localStorage.getItem("od_vid");
    if (existing) return existing;
    const v =
      (globalThis.crypto?.randomUUID?.() ??
        `vid_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem("od_vid", v);
    return v;
  } catch {
    return "dev";
  }
}

export default function Home() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const [activeSpace, setActiveSpace] = useState<SpaceKey>("vent");
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");

  // Ông Địa
  const [strip, setStrip] = useState<OngDiaStrip | null>(null);
  const [stripLoading, setStripLoading] = useState(true);
  const [stripErr, setStripErr] = useState<string | null>(null);

  // Replies
  const [repliesMap, setRepliesMap] = useState<Record<number, Reply[]>>({});
  const [openPostId, setOpenPostId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loadingRepliesFor, setLoadingRepliesFor] = useState<number | null>(
    null
  );

  const isSignedIn = !!userEmail;

  // -------------------------
  // Ông Địa “Grant a Wish” (ephemeral)
  // -------------------------
  const WISH_KEY = "choNeo.wish.v1";
  const [wishDraft, setWishDraft] = useState("");
  const [wishBlessed, setWishBlessed] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(WISH_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { wishBlessed?: string | null };
      if (parsed?.wishBlessed) setWishBlessed(parsed.wishBlessed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify({ wishBlessed }));
    } catch {
      // ignore
    }
  }, [wishBlessed]);

  const blessWish = () => {
    const w = wishDraft.trim();
    if (!w) return;
    setWishBlessed(w);
    setWishDraft("");
  };

  const confirmWish = () => {
    setWishBlessed(null);
    try {
      localStorage.removeItem(WISH_KEY);
    } catch {
      // ignore
    }
  };

  const mood = useMemo(() => tagToMood(strip?.quote?.tag), [strip]);

  const moodLabel = useMemo(() => {
    if (!strip) return "Chợ đang coi quẻ";
    return MOOD_LABEL[mood];
  }, [strip, mood]);

  const moodClasses = useMemo(() => {
    if (!strip) return "bg-zinc-50 text-zinc-700 border-zinc-200";
    return MOOD_CLASSES[mood];
  }, [strip, mood]);

  async function fetchPosts(space: SpaceKey) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, body, created_at, space, user_id, hidden")
      .eq("space", space)
      .eq("hidden", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading posts:", error);
      return;
    }

    setPosts((data ?? []) as Post[]);
  }

  async function fetchStrip(refresh = false) {
    setStripLoading(true);
    setStripErr(null);

    try {
      const base = process.env.NEXT_PUBLIC_OD_BASE;
      if (!base) throw new Error("Missing NEXT_PUBLIC_OD_BASE");

      const visitorId = getOrCreateVisitorId();
      const path = refresh ? "/od/refresh" : "/od/today";
      const url = `${base}${path}?visitor_id=${encodeURIComponent(visitorId)}`;

      const res = await fetch(url, {
        method: refresh ? "POST" : "GET",
        headers: { "content-type": "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Ông Địa API failed ${res.status}: ${text}`);
      }

      const data = (await res.json()) as OngDiaStrip;
      setStrip(data ?? null);
    } catch (err: any) {
      console.log("Ông Địa strip load issue:", err);
      setStrip(null);
      setStripErr(err?.message ?? "Ông Địa bị nghẽn.");
    } finally {
      setStripLoading(false);
    }
  }

  async function fetchReplies(postId: number) {
    setLoadingRepliesFor(postId);
    try {
      const { data, error } = await supabase
        .from("post_replies")
        .select("id, post_id, body, created_at, user_id, hidden")
        .eq("post_id", postId)
        .eq("hidden", false)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading replies:", error);
        return;
      }

      setRepliesMap((prev) => ({ ...prev, [postId]: (data ?? []) as Reply[] }));
    } finally {
      setLoadingRepliesFor(null);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !data.user) {
        setUserEmail(null);
        setUserId(null);
      } else {
        setUserEmail(data.user.email ?? null);
        setUserId(data.user.id);
      }

      await fetchStrip(false);
      await fetchPosts(activeSpace);
    }

    void init();

    const { data: authSub } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        setUserEmail(session?.user?.email ?? null);
        setUserId(session?.user?.id ?? null);
        void fetchPosts(activeSpace);
      }
    );

    const channel = supabase
      .channel("live:posts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: any) => {
          if (!mounted) return;
          const p = payload.new as Post;
          if (!p?.space) return;
          if (p.space !== activeSpace) return;
          if (p.hidden) return;
          setPosts((prev) => [p, ...prev]);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      authSub?.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [activeSpace]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    setUserId(null);
    setPosts([]);
    setRepliesMap({});
    setOpenPostId(null);
  };

  const addPost = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return;

    const { error } = await supabase.from("posts").insert({
      body: trimmed,
      space: activeSpace,
      user_id: data.user.id,
    });

    if (error) {
      console.error("Error inserting post:", error);
      return;
    }

    setBody("");
  };

  const refreshPosts = async () => fetchPosts(activeSpace);

  const toggleReplies = async (postId: number) => {
    if (openPostId === postId) {
      setOpenPostId(null);
      setReplyBody("");
      return;
    }
    setOpenPostId(postId);
    setReplyBody("");
    if (!repliesMap[postId]) await fetchReplies(postId);
  };

  const addReply = async (postId: number) => {
    const trimmed = replyBody.trim();
    if (!trimmed) return;

    const { data, error: userError } = await supabase.auth.getUser();
    if (userError || !data.user) return;

    const { data: inserted, error } = await supabase
      .from("post_replies")
      .insert({
        post_id: postId,
        body: trimmed,
        user_id: data.user.id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Error inserting reply:", error);
      return;
    }

    setReplyBody("");
    setRepliesMap((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] ?? []), inserted as Reply],
    }));
  };

  const hidePost = async (p: Post) => {
    const { error } = await supabase
      .from("posts")
      .update({ hidden: true })
      .eq("id", p.id)
      .eq("user_id", p.user_id);

    if (error) {
      console.error("Error hiding post:", error);
      return;
    }

    setPosts((prev) => prev.filter((x) => x.id !== p.id));
    setRepliesMap((prev) => {
      const copy = { ...prev };
      delete copy[p.id];
      return copy;
    });
    if (openPostId === p.id) setOpenPostId(null);
  };

  const hideReply = async (r: Reply) => {
    const { error } = await supabase
      .from("post_replies")
      .update({ hidden: true })
      .eq("id", r.id)
      .eq("user_id", r.user_id);

    if (error) {
      console.error("Error hiding reply:", error);
      return;
    }

    setRepliesMap((prev) => {
      const list = prev[r.post_id] ?? [];
      return { ...prev, [r.post_id]: list.filter((x) => x.id !== r.id) };
    });
  };

  const refreshDisabled =
    stripLoading || (strip?.refresh_remaining ?? 1) === 0;

  return (
    <main className="min-h-screen bg-[#fbf7ef] text-zinc-900">
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:18px_18px]" />

      <div className="relative mx-auto max-w-3xl px-4 py-8 md:py-10 space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Chợ Neo
              </h1>
              <span className="text-[11px] px-2 py-1 rounded-full border border-zinc-200 bg-white/70 text-zinc-700">
                beta nội bộ
              </span>
            </div>
            <p className="text-sm text-zinc-600">
              Chợ nhỏ cho xả hơi &amp; show off nhẹ — kiểu người Việt mình.
            </p>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {isSignedIn && (
              <Link className="underline text-zinc-700" href="/profile">
                Profile
              </Link>
            )}
            {isSignedIn ? (
              <button className="underline text-zinc-700" onClick={signOut}>
                Sign out
              </button>
            ) : (
              <Link className="underline text-zinc-700" href="/login">
                Sign in
              </Link>
            )}
          </div>
        </header>

        {/* Ông Địa */}
        <section className="rounded-2xl border border-zinc-200 bg-white/80 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center overflow-hidden">
                <Image
                  src="/ong-dia.png"
                  alt="Ông Địa"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Ông Địa nói gì hôm nay
                  </p>
                  <span
                    className={`text-[11px] px-2 py-1 rounded-full border ${moodClasses}`}
                  >
                    {moodLabel}
                  </span>
                </div>

                {stripLoading ? (
                  <p className="text-sm text-zinc-500">Đang coi quẻ…</p>
                ) : strip ? (
                  <div className="space-y-2">
                    <p className="text-base font-semibold leading-snug">
                      {strip.quote?.text ?? "…"}
                    </p>

                    <div className="text-[11px] text-zinc-500">
                      {strip.refresh_remaining === 0
                        ? "Hôm nay hết refresh."
                        : "Bạn còn 1 refresh hôm nay."}
                    </div>

                    {strip.message && (
                      <div className="text-xs text-zinc-600">
                        {strip.message}
                      </div>
                    )}

                    <p className="text-[11px] text-zinc-500">
                      Gợi ý cảm xúc thôi nha. Không thay bác sĩ, luật sư, hay
                      quyết định của bạn.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-zinc-600">
                      Hôm nay chưa có quẻ. Ráng thở sâu, uống nước và tự chọn
                      vibe cho mình.
                    </p>
                    {stripErr && (
                      <p className="text-xs text-red-600">{stripErr}</p>
                    )}
                  </div>
                )}

                {/* Wish ritual */}
                <div className="pt-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                    Xin Ông Địa ban lộc{wishBlessed ? " ✨" : ""}
                  </div>

                  {wishBlessed ? (
                    <div className="mt-2 rounded-xl border border-zinc-200 bg-[#fffdf8] p-3">
                      <div className="text-sm text-zinc-800">
                        “{wishBlessed}”
                      </div>

                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={confirmWish}
                          className="text-xs px-3 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
                        >
                          Đã nhận – cho tan đi
                        </button>
                        <button
                          onClick={() => setWishBlessed(null)}
                          className="text-xs px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
                        >
                          Đổi ý
                        </button>
                      </div>

                      <div className="mt-2 text-[11px] text-zinc-500">
                        Bấm “Đã nhận” để kết lời xin. Ông Địa nghe rồi đó — quẻ khép lại.
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input
                        value={wishDraft}
                        onChange={(e) => setWishDraft(e.target.value)}
                        placeholder="Vái Ông Địa: cho con xin một điều…"
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                      />
                      <button
                        onClick={blessWish}
                        className="text-xs px-3 py-2 rounded-xl bg-zinc-900 text-white hover:bg-zinc-800"
                      >
                        Xin
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex md:flex-col gap-2 md:items-end">
              <XinXamButton className="text-[12px]" />
              <button
                onClick={() => void fetchStrip(true)}
                disabled={refreshDisabled}
                className={`text-[12px] px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 ${
                  refreshDisabled ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                Refresh quẻ
              </button>
            </div>
          </div>

          <div className="px-4 md:px-5 py-3 border-t border-zinc-200 bg-gradient-to-r from-emerald-50/70 via-amber-50/70 to-orange-50/70">
            <p className="text-xs text-zinc-700">
              Luật chợ: <span className="font-semibold">không doxx</span> • không
              số phone • không địa chỉ • không kéo hội đồng.
            </p>
          </div>
        </section>

        {/* Board */}
        <section className="rounded-2xl border border-zinc-200 bg-white/80 shadow-sm overflow-hidden">
          <div className="px-4 md:px-5 pt-4">
            <div className="flex items-center gap-2">
              {(["vent", "brag"] as SpaceKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveSpace(k)}
                  className={`px-4 py-2 rounded-xl text-sm border transition ${
                    activeSpace === k
                      ? "bg-zinc-900 text-white border-zinc-900"
                      : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {SPACE_META[k].title}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-3">
                <button
                  className="text-sm underline text-zinc-600 hover:text-zinc-900"
                  onClick={refreshPosts}
                >
                  Refresh
                </button>
              </div>
            </div>

            <p className="mt-3 text-sm text-zinc-600">
              {SPACE_META[activeSpace].subtitle}
            </p>
          </div>

          {/* Composer (THIS was broken before because a nested return got pasted here) */}
          <div className="px-4 md:px-5 py-4">
            {isSignedIn ? (
              activeSpace === "brag" ? (
                <>
                  <p className="text-xs opacity-70">
                    Tip: khoe để vui. 1–3 ảnh, gọn, sạch.
                  </p>
                  <div className="space-y-4 mt-3">
                    <ShowOffUploader />
                    <ShowOffFeed />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs opacity-70">
                    Tip: viết như nói chuyện ngoài tiệm. Ngắn, thật, không ác.
                  </p>

                  <div className="rounded-2xl border border-zinc-200 bg-[#fffdf8] p-3 md:p-4 mt-3">
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                        placeholder={SPACE_META[activeSpace].placeholder}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addPost()}
                      />
                      <button
                        className="rounded-xl px-4 py-3 text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800"
                        onClick={addPost}
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </>
              )
            ) : (
              <div className="rounded-2xl border border-zinc-200 bg-[#fffdf8] p-4 text-sm text-zinc-700">
                Bạn cần{" "}
                <Link className="underline font-semibold" href="/login">
                  Sign in
                </Link>{" "}
                để đăng bài và trả lời.
              </div>
            )}
          </div>

          <div className="px-4 md:px-5 pb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">
                {SPACE_META[activeSpace].title} — latest
              </h2>
              <span className="text-xs text-zinc-500">{posts.length} bài</span>
            </div>

            <div className="space-y-3">
              {posts.length === 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600">
                  Chưa có ai nói gì ở đây. Bạn mở hàng một câu đi.
                </div>
              )}

              {posts.map((p) => {
                const replies = repliesMap[p.id] ?? [];
                const isOpen = openPostId === p.id;

                return (
                  <article
                    key={p.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs text-zinc-500">
                          {fmtUtc(p.created_at)} — by {shortId(p.user_id)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          className="text-xs underline text-zinc-600 hover:text-zinc-900"
                          onClick={() => toggleReplies(p.id)}
                        >
                          {isOpen ? "Ẩn trả lời" : `Trả lời (${replies.length})`}
                        </button>

                        {p.user_id === userId && (
                          <button
                            className="text-xs underline text-zinc-400 hover:text-zinc-700"
                            onClick={() => hidePost(p)}
                          >
                            Hide
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {p.body}
                    </div>

                    {isOpen && (
                      <div className="mt-4 rounded-2xl border border-zinc-200 bg-[#fffdf8] p-3">
                        {loadingRepliesFor === p.id && (
                          <div className="text-xs text-zinc-500">
                            Đang tải trả lời…
                          </div>
                        )}

                        {replies.length === 0 &&
                          loadingRepliesFor !== p.id && (
                            <div className="text-xs text-zinc-500">
                              Chưa ai trả lời bài này.
                            </div>
                          )}

                        <div className="mt-2 space-y-2">
                          {replies.map((r) => (
                            <div
                              key={r.id}
                              className="rounded-xl border border-zinc-200 bg-white p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-xs text-zinc-500">
                                  {fmtUtc(r.created_at)} — by {shortId(r.user_id)}
                                </div>
                                {r.user_id === userId && (
                                  <button
                                    className="text-xs underline text-zinc-400 hover:text-zinc-700"
                                    onClick={() => hideReply(r)}
                                  >
                                    Hide
                                  </button>
                                )}
                              </div>
                              <div className="mt-1 text-sm whitespace-pre-wrap break-words">
                                {r.body}
                              </div>
                            </div>
                          ))}
                        </div>

                        {isSignedIn && (
                          <div className="mt-3 flex gap-2">
                            <input
                              className="flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                              placeholder="Trả lời nhẹ nhàng…"
                              value={replyBody}
                              onChange={(e) => setReplyBody(e.target.value)}
                              onKeyDown={(e) =>
                                e.key === "Enter" && addReply(p.id)
                              }
                            />
                            <button
                              className="rounded-xl px-4 py-2 text-sm font-semibold bg-zinc-900 text-white hover:bg-zinc-800"
                              onClick={() => addReply(p.id)}
                            >
                              Gửi
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <footer className="text-xs text-zinc-500 pt-2">
          Powered by hustle, grit, and just a touch of GPT.
        </footer>
      </div>
    </main>
  );
}
