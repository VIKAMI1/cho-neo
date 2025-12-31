"use client";

import { createClient } from "@/lib/supabase-browser";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Step = "request" | "verify";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const sendCode = async () => {
    setMsg(null);

    if (!normalizedEmail) return setMsg("Nhập email trước nha.");
    if (!looksLikeEmail(normalizedEmail))
      return setMsg("Email này nhìn chưa đúng. Kiểm tra lại giúp mình nha.");

    try {
      setBusy(true);

      const { error } = await supabase.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: false, // ✅ invite-only (no random signups)
          // For OTP *code* flow, you can omit redirect completely.
          // If you later allow magic-link fallback, use env (not hard-coded):
          // emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });

      if (error) return setMsg(error.message);

      setStep("verify");
      setMsg("Đã gửi mã đăng nhập. Mở email lấy code rồi nhập vào đây nha.");
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setMsg(null);

    const token = code.trim();
    if (!token) return setMsg("Nhập mã code trước nha.");

    try {
      setBusy(true);

      const { error } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token,
        type: "email", // <-- this is the OTP code flow
      });

      if (error) return setMsg(error.message);

      router.replace("/");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#fbf7ef] text-zinc-900">
      <div className="mx-auto max-w-sm px-4 py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white/85 shadow-sm p-6">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Đăng nhập bằng email + mã code. Không cần link, không cần mật khẩu.
          </p>

          <label className="block mt-5 text-sm font-medium text-zinc-700">
            Email
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm
                       focus:outline-none focus:ring-2 focus:ring-amber-200"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            disabled={step === "verify"}
          />

          {step === "request" ? (
            <button
              className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold
                         bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
              onClick={sendCode}
              disabled={busy}
            >
              {busy ? "Đang gửi…" : "Send code"}
            </button>
          ) : (
            <>
              <label className="block mt-4 text-sm font-medium text-zinc-700">
                Mã code
              </label>
              <input
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm
                           focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="Nhập code trong email"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
              />

              <button
                className="mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold
                           bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60"
                onClick={verifyCode}
                disabled={busy}
              >
                {busy ? "Đang xác nhận…" : "Verify & Sign in"}
              </button>

              <button
                className="mt-3 w-full rounded-xl px-4 py-3 text-sm border border-zinc-200 bg-white hover:bg-zinc-50"
                onClick={() => {
                  setStep("request");
                  setCode("");
                  setMsg(null);
                }}
                disabled={busy}
              >
                Gửi lại code
              </button>
            </>
          )}

          {msg && (
            <div className="mt-4 rounded-xl border border-zinc-200 bg-[#fffdf8] p-3">
              <p className="text-sm text-zinc-700">{msg}</p>
            </div>
          )}

          <p className="mt-5 text-xs text-zinc-500">
            Tip: Nếu không thấy email, coi Spam/Promotions. Đừng bấm gửi liên tục
            (Supabase sẽ rate-limit).
          </p>
        </div>
      </div>
    </main>
  );
}
