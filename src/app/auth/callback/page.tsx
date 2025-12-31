"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [msg, setMsg] = useState("Đang đăng nhập…");

  useEffect(() => {
    const supabase = createClient();

    const run = async () => {
      try {
        // Handles both:
        //  - Implicit flow (#access_token=...)
        //  - PKCE flow (?code=...)
        const hasHashToken =
          typeof window !== "undefined" &&
          window.location.hash.includes("access_token");

        const hasCode =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("code");

        const authAny = supabase.auth as any;

        if (hasHashToken) {
          const { error } = await authAny.getSessionFromUrl({
            storeSession: true,
          });
          if (error) throw error;

          // Clean URL
          window.history.replaceState({}, "", "/");
        } else if (hasCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(
            window.location.href
          );
          if (error) throw error;

          // Clean URL
          window.history.replaceState({}, "", "/");
        } else {
          // Nothing to consume
          setMsg("Không thấy token đăng nhập. Thử đăng nhập lại nha.");
          setTimeout(() => router.replace("/login"), 900);
          return;
        }

        router.replace("/");
      } catch (e: any) {
        console.error("Auth callback failed:", e);
        setMsg(
          `Đăng nhập bị lỗi. Quay lại trang login thử lại nha. (${e?.message ?? "unknown"})`
        );
        setTimeout(() => router.replace("/login"), 1200);
      }
    };

    void run();
  }, [router]);

  return (
    <main className="min-h-screen bg-[#fbf7ef] flex items-center justify-center">
      <div className="rounded-2xl border border-zinc-200 bg-white/85 shadow-sm px-5 py-4">
        <div className="text-sm text-zinc-700">{msg}</div>
      </div>
    </main>
  );
}
