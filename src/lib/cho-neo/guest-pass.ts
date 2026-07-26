import {
  CHO_NEO_AVATARS,
  getAvatarById,
  type ChoNeoAvatar,
} from "./avatar-identity";

export const CHO_NEO_GUEST_PROFILE_TABLE = "cho_neo_guest_profiles";
export const CHO_NEO_GUEST_PASS_PROFILE_EVENT = "cho-neo:guest-pass-profile";
export const CHO_NEO_GUEST_PASS_OPEN_EVENT = "cho-neo:guest-pass-open";
export const CHO_NEO_GUEST_PASS_NICKNAME_MIN_LENGTH = 2;
export const CHO_NEO_GUEST_PASS_NICKNAME_MAX_LENGTH = 24;

export type ChoNeoGuestPassProfile = {
  avatarKey: string | null;
  avatar: ChoNeoAvatar;
  displayName: string;
  normalizedDisplayName: string;
  status: "active" | "banned" | "suspended";
  userId: string;
};

export type ChoNeoGuestPassValidation =
  | { ok: true; displayName: string; normalizedDisplayName: string }
  | { ok: false; message: string; reason: string };

const URL_LIKE_PATTERN =
  /\b(?:https?:\/\/|www\.|[\w.-]+\.(?:com|net|org|io|co|ca|vn)\b)/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const ABUSIVE_PATTERN =
  /\b(?:fuck|shit|bitch|cunt|dick|pussy|asshole|đụ|địt|lồn|cặc|buồi)\b/i;

export function normalizeChoNeoGuestDisplayName(value: string) {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateChoNeoGuestDisplayName(
  value: unknown,
): ChoNeoGuestPassValidation {
  if (typeof value !== "string") {
    return {
      message: "Chọn một tên để nhận Thẻ Chợ Neo nha.",
      ok: false,
      reason: "missing-display-name",
    };
  }

  const displayName = normalizeChoNeoGuestDisplayName(value);

  if (displayName.length < CHO_NEO_GUEST_PASS_NICKNAME_MIN_LENGTH) {
    return {
      message: "Tên cần ít nhất 2 ký tự.",
      ok: false,
      reason: "display-name-too-short",
    };
  }

  if (displayName.length > CHO_NEO_GUEST_PASS_NICKNAME_MAX_LENGTH) {
    return {
      message: "Tên tối đa 24 ký tự.",
      ok: false,
      reason: "display-name-too-long",
    };
  }

  if (CONTROL_CHARACTER_PATTERN.test(displayName)) {
    return {
      message: "Tên này có ký tự không dùng được.",
      ok: false,
      reason: "display-name-control-character",
    };
  }

  if (URL_LIKE_PATTERN.test(displayName)) {
    return {
      message: "Tên không nhận link hay địa chỉ web.",
      ok: false,
      reason: "display-name-url",
    };
  }

  if (ABUSIVE_PATTERN.test(displayName)) {
    return {
      message: "Tên này chưa hợp không khí Chợ Neo.",
      ok: false,
      reason: "display-name-abusive",
    };
  }

  return {
    displayName,
    normalizedDisplayName: displayName.toLocaleLowerCase("vi"),
    ok: true,
  };
}

export function isApprovedChoNeoGuestAvatarKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    CHO_NEO_AVATARS.some((avatar) => avatar.id === value)
  );
}

export function resolveChoNeoGuestAvatarKey(value: unknown) {
  return isApprovedChoNeoGuestAvatarKey(value)
    ? value
    : CHO_NEO_AVATARS[0].id;
}

export function mapChoNeoGuestProfileRow(row: {
  avatar_key: string | null;
  display_name: string;
  normalized_display_name: string;
  status: "active" | "banned" | "suspended";
  user_id: string;
}): ChoNeoGuestPassProfile {
  const avatarKey = row.avatar_key
    ? resolveChoNeoGuestAvatarKey(row.avatar_key)
    : null;

  return {
    avatar: getAvatarById(avatarKey ?? CHO_NEO_AVATARS[0].id),
    avatarKey,
    displayName: row.display_name,
    normalizedDisplayName: row.normalized_display_name,
    status: row.status,
    userId: row.user_id,
  };
}
