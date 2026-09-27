#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const migration = read("supabase/migrations/20260920140211_cho_neo_meo_vat_v1.sql");
const feedRoute = read("src/app/api/meo-vat/route.ts");
const detailRoute = read("src/app/api/meo-vat/[id]/route.ts");
const reportRoute = read("src/app/api/meo-vat/[id]/report/route.ts");
const adminRoute = read("src/app/api/cho-neo/admin/meo-vat/route.ts");
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "cho-neo-meo-vat-test-"));
let policy;

for (const file of ["meo-vat.ts", "text-safety.ts"]) {
  let source = read(`src/lib/cho-neo/${file}`);
  if (file === "meo-vat.ts") source = source.replace('from "./text-safety"', 'from "./text-safety.ts"');
  fs.writeFileSync(path.join(temporaryDirectory, file), source);
}
policy = await import(pathToFileURL(path.join(temporaryDirectory, "meo-vat.ts")));

const makeTip = (id, category, title, createdAt, status = "published", authorName = "Mai") => ({
  authorName,
  body: `${title} body`,
  category,
  createdAt,
  id,
  status,
  title,
});

test("the feed supports all four published categories, search, and newest first ordering", () => {
  const tips = [
    makeTip("old", "nail_tips", "Prep nhanh", "2026-09-01T00:00:00Z"),
    makeTip("new", "nail_tips", "Giữ form", "2026-09-03T00:00:00Z"),
    makeTip("business", "salon_business", "Lịch hẹn", "2026-09-02T00:00:00Z"),
    makeTip("product", "products", "Gel bền", "2026-09-04T00:00:00Z"),
    makeTip("life", "vietnamese_life", "Bữa cơm", "2026-09-05T00:00:00Z"),
    makeTip("pending", "nail_tips", "Chưa đăng", "2026-09-06T00:00:00Z", "pending_review"),
  ];

  assert.deepEqual(policy.CHO_NEO_MEO_VAT_CATEGORIES.map((category) => category.id), ["nail_tips", "salon_business", "products", "vietnamese_life"]);
  assert.deepEqual(policy.filterChoNeoMeoVatFeed(tips).map((tip) => tip.id), ["life", "product", "new", "business", "old"]);
  assert.deepEqual(policy.filterChoNeoMeoVatFeed(tips, "nail_tips").map((tip) => tip.id), ["new", "old"]);
  assert.deepEqual(policy.filterChoNeoMeoVatFeed(tips, "all", "gel").map((tip) => tip.id), ["product"]);
  assert.deepEqual(policy.filterChoNeoMeoVatFeed(tips, "all", "", true).map((tip) => tip.id)[0], "pending");
});

test("text validation normalizes content and rejects unsafe markup, links, and excessive length", () => {
  assert.equal(policy.normalizeChoNeoMeoVatText("  Một mẹo\r\n\r\n nhỏ  "), "Một mẹo\n\n nhỏ");
  assert.equal(policy.getChoNeoMeoVatTextError("Mẹo làm móng", 100, "tiêu đề"), null);
  assert.match(policy.getChoNeoMeoVatTextError("https://example.com", 100, "tiêu đề"), /chưa phù hợp/);
  assert.match(policy.getChoNeoMeoVatTextError("<script>", 100, "tiêu đề"), /ký tự/);
  assert.match(policy.getChoNeoMeoVatTextError("x".repeat(101), 100, "tiêu đề"), /tối đa/);
});

test("only the author can edit and published tips can only be reported by another member", () => {
  const tip = { authorUserId: "author-1", status: "published" };
  assert.equal(policy.canEditChoNeoMeoVatTip("author-1", tip), true);
  assert.equal(policy.canEditChoNeoMeoVatTip("member-2", tip), false);
  assert.equal(policy.canEditChoNeoMeoVatTip(null, tip), false);
  assert.equal(policy.canReportChoNeoMeoVatTip("member-2", tip), true);
  assert.equal(policy.canReportChoNeoMeoVatTip("author-1", tip), false);
  assert.equal(policy.canReportChoNeoMeoVatTip("member-2", { ...tip, status: "pending_review" }), false);
});

test("RLS limits writes to active verified owners and protects moderation fields", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /grant insert \(author_user_id, category, title, body\)[\s\S]*to authenticated/i);
  assert.match(migration, /grant update \(category, title, body\)[\s\S]*to authenticated/i);
  assert.match(migration, /author_user_id = \(select auth\.uid\(\)\)[\s\S]*membership_status = 'verified_nail_member'[\s\S]*suspended_at is null/i);
  assert.match(migration, /status = 'pending_review'/i);
  assert.match(migration, /author_user_id = \(select auth\.uid\(\)\)/i);
  assert.match(migration, /reporter_user_id = \(select auth\.uid\(\)\)[\s\S]*tip\.author_user_id <> \(select auth\.uid\(\)\)/i);
  assert.match(migration, /unique \(tip_id, reporter_user_id\)/i);
});

test("server endpoints enforce membership, ownership, report limits, and the existing admin gate", () => {
  assert.match(feedRoute, /getChoNeoMeoVatUserId\(request\)/);
  assert.match(feedRoute, /isVerifiedChoNeoMeoVatMember\(supabase, userId\)/);
  assert.match(feedRoute, /status", "published"/);
  assert.match(detailRoute, /\.eq\("author_user_id", userId\)/);
  assert.match(detailRoute, /status !== "published" && data\.author_user_id !== userId/);
  assert.match(reportRoute, /canReportChoNeoMeoVatTip\(userId/);
  assert.match(reportRoute, /error\?\.code === "23505"/);
  assert.match(adminRoute, /requireChoNeoInvitationAdmin\(\)/);
  assert.match(adminRoute, /tipStatuses/);
});

test("admin moderation queue supports publishing, rejection, hiding, and report resolution", () => {
  assert.match(adminRoute, /set-tip-status/);
  assert.match(adminRoute, /set-report-status/);
  assert.match(adminRoute, /reportStatuses/);
  const client = read("src/app/cho-neo/admin/meo-vat/ChoNeoMeoVatAdminClient.tsx");
  assert.match(client, /"published"/);
  assert.match(client, /"rejected"/);
  assert.match(client, /"hidden"/);
  assert.match(client, /"resolved"/);
});
