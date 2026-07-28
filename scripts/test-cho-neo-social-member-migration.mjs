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

const migration = fs.readFileSync(migrationPath, "utf8");
const repairMigration = fs.readFileSync(repairMigrationPath, "utf8");
const workflow = fs.readFileSync(workflowPath, "utf8");
const verifyRoute = fs.readFileSync(verifyRoutePath, "utf8");
const voteRepository = fs.readFileSync(voteRepositoryPath, "utf8");
const gossipRoute = fs.readFileSync(gossipRoutePath, "utf8");
const inviteScript = fs.readFileSync(inviteScriptPath, "utf8");

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
  assert.match(migration, /for update/);
  assert.match(repairMigration, /for update/);
  assert.match(migration, /update public\.cho_neo_member_invitations/);
  assert.match(repairMigration, /update public\.cho_neo_member_invitations/);
  assert.match(migration, /insert into public\.cho_neo_member_profiles/);
  assert.match(repairMigration, /insert into public\.cho_neo_member_profiles/);
  assert.match(migration, /on conflict \(user_id\) do update/);
  assert.match(repairMigration, /on conflict \(user_id\) do update/);
  assert.match(migration, /raise exception 'invalid-invitation'/);
  assert.match(migration, /raise exception 'expired-invitation'/);
  assert.match(migration, /raise exception 'revoked-invitation'/);
  assert.match(migration, /raise exception 'used-invitation'/);
  assert.match(repairMigration, /raise exception 'invalid-invitation'/);
  assert.match(repairMigration, /raise exception 'expired-invitation'/);
  assert.match(repairMigration, /raise exception 'revoked-invitation'/);
  assert.match(repairMigration, /raise exception 'used-invitation'/);
  assert.match(repairMigration, /raise exception 'role-mismatch'/);
  assert.match(repairMigration, /membership_status <> 'suspended'/);
  assert.match(repairMigration, /membership_status <> 'rejected'/);
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

test("controlled routes derive identity from the verified Supabase session", () => {
  assert.match(verifyRoute, /auth\.getUser\(token\)/);
  assert.match(verifyRoute, /data\.user\.is_anonymous/);
  assert.match(verifyRoute, /p_user_id: userId/);
  assert.doesNotMatch(verifyRoute, /body\?\.userId|body\?\.authorUserId/);
  assert.match(verifyRoute, /invitation-rate-limited/);
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
  assert.match(inviteScript, /randomBytes\(CODE_BYTES\)/);
  assert.match(inviteScript, /const CODE_BYTES = 16/);
  assert.match(inviteScript, /createHash\("sha256"\)/);
  assert.match(inviteScript, /Plain invitation is intentionally hidden in dry-run mode/);
});
