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

function extractNamedFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.ok(start > -1, `Expected ${name} to exist`);

  const bodyStart = source.indexOf("{", start);
  assert.ok(bodyStart > -1, `Expected ${name} to have a body`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1;
    } else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, index + 1);
      }
    }
  }

  assert.fail(`Expected ${name} body to close`);
}

function createArtworkHarness() {
  const harnessSource = `
    const QUAN_TAM_DAY_ARTWORK_SRC = "/images/cho-neo/Quan-Tam-Daytime.png";
    const QUAN_TAM_NIGHT_ARTWORK_SRC = "/images/cho-neo/quan-tam-gossip.png";
    const QUAY_XA_GIAO_DAY_ARTWORK_SRC = "/images/cho-neo/Quay-Xa-Giao-Daytime.png";
    const QUAY_XA_GIAO_NIGHT_ARTWORK_SRC = "/images/cho-neo/Quay-Xa-Giao.png";
    ${extractNamedFunction(page, "isChoNeoDaytime")}
    ${extractNamedFunction(page, "getQuanTamArtworkSources")}
    ${extractNamedFunction(page, "getNextQuanTamArtworkBoundaryMs")}
    return {
      isChoNeoDaytime,
      getQuanTamArtworkSources,
      getNextQuanTamArtworkBoundaryMs,
      paths: {
        quanTamDay: QUAN_TAM_DAY_ARTWORK_SRC,
        quanTamNight: QUAN_TAM_NIGHT_ARTWORK_SRC,
        quayXaGiaoDay: QUAY_XA_GIAO_DAY_ARTWORK_SRC,
        quayXaGiaoNight: QUAY_XA_GIAO_NIGHT_ARTWORK_SRC,
      },
    };
  `;

  return Function(harnessSource)();
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

test("Quán Tám and Quầy Xã Giao artwork switch between local daytime and existing night images", () => {
  const { getQuanTamArtworkSources, isChoNeoDaytime, paths } = createArtworkHarness();
  const beforeDay = new Date("2026-07-22T05:59:00");
  const dayStart = new Date("2026-07-22T06:00:00");
  const dayEnd = new Date("2026-07-22T17:59:00");
  const nightStart = new Date("2026-07-22T18:00:00");

  assert.equal(isChoNeoDaytime(beforeDay), false);
  assert.equal(isChoNeoDaytime(dayStart), true);
  assert.equal(isChoNeoDaytime(dayEnd), true);
  assert.equal(isChoNeoDaytime(nightStart), false);
  assert.deepEqual(getQuanTamArtworkSources(dayStart), {
    frontCounter: paths.quayXaGiaoDay,
    lobby: paths.quanTamDay,
  });
  assert.deepEqual(getQuanTamArtworkSources(nightStart), {
    frontCounter: paths.quayXaGiaoNight,
    lobby: paths.quanTamNight,
  });
});

test("Quán Tám artwork timer updates at 06:00 and 18:00 without hydration churn", () => {
  const { getNextQuanTamArtworkBoundaryMs } = createArtworkHarness();

  assert.equal(
    getNextQuanTamArtworkBoundaryMs(new Date("2026-07-22T05:30:00")),
    30 * 60 * 1000
  );
  assert.equal(
    getNextQuanTamArtworkBoundaryMs(new Date("2026-07-22T06:00:00")),
    12 * 60 * 60 * 1000
  );
  assert.equal(
    getNextQuanTamArtworkBoundaryMs(new Date("2026-07-22T17:59:00")),
    60 * 1000
  );
  assert.equal(
    getNextQuanTamArtworkBoundaryMs(new Date("2026-07-22T18:00:00")),
    12 * 60 * 60 * 1000
  );
  assert.match(page, /useState\(\{\s*frontCounter: QUAY_XA_GIAO_NIGHT_ARTWORK_SRC,\s*lobby: QUAN_TAM_NIGHT_ARTWORK_SRC,\s*\}\)/);
  assert.match(page, /window\.clearTimeout\(timeoutId\);/);
});

test("Quán Tám day/night artwork keeps the existing hero frame and hotspots", () => {
  const imageIndex = page.indexOf("src={quanTamArtworkSources.lobby}");
  const hotspotIndex = page.indexOf('className="gossip-hotspot-layer"');

  assert.ok(imageIndex > -1, "time-aware lobby image should render");
  assert.ok(hotspotIndex > imageIndex, "hotspots should remain layered after the lobby image");
  assert.match(page, /\.gossip-room-stage \{[\s\S]*aspect-ratio: 16 \/ 9;/);
  assert.match(page, /\.gossip-room-image \{[\s\S]*object-fit: cover;/);
  assert.match(page, /\.gossip-hotspot-layer \{[\s\S]*position: absolute;[\s\S]*inset: 0;/);
});

test("front counter composer and bubbles use clearer readable surfaces", () => {
  assert.match(page, /\.front-counter-stage-bubble \{[\s\S]*background:[\s\S]*linear-gradient\(180deg, #fffefc, #fff8f1\);[\s\S]*color: #2f2926;/);
  assert.match(page, /\.front-counter-stage-bubble p \{[\s\S]*font-size: 15px;[\s\S]*line-height: 1\.48;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-bubble-header strong \{[\s\S]*color: #2f2926;[\s\S]*font-size: 15px;[\s\S]*font-weight: 650;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-bubble-header strong span,[\s\S]*color: #6b625d;[\s\S]*font-size: 13px;[\s\S]*font-weight: 600;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-bubble-controls button \{[\s\S]*border-radius: 10px;[\s\S]*color: #4f4641;[\s\S]*font-weight: 700;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-form \{[\s\S]*background:[\s\S]*linear-gradient\(180deg, #fffefc, #fbf2ec\);/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-message-row input \{[\s\S]*min-height: 48px;[\s\S]*background: #fffefc;[\s\S]*font-size: 16px;/);
  assert.match(page, /\.front-counter-stage-message-row input::placeholder \{[\s\S]*opacity: 1;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-safety[\s\S]*font-size: 14px;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-message-row > button:not\(\.front-counter-input-avatar\) \{[\s\S]*min-height: 48px;[\s\S]*background: #b85f55;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-message-row > button:not\(\.front-counter-input-avatar\):disabled \{[\s\S]*background: #c9948d;[\s\S]*opacity: 1;/);
});
