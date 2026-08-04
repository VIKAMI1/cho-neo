#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const joinPath = path.join(repoRoot, "src/app/join/JoinClient.tsx");
const loginPagePath = path.join(repoRoot, "src/app/login/page.tsx");
const loginClientPath = path.join(repoRoot, "src/app/login/LoginClient.tsx");
const entryPath = path.join(repoRoot, "src/app/login/PrivateInvitationEntry.tsx");
const providerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoMemberProvider.tsx",
);
const verifyRoutePath = path.join(
  repoRoot,
  "src/app/api/cho-neo/member/verify/route.ts",
);
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260803100000_cho_neo_private_invitation_onboarding_v1.sql",
);
const inviteScriptPath = path.join(
  repoRoot,
  "scripts/create-cho-neo-member-invitation.mjs",
);

const join = fs.readFileSync(joinPath, "utf8");
const loginPage = fs.readFileSync(loginPagePath, "utf8");
const loginClient = fs.readFileSync(loginClientPath, "utf8");
const entry = fs.readFileSync(entryPath, "utf8");
const provider = fs.readFileSync(providerPath, "utf8");
const verifyRoute = fs.readFileSync(verifyRoutePath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");
const inviteScript = fs.readFileSync(inviteScriptPath, "utf8");

test("private invite uses a URL fragment and removes it after capture", () => {
  assert.match(join, /window\.location\.hash/);
  assert.match(join, /new URLSearchParams\(hash\)\.get\("invite"\)/);
  assert.match(join, /window\.history\.replaceState\(/);
  assert.doesNotMatch(join, /console\.(log|error|warn).*invitationToken/);
});

test("anonymous auth is created only when the device has no session", () => {
  assert.match(join, /supabase\.auth\.getSession\(\)/);
  assert.match(join, /if \(!session\)/);
  assert.match(join, /supabase\.auth\.signInAnonymously\(\)/);
  assert.match(verifyRoute, /auth\.getUser\(token\)/);
  assert.match(verifyRoute, /isAnonymous: data\.user\.is_anonymous === true/);
  assert.match(join, /if \(!session && token\)/);
});

test("onboarding has no visible invitation code, role selector, password, or OAuth controls", () => {
  assert.doesNotMatch(join, /Mã Lời Mời|Nhập mã|invitationCode|nailRole|<select|password|Google|Facebook/);
  assert.doesNotMatch(entry, /Google|Facebook|signInWithOAuth/);
  assert.doesNotMatch(loginPage, /LoginClient/);
  assert.match(loginClient, /signInWithOAuth\(\{/);
  assert.match(provider, /href="\/join"/);
  assert.doesNotMatch(provider, /<select|Nhập mã lời mời|Vai trò trong ngành nail/);
});

test("agreement acceptance is required and recorded with a fixed version", () => {
  assert.match(join, /CHO_NEO_AGREEMENT_VERSION/);
  assert.match(join, /agreementAccepted/);
  assert.match(join, /agreementVersion: CHO_NEO_AGREEMENT_VERSION/);
  assert.match(verifyRoute, /agreementAccepted !== true/);
  assert.match(verifyRoute, /agreement-version-mismatch/);
  assert.match(migration, /agreement_version text null/);
  assert.match(migration, /agreement_accepted_at timestamptz null/);
  assert.match(migration, /p_agreement_version is distinct from 'cho-neo-user-agreement-v1'/);
  assert.match(join, /profile\.agreementVersion === CHO_NEO_AGREEMENT_VERSION/);
  assert.match(verifyRoute, /agreementNeedsAcceptance/);
});

test("anonymous redemption derives role from the invitation, never the request", () => {
  assert.match(verifyRoute, /redeem_cho_neo_private_invitation/);
  assert.doesNotMatch(verifyRoute, /p_nail_role|body\?\.nailRole/);
  assert.match(migration, /role_value := coalesce\(invitation_row\.intended_role, 'other_industry'\)/);
  assert.match(migration, /nail_role,\n    normalized_display_name/);
  assert.match(migration, /role_value,\n    p_normalized_display_name/);
});

test("invalid, expired, revoked, used, suspended, and rejected paths fail safely", () => {
  for (const reason of [
    "invalid-invitation",
    "expired-invitation",
    "revoked-invitation",
    "used-invitation",
    "member-restricted",
  ]) {
    assert.match(migration, new RegExp(`'${reason}'`));
  }
  assert.match(migration, /existing_profile\.membership_status in \('suspended', 'rejected'\)/);
  assert.match(migration, /where member\.membership_status not in \('suspended', 'rejected'\)/);
});

test("redemption remains atomic and server-only", () => {
  assert.match(migration, /for update/);
  assert.match(migration, /update public\.cho_neo_member_invitations/);
  assert.match(migration, /insert into public\.cho_neo_member_profiles as member/);
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(migration, /revoke all on function public\.redeem_cho_neo_private_invitation/);
  assert.match(migration, /grant execute on function public\.redeem_cho_neo_private_invitation/);
  assert.match(migration, /to service_role/);
  assert.match(verifyRoute, /hashChoNeoInvitationToken\(invitationToken\)/);
  assert.doesNotMatch(verifyRoute, /from\("cho_neo_member_invitations"\)/);
});

test("plain invitation tokens are not stored or emitted by server application logs", () => {
  assert.match(verifyRoute, /code_hash/);
  assert.doesNotMatch(verifyRoute, /console\.(log|error|warn)\([^)]*invitationToken/);
  assert.match(inviteScript, /createHash\("sha256"\)/);
  assert.match(inviteScript, /code_hash: codeHash/);
  assert.doesNotMatch(inviteScript, /console\.log\(code\)/);
  assert.match(inviteScript, /buildPrivateInvitationLink\(code/);
  assert.match(inviteScript, /Plain invitation is intentionally hidden in dry-run mode/);
  assert.match(join, /isTerminalInvitationFailure/);
  assert.match(join, /clearInvitationToken\(\)/);
});

test("existing OAuth implementation remains dormant and isolated", () => {
  assert.match(loginClient, /signInWithOAuth\(\{/);
  assert.match(loginClient, /auth\/callback/);
  assert.doesNotMatch(loginPage, /LoginClient/);
  assert.match(entry, /Mở lời mời/);
});

test("verified members still load through the existing provider", () => {
  assert.match(provider, /loadChoNeoMemberProfile/);
  assert.match(provider, /isVerifiedChoNeoMemberProfile/);
  assert.match(provider, /membership_status/);
  assert.match(provider, /setStatus\("ready"\)/);
});

test("existing authenticated sessions can redeem without creating a duplicate account", () => {
  assert.match(verifyRoute, /auth\.getUser\(token\)/);
  assert.doesNotMatch(verifyRoute, /anonymous-session-required/);
  assert.match(verifyRoute, /p_user_id: authenticatedUser\.id/);
  assert.match(migration, /on conflict \(user_id\) do update/);
});

test("invitation links require configured or explicit site origin", () => {
  assert.match(inviteScript, /CHO_NEO_JOIN_URL/);
  assert.match(inviteScript, /NEXT_PUBLIC_SITE_URL/);
  assert.match(inviteScript, /args\.get\("join-url"\)/);
  assert.doesNotMatch(inviteScript, /cho-neo\.vercel\.app/);
});
