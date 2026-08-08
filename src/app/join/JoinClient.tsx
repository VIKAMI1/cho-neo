"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import {
  CHO_NEO_AGREEMENT_VERSION,
  mapChoNeoMemberProfileRow,
  resolveChoNeoMemberAvatarKey,
  validateChoNeoMemberDisplayName,
  type ChoNeoMemberProfile,
} from "@/lib/cho-neo/member-identity";
import { CHO_NEO_AVATARS } from "@/lib/cho-neo/avatar-identity";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type JoinState =
  | "capturing"
  | "missing-invitation"
  | "signing-in"
  | "ready"
  | "saving"
  | "error"
  | "restricted";

type GoogleLinkState = "idle" | "prompt" | "linking" | "error";

const GOOGLE_LINK_FAILURE_MESSAGE =
  "Google chưa liên kết được với tài khoản Chợ Neo này. Bạn vẫn có thể thử lại nha.";

export default function JoinClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [invitationToken, setInvitationToken] = useState("");
  const [returnTo, setReturnTo] = useState("/cho-neo");
  const [state, setState] = useState<JoinState>("capturing");
  const [googleLinkState, setGoogleLinkState] = useState<GoogleLinkState>("idle");
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarKey, setAvatarKey] = useState(CHO_NEO_AVATARS[0].id);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const token = new URLSearchParams(hash).get("invite")?.trim() ?? "";
    const requestedReturnTo = new URLSearchParams(window.location.search).get("next");
    const linkStatus = new URLSearchParams(window.location.search).get("link");
    const redirectTo =
      requestedReturnTo && isSafeReturnTo(requestedReturnTo)
        ? requestedReturnTo
        : "/cho-neo";
    setReturnTo(redirectTo);

    if (token) {
      setInvitationToken(token);
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    let cancelled = false;

    async function prepareDeviceSession() {
      setState("signing-in");
      setMessage("");

      const existingSessionResult = await supabase.auth.getSession();
      let session = existingSessionResult.data.session ?? null;

      if (!session && token) {
        const anonymousResult = await supabase.auth.signInAnonymously();
        if (anonymousResult.error || !anonymousResult.data.session) {
          if (!cancelled) {
            clearInvitationToken();
            setState("error");
            setMessage("Chợ Neo chưa mở được lời mời trên thiết bị này. Thử lại nha.");
          }
          return;
        }
        session = anonymousResult.data.session;
      }

      if (!session) {
        if (!cancelled) {
          setState("missing-invitation");
          setMessage("Chợ Neo hiện đang mở theo lời mời riêng.");
        }
        return;
      }

      const profile = await loadProfile(supabase, session.user.id);
      if (cancelled) return;

      if (profile?.status === "suspended" || profile?.status === "rejected") {
        if (token) clearInvitationToken();
        setState("restricted");
        setMessage("Hồ sơ này hiện chưa thể vào Chợ Neo.");
        return;
      }

      if (
        profile?.status === "verified_nail_member" &&
        profile.agreementVersion === CHO_NEO_AGREEMENT_VERSION
      ) {
        if (token) clearInvitationToken();
        if (session.user.is_anonymous) {
          if (linkStatus === "failed") {
            setGoogleLinkState("error");
            setMessage(GOOGLE_LINK_FAILURE_MESSAGE);
          } else {
            setGoogleLinkState("prompt");
          }
          setState("ready");
          return;
        }
        router.replace(redirectTo);
        return;
      }

      if (!token && profile?.status !== "verified_nail_member") {
        setState("missing-invitation");
        setMessage("Chợ Neo hiện đang mở theo lời mời riêng.");
        return;
      }

      setState("ready");
    }

    void prepareDeviceSession().catch(() => {
      if (!cancelled) {
        clearInvitationToken();
        setState("error");
        setMessage("Chợ Neo chưa mở được lời mời trên thiết bị này. Thử lại nha.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function submit() {
    if (!agreementAccepted) {
      setState("error");
      setMessage("Bạn cần đồng ý với Thỏa thuận và Chính sách riêng tư trước nha.");
      return;
    }

    const validation = validateChoNeoMemberDisplayName(displayName);
    if (validation.ok === false) {
      setState("error");
      setMessage(validation.message);
      return;
    }

    setState("saving");
    setMessage("");

    try {
      const sessionResult = await supabase.auth.getSession();
      const session = sessionResult.data.session ?? null;
      if (!session?.user) {
        clearInvitationToken();
        setState("error");
        setMessage("Lời mời đã hết phiên trên thiết bị này. Mở lại liên kết giúp Chợ Neo nha.");
        return;
      }

      const response = await fetch("/api/cho-neo/member/verify", {
        body: JSON.stringify({
          agreementAccepted: true,
          agreementVersion: CHO_NEO_AGREEMENT_VERSION,
          avatarKey: resolveChoNeoMemberAvatarKey(avatarKey),
          displayName: validation.displayName,
          invitationToken,
        }),
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.profile) {
        if (isTerminalInvitationFailure(payload?.reason)) {
          clearInvitationToken();
        }
        setState(response.status === 403 ? "restricted" : "error");
        setMessage(payload?.error ?? "Lời mời chưa dùng được. Thử lại nha.");
        return;
      }

      clearInvitationToken();
      setGoogleLinkState(session.user.is_anonymous ? "prompt" : "idle");
      setState("ready");
    } catch {
      clearInvitationToken();
      setState("error");
      setMessage("Chợ Neo chưa xác nhận được thành viên. Thử lại một nhịp nha.");
    }
  }

  async function linkGoogleIdentity() {
    setGoogleLinkState("linking");
    setMessage("");

    try {
      const currentSession = (await supabase.auth.getSession()).data.session;
      if (!currentSession?.user?.is_anonymous) {
        throw new Error("anonymous-session-required");
      }

      const redirectTo = `${window.location.origin}/auth/callback?mode=link&next=${encodeURIComponent(
        returnTo,
      )}`;
      const { data, error } = await supabase.auth.linkIdentity({
        provider: "google",
        options: { redirectTo, scopes: "openid email profile" },
      });
      if (error || !data?.url) throw new Error("google-link-unavailable");
      window.location.assign(data.url);
    } catch {
      setGoogleLinkState("error");
      setMessage(GOOGLE_LINK_FAILURE_MESSAGE);
    }
  }

  function clearInvitationToken() {
    setInvitationToken("");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  const isBusy = state === "capturing" || state === "signing-in" || state === "saving";

  return (
    <main className="cho-neo-join-page">
      <section aria-labelledby="cho-neo-join-title" className="cho-neo-join-panel">
        <p className="cho-neo-join-kicker">Chợ Neo</p>
        <h1 id="cho-neo-join-title">Vào Chợ Neo</h1>

        {state === "missing-invitation" ? (
          <>
            <p className="cho-neo-join-copy">
              Chợ Neo hiện đang mở theo lời mời riêng. Liên kết mời cần được gửi trực tiếp cho bạn.
            </p>
            <a className="cho-neo-join-secondary" href="/cho-neo">
              Dạo khu công khai
            </a>
          </>
        ) : state === "restricted" ? (
          <p aria-live="polite" className="cho-neo-join-message" role="alert">
            {message}
          </p>
        ) : (
          <>
            <p className="cho-neo-join-copy">
              Một góc nhỏ để người trong nghề gặp nhau, nói chuyện thật và giữ nhau tử tế.
            </p>
            {googleLinkState !== "idle" ? (
              <div className="cho-neo-join-link-google">
                <h2>Giữ lối vào Chợ Neo</h2>
                <p>
                  Liên kết Google để lần sau bạn có thể trở lại Chợ Neo trên thiết bị khác.
                </p>
                {message ? (
                  <p aria-live="polite" className="cho-neo-join-message" role="alert">
                    {message}
                  </p>
                ) : null}
                <button
                  className="cho-neo-join-primary"
                  disabled={googleLinkState === "linking"}
                  onClick={linkGoogleIdentity}
                  type="button"
                >
                  {googleLinkState === "linking" ? "Đang mở Google..." : "Liên kết với Google"}
                </button>
                <button
                  className="cho-neo-join-secondary"
                  onClick={() => router.replace(returnTo)}
                  type="button"
                >
                  Vào Chợ Neo trên thiết bị này
                </button>
              </div>
            ) : (
              <>
                <div className="cho-neo-join-agreement">
                  <h2>Trước khi vào chợ</h2>
                  <p>Chợ Neo là không gian riêng theo lời mời. Hãy dùng tên gọi bạn muốn mọi người nhận ra.</p>
                  <details open>
                    <summary>Thỏa thuận người dùng</summary>
                    <p>
                      Bạn đồng ý nói chuyện tôn trọng, không đăng thông tin riêng tư của người khác, không mạo danh và không dùng Chợ Neo để gây hại.
                    </p>
                  </details>
                  <details>
                    <summary>Chính sách riêng tư</summary>
                    <p>
                      Chợ Neo lưu tên hiển thị, avatar đã chọn, trạng thái thành viên và thời điểm đồng ý để duy trì quyền vào chợ. Lời mời chỉ được lưu dưới dạng mã băm.
                    </p>
                  </details>
                  <label className="cho-neo-join-check">
                    <input
                      checked={agreementAccepted}
                      onChange={(event) => setAgreementAccepted(event.target.checked)}
                      type="checkbox"
                    />
                    <span>Tôi đã đọc và đồng ý với cả hai nội dung trên.</span>
                  </label>
                </div>

                <label className="cho-neo-join-field">
                  <span>Tên hiển thị</span>
                  <input
                    autoComplete="nickname"
                    maxLength={24}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Ví dụ: Mai Calgary"
                    value={displayName}
                  />
                </label>

                <fieldset className="cho-neo-join-avatars">
                  <legend>Avatar (tuỳ chọn)</legend>
                  <div>
                    {CHO_NEO_AVATARS.map((avatar) => (
                      <button
                        aria-label={`Chọn avatar ${avatar.name}`}
                        aria-pressed={avatarKey === avatar.id}
                        className={avatarKey === avatar.id ? "selected" : ""}
                        key={avatar.id}
                        onClick={() => setAvatarKey(avatar.id)}
                        type="button"
                      >
                        <Image
                          alt=""
                          aria-hidden="true"
                          height={56}
                          src={avatar.src}
                          width={56}
                        />
                        <span>{avatar.nameVi}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {message ? (
                  <p aria-live="polite" className="cho-neo-join-message" role="alert">
                    {message}
                  </p>
                ) : null}
                <button
                  className="cho-neo-join-primary"
                  disabled={isBusy}
                  onClick={submit}
                  type="button"
                >
                  {state === "signing-in"
                    ? "Đang mở lời mời..."
                    : state === "saving"
                      ? "Đang đưa bạn vào chợ..."
                      : "Vào Chợ Neo"}
                </button>
              </>
            )}
          </>
        )}
      </section>
      <style jsx>{`
        .cho-neo-join-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          background: #f7f1e6;
          color: #23161d;
          font-family: var(--cho-neo-font-ui, sans-serif);
        }

        .cho-neo-join-panel {
          width: min(560px, 100%);
          display: grid;
          gap: 16px;
          padding: clamp(24px, 5vw, 44px);
          border: 1px solid #cfae80;
          border-radius: 8px;
          background: #fffdf8;
          box-shadow: 0 18px 50px rgba(70, 38, 44, 0.12);
        }

        .cho-neo-join-kicker {
          margin: 0;
          color: #8b3a3c;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          color: #3b1d2a;
          font-size: clamp(2rem, 6vw, 3.2rem);
          line-height: 1.05;
        }

        .cho-neo-join-copy {
          color: #654d54;
          line-height: 1.65;
        }

        .cho-neo-join-agreement {
          display: grid;
          gap: 10px;
          padding: 16px;
          border-left: 3px solid #d58b4d;
          background: #fbf4e9;
        }

        .cho-neo-join-link-google {
          display: grid;
          gap: 10px;
          padding: 16px;
          border: 1px solid #cfae80;
          border-radius: 8px;
          background: #fffaf0;
        }

        .cho-neo-join-link-google h2,
        .cho-neo-join-link-google p {
          margin: 0;
        }

        .cho-neo-join-link-google h2 {
          color: #3b1d2a;
          font-size: 1.1rem;
        }

        .cho-neo-join-link-google p {
          color: #654d54;
          line-height: 1.5;
        }

        .cho-neo-join-agreement h2 {
          color: #3b1d2a;
          font-size: 1rem;
        }

        .cho-neo-join-agreement p,
        .cho-neo-join-agreement summary {
          color: #654d54;
          font-size: 0.92rem;
          line-height: 1.55;
        }

        .cho-neo-join-agreement details p {
          padding-top: 6px;
        }

        .cho-neo-join-agreement summary {
          cursor: pointer;
          font-weight: 700;
        }

        .cho-neo-join-check,
        .cho-neo-join-field {
          display: grid;
          gap: 7px;
          color: #3b1d2a;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .cho-neo-join-check {
          grid-template-columns: auto 1fr;
          align-items: start;
          font-weight: 500;
        }

        .cho-neo-join-check input {
          margin-top: 3px;
          accent-color: #8b3a3c;
        }

        .cho-neo-join-field input {
          min-height: 46px;
          border: 1px solid #cfae80;
          border-radius: 4px;
          padding: 10px 12px;
          color: #23161d;
          background: #fff;
          font: inherit;
          font-weight: 400;
        }

        .cho-neo-join-field input:focus-visible,
        .cho-neo-join-check input:focus-visible,
        .cho-neo-join-avatars button:focus-visible,
        .cho-neo-join-primary:focus-visible,
        .cho-neo-join-secondary:focus-visible,
        .cho-neo-join-link-google button:focus-visible {
          outline: 3px solid #e0a45d;
          outline-offset: 2px;
        }

        .cho-neo-join-avatars {
          margin: 0;
          border: 0;
          padding: 0;
        }

        .cho-neo-join-avatars legend {
          margin-bottom: 8px;
          color: #3b1d2a;
          font-size: 0.92rem;
          font-weight: 700;
        }

        .cho-neo-join-avatars div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .cho-neo-join-avatars button {
          display: grid;
          width: 76px;
          min-height: 84px;
          gap: 3px;
          align-content: start;
          border: 1px solid #cfae80;
          border-radius: 10px;
          padding: 6px;
          color: #3b1d2a;
          background: #fff;
          cursor: pointer;
          font: inherit;
          font-size: 10px;
          text-align: center;
        }

        .cho-neo-join-avatars button img {
          width: 56px;
          height: 56px;
          justify-self: center;
          border-radius: 8px;
          object-fit: cover;
        }

        .cho-neo-join-avatars button.selected {
          border-color: #8b3a3c;
          box-shadow: 0 0 0 3px #e9c99d;
        }

        .cho-neo-join-primary,
        .cho-neo-join-secondary {
          min-height: 46px;
          border-radius: 4px;
          padding: 10px 16px;
          font: inherit;
          font-weight: 700;
          text-align: center;
          text-decoration: none;
        }

        .cho-neo-join-primary {
          border: 1px solid #702e36;
          color: #fffaf0;
          background: #8b3a3c;
          cursor: pointer;
        }

        .cho-neo-join-primary:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        .cho-neo-join-secondary {
          border: 1px solid #cfae80;
          color: #3b1d2a;
          background: #fff;
          cursor: pointer;
        }

        .cho-neo-join-message {
          color: #8b3a3c;
          font-size: 0.92rem;
          line-height: 1.5;
        }

        @media (max-width: 520px) {
          .cho-neo-join-page {
            align-items: start;
            padding: 14px;
          }

          .cho-neo-join-panel {
            margin-top: 5vh;
            padding: 22px 18px;
          }
        }
      `}</style>
    </main>
  );
}

async function loadProfile(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data, error } = await supabase
    .from("cho_neo_member_profiles")
    .select(
      "user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status, agreement_version, agreement_accepted_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapChoNeoMemberProfileRow(data) as ChoNeoMemberProfile;
}

function isSafeReturnTo(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}

function isTerminalInvitationFailure(reason: unknown) {
  return [
    "expired-invitation",
    "invalid-invitation",
    "member-restricted",
    "revoked-invitation",
    "used-invitation",
  ].includes(typeof reason === "string" ? reason : "");
}
