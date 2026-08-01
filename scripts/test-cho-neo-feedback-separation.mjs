#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const feedback = fs.readFileSync(
  path.join(repoRoot, "src/components/cho-neo/ChoNeoBetaFeedback.tsx"),
  "utf8",
);
const roomVote = fs.readFileSync(
  path.join(repoRoot, "src/components/cho-neo/ChoNeoRoomVote.tsx"),
  "utf8",
);
const village = fs.readFileSync(
  path.join(repoRoot, "src/components/cho-neo/ChoNeoVillageShell.tsx"),
  "utf8",
);

test("Góp ý and Bình chọn mở phòng have different actions", () => {
  assert.match(feedback, /onClick=\{openFeedback\}/);
  assert.doesNotMatch(feedback, /CHO_NEO_ROOM_VOTE_OPEN_EVENT|ChoNeoRoomVote|room-vote/);
  assert.match(village, /onClick=\{openRoomVote\}/);
  assert.match(village, /CHO_NEO_ROOM_VOTE_OPEN_EVENT/);
  assert.match(village, /<ChoNeoRoomVote \/>/);
  assert.match(roomVote, /CHO_NEO_ROOM_VOTE_OPEN_EVENT/);
});

test("Góp ý renders only categories and one general text area", () => {
  for (const label of ["Góp ý cải thiện", "Báo lỗi", "Góp ý nội dung", "Khác"]) {
    assert.match(feedback, new RegExp(label));
  }
  assert.match(feedback, /Nội dung góp ý/);
  assert.match(feedback, /comments: \{ message \}/);
  assert.doesNotMatch(feedback, /Góc Bình Chọn|Tổng lượt tham gia|room-vote|ChoNeoRoomVote/);
  assert.doesNotMatch(feedback, /CORE_QUESTIONS|Câu hỏi theo phòng|Nhạc làng/);
});

test("Bình chọn mở phòng renders vote content without general feedback fields", () => {
  assert.match(roomVote, /Góc Bình Chọn — Mở gì trước\?/);
  assert.match(roomVote, /CHO_NEO_ROOM_VOTE_OPTIONS\.map/);
  assert.match(roomVote, /\/api\/cho-neo\/room-vote/);
  assert.match(roomVote, /ensureChoNeoMember/);
  assert.doesNotMatch(roomVote, /FEEDBACK_CATEGORIES|Góp ý cải thiện|Nội dung góp ý/);
  assert.doesNotMatch(roomVote, /\/api\/cho-neo\/beta-feedback/);
});

test("both overlays close without changing the current route", () => {
  assert.match(feedback, /setIsOpen\(false\)/);
  assert.match(roomVote, /setIsOpen\(false\)/);
  assert.doesNotMatch(feedback, /router\.push|window\.location/);
  assert.doesNotMatch(roomVote, /router\.push|window\.location/);
});

test("room vote data and API remain outside the feedback entry point", () => {
  assert.match(roomVote, /CHO_NEO_ROOM_VOTE_POLL_KEY/);
  assert.match(roomVote, /sanitizeChoNeoRoomVoteReason/);
  assert.doesNotMatch(feedback, /CHO_NEO_ROOM_VOTE_POLL_KEY|sanitizeChoNeoRoomVoteReason|useChoNeoMember/);
});
