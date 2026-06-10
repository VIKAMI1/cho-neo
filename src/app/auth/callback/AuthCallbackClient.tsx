"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

/**
 * Auth callback for Supabase magic-link / OTP flows.
 *
 * Key rules (to avoid the localhost trap):
 * - NEVER build absolute URLs from env here.
 * - Always redirect with relative paths (router.replace("/...")).
 * - Clean the URL without forcing "/" (preserve origin + path).
 */
export default function AuthCallbackClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [msg, setMsg] = useState("Đang đăng nhập…");

  useEffect(() => {
    const supabase = createClient();

    const next = search.get("next") || "/";

    const run = async () => {
      try {
        // Supabase can return either:
        //  - magic link implicit tokens in hash (#access_token=...)
        //  - PKCE code in query (?code=...)
        const url = new URL(window.location.href);
        const hasHashToken = url.hash.includes("access_token");
        const hasCode = url.searchParams.has("code");

        // 1) Consume auth response
        if (hasCode) {
          // Newer PKCE-style flows
          const { error } = await supabase.auth.exchangeCodeForSession(url.href);
          if (error) throw error;
        } else if (hasHashToken) {
          // Older implicit-style flows (supabase-js supports this, but typing varies)
          const authAny = supabase.auth as any;
          const { error } = await authAny.getSessionFromUrl?.({ storeSession: true });
          if (error) throw error;
        } else {
          setMsg("Không thấy token đăng nhập. Thử đăng nhập lại nha.");
          setTimeout(() => router.replace("/login"), 900);
          return;
        }

        // 2) Clean URL (remove code/hash) WITHOUT changing origin (no localhost)
        window.history.replaceState({}, "", `${url.origin}${url.pathname}`);

        // 3) Go to next page (relative only)
        router.replace(next.startsWith("/") ? next : "/");
      } catch (e: any) {
        console.error("Auth callback failed:", e);
        setMsg(
          `Đăng nhập bị lỗi. Quay lại trang login thử lại nha. (${e?.message ?? "unknown"})`
        );
        setTimeout(() => router.replace("/login"), 1200);
      }
    };

    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once; using relative redirects avoids env/origin confusion

  return (
    <main className="min-h-screen bg-[#fbf7ef] flex items-center justify-center">
      <div className="rounded-2xl border border-zinc-200 bg-white/85 shadow-sm px-5 py-4">
        <div className="text-sm text-zinc-700">{msg}</div>
      </div>
    </main>
  );
}
