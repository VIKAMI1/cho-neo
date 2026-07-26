"use client";

import { createClient } from "@/lib/supabase-browser";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export const CHO_NEO_OAUTH_SCOPES = {
  facebook: "public_profile email",
  google: "openid email profile",
} as const;

export default function LoginClient() {
  const supabase = useMemo(() => createClient(), []);
  const search = useSearchParams();
  const [busyProvider, setBusyProvider] = useState<"google" | "facebook" | null>(
    null,
  );
  const [message, setMessage] = useState("");

  const googleEnabled =
    process.env.NEXT_PUBLIC_CHO_NEO_GOOGLE_LOGIN_ENABLED === "true";
  const facebookEnabled =
    process.env.NEXT_PUBLIC_CHO_NEO_FACEBOOK_LOGIN_ENABLED === "true";

  const next = getSafeReturnTo(search.get("next"));

  async function startOAuth(provider: "google" | "facebook") {
    setBusyProvider(provider);
    setMessage("");

    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next,
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: CHO_NEO_OAUTH_SCOPES[provider],
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
        <p className="cho-neo-login-kicker">CHỢ NEO</p>
        <h1 id="cho-neo-login-title">Vào Chợ Neo</h1>
        <p className="cho-neo-login-copy">
          Chợ Neo dành cho thợ nail, chủ tiệm, người học nghề và nhà cung cấp.
        </p>

        {googleEnabled || facebookEnabled ? (
          <div className="cho-neo-login-actions">
            {googleEnabled ? (
              <button
                disabled={busyProvider !== null}
                onClick={() => startOAuth("google")}
                type="button"
              >
                {busyProvider === "google"
                  ? "Đang mở Google..."
                  : "Tiếp tục với Google"}
              </button>
            ) : null}
          {facebookEnabled ? (
            <button
              className="secondary"
              disabled={busyProvider !== null}
              onClick={() => startOAuth("facebook")}
              type="button"
            >
              {busyProvider === "facebook"
                ? "Đang mở Facebook..."
                : "Tiếp tục với Facebook"}
            </button>
          ) : null}
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
        <Link className="cho-neo-login-back" href={next}>
          Trở lại Chợ Neo
        </Link>
      </section>
      <style jsx>{`
        .cho-neo-login-page {
          box-sizing: border-box;
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 20px;
          color: #fff1cf;
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
          color: #d8a95d;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0;
        }

        h1 {
          margin: 0;
          color: #fff7df;
          font-size: 30px;
          line-height: 1;
        }

        .cho-neo-login-copy,
        .cho-neo-login-privacy {
          color: #e8cf9d;
          font-size: 14px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .cho-neo-login-actions {
          display: grid;
          gap: 10px;
        }

        button,
        .cho-neo-login-back {
          min-height: 46px;
          border-radius: 14px;
          font: inherit;
          font-weight: 900;
        }

        button {
          border: 1px solid rgba(216, 169, 93, 0.5);
          color: #1b0d14;
          background: #f4d69a;
          cursor: pointer;
        }

        button.secondary {
          color: #fff1cf;
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
          color: #fff7df;
          background: rgba(255, 247, 237, 0.06);
          font-size: 13px;
        }

        .cho-neo-login-back {
          display: inline-grid;
          place-items: center;
          color: #ffe7b7;
          text-decoration: none;
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
