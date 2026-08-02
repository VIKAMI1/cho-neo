#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const route = read("src/app/api/cho-neo/hoi-gi-day/questions/route.ts");
const policy = read("src/lib/cho-neo/hoi-gi-day.ts");
const safety = read("src/lib/cho-neo/text-safety.ts");
const migration = read(
  "supabase/migrations/20260801120000_cho_neo_hoi_publishing_guardrails.sql",
);
const proof = read("scripts/cho-neo-b2-database-proof.sql");
const roomMigration = read("supabase/migrations/20260801090000_cho_neo_hoi_gi_day_room_v1.sql");

test("the durable guard has locked daily windows, cooldowns, and duplicate hashes", () => {
  assert.match(migration, /create table if not exists public\.cho_neo_submission_guard_windows/i);
  assert.match(migration, /primary key \(member_user_id, action_type, window_start\)/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /v_daily_limit := 6/i);
  assert.match(migration, /v_daily_limit := 20/i);
  assert.match(migration, /v_cooldown_seconds := 90/i);
  assert.match(migration, /v_cooldown_seconds := 15/i);
  assert.match(migration, /v_duplicate_seconds integer := 24 \* 60 \* 60/i);
  assert.match(migration, /'duplicate-question'/i);
  assert.match(migration, /'duplicate-feedback'/i);
  assert.match(migration, /'question-daily-limit'/i);
  assert.match(migration, /'feedback-daily-limit'/i);
});

test("question writes reserve the durable guard before pending publication", () => {
  const guardIndex = route.indexOf('reserveSubmissionGuard(\n    supabase,\n    userId,\n    "question"');
  const insertIndex = route.indexOf('.from("cho_neo_questions")\n    .insert({');
  assert.notEqual(guardIndex, -1);
  assert.notEqual(insertIndex, -1);
  assert.ok(guardIndex < insertIndex);
  assert.match(route, /status: "pending_review"/);
  assert.doesNotMatch(route, /status: "published"[,\n\s]*\}\)\s*\.select/);
});

test("questions publish only after answer insertion and failure remains non-public", () => {
  const answerIndex = route.indexOf('.from("cho_neo_answers")');
  const publishIndex = route.indexOf('.update({ status: "published"');
  assert.notEqual(answerIndex, -1);
  assert.notEqual(publishIndex, -1);
  assert.ok(answerIndex < publishIndex);
  assert.match(route, /markQuestionUnpublished\(supabase, question\.id, "answer-save-failed"\)/);
  assert.match(route, /status: "rejected"/);
  assert.match(route, /\.eq\("status", "published"\)/);
});

test("anonymous and unverified authorization remains before durable writes", () => {
  assert.match(route, /getAuthenticatedChoNeoUserId\(request\)/);
  assert.match(route, /status: 401/);
  assert.match(route, /getVerifiedMemberProfile\(supabase, userId\)/);
  assert.match(route, /status: 403/);
  assert.match(route, /auth\.getUser\(token\)/);
  assert.match(route, /author_user_id: userId/);
  assert.doesNotMatch(route, /body\.userId|body\.authorUserId/);
});

test("question guard failures map to stable conflict, rate-limit, and unavailable responses", () => {
  assert.match(route, /publishing-guard-unavailable/);
  assert.match(route, /reason\.startsWith\("duplicate-"\)[\s\S]*\? 409/);
  assert.match(route, /reason\.endsWith\("cooldown"\)/);
  assert.match(route, /reason\.endsWith\("daily-limit"\)/);
  assert.match(route, /\? 429/);
  assert.match(route, /\{ error, reason \}/);
});

test("feedback is guarded by answer, question, type, and normalized contribution", () => {
  assert.match(route, /\.eq\("question_id", questionId\)/);
  assert.match(route, /\.eq\("status", "published"\)/);
  assert.match(route, /sha256\(contributionText\)/);
  assert.match(route, /reserveSubmissionGuard\([\s\S]*"feedback"/);
  assert.match(route, /feedbackType: feedbackType as HoiGiDayFeedbackType/);
  assert.match(route, /review_status: "pending_review"/);
  assert.match(migration, /existing_guard\.question_id = p_question_id/i);
  assert.match(migration, /existing_guard\.target_id = p_target_id/i);
  assert.match(migration, /existing_guard\.feedback_type = p_feedback_type/i);
  assert.match(migration, /'feedback-cooldown'/i);
});

test("text safety rejects controls, URLs, and recognized abuse or threat language", () => {
  assert.match(safety, /CONTROL_CHARACTER_PATTERN/);
  assert.match(safety, /URL_LIKE_PATTERN/);
  assert.match(safety, /UNSAFE_TEXT_PATTERN/);
  assert.match(policy, /getChoNeoTextSafetyError\(text\)/);
  assert.match(policy, /chưa phù hợp để đăng công khai/);
});

test("the guard RPC is SECURITY INVOKER and service-role-only", () => {
  assert.match(migration, /create or replace function public\.reserve_cho_neo_submission_guard/i);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(migration, /security invoker/i);
  assert.match(migration, /language plpgsql\s+security invoker\s+set search_path = public/i);
  assert.match(migration, /set search_path = public/i);
  assert.match(migration, /coalesce\(auth\.role\(\), ''\) <> 'service_role'/i);
  assert.match(migration, /revoke all on function public\.reserve_cho_neo_submission_guard/i);
  assert.match(migration, /from PUBLIC;/i);
  assert.match(migration, /from anon, authenticated;/i);
  assert.match(migration, /grant execute on function public\.reserve_cho_neo_submission_guard[\s\S]*to service_role;/i);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to (?:anon|authenticated)/i);
  assert.match(route, /const supabase = createChoNeoSupabaseServiceClient\(\);/);
  assert.match(route, /const supabaseKey = process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(route, /supabase\.rpc\("reserve_cho_neo_submission_guard"/);
  assert.match(proof, /SET LOCAL ROLE service_role/i);
  assert.match(proof, /reserve_cho_neo_submission_guard\(/i);
  assert.match(proof, /prosecdef[\s\S]*false/i);
});

test("public reads remain restricted to published questions and their answers", () => {
  assert.match(route, /\.from\("cho_neo_questions"\)[\s\S]*\.eq\("status", "published"\)/);
  assert.match(roomMigration, /using \(status = 'published'\)/i);
  assert.match(roomMigration, /question\.status = 'published'/i);
});
