"use client";

import { createClient } from "@/lib/supabase-browser";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Step = "request" | "verify";
type NoticeTone = "error" | "info" | "success";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const search = useSearchParams();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<NoticeTone>("info");
  const [cooldown, setCooldown] = useState(0);

  // Where to go after login. Default = home.
  const next = search.get("next") || "/";
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const maskedEmail = useMemo(() => maskEmail(normalizedEmail), [normalizedEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  function setError(e: unknown) {
    setNoticeTone("error");
    setMsg(getFriendlyAuthError(e));
  }

  function setNotice(message: string, tone: NoticeTone = "info") {
    setNoticeTone(tone);
    setMsg(message);
  }

  async function sendCode() {
    setMsg(null);

    if (!normalizedEmail) return setNotice("Nhập email trước nha.", "error");
    if (!EMAIL_RE.test(normalizedEmail))
      return setNotice("Email này nhìn chưa đúng. Kiểm tra lại giúp mình nha.", "error");

    try {
      setBusy(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) return setError(error);

      setStep("verify");
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setNotice("Đã gửi mã đăng nhập. Mở email lấy 6 số rồi nhập vào đây nha.", "success");
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    setMsg(null);

    const token = normalizeCode(code);
    if (!token) return setNotice("Nhập mã code trước nha.", "error");
    if (token.length !== 6) return setNotice("Mã đăng nhập có 6 số.", "error");

    try {
      setBusy(true);

      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token,
        type: "email", // OTP code flow
      });

      if (error) {
        setNotice("Mã không đúng hoặc đã hết hạn. Gửi mã mới rồi thử lại nha.", "error");
        return;
      }

      setNotice("Đăng nhập thành công. Đang đưa bạn vào Chợ Neo...", "success");
      if (data?.session) router.replace(next);
      else router.replace(next);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  function resetToRequest() {
    setStep("request");
    setCode("");
    setMsg(null);
    setCooldown(0);
  }

  async function resendCode() {
    if (cooldown > 0 || busy) return;
    await sendCode();
  }

  function onCodeChange(value: string) {
    setCode(normalizeCode(value).slice(0, 6));
  }

  return (
    <main className="min-h-screen bg-[#241019] px-4 py-10 text-[#fff1cf] sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-sm items-center">
        <div className="w-full rounded-2xl border border-[#c99a4a]/55 bg-[#321520]/92 p-6 shadow-2xl shadow-black/30">
          <h1 className="text-2xl font-semibold text-[#fff6df]">Ghé lại Chợ Neo</h1>
          <p className="mt-2 text-sm leading-6 text-[#ecd6ad]">
            Nhập email để nhận mã đăng nhập 6 số. Không cần mật khẩu.
          </p>
          <p className="mt-4 rounded-xl border border-[#c99a4a]/45 bg-[#201018]/70 p-3 text-xs leading-5 text-[#e8cf9d]">
            Chỉ gửi mã đăng nhập. Không gửi quảng cáo.
          </p>

          {step === "request" ? (
            <>
              <label className="mt-5 block text-sm font-medium text-[#f7dfad]">Email</label>
              <input
                className="mt-2 w-full rounded-xl border border-[#c99a4a]/35 bg-[#1b0d14] px-4 py-3 text-sm text-[#fff6df]
                           placeholder:text-[#a98c68] focus:outline-none focus:ring-2 focus:ring-[#d7ad61]/60 disabled:opacity-75"
                placeholder="email của bạn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                disabled={busy}
              />
              <button
                className="mt-4 w-full rounded-xl border border-[#d7ad61]/50 bg-[#f0c36d] px-4 py-3 text-sm font-semibold
                           text-[#241019] shadow-sm hover:bg-[#ffd37d] disabled:opacity-60"
                onClick={sendCode}
                disabled={busy}
              >
                {busy ? "Đang gửi..." : "Gửi mã đăng nhập"}
              </button>
            </>
          ) : (
            <>
              <div className="mt-4 rounded-xl border border-[#c99a4a]/35 bg-[#1b0d14] px-4 py-3">
                <p className="text-xs text-[#c9ac7a]">Mã đã gửi đến</p>
                <p className="mt-1 truncate text-sm font-medium text-[#fff6df]">{maskedEmail}</p>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <label className="text-sm font-medium text-[#f7dfad]" htmlFor="login-code">
                  Nhập mã 6 số
                </label>
                <button
                  className="text-xs font-semibold text-[#f0c36d] underline underline-offset-4 disabled:text-[#a98c68]"
                  disabled={busy}
                  onClick={resetToRequest}
                  type="button"
                >
                  Đổi email
                </button>
              </div>
              <input
                id="login-code"
                className="mt-2 w-full rounded-xl border border-[#c99a4a]/35 bg-[#1b0d14] px-4 py-3 text-center text-lg font-semibold
                           tracking-[0.28em] text-[#fff6df] placeholder:text-left placeholder:text-sm placeholder:font-normal
                           placeholder:tracking-normal placeholder:text-[#a98c68] focus:outline-none focus:ring-2 focus:ring-[#d7ad61]/60"
                placeholder="Nhập 6 số"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                pattern="[0-9]*"
                disabled={busy}
              />

              <button
                className="mt-4 w-full rounded-xl border border-[#d7ad61]/50 bg-[#f0c36d] px-4 py-3 text-sm font-semibold
                           text-[#241019] shadow-sm hover:bg-[#ffd37d] disabled:bg-[#8d8375] disabled:text-[#35241f] disabled:opacity-80"
                onClick={verifyCode}
                disabled={busy || code.length !== 6}
              >
                {busy ? "Đang xác nhận..." : "Vào Chợ Neo"}
              </button>

              <button
                className="mt-3 w-full rounded-xl border border-[#c99a4a]/30 bg-[#1b0d14] px-4 py-3 text-sm
                           text-[#f7dfad] hover:bg-[#27111a] disabled:text-[#a98c68] disabled:opacity-80"
                onClick={resendCode}
                disabled={busy || cooldown > 0}
              >
                {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
              </button>
            </>
          )}

          {msg && (
            <div
              className={`mt-4 rounded-xl border p-3 ${
                noticeTone === "error"
                  ? "border-red-300/60 bg-red-950/35"
                  : noticeTone === "success"
                    ? "border-emerald-300/60 bg-emerald-950/35"
                    : "border-[#c99a4a]/35 bg-[#201018]/70"
              }`}
              role={noticeTone === "error" ? "alert" : "status"}
            >
              <p className="text-sm text-[#f4ddb0]">{msg}</p>
            </div>
          )}

          <p className="mt-5 text-xs leading-5 text-[#c9ac7a]">
            Nếu không thấy email, kiểm tra hộp thư rác hoặc mục quảng bá. Mã chỉ
            dùng một lần và sẽ hết hạn sớm.
          </p>
          <Link
            className="mt-5 block text-center text-sm font-semibold text-[#f0c36d] underline underline-offset-4"
            href="/cho-neo"
          >
            Trở lại Chợ Neo
          </Link>
        </div>
      </div>
    </main>
  );
}

function normalizeCode(value: string) {
  return value.replace(/\D/g, "");
}

function maskEmail(value: string) {
  const [name, domain] = value.split("@");
  if (!name || !domain) return value;

  const visibleStart = name.slice(0, Math.min(2, name.length));
  const visibleEnd = name.length > 4 ? name.slice(-1) : "";
  return `${visibleStart}${"•".repeat(Math.max(3, Math.min(8, name.length - 1)))}${visibleEnd}@${domain}`;
}

function getFriendlyAuthError(error: unknown) {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: unknown }).message ?? "")
      : "";

  if (/rate|security|wait|seconds|over/i.test(raw)) {
    return "Gửi hơi nhanh. Chờ một chút rồi thử lại nha.";
  }

  if (/invalid|expired|otp|token|access_denied/i.test(raw)) {
    return "Mã không đúng hoặc đã hết hạn. Gửi mã mới rồi thử lại nha.";
  }

  return "Chưa gửi được mã đăng nhập. Thử lại giúp Chợ Neo một nhịp nha.";
}
