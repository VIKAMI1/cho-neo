import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AuthorizedChoNeoUser = {
  id: string;
};

type LocEntitlementRow = {
  id: string;
  campaign_key: string;
  source: string;
  reward_percent: number;
  scope_key: string;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
};

type LocEntitlementStatus = "issued" | "redeemed" | "expired" | "revoked";

export async function POST(request: Request) {
  if (process.env.CHO_NEO_LOC_ISSUANCE_ENABLED !== "true") {
    return unavailable("issuance-locked");
  }

  const user = await getAuthenticatedChoNeoUser(request);
  if (!user) return unauthorized();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return unavailable("missing-service-role");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("issue_cho_neo_loc_v1", {
    p_user_id: user.id,
  });

  if (error) {
    if (error.message.includes("ineligible-member")) {
      return NextResponse.json(
        { error: "Chợ Neo member verification is required.", reason: "ineligible-member" },
        { headers: { "Cache-Control": "no-store" }, status: 403 },
      );
    }

    console.error("[cho-neo:loc:issue] issuance failed", {
      code: error.code ?? null,
    });
    return unavailable("issuance-failed");
  }

  const entitlement = (Array.isArray(data) ? data[0] : data) as
    | LocEntitlementRow
    | null
    | undefined;
  if (!entitlement) return unavailable("issuance-empty");

  const publicEntitlement = {
    id: entitlement.id,
    campaignKey: entitlement.campaign_key,
    source: entitlement.source,
    rewardPercent: entitlement.reward_percent,
    scopeKey: entitlement.scope_key,
    issuedAt: entitlement.issued_at,
    expiresAt: entitlement.expires_at,
    status: deriveLocEntitlementStatus(entitlement),
  };

  return NextResponse.json(
    { entitlement: publicEntitlement },
    { headers: { "Cache-Control": "no-store" }, status: 200 },
  );
}

function deriveLocEntitlementStatus(
  entitlement: LocEntitlementRow,
  now = new Date(),
): LocEntitlementStatus {
  if (entitlement.revoked_at) return "revoked";
  if (entitlement.redeemed_at) return "redeemed";
  if (new Date(entitlement.expires_at).getTime() <= now.getTime()) return "expired";
  return "issued";
}

async function getAuthenticatedChoNeoUser(request: Request): Promise<AuthorizedChoNeoUser | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !publicKey) return null;

  const { data, error } = await createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false },
  }).auth.getUser(token);

  if (error || !data.user || data.user.is_anonymous) return null;
  return { id: data.user.id };
}

function unauthorized() {
  return NextResponse.json(
    { error: "A verified Chợ Neo member session is required.", reason: "missing-session" },
    { headers: { "Cache-Control": "no-store" }, status: 401 },
  );
}

function unavailable(reason: string) {
  return NextResponse.json(
    { error: "Lộc issuance is currently unavailable.", reason },
    { headers: { "Cache-Control": "no-store" }, status: 503 },
  );
}
