import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHO_NEO_AGREEMENT_VERSION,
  CHO_NEO_MEMBER_PROFILE_TABLE,
  isApprovedChoNeoMemberAvatarKey,
  validateChoNeoMemberDisplayName,
} from "@/lib/cho-neo/member-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VerifyBody = {
  agreementAccepted?: unknown;
  agreementVersion?: unknown;
  avatarKey?: unknown;
  displayName?: unknown;
  invitationToken?: unknown;
};

type AuthenticatedChoNeoUser = {
  id: string;
  isAnonymous: boolean;
};

const INVITATION_ATTEMPT_WINDOW_MS = 60_000;
const INVITATION_ATTEMPT_MAX = 6;
const invitationAttemptBuckets = new Map<string, number[]>();

export async function POST(request: Request) {
  const authenticatedUser = await getAuthenticatedChoNeoUser(request);
  if (!authenticatedUser) {
    return NextResponse.json(
      {
        error: "Mở lời mời riêng để vào Chợ Neo nha.",
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

  const avatarKey = isApprovedChoNeoMemberAvatarKey(body?.avatarKey)
    ? body.avatarKey
    : null;
  const { data: existingProfile, error: profileReadError } = await supabase
    .from(CHO_NEO_MEMBER_PROFILE_TABLE)
    .select("user_id, membership_status, agreement_version")
    .eq("user_id", authenticatedUser.id)
    .maybeSingle();

  if (profileReadError) return unavailable("profile-read-failed");

  if (
    existingProfile?.membership_status === "suspended" ||
    existingProfile?.membership_status === "rejected"
  ) {
    return NextResponse.json(
      {
        error: "Hồ sơ này hiện chưa thể vào Chợ Neo.",
        reason: "member-restricted",
      },
      { status: 403 },
    );
  }

  if (existingProfile?.membership_status === "verified_nail_member") {
    const agreementNeedsAcceptance =
      existingProfile.agreement_version !== CHO_NEO_AGREEMENT_VERSION;

    if (agreementNeedsAcceptance && body?.agreementAccepted !== true) {
      return NextResponse.json(
        {
          error: "Bạn cần đồng ý với Thỏa thuận và Chính sách riêng tư trước nha.",
          reason: "agreement-required",
        },
        { status: 400 },
      );
    }

    if (agreementNeedsAcceptance && body?.agreementVersion !== CHO_NEO_AGREEMENT_VERSION) {
      return NextResponse.json(
        {
          error: "Thỏa thuận Chợ Neo đã được cập nhật. Mở lại lời mời giúp Chợ Neo nha.",
          reason: "agreement-version-mismatch",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from(CHO_NEO_MEMBER_PROFILE_TABLE)
      .update({
        avatar_key: avatarKey,
        display_name: displayName.displayName,
        last_seen_at: now,
        normalized_display_name: displayName.normalizedDisplayName,
        updated_at: now,
        ...(agreementNeedsAcceptance
          ? {
              agreement_accepted_at: now,
              agreement_version: CHO_NEO_AGREEMENT_VERSION,
            }
          : {}),
      })
      .eq("user_id", authenticatedUser.id)
      .select(
        "user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status, agreement_version, agreement_accepted_at",
      )
      .single();

    if (error || !data) return unavailable("profile-update-failed");
    return NextResponse.json({ profile: data });
  }

  if (body?.agreementAccepted !== true) {
    return NextResponse.json(
      {
        error: "Bạn cần đồng ý với Thỏa thuận và Chính sách riêng tư trước nha.",
        reason: "agreement-required",
      },
      { status: 400 },
    );
  }

  if (body?.agreementVersion !== CHO_NEO_AGREEMENT_VERSION) {
    return NextResponse.json(
      {
        error: "Thỏa thuận Chợ Neo đã được cập nhật. Mở lại lời mời giúp Chợ Neo nha.",
        reason: "agreement-version-mismatch",
      },
      { status: 400 },
    );
  }

  const invitationToken =
    typeof body?.invitationToken === "string"
      ? body.invitationToken.trim()
      : "";
  if (!invitationToken) {
    return NextResponse.json(
      {
        error: "Lời mời riêng chưa có mặt. Mở lại liên kết được gửi cho bạn nha.",
        reason: "missing-invitation",
      },
      { status: 400 },
    );
  }

  const attemptKey = getInvitationAttemptKey(request, authenticatedUser.id);
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
    "redeem_cho_neo_private_invitation",
    {
      p_agreement_version: CHO_NEO_AGREEMENT_VERSION,
      p_avatar_key: avatarKey,
      p_code_hash: hashChoNeoInvitationToken(invitationToken),
      p_display_name: displayName.displayName,
      p_normalized_display_name: displayName.normalizedDisplayName,
      p_user_id: authenticatedUser.id,
    },
  );

  if (profileError) {
    console.error("[cho-neo:member-verify] invitation redemption failed", {
      code: profileError.code ?? null,
    });
    return invitationFailure(profileError.message, profileError.code);
  }

  const nextProfile = Array.isArray(profile) ? profile[0] : profile;
  if (!nextProfile) return unavailable("profile-save-failed");

  return NextResponse.json({ profile: nextProfile });
}

export function hashChoNeoInvitationToken(token: string) {
  return createHash("sha256")
    .update(`cho-neo-member-invitation-v1:${token.trim().toUpperCase()}`)
    .digest("hex");
}

export const hashChoNeoInvitationCode = hashChoNeoInvitationToken;

async function getAuthenticatedChoNeoUser(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseKey) return null;

  const { data, error } = await createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  }).auth.getUser(token);

  if (error || !data.user) return null;
  return {
    id: data.user.id,
    isAnonymous: data.user.is_anonymous === true,
  } satisfies AuthenticatedChoNeoUser;
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

function invitationFailure(message: string, code?: string) {
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

  if (message.includes("member-restricted")) {
    return NextResponse.json(
      { error: "Hồ sơ này hiện chưa thể vào Chợ Neo.", reason: "member-restricted" },
      { status: 403 },
    );
  }

  if (message.includes("invalid-invitation")) {
    return NextResponse.json(
      {
        error: "Lời mời chưa đúng. Kiểm tra lại liên kết giúp Chợ Neo nha.",
        reason: "invalid-invitation",
      },
      { status: 400 },
    );
  }

  if (code === "42702" || message.includes('column reference "user_id" is ambiguous')) {
    return unavailable("invitation-redeem-schema-conflict");
  }

  if (code === "PGRST202" || message.includes("does not exist")) {
    return unavailable("invitation-rpc-missing");
  }

  if (code === "42501" || message.includes("permission denied")) {
    return unavailable("invitation-rpc-permission");
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
