#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

const repoRoot = process.cwd();
const xinXamLibPath = path.join(repoRoot, "src/lib/cho-neo/xin-xam-sticky.ts");
const xinXamPagePath = path.join(repoRoot, "src/app/xin-xam/page.tsx");

const { createXinXamLocSo, XIN_XAM_TOPICS } = await import(
  pathToFileURL(xinXamLibPath).href
);

test("Xin Xam Loc So produces six unique main numbers and one separate bonus", () => {
  const locSo = createXinXamLocSo("tiem-giu-nhip-cat", "tiem", "2026-07-20");
  const mainSet = new Set(locSo.mainNumbers);

  assert.equal(locSo.mainNumbers.length, 6);
  assert.equal(mainSet.size, 6);
  assert.equal(locSo.mainNumbers.every((number) => number >= 1 && number <= 49), true);
  assert.equal(locSo.bonusNumber >= 1 && locSo.bonusNumber <= 50, true);
  assert.equal(mainSet.has(locSo.bonusNumber), false);
});

test("Xin Xam Loc So is deterministic for the same que topic and local day", () => {
  const first = createXinXamLocSo("tien-loc-nho-cat", "tien", "2026-07-20");
  const second = createXinXamLocSo("tien-loc-nho-cat", "tien", "2026-07-20");

  assert.deepEqual(second, first);
});

test("Xin Xam Loc So changes only when the deterministic seed changes", () => {
  const today = createXinXamLocSo("tinh-noi-nhe-cat", "tinh", "2026-07-20");
  const tomorrow = createXinXamLocSo("tinh-noi-nhe-cat", "tinh", "2026-07-21");
  const differentQue = createXinXamLocSo("tiem-giu-nhip-cat", "tiem", "2026-07-20");

  assert.notDeepEqual(tomorrow, today);
  assert.notDeepEqual(differentQue, today);
});

test("Xin Xam page renders Loc So as a separate annex outside topic tabs", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /hasOpenedQue && locSo/);
  assert.match(page, /Lộc Số Theo Quẻ/);
  assert.match(page, /Lấy một bộ số vui từ quẻ hôm nay\./);
  assert.match(page, /Rút một quẻ trước để mở lộc số hôm nay\./);
  assert.match(page, /Số thêm · \{formatLocSoNumber\(locSo\.bonusNumber\)\}/);
  assert.match(page, /className=\{`xam-loc-so-annex/);
  assert.match(page, /grid-area: locso/);
  assert.match(page, /"locso card"/);
  assert.doesNotMatch(page, /<div className=\{`xam-loc-so \$\{isLocSoOpen/);
  assert.doesNotMatch(page, /Mở Lộc Số/);
  assert.doesNotMatch(page, /activeNav/);
  assert.doesNotMatch(page, /AI call|lottery selector|conversation box/i);
});

test("Xin Xam keeps the two-column topic and result layout after reveal", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /<div className="xin-xam-layout">/);
  assert.match(page, /<section className="xin-xam-title-card"/);
  assert.doesNotMatch(page, /xin-xam-layout \$\{hasWeeklyQue \? "is-revealed"/);
  assert.doesNotMatch(page, /\{!hasWeeklyQue && \(/);
  assert.doesNotMatch(page, /\.xin-xam-layout\.is-revealed/);
  assert.match(page, /"intro card"/);
  assert.match(page, /selectedTopicCopy\?\.label\} · Quẻ \{selectedNumber\}/);
});

test("Xin Xam topic labels use the 4T visible labels without changing topic keys", () => {
  assert.deepEqual(
    XIN_XAM_TOPICS.map((topic) => topic.key),
    ["tiem", "tien", "tinh", "ban-than"],
  );
  assert.deepEqual(
    XIN_XAM_TOPICS.map((topic) => topic.label),
    ["Tiệm", "Tiền", "Tình", "Bản thân"],
  );
});

test("Xin Xam navigation keeps four equal icon-labeled topic buttons", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(page, /XIN_XAM_TOPIC_ICONS/);
  assert.match(page, /<span aria-hidden="true">\{XIN_XAM_TOPIC_ICONS\[topic\.key\]\}<\/span>/);
  assert.match(page, /<strong>\{topic\.label\}<\/strong>/);
  assert.doesNotMatch(page, /<strong>Lộc Số<\/strong>/);
  assert.doesNotMatch(page, /setSelectedTopic\("loc-so"\)/);
});

test("Xin Xam header uses compact shared controls and removes English subtitles", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /‹ Chợ Neo/);
  assert.match(page, /variant="compact"/);
  assert.match(page, />\s*Góp ý\s*</);
  assert.match(page, /href="\/cho-neo\/ong-dia"[\s\S]*Ông Địa/);
  assert.doesNotMatch(page, /Back to Village|Ong Dia Shrine/);
});

test("Xin Xam opened result does not show the seven-day badge", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.doesNotMatch(page, />Giữ 7 ngày</);
  assert.match(page, />Đã rút</);
});

test("Xin Xam result opens only from the same drawn que source of truth", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /const selectedNumber = useMemo\(/);
  assert.match(page, /<span>Quẻ \{selectedNumber\}<\/span>/);
  assert.match(page, /aria-label=\{`Mở thẻ xăm số \$\{selectedNumber\}`\}/);
  assert.match(page, /selectedTopicCopy\?\.label\} · Quẻ \{selectedNumber\}/);
  assert.match(page, /\{hasOpenedQue && selectedStick \? \(/);
  assert.doesNotMatch(page, /\{selectedStick \? \(/);
});

test("Xin Xam locks topic and holder changes during active draw/reveal", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /const isTopicLocked =[\s\S]*ritualState === "revealing"/);
  assert.match(page, /disabled=\{isTopicLocked\}/);
  assert.match(page, /if \(ritualState !== "ready" \|\| drawInProgressRef\.current\) return;/);
  assert.match(page, /disabled=\{ritualState !== "ready"\}/);
});

test("Xin Xam result offers a quiet change-topic reset without rerolling the kept topic", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /Đổi đề tài/);
  assert.match(page, /function handleChangeConcern\(\)/);
  assert.match(page, /setDismissedTopic\(selectedTopic\)/);
  assert.match(page, /setSelectedStick\(null\)/);
  assert.match(page, /setRitualState\("ready"\)/);
  assert.match(page, /setIsLocSoOpen\(false\)/);
  assert.match(page, /className="xam-change-topic"/);
});

test("Xin Xam reopens the seven-day kept que instead of redrawing a dismissed topic", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /const savedStick = getSavedStickForTopic\(selectedTopic\)/);
  assert.match(page, /if \(savedStick\) \{/);
  assert.match(page, /setSelectedStick\(savedStick\)/);
  assert.match(page, /setRitualState\("revealed"\)/);
  assert.match(page, /Quẻ này đang được giữ trong 7 ngày/);
  assert.match(page, /\{drawNotice && <p className="xam-draw-notice">\{drawNotice\}<\/p>\}[\s\S]*className="xam-change-topic"/);
});

test("Xin Xam selected topic without a que keeps the draw control visible and enabled", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /const shouldShowSavedStick = savedStick && dismissedTopic !== selectedTopic/);
  assert.match(page, /setRitualState\(shouldShowSavedStick \? "revealed" : "ready"\)/);
  assert.match(page, /className=\{`xam-holder-hotspot/);
  assert.match(page, /onClick=\{handleShakeHolder\}/);
  assert.match(page, /disabled=\{ritualState !== "ready"\}/);
  assert.match(page, /aria-label="Xin một quẻ nhẹ"/);
  assert.match(page, /<span className="xam-holder-label">Xin một quẻ nhẹ<\/span>/);
  assert.match(page, /\{hasLoadedTopic \? "Chưa rút" : "Đang mở"\}/);
});

test("Xin Xam draw press shows a numbered stick before revealing text", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /setSelectedStick\(nextStick\)/);
  assert.match(page, /setRitualState\("drawing"\)/);
  assert.match(page, /setRitualState\("drawn"\)/);
  assert.match(page, /revealTimerRef\.current = window\.setTimeout\(\(\) => \{[\s\S]*setRitualState\("revealing"\)/);
  assert.match(page, /<span>Quẻ \{selectedNumber\}<\/span>/);
  assert.match(page, /selectedTopicCopy\?\.label\} · Quẻ \{selectedNumber\}/);
  assert.match(page, /\{hasOpenedQue && selectedStick \? \(/);
});

test("Xin Xam blocks double taps during draw animation", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /const drawInProgressRef = useRef\(false\)/);
  assert.match(page, /if \(ritualState !== "ready" \|\| drawInProgressRef\.current\) return;/);
  assert.match(page, /drawInProgressRef\.current = true/);
  assert.match(page, /drawInProgressRef\.current = false/);
  assert.match(page, /disabled=\{ritualState !== "drawn" \|\| drawInProgressRef\.current\}/);
});

test("Xin Xam CHUA RUT state never renders the seven-day hold message", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");
  const emptyState = page.match(/\) : \(\s*<>\s*<div className="xam-card-meta">[\s\S]*?<\/>\s*\)}/)?.[0] ?? "";

  assert.match(emptyState, /\{hasLoadedTopic \? "Chưa rút" : "Đang mở"\}/);
  assert.doesNotMatch(emptyState, /Quẻ này đang được giữ trong 7 ngày/);
  assert.doesNotMatch(emptyState, /xam-draw-notice/);
});

test("Xin Xam topic switching preserves saved results for reopening", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /function saveWeeklyMemory\(topic: XinXamTopic, stick: XinXamStick\)/);
  assert.doesNotMatch(page, /removeItem\(XIN_XAM_WEEKLY_KEY\)/);
  assert.doesNotMatch(page, /delete memory\[topic\]/);
  assert.match(page, /function handleTopicSelect\(topic: XinXamTopic\) \{\s*setDismissedTopic\(null\)/);
  assert.match(page, /const savedStick = getSavedStickForTopic\(selectedTopic\)/);
});

test("Xin Xam raised stick retracts as the result appears and respects reduced motion", () => {
  const page = fs.readFileSync(xinXamPagePath, "utf8");

  assert.match(page, /type RitualState = "ready" \| "drawing" \| "drawn" \| "revealing" \| "revealed"/);
  assert.match(page, /setRitualState\("revealing"\)/);
  assert.match(page, /ritualState === "revealing" \? "is-retracting" : ""/);
  assert.match(page, /\.xam-rising-stick\.is-retracting/);
  assert.match(page, /@keyframes xamRetract/);
  assert.match(page, /prefers-reduced-motion: reduce/);
  assert.match(page, /window\.matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
});
