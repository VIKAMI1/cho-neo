#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260817020000_cho_neo_loc_economic_authority_v1.sql",
);
const routePath = path.join(repoRoot, "src/app/api/cho-neo/loc/issue/route.ts");
const migration = fs.readFileSync(migrationPath, "utf8");
const route = fs.readFileSync(routePath, "utf8");
const sql = migration.toLowerCase();

test("the economic boundary is durable, RLS-enabled, and service-role-only", () => {
  assert.match(sql, /create table if not exists public\.cho_neo_loc_entitlements/);
  assert.match(sql, /user_id uuid not null references auth\.users\(id\)/);
  assert.match(sql, /alter table public\.cho_neo_loc_entitlements enable row level security/);

  for (const role of ["public", "anon", "authenticated"]) {
    assert.match(
      sql,
      new RegExp(`revoke all on table public\\.cho_neo_loc_entitlements from ${role};`),
      `${role} must not access economic records`,
    );
  }

  assert.match(
    sql,
    /grant select, insert, update on table public\.cho_neo_loc_entitlements to service_role;/,
  );
  assert.match(sql, /unique index if not exists cho_neo_loc_entitlements_user_campaign_key/);
  assert.match(sql, /on public\.cho_neo_loc_entitlements \(user_id, campaign_key\)/);
  assert.match(sql, /where redemption_reference is not null/);
});

test("campaign economics and the 48-hour validity window are fixed in the database", () => {
  assert.match(sql, /campaign_key = 'vikami-green-pilot-v1'/);
  assert.match(sql, /source = 'xin-xam'/);
  assert.match(sql, /reward_percent = 10/);
  assert.match(sql, /scope_key = 'vikami-pilot-selected-products'/);
  assert.match(sql, /expires_at = issued_at \+ interval '48 hours'/);
  assert.match(sql, /'vikami-green-pilot-v1'[\s\S]*'xin-xam'[\s\S]*10[\s\S]*'vikami-pilot-selected-products'/);
  assert.match(sql, /issued_at_value \+ interval '48 hours'/);
});

test("issuance requires a verified member and is idempotent per member and campaign", () => {
  const issueStart = sql.indexOf("create or replace function public.issue_cho_neo_loc_v1");
  const issueEnd = sql.indexOf("create or replace function public.redeem_cho_neo_loc_v1");
  const issueSql = sql.slice(issueStart, issueEnd);

  assert.match(issueSql, /security invoker/);
  assert.match(issueSql, /from public\.cho_neo_member_profiles profile/);
  assert.match(issueSql, /profile\.membership_status = 'verified_nail_member'/);
  assert.match(issueSql, /on conflict \(user_id, campaign_key\) do nothing/);
  assert.match(issueSql, /where entitlement\.user_id = p_user_id/);
});

test("redemption locks, rejects invalid states, and consumes exactly once", () => {
  const redeemStart = sql.indexOf("create or replace function public.redeem_cho_neo_loc_v1");
  const redeemEnd = sql.indexOf("revoke execute on function public.issue_cho_neo_loc_v1");
  const redeemSql = sql.slice(redeemStart, redeemEnd);

  assert.match(redeemSql, /security invoker/);
  assert.match(redeemSql, /where entitlement\.id = p_entitlement_id\s+for update;/);
  assert.match(redeemSql, /entitlement_row\.revoked_at is not null/);
  assert.match(redeemSql, /entitlement_row\.redeemed_at is not null/);
  assert.match(redeemSql, /entitlement_row\.expires_at <= redeemed_at_value/);
  assert.match(redeemSql, /set redeemed_at = redeemed_at_value,[\s\S]*redemption_reference = redemption_reference_value/);
  assert.match(redeemSql, /entitlement\.redeemed_at is null/);
});

test("both economic RPCs are inaccessible to browser roles", () => {
  for (const acl of [
    "issue_cho_neo_loc_v1(uuid)",
    "redeem_cho_neo_loc_v1(uuid, text)",
  ]) {
    const escaped = acl.replaceAll("(", "\\(").replaceAll(")", "\\)").replaceAll(", ", "\\s*,\\s*");
    const block = sql.slice(sql.indexOf(`revoke execute on function public.${acl}`));
    assert.match(block, new RegExp(`revoke execute on function public\\.${escaped} from public;`));
    assert.match(block, new RegExp(`revoke execute on function public\\.${escaped} from anon;`));
    assert.match(block, new RegExp(`revoke execute on function public\\.${escaped} from authenticated;`));
    assert.match(block, new RegExp(`grant execute on function public\\.${escaped} to service_role;`));
  }
});

test("the browser route supplies identity only and cannot submit economic terms", () => {
  assert.doesNotMatch(route, /request\.json\(\)/);
  assert.match(route, /auth\.getUser\(token\)/);
  assert.match(route, /data\.user\.is_anonymous/);
  assert.match(route, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /supabase\.rpc\("issue_cho_neo_loc_v1",\s*\{\s*p_user_id: user\.id/);
  assert.match(route, /Cache-Control.*no-store/);
});

test("the issue route returns only the curated public entitlement representation", () => {
  const representationStart = route.indexOf("const publicEntitlement = {");
  const representationEnd = route.indexOf("};", representationStart);
  assert.notEqual(representationStart, -1);
  assert.notEqual(representationEnd, -1);

  const representation = route.slice(representationStart, representationEnd);
  for (const field of [
    "id: entitlement.id",
    "campaignKey: entitlement.campaign_key",
    "source: entitlement.source",
    "rewardPercent: entitlement.reward_percent",
    "scopeKey: entitlement.scope_key",
    "issuedAt: entitlement.issued_at",
    "expiresAt: entitlement.expires_at",
    "status: deriveLocEntitlementStatus(entitlement)",
  ]) {
    assert.match(representation, new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(representation, /user_id|redemption_reference|redeemed_at|revoked_at/);
  assert.match(route, /\{ entitlement: publicEntitlement \}/);
});

test("entitlement status is derived server-side with stable state precedence", () => {
  assert.match(route, /if \(entitlement\.revoked_at\) return "revoked"/);
  assert.match(route, /if \(entitlement\.redeemed_at\) return "redeemed"/);
  assert.match(route, /entitlement\.expires_at\)\.getTime\(\) <= now\.getTime\(\)\) return "expired"/);
  assert.match(route, /return "issued"/);
});

test("production issuance is closed unless explicitly enabled", () => {
  assert.match(route, /process\.env\.CHO_NEO_LOC_ISSUANCE_ENABLED !== "true"/);
  assert.match(route, /issuance-locked/);
});
