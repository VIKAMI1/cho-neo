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
const playlistPath = path.join(repoRoot, "src/lib/cho-neo/music-playlist.ts");
const mainPagePath = path.join(repoRoot, "src/app/cho-neo/page.tsx");
const layoutPath = path.join(repoRoot, "src/app/cho-neo/layout.tsx");
const rootLayoutPath = path.join(repoRoot, "src/app/layout.tsx");
const persistentMusicPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoPersistentMusic.tsx",
);
const villageShellPath = path.join(
  repoRoot,
  "src/components/cho-neo/ChoNeoVillageShell.tsx",
);
const ongDiaPagePath = path.join(repoRoot, "src/app/cho-neo/ong-dia/page.tsx");
const xinXamPagePath = path.join(repoRoot, "src/app/xin-xam/page.tsx");
const musicPath = path.join(
  repoRoot,
  "public/Cho_Neo_music/cho-neo-main-theme-vietnamese-style-1.mp3",
);

const player = fs.readFileSync(playerPath, "utf8");
const playlist = fs.readFileSync(playlistPath, "utf8");
const mainPage = fs.readFileSync(mainPagePath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");
const rootLayout = fs.readFileSync(rootLayoutPath, "utf8");
const persistentMusic = fs.readFileSync(persistentMusicPath, "utf8");
const villageShell = fs.readFileSync(villageShellPath, "utf8");
const ongDiaPage = fs.readFileSync(ongDiaPagePath, "utf8");
const xinXamPage = fs.readFileSync(xinXamPagePath, "utf8");

test("Chợ Neo theme player starts with Vietnamese Style 1 main theme", () => {
  assert.match(playlist, /id: "main-theme-vietnamese-style-1"/);
  assert.match(playlist, /title: "Chợ Neo — Vietnamese Style 1"/);
  assert.match(
    playlist,
    /src: "\/Cho_Neo_music\/cho-neo-main-theme-vietnamese-style-1\.mp3"/,
  );
  assert.match(playlist, /order: 1/);
  assert.match(player, /useState\(getStoredTrackId\)/);
});

test("Chợ Neo theme player preserves existing central playlist entries", () => {
  assert.match(playlist, /id: "top-1-main-theme-3"/);
  assert.match(
    playlist,
    /src: "\/Cho_Neo_music\/cho-neo-theme-park-top-1-main-theme-3\.mp3"/,
  );
  assert.match(playlist, /id: "runner-up-sky-lift"/);
  assert.match(
    playlist,
    /src: "\/Cho_Neo_music\/cho-neo-theme-park-runner-up-sky-lift\.mp3"/,
  );
  assert.doesNotMatch(player, /const CHO_NEO_THEME_TRACKS/);
});

test("Chợ Neo theme player keeps user-initiated playback behavior", () => {
  assert.match(player, /preload="metadata"/);
  assert.doesNotMatch(player, /<audio[^>]*loop/);
  assert.match(player, /aria-pressed=\{isPlaying\}/);
  assert.match(player, /audio\.volume = volume/);
  assert.match(player, /setIsPlaying\(false\)/);
  assert.match(player, /audio\.currentTime = 0/);
  assert.equal(player.includes("autoPlay"), false);
});

test("Root layout keeps one shared theme player through Chợ Neo and Xin Xăm navigation", () => {
  assert.match(
    rootLayout,
    /import \{ ChoNeoPersistentMusic \} from "@\/components\/cho-neo\/ChoNeoPersistentMusic";/,
  );
  assert.match(rootLayout, /<ChoNeoPersistentMusic \/>/);
  assert.match(
    persistentMusic,
    /import ChoNeoThemeParkAudio from "\.\/ChoNeoThemeParkAudio";/,
  );
  assert.match(persistentMusic, /pathname === "\/xin-xam" \|\| pathname\?\.startsWith\("\/cho-neo"\)/);
  assert.match(persistentMusic, /<ChoNeoThemeParkAudio className="cho-neo-layout-theme-audio" \/>/);
  assert.doesNotMatch(layout, /ChoNeoThemeParkAudio/);
  assert.match(layout, /<ChoNeoMemberProvider>\{children\}<\/ChoNeoMemberProvider>/);
  assert.match(layout, /\{children\}/);
  assert.match(player, /document\.querySelector\('\[data-cho-neo-shared-music-slot\]'\)/);
  assert.match(player, /createPortal\(player, portalTarget\)/);
  assert.match(villageShell, /data-cho-neo-shared-music-slot/);
  assert.match(ongDiaPage, /data-cho-neo-shared-music-slot/);
  assert.match(xinXamPage, /data-cho-neo-shared-music-slot/);
  assert.match(xinXamPage, /data-cho-neo-music-presentation="rect"/);
  assert.match(player, /\.cho-neo-layout-theme-audio[\s\S]*border-radius: 999px/);
  assert.doesNotMatch(player, /theme-track-select-label/);
  assert.doesNotMatch(mainPage, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(villageShell, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(ongDiaPage, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(xinXamPage, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(mainPage, /cho-neo-main-theme-vietnamese-style-1\.mp3/);
});

test("Chợ Neo shared music control opens the canonical 17-song panel", () => {
  assert.match(player, /className="theme-music-toggle"/);
  assert.match(player, /setIsPanelOpen\(\(open\) => !open\)/);
  assert.match(player, /aria-expanded=\{isPanelOpen\}/);
  assert.match(player, /aria-controls=\{panelId\}/);
  assert.match(player, /\{isRectPresentation \? '♪' : isPlaying \? 'Ⅱ' : '♪'\}/);
  assert.match(player, /Danh sách nhạc Chợ Neo/);
  assert.match(player, /theme-music-panel/);
  assert.match(player, /theme-playback-row/);
  assert.match(player, /theme-song-list/);
  assert.match(player, /enabledChoNeoMusicTracks\.map/);
  assert.match(player, /aria-current=\{isSelected \? 'true' : undefined\}/);
  assert.match(player, /onClick=\{\(\) => selectTrack\(track\.id, true\)\}/);
  assert.match(player, /onEnded=\{handleAudioEnded\}/);
  assert.match(player, /advanceToNextTrack\(true\)/);
  assert.match(player, /className="theme-control-icon-button/);
  assert.match(player, /className="theme-volume-toggle"/);
  assert.match(player, /className="theme-song-duration"/);
  assert.match(player, /className=\{isTrackPlaying \? 'theme-song-action playing' : 'theme-song-action'\}/);
  assert.doesNotMatch(player, />Phát<\/button>/);
  assert.doesNotMatch(player, /theme-current-status/);
  assert.doesNotMatch(player, /<select/);
  assert.match(player, /CHO_NEO_MUSIC_COMMAND_EVENT/);
  assert.match(player, /getAdjacentChoNeoMusicTrack/);
  assert.match(player, /\}, \[isPlaying, portalTarget\]\)/);
});

test("Chợ Neo Vietnamese Style 1 MP3 exists in public music assets", () => {
  const stat = fs.statSync(musicPath);
  assert.equal(stat.isFile(), true);
  assert.ok(stat.size > 1024, "MP3 asset should not be empty");
});
