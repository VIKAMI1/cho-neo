# Attach Chợ Neo Theme Park Music

This package attaches the selected Chợ Neo theme park music to the `/cho-neo` page.

## Selected music

Top 1:
- `public/Cho_Neo_music/cho-neo-theme-park-top-1-main-theme-3.mp3`

Runner-up:
- `public/Cho_Neo_music/cho-neo-theme-park-runner-up-sky-lift.mp3`

## Install

From your local project root:

```bash
cd /Users/baonguyen/dev/cho-neo
unzip ~/Downloads/cho_neo_attach_music_to_app.zip -d .
node scripts/install-cho-neo-music.mjs
npm run dev
```

Then open `/cho-neo`.

## Behavior

- No autoplay. Music starts only after the user presses **Mở nhạc**.
- Top 1 is the default Chợ Neo theme park track.
- Runner-up is available as an alternate track.
- Volume starts softly at `0.34`, because Chợ Neo should breathe, not shout.
- The installer creates a backup: `src/app/cho-neo/page.tsx.bak.cho-neo-music`.

## Manual attach if needed

If the installer cannot safely place the component, add this import to `src/app/cho-neo/page.tsx`:

```tsx
import ChoNeoThemeParkAudio from '@/components/cho-neo/ChoNeoThemeParkAudio';
```

Then place this near the bottom of the page JSX:

```tsx
<ChoNeoThemeParkAudio />
```
