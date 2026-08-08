import { createHash, randomBytes } from "node:crypto";

const CODE_BYTES = 16; // 128 bits of entropy.
const CODE_PREFIX = "CNEO";

export const CHO_NEO_INVITATION_DEFAULT_MAX_USES = 1;
export const CHO_NEO_INVITATION_HASH_PREFIX = "cho-neo-member-invitation-v1:";

export function createChoNeoInvitationCode() {
  return `${CODE_PREFIX}-${base32NoPadding(randomBytes(CODE_BYTES))}`;
}

export function hashChoNeoInvitationCode(code: string) {
  return createHash("sha256")
    .update(`${CHO_NEO_INVITATION_HASH_PREFIX}${code.trim().toUpperCase()}`)
    .digest("hex");
}

export function buildChoNeoPrivateInvitationLink(code: string, siteOrigin: string) {
  if (!siteOrigin) throw new Error("site-origin is required");

  const url = new URL("/join", siteOrigin);
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("site-origin must use http or https");
  }

  url.hash = `invite=${encodeURIComponent(code)}`;
  return url.toString();
}

function base32NoPadding(buffer: Buffer) {
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
