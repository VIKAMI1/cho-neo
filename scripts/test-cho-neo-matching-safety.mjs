#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const route = read("src/app/api/cho-neo/tim-ban-trong-nghe/route.ts");
const server = read("src/lib/cho-neo/matching-server.ts");
const adminRoute = read("src/app/api/cho-neo/tim-ban-trong-nghe/introductions/route.ts");
const adminHelper = read("src/lib/cho-neo/invitation-admin.ts");
const retentionMigration = read("supabase/migrations/20260903041004_cho_neo_contact_handoff_retention_v1.sql");

test("a blocked participant cannot accept the introduction again", () => {
  assert.match(route, /if \(safety\.blocked \|\| safety\.reported\) return NextResponse\.json\([\s\S]*status: 403/);
  assert.match(route, /if \(intro\[mine\] === "passed"\) return badRequest/);
  assert.match(route, /\.neq\(mine, "passed"\)/);
});

test("a blocked participant cannot read or send private messages", () => {
  assert.match(route, /const canExposePrivateTable = isMutual && !safety\.blocked && !safety\.reported && !intro\.table_closed_at && !expired/);
  assert.match(route, /if \(safety\.blocked \|\| safety\.reported\) return NextResponse\.json\([\s\S]*Bàn trò chuyện này đã được khép lại vì an toàn/);
  assert.match(route, /if \(canExposePrivateTable\) \{[\s\S]*supabase\.from\(CHO_NEO_PRIVATE_MESSAGE_TABLE\)\.select\(/);
});

test("a blocked participant cannot read or share contact handoffs", () => {
  assert.match(route, /if \(canExposePrivateTable\) \{[\s\S]*supabase\.from\(CHO_NEO_CONTACT_HANDOFF_TABLE\)\.select\(/);
  assert.match(route, /if \(safety\.blocked \|\| safety\.reported\) return NextResponse\.json\([\s\S]*Lời giới thiệu này đã được khép lại vì an toàn/);
  assert.match(route, /if \(!mutual \|\| intro\.table_closed_at\)/);
});

test("anonymous Supabase users are rejected before matching member checks", () => {
  assert.match(server, /return error \|\| !data\.user \|\| data\.user\.is_anonymous \? null : data\.user/);
  assert.match(route, /const user = await getMatchingUser\(request\)/);
});

test("suspended members are rejected for both self-service and admin introductions", () => {
  assert.match(route, /select\("membership_status, suspended_at"\)[\s\S]*\.is\("suspended_at", null\)/);
  assert.match(adminRoute, /select\("user_id, membership_status, suspended_at"\)[\s\S]*\.is\("suspended_at", null\)/);
});

test("closed, expired, blocked, and reported introductions cannot expose private history or contacts", () => {
  assert.match(route, /const canExposePrivateTable = isMutual && !safety\.blocked && !safety\.reported && !intro\.table_closed_at && !expired/);
  assert.match(route, /state: safety\.blocked \|\| safety\.reported \|\| myDecision === "passed" \|\| theirDecision === "passed" \|\| intro\.table_closed_at/);
  assert.match(route, /const expired = new Date\(intro\.expires_at\)\.getTime\(\) <= Date\.now\(\)/);
});

test("a normal mutual member-to-member table still sends and records messages", () => {
  assert.match(route, /if \(intro\.member_a_decision !== "accepted" \|\| intro\.member_b_decision !== "accepted"\)/);
  assert.match(route, /supabase\.from\(CHO_NEO_PRIVATE_MESSAGE_TABLE\)\.insert\(\{ body: message\.body, introduction_id: body\.introductionId, sender_user_id: userId \}\)/);
  assert.match(route, /table_last_active_at: now\.toISOString\(\)/);
});

test("reporting fails closed before creating a report when evidence is unavailable", () => {
  assert.match(route, /const \{ data, error: messageEvidenceError \} = await supabase[\s\S]*CHO_NEO_PRIVATE_MESSAGE_TABLE/);
  assert.match(route, /if \(messageEvidenceError \|\| data === null\) return unavailable\("report-evidence-read-failed"\)/);
  assert.match(route, /message_evidence: messages/);
  assert.match(route, /clearContactHandoffs\(supabase, body\.introductionId\)/);
});

test("allowlisted administrators must be verified and unsuspended", () => {
  assert.match(adminHelper, /CHO_NEO_MEMBER_PROFILE_TABLE/);
  assert.match(adminHelper, /authError \|\| !user \|\| user\.is_anonymous/);
  assert.match(adminHelper, /membership_status, suspended_at/);
  assert.match(adminHelper, /memberProfileError \|\|/);
  assert.match(adminHelper, /memberProfile\?\.membership_status !== "verified_nail_member"/);
  assert.match(adminHelper, /memberProfile\.suspended_at !== null/);
});

test("contact handoff retention is bounded, rerun-safe, and covers every terminal state", () => {
  assert.match(retentionMigration, /create index if not exists cho_neo_contact_handoffs_retention_idx/);
  assert.match(retentionMigration, /expected_job_name constant text := 'cho-neo-contact-handoff-retention-v1'/);
  assert.match(retentionMigration, /if not exists \([\s\S]*cron\.job[\s\S]*where jobname = expected_job_name/);
  assert.match(retentionMigration, /limit 500/);
  assert.match(retentionMigration, /introduction\.table_closed_at is not null/);
  assert.match(retentionMigration, /introduction\.expires_at <= now\(\)/);
  assert.match(retentionMigration, /introduction\.member_a_decision = 'passed'/);
  assert.match(retentionMigration, /introduction\.member_b_decision = 'passed'/);
  assert.match(retentionMigration, /cho_neo_matching_blocks/);
  assert.match(retentionMigration, /cho_neo_matching_reports/);
  assert.match(retentionMigration, /delete from public\.cho_neo_contact_handoffs/);
  assert.doesNotMatch(retentionMigration, /delete from public\.cho_neo_private_messages/);
  assert.doesNotMatch(retentionMigration, /message_evidence = null/);
});

test("contact retention cron rejects conflicting definitions and accepts identical reruns", () => {
  assert.match(retentionMigration, /expected_schedule constant text := '27 \* \* \* \*'/);
  assert.match(retentionMigration, /expected_command constant text := \$retention\$/);
  assert.match(retentionMigration, /select schedule, command, active[\s\S]*from cron\.job[\s\S]*where jobname = expected_job_name/);
  assert.match(retentionMigration, /existing_schedule is distinct from expected_schedule/);
  assert.match(retentionMigration, /existing_command is distinct from expected_command/);
  assert.match(retentionMigration, /existing_active is distinct from true/);
  assert.match(retentionMigration, /raise exception 'Chợ Neo contact retention cron job % has a conflicting definition/);
  assert.doesNotMatch(retentionMigration, /cron\.unschedule/);
});
