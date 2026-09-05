import "server-only";

import { createClient } from "@supabase/supabase-js";

export async function getMatchingUser(request: Request) {
  const token = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;

  const { data, error } = await createClient(url, anonKey, {
    auth: { persistSession: false },
  }).auth.getUser(token);
  return error || !data.user || data.user.is_anonymous ? null : data.user;
}

export function createMatchingServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
