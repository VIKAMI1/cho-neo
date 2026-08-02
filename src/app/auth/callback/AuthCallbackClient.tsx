"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

/**
 * Auth callback for Supabase OAuth PKCE flows.
 *
 * Key rules (to avoid the localhost trap):
 * - NEVER build absolute URLs from env here.
 * - Always redirect with relative paths (router.replace("/...")).
 * - Clean the URL without forcing "/" (preserve origin + path).
 * - Do not accept implicit access tokens in the visible URL.
 */
export default function AuthCallbackClient() {
  const router = useRouter();
  const search = useSearchParams();
  const [msg, setMsg] = useState("Đang đăng nhập…");
  const didRunRef = useRef(false);

  useEffect(() => {
    if (didRunRef.current) return;
    didRunRef.current = true;

    const supabase = createClient();

    const next = getSafeReturnTo(search.get("next"));

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hasVisibleToken =
          url.hash.includes("access_token") ||
          url.hash.includes("refresh_token") ||
          url.searchParams.has("access_token") ||
          url.searchParams.has("refresh_token");

        if (code) {
          const { data, error } =
            await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (!data.session?.user) {
            throw new Error("oauth-session-missing");
          }
        } else if (hasVisibleToken) {
          cleanCallbackUrl(url);
          setMsg("Đường đăng nhập cũ không dùng được. Mở Google lại giúp Chợ Neo nha.");
          setTimeout(() => router.replace(`/login?next=${encodeURIComponent(next)}`), 900);
          return;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session?.user) {
            setMsg("Không thấy mã đăng nhập. Thử đăng nhập lại nha.");
            setTimeout(() => router.replace(`/login?next=${encodeURIComponent(next)}`), 900);
            return;
          }
        }

        cleanCallbackUrl(url);
        router.replace(next);
      } catch (e: any) {
        console.error("Auth callback failed:", e?.message ?? "unknown");
        setMsg(
          `Đăng nhập bị lỗi. Quay lại trang login thử lại nha. (${e?.message ?? "unknown"})`
        );
        setTimeout(() => router.replace(`/login?next=${encodeURIComponent(next)}`), 1200);
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

function cleanCallbackUrl(url: URL) {
  window.history.replaceState({}, "", `${url.origin}${url.pathname}`);
}

export function getSafeReturnTo(value: string | null) {
  if (!value) return "/cho-neo";
  if (!value.startsWith("/") || value.startsWith("//")) return "/cho-neo";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "/cho-neo";
  return value;
}
