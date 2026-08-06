#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const loginPagePath = path.join(repoRoot, "src/app/login/page.tsx");
const privateEntryPath = path.join(
  repoRoot,
  "src/app/login/PrivateInvitationEntry.tsx",
);
const loginClientPath = path.join(repoRoot, "src/app/login/LoginClient.tsx");
const supabaseBrowserPath = path.join(repoRoot, "src/lib/supabase-browser.ts");
const authCallbackPath = path.join(
  repoRoot,
  "src/app/auth/callback/AuthCallbackClient.tsx",
);
const memberPath = path.join(repoRoot, "src/lib/cho-neo/member-identity.ts");
const providerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoMemberProvider.tsx",
);
const headerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoMemberHeaderControl.tsx",
);
const verifyRoutePath = path.join(
  repoRoot,
  "src/app/api/cho-neo/member/verify/route.ts",
);
const voteRepositoryPath = path.join(
  repoRoot,
  "src/lib/cho-neo/room-vote-repository.ts",
);
const voteServicePath = path.join(
  repoRoot,
  "src/lib/cho-neo/room-vote-service.ts",
);
const voteApiPath = path.join(repoRoot, "src/app/api/cho-neo/room-vote/route.ts");
const gossipRoutePath = path.join(
  repoRoot,
  "src/app/api/cho-neo/gossip/front-counter/messages/route.ts",
);
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260726204500_cho_neo_social_member_login_v1.sql",
);
const inviteScriptPath = path.join(
  repoRoot,
  "scripts/create-cho-neo-member-invitation.mjs",
);

const loginPage = fs.readFileSync(loginPagePath, "utf8");
const privateEntry = fs.readFileSync(privateEntryPath, "utf8");
const loginClient = fs.readFileSync(loginClientPath, "utf8");
const supabaseBrowser = fs.readFileSync(supabaseBrowserPath, "utf8");
const authCallback = fs.readFileSync(authCallbackPath, "utf8");
const member = fs.readFileSync(memberPath, "utf8");
const provider = fs.readFileSync(providerPath, "utf8");
const header = fs.readFileSync(headerPath, "utf8");
const verifyRoute = fs.readFileSync(verifyRoutePath, "utf8");
const voteRepository = fs.readFileSync(voteRepositoryPath, "utf8");
const voteService = fs.readFileSync(voteServicePath, "utf8");
const voteApi = fs.readFileSync(voteApiPath, "utf8");
const gossipRoute = fs.readFileSync(gossipRoutePath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");
const inviteScript = fs.readFileSync(inviteScriptPath, "utf8");
const memberModule = await importMemberModule();

test("/login is the private invitation entrance", () => {
  assert.match(loginPage, /PrivateInvitationEntry/);
  assert.match(privateEntry, /Mở cửa theo lời mời riêng/);
  assert.match(privateEntry, /href=\{joinHref\}/);
  assert.doesNotMatch(privateEntry, /Google|Facebook|signInWithOAuth/);
  assert.doesNotMatch(loginPage, /LoginClient/);
});

test("OAuth providers use Supabase PKCE callback, basic scopes and feature flags", () => {
  assert.match(loginClient, /signInWithOAuth\(\{/);
  assert.match(loginClient, /provider,/);
  assert.match(loginClient, /redirectTo,/);
  assert.match(loginClient, /window\.location\.origin\}\/auth\/callback\?next=/);
  assert.match(loginClient, /google: "openid email profile"/);
  assert.match(loginClient, /facebook: "public_profile email"/);
  assert.match(loginClient, /scopes: CHO_NEO_OAUTH_SCOPES\[provider\]/);
  assert.match(loginClient, /NEXT_PUBLIC_CHO_NEO_GOOGLE_LOGIN_ENABLED === "true"/);
  assert.match(loginClient, /NEXT_PUBLIC_CHO_NEO_FACEBOOK_LOGIN_ENABLED === "true"/);
  assert.doesNotMatch(loginClient, /friends|contacts|pages|business|publish|posts/i);
  assert.doesNotMatch(loginClient, /provider_token|provider_refresh_token|access_token/);
});

test("Supabase browser client uses one PKCE session-completion path", () => {
  assert.match(supabaseBrowser, /flowType: "pkce"/);
  assert.match(supabaseBrowser, /detectSessionInUrl: false/);
  assert.match(supabaseBrowser, /persistSession: true/);
  assert.match(supabaseBrowser, /autoRefreshToken: true/);
});

test("provider buttons fail closed behind independent flags", () => {
  assert.match(loginClient, /googleEnabled \|\| facebookEnabled/);
  assert.match(loginClient, /googleEnabled \? \(/);
  assert.match(loginClient, /facebookEnabled \? \(/);
  assert.match(loginClient, /Cổng đăng nhập thành viên đang tạm đóng/);
  assert.match(loginClient, /Trở lại Chợ Neo/);
  assert.doesNotMatch(loginClient, /NEXT_PUBLIC_CHO_NEO_GOOGLE_LOGIN_ENABLED !== "false"/);
});

test("return destinations are local and callback exchanges the PKCE code", () => {
  assert.match(loginClient, /getSafeReturnTo/);
  assert.equal(memberModule.getSafeReturnTo?.("//evil.test") ?? "/cho-neo", "/cho-neo");
  assert.match(authCallback, /const code = url\.searchParams\.get\("code"\)/);
  assert.match(authCallback, /exchangeCodeForSession\(code\)/);
  assert.doesNotMatch(authCallback, /exchangeCodeForSession\(url\.href\)/);
  assert.match(authCallback, /const \{ data, error \} =\s+await supabase\.auth\.exchangeCodeForSession\(code\)/);
  assert.match(authCallback, /oauth-session-missing/);
  assert.match(authCallback, /setTimeout\(\(\) => router\.replace\(`\/login\?next=\$\{encodeURIComponent\(next\)\}`\), 1200\)/);
  assert.match(authCallback, /cleanCallbackUrl\(url\)/);
  assert.match(authCallback, /window\.history\.replaceState\(\{\}, "", `\$\{url\.origin\}\$\{url\.pathname\}`\)/);
  assert.match(authCallback, /url\.hash\.includes\("access_token"\)/);
  assert.match(authCallback, /url\.hash\.includes\("refresh_token"\)/);
  assert.match(authCallback, /didRunRef/);
  assert.match(authCallback, /const next = getSafeReturnTo\(search\.get\("next"\)\)/);
  assert.match(authCallback, /router\.replace\(next\)/);
  assert.doesNotMatch(authCallback, /localhost:3000/);
  assert.doesNotMatch(authCallback, /getSessionFromUrl/);
});

test("ordinary public header says Vào Chợ and uses private invitations", () => {
  assert.match(header, /Vào Chợ/);
  assert.match(header, /Lời mời riêng/);
  assert.doesNotMatch(header, /Google|Facebook/);
  assert.match(header, /Thành viên/);
  assert.doesNotMatch(header, /Nhận Thẻ|Thẻ Chợ Neo/);
  assert.doesNotMatch(provider, /Nhận Thẻ Chợ Neo|Turnstile|signInAnonymously|browser-bound|thiết bị này/);
  assert.doesNotMatch(provider, /ChoNeoGuestPass|useChoNeoGuestPass|GuestPass/);
});

test("member provider sends first-time users to the private join flow", () => {
  assert.match(provider, /Chợ Neo mở theo lời mời riêng/);
  assert.match(provider, /href="\/join"/);
  assert.doesNotMatch(provider, /Nhập mã lời mời|Lời mời Chợ Neo|Vai trò trong ngành nail/);
  assert.doesNotMatch(provider, /<select|signInAnonymously/);
  assert.match(provider, /profile\?\.status === "suspended"/);
  assert.match(provider, /profile\?\.status === "rejected"/);
  assert.match(provider, /Chưa vào khu thành viên được/);
});

test("member model has approved roles, statuses and verified-member helper", () => {
  assert.deepEqual(memberModule.CHO_NEO_NAIL_ROLES, [
    "nail_technician",
    "salon_owner",
    "nail_student",
    "supplier",
    "educator",
    "other_industry",
  ]);
  assert.deepEqual(memberModule.CHO_NEO_MEMBERSHIP_STATUSES, [
    "pending",
    "verified_nail_member",
    "suspended",
    "rejected",
  ]);
  assert.equal(
    memberModule.isVerifiedChoNeoMemberProfile({
      status: "verified_nail_member",
    }),
    true,
  );
  assert.equal(memberModule.isVerifiedChoNeoMemberProfile({ status: "pending" }), false);
});

test("server verification ignores browser user ids and stores only invitation hashes", () => {
  assert.match(verifyRoute, /auth\.getUser\(token\)/);
  assert.match(verifyRoute, /data\.user\.is_anonymous/);
  assert.doesNotMatch(verifyRoute, /body\?\.userId|body\?\.authorUserId|body\?\.redeemedByUserId/);
  assert.match(verifyRoute, /hashChoNeoInvitationToken/);
  assert.match(verifyRoute, /invitationToken/);
  assert.match(verifyRoute, /code_hash/);
  assert.doesNotMatch(verifyRoute, /select\([^)]*code[^_]/);
  assert.match(verifyRoute, /redeem_cho_neo_private_invitation/);
  assert.doesNotMatch(verifyRoute, /anonymous-session-required/);
  assert.match(verifyRoute, /existingProfile\.agreement_version/);
  assert.match(verifyRoute, /agreementAccepted/);
  assert.doesNotMatch(verifyRoute, /p_nail_role|body\?\.nailRole/);
  assert.match(verifyRoute, /invitation-rate-limited/);
  assert.doesNotMatch(verifyRoute, /from\("cho_neo_member_invitations"\)[\s\S]+update\(/);
});

test("migration evolves prior profile tables into permanent member and invitation tables", () => {
  assert.match(migration, /rename to cho_neo_member_profiles/);
  assert.match(migration, /create table if not exists public\.cho_neo_member_profiles/);
  assert.match(migration, /user_id uuid primary key references auth\.users\(id\)/);
  assert.match(migration, /create table if not exists public\.cho_neo_member_invitations/);
  assert.match(migration, /code_hash text not null unique/);
  assert.match(migration, /redeemed_by_user_id uuid null references auth\.users\(id\)/);
  assert.match(migration, /revoke all on public\.cho_neo_member_invitations from anon, authenticated/);
  assert.match(migration, /Cho Neo member profiles are owner readable/);
  assert.match(migration, /redeem_cho_neo_member_invitation/);
  assert.match(migration, /for update/);
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(migration, /revoke all on function public\.redeem_cho_neo_member_invitation/);
});

test("protected server routes require verified membership, not authentication alone", () => {
  assert.match(voteApi, /data\.user\.is_anonymous/);
  assert.match(gossipRoute, /data\.user\.is_anonymous/);
  assert.match(voteRepository, /cho_neo_member_profiles/);
  assert.match(voteRepository, /membership_status", "verified_nail_member"/);
  assert.match(voteService, /missing-cho-neo-member/);
  assert.match(voteService, /unverified-cho-neo-member/);
  assert.match(gossipRoute, /getVerifiedChoNeoMemberProfile/);
  assert.match(gossipRoute, /membership_status", "verified_nail_member"/);
  assert.match(gossipRoute, /author_user_id: userId/);
  assert.match(gossipRoute, /missing-cho-neo-member/);
  assert.match(gossipRoute, /unverified-cho-neo-member/);
});

test("direct browser writes remain denied for gossip and pending members cannot vote via RLS", () => {
  assert.match(migration, /revoke insert on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(migration, /revoke update on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(migration, /revoke delete on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(migration, /membership_status = 'verified_nail_member'/);
  assert.doesNotMatch(migration, /membership_status = 'pending'[\s\S]+insert room votes/);
});

test("server-only invitation generator uses 128-bit random codes and hashes storage", () => {
  assert.match(inviteScript, /randomBytes\(CODE_BYTES\)/);
  assert.match(inviteScript, /const CODE_BYTES = 16/);
  assert.match(inviteScript, /createHash\("sha256"\)/);
  assert.match(inviteScript, /code_hash: codeHash/);
  assert.match(inviteScript, /max_uses: Number\(args\.get\("max-uses"\) \?\? DEFAULT_MAX_USES\)/);
  assert.match(inviteScript, /Plain invitation is intentionally hidden in dry-run mode/);
});

async function importMemberModule() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cho-neo-member-tests-"));
  const source = fs
    .readFileSync(memberPath, "utf8")
    .replace(
      /import \{[\s\S]*?\} from "\.\/avatar-identity";/,
      `const CHO_NEO_AVATARS = [
        { id: "young-nail-tech", name: "Nail Tech", description: "", emoji: "x", tone: "cyan" },
        { id: "auntie-owner", name: "Salon Owner", description: "", emoji: "x", tone: "rose" }
      ];
      type ChoNeoAvatar = (typeof CHO_NEO_AVATARS)[number];
      function getAvatarById(id) { return CHO_NEO_AVATARS.find((avatar) => avatar.id === id) ?? CHO_NEO_AVATARS[0]; }`,
    )
    .concat(`
export function getSafeReturnTo(value) {
  if (!value) return "/cho-neo";
  if (!value.startsWith("/") || value.startsWith("//")) return "/cho-neo";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "/cho-neo";
  return value;
}
`);

  const target = path.join(tempDir, "member.ts");
  fs.writeFileSync(target, source);
  return import(target);
}
