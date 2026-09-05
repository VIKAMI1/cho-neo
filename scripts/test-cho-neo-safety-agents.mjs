import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const route = fs.readFileSync(path.join(root, "src/app/api/cho-neo/tim-ban-trong-nghe/route.ts"), "utf8");
const language = fs.readFileSync(path.join(root, "src/lib/cho-neo/language-safety-agent.ts"), "utf8");
const behavior = fs.readFileSync(path.join(root, "src/lib/cho-neo/behavior-safety-agent.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260905100000_cho_neo_safety_agents_v1.sql"), "utf8");

assert.match(route, /runLanguageSafetyAgent/);
assert.match(route, /runBehaviorSafetyAgent/);
assert.match(route, /recordChoNeoSafetyEvent/);
assert.match(route, /action === "block"/);
assert.match(route, /action === "throttle"/);
assert.match(language, /omni-moderation-latest/);
assert.match(language, /sexual-coercion/);
assert.match(behavior, /rapid-messaging/);
assert.match(behavior, /multiple-open-reports/);
assert.match(migration, /Never store message bodies here/);
assert.doesNotMatch(migration, /message_evidence|body text|message text not null/);

console.log("Chợ Neo safety agent wiring checks passed.");
