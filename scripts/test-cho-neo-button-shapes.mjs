#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(repoRoot, relativePath), "utf8");

const gossip = read("src/app/cho-neo/gossip/page.tsx");
const community = read("src/components/cho-neo/ChoNeoCommunityNoteRoom.tsx");
const avatar = read("src/app/cho-neo/avatar/page.tsx");
const member = read("src/components/cho-neo/ChoNeoMemberProvider.tsx");
const ongDia = read("src/app/cho-neo/ong-dia/page.tsx");
const village = read("src/components/cho-neo/ChoNeoVillageShell.tsx");
const feedback = read("src/components/cho-neo/ChoNeoBetaFeedback.tsx");
const roomVote = read("src/components/cho-neo/ChoNeoRoomVote.tsx");

function rule(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = [...source.matchAll(new RegExp(`${escaped}[^}]*}`, "gs"))];
  assert.ok(matches.length, `Missing rule: ${selector}`);
  return matches[0][0];
}

test("Quán Tám toolbar uses rectangular standard and two-line button shapes", () => {
  const navigation = rule(gossip, ".cafe-control-button {");
  const back = rule(gossip, ".compact-table-back {");
  const enter = rule(gossip, ".compact-table-enter {");
  const enterSubtitle = rule(gossip, ".compact-table-enter span {");

  assert.match(navigation, /min-height: 48px/);
  assert.match(navigation, /padding: 7px 16px/);
  assert.match(navigation, /border-radius: 12px/);
  assert.match(navigation, /font-weight: 500/);
  assert.match(back, /min-height: 44px/);
  assert.match(back, /border-radius: 12px/);
  assert.match(enter, /min-height: 48px/);
  assert.match(enter, /border-radius: 12px/);
  assert.match(enterSubtitle, /font-weight: 400/);
  assert.doesNotMatch(navigation, /border-radius: 999/);
  assert.doesNotMatch(back, /border-radius: 999/);
  assert.doesNotMatch(enter, /border-radius: 999/);
});

test("shared room and avatar navigation controls use soft rectangular corners", () => {
  assert.match(rule(community, ".soft-link {") , /min-height: 48px/);
  assert.match(rule(community, ".soft-link {") , /border-radius: 12px/);
  assert.match(rule(avatar, ".avatar-topbar a,\n        .action-row a,\n        .action-row button {") , /border-radius: 12px/);
  assert.match(rule(avatar, ".mood-row button {") , /min-height: 44px/);
  assert.match(rule(avatar, ".mood-row button {") , /border-radius: 12px/);
  assert.match(rule(member, ".cho-neo-member-primary,\n      .cho-neo-member-danger {") , /border-radius: 12px/);
  assert.match(rule(ongDia, ".ong-dia-back {") , /border-radius: 12px/);
});

test("feedback, Village Guide voting and room voting use rectangular action buttons", () => {
  assert.match(rule(feedback, ".cho-neo-feedback-button {") , /border-radius: 12px/);
  assert.match(feedback, /\.feedback-footer button \{[^}]*border-radius: 12px/s);
  assert.match(rule(village, ".guide-vote-shortcut {") , /min-height: 44px/);
  assert.match(rule(village, ".guide-vote-shortcut {") , /border-radius: 12px/);
  assert.match(rule(roomVote, ".room-vote-card button, .room-vote-change, .room-vote-retry, .room-vote-reason-actions button {") , /min-height: 44px/);
  assert.match(rule(roomVote, ".room-vote-card button, .room-vote-change, .room-vote-retry, .room-vote-reason-actions button {") , /border-radius: 12px/);
});
