#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "src/app/cho-neo/gossip/page.tsx"),
  "utf8",
);

test("mobile toolbar hides activity status and stays on one compact row", () => {
  assert.match(source, /@media \(max-width: 639px\)/);
  assert.match(source, /\.cafe-toolbar-status \{\s*display: none;/s);
  assert.match(source, /grid-template-areas: "back enter music feedback";/);
  assert.match(source, /\.cafe-room-toolbar:not\(:has\(\.compact-table-enter\)\)/);
  assert.match(source, /grid-template-areas: "navigation music feedback";/);
  assert.match(source, /\.cafe-hero-actions > \.cho-neo-feedback-button \{[\s\S]*?min-height: 44px/);
  assert.match(source, /\.cafe-hero-actions > \.cho-neo-shared-music-slot \{[\s\S]*?width: 46px/);
});

test("tablet toolbar retains the three-zone status layout", () => {
  assert.match(source, /@media \(min-width: 640px\) and \(max-width: 720px\)/);
  assert.match(source, /grid-template-columns: auto minmax\(0, 1fr\) auto;/);
  assert.match(source, /\.cafe-toolbar-status \{\s*display: block;/s);
});
