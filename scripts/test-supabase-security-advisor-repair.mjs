import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/20260811170000_repair_supabase_security_advisor_findings.sql",
);
const migration = readFileSync(migrationPath, "utf8");
const normalized = migration.toLowerCase();
const showOffFeedSource = readFileSync(
  join(process.cwd(), "src/app/show-off/ShowOffFeed.tsx"),
  "utf8",
);

test("security advisor migration closes legacy Xin Xam public table access without deleting data", () => {
  for (const tableName of ["xinxam_sticks", "xinxam_draws"]) {
    assert.match(
      normalized,
      new RegExp(`alter table if exists public\\.${tableName} enable row level security`),
      `${tableName} should have RLS enabled`,
    );
    assert.match(
      normalized,
      new RegExp(`revoke all on table public\\.${tableName} from public`),
      `${tableName} should revoke PUBLIC table access`,
    );
    assert.match(
      normalized,
      new RegExp(`revoke all on table public\\.${tableName} from anon`),
      `${tableName} should revoke anon table access`,
    );
    assert.match(
      normalized,
      new RegExp(`revoke all on table public\\.${tableName} from authenticated`),
      `${tableName} should revoke authenticated table access`,
    );
  }

  assert.doesNotMatch(normalized, /\bdrop\s+table\b/);
  assert.doesNotMatch(normalized, /\bdelete\s+from\b/);
  assert.doesNotMatch(normalized, /\btruncate\b/);
  assert.doesNotMatch(normalized, /\bcreate\s+policy\b.*xinxam_/s);
});

test("security advisor migration removes browser execute grants from legacy draw_xinxam RPC", () => {
  assert.match(normalized, /p\.proname = 'draw_xinxam'/);
  assert.match(normalized, /revoke all on function %s from public/);
  assert.match(normalized, /revoke all on function %s from anon/);
  assert.match(normalized, /revoke all on function %s from authenticated/);
  assert.match(normalized, /grant execute on function %s to service_role/);
});

test("security advisor migration preserves showoff_feed contract with invoker security", () => {
  assert.match(
    normalized,
    /alter view if exists public\.showoff_feed set \(security_invoker = true\)/,
  );

  const showoffAclBlock = normalized.match(
    /alter view if exists public\.showoff_feed set \(security_invoker = true\);[\s\S]*?grant select on table public\.showoff_feed to authenticated;/,
  )?.[0];
  assert.ok(showoffAclBlock, "showoff_feed ACL block should be present");

  assert.match(showoffAclBlock, /revoke all on table public\.showoff_feed from public/);
  assert.match(showoffAclBlock, /revoke all on table public\.showoff_feed from anon/);
  assert.match(showoffAclBlock, /revoke all on table public\.showoff_feed from authenticated/);
  assert.match(showoffAclBlock, /grant select on table public\.showoff_feed to anon/);
  assert.match(showoffAclBlock, /grant select on table public\.showoff_feed to authenticated/);
  assert.doesNotMatch(showoffAclBlock, /grant\s+(insert|update|delete|truncate|trigger|references|all)\b/);

  assert.doesNotMatch(normalized, /\bdrop\s+view\b.*showoff_feed/s);
  assert.doesNotMatch(normalized, /\bcreate\s+or\s+replace\s+view\b.*showoff_feed/s);
});

test("Show-Off code reads from showoff_feed and does not write through the view", () => {
  assert.match(showOffFeedSource, /\.from\("showoff_feed"\)\s*\n\s*\.select\("\*"\)/);
  assert.doesNotMatch(
    showOffFeedSource,
    /\.from\("showoff_feed"\)\s*\n\s*\.(insert|update|delete|upsert)\(/,
  );
});
