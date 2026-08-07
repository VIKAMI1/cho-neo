"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  isApprovedChoNeoMemberAvatarKey,
  mapChoNeoMemberProfileRow,
} from "@/lib/cho-neo/member-identity";
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
    const linkMode = search.get("mode") === "link";

    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const callbackFailurePath = linkMode
          ? `/join?link=failed&next=${encodeURIComponent(next)}`
          : addAuthError(next, "failed");
        const providerError =
          url.searchParams.get("error") ||
          url.searchParams.get("error_code") ||
          url.searchParams.get("error_description");
        if (providerError) {
          cleanCallbackUrl(url);
          setMsg(
            linkMode
              ? "Google chưa liên kết được với tài khoản Chợ Neo này. Thử lại nha."
              : "Google chưa đăng nhập xong. Quay lại Chợ Neo thử lại nha.",
          );
          setTimeout(() => router.replace(callbackFailurePath), 700);
          return;
        }
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
          setTimeout(() => router.replace(callbackFailurePath), 900);
          return;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data.session?.user) {
            setMsg("Không thấy mã đăng nhập. Thử đăng nhập lại nha.");
            setTimeout(() => router.replace(callbackFailurePath), 900);
            return;
          }
        }

        const { data: sessionResult } = await supabase.auth.getSession();
        const session = sessionResult.session;
        if (!session?.user) throw new Error("oauth-session-missing");

        const profile = await loadMemberProfile(supabase, session.user.id);
        if (linkMode) {
          if (
            !profile ||
            profile.userId !== session.user.id ||
            profile.status !== "verified_nail_member" ||
            !profile.avatarKey
          ) {
            throw new Error("linked-member-profile-missing");
          }
          cleanCallbackUrl(url);
          router.replace(next);
          return;
        }

        if (!profile) {
          await supabase.auth.signOut();
          cleanCallbackUrl(url);
          router.replace(addAuthError(next, "unlinked"));
          return;
        }

        if (profile.status === "suspended" || profile.status === "rejected") {
          await supabase.auth.signOut();
          cleanCallbackUrl(url);
          router.replace(addAuthError(next, "restricted"));
          return;
        }

        if (profile.status !== "verified_nail_member") {
          await supabase.auth.signOut();
          cleanCallbackUrl(url);
          router.replace(addAuthError(next, "unlinked"));
          return;
        }

        cleanCallbackUrl(url);
        router.replace(next);
      } catch {
        setMsg(
          linkMode
            ? "Google chưa liên kết được với tài khoản Chợ Neo này. Thử lại nha."
            : "Google chưa đăng nhập xong. Quay lại Chợ Neo thử lại nha.",
        );
        setTimeout(
          () =>
            router.replace(
              linkMode
                ? `/join?link=failed&next=${encodeURIComponent(next)}`
                : addAuthError(next, "failed"),
            ),
          900,
        );
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

async function loadMemberProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("cho_neo_member_profiles")
    .select(
      "user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status, agreement_version, agreement_accepted_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error("member-profile-read-failed");
  if (!data) return null;
  if (!isApprovedChoNeoMemberAvatarKey(data.avatar_key)) {
    throw new Error("member-avatar-missing-or-invalid");
  }

  return mapChoNeoMemberProfileRow(data);
}

function addAuthError(path: string, reason: string) {
  return `${path}${path.includes("?") ? "&" : "?"}reason=${encodeURIComponent(reason)}`;
}
