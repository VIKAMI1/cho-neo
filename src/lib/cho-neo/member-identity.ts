import {
  CHO_NEO_AVATARS,
  getAvatarById,
  LEGACY_CHO_NEO_AVATAR_ID_MAP,
  resolveChoNeoAvatarId,
  type ChoNeoAvatar,
} from "./avatar-identity";

export const CHO_NEO_MEMBER_PROFILE_TABLE = "cho_neo_member_profiles";
export const CHO_NEO_MEMBER_INVITATION_TABLE = "cho_neo_member_invitations";
export const CHO_NEO_MEMBER_PROFILE_EVENT = "cho-neo:member-identity-profile";
export const CHO_NEO_MEMBER_OPEN_EVENT = "cho-neo:member-identity-open";
export const CHO_NEO_MEMBER_NICKNAME_MIN_LENGTH = 2;
export const CHO_NEO_MEMBER_NICKNAME_MAX_LENGTH = 24;

export const CHO_NEO_NAIL_ROLES = [
  "nail_technician",
  "salon_owner",
  "nail_student",
  "supplier",
  "educator",
  "other_industry",
] as const;

export type ChoNeoNailRole = (typeof CHO_NEO_NAIL_ROLES)[number];

export const CHO_NEO_MEMBERSHIP_STATUSES = [
  "pending",
  "verified_nail_member",
  "suspended",
  "rejected",
] as const;

export type ChoNeoMembershipStatus =
  (typeof CHO_NEO_MEMBERSHIP_STATUSES)[number];

export type ChoNeoMemberProfile = {
  avatarKey: string | null;
  avatar: ChoNeoAvatar;
  displayName: string;
  nailRole: ChoNeoNailRole | null;
  normalizedDisplayName: string;
  status: ChoNeoMembershipStatus;
  userId: string;
};

export type ChoNeoMemberValidation =
  | { ok: true; displayName: string; normalizedDisplayName: string }
  | { ok: false; message: string; reason: string };

const URL_LIKE_PATTERN =
  /\b(?:https?:\/\/|www\.|[\w.-]+\.(?:com|net|org|io|co|ca|vn)\b)/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const ABUSIVE_PATTERN =
  /\b(?:fuck|shit|bitch|cunt|dick|pussy|asshole|đụ|địt|lồn|cặc|buồi)\b/i;

export function normalizeChoNeoMemberDisplayName(value: string) {
  return value
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateChoNeoMemberDisplayName(
  value: unknown,
): ChoNeoMemberValidation {
  if (typeof value !== "string") {
    return {
      message: "Chọn một nickname Chợ Neo nha.",
      ok: false,
      reason: "missing-display-name",
    };
  }

  const displayName = normalizeChoNeoMemberDisplayName(value);

  if (displayName.length < CHO_NEO_MEMBER_NICKNAME_MIN_LENGTH) {
    return {
      message: "Tên cần ít nhất 2 ký tự.",
      ok: false,
      reason: "display-name-too-short",
    };
  }

  if (displayName.length > CHO_NEO_MEMBER_NICKNAME_MAX_LENGTH) {
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

export function isApprovedChoNeoMemberAvatarKey(value: unknown): value is string {
  return (
    typeof value === "string" &&
    (CHO_NEO_AVATARS.some((avatar) => avatar.id === value) ||
      Object.prototype.hasOwnProperty.call(LEGACY_CHO_NEO_AVATAR_ID_MAP, value))
  );
}

export function resolveChoNeoMemberAvatarKey(value: unknown) {
  return isApprovedChoNeoMemberAvatarKey(value)
    ? resolveChoNeoAvatarId(value)
    : CHO_NEO_AVATARS[0].id;
}

export function isChoNeoNailRole(value: unknown): value is ChoNeoNailRole {
  return (
    typeof value === "string" &&
    CHO_NEO_NAIL_ROLES.includes(value as ChoNeoNailRole)
  );
}

export function isVerifiedChoNeoMemberProfile(
  profile: ChoNeoMemberProfile | null | undefined,
) {
  return profile?.status === "verified_nail_member";
}

export function mapChoNeoMemberProfileRow(row: {
  avatar_key: string | null;
  display_name: string;
  nail_role?: ChoNeoNailRole | null;
  normalized_display_name: string;
  membership_status?: ChoNeoMembershipStatus;
  status?: ChoNeoMembershipStatus;
  user_id: string;
}): ChoNeoMemberProfile {
  const avatarKey = row.avatar_key
    ? resolveChoNeoMemberAvatarKey(row.avatar_key)
    : null;

  return {
    avatar: getAvatarById(avatarKey ?? CHO_NEO_AVATARS[0].id),
    avatarKey,
    displayName: row.display_name,
    nailRole: row.nail_role ?? null,
    normalizedDisplayName: row.normalized_display_name,
    status: row.membership_status ?? row.status ?? "pending",
    userId: row.user_id,
  };
}
