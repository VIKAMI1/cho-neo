#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import ts from "typescript";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const routePath = path.join(root, "src/app/api/cho-neo/tim-ban-trong-nghe/route.ts");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cho-neo-matching-safety-"));
const source = fs.readFileSync(routePath, "utf8");

const testRouteSource = source
  .replace(
    'import { NextResponse } from "next/server";',
    `class NextResponse extends Response {
  static json(body, init) {
    return new NextResponse(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
  }
}`,
  )
  .replace(
    /import \{[\s\S]*?\} from "@\/lib\/cho-neo\/matching";/,
    `const CHO_NEO_CONTACT_HANDOFF_TABLE = "cho_neo_contact_handoffs";
const CHO_NEO_CONTACT_METHODS = ["zalo", "instagram", "facebook", "email", "other"];
const CHO_NEO_INTRODUCTION_TABLE = "cho_neo_introductions";
const CHO_NEO_MATCHING_BLOCK_TABLE = "cho_neo_matching_blocks";
const CHO_NEO_MATCHING_CONSENT_VERSION = "test-consent";
const CHO_NEO_MATCHING_PROFILE_TABLE = "cho_neo_matching_profiles";
const CHO_NEO_MATCHING_REPORT_TABLE = "cho_neo_matching_reports";
const CHO_NEO_PRIVATE_MESSAGE_TABLE = "cho_neo_private_messages";
const CHO_NEO_TABLE_QUIET_DAYS = 7;
const cleanMatchingText = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";
const isMatchingReportReason = (value) => ["sales", "recruiting", "harassment", "unsafe", "other"].includes(value);
const validatePrivateMessage = (value) => {
  const body = cleanMatchingText(value, 500);
  return body ? { body } : { error: "message-required" };
};
const validateMatchingProfile = () => ({ error: "not exercised" });`,
  )
  .replace(
    'import { createMatchingServiceClient, getMatchingUser, isUuid } from "@/lib/cho-neo/matching-server";',
    `const mock = globalThis.__choNeoMatchingSafetyMock;
const getMatchingUser = async () => mock.user && !mock.user.is_anonymous ? mock.user : null;
const createMatchingServiceClient = () => mock.client;
const isUuid = (value) => typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);`,
  )
  .replace('import { CHO_NEO_MEMBER_PROFILE_TABLE } from "@/lib/cho-neo/member-identity";', 'const CHO_NEO_MEMBER_PROFILE_TABLE = "cho_neo_member_profiles";')
  .replace('import { draftMatchingProfile } from "@/lib/cho-neo/matching-profile-ai";', 'const draftMatchingProfile = async () => ({ error: "not exercised" });');

const compiled = ts.transpileModule(testRouteSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testRoutePath = path.join(tempDir, "route.mjs");
fs.writeFileSync(testRoutePath, compiled);

const adminSource = fs.readFileSync(path.join(root, "src/lib/cho-neo/invitation-admin.ts"), "utf8");
const testAdminSource = adminSource
  .replace('import "server-only";', "")
  .replace('import { createClient } from "@supabase/supabase-js";', 'const createClient = () => null;')
  .replace('import { createServerSupabase } from "@/lib/supabase-server";', 'const createServerSupabase = async () => globalThis.__choNeoAdminSafetyMock.supabase;')
  .replace('import { CHO_NEO_MEMBER_PROFILE_TABLE } from "@/lib/cho-neo/member-identity";', 'const CHO_NEO_MEMBER_PROFILE_TABLE = "cho_neo_member_profiles";');
const compiledAdmin = ts.transpileModule(testAdminSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testAdminPath = path.join(tempDir, "invitation-admin.mjs");
fs.writeFileSync(testAdminPath, compiledAdmin);

class Query {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.filters = [];
    this.limitCount = null;
    this.mutation = null;
    this.head = false;
  }

  select(columns, options = {}) { this.columns = columns; this.head = options.head === true; return this; }
  eq(column, value) { this.filters.push((row) => row[column] === value); return this; }
  neq(column, value) { this.filters.push((row) => row[column] !== value); return this; }
  gte(column, value) { this.filters.push((row) => String(row[column]) >= String(value)); return this; }
  is(column, value) { this.filters.push((row) => row[column] === value); return this; }
  in(column, values) { this.filters.push((row) => values.includes(row[column])); return this; }
  order(column, options = {}) {
    this.sort = (a, b) => String(a[column]).localeCompare(String(b[column])) * (options.ascending === false ? -1 : 1);
    return this;
  }
  limit(value) { this.limitCount = value; return this; }
  insert(payload) {
    const error = this.db.__errorForQuery?.({ columns: null, head: false, operation: "insert", table: this.table });
    if (error) return Promise.resolve({ error });
    this.db[this.table].push(payload);
    return Promise.resolve({ error: null });
  }
  upsert(payload) {
    const error = this.db.__errorForQuery?.({ columns: null, head: false, operation: "upsert", table: this.table });
    if (error) return Promise.resolve({ error });
    const rows = this.db[this.table] ?? (this.db[this.table] = []);
    const existing = this.table === "cho_neo_contact_handoffs"
      ? rows.find((row) => row.introduction_id === payload.introduction_id && row.user_id === payload.user_id)
      : rows.find((row) => row.blocker_user_id === payload.blocker_user_id && row.blocked_user_id === payload.blocked_user_id);
    if (existing) Object.assign(existing, payload);
    else rows.push(payload);
    return Promise.resolve({ error: null });
  }
  or(expression) {
    const pairs = [...expression.matchAll(/and\(blocker_user_id\.eq\.([^,]+),blocked_user_id\.eq\.([^)]+)\)/g)]
      .map((match) => [match[1], match[2]]);
    if (pairs.length) this.filters.push((row) => pairs.some(([blocker, blocked]) => row.blocker_user_id === blocker && row.blocked_user_id === blocked));
    return this;
  }
  update(payload) { this.mutation = { kind: "update", payload }; return this; }
  delete() { this.mutation = { kind: "delete" }; return this; }
  then(resolve, reject) { return Promise.resolve(this.execute()).then(resolve, reject); }
  catch(reject) { return this.then(undefined, reject); }

  maybeSingle() {
    const result = this.execute();
    return Promise.resolve({ data: result.data?.[0] ?? null, error: result.error });
  }

  execute() {
    const error = this.db.__errorForQuery?.({ columns: this.columns, head: this.head, operation: this.mutation?.kind ?? "select", table: this.table });
    if (error) return { data: null, error };
    const rows = this.db[this.table] ?? [];
    const matches = rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.mutation?.kind === "update") {
      for (const row of matches) Object.assign(row, this.mutation.payload);
      return { data: null, error: null };
    }
    if (this.mutation?.kind === "delete") {
      this.db[this.table] = rows.filter((row) => !matches.includes(row));
      return { data: null, error: null };
    }
    if (this.sort) matches.sort(this.sort);
    const limited = this.limitCount === null ? matches : matches.slice(0, this.limitCount);
    return { data: this.head ? null : limited, error: null, count: matches.length };
  }
}

const client = { from: (table) => new Query(globalThis.__choNeoMatchingSafetyMock.db, table) };
const mock = {
  client,
  user: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", is_anonymous: false },
  db: {},
};
globalThis.__choNeoMatchingSafetyMock = mock;
const { GET, POST } = await import(pathToFileURL(testRoutePath).href);

const adminUserId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const adminDb = {
  cho_neo_member_profiles: [{ user_id: adminUserId, membership_status: "verified_nail_member", suspended_at: null }],
};
const adminMock = {
  supabase: {
    auth: { getUser: async () => ({ data: { user: adminMock.user } }) },
    from: (table) => new Query(adminDb, table),
  },
  user: { id: adminUserId, is_anonymous: true },
};
globalThis.__choNeoAdminSafetyMock = adminMock;
const { requireChoNeoInvitationAdmin } = await import(pathToFileURL(testAdminPath).href);

const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const introId = "11111111-1111-4111-8111-111111111111";
const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

function baseDb(intro = {}) {
  return {
    cho_neo_member_profiles: [{ user_id: userA, membership_status: "verified_nail_member", suspended_at: null }],
    cho_neo_matching_profiles: [],
    cho_neo_introductions: [{
      id: introId,
      member_a_user_id: userA,
      member_b_user_id: userB,
      member_a_decision: "accepted",
      member_b_decision: "accepted",
      match_note: "BN ↔ Dev",
      icebreaker: "Xin chào",
      expires_at: future,
      opened_at: future,
      table_last_active_at: future,
      table_closed_at: null,
      created_at: future,
      ...intro,
    }],
    cho_neo_matching_blocks: [],
    cho_neo_matching_reports: [],
    cho_neo_contact_handoffs: [{ introduction_id: introId, user_id: userB, method: "email", contact_value: "dev@example.test" }],
    cho_neo_private_messages: [{ introduction_id: introId, sender_user_id: userB, body: "Xin chào BN", id: "22222222-2222-4222-8222-222222222222", created_at: future }],
  };
}

function request(body) {
  return new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", authorization: `Bearer test-${mock.user.id}` },
  });
}

async function json(response) {
  return { status: response.status, body: await response.json() };
}

function reset({ intro, blocks = [], reports = [], user = { id: userA, is_anonymous: false }, errorForQuery = null } = {}) {
  mock.user = user;
  mock.db = baseDb(intro);
  mock.db.cho_neo_matching_blocks = blocks;
  mock.db.cho_neo_matching_reports = reports;
  mock.db.__errorForQuery = errorForQuery;
}

const originalAdminIds = process.env.CHO_NEO_INVITE_ADMIN_USER_IDS;
test.after(() => {
  fs.rmSync(tempDir, { force: true, recursive: true });
  if (originalAdminIds === undefined) delete process.env.CHO_NEO_INVITE_ADMIN_USER_IDS;
  else process.env.CHO_NEO_INVITE_ADMIN_USER_IDS = originalAdminIds;
});

test("blocked user cannot accept again, read messages, send, or share contact", async () => {
  reset({
    intro: { member_a_decision: "passed" },
    blocks: [{ blocker_user_id: userA, blocked_user_id: userB }],
  });
  const accept = await json(await POST(request({ action: "decide", decision: "accepted", introductionId: introId })));
  assert.equal(accept.status, 403);
  assert.equal(mock.db.cho_neo_introductions[0].member_a_decision, "passed");

  const read = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
  assert.equal(read.status, 200);
  assert.equal(read.body.introductions[0].privateTable, null);
  assert.deepEqual(read.body.introductions[0].contactHandoff, { mine: null, theirs: null });

  const send = await json(await POST(request({ action: "send-message", message: "Không nên gửi", introductionId: introId })));
  assert.equal(send.status, 403);
  const share = await json(await POST(request({ action: "share-contact", method: "email", contactValue: "bn@example.test", introductionId: introId })));
  assert.equal(share.status, 403);
});

test("anonymous users are rejected before verified-member matching access", async () => {
  reset({ user: { id: userA, is_anonymous: true } });
  const response = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: "Bearer anonymous" } })));
  assert.equal(response.status, 401);
});

test("suspended members are rejected even when membership status is verified", async () => {
  reset();
  mock.db.cho_neo_member_profiles[0].suspended_at = new Date().toISOString();
  const response = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
  assert.equal(response.status, 403);
});

test("a rate-limit database error prevents message insertion and returns 503", async () => {
  reset({
    errorForQuery: ({ head, operation, table }) => head && operation === "select" && table === "cho_neo_private_messages" ? { message: "rate limit unavailable" } : null,
  });
  const before = mock.db.cho_neo_private_messages.length;
  const response = await json(await POST(request({ action: "send-message", message: "Không được gửi", introductionId: introId })));
  assert.equal(response.status, 503);
  assert.equal(mock.db.cho_neo_private_messages.length, before);
});

test("a counterpart database error returns 503", async () => {
  reset({
    errorForQuery: ({ columns, table }) => table === "cho_neo_member_profiles" && String(columns).includes("display_name") ? { message: "counterpart unavailable" } : null,
  });
  const response = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
  assert.equal(response.status, 503);
});

test("a private-message database error returns 503", async () => {
  reset({
    errorForQuery: ({ columns, head, table }) => table === "cho_neo_private_messages" && !head && String(columns).includes("sender_user_id") ? { message: "message history unavailable" } : null,
  });
  const response = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
  assert.equal(response.status, 503);
});

test("a contact-handoff database error returns 503", async () => {
  reset({
    errorForQuery: ({ table }) => table === "cho_neo_contact_handoffs" ? { message: "contact handoff unavailable" } : null,
  });
  const response = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
  assert.equal(response.status, 503);
});

test("a report succeeds only after message evidence is loaded", async () => {
  reset();
  const response = await json(await POST(request({ action: "report", reason: "unsafe", introductionId: introId })));
  assert.equal(response.status, 200);
  assert.equal(mock.db.cho_neo_contact_handoffs.length, 0);
  assert.deepEqual(mock.db.cho_neo_matching_reports[0].message_evidence, [
    { introduction_id: introId, sender_user_id: userB, body: "Xin chào BN", id: "22222222-2222-4222-8222-222222222222", created_at: future },
  ]);
});

test("closing a table removes its contact handoffs immediately", async () => {
  reset();
  const response = await json(await POST(request({ action: "close-table", introductionId: introId })));
  assert.equal(response.status, 200);
  assert.equal(mock.db.cho_neo_contact_handoffs.length, 0);
});

test("passing after contact sharing removes both participants' handoffs", async () => {
  reset();
  const share = await json(await POST(request({ action: "share-contact", method: "email", contactValue: "bn@example.test", introductionId: introId })));
  assert.equal(share.status, 200);
  assert.equal(mock.db.cho_neo_contact_handoffs.length, 2);
  const response = await json(await POST(request({ action: "decide", decision: "passed", introductionId: introId })));
  assert.equal(response.status, 200);
  assert.equal(mock.db.cho_neo_introductions[0].member_a_decision, "passed");
  assert.equal(mock.db.cho_neo_contact_handoffs.length, 0);
});

test("passing fails closed when contact deletion fails", async () => {
  reset({
    errorForQuery: ({ operation, table }) => operation === "delete" && table === "cho_neo_contact_handoffs" ? { message: "contact deletion unavailable" } : null,
  });
  mock.db.cho_neo_contact_handoffs.push({ introduction_id: introId, user_id: userA, method: "email", contact_value: "bn@example.test" });
  const response = await json(await POST(request({ action: "decide", decision: "passed", introductionId: introId })));
  assert.equal(response.status, 503);
  assert.notEqual(response.body.ok, true);
  assert.equal(mock.db.cho_neo_contact_handoffs.length, 2);
});

test("a report evidence database error returns 503 without creating a report", async () => {
  reset({
    errorForQuery: ({ head, operation, table }) => !head && operation === "select" && table === "cho_neo_private_messages" ? { message: "evidence unavailable" } : null,
  });
  const reportsBefore = mock.db.cho_neo_matching_reports.length;
  const blocksBefore = mock.db.cho_neo_matching_blocks.length;
  const response = await json(await POST(request({ action: "report", reason: "unsafe", introductionId: introId })));
  assert.equal(response.status, 503);
  assert.equal(mock.db.cho_neo_matching_reports.length, reportsBefore);
  assert.equal(mock.db.cho_neo_matching_blocks.length, blocksBefore);
});

test("an anonymous administrator is rejected even when allowlisted", async () => {
  process.env.CHO_NEO_INVITE_ADMIN_USER_IDS = adminUserId;
  adminMock.user = { id: adminUserId, is_anonymous: true };
  const authorization = await requireChoNeoInvitationAdmin();
  assert.deepEqual(authorization, {
    message: "Sign in with the owner account to manage invitations.",
    ok: false,
    reason: "unauthenticated",
  });
});

test("a suspended allowlisted administrator is rejected", async () => {
  process.env.CHO_NEO_INVITE_ADMIN_USER_IDS = adminUserId;
  adminMock.user = { id: adminUserId, is_anonymous: false };
  adminDb.cho_neo_member_profiles[0].suspended_at = new Date().toISOString();
  const authorization = await requireChoNeoInvitationAdmin();
  assert.equal(authorization.ok, false);
  assert.equal(authorization.reason, "forbidden");
});

test("an administrator eligibility database error is rejected", async () => {
  process.env.CHO_NEO_INVITE_ADMIN_USER_IDS = adminUserId;
  adminMock.user = { id: adminUserId, is_anonymous: false };
  adminDb.cho_neo_member_profiles[0].suspended_at = null;
  adminDb.__errorForQuery = () => ({ message: "admin eligibility unavailable" });
  const authorization = await requireChoNeoInvitationAdmin();
  assert.equal(authorization.ok, false);
  assert.equal(authorization.reason, "forbidden");
  delete adminDb.__errorForQuery;
});

test("a real allowlisted administrator remains authorized", async () => {
  process.env.CHO_NEO_INVITE_ADMIN_USER_IDS = adminUserId;
  adminMock.user = { id: adminUserId, is_anonymous: false };
  adminDb.cho_neo_member_profiles[0].suspended_at = null;
  assert.deepEqual(await requireChoNeoInvitationAdmin(), { ok: true, userId: adminUserId });
});

test("closed, expired, and reported introductions return no private history or contacts", async () => {
  for (const scenario of [
    { intro: { table_closed_at: past } },
    { intro: { expires_at: past } },
    { reports: [{ introduction_id: introId, reporter_user_id: userA, reported_user_id: userB }] },
  ]) {
    reset(scenario);
    const response = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
    assert.equal(response.status, 200);
    assert.equal(response.body.introductions[0].privateTable, null);
    assert.deepEqual(response.body.introductions[0].contactHandoff, { mine: null, theirs: null });
  }
});

test("passed introductions return no private history or contacts", async () => {
  reset({ intro: { member_a_decision: "passed" } });
  mock.db.cho_neo_contact_handoffs = [
    { introduction_id: introId, user_id: userA, method: "email", contact_value: "bn@example.test" },
    { introduction_id: introId, user_id: userB, method: "email", contact_value: "dev@example.test" },
  ];
  const response = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
  assert.equal(response.status, 200);
  assert.equal(response.body.introductions[0].state, "closed");
  assert.equal(response.body.introductions[0].privateTable, null);
  assert.deepEqual(response.body.introductions[0].contactHandoff, { mine: null, theirs: null });
});

test("normal BN to Dev mutual messaging remains readable and writable", async () => {
  reset();
  const read = await json(await GET(new Request("http://localhost/api/cho-neo/tim-ban-trong-nghe", { headers: { authorization: `Bearer test-${userA}` } })));
  assert.equal(read.status, 200);
  assert.equal(read.body.introductions[0].state, "mutual");
  assert.equal(read.body.introductions[0].privateTable.messages[0].body, "Xin chào BN");

  const send = await json(await POST(request({ action: "send-message", message: "Dev ơi, chào bạn!", introductionId: introId })));
  assert.equal(send.status, 200);
  assert.equal(mock.db.cho_neo_private_messages.at(-1).sender_user_id, userA);
  assert.equal(mock.db.cho_neo_private_messages.at(-1).body, "Dev ơi, chào bạn!");
});
