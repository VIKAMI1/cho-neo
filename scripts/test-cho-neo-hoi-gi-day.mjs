#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import os from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const rooms = read("src/lib/cho-neo/rooms.ts");
const rail = read("src/components/cho-neo/ChoNeoVillageRail.tsx");
const railItem = read("src/components/cho-neo/ChoNeoRailItem.tsx");
const roomShell = read("src/components/cho-neo/ChoNeoRoomShell.tsx");
const roomTopBar = read("src/components/cho-neo/ChoNeoRoomTopBar.tsx");
const page = read("src/app/cho-neo/hoi-cho-neo/page.tsx");
const legacyPage = read("src/app/cho-neo/hoi-gi-day/page.tsx");
const route = read("src/app/api/cho-neo/hoi-gi-day/questions/route.ts");
const ai = read("src/lib/cho-neo/hoi-gi-day-ai.ts");
const usage = read("src/lib/cho-neo/openai-usage.ts");
const policy = read("src/lib/cho-neo/hoi-gi-day.ts");
const migration = read("supabase/migrations/20260801090000_cho_neo_hoi_gi_day_room_v1.sql");
const usageMigration = read("supabase/migrations/20260801100000_cho_neo_openai_usage_reservations.sql");

const policyTestDir = await mkdtemp(path.join(os.tmpdir(), "cho-neo-hoi-policy-"));
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
await writeFile(path.join(policyTestDir, "text-safety.mjs"), transpile(read("src/lib/cho-neo/text-safety.ts")));
await writeFile(
  path.join(policyTestDir, "hoi-gi-day.mjs"),
  transpile(policy.replace('from "./text-safety"', 'from "./text-safety.mjs"')),
);
const runtimePolicy = await import(pathToFileURL(path.join(policyTestDir, "hoi-gi-day.mjs")).href);
test.after(async () => {
  await rm(policyTestDir, { force: true, recursive: true });
});

test("Hỏi Chợ Neo is an open central room", () => {
  assert.match(rooms, /id: "hoi-cho-neo"[\s\S]*viName: "Hỏi Chợ Neo"[\s\S]*href: "\/cho-neo\/hoi-cho-neo"[\s\S]*status: "open"/);
  assert.match(rooms, /hotspot: \{ x: "45\.2%", y: "39\.4%"/);
});

test("Sân Làng remains the shared room discovery registry", () => {
  assert.match(rail, /href: "\/cho-neo\/hoi-cho-neo"[\s\S]*id: "hoi-cho-neo"[\s\S]*label: "Hỏi Chợ Neo"/);
  assert.match(railItem, /symbol === "question"/);
  assert.match(rooms, /export const openChoNeoRooms = choNeoRooms\.filter/);
  assert.match(page, /ChoNeoRoomShell currentNavId="hoi-cho-neo"/);
});

test("destination room shell renders no persistent room menu", () => {
  assert.doesNotMatch(roomShell, /ChoNeoVillageRail|ChoNeoMobileVillageNav/);
  assert.doesNotMatch(roomShell, /minmax\(136px, 148px\)/);
  assert.match(roomShell, /grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(roomShell, /minmax\(230px, 300px\)/);
  assert.match(page, /ChoNeoRoomTopBar/);
  assert.match(roomTopBar, /min-height: 44px/);
  assert.match(roomTopBar, /Sân Làng/);
  assert.match(roomTopBar, /memberProfile/);
  assert.match(roomTopBar, /data-cho-neo-shared-music-slot/);
  assert.match(page, /feedback=\{<ChoNeoBetaFeedback \/>}/);
  assert.match(page, /font-size: clamp\(30px, 4\.5vw, 40px\)/);
});

test("canonical room renders publicly and legacy route redirects safely", () => {
  assert.match(page, /export default function HoiChoNeoPage/);
  assert.match(page, /fetch\(API_URL, \{ cache: "no-store" \}/);
  assert.match(legacyPage, /redirect\("\/cho-neo\/hoi-cho-neo"\)/);
});

test("Hỏi Chợ Neo accepts ordinary Vietnamese and Vietlish questions", () => {
  assert.equal(
    runtimePolicy.getHoiGiDayTextError("Khach kho chiu thi phai lam sao may ban?", 320),
    null,
  );
});

test("Hỏi Chợ Neo normalizes textarea newlines and tabs", () => {
  const text = "Khách khó chịu\tthì phải làm sao?\r\nMình nên nói gì?";
  assert.equal(runtimePolicy.getHoiGiDayTextError(text, 320), null);
  assert.equal(runtimePolicy.normalizeHoiGiDayText(text), "Khách khó chịu thì phải làm sao? Mình nên nói gì?");
});

test("Hỏi Chợ Neo still rejects genuine control characters", () => {
  assert.equal(
    runtimePolicy.getHoiGiDayTextError("Câu hỏi có ký tự\u0000 nguy hiểm", 320),
    "Câu hỏi có ký tự chưa dùng được.",
  );
});

test("the first screen uses one shared composer and the approved product language", () => {
  assert.match(page, /Hỏi Chợ Neo/);
  assert.match(page, /Hỏi một chuyện nghề\. NeoPao trả lời trước\./);
  assert.match(page, /Bạn đang vướng chuyện gì\?/);
  assert.match(page, /Hỏi Chợ Neo một chuyện\.\.\./);
  assert.match(page, /Lifting/);
  assert.match(page, /Khách trễ/);
  assert.match(page, /Khách khó/);
  assert.match(page, /const \[activeQuestion, setActiveQuestion\] = useState<HoiGiDayQuestion \| null>\(null\)/);
  assert.match(page, /<details className="hoi-recent">/);
  assert.match(page, /Câu hỏi gần đây · \{recentQuestions\.length\}/);
  assert.doesNotMatch(page, /Chợ Neo · Day One|Ask Chợ Neo|Một câu hỏi, một gợi ý đầu tiên|Ask once|hoi-destination|hoi-scope|Người trong Chợ nói gì\?|Published experience/);
  assert.doesNotMatch(page, /destination-community|Two ways to ask|setDestination/);
});

test("the server always owns the first NeoPao answer", () => {
  assert.match(route, /const destination: HoiGiDayDestination = "neopao"/);
  assert.match(route, /answerWithHoiGiDayAi\([\s\S]*userId[\s\S]*supabase[\s\S]*question\.id/);
  assert.match(page, /<strong id="hoi-active-heading">NeoPao<\/strong>/);
  assert.match(page, /Gợi ý đầu tiên để tham khảo cùng kinh nghiệm thực tế của bạn\./);
  assert.match(page, /setActiveQuestion\(submittedQuestion\)/);
});

test("protected writes use verified membership and server-derived identity", () => {
  assert.match(page, /ensureChoNeoMember\(submitQuestion\)/);
  assert.match(page, /ensureChoNeoMember\(\(\) => submitFeedback/);
  assert.match(page, /const \{ ensureChoNeoMember, profile, session \} = useChoNeoMember\(\)/);
  assert.match(page, /Authorization: `Bearer \$\{session\.access_token\}`/);
  assert.match(route, /getAuthenticatedChoNeoUserId\(request\)/);
  assert.match(route, /auth\.getUser\(token\)/);
  assert.match(route, /if \(!token \|\| !supabaseUrl \|\| !supabaseKey\) return null/);
  assert.match(route, /if \(error \|\| !data\.user \|\| data\.user\.is_anonymous\) return null/);
  assert.match(route, /\.eq\("membership_status", "verified_nail_member"\)/);
  assert.match(route, /\.is\("suspended_at", null\)/);
  assert.match(route, /author_user_id: userId/);
  assert.doesNotMatch(page, /authorUserId|userId:/);
  assert.doesNotMatch(route, /body\.authorUserId|authorUserId:/);
});

test("disabled AI persists and visibly returns the graceful fallback", () => {
  assert.match(ai, /process\.env\.CHO_NEO_OPENAI_ENABLED !== "true"/);
  assert.match(ai, /if \(!process\.env\.OPENAI_API_KEY\?\.trim\(\)\)/);
  assert.match(ai, /return fallback\(gate\.reason\)/);
  assert.match(route, /answer_text: ai\.answerText/);
  assert.match(route, /status: 201/);
  assert.match(page, /nextAnswer\?\.answerText === HOI_GI_DAY_FALLBACK/);
  assert.match(page, /<p className="hoi-notice" role="status">\{notice\}<\/p>/);
  assert.match(policy, /NeoPao đang nghỉ một nhịp\. Câu hỏi của bạn vẫn được giữ để người trong Chợ góp ý\./);
  assert.match(ai, /if \(!gate\.allowed\) return fallback\(gate\.reason\);[\s\S]*const reservation = await reserveOpenAIUsage/);
});

test("feedback is explicit, review-gated and cannot replace an answer", () => {
  assert.match(page, /Đúng/);
  assert.match(page, /Bổ sung/);
  assert.match(page, /Cần sửa/);
  assert.match(page, /openFeedbackAnswerId/);
  assert.match(page, /if \(openFeedbackAnswerId !== answer\.answerId\) return null/);
  assert.match(page, /aria-expanded=\{openFeedbackAnswerId ===/);
  assert.match(page, /Góp ý/);
  assert.match(page, /Kinh nghiệm cộng đồng — đang chờ duyệt/);
  assert.match(route, /review_status: "pending_review"/);
  assert.doesNotMatch(route, /\.from\("cho_neo_answers"\)\s*\.update\(/);
  assert.doesNotMatch(page, /hoi-private-note/);
});

test("topic continuation uses only allowlisted local rooms", () => {
  assert.match(policy, /href: "\/cho-neo\/technique"/);
  assert.match(policy, /href: "\/cho-neo\/owner-corner"/);
  assert.match(policy, /href: "\/cho-neo\/gossip"/);
  assert.match(route, /getHoiChoNeoContinuation\(question\.question_topic\)/);
  assert.doesNotMatch(page, /window\.location|new URL\(|href=.*answer/);
});

test("OpenAI is server-only, explicitly disabled by default, and capped", () => {
  assert.match(ai, /process\.env\.CHO_NEO_OPENAI_ENABLED !== "true"/);
  assert.match(ai, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(ai, /max_output_tokens: MAX_OUTPUT_TOKENS/);
  assert.match(ai, /const MAX_OUTPUT_TOKENS = 280/);
  assert.doesNotMatch(page, /OPENAI_API_KEY|api\.openai\.com/);
});

test("shared Supabase reservation is authoritative before provider fetch", () => {
  assert.match(usage, /reserve_cho_neo_openai_usage_v2/);
  assert.match(usage, /finalize_cho_neo_openai_usage/);
  assert.match(usage, /p_cooldown_seconds/);
  assert.match(usage, /p_monthly_token_limit/);
  assert.match(ai, /const reservation = await reserveOpenAIUsage/);
  assert.match(ai, /const response = await fetch\(OPENAI_ENDPOINT/);
  assert.doesNotMatch(ai, /dailyCalls|monthlySpendUsd|circuitOpenUntil|state:/);
});

test("shared usage migration locks, caps, finalizes and releases reservations", () => {
  assert.match(usageMigration, /create table if not exists public\.cho_neo_openai_usage_reservations/);
  assert.match(usageMigration, /for update/);
  assert.match(usageMigration, /'cooldown'/);
  assert.match(usageMigration, /'global-token-limit'/);
  assert.match(usageMigration, /create or replace function public\.finalize_cho_neo_openai_usage/);
  assert.match(usageMigration, /status = 'failed'/);
  assert.match(usageMigration, /request_count = greatest\(request_count - 1, 0\)/);
});

test("mobile layout keeps the canonical room usable at narrow widths", () => {
  assert.match(page, /width: min\(760px, 100%\)/);
  assert.match(page, /@media \(max-width: 640px\)/);
  assert.match(page, /min-height: 44px/);
});
