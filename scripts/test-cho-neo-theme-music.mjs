#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const playerPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoThemeParkAudio.tsx",
);
const mainPagePath = path.join(repoRoot, "src/app/cho-neo/page.tsx");
const layoutPath = path.join(repoRoot, "src/app/cho-neo/layout.tsx");
const villageShellPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoVillageShell.tsx",
);
const ongDiaPagePath = path.join(repoRoot, "src/app/cho-neo/ong-dia/page.tsx");
const musicPath = path.join(
  repoRoot,
  "public/Cho_Neo_music/cho-neo-main-theme-vietnamese-style-1.mp3",
);

const player = fs.readFileSync(playerPath, "utf8");
const mainPage = fs.readFileSync(mainPagePath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");
const villageShell = fs.readFileSync(villageShellPath, "utf8");
const ongDiaPage = fs.readFileSync(ongDiaPagePath, "utf8");

function extractTrackEntries(source) {
  const start = source.indexOf("const CHO_NEO_THEME_TRACKS");
  assert.notEqual(start, -1, "central Chợ Neo theme playlist should exist");
  const arrayStart = source.indexOf("[", start);
  const arrayEnd = source.indexOf("];", arrayStart);
  assert.notEqual(arrayStart, -1);
  assert.notEqual(arrayEnd, -1);
  return source.slice(arrayStart, arrayEnd + 1);
}

test("Chợ Neo theme player starts with Vietnamese Style 1 main theme", () => {
  const tracks = extractTrackEntries(player);
  const firstTrack = tracks.slice(tracks.indexOf("{"), tracks.indexOf("},") + 1);

  assert.match(firstTrack, /id: 'main-theme-vietnamese-style-1'/);
  assert.match(firstTrack, /label: 'Chợ Neo – Vietnamese Style 1'/);
  assert.match(firstTrack, /artist: 'VIKAMICANADA AI Music'/);
  assert.match(
    firstTrack,
    /src: '\/Cho_Neo_music\/cho-neo-main-theme-vietnamese-style-1\.mp3'/,
  );
  assert.match(player, /useState\(CHO_NEO_THEME_TRACKS\[0\]\.id\)/);
});

test("Chợ Neo theme player preserves existing central playlist entries", () => {
  const tracks = extractTrackEntries(player);

  assert.match(tracks, /id: 'top-1-main-theme-3'/);
  assert.match(
    tracks,
    /src: '\/Cho_Neo_music\/cho-neo-theme-park-top-1-main-theme-3\.mp3'/,
  );
  assert.match(tracks, /id: 'runner-up-sky-lift'/);
  assert.match(
    tracks,
    /src: '\/Cho_Neo_music\/cho-neo-theme-park-runner-up-sky-lift\.mp3'/,
  );
});

test("Chợ Neo theme player keeps user-initiated playback behavior", () => {
  assert.match(player, /preload="metadata"/);
  assert.match(player, /aria-pressed=\{isPlaying\}/);
  assert.match(player, /audio\.volume = volume/);
  assert.match(player, /setIsPlaying\(false\)/);
  assert.equal(player.includes("autoPlay"), false);
});

test("Chợ Neo route layout uses one shared theme player through room navigation", () => {
  assert.match(
    layout,
    /import ChoNeoThemeParkAudio from "@\/components\/cho-neo\/ChoNeoThemeParkAudio";/,
  );
  assert.match(layout, /<ChoNeoThemeParkAudio \/>/);
  assert.match(layout, /\{children\}/);
  assert.doesNotMatch(mainPage, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(villageShell, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(ongDiaPage, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(mainPage, /cho-neo-main-theme-vietnamese-style-1\.mp3/);
});

test("Chợ Neo Vietnamese Style 1 MP3 exists in public music assets", () => {
  const stat = fs.statSync(musicPath);
  assert.equal(stat.isFile(), true);
  assert.ok(stat.size > 1024, "MP3 asset should not be empty");
});
