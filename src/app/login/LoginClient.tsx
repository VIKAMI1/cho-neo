"use client";

import { createClient } from "@/lib/supabase-browser";
import {
  isApprovedChoNeoMemberAvatarKey,
  mapChoNeoMemberProfileRow,
} from "@/lib/cho-neo/member-identity";
import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

export const CHO_NEO_OAUTH_SCOPES = {
  google: "openid email profile",
} as const;

type OtpStep = "email" | "code";

export default function LoginClient() {
  const supabase = useMemo(() => createClient(), []);
  const search = useSearchParams();
  const [busyProvider, setBusyProvider] = useState<"google" | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpStep, setOtpStep] = useState<OtpStep>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");

  const googleEnabled =
    process.env.NEXT_PUBLIC_CHO_NEO_GOOGLE_LOGIN_ENABLED === "true";
  const googleFallbackRequested = search.get("fallback") === "google";
  const showGoogleFallback = googleFallbackRequested && googleEnabled;
  const next = getSafeReturnTo(search.get("next"));
  const reason = search.get("reason");
  const callbackMessage =
    reason === "unlinked"
      ? [
          "Tài khoản Google này chưa được liên kết với Thẻ Thành Viên Chợ Neo.",
          "Nếu đây là lần đầu, hãy tạo Thẻ Thành Viên trước.",
        ]
      : reason === "restricted"
        ? ["Thẻ Thành Viên này hiện chưa thể vào Chợ Neo."]
        : reason === "failed"
          ? ["Google chưa đăng nhập xong. Thử lại giúp Chợ Neo nha."]
        : null;

  async function sendEmailOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLocaleLowerCase("en");
    if (!normalizedEmail) {
      setMessage("Nhập email đã liên kết với Thẻ Thành Viên Chợ Neo của bạn nha.");
      return;
    }

    setOtpBusy(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
      },
    });

    setOtpBusy(false);

    if (error) {
      setMessage("Email này chưa có Thẻ Thành Viên. Kiểm tra lại hoặc tạo thẻ nếu đây là lần đầu.");
      return;
    }

    setEmail(normalizedEmail);
    setToken("");
    setOtpStep("code");
    setMessage("Chợ Neo đã gửi mã 6 số đến email của bạn.");
  }

  async function verifyEmailOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLocaleLowerCase("en");
    const normalizedToken = token.replace(/\D/g, "");
    if (!normalizedEmail || normalizedToken.length !== 6) {
      setMessage("Nhập đủ email và mã 6 số nha.");
      return;
    }

    setOtpBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: normalizedToken,
      type: "email",
    });

    if (error || !data.user) {
      await supabase.auth.signOut();
      setOtpBusy(false);
      setMessage("Mã này chưa đúng hoặc đã hết hạn. Thử gửi mã mới nha.");
      return;
    }

    const profile = await loadMemberProfile(supabase, data.user.id);
    if (
      !profile ||
      profile.userId !== data.user.id ||
      profile.status !== "verified_nail_member" ||
      !profile.avatarKey
    ) {
      await supabase.auth.signOut();
      setOtpBusy(false);
      setMessage("Email này chưa liên kết với Thẻ Thành Viên Chợ Neo đã xác minh.");
      return;
    }

    setOtpBusy(false);
    window.location.assign(next);
  }

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
          Dùng email đã liên kết với Thẻ Thành Viên Chợ Neo của bạn.
        </p>

        {callbackMessage ? (
          <div aria-live="polite" className="cho-neo-login-message" role="alert">
            {callbackMessage.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        ) : null}

        {otpStep === "email" ? (
          <form className="cho-neo-login-actions" onSubmit={sendEmailOtp}>
            <label className="cho-neo-login-field">
              <span>Email</span>
              <input
                autoComplete="email"
                inputMode="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <button disabled={otpBusy} type="submit">
              {otpBusy ? "Đang gửi mã..." : "Gửi mã đăng nhập"}
            </button>
          </form>
        ) : (
          <form className="cho-neo-login-actions" onSubmit={verifyEmailOtp}>
            <p className="cho-neo-login-sent">Chợ Neo đã gửi mã 6 số đến email của bạn.</p>
            <label className="cho-neo-login-field">
              <span>Mã 6 số</span>
              <input
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setToken(event.target.value.replace(/\D/g, ""))}
                pattern="[0-9]{6}"
                placeholder="000000"
                required
                type="text"
                value={token}
              />
            </label>
            <button disabled={otpBusy} type="submit">
              {otpBusy ? "Đang vào chợ..." : "Vào Chợ"}
            </button>
            <button
              className="secondary"
              disabled={otpBusy}
              onClick={() => {
                setOtpStep("email");
                setToken("");
                setMessage("");
              }}
              type="button"
            >
              Đổi email
            </button>
          </form>
        )}

        {showGoogleFallback ? (
          <div className="cho-neo-login-actions">
            <button
              disabled={busyProvider !== null}
              onClick={startGoogleOAuth}
              type="button"
            >
              {busyProvider === "google" ? "Đang mở Google..." : "Đăng nhập với Google"}
            </button>
          </div>
        ) : googleFallbackRequested ? (
          <p className="cho-neo-login-message" role="status">
            Cổng đăng nhập thành viên đang tạm đóng. Bạn vẫn có thể quay lại Chợ
            Neo để xem các khu công khai.
          </p>
        ) : null}

        <p className="cho-neo-login-privacy">
          Mã chỉ dùng một lần. Chợ Neo không cần mật khẩu của bạn.
        </p>
        {message ? (
          <p className="cho-neo-login-message" role="alert">
            {message}
          </p>
        ) : null}
        <div className="cho-neo-login-invitation">
          <p>Lần đầu đến Chợ Neo?</p>
          <p>
            <a href={`/join?next=${encodeURIComponent(next)}`}>Tạo Thẻ Thành Viên</a> nếu bạn từ 18 tuổi và đang trong nghề nail.
          </p>
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

        .cho-neo-login-field {
          display: grid;
          gap: 7px;
          color: var(--cho-neo-text-primary);
          font-size: 13px;
          font-weight: 500;
        }

        .cho-neo-login-field input {
          width: 100%;
          min-height: 46px;
          border: 1px solid rgba(216, 169, 93, 0.44);
          border-radius: 12px;
          padding: 10px 12px;
          color: var(--cho-neo-text-primary);
          background: rgba(255, 247, 237, 0.08);
          font: inherit;
          font-weight: 400;
        }

        .cho-neo-login-field input:focus-visible,
        button:focus-visible {
          outline: 3px solid rgba(248, 211, 145, 0.38);
          outline-offset: 2px;
        }

        .cho-neo-login-sent {
          margin: 0;
          color: var(--cho-neo-text-secondary);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.45;
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

  if (error || !data) return null;
  if (!isApprovedChoNeoMemberAvatarKey(data.avatar_key)) return null;
  return mapChoNeoMemberProfileRow(data);
}
