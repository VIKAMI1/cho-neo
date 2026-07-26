"use client";

import { useChoNeoGuestPass } from "./ChoNeoGuestPassProvider";

export function ChoNeoGuestPassHeaderControl() {
  const { ensureChoNeoPass, openProfileSheet, profile } = useChoNeoGuestPass();

  if (profile?.status === "active") {
    return (
      <button
        className="village-nav-card village-login-link village-pass-link village-pass-active"
        onClick={openProfileSheet}
        type="button"
      >
        <span aria-hidden="true" className="village-nav-icon village-pass-avatar">
          {profile.avatar.emoji}
        </span>
        <span>
          <strong>{profile.displayName}</strong>
          <small>Thẻ Chợ Neo</small>
        </span>
      </button>
    );
  }

  return (
    <button
      className="village-nav-card village-login-link village-pass-link"
      onClick={() => ensureChoNeoPass(async () => undefined)}
      type="button"
    >
      <span aria-hidden="true" className="village-nav-icon">
        <svg viewBox="0 0 48 48" focusable="false">
          <path d="M10 14h28a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
          <path d="M14 22h12M14 29h18M34 20h3M34 25h3" />
        </svg>
      </span>
      <span>
        <strong>Nhận Thẻ</strong>
        <small>Chợ Neo</small>
      </span>
    </button>
  );
}
