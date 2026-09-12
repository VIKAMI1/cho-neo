#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260726204500_cho_neo_social_member_login_v1.sql",
);
const repairMigrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260727203000_repair_cho_neo_member_redemption.sql",
);
const upsertFixMigrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260727223000_fix_cho_neo_member_redemption_upsert.sql",
);
const openAIUsageMigrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260730193000_cho_neo_openai_usage_circuit_breaker.sql",
);
const workflowPath = path.join(
  repoRoot,
  ".github/workflows/cho-neo-social-member-db-proof.yml",
);
const verifyRoutePath = path.join(
  repoRoot,
  "src/app/api/cho-neo/member/verify/route.ts",
);
const voteRepositoryPath = path.join(
  repoRoot,
  "src/lib/cho-neo/room-vote-repository.ts",
);
const gossipRoutePath = path.join(
  repoRoot,
  "src/app/api/cho-neo/gossip/front-counter/messages/route.ts",
);
const inviteScriptPath = path.join(
  repoRoot,
  "scripts/create-cho-neo-member-invitation.mjs",
);
const invitationHelperPath = path.join(
  repoRoot,
  "src/lib/cho-neo/member-invitations.ts",
);

const migration = fs.readFileSync(migrationPath, "utf8");
const repairMigration = fs.readFileSync(repairMigrationPath, "utf8");
const upsertFixMigration = fs.readFileSync(upsertFixMigrationPath, "utf8");
const openAIUsageMigration = fs.readFileSync(openAIUsageMigrationPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const verifyRoute = fs.readFileSync(verifyRoutePath, "utf8");
const voteRepository = fs.readFileSync(voteRepositoryPath, "utf8");
const gossipRoute = fs.readFileSync(gossipRoutePath, "utf8");
const inviteScript = fs.readFileSync(inviteScriptPath, "utf8");
const invitationHelper = fs.readFileSync(invitationHelperPath, "utf8");

test("workflow uses the social-member disposable DB proof on the social branch", () => {
  assert.match(workflow, /Chợ Neo Social Member DB Proof/);
  assert.match(workflow, /feat\/cho-neo-social-member-login-v1/);
  assert.match(workflow, /20260726204500_cho_neo_social_member_login_v1\.sql/);
  assert.match(workflow, /node scripts\/test-cho-neo-social-member-migration\.mjs/);
});

test("migration supports fresh schema and prior Guest Pass schema evolution", () => {
  assert.match(migration, /to_regclass\('public\.cho_neo_guest_profiles'\)/);
  assert.match(migration, /rename to cho_neo_member_profiles/);
  assert.match(migration, /create table if not exists public\.cho_neo_member_profiles/);
  assert.match(migration, /create table if not exists public\.cho_neo_member_invitations/);
  assert.match(migration, /membership_status in \(/);
  assert.match(migration, /'pending'/);
  assert.match(migration, /'verified_nail_member'/);
  assert.match(migration, /'suspended'/);
  assert.match(migration, /'rejected'/);
});

test("RLS grants authenticated users owner read only and no direct member writes", () => {
  assert.match(migration, /grant select on public\.cho_neo_member_profiles to authenticated/);
  assert.match(migration, /revoke insert on public\.cho_neo_member_profiles from anon, authenticated/);
  assert.match(migration, /revoke update on public\.cho_neo_member_profiles from anon, authenticated/);
  assert.match(migration, /revoke delete on public\.cho_neo_member_profiles from anon, authenticated/);
  assert.match(migration, /using \(auth\.uid\(\) = user_id\)/);
  assert.match(migration, /revoke all on public\.cho_neo_member_invitations from anon, authenticated/);
});

test("pending, suspended and rejected users cannot gain community write authority", () => {
  assert.match(migration, /membership_status = 'verified_nail_member'/);
  assert.match(migration, /suspended_at is null/);
  assert.doesNotMatch(migration, /membership_status = 'pending'[\s\S]+for insert/);
  assert.doesNotMatch(migration, /membership_status = 'rejected'[\s\S]+for insert/);
  assert.doesNotMatch(migration, /membership_status = 'suspended'[\s\S]+for insert/);
  assert.match(voteRepository, /cho_neo_member_profiles/);
  assert.match(voteRepository, /membership_status", "verified_nail_member"/);
  assert.match(gossipRoute, /getVerifiedChoNeoMemberProfile/);
});

test("invitation redemption is database-atomic and locks the invitation row", () => {
  assert.match(migration, /create or replace function public\.redeem_cho_neo_member_invitation/);
  assert.match(repairMigration, /create or replace function public\.redeem_cho_neo_member_invitation/);
  assert.match(upsertFixMigration, /create or replace function public\.redeem_cho_neo_member_invitation/);
  assert.match(migration, /for update/);
  assert.match(repairMigration, /for update/);
  assert.match(upsertFixMigration, /for update/);
  assert.match(migration, /update public\.cho_neo_member_invitations/);
  assert.match(repairMigration, /update public\.cho_neo_member_invitations/);
  assert.match(upsertFixMigration, /update public\.cho_neo_member_invitations/);
  assert.match(migration, /insert into public\.cho_neo_member_profiles/);
  assert.match(repairMigration, /insert into public\.cho_neo_member_profiles/);
  assert.match(upsertFixMigration, /insert into public\.cho_neo_member_profiles as member/);
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(repairMigration, /on conflict \(user_id\) do update/);
  assert.match(upsertFixMigration, /on conflict \(user_id\) do update/);
  assert.match(migration, /raise exception 'invalid-invitation'/);
  assert.match(migration, /raise exception 'expired-invitation'/);
  assert.match(migration, /raise exception 'revoked-invitation'/);
  assert.match(migration, /raise exception 'used-invitation'/);
  assert.match(repairMigration, /raise exception 'invalid-invitation'/);
  assert.match(repairMigration, /raise exception 'expired-invitation'/);
  assert.match(repairMigration, /raise exception 'revoked-invitation'/);
  assert.match(repairMigration, /raise exception 'used-invitation'/);
  assert.match(repairMigration, /raise exception 'role-mismatch'/);
  assert.match(upsertFixMigration, /raise exception 'invalid-invitation'/);
  assert.match(upsertFixMigration, /raise exception 'expired-invitation'/);
  assert.match(upsertFixMigration, /raise exception 'revoked-invitation'/);
  assert.match(upsertFixMigration, /raise exception 'used-invitation'/);
  assert.match(upsertFixMigration, /raise exception 'role-mismatch'/);
  assert.match(upsertFixMigration, /membership_status not in \('suspended', 'rejected'\)/);
  assert.match(upsertFixMigration, /security definer/);
  assert.match(upsertFixMigration, /set search_path = public/);
});

test("redemption upsert repair uses a target alias inside ON CONFLICT", () => {
  assert.match(
    upsertFixMigration,
    /insert into public\.cho_neo_member_profiles as member \(/,
  );
  assert.match(
    upsertFixMigration,
    /approved_at = coalesce\(member\.approved_at, excluded\.approved_at\)/,
  );
  assert.match(
    upsertFixMigration,
    /where member\.membership_status not in \('suspended', 'rejected'\)/,
  );

  const conflictBlock = upsertFixMigration.match(
    /on conflict \(user_id\) do update([\s\S]*?)return query/,
  )?.[1];
  assert.ok(conflictBlock);
  assert.doesNotMatch(conflictBlock, /public\.cho_neo_member_profiles\./);
  assert.doesNotMatch(conflictBlock, /set\s+public\./i);
});

test("redemption upsert repair keeps successful and blocked redemption outcomes", () => {
  assert.match(upsertFixMigration, /'verified_nail_member'/);
  assert.match(upsertFixMigration, /status = case/);
  assert.match(upsertFixMigration, /then 'redeemed'/);
  assert.match(upsertFixMigration, /use_count = invitation_row\.use_count \+ 1/);
  assert.match(upsertFixMigration, /redeemed_by_user_id = p_user_id/);
  assert.match(upsertFixMigration, /where code_hash = p_code_hash/);
  assert.match(upsertFixMigration, /invitation_row\.intended_role <> p_nail_role/);
  assert.match(upsertFixMigration, /invitation_row\.expires_at <= now_value/);
  assert.match(upsertFixMigration, /invitation_row\.status = 'revoked'/);
  assert.match(upsertFixMigration, /invitation_row\.status <> 'issued'/);
  assert.match(upsertFixMigration, /invitation_row\.use_count >= invitation_row\.max_uses/);
  assert.match(upsertFixMigration, /return query/);
  assert.match(upsertFixMigration, /profile\.membership_status = 'verified_nail_member'/);
  assert.match(upsertFixMigration, /revoke all on function public\.redeem_cho_neo_member_invitation/);
  assert.match(upsertFixMigration, /from anon, authenticated/);
  assert.match(upsertFixMigration, /select pg_notify\('pgrst', 'reload schema'\)/);
});

test("repair migration removes legacy Guest Pass profile requirements", () => {
  assert.match(repairMigration, /column_name = 'status'/);
  assert.match(repairMigration, /set membership_status = case/);
  assert.match(repairMigration, /drop constraint if exists cho_neo_guest_profiles_status_check/);
  assert.match(repairMigration, /drop constraint if exists cho_neo_guest_profiles_avatar_key_check/);
  assert.match(repairMigration, /drop trigger if exists set_cho_neo_guest_profiles_updated_at/);
  assert.match(repairMigration, /drop function if exists public\.set_cho_neo_guest_profiles_updated_at\(\)/);
  assert.match(repairMigration, /drop index if exists public\.cho_neo_guest_profiles_status_idx/);
  assert.match(repairMigration, /drop column if exists status/);
  const insertColumns = repairMigration.match(
    /insert into public\.cho_neo_member_profiles \(([\s\S]*?)\)\s+values/,
  )?.[1];
  assert.ok(insertColumns);
  assert.doesNotMatch(insertColumns, /(^|,)\s*status\s*(,|$)/m);
  assert.match(repairMigration, /select pg_notify\('pgrst', 'reload schema'\)/);
});

test("controlled routes derive identity from the authenticated Supabase session", () => {
  assert.match(verifyRoute, /auth\.getUser\(token\)/);
  assert.match(verifyRoute, /data\.user\.is_anonymous/);
  assert.match(verifyRoute, /p_user_id: authenticatedUser\.id/);
  assert.doesNotMatch(verifyRoute, /body\?\.userId|body\?\.authorUserId/);
  assert.match(verifyRoute, /enroll_cho_neo_public_adult_trade_member/);
  assert.match(verifyRoute, /p_nail_role: body\.nailRole/);
  assert.doesNotMatch(verifyRoute, /hashChoNeoInvitationToken|invitationToken/);
});

test("direct browser writes remain denied for gossip", () => {
  assert.match(migration, /revoke insert on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(migration, /revoke update on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(migration, /revoke delete on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(repairMigration, /revoke insert on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(repairMigration, /revoke update on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(repairMigration, /revoke delete on public\.cho_neo_gossip_messages from anon, authenticated/);
  assert.match(gossipRoute, /createChoNeoSupabaseServiceClient\(\)/);
  assert.match(gossipRoute, /author_user_id: userId/);
});

test("invitation generator is server-only and does not reveal plain codes in dry run", () => {
  assert.match(inviteScript, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(invitationHelper, /randomBytes\(CODE_BYTES\)/);
  assert.match(invitationHelper, /const CODE_BYTES = 16/);
  assert.match(invitationHelper, /createHash\("sha256"\)/);
  assert.match(inviteScript, /Plain invitation is intentionally hidden in dry-run mode/);
});

test("OpenAI usage circuit breaker migration uses shared locked accounting", () => {
  assert.match(openAIUsageMigration, /create table if not exists public\.cho_neo_openai_usage_windows/);
  assert.match(openAIUsageMigration, /scope_type in \('global_month', 'member_day'\)/);
  assert.match(openAIUsageMigration, /primary key \(scope_type, scope_key, window_start\)/);
  assert.match(openAIUsageMigration, /alter table public\.cho_neo_openai_usage_windows enable row level security/);
  assert.match(openAIUsageMigration, /revoke all on public\.cho_neo_openai_usage_windows from anon, authenticated/);
  assert.match(openAIUsageMigration, /create or replace function public\.reserve_cho_neo_openai_usage/);
  assert.match(openAIUsageMigration, /security definer/);
  assert.match(openAIUsageMigration, /set search_path = public/);
  assert.match(openAIUsageMigration, /for update/g);
  assert.match(openAIUsageMigration, /global_row\.request_count >= p_monthly_request_limit/);
  assert.match(openAIUsageMigration, /member_row\.request_count >= p_daily_member_request_limit/);
  assert.match(openAIUsageMigration, /request_count = request_count \+ 1/);
  assert.match(openAIUsageMigration, /estimated_token_count = estimated_token_count \+ safe_estimated_tokens/);
  assert.match(openAIUsageMigration, /'global-limit'/);
  assert.match(openAIUsageMigration, /'member-limit'/);
  assert.match(openAIUsageMigration, /revoke all on function public\.reserve_cho_neo_openai_usage/);
  assert.match(openAIUsageMigration, /select pg_notify\('pgrst', 'reload schema'\)/);
});
