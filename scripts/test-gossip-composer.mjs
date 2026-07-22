import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync("src/app/cho-neo/gossip/page.tsx", "utf8");

function includesAll(source, snippets) {
  for (const snippet of snippets) {
    assert.ok(
      source.includes(snippet),
      `Expected source to include: ${snippet}`
    );
  }
}

test("front counter composer click and typing prepare the input", () => {
  includesAll(page, [
    'className="front-counter-stage-form"',
    "onClick={(event) => {",
    '!event.target.closest("button")',
    "ensureFrontCounterComposerReady();",
    "frontCounterInputRef.current?.focus();",
    "onFocus={ensureFrontCounterComposerReady}",
    "onChange={(event) => {",
    "frontCounterDraftRef.current = event.target.value;",
    "setFrontCounterDraft(event.target.value);",
  ]);
});

test("front counter composer is not gated by identity or seating state while typing", () => {
  includesAll(page, [
    "const canSubmitFrontCounterMessage =\n    frontCounterDraft.trim().length > 0 && !frontCounterPosting;",
    "disabled={frontCounterPosting}",
    "disabled={\n                              !canSubmitFrontCounterMessage ||\n                              frontCounterPosting\n                            }",
  ]);

  assert.doesNotMatch(
    page,
    /disabled=\{\s*!identity\s*\|\|\s*!isCurrentIdentitySeated\s*\|\|\s*frontCounterPosting\s*\}/,
    "input must not stay disabled until the visitor is already seated"
  );
  assert.doesNotMatch(
    page,
    /disabled=\{\s*!identity\s*\|\|\s*!isCurrentIdentitySeated\s*\|\|\s*!canSubmitFrontCounterMessage/,
    "submit button must not be disabled by hidden identity or seating gates"
  );
});

test("front counter post button uses the corrected visible copy", () => {
  assert.match(page, /Đăng Post/);
  assert.doesNotMatch(page, /Đăng"\}\s*<small>/);
});

test("front counter submit prepares identity, saves once, clears, and reports errors visibly", () => {
  includesAll(page, [
    "await submitFrontCounterDraft();",
    "async function submitFrontCounterDraft() {",
    "const text = frontCounterDraftRef.current.trim();",
    "if (frontCounterPosting || frontCounterPostingRef.current) {",
    "const activeIdentity = ensureFrontCounterComposerReady();",
    "frontCounterPostingRef.current = true;",
    "postSharedFrontCounterMessage({",
    "avatarId: activeIdentity.avatarId,",
    "nickname: activeIdentity.nickname,",
    "saveFrontCounterMessageLocally({",
    "identity: activeIdentity,",
    "frontCounterDraftRef.current = \"\";",
    "setFrontCounterDraft(\"\");",
    "releaseFrontCounterPostingGuard();",
    "frontCounterPostingRef.current = false;",
    "Chưa đăng được câu này. Bạn thử lại sau nha.",
    "front-counter-stage-feedback",
  ]);
});

test("front counter visible post button uses the guarded direct submit path", () => {
  includesAll(page, [
    "onClick={() => {\n                              void submitFrontCounterDraft();\n                            }}",
    'type="button"',
  ]);
});

test("front counter privacy note remains below the composer row", () => {
  const rowIndex = page.indexOf('className="front-counter-stage-message-row"');
  const safetyIndex = page.indexOf('className="front-counter-stage-safety"');

  assert.ok(rowIndex > -1, "composer message row should exist");
  assert.ok(safetyIndex > -1, "privacy note should exist");
  assert.ok(
    safetyIndex > rowIndex,
    "privacy note should render after the input row so it cannot cover the input"
  );
});
