#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260817030000_retire_noncanonical_feedback_views.sql",
  ),
  "utf8",
);
const normalized = migration.toLowerCase();
const sql = normalized.replace(/--[^\n]*/g, "").trim();
const statements = sql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

test("retirement drops exactly both noncanonical feedback views with IF EXISTS", () => {
  assert.deepEqual(statements.sort(), [
    "drop view if exists public.cho_neo_feedback_inbox",
    "drop view if exists public.cho_neo_feedback_readable",
  ]);
});

test("retirement contains no table, function, data, ACL, or replacement-view SQL", () => {
  assert.doesNotMatch(normalized, /\b(create|alter|drop)\s+(?:table|function|index|policy)/);
  assert.doesNotMatch(normalized, /\b(?:insert|update|delete|truncate)\b/);
  assert.doesNotMatch(normalized, /\b(?:grant|revoke)\b/);
  assert.doesNotMatch(normalized, /\bcreate\s+(?:or\s+replace\s+)?view\b/);
  assert.doesNotMatch(normalized, /cho_neo_feedback\s+(?:alter|update|delete)/);
});
