#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const migrationDir = path.join(repoRoot, "supabase/migrations");
const hardening = fs.readFileSync(
  path.join(migrationDir, "20260801110000_harden_cho_neo_security_definer_rpc_acl.sql"),
  "utf8",
);
const invitationMigration = fs.readFileSync(
  path.join(migrationDir, "20260727223000_fix_cho_neo_member_redemption_upsert.sql"),
  "utf8",
);
const usageMigration = fs.readFileSync(
  path.join(migrationDir, "20260801100000_cho_neo_openai_usage_reservations.sql"),
  "utf8",
);
const privateInvitationMigration = fs.readFileSync(
  path.join(
    migrationDir,
    "20260803100000_cho_neo_private_invitation_onboarding_v1.sql",
  ),
  "utf8",
);

const sensitiveFunctions = [
  ["redeem_cho_neo_member_invitation", "text, uuid, text, text, text, text"],
  ["reserve_cho_neo_openai_usage", "uuid, integer, integer, integer"],
  [
    "reserve_cho_neo_openai_usage_v2",
    "uuid, integer, integer, integer, integer, integer, text",
  ],
  ["finalize_cho_neo_openai_usage", "uuid, boolean, integer"],
];
const additionalSensitiveFunctions = [
  [
    "redeem_cho_neo_private_invitation",
    "text, uuid, text, text, text, text",
    privateInvitationMigration,
  ],
];

function functionSql(name, source = hardening) {
  const start = source.indexOf(`create or replace function public.${name}`);
  assert.notEqual(start, -1, `${name} must be replaced by the hardening migration`);
  const end = source.indexOf("$$;", start);
  assert.notEqual(end, -1, `${name} must have a complete function body`);
  return source.slice(start, end + 3);
}

function aclSql(name, source = hardening) {
  const start = source.indexOf(`revoke all on function public.${name}`);
  assert.notEqual(start, -1, `${name} must have explicit ACL hardening`);
  const end = source.indexOf("grant execute", start);
  assert.notEqual(end, -1, `${name} must grant the server role explicitly`);
  return source.slice(start, source.indexOf(";", end) + 1);
}

test("every sensitive SECURITY DEFINER RPC revokes PUBLIC and grants only service_role", () => {
  for (const [name, signature, source] of [
    ...sensitiveFunctions.map(([rpcName, rpcSignature]) => [rpcName, rpcSignature, hardening]),
    ...additionalSensitiveFunctions,
  ]) {
    const acl = aclSql(name, source);
    const signaturePattern = signature.replaceAll(", ", "\\s*,\\s*");
    assert.match(
      acl,
      new RegExp(`revoke all on function public\\.${name}\\(\\s*${signaturePattern}\\s*\\) from public;`),
    );
    assert.match(acl, /from\s+anon\s*,\s*authenticated;/);
    assert.match(
      acl,
      new RegExp(`grant execute on function public\\.${name}[\\s\\S]*\\)\\s+to service_role;`),
    );
    assert.doesNotMatch(acl, /grant execute[\s\S]*\b(?:anon|authenticated)\b/i);
  }
});

test("the hardening migration is forward-only and does not expose a client RPC", () => {
  assert.doesNotMatch(hardening, /\bdrop\s+(?:function|table|policy|trigger)\b/i);
  for (const grant of hardening.matchAll(/grant execute on function[\s\S]*?;/gi)) {
    assert.doesNotMatch(grant[0], /\b(?:anon|authenticated)\b/i);
  }
  assert.match(hardening, /select pg_notify\('pgrst', 'reload schema'\);/);
});

test("user-targeted RPCs reject mismatched auth.uid values while preserving service-role calls", () => {
  for (const name of [
    "redeem_cho_neo_member_invitation",
    "reserve_cho_neo_openai_usage",
    "reserve_cho_neo_openai_usage_v2",
  ]) {
    const sql = functionSql(name);
    assert.match(sql, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/);
    assert.match(sql, /auth\.uid\(\) is null or auth\.uid\(\) <> p_(?:user_id|member_user_id)/);
    assert.match(sql, /raise exception 'identity-mismatch'/);
  }
});

test("finalization is explicitly server-only and cannot be called by ordinary PostgREST roles", () => {
  const sql = functionSql("finalize_cho_neo_openai_usage");
  assert.match(sql, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/);
  assert.match(sql, /raise exception 'server-only'/);
  assert.match(aclSql("finalize_cho_neo_openai_usage"), /from public;/);
  assert.match(aclSql("finalize_cho_neo_openai_usage"), /to service_role;/);
});

test("invitation redemption retains locking, use-count limits, and protected profile upsert", () => {
  const redemptionSql = functionSql("redeem_cho_neo_member_invitation");
  const dynamicUpsertStart = redemptionSql.indexOf("execute $sql$");
  assert.notEqual(dynamicUpsertStart, -1, "profile upsert must use dynamic SQL");
  const dynamicUpsertSql = redemptionSql.slice(dynamicUpsertStart);

  assert.doesNotMatch(hardening, /cho_neo_member_profiles_pkey/);
  assert.doesNotMatch(
    redemptionSql.slice(0, dynamicUpsertStart),
    /on conflict \(user_id\) do update/,
  );
  assert.match(dynamicUpsertSql, /on conflict \(user_id\) do update/);
  assert.match(dynamicUpsertSql, /values \(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8,\$9,\$10\)/);
  assert.match(dynamicUpsertSql, /using[\s\S]*p_user_id;/);

  for (const sql of [invitationMigration]) {
    assert.match(sql, /from public\.cho_neo_member_invitations[\s\S]*for update;/);
    assert.match(sql, /invitation_row\.use_count >= invitation_row\.max_uses/);
    assert.match(sql, /use_count = invitation_row\.use_count \+ 1/);
    assert.match(sql, /on conflict \(user_id\) do update/);
    assert.match(sql, /membership_status not in \('suspended', 'rejected'\)/);
  }

  assert.match(hardening, /from public\.cho_neo_member_invitations[\s\S]*for update;/);
  assert.match(hardening, /invitation_row\.use_count >= invitation_row\.max_uses/);
  assert.match(hardening, /use_count = invitation_row\.use_count \+ 1/);
  assert.match(hardening, /membership_status not in \('suspended', 'rejected'\)/);
});

test("service-role invitation redemption remains a successful server path", () => {
  const sql = functionSql("redeem_cho_neo_member_invitation");
  assert.match(sql, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/);
  assert.match(sql, /insert into public\.cho_neo_member_profiles/);
  assert.match(sql, /membership_status = 'verified_nail_member'/);
  assert.match(sql, /return query[\s\S]*membership_status = 'verified_nail_member'/);
  assert.match(
    aclSql("redeem_cho_neo_member_invitation"),
    /to service_role;/,
  );
});

test("usage reservations retain row locks, idempotency, and finalization locking", () => {
  for (const sql of [usageMigration, hardening]) {
    assert.match(sql, /where idempotency_key = p_idempotency_key[\s\S]*for update;/);
    assert.match(sql, /where scope_type = 'global_month'[\s\S]*for update;/);
    assert.match(sql, /where scope_type = 'member_day'[\s\S]*for update;/);
    assert.match(sql, /return query select true, 'idempotent'/);
    assert.match(sql, /where id = p_reservation_id[\s\S]*for update;/);
  }
});

test("repository SECURITY DEFINER inventory is fully covered by this hardening migration", () => {
  const securityDefinerFunctions = new Set();
  for (const file of fs.readdirSync(migrationDir).filter((name) => name.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(migrationDir, file), "utf8");
    for (const match of sql.matchAll(/create or replace function public\.([a-z0-9_]+)\([\s\S]*?\)\n[\s\S]*?security definer/gi)) {
      securityDefinerFunctions.add(match[1]);
    }
  }

  assert.deepEqual(
    [...securityDefinerFunctions].sort(),
    [...sensitiveFunctions, ...additionalSensitiveFunctions]
      .map(([name]) => name)
      .sort(),
  );
  for (const [name] of sensitiveFunctions) assert.match(hardening, new RegExp(`public\\.${name}`));
  for (const [name] of additionalSensitiveFunctions) {
    assert.match(privateInvitationMigration, new RegExp(`public\\.${name}`));
  }
});
