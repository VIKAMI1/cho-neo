#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const guestPassPath = path.join(repoRoot, "src/lib/cho-neo/guest-pass.ts");
const providerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoGuestPassProvider.tsx",
);
const headerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoGuestPassHeaderControl.tsx",
);
const shellPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoVillageShell.tsx",
);
const layoutPath = path.join(repoRoot, "src/app/cho-neo/layout.tsx");
const loginPath = path.join(repoRoot, "src/app/login/page.tsx");
const accountLoginPath = path.join(repoRoot, "src/app/account/login/page.tsx");
const authCallbackPath = path.join(
  repoRoot,
  "src/app/auth/callback/AuthCallbackClient.tsx",
);
const profilePath = path.join(repoRoot, "src/app/profile/page.tsx");
const voteApiPath = path.join(repoRoot, "src/app/api/cho-neo/room-vote/route.ts");
const voteServicePath = path.join(repoRoot, "src/lib/cho-neo/room-vote-service.ts");
const voteRepositoryPath = path.join(
  repoRoot,
  "src/lib/cho-neo/room-vote-repository.ts",
);
const schemaPath = path.join(repoRoot, "docs/cho-neo/room-vote-v1.sql");
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260726185000_cho_neo_guest_pass_v1.sql",
);
const opsDocPath = path.join(repoRoot, "docs/cho-neo/guest-pass-v1.md");

const guestPass = fs.readFileSync(guestPassPath, "utf8");
const provider = fs.readFileSync(providerPath, "utf8");
const header = fs.readFileSync(headerPath, "utf8");
const shell = fs.readFileSync(shellPath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");
const login = fs.readFileSync(loginPath, "utf8");
const accountLogin = fs.readFileSync(accountLoginPath, "utf8");
const authCallback = fs.readFileSync(authCallbackPath, "utf8");
const profile = fs.readFileSync(profilePath, "utf8");
const voteApi = fs.readFileSync(voteApiPath, "utf8");
const voteService = fs.readFileSync(voteServicePath, "utf8");
const voteRepository = fs.readFileSync(voteRepositoryPath, "utf8");
const schema = fs.readFileSync(schemaPath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");
const opsDoc = fs.readFileSync(opsDocPath, "utf8");
const module = await importGuestPassModule();

test("public browsing remains pass-free until a protected action", () => {
  assert.match(layout, /ChoNeoGuestPassProvider/);
  assert.match(provider, /setStatus\("public"\)/);
  assert.match(header, /Nhận Thẻ/);
  assert.match(provider, /ensureChoNeoPass/);
  assert.match(provider, /const existingSessionResult = await supabase\.auth\.getSession\(\)/);
  assert.match(provider, /let activeSession = existingSessionResult\.data\.session \?\? null/);
  assert.match(provider, /async function submit\(\)[\s\S]*signInAnonymously/);
});

test("pass modal uses the approved copy and no email/password/marketing flow", () => {
  assert.match(provider, /Nhận Thẻ Chợ Neo/);
  assert.match(provider, /Không cần email hay mật khẩu/);
  assert.match(provider, /Nhận thẻ và tiếp tục/);
  assert.match(provider, /Thẻ được giữ trên trình duyệt này/);
  assert.doesNotMatch(provider, /signInWithOtp|verifyOtp|password|newsletter|marketing|phone/i);
});

test("Turnstile token is required before anonymous sign-in in the real flow", () => {
  assert.match(provider, /NEXT_PUBLIC_TURNSTILE_SITE_KEY/);
  assert.match(provider, /captchaToken/);
  assert.match(provider, /signInAnonymously\(\{\s*options: \{ captchaToken \}/s);
  assert.match(provider, /LOCAL_TEST_TURNSTILE_TOKEN/);
  assert.doesNotMatch(provider, /signInAnonymously\(\s*\)/);
});

test("profile is Supabase-owned, idempotent, and uses the avatar allowlist", () => {
  assert.match(provider, /CHO_NEO_GUEST_PROFILE_TABLE/);
  assert.match(provider, /\.upsert\(row, \{ onConflict: "user_id" \}\)/);
  assert.match(guestPass, /CHO_NEO_AVATARS/);
  assert.match(guestPass, /isApprovedChoNeoGuestAvatarKey/);
  assert.match(schema, /create table if not exists public\.cho_neo_guest_profiles/);
  assert.match(migration, /create table if not exists public\.cho_neo_guest_profiles/);
  assert.match(schema, /user_id uuid primary key references auth\.users\(id\)/);
  assert.match(migration, /voter_user_id uuid null references auth\.users\(id\)/);
});

test("nickname validation normalizes whitespace and rejects unsafe names", () => {
  assert.deepEqual(module.validateChoNeoGuestDisplayName("  Mai   Calgary  "), {
    displayName: "Mai Calgary",
    normalizedDisplayName: "mai calgary",
    ok: true,
  });
  assert.equal(module.validateChoNeoGuestDisplayName("A").ok, false);
  assert.equal(module.validateChoNeoGuestDisplayName("x".repeat(25)).ok, false);
  assert.equal(module.validateChoNeoGuestDisplayName("visit example.com").ok, false);
  assert.equal(module.validateChoNeoGuestDisplayName("bad\u0001name").ok, false);
});

test("header and profile sheet replace ordinary visitor login", () => {
  assert.match(shell, /ChoNeoGuestPassHeaderControl/);
  assert.match(header, /Nhận Thẻ/);
  assert.match(header, /profile\.displayName/);
  assert.match(provider, /Bỏ thẻ khỏi máy này/);
  assert.match(provider, /Bạn có thể mất tên, lịch sử và quyền quản lý nội dung/);
  assert.doesNotMatch(shell, /<strong>Đăng nhập<\/strong>|<small>Login<\/small>/);
});

test("/login redirects ordinary visitors to the shared pass-capable Chợ Neo shell", () => {
  assert.match(login, /redirect\("\/cho-neo"\)/);
  assert.doesNotMatch(login, /LoginClient|signInWithOtp|verifyOtp|email|password/i);
});

test("permanent account authentication remains available away from visitor /login", () => {
  assert.match(accountLogin, /LoginClient/);
  assert.match(accountLogin, /Suspense/);
  assert.match(profile, /href="\/account\/login"/);
  assert.match(authCallback, /router\.replace\("\/account\/login"\)/);
  assert.doesNotMatch(authCallback, /router\.replace\("\/login"\)/);
});

test("room vote resumes through the pass gate and cannot submit as another user", () => {
  assert.match(provider, /pendingActionRef/);
  assert.match(provider, /hasResumedRef/);
  assert.match(provider, /await action\(\)/);
  assert.match(voteApi, /auth\.getUser\(token\)/);
  assert.match(voteService, /missing-cho-neo-pass/);
  assert.match(voteService, /findActiveGuestProfile\(voterUserId\)/);
  assert.match(voteService, /inactive-cho-neo-pass/);
  assert.match(voteRepository, /cho_neo_guest_profiles/);
  assert.match(voteRepository, /voter_user_id: input\.voterUserId/);
  assert.match(voteRepository, /findSelection\(input\.pollKey, input\.voterUserId\)/);
  assert.match(voteRepository, /\.update\(row\)/);
  assert.match(voteRepository, /\.insert\(row\)/);
  assert.match(schema, /voter_user_id = auth\.uid\(\)/);
});

test("RLS policies fail closed for authenticated anonymous users", () => {
  assert.match(schema, /Cho Neo guest profiles are owner readable/);
  assert.match(migration, /Cho Neo guest profiles are owner readable/);
  assert.match(schema, /to authenticated[\s\S]+auth\.uid\(\) = user_id/);
  assert.match(migration, /to authenticated[\s\S]+auth\.uid\(\) = user_id/);
  assert.match(schema, /status = 'active'/);
  assert.match(schema, /voter_user_id = auth\.uid\(\)/);
  assert.match(migration, /voter_user_id = auth\.uid\(\)/);
  assert.match(schema, /Cho Neo visitors can read their own room vote/);
  assert.match(migration, /Cho Neo visitors can read their own room vote/);
  assert.match(schema, /cho_neo_room_votes_one_vote_per_user_idx/);
  assert.match(migration, /cho_neo_room_votes_one_vote_per_user_idx/);
  assert.match(opsDoc, /Anonymous Supabase users also use `authenticated`/);
  assert.match(opsDoc, /shared-gossip-memory-v1\.sql/);
});

test("cleanup and QR transfer remain documented future boundaries", () => {
  assert.match(opsDoc, /Anonymous auth records are not automatically cleaned up/);
  assert.match(opsDoc, /Read-only audit query/);
  assert.match(opsDoc, /QR transfer is explicitly out of V1/);
  assert.match(opsDoc, /no session or\s+refresh token inside the QR/);
});

async function importGuestPassModule() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cho-neo-guest-pass-tests-"));
  const source = fs
    .readFileSync(guestPassPath, "utf8")
    .replace(
      'import {\n  CHO_NEO_AVATARS,\n  getAvatarById,\n  type ChoNeoAvatar,\n} from "./avatar-identity";',
      `const CHO_NEO_AVATARS = [
        { id: "young-nail-tech", name: "Nail Tech", description: "", emoji: "x", tone: "cyan" },
        { id: "auntie-owner", name: "Salon Owner", description: "", emoji: "x", tone: "rose" }
      ];
      type ChoNeoAvatar = (typeof CHO_NEO_AVATARS)[number];
      function getAvatarById(id) { return CHO_NEO_AVATARS.find((avatar) => avatar.id === id) ?? CHO_NEO_AVATARS[0]; }`,
    )
    .replace(/import type \{[^}]+\} from "\.\/avatar-identity";\n?/g, "");

  const target = path.join(tempDir, "guest-pass.ts");
  fs.writeFileSync(target, source);
  return import(target);
}
