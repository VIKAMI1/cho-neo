#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

const rootPage = read("src/app/page.tsx");
const roomsSource = read("src/lib/cho-neo/rooms.ts");
const villageShell = read("src/components/cho-neo/ChoNeoVillageShell.tsx");
const gossipPage = read("src/app/cho-neo/gossip/page.tsx");
const ongDiaPage = read("src/app/cho-neo/ong-dia/page.tsx");
const showOffPage = read("src/app/cho-neo/show-off/page.tsx");
const legacyShowOffPage = read("src/app/show-off/page.tsx");
const legacyShowOffNewPage = read("src/app/show-off/new/page.tsx");
const legacyShowOffCreatePage = read("src/app/show-off/create/page.tsx");
const frontCounterRoute = read("src/app/api/cho-neo/gossip/front-counter/messages/route.ts");
const healthRoute = read("src/app/api/health/route.ts");
const deploymentDoc = read("docs/cho-neo/deployment-hygiene.md");

test("root URL is canonicalized to the Chợ Neo village entrance", () => {
  assert.match(rootPage, /redirect\("\/cho-neo"\)/);
  assert.doesNotMatch(rootPage, /NEXT_PUBLIC_OD_BASE|ShowOffFeed|createClient/);
});

test("unfinished Khoe Set routes are locked or redirected", () => {
  assert.match(roomsSource, /id: "show-off-gallery"[\s\S]*status: "soon"/);
  assert.match(showOffPage, /locked/);
  assert.match(showOffPage, /Khoe Set chưa thuộc vòng mở 24\/7 đầu tiên/);
  assert.match(legacyShowOffPage, /redirect\("\/cho-neo\/show-off"\)/);
  assert.match(legacyShowOffNewPage, /redirect\("\/cho-neo\/show-off"\)/);
  assert.match(legacyShowOffCreatePage, /redirect\("\/cho-neo\/show-off"\)/);
  assert.doesNotMatch(villageShell, /Khoe Set đang mở trước/);
});

test("Quán Tám exposes only the two approved launch tables", () => {
  assert.match(gossipPage, /id: "front-counter"[\s\S]*status: "active"/);
  assert.match(gossipPage, /id: "shop-talk"[\s\S]*status: "active"/);
  assert.match(gossipPage, /id: "color-trend"[\s\S]*status: "inactive"/);
  assert.match(gossipPage, /id: "vent-table"[\s\S]*status: "inactive"/);
  assert.match(gossipPage, /id: "quiet-table"[\s\S]*status: "inactive"/);
  assert.match(gossipPage, /const activeTables = tables\.filter\(\(table\) => table\.status === "active"\)/);
});

test("Ông Địa technical fallback is friendly, retryable, and outside the keepsake", () => {
  assert.match(ongDiaPage, /Ông Địa đang nghỉ một nhịp\. Con thử lại sau nhé\./);
  assert.match(ongDiaPage, /function handleRetryPrayerRequest\(\)/);
  assert.match(ongDiaPage, />\s*Thử lại\s*</);
  assert.match(ongDiaPage, /setPrayerCompactFallback\(COMPACT_PRAYER_FALLBACK\)/);
  assert.doesNotMatch(ongDiaPage, /Ông đang bận ngẫm một chút\. Con thử lại sau nha\./);
});

test("front-counter API has 24/7 posting safety controls", () => {
  assert.match(frontCounterRoute, /CHO_NEO_GOSSIP_POSTING_DISABLED/);
  assert.match(frontCounterRoute, /POST_RATE_LIMIT_MAX = 5/);
  assert.match(frontCounterRoute, /isDuplicatePost\(clientKey, text\)/);
  assert.match(frontCounterRoute, /getUnsafeTextReason\(text\)/);
  assert.match(frontCounterRoute, /rowToPublicMessage/);
  const sharedMemoryResponse = frontCounterRoute.slice(
    frontCounterRoute.indexOf('code: "SHARED_GOSSIP_MEMORY_UNAVAILABLE"'),
    frontCounterRoute.indexOf("{ status: 503 }"),
  );
  assert.doesNotMatch(sharedMemoryResponse, /detail:/);
});

test("health endpoint reports only safe readiness booleans", () => {
  assert.match(healthRoute, /service: "cho-neo"/);
  assert.match(healthRoute, /openAiKeyPresent: Boolean/);
  assert.match(healthRoute, /supabasePublicConfigPresent: Boolean/);
  assert.match(healthRoute, /gossipPostingDisabled:/);
  assert.doesNotMatch(healthRoute, /OPENAI_API_KEY[:}]/);
});

test("deployment hygiene documents emergency disable and rollback", () => {
  assert.match(deploymentDoc, /GET \/api\/health/);
  assert.match(deploymentDoc, /CHO_NEO_GOSSIP_POSTING_DISABLED=1/);
  assert.match(deploymentDoc, /Emergency rollback/);
  assert.match(deploymentDoc, /Do not point the production alias at `vikami-cho`/);
});

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cho-neo-readiness-"));
const routePath = path.join(repoRoot, "src/app/api/cho-neo/gossip/front-counter/messages/route.ts");
const avatarPath = path.join(repoRoot, "src/lib/cho-neo/avatar-identity.ts");
const frontCounterLibPath = path.join(repoRoot, "src/lib/cho-neo/gossip-front-counter.ts");
const tempRoutePath = path.join(tempDir, "front-counter-route-under-test.ts");
const routeSource = fs
  .readFileSync(routePath, "utf8")
  .replace(
    'import { createClient } from "@supabase/supabase-js";',
    `function createClient() {
  return null;
}`,
  )
  .replace(
    'import { NextResponse } from "next/server";',
    `const NextResponse = {
  json(body: unknown, init?: ResponseInit) {
    return new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: { "content-type": "application/json" },
    });
  },
};`,
  )
  .replace(
    'from "@/lib/cho-neo/avatar-identity";',
    `from ${JSON.stringify(pathToFileURL(avatarPath).href)};`,
  )
  .replace(
    `import {
  FRONT_COUNTER_MESSAGE_CAP,
  FRONT_COUNTER_MESSAGE_TEXT_LIMIT,
  type FrontCounterMessage,
} from "@/lib/cho-neo/gossip-front-counter";`,
    `const FRONT_COUNTER_MESSAGE_CAP = 50;
const FRONT_COUNTER_MESSAGE_TEXT_LIMIT = 180;
type FrontCounterMessage = {
  reactions?: {
    heart?: number;
    laugh?: number;
    tea?: number;
  };
};`,
  );

fs.writeFileSync(tempRoutePath, routeSource);
const { POST } = await import(pathToFileURL(tempRoutePath).href);

const ORIGINAL_ENV = {
  CHO_NEO_GOSSIP_POSTING_DISABLED: process.env.CHO_NEO_GOSSIP_POSTING_DISABLED,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function postRequest(body, headers = {}) {
  return new Request("http://localhost/api/cho-neo/gossip/front-counter/messages", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      "user-agent": "cho-neo-readiness-test",
      ...headers,
    },
  });
}

test("front-counter emergency switch disables posting while preserving a safe error", async () => {
  process.env.CHO_NEO_GOSSIP_POSTING_DISABLED = "1";
  const response = await POST(
    postRequest({
      avatarId: "front-counter-pro",
      nickname: "Test",
      text: "Một câu đủ dài để thử.",
    }),
  );
  const body = await response.json();
  restoreEnv();

  assert.equal(response.status, 503);
  assert.equal(body.reason, "posting-disabled");
  assert.doesNotMatch(JSON.stringify(body), /Supabase|service role|API key|OPENAI/i);
});

test("front-counter post rate limit triggers before backend dependency writes", async () => {
  restoreEnv();
  delete process.env.CHO_NEO_GOSSIP_POSTING_DISABLED;
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  let lastResponse;
  for (let index = 0; index < 6; index += 1) {
    lastResponse = await POST(
      postRequest(
        {
          avatarId: "front-counter-pro",
          nickname: "Test",
          text: `Một câu thử rate limit ${index}`,
        },
        { "x-forwarded-for": "203.0.113.24" },
      ),
    );
  }
  const body = await lastResponse.json();
  restoreEnv();

  assert.equal(lastResponse.status, 429);
  assert.equal(body.reason, "post-rate-limited");
  assert.doesNotMatch(JSON.stringify(body), /Supabase|database|service role/i);
});
