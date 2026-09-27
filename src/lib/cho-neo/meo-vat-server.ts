import "server-only";

import { createClient } from "@supabase/supabase-js";
import { canEditChoNeoMeoVatTip, type ChoNeoMeoVatTip } from "./meo-vat";

type MeoVatTipRow = {
  author_user_id: string;
  body: string;
  category: ChoNeoMeoVatTip["category"];
  created_at: string;
  id: string;
  status: ChoNeoMeoVatTip["status"];
  title: string;
  updated_at: string;
};

export function createChoNeoMeoVatServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function getChoNeoMeoVatUserId(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!token || !url || !key) return null;

  const { data, error } = await createClient(url, key, { auth: { persistSession: false } }).auth.getUser(token);
  return !error && data.user && !data.user.is_anonymous ? data.user.id : null;
}

export async function isVerifiedChoNeoMeoVatMember(
  supabase: { from: (table: string) => any },
  userId: string,
) {
  const { data, error } = await supabase
    .from("cho_neo_member_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("membership_status", "verified_nail_member")
    .is("suspended_at", null)
    .maybeSingle();
  return !error && Boolean(data);
}

export async function loadMeoVatAuthorNames(
  supabase: { from: (table: string) => any },
  userIds: string[],
) {
  const uniqueIds = [...new Set(userIds)];
  if (!uniqueIds.length) return new Map<string, string>();
  const { data, error } = await supabase
    .from("cho_neo_member_profiles")
    .select("user_id, display_name")
    .in("user_id", uniqueIds);
  if (error) throw new Error("author-lookup-failed");
  return new Map<string, string>((data ?? []).map((profile: { user_id: string; display_name: string }) => [profile.user_id, profile.display_name]));
}

export function mapMeoVatTip(row: MeoVatTipRow, authorNames: Map<string, string>, viewerId?: string | null): ChoNeoMeoVatTip {
  return {
    authorName: authorNames.get(row.author_user_id) ?? "Thành viên Chợ Neo",
    body: row.body,
    category: row.category,
    createdAt: row.created_at,
    id: row.id,
    isOwner: canEditChoNeoMeoVatTip(viewerId, { authorUserId: row.author_user_id }),
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at,
  };
}

export function isMeoVatUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
