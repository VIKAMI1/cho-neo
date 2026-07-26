'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CHO_NEO_MUSIC_COMMAND_EVENT,
  CHO_NEO_MUSIC_SELECTED_TRACK_KEY,
  CHO_NEO_MUSIC_STATE_EVENT,
  CHO_NEO_MUSIC_VOLUME_KEY,
  enabledChoNeoMusicTracks,
  getAdjacentChoNeoMusicTrack,
  getChoNeoMusicTrack,
  type ChoNeoMusicCommand,
  type ChoNeoMusicState,
} from '@/lib/cho-neo/music-playlist';

function getStoredTrackId() {
  if (typeof window === 'undefined') return enabledChoNeoMusicTracks[0].id;

  const storedTrackId = window.localStorage.getItem(CHO_NEO_MUSIC_SELECTED_TRACK_KEY);
  return storedTrackId && enabledChoNeoMusicTracks.some((track) => track.id === storedTrackId)
    ? storedTrackId
    : enabledChoNeoMusicTracks[0].id;
}

function getStoredVolume() {
  if (typeof window === 'undefined') return 0.34;

  const storedVolume = Number(window.localStorage.getItem(CHO_NEO_MUSIC_VOLUME_KEY));
  return Number.isFinite(storedVolume) ? Math.min(Math.max(storedVolume, 0), 0.7) : 0.34;
}

export default function ChoNeoThemeParkAudio({
  className = '',
  variant = 'full',
}: {
  className?: string;
  variant?: 'full' | 'compact';
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const latestTrackRef = useRef(enabledChoNeoMusicTracks[0]);
  const autoAdvanceRef = useRef({ active: false, skips: 0 });
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [trackId, setTrackId] = useState(getStoredTrackId);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(getStoredVolume);
  const [loadError, setLoadError] = useState('');
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({ left: 12, top: 72 });
  const panelId = useId();

  const selectedTrack = useMemo(
    () => getChoNeoMusicTrack(trackId),
    [trackId],
  );
  latestTrackRef.current = selectedTrack;

  function stopAutoAdvance() {
    autoAdvanceRef.current = { active: false, skips: 0 };
  }

  function advanceToNextTrack(isAutomatic = false) {
    const nextTrack = getAdjacentChoNeoMusicTrack(latestTrackRef.current.id, 'next');
    latestTrackRef.current = nextTrack;
    if (isAutomatic) {
      autoAdvanceRef.current = { active: true, skips: 0 };
    } else {
      stopAutoAdvance();
    }
    setLoadError('');
    setTrackId(nextTrack.id);
    setIsPlaying(true);
  }

  function handleAutomaticPlaybackFailure(failedTrackTitle: string) {
    if (!autoAdvanceRef.current.active || autoAdvanceRef.current.skips >= 1) {
      setLoadError(`Không mở được: ${failedTrackTitle}`);
      setIsPlaying(false);
      stopAutoAdvance();
      return;
    }

    autoAdvanceRef.current = { active: true, skips: autoAdvanceRef.current.skips + 1 };
    const nextTrack = getAdjacentChoNeoMusicTrack(latestTrackRef.current.id, 'next');
    latestTrackRef.current = nextTrack;
    setLoadError(`Không mở được: ${failedTrackTitle}. Đang thử bài kế tiếp.`);
    setTrackId(nextTrack.id);
    setIsPlaying(true);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    window.localStorage.setItem(CHO_NEO_MUSIC_VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    window.localStorage.setItem(CHO_NEO_MUSIC_SELECTED_TRACK_KEY, selectedTrack.id);
  }, [selectedTrack.id]);

  useEffect(() => {
    const detail: ChoNeoMusicState = {
      trackId: selectedTrack.id,
      isPlaying,
      loadError,
    };
    window.dispatchEvent(new CustomEvent(CHO_NEO_MUSIC_STATE_EVENT, { detail }));
  }, [isPlaying, loadError, selectedTrack.id]);

  useEffect(() => {
    function syncPortalTarget() {
      setPortalTarget(document.querySelector('[data-cho-neo-shared-music-slot]'));
    }

    syncPortalTarget();

    const observer = new MutationObserver(syncPortalTarget);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    audio.load();
    setLoadError('');

    if (!isPlaying) return;

    audio.play().catch(() => {
      handleAutomaticPlaybackFailure(selectedTrack.title);
    });
  }, [selectedTrack.src]);

  function handleAudioEnded() {
    advanceToNextTrack(true);
  }

  function handleAudioError() {
    if (autoAdvanceRef.current.active) {
      handleAutomaticPlaybackFailure(latestTrackRef.current.title);
      return;
    }

    setLoadError(`Không mở được: ${latestTrackRef.current.title}`);
    setIsPlaying(false);
  }

  function playMusic() {
    const audio = audioRef.current;
    if (!audio) return;

    stopAutoAdvance();
    setLoadError('');
    setIsPlaying(true);
    audio.play().catch(() => {
      setLoadError(`Không mở được: ${selectedTrack.title}`);
      setIsPlaying(false);
    });
  }

  function pauseMusic() {
    stopAutoAdvance();
    audioRef.current?.pause();
    setIsPlaying(false);
  }

  function toggleMusic() {
    if (isPlaying) {
      pauseMusic();
      return;
    }

    playMusic();
  }

  function selectTrack(nextTrackId: string, shouldPlay = true) {
    const nextTrack = getChoNeoMusicTrack(nextTrackId);
    const audio = audioRef.current;
    const isCurrentTrack = nextTrack.id === trackId;

    stopAutoAdvance();
    latestTrackRef.current = nextTrack;
    setTrackId(nextTrack.id);
    setLoadError('');

    if (isCurrentTrack && audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.load();
    }

    if (!shouldPlay) return;

    setIsPlaying(true);
    if (isCurrentTrack && audio) {
      audio.play().catch(() => {
        setLoadError(`Không mở được: ${nextTrack.title}`);
        setIsPlaying(false);
      });
    }
  }

  function selectAdjacentTrack(direction: 'previous' | 'next') {
    if (direction === 'next') {
      advanceToNextTrack(false);
      return;
    }

    selectTrack(getAdjacentChoNeoMusicTrack(trackId, direction).id, true);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isPlaying) return;

    audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, [isPlaying, portalTarget]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsPanelOpen(false);
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!isPanelOpen) return;
      const target = event.target;
      if (target instanceof Node && playerRef.current?.contains(target)) return;
      if (target instanceof Node && panelRef.current?.contains(target)) return;
      setIsPanelOpen(false);
    }

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [isPanelOpen]);

  useEffect(() => {
    if (!isPanelOpen) return;

    function syncPanelPosition() {
      const rect = playerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const panelWidth = Math.min(360, window.innerWidth - 24);
      setPanelPosition({
        left: Math.min(window.innerWidth - panelWidth - 12, Math.max(12, rect.right - panelWidth)),
        top: Math.min(window.innerHeight - 120, rect.bottom + 10),
      });
    }

    syncPanelPosition();
    window.addEventListener('resize', syncPanelPosition);
    window.addEventListener('scroll', syncPanelPosition, true);
    return () => {
      window.removeEventListener('resize', syncPanelPosition);
      window.removeEventListener('scroll', syncPanelPosition, true);
    };
  }, [isPanelOpen]);

  useEffect(() => {

    function handleCommand(event: Event) {
      const command = (event as CustomEvent<ChoNeoMusicCommand>).detail;
      if (!command) return;

      if (command.type === 'select') {
        selectTrack(command.trackId, command.play ?? true);
        return;
      }

      if (command.type === 'toggle') {
        void toggleMusic();
        return;
      }

      if (command.type === 'pause') {
        pauseMusic();
        return;
      }

      if (command.type === 'play') {
        playMusic();
        return;
      }

      if (command.type === 'previous' || command.type === 'next') {
        selectAdjacentTrack(command.type);
        return;
      }

      if (command.type === 'volume') {
        setVolume(Math.min(Math.max(command.volume, 0), 0.7));
      }
    }

    window.addEventListener(CHO_NEO_MUSIC_COMMAND_EVENT, handleCommand);
    return () => window.removeEventListener(CHO_NEO_MUSIC_COMMAND_EVENT, handleCommand);
  }, [isPlaying, trackId]);

  const panel = isPanelOpen ? (
    <section
      ref={panelRef}
      className="theme-music-panel"
      id={panelId}
      style={{
        left: `${panelPosition.left}px`,
        top: `${panelPosition.top}px`,
      }}
      aria-labelledby={`${panelId}-title`}
    >
      <header className="theme-music-panel-header">
        <div>
          <h2 id={`${panelId}-title`}>Danh sách nhạc Chợ Neo</h2>
          <p>{selectedTrack.title}</p>
        </div>
        <button
          type="button"
          className="theme-music-panel-close"
          onClick={() => setIsPanelOpen(false)}
          aria-label="Đóng danh sách nhạc Chợ Neo"
        >
          ×
        </button>
      </header>

      <div className="theme-current-track">
        <span className="theme-current-label">Bài đang chọn</span>
        <strong>{selectedTrack.title}</strong>
        <span className={isPlaying ? 'theme-current-status playing' : 'theme-current-status'}>
          {isPlaying ? 'Đang phát' : 'Tạm dừng'}
        </span>
        <div className="theme-panel-controls" aria-label="Điều khiển nhạc Chợ Neo">
          <button
            type="button"
            className="theme-control-icon-button"
            onClick={() => selectAdjacentTrack('previous')}
            aria-label="Bài trước"
            title="Bài trước"
          >
            <span aria-hidden="true">⏮</span>
          </button>
          <button
            type="button"
            className="theme-control-icon-button theme-control-icon-button-main"
            onClick={toggleMusic}
            aria-label={isPlaying ? 'Tạm dừng nhạc Chợ Neo' : 'Phát nhạc Chợ Neo'}
            title={isPlaying ? 'Tạm dừng nhạc Chợ Neo' : 'Phát nhạc Chợ Neo'}
          >
            <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '▶'}</span>
          </button>
          <button
            type="button"
            className="theme-control-icon-button"
            onClick={() => selectAdjacentTrack('next')}
            aria-label="Bài kế tiếp"
            title="Bài kế tiếp"
          >
            <span aria-hidden="true">⏭</span>
          </button>
        </div>
        <label className="theme-volume-control">
          <span>Âm lượng</span>
          <input
            aria-label="Âm lượng nhạc Chợ Neo"
            type="range"
            min="0"
            max="0.7"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
      </div>

      {loadError ? (
        <p className="theme-panel-error" role="status">
          {loadError}
        </p>
      ) : null}

      <div className="theme-song-list" role="list" aria-label="Danh sách bài nhạc Chợ Neo">
        {enabledChoNeoMusicTracks.map((track) => {
          const isSelected = track.id === selectedTrack.id;
          const isTrackPlaying = isSelected && isPlaying;
          return (
            <div
              className={isSelected ? 'theme-song-row selected' : 'theme-song-row'}
              key={track.id}
              role="listitem"
              aria-current={isSelected ? 'true' : undefined}
              data-track-id={track.id}
            >
              <span className="theme-song-copy">
                <strong title={track.title}>{track.title}</strong>
                <small>
                  <span>{track.room}</span>
                  <span aria-hidden="true">•</span>
                  <span>{track.duration}</span>
                </small>
              </span>
              <button
                type="button"
                className={isTrackPlaying ? 'theme-song-action playing' : 'theme-song-action'}
                onClick={() => selectTrack(track.id, true)}
                aria-label={`${isSelected ? 'Phát lại' : 'Phát'} ${track.title}`}
                title={`${isSelected ? 'Phát lại' : 'Phát'} ${track.title}`}
              >
                <span aria-hidden="true">{isTrackPlaying ? 'Ⅱ' : '▶'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  ) : null;

  const player = (
    <div
      ref={playerRef}
      className={`cho-neo-theme-audio ${
        variant === 'compact' ? 'cho-neo-theme-audio-compact' : ''
      } ${className}`}
      aria-label="Chợ Neo music player"
    >
      {loadError ? (
        <span className="theme-audio-error" role="status">
          {loadError}
        </span>
      ) : null}

      {variant === 'compact' ? (
        <button
          type="button"
          className="theme-music-compact-toggle"
          onClick={() => setIsPanelOpen((open) => !open)}
          aria-controls={panelId}
          aria-expanded={isPanelOpen}
          aria-label="Mở danh sách nhạc Chợ Neo"
        >
          ♫ Nhạc
        </button>
      ) : null}

      {variant === 'full' ? (
      <div className="theme-audio-controls">
        <button
          type="button"
          className="theme-music-toggle"
          onClick={() => setIsPanelOpen((open) => !open)}
          aria-controls={panelId}
          aria-expanded={isPanelOpen}
          aria-label="Mở danh sách nhạc Chợ Neo"
          aria-pressed={isPlaying}
        >
          <span aria-hidden="true">{isPlaying ? 'Ⅱ' : '♪'}</span>
        </button>

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

        .theme-audio-error {
          position: absolute;
          width: 1px;
          height: 1px;
          overflow: hidden;
          clip: rect(0 0 0 0);
          clip-path: inset(50%);
          white-space: nowrap;
        }

        .cho-neo-layout-theme-audio {
          position: relative;
          z-index: 80;
          width: 56px;
          height: 56px;
          min-height: 56px;
          padding: 0;
          border-color: rgba(248, 211, 145, 0.3);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 24%, rgba(255, 214, 222, 0.16), transparent 20%),
            linear-gradient(180deg, rgba(73, 35, 45, 0.9), rgba(16, 9, 18, 0.94));
          box-shadow:
            0 7px 18px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 247, 237, 0.1);
        }

        .cho-neo-layout-theme-audio .theme-audio-controls {
          display: grid;
          grid-template-columns: 1fr;
          place-items: center;
          width: 100%;
          height: 100%;
        }

        .cho-neo-layout-theme-audio .theme-music-toggle {
          width: 100%;
          height: 100%;
          border: 0;
          color: #ffd4dc;
          background: transparent;
          box-shadow: none;
          font-size: 27px;
          text-shadow: 0 4px 12px rgba(255, 166, 180, 0.2);
        }

        .cho-neo-layout-theme-audio .theme-music-toggle[aria-pressed="true"] {
          color: #f8d391;
          text-shadow:
            0 0 12px rgba(248, 211, 145, 0.45),
            0 4px 12px rgba(255, 166, 180, 0.18);
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

        .theme-music-toggle:focus-visible,
        .theme-music-compact-toggle:focus-visible,
        .theme-music-panel button:focus-visible,
        .theme-music-panel input:focus-visible {
          outline: 2px solid #ffe5ad;
          outline-offset: 3px;
        }

        .theme-music-panel {
          position: fixed;
          z-index: 120;
          display: flex;
          flex-direction: column;
          width: min(360px, calc(100vw - 24px));
          max-height: min(560px, calc(100vh - 96px));
          overflow: hidden;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 18px;
          color: #fff7ed;
          background:
            linear-gradient(180deg, rgba(35, 19, 38, 0.98), rgba(10, 10, 18, 0.98)),
            rgba(7, 8, 15, 0.96);
          box-shadow:
            0 22px 70px rgba(0, 0, 0, 0.46),
            inset 0 1px 0 rgba(255, 247, 237, 0.09);
        }

        .theme-music-panel-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          padding: 12px;
          border-bottom: 1px solid rgba(248, 211, 145, 0.14);
        }

        .theme-music-panel-header h2,
        .theme-music-panel-header p,
        .theme-current-track strong,
        .theme-current-track span,
        .theme-panel-error {
          margin: 0;
        }

        .theme-music-panel-header h2 {
          color: #ffe5ad;
          font-size: 1rem;
          line-height: 1.1;
        }

        .theme-music-panel-header p {
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.7);
          font-size: 0.74rem;
          font-weight: 740;
          line-height: 1.25;
        }

        .theme-music-panel-close {
          display: grid;
          flex: 0 0 36px;
          place-items: center;
          width: 36px;
          height: 36px;
          border: 1px solid rgba(248, 211, 145, 0.2);
          border-radius: 999px;
          color: #ffe7ae;
          background: rgba(255, 247, 237, 0.06);
          cursor: pointer;
          font: inherit;
          font-size: 24px;
          font-weight: 800;
          line-height: 1;
        }

        .theme-current-track {
          display: grid;
          gap: 7px;
          padding: 11px 12px 10px;
          border-bottom: 1px solid rgba(248, 211, 145, 0.12);
          background: rgba(248, 211, 145, 0.045);
        }

        .theme-current-label {
          color: rgba(248, 211, 145, 0.72);
          font-size: 0.64rem;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .theme-current-track strong {
          color: #fff7ed;
          font-size: 0.9rem;
          line-height: 1.2;
        }

        .theme-current-status {
          width: fit-content;
          border: 1px solid rgba(248, 211, 145, 0.2);
          border-radius: 999px;
          padding: 4px 8px;
          color: rgba(255, 247, 237, 0.72);
          background: rgba(255, 247, 237, 0.055);
          font-size: 0.68rem;
          font-weight: 850;
        }

        .theme-current-status.playing {
          color: #1d1307;
          background: #f8d391;
        }

        .theme-panel-controls {
          display: grid;
          grid-template-columns: repeat(3, 44px);
          justify-content: start;
          gap: 8px;
        }

        .theme-song-row {
          border: 1px solid rgba(248, 211, 145, 0.22);
          color: #ffe7ae;
          background: rgba(52, 22, 12, 0.58);
        }

        .theme-panel-controls button {
          border: 1px solid rgba(248, 211, 145, 0.22);
          color: #ffe7ae;
          background: rgba(52, 22, 12, 0.58);
          cursor: pointer;
          font: inherit;
        }

        .theme-control-icon-button {
          display: grid;
          place-items: center;
          width: 44px;
          height: 40px;
          min-height: 40px;
          border-radius: 999px;
          font-size: 1rem;
          font-weight: 850;
          line-height: 1;
        }

        .theme-control-icon-button-main {
          color: #1d1307;
          background: #f8d391;
        }

        .theme-volume-control {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 247, 237, 0.74);
          font-size: 0.69rem;
          font-weight: 820;
        }

        .theme-volume-control input {
          flex: 1 1 auto;
          min-width: 0;
          accent-color: #f8d391;
        }

        .theme-panel-error {
          padding: 9px 14px;
          color: #ffd4dc;
          background: rgba(127, 29, 29, 0.24);
          font-size: 0.82rem;
          font-weight: 820;
        }

        .theme-song-list {
          display: grid;
          gap: 5px;
          max-height: min(352px, 47vh);
          padding: 8px;
          overflow-y: auto;
        }

        .theme-song-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 34px;
          align-items: center;
          gap: 8px;
          width: 100%;
          min-height: 38px;
          border-radius: 10px;
          padding: 6px 7px 6px 9px;
          text-align: left;
        }

        .theme-song-row:hover,
        .theme-song-row:focus-within {
          border-color: rgba(248, 211, 145, 0.46);
          background: rgba(79, 35, 19, 0.7);
        }

        .theme-song-row.selected {
          border-color: rgba(248, 211, 145, 0.56);
          background: rgba(248, 211, 145, 0.12);
        }

        .theme-song-copy {
          display: grid;
          gap: 2px;
          min-width: 0;
        }

        .theme-song-copy strong {
          overflow: hidden;
          color: #fff7ed;
          font-size: 0.77rem;
          font-weight: 900;
          line-height: 1.12;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .theme-song-copy small {
          display: flex;
          align-items: center;
          gap: 5px;
          min-width: 0;
          overflow: hidden;
          color: rgba(255, 247, 237, 0.62);
          font-size: 0.64rem;
          font-weight: 760;
          line-height: 1.15;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .theme-song-action {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 1px solid rgba(248, 211, 145, 0.22);
          border-radius: 999px;
          color: #ffe7ae;
          background: rgba(255, 247, 237, 0.06);
          cursor: pointer;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 900;
          line-height: 1;
        }

        .theme-song-action.playing {
          color: #1d1307;
          background: #f8d391;
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
          grid-template-columns: 32px;
          align-items: center;
          width: auto;
          min-width: 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: 11px;
          font-weight: 720;
        }

        @media (max-width: 760px) {
          .cho-neo-layout-theme-audio {
            width: 56px;
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
            grid-template-columns: 34px;
            font-size: 12px;
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

          .theme-music-panel {
            position: fixed;
            top: auto !important;
            right: 10px;
            bottom: 10px;
            left: 10px !important;
            width: auto;
            max-height: min(82vh, 660px);
            border-radius: 20px;
          }

          .theme-music-panel-header {
            padding: 11px 12px 9px;
          }

          .theme-panel-controls {
            gap: 7px;
          }

          .theme-panel-controls button {
            min-height: 44px;
          }

          .theme-song-list {
            max-height: min(48vh, 420px);
            padding: 8px;
          }

          .theme-song-row {
            min-height: 46px;
            grid-template-columns: minmax(0, 1fr) 40px;
          }

          .theme-song-action {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );

  return (
    <>
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
        preload="metadata"
        playsInline
      >
        <source src={selectedTrack.src} type="audio/mpeg" />
      </audio>
      {portalTarget ? createPortal(player, portalTarget) : player}
      {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </>
  );
}
