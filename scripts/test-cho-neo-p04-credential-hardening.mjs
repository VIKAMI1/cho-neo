#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function sourceFiles(directory) {
  const root = path.join(repoRoot, directory);
  const entries = fs.readdirSync(root, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relativePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(relativePath);
    return /\.(ts|tsx|py)$/.test(entry.name) ? [relativePath] : [];
  });
}

const uploads = read("backend/routes/uploads.py");
const backendMain = read("backend/main.py");
const showOff = read("src/components/ShowOff.tsx");
const showOffUploader = read("src/app/show-off/new/ShowOffUploader.tsx");
const feedbackRoute = read("src/app/api/cho-neo/beta-feedback/route.ts");
const gossipRoute = read("src/app/api/cho-neo/gossip/front-counter/messages/route.ts");
const gossipClient = read("src/lib/cho-neo/gossip-front-counter.ts");
const gossipPage = read("src/app/cho-neo/gossip/page.tsx");
const hoiGiDayQuestionsRoute = read("src/app/api/cho-neo/hoi-gi-day/questions/route.ts");
const healthRoute = read("src/app/api/health/route.ts");

test("upload authorization has no development fallback and fails closed", () => {
  assert.doesNotMatch(uploads, /dev-123/);
  assert.match(uploads, /expected = \(os\.getenv\("API_KEY"\) or ""\)\.strip\(\)/);
  assert.match(uploads, /if not expected:[\s\S]*status_code=503/);
  assert.match(uploads, /secrets\.compare_digest/);
  assert.doesNotMatch(`${showOff}\n${showOffUploader}`, /dev-123/);
  assert.match(`${showOff}\n${showOffUploader}`, /requireUploadApiKey/);
});

test("backend/.env cannot override runtime environment", () => {
  assert.match(uploads, /load_dotenv\(ENV_PATH, override=False\)/);
  assert.match(backendMain, /load_dotenv\(dotenv_path=ENV_PATH, override=False\)/);
  assert.doesNotMatch(`${uploads}\n${backendMain}`, /override=True/);
});

test("durable feedback storage requires server authority", () => {
  assert.match(feedbackRoute, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(feedbackRoute, /NEXT_PUBLIC_SUPABASE_ANON_KEY|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(feedbackRoute, /storeWithJsonl|feedback-events\.jsonl|stored: "jsonl"/);
  assert.match(feedbackRoute, /status: 503/);
  assert.match(feedbackRoute, /from\("cho_neo_feedback"\)\.insert\(record\)/);
});

test("public Gossip reads use public Supabase authority", () => {
  const publicClientStart = gossipRoute.indexOf("function createChoNeoSupabaseClient");
  const serviceClientStart = gossipRoute.indexOf("function createChoNeoSupabaseServiceClient");
  assert.notEqual(publicClientStart, -1);
  assert.notEqual(serviceClientStart, -1);
  const publicClient = gossipRoute.slice(publicClientStart, serviceClientStart);

  assert.doesNotMatch(publicClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(publicClient, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(gossipRoute, /requireChoNeoInvitationAdmin/);
  assert.doesNotMatch(
    `${gossipRoute}\n${gossipClient}\n${gossipPage}`,
    /X-Cho-Neo-Host-Key|CHO_NEO_HOST_TOOLS_KEY|hostKey/,
  );
});

test("public Hoi Gi Day reads use public Supabase authority", () => {
  const publicClientStart = hoiGiDayQuestionsRoute.indexOf("function createChoNeoSupabaseClient");
  const serviceClientStart = hoiGiDayQuestionsRoute.indexOf("function createChoNeoSupabaseServiceClient");
  assert.notEqual(publicClientStart, -1);
  assert.notEqual(serviceClientStart, -1);

  const publicClient = hoiGiDayQuestionsRoute.slice(publicClientStart, serviceClientStart);
  assert.doesNotMatch(publicClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(publicClient, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(publicClient, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
});

test("service-role credentials never appear in client modules", () => {
  for (const relativePath of sourceFiles("src")) {
    const source = read(relativePath);
    if (/['\"]use client['\"]/.test(source)) {
      assert.doesNotMatch(
        source,
        /SUPABASE_SERVICE_ROLE_KEY/,
        `${relativePath} must not contain the service-role credential`,
      );
    }
  }
});

test("server-only helpers are protected from client bundling", () => {
  for (const relativePath of [
    "src/lib/supabase-server.ts",
    "src/lib/lilt.ts",
    "src/lib/cho-neo/invitation-admin.ts",
    "src/lib/cho-neo/hoi-gi-day-ai.ts",
  ]) {
    assert.match(read(relativePath), /^import "server-only";/);
  }
});

test("health response does not disclose secret or configuration presence", () => {
  assert.match(healthRoute, /ok: true/);
  assert.match(healthRoute, /service: "cho-neo"/);
  assert.doesNotMatch(
    healthRoute,
    /OPENAI_API_KEY|NEXT_PUBLIC_SUPABASE|openAiKeyPresent|supabasePublicConfigPresent|gossipPostingDisabled|isChoNeoGossipPostingDisabled/,
  );
});
