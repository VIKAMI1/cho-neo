"use client";

import Image from "next/image";
import { useChoNeoMember } from "./ChoNeoMemberProvider";
import { isVerifiedChoNeoMemberProfile } from "@/lib/cho-neo/member-identity";

export function ChoNeoMemberHeaderControl() {
  const { ensureChoNeoMember, openProfileSheet, profile } = useChoNeoMember();
  const facebookEnabled =
    process.env.NEXT_PUBLIC_CHO_NEO_FACEBOOK_LOGIN_ENABLED === "true";

  if (isVerifiedChoNeoMemberProfile(profile)) {
    return (
      <button
        className="village-nav-card village-login-link village-member-link village-member-active"
        onClick={openProfileSheet}
        type="button"
      >
        <span aria-hidden="true" className="village-nav-icon village-member-avatar">
          <Image
            alt=""
            height={34}
            src={profile.avatar.src}
            width={34}
          />
        </span>
        <span>
          <strong>{profile.displayName}</strong>
          <small>Thành viên</small>
        </span>
      </button>
    );
  }

  return (
    <button
      className="village-nav-card village-login-link village-member-link"
      onClick={() => ensureChoNeoMember(async () => undefined)}
      type="button"
    >
      <span aria-hidden="true" className="village-nav-icon">
        <svg viewBox="0 0 48 48" focusable="false">
          <path d="M10 14h28a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
          <path d="M14 22h12M14 29h18M34 20h3M34 25h3" />
        </svg>
      </span>
      <span>
        <strong>Vào Chợ</strong>
        <small>{facebookEnabled ? "Google / Facebook" : "Google"}</small>
      </span>
    </button>
  );
}
