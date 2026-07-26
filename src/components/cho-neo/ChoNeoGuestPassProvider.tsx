"use client";

import { createClient } from "@/lib/supabase-browser";
import {
  CHO_NEO_GUEST_PASS_OPEN_EVENT,
  CHO_NEO_GUEST_PASS_PROFILE_EVENT,
  CHO_NEO_GUEST_PROFILE_TABLE,
  mapChoNeoGuestProfileRow,
  resolveChoNeoGuestAvatarKey,
  validateChoNeoGuestDisplayName,
  type ChoNeoGuestPassProfile,
} from "@/lib/cho-neo/guest-pass";
import { CHO_NEO_AVATARS } from "@/lib/cho-neo/avatar-identity";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PendingAction = () => void | Promise<void>;

type ChoNeoGuestPassContextValue = {
  ensureChoNeoPass: (action: PendingAction) => Promise<void>;
  openProfileSheet: () => void;
  profile: ChoNeoGuestPassProfile | null;
  refreshProfile: () => Promise<void>;
  session: Session | null;
  status: "checking" | "public" | "ready" | "error";
};

type TurnstileWindow = Window & {
  turnstile?: {
    render: (
      container: HTMLElement,
      options: {
        callback: (token: string) => void;
        "error-callback": () => void;
        "expired-callback": () => void;
        sitekey: string;
        size?: "normal" | "compact" | "invisible";
      },
    ) => string;
    reset: (widgetId?: string) => void;
  };
};

const ChoNeoGuestPassContext =
  createContext<ChoNeoGuestPassContextValue | null>(null);

const LOCAL_TEST_TURNSTILE_TOKEN = "cho-neo-local-turnstile-test-token";

export function useChoNeoGuestPass() {
  const value = useContext(ChoNeoGuestPassContext);
  if (!value) {
    throw new Error("useChoNeoGuestPass must be used inside ChoNeoGuestPassProvider");
  }
  return value;
}

export function ChoNeoGuestPassProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ChoNeoGuestPassProfile | null>(null);
  const [status, setStatus] =
    useState<ChoNeoGuestPassContextValue["status"]>("checking");
  const [isPassOpen, setIsPassOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const hasResumedRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const nextSession = sessionData.session ?? null;
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      setStatus("public");
      return;
    }

    const nextProfile = await loadChoNeoGuestProfile(supabase, nextSession.user.id);
    setProfile(nextProfile);
    setStatus(nextProfile ? "ready" : "public");

    if (nextProfile) {
      window.dispatchEvent(
        new CustomEvent(CHO_NEO_GUEST_PASS_PROFILE_EVENT, {
          detail: nextProfile,
        }),
      );
    }
  }, [supabase]);

  useEffect(() => {
    void refreshProfile();
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshProfile();
    });
    return () => data.subscription.unsubscribe();
  }, [refreshProfile, supabase]);

  useEffect(() => {
    function handleOpen() {
      setIsPassOpen(true);
    }

    window.addEventListener(CHO_NEO_GUEST_PASS_OPEN_EVENT, handleOpen);
    return () =>
      window.removeEventListener(CHO_NEO_GUEST_PASS_OPEN_EVENT, handleOpen);
  }, []);

  const ensureChoNeoPass = useCallback(
    async (action: PendingAction) => {
      if (profile?.status === "active") {
        await action();
        return;
      }

      pendingActionRef.current = action;
      hasResumedRef.current = false;
      setIsPassOpen(true);
    },
    [profile],
  );

  const completePass = useCallback(
    async (nextProfile: ChoNeoGuestPassProfile, nextSession: Session) => {
      setSession(nextSession);
      setProfile(nextProfile);
      setStatus("ready");
      setIsPassOpen(false);
      window.dispatchEvent(
        new CustomEvent(CHO_NEO_GUEST_PASS_PROFILE_EVENT, {
          detail: nextProfile,
        }),
      );

      if (pendingActionRef.current && !hasResumedRef.current) {
        hasResumedRef.current = true;
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        await action();
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      ensureChoNeoPass,
      openProfileSheet: () => setIsProfileOpen(true),
      profile,
      refreshProfile,
      session,
      status,
    }),
    [ensureChoNeoPass, profile, refreshProfile, session, status],
  );

  return (
    <ChoNeoGuestPassContext.Provider value={value}>
      {children}
      <ChoNeoGuestPassModal
        onComplete={completePass}
        onClose={() => setIsPassOpen(false)}
        open={isPassOpen}
        supabase={supabase}
      />
      <ChoNeoGuestProfileSheet
        onClose={() => setIsProfileOpen(false)}
        onRefresh={refreshProfile}
        open={isProfileOpen}
        profile={profile}
        supabase={supabase}
      />
    </ChoNeoGuestPassContext.Provider>
  );
}

async function loadChoNeoGuestProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from(CHO_NEO_GUEST_PROFILE_TABLE)
    .select(
      "user_id, display_name, normalized_display_name, avatar_key, status",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapChoNeoGuestProfileRow(data);
}

function ChoNeoGuestPassModal({
  onClose,
  onComplete,
  open,
  supabase,
}: {
  onClose: () => void;
  onComplete: (profile: ChoNeoGuestPassProfile, session: Session) => Promise<void>;
  open: boolean;
  supabase: SupabaseClient;
}) {
  const [nickname, setNickname] = useState("");
  const [avatarKey, setAvatarKey] = useState(CHO_NEO_AVATARS[0].id);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setStatus("idle");
    setMessage("");
    setTurnstileToken("");
  }, [open]);

  async function submit() {
    const validation = validateChoNeoGuestDisplayName(nickname);
    if (validation.ok === false) {
      setStatus("error");
      setMessage(validation.message);
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const existingSessionResult = await supabase.auth.getSession();
      let activeSession = existingSessionResult.data.session ?? null;

      if (!activeSession?.user) {
        const captchaToken = turnstileToken || getLocalTurnstileTestToken();
        if (!captchaToken) {
          setStatus("error");
          setMessage("Chưa xác nhận được thử thách bảo vệ. Thử lại giúp Chợ Neo nha.");
          return;
        }

        const sessionResult = await supabase.auth.signInAnonymously({
          options: { captchaToken },
        });

        if (sessionResult.error || !sessionResult.data.session?.user) {
          throw new Error("anonymous-sign-in-failed");
        }

        activeSession = sessionResult.data.session;
      }

      const userId = activeSession.user.id;
      const row = {
        avatar_key: resolveChoNeoGuestAvatarKey(avatarKey),
        display_name: validation.displayName,
        last_seen_at: new Date().toISOString(),
        normalized_display_name: validation.normalizedDisplayName,
        status: "active",
        updated_at: new Date().toISOString(),
        user_id: userId,
      };

      const { data, error } = await supabase
        .from(CHO_NEO_GUEST_PROFILE_TABLE)
        .upsert(row, { onConflict: "user_id" })
        .select(
          "user_id, display_name, normalized_display_name, avatar_key, status",
        )
        .single();

      if (error || !data) {
        throw new Error("guest-profile-save-failed");
      }

      await onComplete(
        mapChoNeoGuestProfileRow(data),
        activeSession,
      );
    } catch {
      setStatus("error");
      setMessage("Chưa nhận được thẻ. Thử lại một nhịp nha.");
    }
  }

  if (!open) return null;

  return (
    <div aria-modal="true" className="cho-neo-pass-overlay" role="dialog">
      <button
        aria-label="Đóng Thẻ Chợ Neo"
        className="cho-neo-pass-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className="cho-neo-pass-card">
        <header>
          <div>
            <h2>Nhận Thẻ Chợ Neo</h2>
            <p>
              Không cần email hay mật khẩu. Chọn một tên để Chợ Neo nhớ bạn trên
              thiết bị này.
            </p>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <label className="cho-neo-pass-field">
          <span>Tên Chợ Neo</span>
          <input
            maxLength={24}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Ví dụ: Mai Calgary"
            value={nickname}
          />
        </label>
        <fieldset className="cho-neo-pass-avatars">
          <legend>Chọn avatar nếu muốn</legend>
          <div>
            {CHO_NEO_AVATARS.slice(0, 8).map((avatar) => (
              <button
                aria-pressed={avatarKey === avatar.id}
                className={avatarKey === avatar.id ? "selected" : ""}
                key={avatar.id}
                onClick={() => setAvatarKey(avatar.id)}
                type="button"
              >
                <span aria-hidden="true">{avatar.emoji}</span>
                <small>{avatar.name}</small>
              </button>
            ))}
          </div>
        </fieldset>
        <ChoNeoTurnstileSlot
          onError={() => {
            setTurnstileToken("");
            setMessage("Thử thách bảo vệ chưa xong. Thử lại giúp Chợ Neo nha.");
          }}
          onToken={setTurnstileToken}
        />
        <p className="cho-neo-pass-note">
          Thẻ được giữ trên trình duyệt này. Xóa dữ liệu trình duyệt hoặc đổi máy
          có thể làm mất thẻ.
        </p>
        {message ? (
          <p className="cho-neo-pass-message" role={status === "error" ? "alert" : "status"}>
            {message}
          </p>
        ) : null}
        <button
          className="cho-neo-pass-primary"
          disabled={status === "saving"}
          onClick={submit}
          type="button"
        >
          {status === "saving" ? "Đang nhận thẻ..." : "Nhận thẻ và tiếp tục"}
        </button>
      </section>
      <ChoNeoGuestPassStyles />
    </div>
  );
}

function ChoNeoGuestProfileSheet({
  onClose,
  onRefresh,
  open,
  profile,
  supabase,
}: {
  onClose: () => void;
  onRefresh: () => Promise<void>;
  open: boolean;
  profile: ChoNeoGuestPassProfile | null;
  supabase: SupabaseClient;
}) {
  const [nickname, setNickname] = useState("");
  const [avatarKey, setAvatarKey] = useState(CHO_NEO_AVATARS[0].id);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !profile) return;
    setNickname(profile.displayName);
    setAvatarKey(profile.avatarKey ?? CHO_NEO_AVATARS[0].id);
    setMessage("");
  }, [open, profile]);

  async function saveProfile() {
    if (!profile) return;
    const validation = validateChoNeoGuestDisplayName(nickname);
    if (validation.ok === false) {
      setMessage(validation.message);
      return;
    }

    const { error } = await supabase
      .from(CHO_NEO_GUEST_PROFILE_TABLE)
      .update({
        avatar_key: resolveChoNeoGuestAvatarKey(avatarKey),
        display_name: validation.displayName,
        normalized_display_name: validation.normalizedDisplayName,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", profile.userId);

    if (error) {
      setMessage("Chưa lưu được thẻ. Thử lại giúp Chợ Neo nha.");
      return;
    }

    await onRefresh();
    setMessage("Đã lưu Thẻ Chợ Neo.");
  }

  async function removeFromDevice() {
    const confirmed = window.confirm(
      "Bạn có thể mất tên, lịch sử và quyền quản lý nội dung gắn với thẻ này trên thiết bị này.",
    );
    if (!confirmed) return;
    await supabase.auth.signOut();
    onClose();
    window.location.reload();
  }

  if (!open || !profile) return null;

  return (
    <div aria-modal="true" className="cho-neo-pass-overlay" role="dialog">
      <button
        aria-label="Đóng hồ sơ Thẻ Chợ Neo"
        className="cho-neo-pass-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className="cho-neo-pass-card cho-neo-profile-card">
        <header>
          <div>
            <h2>Thẻ Chợ Neo</h2>
            <p>Đổi tên hoặc avatar cho thiết bị này.</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <label className="cho-neo-pass-field">
          <span>Tên Chợ Neo</span>
          <input
            maxLength={24}
            onChange={(event) => setNickname(event.target.value)}
            value={nickname}
          />
        </label>
        <fieldset className="cho-neo-pass-avatars">
          <legend>Avatar</legend>
          <div>
            {CHO_NEO_AVATARS.slice(0, 8).map((avatar) => (
              <button
                aria-pressed={avatarKey === avatar.id}
                className={avatarKey === avatar.id ? "selected" : ""}
                key={avatar.id}
                onClick={() => setAvatarKey(avatar.id)}
                type="button"
              >
                <span aria-hidden="true">{avatar.emoji}</span>
                <small>{avatar.name}</small>
              </button>
            ))}
          </div>
        </fieldset>
        {message ? <p className="cho-neo-pass-message">{message}</p> : null}
        <button className="cho-neo-pass-primary" onClick={saveProfile} type="button">
          Lưu thay đổi
        </button>
        <button className="cho-neo-pass-danger" onClick={removeFromDevice} type="button">
          Bỏ thẻ khỏi máy này
        </button>
        <p className="cho-neo-pass-note">
          Bạn có thể mất tên, lịch sử và quyền quản lý nội dung gắn với thẻ này
          trên thiết bị này.
        </p>
      </section>
      <ChoNeoGuestPassStyles />
    </div>
  );
}

function ChoNeoTurnstileSlot({
  onError,
  onToken,
}: {
  onError: () => void;
  onToken: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetRef = useRef<string | null>(null);

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    if (!siteKey) {
      onToken(getLocalTurnstileTestToken() ?? "");
      return;
    }

    const win = window as TurnstileWindow;
    const renderWidget = () => {
      if (!containerRef.current || !win.turnstile || widgetRef.current) return;
      widgetRef.current = win.turnstile.render(containerRef.current, {
        "error-callback": onError,
        "expired-callback": () => {
          onToken("");
          onError();
        },
        callback: onToken,
        sitekey: siteKey,
      });
    };

    if (win.turnstile) {
      renderWidget();
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);
  }, [onError, onToken]);

  return (
    <div className="cho-neo-turnstile">
      <div ref={containerRef} />
      {!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ? (
        <span>Turnstile test mode sẵn sàng.</span>
      ) : null}
    </div>
  );
}

function getLocalTurnstileTestToken() {
  if (typeof window === "undefined") return "";
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    process.env.NODE_ENV === "test"
  ) {
    return LOCAL_TEST_TURNSTILE_TOKEN;
  }
  return "";
}

function ChoNeoGuestPassStyles() {
  return (
    <style>{`
      .cho-neo-pass-overlay {
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: grid;
        place-items: center;
        padding: max(18px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
      }

      .cho-neo-pass-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(5, 8, 15, 0.72);
        backdrop-filter: blur(10px);
      }

      .cho-neo-pass-card {
        position: relative;
        z-index: 1;
        display: grid;
        gap: 13px;
        width: min(460px, calc(100vw - 28px));
        max-height: min(90svh, 720px);
        overflow: auto;
        padding: 18px;
        border: 1px solid rgba(248, 211, 145, 0.34);
        border-radius: 22px;
        color: #fff1cf;
        background:
          radial-gradient(circle at 18% 0%, rgba(248, 211, 145, 0.13), transparent 28%),
          linear-gradient(180deg, #351724, #1a0d14);
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.46);
      }

      .cho-neo-pass-card header {
        display: flex;
        justify-content: space-between;
        gap: 14px;
      }

      .cho-neo-pass-card h2,
      .cho-neo-pass-card p {
        margin: 0;
      }

      .cho-neo-pass-card h2 {
        color: #fff7df;
        font-size: 22px;
        font-weight: 950;
      }

      .cho-neo-pass-card header p,
      .cho-neo-pass-note {
        color: #e8cf9d;
        font-size: 13px;
        font-weight: 730;
        line-height: 1.45;
      }

      .cho-neo-pass-card header > button {
        width: 34px;
        height: 34px;
        border: 1px solid rgba(248, 211, 145, 0.2);
        border-radius: 999px;
        color: #ffe7b7;
        background: rgba(255, 247, 237, 0.06);
        cursor: pointer;
        font-size: 22px;
      }

      .cho-neo-pass-field,
      .cho-neo-pass-avatars {
        display: grid;
        gap: 8px;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }

      .cho-neo-pass-field span,
      .cho-neo-pass-avatars legend {
        color: #ffe7b7;
        font-size: 13px;
        font-weight: 900;
      }

      .cho-neo-pass-field input {
        width: 100%;
        min-height: 44px;
        padding: 0 12px;
        border: 1px solid rgba(248, 211, 145, 0.26);
        border-radius: 13px;
        color: #fff7df;
        background: #1b0d14;
        font: inherit;
      }

      .cho-neo-pass-avatars div {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }

      .cho-neo-pass-avatars button {
        display: grid;
        gap: 4px;
        min-height: 58px;
        padding: 7px;
        border: 1px solid rgba(248, 211, 145, 0.18);
        border-radius: 13px;
        color: #f7dfad;
        background: rgba(255, 247, 237, 0.05);
        cursor: pointer;
        font: inherit;
      }

      .cho-neo-pass-avatars button.selected {
        border-color: rgba(248, 211, 145, 0.72);
        background: rgba(248, 211, 145, 0.14);
      }

      .cho-neo-pass-avatars small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
        font-weight: 850;
      }

      .cho-neo-turnstile {
        min-height: 38px;
        color: #c9ac7a;
        font-size: 12px;
        font-weight: 800;
      }

      .cho-neo-pass-message {
        padding: 10px;
        border: 1px solid rgba(94, 234, 212, 0.4);
        border-radius: 13px;
        color: #f7dfad;
        background: rgba(15, 23, 42, 0.45);
        font-size: 13px;
        font-weight: 850;
      }

      .cho-neo-pass-primary,
      .cho-neo-pass-danger {
        min-height: 44px;
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 950;
      }

      .cho-neo-pass-primary {
        border: 1px solid rgba(248, 211, 145, 0.52);
        color: #241019;
        background: #f0c36d;
      }

      .cho-neo-pass-primary:disabled {
        cursor: default;
        opacity: 0.7;
      }

      .cho-neo-pass-danger {
        border: 1px solid rgba(248, 113, 113, 0.44);
        color: #fecaca;
        background: rgba(127, 29, 29, 0.2);
      }

      @media (max-width: 640px) {
        .cho-neo-pass-overlay {
          align-items: end;
        }

        .cho-neo-pass-card {
          width: 100%;
          max-height: min(92svh, 760px);
          padding-bottom: max(18px, env(safe-area-inset-bottom));
          border-radius: 21px;
        }

        .cho-neo-pass-avatars div {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `}</style>
  );
}
