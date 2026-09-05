import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHO_NEO_AGREEMENT_VERSION,
  CHO_NEO_MEMBER_PROFILE_TABLE,
  isApprovedChoNeoMemberAvatarKey,
  isChoNeoPublicNailRole,
  validateChoNeoMemberDisplayName,
} from "@/lib/cho-neo/member-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type VerifyBody = {
  adultAttested?: unknown;
  agreementAccepted?: unknown;
  agreementVersion?: unknown;
  avatarKey?: unknown;
  displayName?: unknown;
  nailRole?: unknown;
};

type AuthenticatedChoNeoUser = {
  id: string;
  isAnonymous: boolean;
};

const ENROLLMENT_ATTEMPT_WINDOW_MS = 60_000;
const ENROLLMENT_ATTEMPT_MAX = 6;
const enrollmentAttemptBuckets = new Map<string, number[]>();

export async function POST(request: Request) {
  const authenticatedUser = await getAuthenticatedChoNeoUser(request);
  if (!authenticatedUser) {
    return NextResponse.json(
      {
        error: "Chợ Neo chưa mở được phiên thành viên trên thiết bị này.",
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
    .select("user_id, membership_status, agreement_version, adult_attested_at, nail_role")
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

  if (body?.adultAttested !== true) {
    return NextResponse.json(
      {
        error: "Chợ Neo chỉ dành cho người từ 18 tuổi trở lên.",
        reason: "adult-attestation-required",
      },
      { status: 400 },
    );
  }

  if (!isChoNeoPublicNailRole(body?.nailRole)) {
    return NextResponse.json(
      {
        error: "Chọn vai trò của bạn trong nghề nail trước nha.",
        reason: "nail-role-required",
      },
      { status: 400 },
    );
  }

  if (existingProfile?.membership_status === "verified_nail_member") {
    const agreementNeedsAcceptance =
      existingProfile.agreement_version !== CHO_NEO_AGREEMENT_VERSION ||
      !existingProfile.adult_attested_at;

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
          error: "Thỏa thuận Chợ Neo đã được cập nhật. Tải lại trang giúp Chợ Neo nha.",
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
        adult_attested_at: existingProfile.adult_attested_at ?? now,
        display_name: displayName.displayName,
        last_seen_at: now,
        normalized_display_name: displayName.normalizedDisplayName,
        nail_role: body.nailRole,
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
        "user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status, agreement_version, agreement_accepted_at, adult_attested_at",
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
        error: "Thỏa thuận Chợ Neo đã được cập nhật. Tải lại trang giúp Chợ Neo nha.",
        reason: "agreement-version-mismatch",
      },
      { status: 400 },
    );
  }

  const attemptKey = getEnrollmentAttemptKey(request, authenticatedUser.id);
  if (isEnrollmentAttemptRateLimited(attemptKey)) {
    return NextResponse.json(
      {
        error: "Bạn đang thử vào Chợ hơi nhanh. Nghỉ một nhịp rồi thử lại nha.",
        reason: "enrollment-rate-limited",
      },
      { status: 429 },
    );
  }

  const { data: profile, error: profileError } = await supabase.rpc(
    "enroll_cho_neo_public_adult_trade_member",
    {
      p_adult_attested: true,
      p_agreement_version: CHO_NEO_AGREEMENT_VERSION,
      p_avatar_key: avatarKey,
      p_display_name: displayName.displayName,
      p_nail_role: body.nailRole,
      p_normalized_display_name: displayName.normalizedDisplayName,
      p_user_id: authenticatedUser.id,
    },
  );

  if (profileError) {
    console.error("[cho-neo:member-verify] public enrollment failed", {
      code: profileError.code ?? null,
    });
    return enrollmentFailure(profileError.message, profileError.code);
  }

  const nextProfile = Array.isArray(profile) ? profile[0] : profile;
  if (!nextProfile) return unavailable("profile-save-failed");

  return NextResponse.json({ profile: nextProfile });
}

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

function getEnrollmentAttemptKey(request: Request, userId: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return `${userId}:${(forwarded || realIp || "local").slice(0, 80)}`;
}

function isEnrollmentAttemptRateLimited(key: string, now = Date.now()) {
  const recent = (enrollmentAttemptBuckets.get(key) ?? []).filter(
    (timestamp) => now - timestamp < ENROLLMENT_ATTEMPT_WINDOW_MS,
  );
  if (recent.length >= ENROLLMENT_ATTEMPT_MAX) {
    enrollmentAttemptBuckets.set(key, recent);
    return true;
  }

  recent.push(now);
  enrollmentAttemptBuckets.set(key, recent);
  return false;
}

function enrollmentFailure(message: string, code?: string) {
  if (message.includes("member-restricted")) {
    return NextResponse.json(
      { error: "Hồ sơ này hiện chưa thể vào Chợ Neo.", reason: "member-restricted" },
      { status: 403 },
    );
  }

  if (message.includes("adult-attestation-required")) {
    return NextResponse.json(
      { error: "Chợ Neo chỉ dành cho người từ 18 tuổi trở lên.", reason: "adult-attestation-required" },
      { status: 400 },
    );
  }

  if (message.includes("invalid-nail-role")) {
    return NextResponse.json(
      { error: "Chọn đúng vai trò của bạn trong nghề nail trước nha.", reason: "nail-role-required" },
      { status: 400 },
    );
  }

  if (code === "PGRST202" || message.includes("does not exist")) {
    return unavailable("public-enrollment-rpc-missing");
  }

  if (code === "42501" || message.includes("permission denied")) {
    return unavailable("public-enrollment-rpc-permission");
  }

  return unavailable("public-enrollment-failed");
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
