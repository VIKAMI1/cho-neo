#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260817023000_restore_and_harden_cho_neo_owner_pulse.sql",
  ),
  "utf8",
);
const normalized = migration.toLowerCase();

function functionBody() {
  const start = normalized.indexOf("create or replace function public.cho_neo_owner_pulse()");
  assert.notEqual(start, -1, "Owner Pulse must be restored in the migration");
  const end = normalized.indexOf("$function$;", start);
  assert.notEqual(end, -1, "Owner Pulse must have a complete function body");
  return normalized.slice(start, end);
}

test("Owner Pulse is SECURITY INVOKER with an empty search_path", () => {
  const sql = functionBody();
  assert.match(sql, /security\s+invoker/);
  assert.match(sql, /set\s+search_path\s*=\s*''/);
  assert.doesNotMatch(sql, /security\s+definer/);
});

test("Owner Pulse has no hard-coded owner authorization", () => {
  const sql = functionBody();
  assert.doesNotMatch(sql, /auth\.uid\s*\(/);
  assert.doesNotMatch(sql, /owner_user_id/);
  assert.doesNotMatch(sql, /f1ef1be1-ae8a-4a72-8e20-97d448ef5a8d/);
});

test("Owner Pulse is executable only by service_role", () => {
  assert.match(
    normalized,
    /revoke\s+execute\s+on\s+function\s+public\.cho_neo_owner_pulse\(\)\s+from\s+public;/,
  );
  assert.match(
    normalized,
    /revoke\s+execute\s+on\s+function\s+public\.cho_neo_owner_pulse\(\)\s+from\s+anon\s*,\s*authenticated;/,
  );
  assert.match(
    normalized,
    /grant\s+execute\s+on\s+function\s+public\.cho_neo_owner_pulse\(\)\s+to\s+service_role;/,
  );
  for (const grant of normalized.matchAll(/grant\s+execute\s+on\s+function[^;]+;/g)) {
    assert.match(grant[0], /to\s+service_role;/);
    assert.doesNotMatch(grant[0], /to\s+(?:public|anon|authenticated)\b/);
  }
});

test("Owner Pulse preserves the Production metric structure and counting logic", () => {
  const sql = functionBody();

  for (const key of [
    "verified_members",
    "seen_24h",
    "seen_7d",
    "new_7d",
    "returned_7d",
    "total_links",
    "active_links",
    "uses",
    "revoked",
    "expired_links",
    "chat_24h",
    "chat_7d",
    "questions_24h",
    "questions_7d",
    "answers_24h",
    "answers_7d",
    "events_24h",
    "events_7d",
    "sessions_24h",
    "sessions_7d",
    "tracking_since",
    "generated_at",
    "members",
    "invitations",
    "content",
    "traffic",
    "top_rooms",
  ]) {
    assert.match(sql, new RegExp(`'${key}'`), `${key} must remain in the output`);
  }

  for (const table of [
    "cho_neo_member_profiles",
    "cho_neo_member_invitations",
    "cho_neo_gossip_messages",
    "cho_neo_questions",
    "cho_neo_answers",
    "cho_neo_feedback",
  ]) {
    assert.match(sql, new RegExp(`from public\\.${table}`), `${table} must remain queried`);
  }

  assert.match(sql, /membership_status\s*=\s*'verified_nail_member'/);
  assert.match(sql, /last_seen_at\s*>=\s*now\(\)\s*-\s*interval\s+'24 hours'/);
  assert.match(sql, /last_seen_at\s*>=\s*now\(\)\s*-\s*interval\s+'7 days'/);
  assert.match(sql, /expires_at\s*> now\(\)/);
  assert.match(sql, /expires_at\s*<= now\(\)/);
  assert.match(sql, /kind\s*=\s*'event'/);
  assert.match(sql, /event_name\s*=\s*'room_entered'/);
  assert.match(sql, /limit\s+8/);
  assert.match(sql, /jsonb_agg\(jsonb_build_object\('room', ranked\.room, 'enters', ranked\.enters\)/);
});
