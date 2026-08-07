"use client";

import Image from "next/image";
import { createClient } from "@/lib/supabase-browser";
import {
  CHO_NEO_MEMBER_PROFILE_TABLE,
  CHO_NEO_MEMBER_OPEN_EVENT,
  CHO_NEO_MEMBER_PROFILE_EVENT,
  CHO_NEO_NAIL_ROLES,
  isChoNeoNailRole,
  isVerifiedChoNeoMemberProfile,
  mapChoNeoMemberProfileRow,
  resolveChoNeoMemberAvatarKey,
  validateChoNeoMemberDisplayName,
  type ChoNeoNailRole,
  type ChoNeoMemberProfile,
} from "@/lib/cho-neo/member-identity";
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
const CHO_NEO_MEMBER_PENDING_ACTION_KEY = "cho-neo:member-pending-action";

type ChoNeoMemberContextValue = {
  ensureChoNeoMember: (action: PendingAction) => Promise<void>;
  openProfileSheet: () => void;
  profile: ChoNeoMemberProfile | null;
  refreshProfile: () => Promise<void>;
  saveMemberProfile: (input: {
    avatarKey: string;
    displayName: string;
  }) => Promise<{ message?: string; ok: boolean }>;
  session: Session | null;
  status: "checking" | "public" | "ready" | "error";
};

const ChoNeoMemberContext =
  createContext<ChoNeoMemberContextValue | null>(null);

export function useChoNeoMember() {
  const value = useContext(ChoNeoMemberContext);
  if (!value) {
    throw new Error("useChoNeoMember must be used inside ChoNeoMemberProvider");
  }
  return value;
}

export function ChoNeoMemberProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ChoNeoMemberProfile | null>(null);
  const [status, setStatus] =
    useState<ChoNeoMemberContextValue["status"]>("checking");
  const [isMemberVerificationOpen, setIsMemberVerificationOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pendingActionRef = useRef<PendingAction | null>(null);
  const hasResumedRef = useRef(false);

  const refreshProfile = useCallback(async () => {
    const localMock = getLocalMemberMock();
    if (["verified", "profile", "resumed-vote"].includes(localMock)) {
      const mockProfile = getMockVerifiedMemberProfile();
      setSession(getMockMemberSession());
      setProfile(mockProfile);
      setStatus("ready");
      setIsProfileOpen(localMock === "profile");
      window.dispatchEvent(
        new CustomEvent(CHO_NEO_MEMBER_PROFILE_EVENT, {
          detail: mockProfile,
        }),
      );
      return;
    }

    if (localMock === "pending" || localMock === "invalid-invitation") {
      setSession(getMockMemberSession());
      setProfile(null);
      setStatus("public");
      setIsMemberVerificationOpen(true);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const nextSession = sessionData.session ?? null;
    setSession(nextSession);

    if (!nextSession?.user) {
      setProfile(null);
      setStatus("public");
      return;
    }

    const nextProfile = await loadChoNeoMemberProfile(supabase, nextSession.user.id);
    setProfile(nextProfile);
    setStatus(isVerifiedChoNeoMemberProfile(nextProfile) ? "ready" : "public");
    setIsMemberVerificationOpen(!isVerifiedChoNeoMemberProfile(nextProfile));

    if (nextProfile) {
      window.dispatchEvent(
        new CustomEvent(CHO_NEO_MEMBER_PROFILE_EVENT, {
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
      setIsMemberVerificationOpen(true);
    }

    window.addEventListener(CHO_NEO_MEMBER_OPEN_EVENT, handleOpen);
    return () =>
      window.removeEventListener(CHO_NEO_MEMBER_OPEN_EVENT, handleOpen);
  }, []);

  const ensureChoNeoMember = useCallback(
    async (action: PendingAction) => {
      if (isVerifiedChoNeoMemberProfile(profile)) {
        await action();
        return;
      }

      pendingActionRef.current = action;
      hasResumedRef.current = false;
      if (!session?.user) {
        rememberPendingMemberAction();
        const returnTo = encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        );
        window.location.assign(`/login?next=${returnTo}`);
        return;
      }
      setIsMemberVerificationOpen(true);
    },
    [profile, session],
  );

  const saveMemberProfile = useCallback(
    async (input: { avatarKey: string; displayName: string }) => {
      if (!profile) {
        return { message: "Chưa có hồ sơ thành viên để lưu.", ok: false };
      }

      const validation = validateChoNeoMemberDisplayName(input.displayName);
      if (validation.ok === false) {
        return { message: validation.message, ok: false };
      }

      const { error } = await supabase
        .from(CHO_NEO_MEMBER_PROFILE_TABLE)
        .update({
          avatar_key: resolveChoNeoMemberAvatarKey(input.avatarKey),
          display_name: validation.displayName,
          normalized_display_name: validation.normalizedDisplayName,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.userId);

      if (error) {
        return {
          message: "Chưa lưu được hồ sơ. Thử lại giúp Chợ Neo nha.",
          ok: false,
        };
      }

      await refreshProfile();
      return { ok: true };
    },
    [profile, refreshProfile, supabase],
  );

  const completeMembership = useCallback(
    async (nextProfile: ChoNeoMemberProfile, nextSession: Session) => {
      setSession(nextSession);
      setProfile(nextProfile);
      setStatus("ready");
      setIsMemberVerificationOpen(false);
      forgetPendingMemberAction();
      window.dispatchEvent(
        new CustomEvent(CHO_NEO_MEMBER_PROFILE_EVENT, {
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
      ensureChoNeoMember,
      openProfileSheet: () => setIsProfileOpen(true),
      profile,
      refreshProfile,
      saveMemberProfile,
      session,
      status,
    }),
    [
      ensureChoNeoMember,
      profile,
      refreshProfile,
      saveMemberProfile,
      session,
      status,
    ],
  );

  return (
    <ChoNeoMemberContext.Provider value={value}>
      {children}
      <ChoNeoMemberVerificationModal
        onComplete={completeMembership}
        onClose={() => setIsMemberVerificationOpen(false)}
        open={isMemberVerificationOpen}
        profile={profile}
        supabase={supabase}
      />
      <ChoNeoMemberProfileSheet
        onClose={() => setIsProfileOpen(false)}
        onRefresh={refreshProfile}
        open={isProfileOpen}
        profile={profile}
        saveMemberProfile={saveMemberProfile}
        supabase={supabase}
      />
    </ChoNeoMemberContext.Provider>
  );
}

async function loadChoNeoMemberProfile(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from(CHO_NEO_MEMBER_PROFILE_TABLE)
    .select(
      "user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return mapChoNeoMemberProfileRow(data);
}

function ChoNeoMemberVerificationModal({
  onClose,
  onComplete,
  open,
  profile,
  supabase,
}: {
  onClose: () => void;
  onComplete: (profile: ChoNeoMemberProfile, session: Session) => Promise<void>;
  open: boolean;
  profile: ChoNeoMemberProfile | null;
  supabase: SupabaseClient;
}) {
  const [nickname, setNickname] = useState("");
  const [avatarKey, setAvatarKey] = useState(CHO_NEO_AVATARS[0].id);
  const [invitationCode, setInvitationCode] = useState("");
  const [nailRole, setNailRole] =
    useState<ChoNeoNailRole>("nail_technician");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (getLocalMemberMock() === "invalid-invitation") {
      setStatus("error");
      setMessage("Lời mời chưa đúng. Kiểm tra lại giúp Chợ Neo nha.");
      return;
    }

    if (!open) return;
    setStatus("idle");
    setMessage("");
    setInvitationCode("");
  }, [open]);

  async function submit() {
    const validation = validateChoNeoMemberDisplayName(nickname);
    if (validation.ok === false) {
      setStatus("error");
      setMessage(validation.message);
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const existingSessionResult = await supabase.auth.getSession();
      const activeSession = existingSessionResult.data.session ?? null;

      if (!activeSession?.user) {
        window.location.assign("/login?next=/cho-neo");
        return;
      }

      if (!invitationCode.trim()) {
        setStatus("error");
        setMessage("Nhập lời mời Chợ Neo để hoàn tất thành viên.");
        return;
      }

      if (!isChoNeoNailRole(nailRole)) {
        setStatus("error");
        setMessage("Chọn vai trò trong ngành nail.");
        return;
      }

      const response = await fetch("/api/cho-neo/member/verify", {
        body: JSON.stringify({
          avatarKey: resolveChoNeoMemberAvatarKey(avatarKey),
          displayName: validation.displayName,
          invitationCode,
          nailRole,
        }),
        headers: {
          Authorization: `Bearer ${activeSession.access_token}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.profile) {
        setStatus("error");
        setMessage(
          payload?.error ??
            "Lời mời chưa dùng được. Kiểm tra lại rồi thử một nhịp nha.",
        );
        return;
      }

      await onComplete(
        mapChoNeoMemberProfileRow(payload.profile),
        activeSession,
      );
    } catch {
      setStatus("error");
      setMessage("Chưa xác nhận được thành viên. Thử lại một nhịp nha.");
    }
  }

  if (!open) return null;

  const isRestricted =
    profile?.status === "suspended" || profile?.status === "rejected";

  if (isRestricted) {
    return (
      <div aria-modal="true" className="cho-neo-member-overlay" role="dialog">
        <button
          aria-label="Đóng trạng thái thành viên"
          className="cho-neo-member-backdrop"
          onClick={onClose}
          type="button"
        />
        <section className="cho-neo-member-card">
          <header>
            <div>
              <h2>Chưa vào khu thành viên được</h2>
              <p>
                Trạng thái thành viên Chợ Neo hiện chưa cho phép bình chọn hoặc
                đăng bài. Bạn vẫn có thể dạo các khu công khai.
              </p>
            </div>
            <button aria-label="Đóng" onClick={onClose} type="button">
              ×
            </button>
          </header>
          <p className="cho-neo-member-message" role="status">
            Hồ sơ này đang bị giới hạn. Liên hệ Chợ Neo nếu bạn nghĩ có nhầm
            lẫn.
          </p>
        </section>
        <ChoNeoMemberStyles />
      </div>
    );
  }

  return (
    <div aria-modal="true" className="cho-neo-member-overlay" role="dialog">
      <button
        aria-label="Đóng xác nhận thành viên"
        className="cho-neo-member-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className="cho-neo-member-card">
        <header>
          <div>
            <h2>Xác nhận người trong nghề</h2>
            <p>
              Chợ Neo dành cho người làm trong ngành nail. Nhập lời mời để hoàn
              tất thành viên.
            </p>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <label className="cho-neo-member-field">
          <span>Lời mời Chợ Neo</span>
          <input
            autoComplete="one-time-code"
            onChange={(event) => setInvitationCode(event.target.value)}
            placeholder="Nhập mã lời mời"
            value={invitationCode}
          />
        </label>
        <label className="cho-neo-member-field">
          <span>Vai trò trong ngành nail</span>
          <select
            onChange={(event) =>
              setNailRole(
                isChoNeoNailRole(event.target.value)
                  ? event.target.value
                  : "nail_technician",
              )
            }
            value={nailRole}
          >
            {CHO_NEO_NAIL_ROLES.map((role) => (
              <option key={role} value={role}>
                {getNailRoleLabel(role)}
              </option>
            ))}
          </select>
        </label>
        <label className="cho-neo-member-field">
          <span>Nickname Chợ Neo</span>
          <input
            maxLength={24}
            onChange={(event) => setNickname(event.target.value)}
            placeholder="Ví dụ: Mai Calgary"
            value={nickname}
          />
        </label>
        <fieldset className="cho-neo-member-avatars">
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
                <Image
                  alt=""
                  aria-hidden="true"
                  height={56}
                  src={avatar.src}
                  width={56}
                />
                <small>{avatar.nameVi}</small>
                <span>{avatar.nameEn}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <p className="cho-neo-member-note">
          Bạn chỉ cần làm bước này một lần.
        </p>
        {message ? (
          <p className="cho-neo-member-message" role={status === "error" ? "alert" : "status"}>
            {message}
          </p>
        ) : null}
        <button
          className="cho-neo-member-primary"
          disabled={status === "saving"}
          onClick={submit}
          type="button"
        >
          {status === "saving" ? "Đang xác nhận..." : "Vào Chợ"}
        </button>
      </section>
      <ChoNeoMemberStyles />
    </div>
  );
}

function rememberPendingMemberAction() {
  try {
    window.sessionStorage.setItem(CHO_NEO_MEMBER_PENDING_ACTION_KEY, "1");
  } catch {
    // Storage can be unavailable in private modes; OAuth still proceeds.
  }
}

function forgetPendingMemberAction() {
  try {
    window.sessionStorage.removeItem(CHO_NEO_MEMBER_PENDING_ACTION_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

function ChoNeoMemberProfileSheet({
  onClose,
  onRefresh,
  open,
  profile,
  saveMemberProfile,
  supabase,
}: {
  onClose: () => void;
  onRefresh: () => Promise<void>;
  open: boolean;
  profile: ChoNeoMemberProfile | null;
  saveMemberProfile: (input: {
    avatarKey: string;
    displayName: string;
  }) => Promise<{ message?: string; ok: boolean }>;
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
    const validation = validateChoNeoMemberDisplayName(nickname);
    if (validation.ok === false) {
      setMessage(validation.message);
      return;
    }

    const result = await saveMemberProfile({
      avatarKey,
      displayName: validation.displayName,
    });

    if (!result.ok) {
      setMessage(result.message ?? "Chưa lưu được hồ sơ. Thử lại giúp Chợ Neo nha.");
      return;
    }

    await onRefresh();
    setMessage("Đã lưu hồ sơ Chợ Neo.");
  }

  async function removeFromDevice() {
    const confirmed = window.confirm(
      "Đăng xuất khỏi Chợ Neo?",
    );
    if (!confirmed) return;
    await supabase.auth.signOut();
    onClose();
    window.location.reload();
  }

  if (!open || !profile) return null;

  return (
    <div aria-modal="true" className="cho-neo-member-overlay" role="dialog">
      <button
        aria-label="Đóng hồ sơ thành viên Chợ Neo"
        className="cho-neo-member-backdrop"
        onClick={onClose}
        type="button"
      />
      <section className="cho-neo-member-card cho-neo-profile-card">
        <header>
          <div>
            <h2>Thành viên Chợ Neo</h2>
            <p>Đổi tên hoặc avatar hiển thị trong Chợ Neo.</p>
          </div>
          <button aria-label="Đóng" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <label className="cho-neo-member-field">
          <span>Nickname Chợ Neo</span>
          <input
            maxLength={24}
            onChange={(event) => setNickname(event.target.value)}
            value={nickname}
          />
        </label>
        <fieldset className="cho-neo-member-avatars">
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
                <Image
                  alt=""
                  aria-hidden="true"
                  height={56}
                  src={avatar.src}
                  width={56}
                />
                <small>{avatar.nameVi}</small>
                <span>{avatar.nameEn}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {message ? <p className="cho-neo-member-message">{message}</p> : null}
        <button className="cho-neo-member-primary" onClick={saveProfile} type="button">
          Lưu thay đổi
        </button>
        <button className="cho-neo-member-danger" onClick={removeFromDevice} type="button">
          Đăng xuất
        </button>
        <p className="cho-neo-member-note">
          Phiên Supabase của bạn được giữ để lần sau ghé Chợ Neo không cần xác
          nhận lại.
        </p>
      </section>
      <ChoNeoMemberStyles />
    </div>
  );
}

function getNailRoleLabel(role: ChoNeoNailRole) {
  switch (role) {
    case "nail_technician":
      return "Thợ nail";
    case "salon_owner":
      return "Chủ tiệm";
    case "nail_student":
      return "Người học nghề";
    case "supplier":
      return "Nhà cung cấp";
    case "educator":
      return "Người dạy nghề";
    case "other_industry":
      return "Vai trò khác trong ngành";
  }
}

function getLocalMemberMock() {
  if (typeof window === "undefined") return "";
  if (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "";
  }
  return new URLSearchParams(window.location.search).get("choNeoMemberMock") ?? "";
}

function getMockMemberSession() {
  return {
    access_token: "local-mock-member-session",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    refresh_token: "local-mock-refresh-token",
    token_type: "bearer",
    user: {
      app_metadata: { provider: "google", providers: ["google"] },
      aud: "authenticated",
      created_at: new Date(0).toISOString(),
      id: "00000000-0000-4000-8000-000000000099",
      is_anonymous: false,
      role: "authenticated",
      updated_at: new Date(0).toISOString(),
    },
  } as Session;
}

function getMockVerifiedMemberProfile(): ChoNeoMemberProfile {
  const avatarKey = CHO_NEO_AVATARS[0].id;
  return {
    avatar: CHO_NEO_AVATARS[0],
    avatarKey,
    displayName: "Mai Calgary",
    nailRole: "nail_technician",
    normalizedDisplayName: "mai calgary",
    status: "verified_nail_member",
    userId: "00000000-0000-4000-8000-000000000099",
  };
}

function ChoNeoMemberStyles() {
  return (
    <style>{`
      .cho-neo-member-overlay {
        position: fixed;
        inset: 0;
        z-index: 1200;
        display: grid;
        place-items: center;
        padding: max(18px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(18px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
      }

      .cho-neo-member-backdrop {
        position: absolute;
        inset: 0;
        border: 0;
        background: rgba(5, 8, 15, 0.72);
        backdrop-filter: blur(10px);
      }

      .cho-neo-member-card {
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
        color: var(--cho-neo-text-primary);
        background:
          radial-gradient(circle at 18% 0%, rgba(248, 211, 145, 0.13), transparent 28%),
          linear-gradient(180deg, #351724, #1a0d14);
        box-shadow: 0 28px 90px rgba(0, 0, 0, 0.46);
        font-family: var(--cho-neo-font-ui);
        font-weight: 400;
      }

      .cho-neo-member-card header {
        display: flex;
        justify-content: space-between;
        gap: 14px;
      }

      .cho-neo-member-card h2,
      .cho-neo-member-card p {
        margin: 0;
      }

      .cho-neo-member-card h2 {
        color: var(--cho-neo-text-primary);
        font-family: var(--cho-neo-font-display);
        font-size: 22px;
        font-weight: 500;
        line-height: 1.12;
      }

      .cho-neo-member-card header p,
      .cho-neo-member-note {
        color: var(--cho-neo-text-secondary);
        font-size: 13px;
        font-weight: 400;
        line-height: 1.45;
      }

      .cho-neo-member-card header > button {
        width: 34px;
        height: 34px;
        border: 1px solid rgba(248, 211, 145, 0.2);
        border-radius: 999px;
        color: var(--cho-neo-text-accent);
        background: rgba(255, 247, 237, 0.06);
        cursor: pointer;
        font-size: 22px;
      }

      .cho-neo-member-field,
      .cho-neo-member-avatars {
        display: grid;
        gap: 8px;
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }

      .cho-neo-member-field span,
      .cho-neo-member-avatars legend {
        color: var(--cho-neo-text-secondary);
        font-size: 13px;
        font-weight: 500;
      }

      .cho-neo-member-field input,
      .cho-neo-member-field select {
        width: 100%;
        min-height: 44px;
        padding: 0 12px;
        border: 1px solid rgba(248, 211, 145, 0.26);
        border-radius: 13px;
        color: var(--cho-neo-text-primary);
        background: #1b0d14;
        font: inherit;
      }

      .cho-neo-member-avatars div {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }

      .cho-neo-member-avatars button {
        display: grid;
        gap: 4px;
        min-height: 92px;
        align-content: start;
        padding: 7px;
        overflow: hidden;
        border: 1px solid rgba(248, 211, 145, 0.18);
        border-radius: 13px;
        color: var(--cho-neo-text-secondary);
        background: rgba(255, 247, 237, 0.05);
        cursor: pointer;
        font: inherit;
      }

      .cho-neo-member-avatars button.selected {
        border-color: rgba(248, 211, 145, 0.72);
        background: rgba(248, 211, 145, 0.14);
      }

      .cho-neo-member-avatars button img {
        width: 56px;
        height: 56px;
        justify-self: center;
        border-radius: 11px;
        object-fit: cover;
      }

      .cho-neo-member-avatars small {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
        font-weight: 400;
      }

      .cho-neo-member-avatars button > span:last-child {
        overflow: hidden;
        color: var(--cho-neo-text-secondary);
        font-size: 9px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cho-neo-member-message {
        padding: 10px;
        border: 1px solid rgba(94, 234, 212, 0.4);
        border-radius: 13px;
        color: var(--cho-neo-text-secondary);
        background: rgba(15, 23, 42, 0.45);
        font-size: 13px;
        font-weight: 400;
      }

      .cho-neo-member-primary,
      .cho-neo-member-danger {
        min-height: 44px;
        border-radius: 999px;
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
      }

      .cho-neo-member-primary {
        border: 1px solid rgba(248, 211, 145, 0.52);
        color: #241019;
        background: #f0c36d;
      }

      .cho-neo-member-primary:disabled {
        cursor: default;
        opacity: 0.7;
      }

      .cho-neo-member-danger {
        border: 1px solid rgba(248, 113, 113, 0.44);
        color: #fecaca;
        background: rgba(127, 29, 29, 0.2);
      }

      @media (max-width: 640px) {
        .cho-neo-member-overlay {
          align-items: end;
        }

        .cho-neo-member-card {
          width: 100%;
          max-height: min(92svh, 760px);
          padding-bottom: max(18px, env(safe-area-inset-bottom));
          border-radius: 21px;
        }

        .cho-neo-member-avatars div {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
    `}</style>
  );
}
