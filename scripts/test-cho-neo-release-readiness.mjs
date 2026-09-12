#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
const packageJson = JSON.parse(read("package.json"));
const matchingRoute = read("src/app/api/cho-neo/tim-ban-trong-nghe/route.ts");
const introductionsRoute = read("src/app/api/cho-neo/tim-ban-trong-nghe/introductions/route.ts");
const memberVerifyRoute = read("src/app/api/cho-neo/member/verify/route.ts");
const matchingPanel = read("src/components/cho-neo/TimBanTrongNghePanel.tsx");
const adminHelper = read("src/lib/cho-neo/invitation-admin.ts");
const reportsApi = read("src/app/api/cho-neo/admin/reports/route.ts");
const reportsPage = read("src/app/cho-neo/admin/reports/page.tsx");
const reportsClient = read("src/app/cho-neo/admin/reports/ReportAdminClient.tsx");
const releaseMigration = read("supabase/migrations/20260905010000_cho_neo_release_readiness_v1.sql");
const workflow = read(".github/workflows/cho-neo-release-readiness.yml");

test("the release safety suite is reachable from package scripts and CI", () => {
  assert.match(packageJson.scripts["test:cho-neo"], /test-cho-neo-release-readiness\.mjs/);
  assert.match(packageJson.scripts.typecheck, /tsc --noEmit/);
  assert.match(workflow, /pull_request:[\s\S]*branches:[\s\S]*- main/);
  assert.match(workflow, /npm run test:cho-neo/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /npm run build/);
});

test("reporting has a durable admin review path and actionable controls", () => {
  assert.match(matchingRoute, /report-evidence-read-failed/);
  assert.match(matchingRoute, /clearContactHandoffs/);
  assert.match(reportsApi, /export async function GET/);
  assert.match(reportsApi, /export async function POST/);
  assert.match(reportsApi, /suspend-member/);
  assert.match(reportsApi, /unsuspend-member/);
  assert.match(reportsApi, /update-status/);
  assert.match(reportsPage, /ReportAdminClient/);
  assert.match(reportsClient, /messageEvidence/);
  assert.match(reportsClient, /Tạm khóa thành viên/);
  assert.match(reportsClient, /Khôi phục thành viên/);
  assert.match(reportsClient, /Đánh dấu đã xử lý/);
  assert.match(matchingPanel, /reportReason/);
  assert.match(matchingPanel, /reportDetails/);
  assert.match(matchingPanel, /window\.confirm/);
  assert.doesNotMatch(matchingPanel, /act\("report", intro\.id, \{ reason: "other" \}\)/);
});

test("destructive matching paths clear contact handoffs and suspended members are blocked", () => {
  assert.match(matchingRoute, /decision === "passed"[\s\S]*clearContactHandoffs/);
  assert.match(matchingRoute, /body\.action === "close-table"[\s\S]*clearContactHandoffs/);
  assert.match(matchingRoute, /body\.action === "block" \|\| body\.action === "report"[\s\S]*clearContactHandoffs/);
  assert.match(matchingRoute, /suspended_at/);
  assert.match(adminHelper, /membership_status/);
  assert.match(adminHelper, /suspended_at/);
});

test("public enrollment and admin introductions use shared database guards", () => {
  assert.match(memberVerifyRoute, /consume_cho_neo_enrollment_attempt/);
  assert.doesNotMatch(memberVerifyRoute, /enrollmentAttemptBuckets/);
  assert.match(introductionsRoute, /create_cho_neo_introduction/);
  assert.doesNotMatch(introductionsRoute, /\.from\(CHO_NEO_INTRODUCTION_TABLE\)\.insert/);
  assert.match(releaseMigration, /create table if not exists public\.cho_neo_enrollment_rate_limits/);
  assert.match(releaseMigration, /create or replace function public\.consume_cho_neo_enrollment_attempt/);
  assert.match(releaseMigration, /create or replace function public\.create_cho_neo_introduction/);
  assert.match(releaseMigration, /pg_advisory_xact_lock/);
  assert.match(releaseMigration, /member-has-active-introduction/);
  assert.match(releaseMigration, /table_closed_at is null/);
  assert.match(releaseMigration, /expires_at > now\(\)/);
  assert.match(releaseMigration, /grant execute on function public\.consume_cho_neo_enrollment_attempt/);
  assert.match(releaseMigration, /grant execute on function public\.create_cho_neo_introduction/);
});
