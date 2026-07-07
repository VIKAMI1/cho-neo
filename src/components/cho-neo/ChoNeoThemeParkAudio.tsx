'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ChoNeoThemeTrack = {
  id: string;
  label: string;
  src: string;
};

const CHO_NEO_THEME_TRACKS: ChoNeoThemeTrack[] = [
  {
    id: 'top-1-main-theme-3',
    label: 'Chợ Neo Main Theme',
    src: '/Cho_Neo_music/cho-neo-theme-park-top-1-main-theme-3.mp3',
  },
  {
    id: 'runner-up-sky-lift',
    label: 'Sky Lift',
    src: '/Cho_Neo_music/cho-neo-theme-park-runner-up-sky-lift.mp3',
  },
];

export default function ChoNeoThemeParkAudio({
  className = '',
}: {
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackId, setTrackId] = useState(CHO_NEO_THEME_TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.34);

  const selectedTrack = useMemo(
    () => CHO_NEO_THEME_TRACKS.find((track) => track.id === trackId) ?? CHO_NEO_THEME_TRACKS[0],
    [trackId],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.load();

    if (!isPlaying) return;

    audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, [selectedTrack.src]);

  async function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-[min(92vw,22rem)] rounded-3xl border border-amber-200/60 bg-stone-950/78 px-4 py-3 text-amber-50 shadow-2xl shadow-black/30 backdrop-blur-md ${className}`}
      aria-label="Chợ Neo music player"
    >
      <audio ref={audioRef} loop preload="metadata" playsInline>
        <source src={selectedTrack.src} type="audio/mpeg" />
      </audio>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-[0.2em] text-amber-200/80">Nhạc Chợ Neo</p>
          <p className="truncate text-sm font-semibold">{selectedTrack.label}</p>
        </div>

        <button
          type="button"
          onClick={toggleMusic}
          className="shrink-0 rounded-full bg-amber-300 px-4 py-2 text-sm font-bold text-stone-950 shadow-lg shadow-amber-950/20 transition hover:bg-amber-200"
          aria-pressed={isPlaying}
        >
          {isPlaying ? 'Tạm dừng' : 'Mở nhạc'}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3 text-xs text-amber-100/80">
        <label className="flex min-w-0 items-center gap-2">
          <span className="shrink-0">Bài</span>
          <select
            value={trackId}
            onChange={(event) => setTrackId(event.target.value)}
            className="min-w-0 flex-1 rounded-full border border-amber-200/30 bg-stone-900/90 px-3 py-1.5 text-amber-50 outline-none"
            aria-label="Choose Chợ Neo music track"
          >
            {CHO_NEO_THEME_TRACKS.map((track) => (
              <option key={track.id} value={track.id}>
                {track.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span>Âm</span>
          <input
            type="range"
            min="0"
            max="0.7"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            className="w-20 accent-amber-300"
            aria-label="Chợ Neo music volume"
          />
        </label>
      </div>
    </div>
  );
}
