import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHO_NEO_MEMBER_PROFILE_TABLE,
  isApprovedChoNeoMemberAvatarKey,
  isChoNeoNailRole,
  validateChoNeoMemberDisplayName,
} from "@/lib/cho-neo/member-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VerifyBody = {
  avatarKey?: unknown;
  displayName?: unknown;
  invitationCode?: unknown;
  nailRole?: unknown;
};

const INVITATION_ATTEMPT_WINDOW_MS = 60_000;
const INVITATION_ATTEMPT_MAX = 6;
const invitationAttemptBuckets = new Map<string, number[]>();

export async function POST(request: Request) {
  const userId = await getAuthenticatedChoNeoUserId(request);
  if (!userId) {
    return NextResponse.json(
      {
        error: "Đăng nhập Google hoặc Facebook trước khi xác nhận thành viên.",
        reason: "missing-session",
      },
      { status: 401 },
    );
  }

  const supabase = createChoNeoSupabaseServiceClient();
  if (!supabase) return unavailable("missing-service-role");

  const body = (await request.json().catch(() => null)) as VerifyBody | null;
  const displayName = validateChoNeoMemberDisplayName(body?.displayName);
  if (displayName.ok === false) {
    return NextResponse.json(
      { error: displayName.message, reason: displayName.reason },
      { status: 400 },
    );
  }

  if (!isChoNeoNailRole(body?.nailRole)) {
    return NextResponse.json(
      { error: "Chọn vai trò trong ngành nail.", reason: "invalid-role" },
      { status: 400 },
    );
  }

  const invitationCode =
    typeof body?.invitationCode === "string" ? body.invitationCode.trim() : "";
  if (!invitationCode) {
    return NextResponse.json(
      {
        error: "Nhập lời mời Chợ Neo để hoàn tất thành viên.",
        reason: "missing-invitation",
      },
      { status: 400 },
    );
  }

  const avatarKey = isApprovedChoNeoMemberAvatarKey(body?.avatarKey)
    ? body.avatarKey
    : null;
  const codeHash = hashChoNeoInvitationCode(invitationCode);
  const now = new Date().toISOString();

  const { data: existingProfile, error: profileReadError } = await supabase
    .from(CHO_NEO_MEMBER_PROFILE_TABLE)
    .select("user_id, membership_status")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileReadError) return unavailable("profile-read-failed");

  if (existingProfile?.membership_status === "verified_nail_member") {
    const { data, error } = await supabase
      .from(CHO_NEO_MEMBER_PROFILE_TABLE)
      .update({
        avatar_key: avatarKey,
        display_name: displayName.displayName,
        last_seen_at: now,
        nail_role: body.nailRole,
        normalized_display_name: displayName.normalizedDisplayName,
        updated_at: now,
      })
      .eq("user_id", userId)
      .select(
        "user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status",
      )
      .single();

    if (error || !data) return unavailable("profile-update-failed");
    return NextResponse.json({ profile: data });
  }

  const attemptKey = getInvitationAttemptKey(request, userId);
  if (isInvitationAttemptRateLimited(attemptKey)) {
    return NextResponse.json(
      {
        error: "Bạn thử lời mời hơi nhanh. Nghỉ một nhịp rồi thử lại nha.",
        reason: "invitation-rate-limited",
      },
      { status: 429 },
    );
  }

  const { data: profile, error: profileError } = await supabase.rpc(
    "redeem_cho_neo_member_invitation",
    {
      p_avatar_key: avatarKey,
      p_code_hash: codeHash,
      p_display_name: displayName.displayName,
      p_nail_role: body.nailRole,
      p_normalized_display_name: displayName.normalizedDisplayName,
      p_user_id: userId,
    },
  );

  if (profileError) {
    return invitationFailure(profileError.message);
  }

  const nextProfile = Array.isArray(profile) ? profile[0] : profile;
  if (!nextProfile) return unavailable("profile-save-failed");

  return NextResponse.json({ profile: nextProfile });
}

export function hashChoNeoInvitationCode(code: string) {
  return createHash("sha256")
    .update(`cho-neo-member-invitation-v1:${code.trim().toUpperCase()}`)
    .digest("hex");
}

async function getAuthenticatedChoNeoUserId(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseKey) return null;

  const { data, error } = await createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  }).auth.getUser(token);

  if (error || !data.user || data.user.is_anonymous) return null;
  return data.user.id;
}

function createChoNeoSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}

function getInvitationAttemptKey(request: Request, userId: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${userId}:${(forwarded || realIp || "local").slice(0, 80)}`;
}

function isInvitationAttemptRateLimited(key: string, now = Date.now()) {
  const recent = (invitationAttemptBuckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < INVITATION_ATTEMPT_WINDOW_MS,
  );
  if (recent.length >= INVITATION_ATTEMPT_MAX) {
    invitationAttemptBuckets.set(key, recent);
    return true;
  }

  recent.push(now);
  invitationAttemptBuckets.set(key, recent);
  return false;
}

function invitationFailure(message: string) {
  if (message.includes("expired-invitation")) {
    return NextResponse.json(
      { error: "Lời mời này đã hết hạn.", reason: "expired-invitation" },
      { status: 400 },
    );
  }

  if (message.includes("revoked-invitation")) {
    return NextResponse.json(
      { error: "Lời mời này không còn dùng được.", reason: "revoked-invitation" },
      { status: 400 },
    );
  }

  if (message.includes("used-invitation")) {
    return NextResponse.json(
      { error: "Lời mời này đã được dùng rồi.", reason: "used-invitation" },
      { status: 400 },
    );
  }

  if (message.includes("role-mismatch")) {
    return NextResponse.json(
      {
        error: "Lời mời này chưa khớp vai trò đã chọn.",
        reason: "role-mismatch",
      },
      { status: 400 },
    );
  }

  if (message.includes("invalid-invitation")) {
    return NextResponse.json(
      {
        error: "Lời mời chưa đúng. Kiểm tra lại giúp Chợ Neo nha.",
        reason: "invalid-invitation",
      },
      { status: 400 },
    );
  }

  return unavailable("invitation-redeem-failed");
}

function unavailable(reason: string) {
  return NextResponse.json(
    {
      error: "Chợ Neo chưa xác nhận được thành viên. Thử lại một nhịp nha.",
      reason,
    },
    { status: 503 },
  );
}
