"use client";

import { useEffect, useRef, useState } from "react";

const MUSIC_PREFERENCE_KEY = "choNeoVillageMusicPreferenceV1";
const MUSIC_SRC = "/audio/cho-neo-village-ambient.mp3";
const DEFAULT_VOLUME = 0.22;

type MusicState = "idle" | "playing" | "paused" | "unavailable";

export function ChoNeoMusicOverlay() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [musicState, setMusicState] = useState<MusicState>("idle");
  const [prefersMusic, setPrefersMusic] = useState(false);
  const [notice, setNotice] = useState(
    "Nhạc đang tắt. Bấm mới mở. / Music is off. Tap to start."
  );

  useEffect(() => {
    const audio = new Audio(MUSIC_SRC);
    audio.loop = true;
    audio.volume = DEFAULT_VOLUME;
    audio.preload = "none";
    audioRef.current = audio;

    try {
      setPrefersMusic(
        window.localStorage.getItem(MUSIC_PREFERENCE_KEY) === "on"
      );
    } catch {
      setPrefersMusic(false);
    }

    function handleAudioError() {
      setMusicState("unavailable");
      setNotice(
        "Chưa có file nhạc làng, giao diện vẫn dùng bình thường. / Ambient file is missing, but the village still works."
      );
    }

    audio.addEventListener("error", handleAudioError);

    return () => {
      audio.pause();
      audio.removeEventListener("error", handleAudioError);
      audioRef.current = null;
    };
  }, []);

  async function toggleMusic() {
    const audio = audioRef.current;

    if (!audio || musicState === "unavailable") {
      setMusicState("unavailable");
      setNotice(
        "Chưa có file nhạc làng, giao diện vẫn dùng bình thường. / Ambient file is missing, but the village still works."
      );
      return;
    }

    if (!audio.paused) {
      audio.pause();
      setMusicState("paused");
      setPrefersMusic(false);
      setNotice("Nhạc làng đã tắt. / Village music is off.");
      rememberMusicPreference("off");
      return;
    }

    try {
      audio.volume = DEFAULT_VOLUME;
      await audio.play();
      setMusicState("playing");
      setPrefersMusic(true);
      setNotice("Nhạc làng đang mở nhỏ. / Village music is playing softly.");
      rememberMusicPreference("on");
    } catch {
      setMusicState("unavailable");
      setPrefersMusic(false);
      setNotice(
        "Không mở được nhạc lúc này. Có thể file placeholder chưa có. / Music could not start; the placeholder file may be missing."
      );
      rememberMusicPreference("off");
    }
  }

  const isPlaying = musicState === "playing";
  const buttonCopy = isPlaying
    ? {
        vi: "Tắt nhạc làng",
        en: "Turn music off",
      }
    : prefersMusic
      ? {
          vi: "Mở lại nhạc làng",
          en: "Start saved music",
        }
      : {
          vi: "Mở nhạc làng",
          en: "Start village music",
        };

  return (
    <aside
      className={`music-overlay music-overlay-${musicState}`}
      aria-label="Nhạc nền Chợ Neo"
    >
      <button
        aria-pressed={isPlaying}
        className={isPlaying ? "music-button music-button-on" : "music-button"}
        onClick={toggleMusic}
        type="button"
      >
        <span className="music-icon" aria-hidden="true">
          {isPlaying ? "♪" : "♩"}
        </span>
        <span>
          {buttonCopy.vi}
          <small>{buttonCopy.en}</small>
        </span>
      </button>
      <p>{notice}</p>

      <style>{`
        .music-overlay {
          position: relative;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          max-width: calc(100vw - 28px);
          padding: 4px 6px 4px 4px;
          border: 1px solid rgba(253, 230, 138, 0.24);
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.055)),
            rgba(72, 45, 44, 0.78);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(14px);
        }

        .music-button {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr);
          gap: 6px;
          align-items: center;
          min-height: 30px;
          width: auto;
          border: 0;
          border-radius: 999px;
          padding: 3px 8px 3px 3px;
          color: #111827;
          background: #fde68a;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 950;
          line-height: 1.15;
          text-align: left;
        }

        .music-button-on {
          background: linear-gradient(180deg, #fef3c7, #fbbf24);
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.28);
        }

        .music-icon {
          display: grid;
          place-items: center;
          height: 24px;
          width: 24px;
          border-radius: 999px;
          color: #fff7ed;
          background: #111827;
          font-size: 14px;
        }

        .music-button small {
          display: block;
          margin-top: 0;
          color: rgba(17, 24, 39, 0.64);
          font-size: 9px;
          font-weight: 850;
        }

        .music-overlay p {
          display: none;
          max-width: 150px;
          margin: 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 10px;
          font-weight: 800;
          line-height: 1.25;
        }

        .music-overlay-unavailable p {
          display: block;
        }

        @media (max-width: 640px) {
          .music-overlay {
            max-width: calc(100vw - 24px);
          }

          .music-overlay p {
            display: none;
          }
        }
      `}</style>
    </aside>
  );
}

function rememberMusicPreference(value: "on" | "off") {
  try {
    window.localStorage.setItem(MUSIC_PREFERENCE_KEY, value);
  } catch {
    // Music preference is a local convenience only.
  }
}
