"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  CHO_NEO_INVITATION_DEFAULT_MAX_USES,
  buildChoNeoPrivateInvitationLink,
  createChoNeoInvitationCode,
  hashChoNeoInvitationCode,
} from "@/lib/cho-neo/member-invitations";
import { CHO_NEO_MEMBER_INVITATION_TABLE, isChoNeoNailRole } from "@/lib/cho-neo/member-identity";
import {
  createChoNeoInvitationServiceClient,
  requireChoNeoInvitationAdmin,
} from "@/lib/cho-neo/invitation-admin";

export type InvitationCreateState = {
  error?: string;
  privateJoinUrl?: string;
  recipientName?: string;
};

const DEFAULT_EXPIRATION_DAYS = 7;
const MAX_RECIPIENT_FIELD_LENGTH = 120;

export async function createChoNeoOwnerInvitation(
  _previousState: InvitationCreateState,
  formData: FormData,
): Promise<InvitationCreateState> {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) {
    return { error: authorization.message };
  }

  const recipientName = normalizeField(formData.get("recipientName"), 2);
  if (!recipientName) {
    return { error: "Recipient name is required." };
  }

  const recipientContact = normalizeField(formData.get("recipientContact"), 0);
  const intendedRole = formData.get("intendedRole");
  if (!isChoNeoNailRole(intendedRole)) {
    return { error: "Choose an intended industry role." };
  }

  const expiresAt = parseExpiration(formData.get("expiresAt"));
  if (!expiresAt) {
    return { error: "Choose a valid expiration date." };
  }

  const privateCode = createChoNeoInvitationCode();
  const codeHash = hashChoNeoInvitationCode(privateCode);
  const supabase = createChoNeoInvitationServiceClient();
  if (!supabase) {
    return { error: "Server invitation configuration is missing." };
  }

  const { error } = await supabase.from(CHO_NEO_MEMBER_INVITATION_TABLE).insert({
    code_hash: codeHash,
    expires_at: expiresAt.toISOString(),
    intended_role: intendedRole,
    issued_by_user_id: authorization.userId,
    max_uses: CHO_NEO_INVITATION_DEFAULT_MAX_USES,
    recipient_contact: recipientContact || null,
    recipient_name: recipientName,
    status: "issued",
  });

  if (error) {
    console.error("[cho-neo:admin-invitations] creation failed", {
      code: error.code ?? null,
    });
    return { error: "Could not create the invitation." };
  }

  revalidatePath("/cho-neo/admin/invitations");
  return {
    privateJoinUrl: buildChoNeoPrivateInvitationLink(privateCode, await getSiteOrigin()),
    recipientName,
  };
}

async function getSiteOrigin() {
  const configuredOrigin = process.env.CHO_NEO_JOIN_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) return configuredOrigin;

  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  if (!host) throw new Error("missing-site-origin");

  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  return `${protocol}://${host}`;
}

function normalizeField(value: FormDataEntryValue | null, minLength: number) {
  if (typeof value !== "string") return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length < minLength) return "";
  return normalized.slice(0, MAX_RECIPIENT_FIELD_LENGTH);
}

function parseExpiration(value: FormDataEntryValue | null) {
  if (typeof value === "string" && value) {
    const expiresAt = new Date(`${value}T23:59:59.999Z`);
    return Number.isNaN(expiresAt.getTime()) ? null : expiresAt;
  }

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + DEFAULT_EXPIRATION_DAYS);
  expiresAt.setUTCHours(23, 59, 59, 999);
  return expiresAt;
}
