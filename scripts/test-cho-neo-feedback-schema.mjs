#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const migration = fs.readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260817024500_canonicalize_cho_neo_feedback.sql",
  ),
  "utf8",
);
const normalized = migration.toLowerCase();

test("canonical table columns, defaults, nullability, and kind constraint are explicit", () => {
  assert.match(normalized, /create table if not exists public\.cho_neo_feedback\s*\(/);

  for (const column of [
    "id uuid primary key default gen_random_uuid()",
    "kind text not null default 'event'",
    "event_name text null",
    "created_at timestamptz not null default now()",
    "page_path text not null",
    "room text null",
    "device_type text null",
    "anonymous_session_id text null",
    "selected_village_mood text null",
    "music_included boolean not null default false",
    "payload jsonb not null default '{}'::jsonb",
  ]) {
    assert.match(normalized, new RegExp(column.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.match(normalized, /page_path is null/);
  assert.match(normalized, /page_path contains null values/);
  assert.match(normalized, /alter column page_path set not null/);
  assert.match(normalized, /alter column kind set default 'event'/);
  assert.match(normalized, /alter column kind set not null/);
  assert.match(normalized, /check \(kind in \('event', 'feedback'\)\)/);
});

test("canonical indexes and RLS are added without dropping legacy indexes", () => {
  assert.match(
    normalized,
    /create index if not exists cho_neo_feedback_kind_created_at_idx\s+on public\.cho_neo_feedback \(kind, created_at desc\)/,
  );
  assert.match(
    normalized,
    /create index if not exists cho_neo_feedback_kind_event_name_created_at_idx\s+on public\.cho_neo_feedback \(kind, event_name, created_at desc\)/,
  );
  assert.match(normalized, /alter table public\.cho_neo_feedback enable row level security/);
  assert.doesNotMatch(normalized, /drop\s+index/);
});

test("table ACL is service_role SELECT and INSERT only with browser access revoked", () => {
  assert.match(normalized, /revoke all privileges on table public\.cho_neo_feedback from public/);
  assert.match(normalized, /revoke all privileges on table public\.cho_neo_feedback from anon, authenticated/);
  assert.match(normalized, /revoke all privileges on table public\.cho_neo_feedback from service_role/);

  const grants = [...normalized.matchAll(/grant\s+([^;]+?)\s+on table public\.cho_neo_feedback\s+to\s+service_role\s*;/g)];
  assert.equal(grants.length, 1, "exactly one service_role table grant should exist");
  assert.equal(grants[0][1].replace(/\s+/g, " ").trim(), "select, insert");
  assert.doesNotMatch(normalized, /grant\s+(?:all|[^;]*(?:update|delete|truncate|references|trigger))/);
});

test("migration is forward-only and preserves data and Preview views", () => {
  assert.doesNotMatch(normalized, /\b(update|delete)\s+(?:from\s+)?public\.cho_neo_feedback\b/);
  assert.doesNotMatch(normalized, /\btruncate\s+(?:table\s+)?public\.cho_neo_feedback\b/);
  assert.doesNotMatch(normalized, /drop\s+view/);
  assert.doesNotMatch(normalized, /cho_neo_feedback_(?:inbox|readable)[\s\S]*drop/);
  assert.match(normalized, /page_path_guard/);
  assert.match(normalized, /no backfill was attempted/);
});
