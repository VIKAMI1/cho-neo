#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const inviteRoutePath = path.join(repoRoot, "src/app/auth/invite/route.ts");
const memberVerifyRoutePath = path.join(
  repoRoot,
  "src/app/api/cho-neo/member/verify/route.ts",
);
const providerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoMemberProvider.tsx",
);

const inviteRoute = fs.readFileSync(inviteRoutePath, "utf8");
const memberVerifyRoute = fs.readFileSync(memberVerifyRoutePath, "utf8");
const provider = fs.readFileSync(providerPath, "utf8");
const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  cwd: repoRoot,
})
  .toString("utf8")
  .split("\0")
  .filter(Boolean);
const inviteCallSiteExclusions = new Set([
  "src/app/auth/invite/route.ts",
  "scripts/test-cho-neo-auth-invite-lockdown.mjs",
]);

test("/auth/invite is a retired endpoint, not an invitation email sender", () => {
  assert.match(inviteRoute, /export async function POST\(\)/);
  assert.match(inviteRoute, /status:\s*410/);
  assert.match(inviteRoute, /Invitation email endpoint retired/);
  assert.doesNotMatch(inviteRoute, /Request|request|req\.json/);
  assert.doesNotMatch(inviteRoute, /createClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(inviteRoute, /inviteUserByEmail|auth\.admin/);
});

test("anonymous, ordinary authenticated, and suspended members all hit the same retired route", () => {
  assert.doesNotMatch(inviteRoute, /authorization|Bearer|getUser|membership_status/i);
  assert.doesNotMatch(inviteRoute, /verified_nail_member|suspended|rejected|pending/);
  assert.doesNotMatch(inviteRoute, /if\s*\(|switch\s*\(/);
  assert.match(inviteRoute, /status:\s*410/);
});

test("no tracked UI, route, script, test, or documentation calls /auth/invite", () => {
  const callSiteFiles = trackedFiles.filter((file) => {
    if (inviteCallSiteExclusions.has(file)) return false;
    if (/\.(?:mp3|png|jpg|jpeg)$/i.test(file)) return false;
    const body = fs.readFileSync(path.join(repoRoot, file), "utf8");
    return /\/auth\/invite|auth\/invite|inviteUserByEmail/.test(body);
  });

  assert.deepEqual(callSiteFiles, []);
});

test("membership invitation-code redemption remains the only approved invite path", () => {
  assert.match(provider, /fetch\("\/api\/cho-neo\/member\/verify"/);
  assert.match(provider, /invitationCode/);
  assert.match(memberVerifyRoute, /auth\.getUser\(token\)/);
  assert.match(memberVerifyRoute, /data\.user\.is_anonymous/);
  assert.match(memberVerifyRoute, /hashChoNeoInvitationCode\(invitationCode\)/);
  assert.match(memberVerifyRoute, /redeem_cho_neo_member_invitation/);
  assert.match(memberVerifyRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(memberVerifyRoute, /inviteUserByEmail|auth\.admin/);
});
