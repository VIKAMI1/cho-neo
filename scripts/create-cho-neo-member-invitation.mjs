#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const CODE_BYTES = 16; // 128 bits of entropy.
const CODE_PREFIX = "CNEO";
const DEFAULT_MAX_USES = 1;

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

  if (args.get("dry-run") === "true") {
    console.log("Generated one Chợ Neo invitation preview.");
    console.log("Plain invitation is intentionally hidden in dry-run mode.");
    console.log(`Hash preview: ${codeHash.slice(0, 12)}...`);
    return;
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
    intended_role: args.get("role") || null,
    max_uses: Number(args.get("max-uses") ?? DEFAULT_MAX_USES),
    status: "issued",
  });

  if (error) {
    console.error("Could not create Chợ Neo invitation.");
    process.exit(1);
  }

  console.log("Created one Chợ Neo invitation. Show this plain code once only:");
  console.log(code);
}

export function createInvitationCode() {
  return `${CODE_PREFIX}-${base32NoPadding(randomBytes(CODE_BYTES))}`;
}

export function hashChoNeoInvitationCode(code) {
  return createHash("sha256")
    .update(`cho-neo-member-invitation-v1:${code.trim().toUpperCase()}`)
    .digest("hex");
}

function base32NoPadding(buffer) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}
