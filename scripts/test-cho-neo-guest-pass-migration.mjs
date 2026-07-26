#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";

const pollKey = "cho-neo-room-vote-v1";
const migrationPath =
  "supabase/migrations/20260726185000_cho_neo_guest_pass_v1.sql";

const env = process.env;
const lifecycle = {
  apply: "",
  cleanup: "",
  inspect: "",
  reapply: "",
};
const policyAudit = [];
const actorProof = [];
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
    execFileSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-c", sql], {
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

function assertDumpContainsRequiredSchema(dump) {
  assert.match(dump, /CREATE TABLE (?:IF NOT EXISTS )?"public"\."cho_neo_guest_profiles"/);
  assert.match(dump, /CREATE TABLE (?:IF NOT EXISTS )?"public"\."cho_neo_room_votes"/);
  assert.match(dump, /"voter_user_id" "uuid"/);
  assert.match(dump, /cho_neo_room_votes_one_vote_per_user_idx/);
  assert.match(dump, /ENABLE ROW LEVEL SECURITY/);
  assert.match(dump, /Cho Neo users can create their own guest profile/);
  assert.match(dump, /Cho Neo visitors can insert room votes/);
  assert.match(dump, /Cho Neo visitors can update their room vote/);
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
  lifecycle.inspect = "schema dump contains guest profile table, voter_user_id, indexes, RLS, policies";

  runPsql(
    local.DB_URL,
    [
      "drop table if exists public.cho_neo_room_votes cascade",
      "drop table if exists public.cho_neo_guest_profiles cascade",
      "drop function if exists public.set_cho_neo_room_votes_updated_at() cascade",
      "drop function if exists public.set_cho_neo_guest_profiles_updated_at() cascade",
    ].join("; "),
  );
  lifecycle.cleanup = "dropped guest-pass tables and trigger functions";
  const cleanDump = runSupabaseQuiet(["db", "dump", "--local", "--schema", "public"]);
  assert.doesNotMatch(cleanDump, /cho_neo_guest_profiles/);
  assert.doesNotMatch(cleanDump, /cho_neo_room_votes/);

  lifecycle.reapply = runSupabaseQuiet(["db", "reset", "--local", "--no-seed"]);
  const reappliedDump = runSupabaseQuiet(["db", "dump", "--local", "--schema", "public"]);
  assertDumpContainsRequiredSchema(reappliedDump);
  auditDirectWritePolicies(reappliedDump);
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
