# Chợ Neo Interaction Language v1.0 Pre-Loop Manifest

Date and time: 2026-07-12 11:30:38 MDT

## Git Safety Record

- Original branch: `feat/cho-neo-header-polish`
- Original HEAD SHA: `6ba95b6b953f75c0f3e88d966209e1b43a1542c8`
- Backup branch: `backup/cho-neo-interaction-language-pre-v1`
- Backup branch HEAD: `6ba95b6 Replace Quán Tám lobby artwork`
- Stash created for this mission: none
- Existing stashes before this mission:
  - `stash@{0}: On main: park cho neo music beta map workspace before ong dia groq voice polish`
  - `stash@{1}: On main: park cho neo music beta map workspace before ong dia groq voice polish`
  - `stash@{2}: On main: safety stash before ChoNeo world gates`

## Working Tree Status Before Loop 1 Docs

Tracked modifications and deletions already present:

```text
 M .gitignore
 D public/images/cho-neo/quan-tam-gossip-cafe-room-modern-warm-final.png
 M src/app/api/cho-neo/ong-dia/prayer/route.ts
 M src/app/cho-neo/gossip/page.tsx
 M src/app/cho-neo/market/page.tsx
 D src/app/cho-neo/ong-dia/OngDiaPlaceholder.ts
 D src/app/cho-neo/ong-dia/OngDiaThreeLayer.tsx
 M src/app/cho-neo/ong-dia/page.tsx
 M src/app/cho-neo/page.tsx
 M src/app/cho-neo/shrine/page.tsx
 M src/app/xin-xam/page.tsx
 M src/components/cho-neo/ChoNeoCommunityNoteRoom.tsx
 D src/components/cho-neo/ChoNeoMusicOverlay.tsx
 M src/components/cho-neo/ChoNeoRoomHotspot.tsx
 M src/components/cho-neo/ChoNeoThemeParkAudio.tsx
 M src/components/cho-neo/ChoNeoTimeAmbience.tsx
 M src/components/cho-neo/ChoNeoVillageMap.tsx
 M src/components/cho-neo/ChoNeoVillageShell.tsx
 M src/lib/cho-neo/rooms.ts
 M tsconfig.json
```

Untracked files already present:

```text
README_ATTACH_CHO_NEO_MUSIC.md
public/Cho_Neo_music/*.mp3
public/images/cho-neo/Archive/
public/images/cho-neo/Avatar-Map.png
public/images/cho-neo/Ban Rieng Jun 24, 2026, 11_32_01 PM.png
public/images/cho-neo/Ban Yen Jun 24, 2026, 11_43_00 PM.png
public/images/cho-neo/Ong-Dia-Shrine.png
public/images/cho-neo/Ong_Dia_Shrine.png
public/images/cho-neo/Xin-Xam-Room.png
scripts/
src/app/api/cho-neo/beta-feedback/
src/app/cho-neo/layout.tsx
src/app/cho-neo/ong-dia/_archive/
src/app/cho-neo/page.tsx.bak.cho-neo-music
src/components/cho-neo/ChoNeoBetaFeedback.tsx
src/lib/cho-neo/beta-analytics.ts
src/lib/cho-neo/ong-dia-ritual.ts
```

Loop 1 did not stash this work because the audit adds documentation only and does not need to move, overwrite, or edit the existing dirty files.

## Active Chợ Neo Routes Discovered

- `/cho-neo` - Sân Làng / village map
- `/cho-neo/gossip` - Quán Tám, active local tables, Bàn Màu, and Quầy Xã Giao
- `/cho-neo/avatar` - Chợ Neo Passport / avatar identity
- `/cho-neo/ong-dia` - Bàn Ông Địa
- `/cho-neo/show-off` - Khoe Set Đẹp / Phòng Trưng Bày
- `/xin-xam` - Xin Xăm
- `/cho-neo/market`
- `/cho-neo/shrine`
- `/cho-neo/ask-help`
- `/cho-neo/owner-corner`
- `/cho-neo/technique`
- `/cho-neo/pho-cho`
- `/cho-neo/waterfront`
- `/cho-neo/world` and continent child routes
- Supporting account/profile routes: `/login`, `/profile`

## Relevant Source Files

- `src/app/cho-neo/page.tsx`
- `src/app/cho-neo/layout.tsx`
- `src/components/cho-neo/ChoNeoVillageShell.tsx`
- `src/components/cho-neo/ChoNeoVillageMap.tsx`
- `src/components/cho-neo/ChoNeoRoomHotspot.tsx`
- `src/components/cho-neo/ChoNeoBottomNav.tsx`
- `src/components/cho-neo/ChoNeoThemeParkAudio.tsx`
- `src/components/cho-neo/ChoNeoBetaFeedback.tsx`
- `src/app/cho-neo/ong-dia/page.tsx`
- `src/app/cho-neo/gossip/page.tsx`
- `src/app/cho-neo/avatar/page.tsx`
- `src/app/cho-neo/show-off/page.tsx`
- `src/components/cho-neo/ChoNeoCommunityNoteRoom.tsx`
- `src/app/xin-xam/page.tsx`
- `src/lib/cho-neo/rooms.ts`
- `src/lib/cho-neo/avatar-identity.ts`
- `src/lib/cho-neo/ong-dia-prayer.ts`
- `src/lib/cho-neo/ong-dia-ritual.ts`
- `src/lib/cho-neo/xin-xam-sticky.ts`
- `src/lib/cho-neo/gossip-front-counter.ts`

## Relevant Shared Components

- `ChoNeoVillageShell`
- `ChoNeoVillageMap`
- `ChoNeoRoomHotspot`
- `ChoNeoBottomNav`
- `ChoNeoThemeParkAudio`
- `ChoNeoBetaFeedback`
- `ChoNeoCommunityNoteRoom`
- Avatar identity helpers in `src/lib/cho-neo/avatar-identity.ts`

## Relevant Styles

Most Chợ Neo room styling is colocated in page/component-level `<style jsx>` blocks rather than a single shared stylesheet. Shared interaction styling currently lives inside:

- `src/components/cho-neo/ChoNeoVillageShell.tsx`
- `src/components/cho-neo/ChoNeoVillageMap.tsx`
- `src/components/cho-neo/ChoNeoRoomHotspot.tsx`
- `src/components/cho-neo/ChoNeoThemeParkAudio.tsx`
- `src/components/cho-neo/ChoNeoBetaFeedback.tsx`
- `src/app/cho-neo/gossip/page.tsx`
- `src/app/cho-neo/ong-dia/page.tsx`
- `src/app/xin-xam/page.tsx`
- `src/app/cho-neo/show-off/page.tsx`

## Rollback Instructions

To undo only Loop 1 documentation after review:

```bash
git restore docs/cho-neo-interaction-language-v1.md docs/archive/cho-neo-interaction-language-pre-v1-manifest.md
```

If these docs are untracked and `git restore` does not remove them:

```bash
rm docs/cho-neo-interaction-language-v1.md docs/archive/cho-neo-interaction-language-pre-v1-manifest.md
```

To return the branch pointer to the pre-mission committed checkpoint without touching the current dirty worktree, use the backup branch as a reference:

```bash
git show backup/cho-neo-interaction-language-pre-v1
```

Do not run `git reset --hard` in this workspace unless Bao explicitly approves, because unrelated dirty work predates this mission.
