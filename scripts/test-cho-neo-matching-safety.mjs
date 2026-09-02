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
