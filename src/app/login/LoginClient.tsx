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
    process.env.NEXT_PUBLIC_CHO_NEO_GOOGLE_LOGIN_ENABLED !== "false";

  const next = getSafeReturnTo(search.get("next"));

  async function startGoogle() {
    setBusyProvider("google");
    setMessage("");

    try {
      const openRegistrationNext = `/join?open=1&next=${encodeURIComponent(next)}`;
      const errorNext = `/login?next=${encodeURIComponent(next)}`;
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        openRegistrationNext,
      )}&error_next=${encodeURIComponent(errorNext)}`;
      const session = (await supabase.auth.getSession()).data.session;
      const result = session?.user?.is_anonymous
        ? await supabase.auth.linkIdentity({
            provider: "google",
            options: { redirectTo, scopes: CHO_NEO_OAUTH_SCOPES.google },
          })
        : await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo,
              scopes: CHO_NEO_OAUTH_SCOPES.google,
            },
          });

      if (!result.error) return;
      setMessage("Google chưa kết nối được với Chợ Neo. Thử lại hoặc liên hệ Chợ Neo nha.");
    } catch {
      setMessage("Google chưa kết nối được với Chợ Neo. Thử lại hoặc liên hệ Chợ Neo nha.");
    } finally {
      setBusyProvider(null);
    }
  }

  const authError = search.get("auth_error");

  return (
    <main className="cho-neo-login-page">
      <section className="cho-neo-login-card" aria-labelledby="cho-neo-login-title">
        <p className="cho-neo-login-kicker">Chợ Neo</p>
        <h1 id="cho-neo-login-title">Welcome to Chợ Neo</h1>
        <p className="cho-neo-login-copy">
          A warm place for people in the nail community to meet, share, and belong.
        </p>

        {googleEnabled ? (
          <div className="cho-neo-login-actions">
            <button
              disabled={busyProvider !== null}
              onClick={startGoogle}
              type="button"
            >
              {busyProvider === "google" ? "Opening Google..." : "Continue with Google"}
            </button>
          </div>
        ) : (
          <p className="cho-neo-login-message" role="status">
            Google sign-in is temporarily unavailable. You can still explore the public areas.
          </p>
        )}

        <p className="cho-neo-login-privacy">
          Google verifies your identity. Chợ Neo never sees your Google password.
        </p>
        {message ? (
          <p className="cho-neo-login-message" role="alert">
            {message}
          </p>
        ) : null}
        {authError ? (
          <p className="cho-neo-login-message" role="alert">
            {authError === "cancelled"
              ? "Google sign-in was cancelled. You can try again whenever you are ready."
              : authError === "identity-conflict"
                ? "That Google account is already connected to another Chợ Neo account. Please use that account or contact Chợ Neo support."
                : "Google sign-in did not finish. Please try again."}
          </p>
        ) : null}
        <nav aria-label="Chợ Neo policies" className="cho-neo-login-links">
          <Link href={`/join?open=1&next=${encodeURIComponent(next)}#agreement`}>
            User Agreement
          </Link>
          <Link href={`/join?open=1&next=${encodeURIComponent(next)}#privacy`}>
            Privacy Policy
          </Link>
        </nav>
        <Link className="cho-neo-login-back" href={next}>
          Return to Chợ Neo
        </Link>
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

        .cho-neo-login-links {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
        }

        .cho-neo-login-links a {
          color: var(--cho-neo-text-secondary);
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

        button,
        .cho-neo-login-back {
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

        .cho-neo-login-back {
          display: inline-grid;
          place-items: center;
          color: var(--cho-neo-text-secondary);
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
