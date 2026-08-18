import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createServerSupabase } from "@/lib/supabase-server";

export type InvitationAdminAuthorization =
  | { ok: true; userId: string }
  | { ok: false; message: string; reason: "unauthenticated" | "forbidden" };

export async function requireChoNeoInvitationAdmin(): Promise<InvitationAdminAuthorization> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      message: "Sign in with the owner account to manage invitations.",
      ok: false,
      reason: "unauthenticated",
    };
  }

  if (!getChoNeoInvitationAdminUserIds().has(user.id)) {
    return {
      message: "This signed-in account is not allowed to manage Chợ Neo invitations.",
      ok: false,
      reason: "forbidden",
    };
  }

  return { ok: true, userId: user.id };
}

export function getChoNeoInvitationAdminUserIds() {
  return new Set(
    (process.env.CHO_NEO_INVITE_ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function createChoNeoInvitationServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
