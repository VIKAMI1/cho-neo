#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import {
  CHO_NEO_INVITATION_DEFAULT_MAX_USES,
  buildChoNeoPrivateInvitationLink,
  createChoNeoInvitationCode,
  hashChoNeoInvitationCode as hashChoNeoInvitationCodeFromSharedHelper,
} from "../src/lib/cho-neo/member-invitations.ts";

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}

async function main() {
  const args = new Map(
    process.argv
      .slice(2)
      .map((arg) => {
        const [key, ...value] = arg.replace(/^--/, "").split("=");
        return [key, value.join("=") || "true"];
      }),
  );

  const expiresAt = args.get("expires-at");
  if (!expiresAt || Number.isNaN(new Date(expiresAt).getTime())) {
    console.error(
      "Usage: node scripts/create-cho-neo-member-invitation.mjs --expires-at=YYYY-MM-DD",
    );
    process.exit(1);
  }

  const code = createInvitationCode();
  const codeHash = hashChoNeoInvitationCode(code);
  const intendedRole = args.get("role") || "other_industry";

  if (args.get("dry-run") === "true") {
    console.log("Generated one Chợ Neo invitation preview.");
    console.log("Plain invitation is intentionally hidden in dry-run mode.");
    console.log(`Hash preview: ${codeHash.slice(0, 12)}...`);
    return;
  }

  const joinUrl =
    args.get("join-url") ||
    process.env.CHO_NEO_JOIN_URL ||
    process.env.NEXT_PUBLIC_SITE_URL;
  if (!joinUrl) {
    console.error(
      "Missing configured Chợ Neo join URL. Set CHO_NEO_JOIN_URL or pass --join-url=.",
    );
    process.exit(1);
  }

  let privateLink;
  try {
    privateLink = buildPrivateInvitationLink(code, joinUrl);
  } catch {
    console.error("Invalid Chợ Neo join URL. Use an http or https URL.");
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing server-only Supabase configuration.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("cho_neo_member_invitations").insert({
    code_hash: codeHash,
    expires_at: new Date(expiresAt).toISOString(),
    intended_role: intendedRole,
    max_uses: Number(args.get("max-uses") ?? CHO_NEO_INVITATION_DEFAULT_MAX_USES),
    status: "issued",
  });

  if (error) {
    console.error("Could not create Chợ Neo invitation.");
    console.error(
      JSON.stringify(
        {
          code: error.code ?? null,
          details: error.details ?? null,
          hint: error.hint ?? null,
          message: error.message ?? null,
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  console.log("Created one Chợ Neo private invitation link. Show it once only:");
  console.log(privateLink);
}

export function createInvitationCode() {
  return createChoNeoInvitationCode();
}

export function hashChoNeoInvitationCode(code) {
  return hashChoNeoInvitationCodeFromSharedHelper(code);
}

export function buildPrivateInvitationLink(code, joinUrl) {
  return buildChoNeoPrivateInvitationLink(code, joinUrl);
}
