"use client";

import { createClient } from "@/lib/supabase-browser";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export const CHO_NEO_OAUTH_SCOPES = {
  google: "openid email profile",
} as const;

export default function LoginClient() {
  const supabase = useMemo(() => createClient(), []);
  const search = useSearchParams();
  const [busyProvider, setBusyProvider] = useState<"google" | null>(null);
  const [message, setMessage] = useState("");

  const googleEnabled =
    process.env.NEXT_PUBLIC_CHO_NEO_GOOGLE_LOGIN_ENABLED === "true";
  const next = getSafeReturnTo(search.get("next"));
  const reason = search.get("reason");
  const callbackMessage =
    reason === "unlinked"
      ? [
          "Tài khoản Google này chưa được liên kết với một thành viên Chợ Neo.",
          "Nếu bạn có lời mời mới, hãy mở liên kết lời mời đó trước.",
        ]
      : reason === "restricted"
        ? ["Hồ sơ này hiện chưa thể vào Chợ Neo."]
        : reason === "failed"
          ? ["Google chưa đăng nhập xong. Thử lại giúp Chợ Neo nha."]
        : null;

  async function startGoogleOAuth() {
    setBusyProvider("google");
    setMessage("");

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: CHO_NEO_OAUTH_SCOPES.google,
      },
    });

    if (error) {
      setMessage("Chưa mở được cổng đăng nhập. Thử lại giúp Chợ Neo nha.");
      setBusyProvider(null);
    }
  }

  return (
    <main className="cho-neo-login-page">
      <section className="cho-neo-login-card" aria-labelledby="cho-neo-login-title">
        <p className="cho-neo-login-kicker">Chợ Neo</p>
        <h1 id="cho-neo-login-title">Trở lại Chợ Neo</h1>
        <p className="cho-neo-login-copy">
          Đăng nhập Google để trở lại đúng hồ sơ thành viên Chợ Neo của bạn.
        </p>

        {callbackMessage ? (
          <div aria-live="polite" className="cho-neo-login-message" role="alert">
            {callbackMessage.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}

        {googleEnabled ? (
          <div className="cho-neo-login-actions">
            <button
              disabled={busyProvider !== null}
              onClick={startGoogleOAuth}
              type="button"
            >
              {busyProvider === "google" ? "Đang mở Google..." : "Đăng nhập với Google"}
            </button>
          </div>
        ) : (
          <p className="cho-neo-login-message" role="status">
            Cổng đăng nhập thành viên đang tạm đóng. Bạn vẫn có thể quay lại Chợ
            Neo để xem các khu công khai.
          </p>
        )}

        <p className="cho-neo-login-privacy">
          Chợ Neo chỉ dùng thông tin đăng nhập cơ bản để nhận ra bạn. Không đăng
          bài hay truy cập tài khoản mạng xã hội của bạn.
        </p>
        {message ? (
          <p className="cho-neo-login-message" role="alert">
            {message}
          </p>
        ) : null}
        <div className="cho-neo-login-invitation">
          <p>Lần đầu đến Chợ Neo?</p>
          <Link href={`/join?next=${encodeURIComponent(next)}`}>Dùng lời mời</Link>
        </div>
      </section>
      <style jsx>{`
        .cho-neo-login-page {
          box-sizing: border-box;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
          color: var(--cho-neo-text-primary);
          font-family: var(--cho-neo-font-ui);
          font-weight: 400;
          background:
            radial-gradient(circle at 30% 12%, rgba(216, 169, 93, 0.16), transparent 30%),
            linear-gradient(180deg, #24101a, #12080f);
        }

        .cho-neo-login-page *,
        .cho-neo-login-page *::before,
        .cho-neo-login-page *::after {
          box-sizing: border-box;
        }

        .cho-neo-login-card {
          width: min(430px, calc(100vw - 40px));
          max-width: 100%;
          display: grid;
          gap: 15px;
          padding: 22px;
          border: 1px solid rgba(216, 169, 93, 0.42);
          border-radius: 22px;
          background: rgba(36, 16, 26, 0.94);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.42);
        }

        .cho-neo-login-kicker,
        .cho-neo-login-copy,
        .cho-neo-login-privacy,
        .cho-neo-login-message {
          margin: 0;
        }

        .cho-neo-login-kicker {
          color: var(--cho-neo-text-accent);
          font-size: 12px;
          font-weight: 500;
          letter-spacing: 0;
        }

        h1 {
          margin: 0;
          color: var(--cho-neo-text-primary);
          font-family: var(--cho-neo-font-display);
          font-size: 30px;
          font-weight: 500;
          line-height: 1;
        }

        .cho-neo-login-copy,
        .cho-neo-login-privacy {
          color: var(--cho-neo-text-secondary);
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .cho-neo-login-actions {
          display: grid;
          gap: 10px;
        }

        button {
          min-height: 46px;
          border-radius: 14px;
          font: inherit;
          font-weight: 600;
        }

        button {
          border: 1px solid rgba(216, 169, 93, 0.5);
          color: #1b0d14;
          background: #f4d69a;
          cursor: pointer;
        }

        button.secondary {
          color: var(--cho-neo-text-primary);
          background: rgba(255, 247, 237, 0.06);
        }

        button:disabled {
          cursor: not-allowed;
          opacity: 0.62;
        }

        .cho-neo-login-message {
          padding: 10px;
          border: 1px solid rgba(248, 211, 145, 0.32);
          border-radius: 12px;
          color: var(--cho-neo-text-primary);
          background: rgba(255, 247, 237, 0.06);
          font-size: 13px;
        }

        .cho-neo-login-message p {
          margin: 0;
        }

        .cho-neo-login-message p + p {
          margin-top: 6px;
        }

        .cho-neo-login-invitation {
          display: grid;
          gap: 4px;
          padding-top: 4px;
          border-top: 1px solid rgba(255, 247, 237, 0.12);
        }

        .cho-neo-login-invitation p {
          margin: 0;
          color: var(--cho-neo-text-secondary);
          font-size: 13px;
        }

        .cho-neo-login-invitation a {
          color: var(--cho-neo-text-primary);
          font-size: 14px;
          font-weight: 500;
        }

      `}</style>
    </main>
  );
}

export function getSafeReturnTo(value: string | null) {
  if (!value) return "/cho-neo";
  if (!value.startsWith("/") || value.startsWith("//")) return "/cho-neo";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "/cho-neo";
  return value;
}
