#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const playlistPath = path.join(repoRoot, "src/lib/cho-neo/music-playlist.ts");
const playerPath = path.join(repoRoot, "src/components/cho-neo/ChoNeoThemeParkAudio.tsx");
const villageShellPath = path.join(repoRoot, "src/components/cho-neo/ChoNeoVillageShell.tsx");
const layoutPath = path.join(repoRoot, "src/app/cho-neo/layout.tsx");
const ongDiaPagePath = path.join(repoRoot, "src/app/cho-neo/ong-dia/page.tsx");

const playlist = fs.readFileSync(playlistPath, "utf8");
const player = fs.readFileSync(playerPath, "utf8");
const villageShell = fs.readFileSync(villageShellPath, "utf8");
const layout = fs.readFileSync(layoutPath, "utf8");
const ongDiaPage = fs.readFileSync(ongDiaPagePath, "utf8");

function readString(block, key) {
  const match = block.match(new RegExp(`${key}: \"([^\"]+)\"`));
  assert.ok(match, `missing ${key}`);
  return match[1];
}

function readNumber(block, key) {
  const match = block.match(new RegExp(`${key}: ([0-9]+)`));
  assert.ok(match, `missing ${key}`);
  return Number(match[1]);
}

function readBoolean(block, key) {
  const match = block.match(new RegExp(`${key}: (true|false)`));
  assert.ok(match, `missing ${key}`);
  return match[1] === "true";
}

function extractTracks() {
  const arrayMatch = playlist.match(/export const CHO_NEO_MUSIC_PLAYLIST = \[([\s\S]+?)\] as const/);
  assert.ok(arrayMatch, "playlist array should exist");
  return [...arrayMatch[1].matchAll(/\{\n([\s\S]*?)\n  \}/g)].map((match) => {
    const block = match[1];
    return {
      id: readString(block, "id"),
      title: readString(block, "title"),
      src: readString(block, "src"),
      mood: readString(block, "mood"),
      room: readString(block, "room"),
      duration: readString(block, "duration"),
      enabled: readBoolean(block, "enabled"),
      order: readNumber(block, "order"),
    };
  });
}

const tracks = extractTracks();
const enabledTracks = tracks.filter((track) => track.enabled).sort((a, b) => a.order - b.order);

test("Chợ Neo music playlist has exactly Bao's 17 enabled tracks in deterministic order", () => {
  assert.equal(enabledTracks.length, 17);
  assert.deepEqual(
    enabledTracks.map((track) => track.order),
    Array.from({ length: 17 }, (_, index) => index + 1),
  );
  assert.deepEqual(enabledTracks.map((track) => track.title), [
    "Chợ Neo — Vietnamese Style 1",
    "Chợ Neo Main Theme",
    "Sky Lift",
    "Chợ Neo — Vietnamese Style, Bản Gốc",
    "Chợ Neo — Vietnamese Style 2",
    "Chợ Neo — Vietnamese Style 3",
    "Chợ Neo Lounge — Bản 1",
    "Chợ Neo Lounge — Bản 2",
    "Bàn Chuyện Nghề — Bản 1",
    "Bàn Chuyện Nghề — Bản 2",
    "Bàn Chuyện Nghề — Bản 3",
    "Bàn Chuyện Nghề — Bản 4",
    "Bàn Chuyện Nghề — Tay Nghề, Tay Thương",
    "Quán Tám — Kể Nghe Coi",
    "Quán Tám — Kể Nghe Coi, Solo 1",
    "Quán Tám — Kể Nghe Coi, Solo 2",
    "Ông Địa — Đất Ấm, Lộc Về",
  ]);
});

test("Chợ Neo playlist entries are unique and point to real audio files", () => {
  assert.equal(new Set(enabledTracks.map((track) => track.id)).size, enabledTracks.length);
  assert.equal(new Set(enabledTracks.map((track) => track.src)).size, enabledTracks.length);

  for (const track of enabledTracks) {
    assert.ok(track.title.trim(), `${track.id} should have a title`);
    assert.doesNotMatch(track.title, /\.mp3|Cho Neo Music|Ban Chuyen Nghe/i);
    assert.ok(track.mood.trim(), `${track.id} should have a mood`);
    assert.ok(track.room.trim(), `${track.id} should have a room`);
    assert.match(track.duration, /^[0-9]+:[0-5][0-9]$/);
    assert.ok(fs.existsSync(path.join(repoRoot, "public", decodeURI(track.src.replace(/^\//, "")))), track.src);
  }
});

test("Chợ Neo V1 keeps canonical duplicate decisions", () => {
  assert.doesNotMatch(playlist, /Cho Neo Music - lounge 1\.mp3/);
  assert.doesNotMatch(playlist, /Chợ Neo Main Theme - Sky Lift\.mp3/);
  assert.doesNotMatch(playlist, /Chợ Neo Main Theme \(3\)\.mp3/);

  const hashes = enabledTracks.map((track) => {
    const filePath = path.join(repoRoot, "public", decodeURI(track.src.replace(/^\//, "")));
    const file = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(file).digest("hex");
  });
  assert.equal(new Set(hashes).size, hashes.length);
});

test("Danh sách nhạc Chợ Neo lives in the shared circular button panel", () => {
  assert.doesNotMatch(villageShell, /ChoNeoMusicLibrary/);
  assert.match(player, /Danh sách nhạc Chợ Neo/);
  assert.match(player, /theme-music-panel/);
  assert.match(player, /theme-current-track/);
  assert.match(player, /theme-playback-row/);
  assert.match(player, /theme-song-list/);
  assert.match(player, /enabledChoNeoMusicTracks\.map/);
  assert.match(player, /aria-expanded=\{isPanelOpen\}/);
  assert.match(player, /aria-label="Mở danh sách nhạc Chợ Neo"/);
  assert.match(player, /onClick=\{\(\) => selectTrack\(track\.id, true\)\}/);
  assert.match(player, /selectAdjacentTrack\('previous'\)/);
  assert.match(player, /selectAdjacentTrack\('next'\)/);
  assert.match(player, /onClick=\{toggleMusic\}/);
  assert.match(player, /⏮/);
  assert.match(player, /▶/);
  assert.match(player, /Ⅱ/);
  assert.match(player, /⏭/);
  assert.match(player, /className="theme-volume-toggle"/);
  assert.match(player, /className="theme-song-duration"/);
  assert.match(player, /className=\{isTrackPlaying \? 'theme-song-action playing' : 'theme-song-action'\}/);
  assert.doesNotMatch(player, /theme-current-label/);
  assert.doesNotMatch(player, /theme-current-status/);
  assert.doesNotMatch(player, /<select/);
});

test("Chợ Neo keeps one shared layout-level player and no autoplay", () => {
  assert.match(layout, /<ChoNeoThemeParkAudio className="cho-neo-layout-theme-audio" \/>/);
  assert.doesNotMatch(villageShell, /ChoNeoThemeParkAudio/);
  assert.doesNotMatch(ongDiaPage, /ChoNeoThemeParkAudio/);
  assert.match(villageShell, /data-cho-neo-shared-music-slot/);
  assert.match(ongDiaPage, /data-cho-neo-shared-music-slot/);
  assert.match(player, /createPortal\(player, portalTarget\)/);
  assert.match(player, /CHO_NEO_MUSIC_SELECTED_TRACK_KEY/);
  assert.match(player, /CHO_NEO_MUSIC_VOLUME_KEY/);
  assert.match(player, /preload="metadata"/);
  assert.doesNotMatch(player, /<audio[^>]*loop/);
  assert.equal(player.includes("autoPlay"), false);
});

test("production public music folder contains only the 17 referenced V1 tracks", () => {
  const musicDir = path.join(repoRoot, "public/Cho_Neo_music");
  const files = fs.readdirSync(musicDir).filter((file) => file.endsWith(".mp3")).sort();
  const normalizedFiles = files.map((file) => file.normalize("NFC")).sort();
  const referencedFiles = enabledTracks
    .map((track) => decodeURI(track.src.replace(/^\/Cho_Neo_music\//, "")))
    .map((file) => file.normalize("NFC"))
    .sort();

  assert.equal(files.length, 17);
  assert.deepEqual(normalizedFiles, referencedFiles);

  const hashes = files.map((file) => {
    const contents = fs.readFileSync(path.join(musicDir, file));
    return crypto.createHash("sha256").update(contents).digest("hex");
  });
  assert.equal(new Set(hashes).size, hashes.length);
});

test("Chợ Neo playback behavior preserves position on pause and restarts on song change", () => {
  assert.match(player, /function pauseMusic\(\) \{\n    stopAutoAdvance\(\);\n    audioRef\.current\?\.pause\(\);\n    setIsPlaying\(false\);/);
  assert.match(player, /audio\.currentTime = 0/);
  assert.match(player, /\}, \[selectedTrack\.src\]\)/);
  assert.match(player, /\}, \[isPlaying, portalTarget\]\)/);
  assert.match(player, /Không mở được:/);
});

test("Chợ Neo shared player advances naturally and guards automatic failure loops", () => {
  assert.match(player, /onEnded=\{handleAudioEnded\}/);
  assert.match(player, /function handleAudioEnded\(\) \{\n    advanceToNextTrack\(true\);/);
  assert.match(player, /onError=\{handleAudioError\}/);
  assert.match(player, /getAdjacentChoNeoMusicTrack\(latestTrackRef\.current\.id, 'next'\)/);
  assert.match(player, /autoAdvanceRef = useRef\(\{ active: false, skips: 0 \}\)/);
  assert.match(player, /autoAdvanceRef\.current\.skips >= 1/);
  assert.match(player, /Đang thử bài kế tiếp/);
  assert.match(player, /stopAutoAdvance\(\);\n    audioRef\.current\?\.pause\(\);/);
});

test("compact music list uses icon controls instead of repeated action text", () => {
  assert.match(player, /className="theme-control-icon-button/);
  assert.match(player, /theme-panel-controls[\s\S]*grid-template-columns: repeat\(3/);
  assert.match(player, /border-radius: 999px/);
  assert.match(player, /title="Bài trước"/);
  assert.match(player, /title="Bài kế tiếp"/);
  assert.match(player, /role="group" aria-label="Âm lượng nhạc Chợ Neo"/);
  assert.match(player, /aria-label=\{volume > 0 \? 'Tắt âm lượng nhạc Chợ Neo' : 'Bật âm lượng nhạc Chợ Neo'\}/);
  assert.match(player, /className=\{isTrackPlaying \? 'theme-song-action playing' : 'theme-song-action'\}/);
  assert.match(player, /<strong title=\{track\.title\}>\{track\.title\}<\/strong>/);
  assert.match(player, /<span className="theme-song-duration">\{track\.duration\}<\/span>/);
  assert.match(player, /white-space: nowrap/);
  assert.match(player, /text-overflow: ellipsis/);
  assert.doesNotMatch(player, />Phát<\/button>/);
  assert.doesNotMatch(player, />Tạm dừng<\/button>/);
  assert.doesNotMatch(player, />Âm lượng</);
});
