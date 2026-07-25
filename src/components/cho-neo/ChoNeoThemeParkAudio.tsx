'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ChoNeoThemeTrack = {
  id: string;
  label: string;
  artist: string;
  src: string;
};

const CHO_NEO_THEME_TRACKS: ChoNeoThemeTrack[] = [
  {
    id: 'main-theme-vietnamese-style-1',
    label: 'Chợ Neo – Vietnamese Style 1',
    artist: 'VIKAMICANADA AI Music',
    src: '/Cho_Neo_music/cho-neo-main-theme-vietnamese-style-1.mp3',
  },
  {
    id: 'top-1-main-theme-3',
    label: 'Chợ Neo Main Theme',
    artist: 'VIKAMICANADA AI Music',
    src: '/Cho_Neo_music/cho-neo-theme-park-top-1-main-theme-3.mp3',
  },
  {
    id: 'runner-up-sky-lift',
    label: 'Sky Lift',
    artist: 'VIKAMICANADA AI Music',
    src: '/Cho_Neo_music/cho-neo-theme-park-runner-up-sky-lift.mp3',
  },
];

export default function ChoNeoThemeParkAudio({
  className = '',
  variant = 'full',
}: {
  className?: string;
  variant?: 'full' | 'compact';
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackId, setTrackId] = useState(CHO_NEO_THEME_TRACKS[0].id);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume] = useState(0.34);

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
      className={`cho-neo-theme-audio ${
        variant === 'compact' ? 'cho-neo-theme-audio-compact' : ''
      } ${className}`}
      aria-label="Chợ Neo music player"
    >
      <audio ref={audioRef} loop preload="metadata" playsInline>
        <source src={selectedTrack.src} type="audio/mpeg" />
      </audio>

      {variant === 'compact' ? (
        <button
          type="button"
          className="theme-music-compact-toggle"
          onClick={toggleMusic}
          aria-label={isPlaying ? 'Tắt nhạc Chợ Neo' : 'Mở nhạc Chợ Neo'}
          aria-pressed={isPlaying}
        >
          {isPlaying ? '♫ Tắt nhạc' : '♫ Mở nhạc'}
        </button>
      ) : null}

      {variant === 'full' ? (
      <div className="theme-audio-controls">
        <button
          type="button"
          className="theme-music-toggle"
          onClick={toggleMusic}
          aria-label={isPlaying ? 'Tạm dừng nhạc Chợ Neo' : 'Mở nhạc Chợ Neo'}
          aria-pressed={isPlaying}
        >
          <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '♪'}</span>
        </button>

        <label>
          <select
            value={trackId}
            onChange={(event) => setTrackId(event.target.value)}
            aria-label="Choose Chợ Neo music track"
          >
            {CHO_NEO_THEME_TRACKS.map((track) => (
              <option key={track.id} value={track.id}>
                {track.label}
              </option>
            ))}
          </select>
        </label>

      </div>
      ) : null}

      <style>{`
        .cho-neo-theme-audio,
        .cho-neo-theme-audio * {
          box-sizing: border-box;
        }

        .cho-neo-theme-audio {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          flex: 0 0 auto;
          width: auto;
          min-width: 0;
          max-width: none;
          min-height: 44px;
          padding: 5px 7px;
          overflow: visible;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 15px;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 4%, rgba(244, 114, 182, 0.12), transparent 32%),
            linear-gradient(135deg, rgba(62, 27, 57, 0.84), rgba(12, 7, 20, 0.95) 62%, rgba(7, 6, 13, 0.96));
          box-shadow:
            0 5px 14px rgba(0, 0, 0, 0.14),
            inset 0 1px 0 rgba(255, 247, 237, 0.08),
            inset 0 -1px 0 rgba(248, 211, 145, 0.06);
          backdrop-filter: blur(18px);
        }

        .cho-neo-theme-audio::before {
          display: none;
        }

        .cho-neo-layout-theme-audio {
          position: fixed;
          top: max(20px, env(safe-area-inset-top));
          right: calc(max(20px, env(safe-area-inset-right)) + 88px);
          z-index: 80;
        }

        .theme-music-toggle {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 32px;
          height: 32px;
          border: 1px solid rgba(248, 211, 145, 0.2);
          border-radius: 999px;
          padding: 0;
          color: #f8d391;
          background: rgba(255, 247, 237, 0.055);
          box-shadow:
            0 5px 12px rgba(0, 0, 0, 0.16),
            inset 0 1px 0 rgba(255, 247, 237, 0.1);
          cursor: pointer;
          font: inherit;
          font-size: 22px;
          font-weight: 850;
          line-height: 1;
        }

        .theme-music-toggle span {
          display: block;
          line-height: 1;
        }

        .cho-neo-theme-audio-compact {
          min-height: 44px;
          padding: 0;
          border: 0;
          border-radius: 12px;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
        }

        .theme-music-compact-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 104px;
          height: 44px;
          padding: 0 0.8rem;
          border: 1px solid rgba(255, 212, 139, 0.3);
          border-radius: 12px;
          color: #ffe7ae;
          background: rgba(52, 22, 12, 0.66);
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 650;
          line-height: 1;
          white-space: nowrap;
        }

        .theme-music-compact-toggle:hover,
        .theme-music-compact-toggle:focus-visible {
          border-color: rgba(255, 212, 139, 0.52);
          background: rgba(72, 31, 16, 0.78);
          outline: none;
        }

        .theme-audio-controls {
          display: grid;
          grid-template-columns: 32px minmax(180px, 1fr);
          gap: 7px;
          align-items: center;
          width: auto;
          min-width: 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: 11px;
          font-weight: 720;
        }

        .theme-audio-controls label {
          display: flex;
          align-items: center;
          min-width: 0;
        }

        .theme-audio-controls select,
        .theme-audio-controls input {
          min-width: 0;
          font: inherit;
        }

        .theme-audio-controls select {
          flex: 1 1 auto;
          width: 100%;
          min-height: 30px;
          border: 1px solid transparent;
          border-radius: 10px;
          color: #fff7ed;
          background: transparent;
          padding: 4px 7px;
          outline: none;
        }

        .theme-audio-controls select:hover,
        .theme-audio-controls select:focus-visible {
          border-color: rgba(248, 211, 145, 0.2);
          background: rgba(255, 247, 237, 0.055);
        }

        @media (max-width: 760px) {
          .cho-neo-layout-theme-audio {
            top: calc(max(12px, env(safe-area-inset-top)) + 58px);
            right: max(12px, env(safe-area-inset-right));
            left: max(12px, env(safe-area-inset-left));
          }

          .cho-neo-theme-audio:not(.cho-neo-theme-audio-compact) {
            flex: 1 1 0;
            width: 100%;
            min-width: 0;
            max-width: none;
            padding: 8px;
            border-radius: 18px;
          }

          .theme-music-toggle {
            width: 34px;
            height: 34px;
            font-size: 23px;
          }

          .theme-audio-controls {
            grid-template-columns: 34px minmax(0, 1fr);
            gap: 8px 9px;
            font-size: 12px;
          }

          .theme-audio-controls select {
            min-height: 34px;
            padding: 6px 8px;
          }

          .cho-neo-theme-audio-compact {
            flex: 0 0 auto;
            width: auto;
            min-height: 44px;
            padding: 0;
            border-radius: 12px;
          }

          .theme-music-compact-toggle {
            min-width: 102px;
            height: 44px;
            font-size: 0.84rem;
          }
        }
      `}</style>
    </div>
  );
}
