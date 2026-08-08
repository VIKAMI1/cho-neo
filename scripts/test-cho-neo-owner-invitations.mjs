import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildChoNeoPrivateInvitationLink,
  hashChoNeoInvitationCode,
} from "../src/lib/cho-neo/member-invitations.ts";
import {
  buildPrivateInvitationLink,
  hashChoNeoInvitationCode as hashChoNeoInvitationCodeFromScript,
} from "./create-cho-neo-member-invitation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pagePath = path.join(repoRoot, "src/app/cho-neo/admin/invitations/page.tsx");
const actionPath = path.join(repoRoot, "src/app/cho-neo/admin/invitations/actions.ts");
const clientPath = path.join(
  repoRoot,
  "src/app/cho-neo/admin/invitations/InvitationAdminClient.tsx",
);
const rootLayoutPath = path.join(repoRoot, "src/app/layout.tsx");
const browserClientPath = path.join(repoRoot, "src/lib/supabase-browser.ts");
const sessionSyncPath = path.join(repoRoot, "src/components/SessionSync.tsx");
const adminHelperPath = path.join(repoRoot, "src/lib/cho-neo/invitation-admin.ts");
const invitationHelperPath = path.join(repoRoot, "src/lib/cho-neo/member-invitations.ts");
const migrationPath = path.join(
  repoRoot,
  "supabase/migrations/20260808190000_cho_neo_invitation_recipient_metadata.sql",
);
const joinPath = path.join(repoRoot, "src/app/join/JoinClient.tsx");

const page = fs.readFileSync(pagePath, "utf8");
const action = fs.readFileSync(actionPath, "utf8");
const client = fs.readFileSync(clientPath, "utf8");
const rootLayout = fs.readFileSync(rootLayoutPath, "utf8");
const browserClient = fs.readFileSync(browserClientPath, "utf8");
const sessionSync = fs.readFileSync(sessionSyncPath, "utf8");
const adminHelper = fs.readFileSync(adminHelperPath, "utf8");
const invitationHelper = fs.readFileSync(invitationHelperPath, "utf8");
const migration = fs.readFileSync(migrationPath, "utf8");
const join = fs.readFileSync(joinPath, "utf8");

test("owner invitation route uses authenticated user id plus server-only allowlist", () => {
  assert.match(page, /export const runtime = "nodejs"/);
  assert.match(adminHelper, /supabase\.auth\.getUser\(\)/);
  assert.match(adminHelper, /CHO_NEO_INVITE_ADMIN_USER_IDS/);
  assert.match(adminHelper, /user\.id/);
  assert.doesNotMatch(adminHelper, /user_metadata|app_metadata|email/);
  assert.doesNotMatch(client, /CHO_NEO_INVITE_ADMIN_USER_IDS|SUPABASE_SERVICE_ROLE_KEY/);
});

test("owner invitation admin sees the returning-member browser session through SSR cookies", () => {
  assert.match(browserClient, /from "@supabase\/ssr"/);
  assert.match(browserClient, /createBrowserClient\(/);
  assert.match(rootLayout, /import SessionSync from "@\/components\/SessionSync"/);
  assert.match(rootLayout, /<SessionSync \/>/);
  assert.match(sessionSync, /supabase\.auth\.getSession\(\)/);
  assert.match(sessionSync, /router\.refresh\(\)/);
  assert.match(adminHelper, /createServerSupabase\(\)/);
  assert.match(adminHelper, /supabase\.auth\.getUser\(\)/);
});

test("unauthenticated and non-admin users are denied before invitation listing or creation", () => {
  assert.match(adminHelper, /reason: "unauthenticated"/);
  assert.match(adminHelper, /reason: "forbidden"/);
  assert.match(action, /const authorization = await requireChoNeoInvitationAdmin\(\)/);
  assert.match(action, /if \(authorization\.ok === false\)/);
  assert.match(page, /const authorization = await requireChoNeoInvitationAdmin\(\)/);
  assert.match(page, /if \(authorization\.ok === false\)/);
  assert.ok(action.indexOf("requireChoNeoInvitationAdmin()") < action.indexOf(".insert({"));
  assert.ok(page.indexOf("requireChoNeoInvitationAdmin()") < page.indexOf("loadInvitations()"));
});

test("admin creation stores one-use hashed invitations with recipient metadata only", () => {
  assert.match(invitationHelper, /randomBytes\(CODE_BYTES\)/);
  assert.match(invitationHelper, /const CODE_BYTES = 16/);
  assert.match(invitationHelper, /createHash\("sha256"\)/);
  assert.match(invitationHelper, /CHO_NEO_INVITATION_HASH_PREFIX/);
  assert.match(action, /const privateCode = createChoNeoInvitationCode\(\)/);
  assert.match(action, /const codeHash = hashChoNeoInvitationCode\(privateCode\)/);
  assert.match(action, /code_hash: codeHash/);
  assert.match(action, /max_uses: CHO_NEO_INVITATION_DEFAULT_MAX_USES/);
  assert.match(action, /recipient_name: recipientName/);
  assert.match(action, /recipient_contact: recipientContact \|\| null/);
  assert.doesNotMatch(action.match(/\.insert\(\{[\s\S]*?\n  \}\)/)?.[0] ?? "", /privateCode|privateJoinUrl/);
  assert.match(migration, /add column if not exists recipient_name text null/);
  assert.match(migration, /add column if not exists recipient_contact text null/);
});

test("plaintext invitation URL is returned once and points at existing join onboarding", () => {
  const link = buildChoNeoPrivateInvitationLink("CNEO-ABC123", "https://example.com");
  assert.equal(link, "https://example.com/join#invite=CNEO-ABC123");
  assert.equal(buildPrivateInvitationLink("CNEO-ABC123", "https://example.com/old"), link);
  assert.equal(
    hashChoNeoInvitationCode(" cneo-abc123 "),
    hashChoNeoInvitationCodeFromScript("CNEO-ABC123"),
  );
  assert.match(action, /privateJoinUrl: buildChoNeoPrivateInvitationLink\(privateCode, await getSiteOrigin\(\)\)/);
  assert.match(client, /Copy Link/);
  assert.match(client, /navigator\.share/);
  assert.match(client, /Sharing unavailable\. Use Copy Link\./);
  assert.match(join, /new URLSearchParams\(hash\)\.get\("invite"\)/);
});

test("invitation list shows human status without exposing code hashes", () => {
  assert.match(page, /Recipient/);
  assert.match(page, /Role/);
  assert.match(page, /Created/);
  assert.match(page, /Expires/);
  assert.match(page, /Status/);
  assert.match(page, /return "Not used"/);
  assert.match(page, /return "Joined"/);
  assert.match(page, /return "Expired"/);
  assert.match(page, /return "Revoked"/);
  assert.doesNotMatch(page, /code_hash/);
});
