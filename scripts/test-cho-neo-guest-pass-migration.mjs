#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const pollKey = "cho-neo-room-vote-v1";
const gossipRoomId = "front-counter";
const migrationPath =
  "supabase/migrations/20260726185000_cho_neo_guest_pass_v1.sql and supabase/migrations/20260726193000_harden_cho_neo_gossip_writes.sql";

const env = process.env;
const lifecycle = {
  apply: "",
  cleanup: "",
  inspect: "",
  reapply: "",
};
const policyAudit = [];
const actorProof = [];
const require = createRequire(import.meta.url);
const { repository, service } = await importRoomVoteApplicationModules();

function runSupabase(args) {
  return execFileSync("supabase", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function runSupabaseQuiet(args) {
  try {
    return runSupabase(args);
  } catch (error) {
    const message = [
      error.stdout?.toString() ?? "",
      error.stderr?.toString() ?? "",
    ]
      .join("\n")
      .trim();
    throw new Error(message || error.message);
  }
}

function runPsql(dbUrl, sql) {
  try {
    return execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-c", sql], {
      cwd: process.cwd(),
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const message = [
      error.stdout?.toString() ?? "",
      error.stderr?.toString() ?? "",
    ]
      .join("\n")
      .replaceAll(dbUrl, "[local-db-url]")
      .trim();
    throw new Error(message || "psql command failed");
  }
}

function getLocalEnv() {
  const output = runSupabaseQuiet(["status", "-o", "env"]);
  return Object.fromEntries(
    output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.includes("="))
      .map((line) => {
        const [key, ...value] = line.split("=");
        return [key, value.join("=").replace(/^"|"$/g, "")];
      }),
  );
}

function localClient(url, key, token) {
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : undefined,
  });
}

async function createAnonymousActor(apiUrl, anonKey) {
  const client = localClient(apiUrl, anonKey);
  const result = await client.auth.signInAnonymously();
  assert.equal(result.error, null);
  assert.ok(result.data.session?.access_token);
  assert.ok(result.data.session.user?.id);

  return {
    client: localClient(apiUrl, anonKey, result.data.session.access_token),
    token: result.data.session.access_token,
    userId: result.data.session.user.id,
  };
}

async function createPermanentActor(apiUrl, anonKey, serviceClient) {
  const email = `cho-neo-permanent-${Date.now()}@example.test`;
  const password = "local-test-password-123456";
  const created = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true,
    password,
  });
  assert.equal(created.error, null);
  assert.ok(created.data.user?.id);

  const signedIn = await localClient(apiUrl, anonKey).auth.signInWithPassword({
    email,
    password,
  });
  assert.equal(signedIn.error, null);
  assert.ok(signedIn.data.session?.access_token);

  return {
    client: localClient(apiUrl, anonKey, signedIn.data.session.access_token),
    token: signedIn.data.session.access_token,
    userId: signedIn.data.session.user.id,
  };
}

async function insertOwnProfile(actor, displayName) {
  const result = await actor.client.from("cho_neo_guest_profiles").insert({
    avatar_key: "young-nail-tech",
    display_name: displayName,
    normalized_display_name: displayName.toLowerCase(),
    status: "active",
    user_id: actor.userId,
  });
  assert.equal(result.error, null);
}

async function countRows(serviceClient, table, filters = {}) {
  let query = serviceClient.from(table).select("*", {
    count: "exact",
    head: true,
  });
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  const result = await query;
  assert.equal(result.error, null);
  return result.count ?? 0;
}

async function actorVote(actor, optionKey, voterUserId = actor.userId) {
  return actor.client.from("cho_neo_room_votes").insert({
    option_key: optionKey,
    optional_reason: null,
    poll_key: pollKey,
    voter_user_id: voterUserId,
  });
}

async function actorGossipInsert(actor, text = "Một câu thử direct insert") {
  return actor.client.from("cho_neo_gossip_messages").insert({
    author_user_id: actor.userId,
    avatar_id: "front-counter-pro",
    nickname: "Browser",
    reactions: {},
    room_id: gossipRoomId,
    text,
  });
}

async function actorGossipUpdate(actor, messageId) {
  return actor.client
    .from("cho_neo_gossip_messages")
    .update({
      report_count: 99,
      reported_at: new Date().toISOString(),
    })
    .eq("id", messageId);
}

async function actorGossipDelete(actor, messageId) {
  return actor.client
    .from("cho_neo_gossip_messages")
    .delete()
    .eq("id", messageId);
}

function assertDumpContainsRequiredSchema(dump) {
  assert.match(dump, /CREATE TABLE (?:IF NOT EXISTS )?"public"\."cho_neo_guest_profiles"/);
  assert.match(dump, /CREATE TABLE (?:IF NOT EXISTS )?"public"\."cho_neo_room_votes"/);
  assert.match(dump, /CREATE TABLE (?:IF NOT EXISTS )?"public"\."cho_neo_gossip_messages"/);
  assert.match(dump, /"voter_user_id" "uuid"/);
  assert.match(dump, /"author_user_id" "uuid"/);
  assert.match(dump, /cho_neo_room_votes_one_vote_per_user_idx/);
  assert.match(dump, /cho_neo_gossip_messages_author_user_idx/);
  assert.match(dump, /ENABLE ROW LEVEL SECURITY/);
  assert.match(dump, /Cho Neo users can create their own guest profile/);
  assert.match(dump, /Cho Neo visitors can insert room votes/);
  assert.match(dump, /Cho Neo visitors can update their room vote/);
  assert.match(dump, /Cho Neo shared gossip visible messages are readable/);
  assert.doesNotMatch(dump, /Cho Neo gossip messages can be inserted/);
  assert.doesNotMatch(dump, /Cho Neo prototype can insert front counter messages/);
}

function auditDirectWritePolicies(dump) {
  const policies = parsePolicies(dump);
  policyAudit.splice(0, policyAudit.length, ...policies);
  const policyNames = new Set(policies.map((policy) => policy.name));
  assert.ok(policyNames.has("Cho Neo guest profiles are owner readable"));
  assert.ok(policyNames.has("Cho Neo users can create their own guest profile"));
  assert.ok(policyNames.has("Cho Neo users can update their own active guest profile"));
  assert.ok(policyNames.has("Cho Neo visitors can read their own room vote"));
  assert.ok(policyNames.has("Cho Neo visitors can insert room votes"));
  assert.ok(policyNames.has("Cho Neo visitors can update their room vote"));
  assert.ok(policyNames.has("Cho Neo shared gossip visible messages are readable"));

  const allowedDirectWrites = new Set([
    "cho_neo_guest_profiles:INSERT:Cho Neo users can create their own guest profile",
    "cho_neo_guest_profiles:UPDATE:Cho Neo users can update their own active guest profile",
    "cho_neo_room_votes:INSERT:Cho Neo visitors can insert room votes",
    "cho_neo_room_votes:UPDATE:Cho Neo visitors can update their room vote",
  ]);

  const guardedTables = new Set([
    "cho_neo_guest_profiles",
    "cho_neo_room_votes",
    "cho_neo_gossip_messages",
  ]);
  const writeCommands = new Set(["INSERT", "UPDATE", "DELETE"]);
  const visitorRoles = new Set(["anon", "authenticated", "public"]);

  const unexpected = policies.filter((policy) => {
    if (!guardedTables.has(policy.table)) return false;
    if (!writeCommands.has(policy.operation)) return false;
    if (!policy.roles.some((role) => visitorRoles.has(role))) return false;
    return !allowedDirectWrites.has(
      `${policy.table}:${policy.operation}:${policy.name}`,
    );
  });

  assert.deepEqual(
    unexpected.map((policy) => ({
      name: policy.name,
      operation: policy.operation,
      roles: policy.roles,
      table: policy.table,
    })),
    [],
  );
}

function assertGossipPrivilegesRevoked(dbUrl) {
  const output = runPsql(
    dbUrl,
    [
      "select grantee || ':' || privilege_type",
      "from information_schema.role_table_grants",
      "where table_schema = 'public'",
      "and table_name = 'cho_neo_gossip_messages'",
      "and grantee in ('anon', 'authenticated')",
      "order by grantee, privilege_type",
    ].join(" "),
  );
  const grants = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) =>
      /^(anon|authenticated):(SELECT|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER)$/.test(
        line,
      ),
    );

  assert.deepEqual(grants, ["anon:SELECT", "authenticated:SELECT"]);
  actorProof.push(
    "anon/authenticated keep visible SELECT but lose INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER on gossip",
  );
}

function parsePolicies(dump) {
  const policies = [];
  const expression =
    /CREATE POLICY "([^"]+)" ON (?:"public"|public)\.(?:"([a-z0-9_]+)"|([a-z0-9_]+))[\s\S]*?FOR (SELECT|INSERT|UPDATE|DELETE|ALL)(?:\s+TO ([^ \n]+(?:, [^ \n]+)*))?[\s\S]*?;/g;
  let match;

  while ((match = expression.exec(dump))) {
    policies.push({
      name: match[1],
      operation: match[4],
      roles: (match[5] ?? "public")
        .split(",")
        .map((role) => role.trim().replace(/^"|"$/g, ""))
        .filter(Boolean),
      table: match[2] ?? match[3],
    });
  }

  return policies;
}

test("migration lifecycle applies, cleans to version zero, and reapplies", () => {
  const local = getLocalEnv();
  assert.ok(local.DB_URL);

  lifecycle.apply = runSupabaseQuiet(["db", "reset", "--local", "--no-seed"]);
  const appliedDump = runSupabaseQuiet(["db", "dump", "--local", "--schema", "public"]);
  assertDumpContainsRequiredSchema(appliedDump);
  auditDirectWritePolicies(appliedDump);
  assertGossipPrivilegesRevoked(local.DB_URL);
  lifecycle.inspect = "schema dump contains guest profile table, voter_user_id, indexes, RLS, policies";

  runPsql(
    local.DB_URL,
    [
      "drop table if exists public.cho_neo_room_votes cascade",
      "drop table if exists public.cho_neo_guest_profiles cascade",
      "drop table if exists public.cho_neo_gossip_messages cascade",
      "drop function if exists public.set_cho_neo_room_votes_updated_at() cascade",
      "drop function if exists public.set_cho_neo_guest_profiles_updated_at() cascade",
    ].join("; "),
  );
  lifecycle.cleanup = "dropped guest-pass, room-vote, gossip tables and trigger functions";
  const cleanDump = runSupabaseQuiet(["db", "dump", "--local", "--schema", "public"]);
  assert.doesNotMatch(cleanDump, /cho_neo_guest_profiles/);
  assert.doesNotMatch(cleanDump, /cho_neo_room_votes/);
  assert.doesNotMatch(cleanDump, /cho_neo_gossip_messages/);

  lifecycle.reapply = runSupabaseQuiet(["db", "reset", "--local", "--no-seed"]);
  const reappliedDump = runSupabaseQuiet(["db", "dump", "--local", "--schema", "public"]);
  assertDumpContainsRequiredSchema(reappliedDump);
  auditDirectWritePolicies(reappliedDump);
  assertGossipPrivilegesRevoked(local.DB_URL);
});

test("distinct actors obey guest profile and room vote RLS", async () => {
  const local = getLocalEnv();
  const apiUrl = local.API_URL;
  const anonKey = local.ANON_KEY;
  const serviceRoleKey = local.SERVICE_ROLE_KEY;
  assert.ok(apiUrl);
  assert.ok(anonKey);
  assert.ok(serviceRoleKey);

  const publicClient = localClient(apiUrl, anonKey);
  const serviceClient = localClient(apiUrl, serviceRoleKey);
  const userA = await createAnonymousActor(apiUrl, anonKey);
  const userB = await createAnonymousActor(apiUrl, anonKey);
  const permanentUser = await createPermanentActor(apiUrl, anonKey, serviceClient);

  const publicReadVotes = await publicClient
    .from("cho_neo_room_votes")
    .select("option_key");
  assert.equal(publicReadVotes.error, null);
  assert.deepEqual(publicReadVotes.data, []);
  actorProof.push("public visitor can read no direct vote rows before participating");

  const publicProfileInsert = await publicClient
    .from("cho_neo_guest_profiles")
    .insert({
      display_name: "Public Visitor",
      normalized_display_name: "public visitor",
      status: "active",
      user_id: userA.userId,
    });
  assert.notEqual(publicProfileInsert.error, null);
  actorProof.push("public visitor cannot create a guest profile");

  const publicVote = await actorVote(
    { client: publicClient, userId: userA.userId },
    "show-off",
  );
  assert.notEqual(publicVote.error, null);
  actorProof.push("public visitor cannot create a vote");

  const publicGossipInsert = await actorGossipInsert(
    { client: publicClient, userId: userA.userId },
    "Public browser direct insert",
  );
  assert.notEqual(publicGossipInsert.error, null);
  actorProof.push("public visitor cannot insert gossip messages directly");

  await insertOwnProfile(userA, "User A");
  await insertOwnProfile(userB, "User B");
  await insertOwnProfile(permanentUser, "Permanent User");

  const publicReadProfiles = await publicClient
    .from("cho_neo_guest_profiles")
    .select("display_name, avatar_key, status")
    .eq("status", "active");
  assert.equal(publicReadProfiles.error, null);
  assert.deepEqual(publicReadProfiles.data, []);
  actorProof.push("public visitor cannot read direct guest profile rows");

  const aReadsBProfile = await userA.client
    .from("cho_neo_guest_profiles")
    .select("display_name")
    .eq("user_id", userB.userId);
  assert.equal(aReadsBProfile.error, null);
  assert.deepEqual(aReadsBProfile.data, []);
  actorProof.push("anonymous user A cannot read anonymous user B profile");

  const aWritesBProfile = await userA.client
    .from("cho_neo_guest_profiles")
    .insert({
      display_name: "Fake B",
      normalized_display_name: "fake b",
      status: "active",
      user_id: userB.userId,
    });
  assert.notEqual(aWritesBProfile.error, null);
  actorProof.push("anonymous user A cannot create anonymous user B profile");

  const aUpdatesBProfile = await userA.client
    .from("cho_neo_guest_profiles")
    .update({ display_name: "Changed B" })
    .eq("user_id", userB.userId);
  assert.equal(aUpdatesBProfile.error, null);
  const bAfterAUpdate = await serviceClient
    .from("cho_neo_guest_profiles")
    .select("display_name")
    .eq("user_id", userB.userId)
    .single();
  assert.equal(bAfterAUpdate.error, null);
  assert.equal(bAfterAUpdate.data.display_name, "User B");
  actorProof.push("anonymous user A cannot update anonymous user B profile");

  const aDeletesBProfile = await userA.client
    .from("cho_neo_guest_profiles")
    .delete()
    .eq("user_id", userB.userId);
  assert.equal(aDeletesBProfile.error, null);
  assert.equal(
    await countRows(serviceClient, "cho_neo_guest_profiles", {
      user_id: userB.userId,
    }),
    1,
  );
  actorProof.push("anonymous user A cannot delete anonymous user B profile");

  const aOwnVote = await actorVote(userA, "show-off");
  assert.equal(aOwnVote.error, null);
  actorProof.push("anonymous user A can create one own vote with active profile");

  const aDirectGossipInsert = await actorGossipInsert(
    userA,
    "Authenticated browser direct insert",
  );
  assert.notEqual(aDirectGossipInsert.error, null);
  actorProof.push("anonymous authenticated user cannot insert gossip messages directly");

  const serviceGossip = await serviceClient
    .from("cho_neo_gossip_messages")
    .insert({
      author_user_id: userA.userId,
      avatar_id: "front-counter-pro",
      nickname: "Service Fixture",
      reactions: {},
      room_id: gossipRoomId,
      text: "Visible service fixture for direct-write denial.",
    })
    .select("id")
    .single();
  assert.equal(serviceGossip.error, null);

  const publicReadGossip = await publicClient
    .from("cho_neo_gossip_messages")
    .select("id, text")
    .eq("id", serviceGossip.data.id);
  assert.equal(publicReadGossip.error, null);
  assert.equal(publicReadGossip.data.length, 1);
  actorProof.push("public visitor can read visible legacy gossip messages");

  const aDirectGossipUpdate = await actorGossipUpdate(
    userA,
    serviceGossip.data.id,
  );
  assert.notEqual(aDirectGossipUpdate.error, null);
  actorProof.push("anonymous authenticated user cannot update gossip messages directly");

  const aDirectGossipDelete = await actorGossipDelete(
    userA,
    serviceGossip.data.id,
  );
  assert.notEqual(aDirectGossipDelete.error, null);
  actorProof.push("anonymous authenticated user cannot delete gossip messages directly");

  const aVotesAsB = await actorVote(userA, "owner-corner", userB.userId);
  assert.notEqual(aVotesAsB.error, null);
  actorProof.push("anonymous user A cannot vote as anonymous user B");

  await serviceClient
    .from("cho_neo_guest_profiles")
    .update({ status: "banned" })
    .eq("user_id", userB.userId)
    .throwOnError();

  const bannedProfileWrite = await userB.client
    .from("cho_neo_guest_profiles")
    .update({ display_name: "Still B" })
    .eq("user_id", userB.userId);
  assert.equal(bannedProfileWrite.error, null);
  const bAfterBannedUpdate = await serviceClient
    .from("cho_neo_guest_profiles")
    .select("display_name, status")
    .eq("user_id", userB.userId)
    .single();
  assert.equal(bAfterBannedUpdate.error, null);
  assert.deepEqual(bAfterBannedUpdate.data, {
    display_name: "User B",
    status: "banned",
  });
  actorProof.push("inactive/banned profile cannot be updated by its browser session");

  const bannedVote = await actorVote(userB, "waterfront");
  assert.notEqual(bannedVote.error, null);
  actorProof.push("inactive/banned profile cannot vote");

  const concurrentUser = await createAnonymousActor(apiUrl, anonKey);
  await insertOwnProfile(concurrentUser, "Concurrent User");
  const concurrentResults = await Promise.allSettled([
    actorVote(concurrentUser, "show-off"),
    actorVote(concurrentUser, "owner-corner"),
  ]);
  assert.equal(
    concurrentResults.filter(
      (result) => result.status === "fulfilled" && result.value.error === null,
    ).length,
    1,
  );
  assert.equal(
    await countRows(serviceClient, "cho_neo_room_votes", {
      poll_key: pollKey,
      voter_user_id: concurrentUser.userId,
    }),
    1,
  );
  actorProof.push("one-vote constraint survives concurrent requests");

  const app = service.createRoomVoteApplication({
    hashSecret: serviceRoleKey,
    rateLimit: false,
    repository: new repository.SupabaseRoomVoteRepository(serviceClient),
  });
  const servicePost = await app.post(
    {
      optionKey: "owner-corner",
      pollKey,
      userId: userB.userId,
    },
    userA.userId,
  );
  assert.equal(servicePost.status, 200);
  assert.equal(servicePost.body.selection.optionKey, "owner-corner");
  assert.equal(
    await countRows(serviceClient, "cho_neo_room_votes", {
      poll_key: pollKey,
      voter_user_id: userA.userId,
    }),
    1,
  );
  actorProof.push("service-role application path ignores browser-supplied user IDs");

  const invalidServicePost = await app.post(
    {
      optionKey: "market-street",
      pollKey,
    },
    userA.userId,
  );
  assert.equal(invalidServicePost.status, 400);
  assert.equal(invalidServicePost.body.reason, "invalid-option");
  actorProof.push("service-role application path rejects invalid choices");

  const bannedServicePost = await app.post(
    {
      optionKey: "show-off",
      pollKey,
    },
    userB.userId,
  );
  assert.equal(bannedServicePost.status, 400);
  assert.equal(bannedServicePost.body.reason, "inactive-cho-neo-pass");
  actorProof.push("service-role application path rejects inactive profiles");
});

test("controlled gossip server route owns writes and preserves public reads", async () => {
  const local = getLocalEnv();
  const apiUrl = local.API_URL;
  const anonKey = local.ANON_KEY;
  const serviceRoleKey = local.SERVICE_ROLE_KEY;
  assert.ok(apiUrl);
  assert.ok(anonKey);
  assert.ok(serviceRoleKey);

  process.env.NEXT_PUBLIC_SUPABASE_URL = apiUrl;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey;
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;
  delete process.env.CHO_NEO_GOSSIP_POSTING_DISABLED;

  const serviceClient = localClient(apiUrl, serviceRoleKey);
  const userA = await createAnonymousActor(apiUrl, anonKey);
  const userB = await createAnonymousActor(apiUrl, anonKey);
  await insertOwnProfile(userA, "Gossip User A");
  await insertOwnProfile(userB, "Gossip User B");

  const { GET, PATCH, POST } = await importGossipRoute();

  const noPassResponse = await POST(gossipRequest({
    text: "Xin góp chuyện không có thẻ.",
  }));
  assert.equal(noPassResponse.status, 401);
  const noPassBody = await noPassResponse.json();
  assert.equal(noPassBody.reason, "missing-cho-neo-pass");
  actorProof.push("gossip server route gates visitors without a Cho Neo pass");

  const activeResponse = await POST(gossipRequest(
    {
      author_user_id: userB.userId,
      avatarId: "gossip-auntie",
      nickname: "Browser Supplied Name",
      text: "Một câu góp chuyện qua server route.",
      user_id: userB.userId,
    },
    { Authorization: `Bearer ${userA.token}`, "x-forwarded-for": "203.0.113.41" },
  ));
  assert.equal(activeResponse.status, 201);
  const activeBody = await activeResponse.json();
  assert.equal(activeBody.message.nickname, "Gossip User A");
  assert.equal(activeBody.message.avatarId, "young-nail-tech");

  const saved = await serviceClient
    .from("cho_neo_gossip_messages")
    .select("author_user_id, nickname, avatar_id, room_id, text")
    .eq("id", activeBody.message.id)
    .single();
  assert.equal(saved.error, null);
  assert.deepEqual(saved.data, {
    author_user_id: userA.userId,
    avatar_id: "young-nail-tech",
    nickname: "Gossip User A",
    room_id: gossipRoomId,
    text: "Một câu góp chuyện qua server route.",
  });
  actorProof.push("active Guest Pass user can post gossip through the server route");
  actorProof.push("gossip server route ignores browser-supplied author/user IDs");

  const noPassReportResponse = await PATCH(gossipRequest({
    action: "report",
    messageId: activeBody.message.id,
  }));
  assert.equal(noPassReportResponse.status, 401);
  const noPassReportBody = await noPassReportResponse.json();
  assert.equal(noPassReportBody.reason, "missing-cho-neo-pass");
  actorProof.push("gossip report route gates visitors without a Cho Neo pass");

  const activeReportResponse = await PATCH(gossipRequest(
    {
      action: "report",
      messageId: activeBody.message.id,
      reporter_user_id: userB.userId,
      user_id: userB.userId,
    },
    { Authorization: `Bearer ${userA.token}`, "x-forwarded-for": "203.0.113.43" },
  ));
  assert.equal(activeReportResponse.status, 200);
  const activeReportBody = await activeReportResponse.json();
  assert.equal(activeReportBody.message.reportCount, 1);
  actorProof.push("active Guest Pass user can report gossip through the server route");
  actorProof.push("gossip report route ignores browser-supplied reporter/user IDs");

  const duplicateReportResponse = await PATCH(gossipRequest(
    {
      action: "report",
      messageId: activeBody.message.id,
    },
    { Authorization: `Bearer ${userA.token}`, "x-forwarded-for": "203.0.113.44" },
  ));
  assert.equal(duplicateReportResponse.status, 409);
  const duplicateReportBody = await duplicateReportResponse.json();
  assert.equal(duplicateReportBody.reason, "duplicate-report");
  actorProof.push("gossip report route blocks duplicate reports from the same pass");

  const otherUserReportResponse = await PATCH(gossipRequest(
    {
      action: "report",
      messageId: activeBody.message.id,
    },
    { Authorization: `Bearer ${userB.token}`, "x-forwarded-for": "203.0.113.45" },
  ));
  assert.equal(otherUserReportResponse.status, 200);
  const otherUserReportBody = await otherUserReportResponse.json();
  assert.equal(otherUserReportBody.message.reportCount, 2);
  actorProof.push("a different active Guest Pass can report the same visible message");

  await serviceClient
    .from("cho_neo_guest_profiles")
    .update({ status: "banned" })
    .eq("user_id", userB.userId)
    .throwOnError();

  const bannedResponse = await POST(gossipRequest(
    {
      text: "Banned profile should not post.",
    },
    { Authorization: `Bearer ${userB.token}`, "x-forwarded-for": "203.0.113.42" },
  ));
  assert.equal(bannedResponse.status, 400);
  const bannedBody = await bannedResponse.json();
  assert.equal(bannedBody.reason, "inactive-cho-neo-pass");
  actorProof.push("inactive/banned profile cannot post gossip through the server route");

  const bannedReportResponse = await PATCH(gossipRequest(
    {
      action: "report",
      messageId: activeBody.message.id,
    },
    { Authorization: `Bearer ${userB.token}`, "x-forwarded-for": "203.0.113.46" },
  ));
  assert.equal(bannedReportResponse.status, 400);
  const bannedReportBody = await bannedReportResponse.json();
  assert.equal(bannedReportBody.reason, "inactive-cho-neo-pass");
  actorProof.push("inactive/banned profile cannot report gossip through the server route");

  const legacyInsert = await serviceClient.from("cho_neo_gossip_messages").insert({
    avatar_id: "front-counter-pro",
    nickname: "Legacy Row",
    reactions: {},
    room_id: gossipRoomId,
    text: "Visible legacy row remains readable.",
  });
  assert.equal(legacyInsert.error, null);

  const publicReadResponse = await GET(
    new Request("http://localhost/api/cho-neo/gossip/front-counter/messages"),
  );
  assert.equal(publicReadResponse.status, 200);
  const publicReadBody = await publicReadResponse.json();
  assert.ok(
    publicReadBody.messages.some(
      (message) => message.nickname === "Legacy Row",
    ),
  );
  actorProof.push("legacy visible gossip messages remain publicly readable");
});

function gossipRequest(body, headers = {}) {
  return new Request("http://localhost/api/cho-neo/gossip/front-counter/messages", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "user-agent": "cho-neo-gossip-hardening-test",
      ...headers,
    },
    method: "POST",
  });
}

async function importGossipRoute() {
  const jiti = require("jiti")(path.join(process.cwd(), "scripts/test-cho-neo-guest-pass-migration.mjs"), {
    alias: {
      "@": path.join(process.cwd(), "src"),
    },
  });

  return jiti(
    path.join(
      process.cwd(),
      "src/app/api/cho-neo/gossip/front-counter/messages/route.ts",
    ),
  );
}

async function importRoomVoteApplicationModules() {
  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "cho-neo-room-vote-migration-tests-"),
  );
  const files = [
    "room-vote.ts",
    "room-vote-repository.ts",
    "room-vote-service.ts",
  ];

  for (const file of files) {
    const sourcePath = path.join(process.cwd(), "src/lib/cho-neo", file);
    let source = fs.readFileSync(sourcePath, "utf8");
    source = source
      .replaceAll('from "./room-vote"', 'from "./room-vote.ts"')
      .replaceAll(
        'from "./room-vote-repository"',
        'from "./room-vote-repository.ts"',
      );
    fs.writeFileSync(path.join(tempDir, file), source);
  }

  return {
    repository: await import(path.join(tempDir, "room-vote-repository.ts")),
    service: await import(path.join(tempDir, "room-vote-service.ts")),
  };
}

test("permanent sessions are represented by profiles without anonymous replacement", async () => {
  const provider = await import("node:fs/promises").then((fs) =>
    fs.readFile("src/components/cho-neo/ChoNeoGuestPassProvider.tsx", "utf8"),
  );
  assert.match(provider, /const existingSessionResult = await supabase\.auth\.getSession\(\)/);
  assert.match(provider, /let activeSession = existingSessionResult\.data\.session \?\? null/);
  assert.match(provider, /if \(!activeSession\?\.user\)/);
  assert.match(provider, /signInAnonymously\(\{\s*options: \{ captchaToken \}/s);
});

process.on("exit", () => {
  if (!process.exitCode) {
    console.log(
      JSON.stringify(
        {
          lifecycle: {
            apply: lifecycle.apply.includes("Finished supabase db reset")
              ? "reset applied migrations"
              : "applied",
            cleanup: lifecycle.cleanup.includes("Resetting local database")
              ? "reset to version 0 completed"
              : "cleaned",
            inspect: lifecycle.inspect,
            migration: migrationPath,
            reapply: lifecycle.reapply.includes("Finished supabase migration up")
              ? "reapplied"
              : "reapplied",
          },
          policies: policyAudit.map((policy) => ({
            name: policy.name,
            operation: policy.operation,
            roles: policy.roles,
            table: policy.table,
          })),
          proofs: actorProof,
        },
        null,
        2,
      ),
    );
  }
});
