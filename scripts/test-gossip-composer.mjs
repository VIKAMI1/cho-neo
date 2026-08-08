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

function extractSnippetBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.ok(start > -1, `Expected marker to exist: ${startMarker}`);

  const end = source.indexOf(endMarker, start);
  assert.ok(end > start, `Expected end marker after ${startMarker}: ${endMarker}`);

  return source.slice(start, end);
}

function createArtworkHarness() {
  const harnessSource = `
    const QUAN_TAM_DAY_ARTWORK_SRC = "/images/cho-neo/Quan-Tam-Daytime.png";
    const QUAN_TAM_NIGHT_ARTWORK_SRC = "/images/cho-neo/quan-tam-gossip.png";
    const QUAY_XA_GIAO_DAY_ARTWORK_SRC = "/images/cho-neo/Quay-Xa-Giao-Daytime.png";
    const QUAY_XA_GIAO_NIGHT_ARTWORK_SRC = "/images/cho-neo/Quay-Xa-Giao.png";
    const BAN_CHUYEN_NGHE_DAY_ARTWORK_SRC = "/images/cho-neo/Ban-Chuyen-Nghe-New.png";
    const BAN_CHUYEN_NGHE_NIGHT_ARTWORK_SRC = "/images/cho-neo/Ban-Chuyen-Nghe-Nighttime.png";
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
        banChuyenNgheDay: BAN_CHUYEN_NGHE_DAY_ARTWORK_SRC,
        banChuyenNgheNight: BAN_CHUYEN_NGHE_NIGHT_ARTWORK_SRC,
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

test("front counter composer uses conversation language", () => {
  includesAll(page, [
    'composerPlaceholder: "Nói một câu..."',
    'placeholder="Nói một câu..."',
    '{frontCounterPosting ? "Đang gửi..." : "Gửi"}',
  ]);
  assert.doesNotMatch(page, /Góp một câu\.\.\./);
  assert.doesNotMatch(page, /Đăng Post/);
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
    shopTalk: paths.banChuyenNgheDay,
    frontCounter: paths.quayXaGiaoDay,
    lobby: paths.quanTamDay,
  });
  assert.deepEqual(getQuanTamArtworkSources(nightStart), {
    shopTalk: paths.banChuyenNgheNight,
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
  assert.match(page, /useState\(\{\s*shopTalk: BAN_CHUYEN_NGHE_NIGHT_ARTWORK_SRC,\s*frontCounter: QUAY_XA_GIAO_NIGHT_ARTWORK_SRC,\s*lobby: QUAN_TAM_NIGHT_ARTWORK_SRC,\s*\}\)/);
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

test("front counter conversation stream uses person-first public messages", () => {
  includesAll(page, [
    'className="front-counter-conversation-panel"',
    'id="front-counter-conversation-title"',
    "Đang trò chuyện",
    'className="front-counter-conversation-stream"',
    "selectedMessages.map((message) =>",
    "front-counter-conversation-message",
    "formatFrontCounterMessageTime(",
    "replyToFrontCounterMessage(displayName)",
    "Trả lời",
  ]);
  assert.doesNotMatch(page, /selectedMessages\.slice\(-2\)/);
  assert.match(page, /\.front-counter-conversation-panel \{[\s\S]*border: 1px solid #c7bab1;[\s\S]*background:[\s\S]*linear-gradient\(180deg, rgba\(255, 254, 252, 0\.92\), rgba\(251, 242, 236, 0\.9\)\);/);
  assert.match(page, /\.front-counter-conversation-message \{[\s\S]*grid-template-columns: 36px minmax\(0, 1fr\);[\s\S]*border-bottom: 1px solid rgba\(199, 186, 177, 0\.38\);/);
  assert.match(page, /\.front-counter-conversation-meta strong \{[\s\S]*font-size: 14px;[\s\S]*font-weight: 600;/);
  assert.match(page, /\.front-counter-conversation-copy p,[\s\S]*\.front-counter-conversation-empty \{[\s\S]*font-weight: 400;[\s\S]*line-height: 1\.45;/);
  assert.match(page, /\.front-counter-conversation-actions button \{[\s\S]*font-weight: 500;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-form \{[\s\S]*background:[\s\S]*linear-gradient\(180deg, #fffefc, #fbf2ec\);/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-message-row input \{[\s\S]*min-height: 48px;[\s\S]*background: #fffefc;[\s\S]*font-size: 16px;/);
  assert.match(page, /\.front-counter-stage-message-row input::placeholder \{[\s\S]*opacity: 1;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-safety[\s\S]*font-size: 14px;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-message-row > button:not\(\.front-counter-input-avatar\) \{[\s\S]*min-height: 48px;[\s\S]*background: #b85f55;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-message-row > button:not\(\.front-counter-input-avatar\):disabled \{[\s\S]*background: #c9948d;[\s\S]*opacity: 1;/);
});

test("Bàn Chuyện Nghề uses the shared front-counter room structure", () => {
  const shopTalkBranch = extractSnippetBetween(
    page,
    "{isShopTalkTable && localTableConfig ? (",
    "{isFrontCounter ? ("
  );

  includesAll(page, [
    'const BAN_CHUYEN_NGHE_NIGHT_ARTWORK_SRC =\n  "/images/cho-neo/Ban-Chuyen-Nghe-Nighttime.png";',
    'isFrontCounter || isShopTalkTable ? "detail-panel-front-counter" : ""',
    'isShopTalkTable ? "detail-panel-shop-talk" : ""',
    "isLocalSessionTable && !isShopTalkTable ? \"detail-panel-local-table\" : \"\"",
  ]);

  includesAll(shopTalkBranch, [
    'className="front-counter-table-scene shop-talk-table-scene"',
    'className="front-counter-focused-stage shop-talk-focused-stage"',
    'className="front-counter-artwork-frame"',
    'className="front-counter-artwork-surface"',
    'className="front-counter-focused-image"',
    "src={quanTamArtworkSources.shopTalk}",
    'className="front-counter-stage-bubbles shop-talk-stage-feed"',
    "front-counter-stage-bubble",
    'className="front-counter-stage-form shop-talk-stage-form"',
    'className="front-counter-stage-message-row"',
    'className="front-counter-stage-safety"',
  ]);
});

test("Bàn Chuyện Nghề keeps five prompts below the shared composer and no duplicate rules", () => {
  const shopTalkBranch = extractSnippetBetween(
    page,
    "{isShopTalkTable && localTableConfig ? (",
    "{isFrontCounter ? ("
  );

  includesAll(shopTalkBranch, [
    'className="front-counter-stage-form shop-talk-stage-form"',
    'className="front-counter-stage-form shop-talk-prompt-strip"',
    'Gợi mở chuyện',
    "selectedTable.topicChips.map((chip) =>",
    "onClick={() => useLocalTablePrompt(chip)}",
  ]);

  includesAll(page, [
    "Khách khó tính",
    "Giá & thời gian",
    "Ngày bận",
    "Dịch vụ bán chạy",
    "Nhân sự"
  ]);

  assert.ok(
    shopTalkBranch.indexOf('className="front-counter-stage-form shop-talk-prompt-strip"') >
      shopTalkBranch.indexOf('className="front-counter-stage-form shop-talk-stage-form"'),
    "starter prompts should render after the compact composer"
  );
  assert.doesNotMatch(
    shopTalkBranch,
    /Nội quy nhẹ|table-light-rules|local-table-stage-shop-talk/,
    "shop-talk branch should not include duplicate rules or the old local-table visual system"
  );
});

test("Bàn Chuyện Nghề keeps shared two-column post grid and readable surfaces", () => {
  assert.match(page, /\.front-counter-stage-bubbles \{[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(page, /\.front-counter-stage-bubble \{[\s\S]*border: 1px solid #c7bab1;[\s\S]*background:[\s\S]*linear-gradient\(180deg, #fffefc, #fff8f1\);/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-form \{[\s\S]*background:[\s\S]*linear-gradient\(180deg, #fffefc, #fbf2ec\);/);
  assert.match(page, /\.shop-talk-focused-stage \.front-counter-artwork-surface \{[\s\S]*aspect-ratio: 1671 \/ 941;/);
  assert.match(page, /\.shop-talk-focused-stage \.front-counter-focused-image \{[\s\S]*object-fit: contain;/);
});

test("Bàn Chuyện Nghề header controls use the same compact front-counter controls", () => {
  const controlsBranch = extractSnippetBetween(
    page,
    "{isFrontCounter || isShopTalkTable ? (",
    "<TableHostNudge"
  );

  includesAll(controlsBranch, [
    'className="front-counter-quick-controls"',
    'className="compact-table-back front-counter-back-control"',
    "front-counter-seat-control",
    'className="compact-table-count front-counter-count-control"',
  ]);
  assert.match(page, /\.front-counter-quick-controls \{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*gap: 8px;/);
  assert.match(page, /\.front-counter-quick-controls \.compact-table-back,[\s\S]*\.front-counter-seat-control,[\s\S]*\.front-counter-count-control,[\s\S]*\.front-counter-quick-controls :global\(\.cho-neo-feedback-button\),[\s\S]*\.front-counter-theme-audio :global\(\.cho-neo-theme-audio\.cho-neo-layout-theme-audio \.theme-music-toggle\) \{[\s\S]*min-height: 44px;[\s\S]*border-radius: 12px;/);
});

test("Quầy Xã Giao utility row includes compact shared music and feedback controls", () => {
  const controlsBranch = extractSnippetBetween(
    page,
    "{isFrontCounter || isShopTalkTable ? (",
    "<TableHostNudge"
  );

  includesAll(controlsBranch, [
    'className="front-counter-control-group"',
    'className="front-counter-control-group front-counter-action-group"',
    'className="cho-neo-shared-music-slot front-counter-theme-audio"',
    "data-cho-neo-shared-music-slot",
    "<ChoNeoBetaFeedback />",
    'className="compact-table-count front-counter-count-control"',
  ]);
  assert.match(page, /\{!\(isFrontCounter \|\| isShopTalkTable\) \? \(\s*<div className="cafe-stage-controls">/);
  assert.match(page, /\.front-counter-quick-controls \{[\s\S]*display: flex;[\s\S]*justify-content: space-between;[\s\S]*width: 100%;/);
  assert.match(page, /\.front-counter-control-group \{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*gap: 8px;/);
  assert.match(page, /\.front-counter-quick-controls \.compact-table-back,[\s\S]*\.front-counter-seat-control,[\s\S]*\.front-counter-count-control,[\s\S]*\.front-counter-quick-controls :global\(\.cho-neo-feedback-button\),[\s\S]*\.front-counter-theme-audio :global\(\.cho-neo-theme-audio\.cho-neo-layout-theme-audio \.theme-music-toggle\) \{[\s\S]*height: 44px;[\s\S]*border-radius: 12px;[\s\S]*font-weight: 500;/);
  assert.match(page, /\.front-counter-quick-controls :global\(\.cho-neo-feedback-button\)::before \{[\s\S]*content: "♡";/);
  assert.match(page, /\.front-counter-theme-audio :global\(\.cho-neo-theme-audio\.cho-neo-layout-theme-audio \.theme-music-toggle\)::after \{[\s\S]*content: "Nhạc";/);
});

test("Quầy Xã Giao composer keeps avatar route and hides visible remaining count", () => {
  const frontCounterComposer = extractSnippetBetween(
    page,
    'className="front-counter-stage-form"',
    "{frontCounterDrawerOpen ? ("
  );

  includesAll(page, [
    'className="composer-avatar-identity"',
    'className="composer-avatar-action">Đổi dáng</span>',
    'href="/cho-neo/avatar"',
    "maxLength={FRONT_COUNTER_MESSAGE_LIMIT}",
  ]);
  assert.doesNotMatch(frontCounterComposer, /Còn \{remainingFrontCounterCharacters\} ký tự/);
  assert.doesNotMatch(frontCounterComposer, /\{remainingFrontCounterCharacters\} left/);
  assert.match(page, /\.front-counter-stage-form \.composer-avatar-passport \{[\s\S]*justify-content: space-between;[\s\S]*min-height: 52px;/);
  assert.match(page, /\.front-counter-stage-form \.composer-avatar-action \{[\s\S]*min-height: 44px;[\s\S]*border-radius: 12px;[\s\S]*font-weight: 500;/);
  assert.match(page, /\.front-counter-focused-stage \.front-counter-stage-safety \{[\s\S]*font-weight: 400;/);
});

test("Quán Tám hero uses one compact utility row", () => {
  assert.doesNotMatch(page, /Cho Neo Village/);
  assert.match(page, /<h1 id="gossip-title">\s*Quán Tám\s*<span>Gossip Café<\/span>\s*<\/h1>/);
  assert.match(page, /h1 \{[\s\S]*font-size: clamp\(38px, 5vw, 54px\);[\s\S]*font-weight: 600;/);
  assert.match(page, /h1 span \{[\s\S]*font-size: 0\.3em;[\s\S]*font-weight: 400;/);
  assert.match(page, /\.subtitle \{[\s\S]*font-weight: 400;/);

  const controls = extractSnippetBetween(
    page,
    '<div className="cafe-stage-controls">',
    "<>\n        <section"
  );
  includesAll(controls, [
    '<Link className={cafeControlPillClassName} href="/cho-neo">',
    "<span>← Về Sân Làng</span>",
    '<Link className={cafeControlPillClassName} href="/cho-neo/avatar">',
    "<span>Chọn avatar</span>",
    'className="cho-neo-shared-music-slot cafe-theme-audio"',
    "data-cho-neo-shared-music-slot",
    "<ChoNeoBetaFeedback />",
  ]);
  assert.doesNotMatch(controls, /<small>Village<\/small>|<small>Choose village face<\/small>/);
  assert.match(page, /\.cafe-stage-controls \{[\s\S]*display: flex;[\s\S]*align-items: center;[\s\S]*justify-content: space-between;/);
  assert.match(page, /\.cafe-control-pill \{[\s\S]*flex-direction: row;[\s\S]*height: 44px;[\s\S]*min-height: 44px;[\s\S]*border-radius: 12px;[\s\S]*font-weight: 500;/);
  assert.match(page, /\.cafe-hero-actions :global\(\.cho-neo-feedback-button\) \{[\s\S]*height: 44px !important;[\s\S]*border-radius: 12px !important;[\s\S]*font-weight: 500 !important;/);
  assert.match(page, /\.cafe-hero-actions :global\(\.cho-neo-feedback-button\)::before \{[\s\S]*content: "♡" !important;/);
  assert.match(page, /\.cafe-theme-audio :global\(\.cho-neo-theme-audio\.cho-neo-layout-theme-audio\) \{[\s\S]*width: auto !important;[\s\S]*height: 44px !important;[\s\S]*border-radius: 12px !important;/);
  assert.match(page, /\.cafe-theme-audio :global\(\.cho-neo-theme-audio\.cho-neo-layout-theme-audio \.theme-music-toggle\) \{[\s\S]*min-width: 78px !important;[\s\S]*height: 44px !important;[\s\S]*border-radius: 12px !important;[\s\S]*font-weight: 500 !important;/);
  assert.match(page, /\.cafe-theme-audio :global\(\.cho-neo-theme-audio\.cho-neo-layout-theme-audio \.theme-music-toggle\)::before \{[\s\S]*content: "♪";/);
  assert.match(page, /\.cafe-theme-audio :global\(\.cho-neo-theme-audio\.cho-neo-layout-theme-audio \.theme-music-toggle\)::after \{[\s\S]*content: "Nhạc";/);
});
