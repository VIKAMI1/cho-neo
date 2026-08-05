import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  CHO_NEO_AGREEMENT_VERSION,
  CHO_NEO_MEMBER_PROFILE_TABLE,
  isApprovedChoNeoMemberAvatarKey,
  validateChoNeoMemberDisplayName,
} from "@/lib/cho-neo/member-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BootstrapBody = {
  agreementAccepted?: unknown;
  agreementVersion?: unknown;
  avatarKey?: unknown;
  displayName?: unknown;
};

type AuthenticatedUser = {
  id: string;
  user: User;
};

const PROFILE_SELECT =
  "user_id, display_name, normalized_display_name, avatar_key, nail_role, membership_status, invitation_id, approved_at, agreement_version, agreement_accepted_at";

export async function POST(request: Request) {
  const authenticated = await getAuthenticatedUser(request);
  if (!authenticated) {
    return NextResponse.json(
      { error: "Sign in with Google to enter Chợ Neo.", reason: "missing-session" },
      { status: 401 },
    );
  }

  if (authenticated.user.is_anonymous === true) {
    return NextResponse.json(
      { error: "Connect Google before creating a Chợ Neo member profile.", reason: "anonymous-session" },
      { status: 403 },
    );
  }

  const supabase = createServiceClient();
  if (!supabase) return unavailable("missing-service-role");

  const body = (await request.json().catch(() => null)) as BootstrapBody | null;
  const agreementResult = validateAgreement(body);
  if (agreementResult.ok === false) {
    return NextResponse.json(
      { error: agreementResult.message, reason: agreementResult.reason },
      { status: 400 },
    );
  }

  const existing = await loadProfile(supabase, authenticated.id);
  if (existing.error) return unavailable("profile-read-failed");

  if (existing.profile) {
    if (
      existing.profile.membership_status === "suspended" ||
      existing.profile.membership_status === "rejected"
    ) {
      return NextResponse.json(
        { error: "This profile cannot enter Chợ Neo right now.", reason: "member-restricted" },
        { status: 403 },
      );
    }

    if (
      existing.profile.invitation_id &&
      existing.profile.membership_status !== "verified_nail_member"
    ) {
      return NextResponse.json(
        { error: "Open the invitation link connected to this profile.", reason: "invitation-required" },
        { status: 403 },
      );
    }

    if (existing.profile.membership_status === "verified_nail_member") {
      return NextResponse.json({ profile: existing.profile });
    }

    if (!agreementResult.accepted) {
      return NextResponse.json({ profile: existing.profile, requiresAgreement: true });
    }

    const displayName = resolveDisplayName(body?.displayName, authenticated.user);
    if (displayName.ok === false) {
      return NextResponse.json(
        { error: displayName.message, reason: displayName.reason },
        { status: 400 },
      );
    }
    const now = new Date().toISOString();

    const updated = await supabase
      .from(CHO_NEO_MEMBER_PROFILE_TABLE)
      .update({
        agreement_accepted_at: now,
        agreement_version: CHO_NEO_AGREEMENT_VERSION,
        approved_at: existing.profile.approved_at ?? now,
        avatar_key: resolveAvatar(body?.avatarKey, existing.profile.avatar_key),
        display_name: displayName.displayName,
        last_seen_at: now,
        membership_status: "verified_nail_member",
        nail_role: existing.profile.nail_role ?? "other_industry",
        normalized_display_name: displayName.normalizedDisplayName,
        updated_at: now,
      })
      .eq("user_id", authenticated.id)
      .select(PROFILE_SELECT)
      .single();

    if (updated.error || !updated.data) return unavailable("profile-update-failed");
    return NextResponse.json({ profile: updated.data });
  }

  const displayName = resolveDisplayName(body?.displayName, authenticated.user);
  if (displayName.ok === false) {
    return NextResponse.json(
      { error: displayName.message, reason: displayName.reason },
      { status: 400 },
    );
  }
  const avatarKey = resolveAvatar(body?.avatarKey, null);
  const now = new Date().toISOString();
  const inserted = await supabase
    .from(CHO_NEO_MEMBER_PROFILE_TABLE)
    .insert({
      agreement_accepted_at: agreementResult.accepted ? now : null,
      agreement_version: agreementResult.accepted ? CHO_NEO_AGREEMENT_VERSION : null,
      approved_at: agreementResult.accepted ? now : null,
      avatar_key: avatarKey,
      display_name: displayName.displayName,
      last_seen_at: now,
      membership_status: agreementResult.accepted ? "verified_nail_member" : "pending",
      nail_role: "other_industry",
      normalized_display_name: displayName.normalizedDisplayName,
      updated_at: now,
      user_id: authenticated.id,
    })
    .select(PROFILE_SELECT)
    .single();

  if (!inserted.error && inserted.data) {
    return NextResponse.json({ profile: inserted.data });
  }

  if (inserted.error?.code === "23505") {
    const raced = await loadProfile(supabase, authenticated.id);
    if (!raced.error && raced.profile) return NextResponse.json({ profile: raced.profile });
  }

  return unavailable("profile-create-failed");
}

async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;

  const { data, error } = await createClient(url, anonKey, {
    auth: { persistSession: false },
  }).auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, user: data.user };
}

function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

async function loadProfile(supabase: ReturnType<typeof createServiceClient>, userId: string) {
  if (!supabase) return { error: new Error("missing-service-role"), profile: null };
  const result = await supabase
    .from(CHO_NEO_MEMBER_PROFILE_TABLE)
    .select(PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();
  return { error: result.error, profile: result.data };
}

function validateAgreement(body: BootstrapBody | null) {
  const accepted = body?.agreementAccepted === true;
  if (accepted && body?.agreementVersion !== CHO_NEO_AGREEMENT_VERSION) {
    return {
      message: "The Chợ Neo agreement version is not current.",
      ok: false as const,
      reason: "agreement-version-mismatch",
    };
  }
  return { accepted, ok: true as const };
}

function resolveDisplayName(value: unknown, user: User) {
  if (value !== undefined) return validateChoNeoMemberDisplayName(value);

  const candidates = [
    user.user_metadata?.full_name,
    user.user_metadata?.name,
    user.email?.split("@")[0],
    "Member",
  ];
  for (const candidate of candidates) {
    const result = validateChoNeoMemberDisplayName(candidate);
    if (result.ok) return result;
  }
  return {
    displayName: "Member",
    normalizedDisplayName: "member",
    ok: true as const,
  };
}

function resolveAvatar(value: unknown, fallback: string | null) {
  return isApprovedChoNeoMemberAvatarKey(value) ? value : fallback;
}

function unavailable(reason: string) {
  return NextResponse.json(
    { error: "Chợ Neo is temporarily unavailable. Please try again.", reason },
    { status: 503 },
  );
}
