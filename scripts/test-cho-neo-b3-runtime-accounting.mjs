#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const page = read("src/app/cho-neo/ong-dia/page.tsx");
const route = read("src/app/api/cho-neo/ong-dia/prayer/route.ts");
const usage = read("src/lib/cho-neo/openai-usage.ts");
const migration = read(
  "supabase/migrations/20260801130000_cho_neo_openai_usage_expiry_reconciliation.sql",
);
const proof = read("scripts/cho-neo-b3-database-proof.sql");

test("Ông Địa uses the existing member session bearer token without browser identity", () => {
  assert.match(page, /useChoNeoMember/);
  assert.match(page, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.doesNotMatch(page, /body: JSON\.stringify\([\s\S]*access_token/);
  assert.doesNotMatch(page, /userId|authorUserId/);
  assert.match(route, /authClient\.auth\.getUser\(token\)/);
  assert.match(route, /membership_status.*verified_nail_member/);
  assert.match(route, /suspended_at.*null/);
});

test("Ông Địa uses shared v2 reservation and finalization, never the legacy v1 call", () => {
  assert.doesNotMatch(route, /reserve_cho_neo_openai_usage\("/);
  assert.match(route, /reserveOpenAIUsage/);
  assert.match(route, /finalizeOpenAIUsage/);
  assert.match(route, /finally \{[\s\S]*openAIReservationId/);
  assert.match(usage, /reserve_cho_neo_openai_usage_v2/);
  assert.match(usage, /finalize_cho_neo_openai_usage/);
  assert.match(usage, /claimOpenAIUsageFlight/);
  assert.match(usage, /invalid-usage-config/);
});

test("the forward migration expires stale reservations and reconciles actual tokens", () => {
  assert.match(migration, /add column if not exists expires_at timestamptz/i);
  assert.match(migration, /status in \('reserved', 'succeeded', 'failed', 'released', 'expired'\)/i);
  assert.match(migration, /expires_at <= now\(\)/i);
  assert.match(migration, /status = 'expired'/i);
  assert.match(migration, /estimated_token_count - reservation\.estimated_tokens \+ safe_actual_tokens/i);
  assert.match(migration, /greatest\([\s\S]*estimated_token_count - reservation\.estimated_tokens/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /status <> 'reserved'/i);
});

test("v2 ACL remains server-only for both accounting functions", () => {
  for (const name of [
    "reserve_cho_neo_openai_usage_v2",
    "finalize_cho_neo_openai_usage",
  ]) {
    const start = migration.indexOf(`REVOKE ALL ON FUNCTION public.${name}`);
    assert.notEqual(start, -1);
    const acl = migration.slice(start, migration.indexOf("SELECT pg_notify", start));
    assert.match(acl, /FROM PUBLIC;/i);
    assert.match(acl, /FROM anon, authenticated;/i);
    assert.match(acl, /TO service_role;/i);
    assert.doesNotMatch(acl, /TO (?:anon|authenticated);/i);
  }
});

test("the disposable B3 proof is transactional and covers all required runtime outcomes", () => {
  assert.match(proof, /^BEGIN;/);
  assert.match(proof, /has_function_privilege\('anon'/);
  assert.match(proof, /has_function_privilege\('authenticated'/);
  assert.match(proof, /has_function_privilege\('service_role'/);
  assert.match(proof, /privilege\.grantee = 0/);
  assert.match(proof, /permission denied for function reserve_cho_neo_openai_usage_v2/);
  assert.match(proof, /permission denied for function finalize_cho_neo_openai_usage/);
  assert.match(proof, /'b3-success'/);
  assert.match(proof, /'b3-failed'/);
  assert.match(proof, /'b3-expired'/);
  assert.match(proof, /'b3-token-cap'/);
  assert.match(proof, /B3_DATABASE_PROOF_PASSED/);
  assert.match(proof, /ROLLBACK;\s*$/);
});

test("the B3 SQL proof has balanced dollar-quoted blocks", () => {
  const tokens = [];
  const tokenPattern = /\$\$|\$sql\$/g;
  for (const match of proof.matchAll(tokenPattern)) {
    tokens.push({ token: match[0], index: match.index });
  }

  assert.ok(tokens.length > 0);
  assert.equal(tokens.length % 2, 0);

  for (let index = 0; index < tokens.length; index += 2) {
    assert.equal(
      tokens[index].token,
      tokens[index + 1].token,
      `unmatched dollar-quote delimiter near byte ${tokens[index].index}`,
    );
  }

  assert.equal(tokens.filter(({ token }) => token === "$$").length, 16);
  assert.equal(tokens.filter(({ token }) => token === "$sql$").length, 0);
});
