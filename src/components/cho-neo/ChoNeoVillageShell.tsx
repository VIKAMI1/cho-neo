"use client";

import Link from "next/link";
import { ChoNeoBetaFeedback } from "./ChoNeoBetaFeedback";
import { ChoNeoGuestPassHeaderControl } from "./ChoNeoGuestPassHeaderControl";
import { ChoNeoTimeAmbience, ChoNeoTimeMoodLabel } from "./ChoNeoTimeAmbience";
import { ChoNeoVillageMap } from "./ChoNeoVillageMap";
import { choNeoRooms } from "@/lib/cho-neo/rooms";
import { trackChoNeoBetaEvent } from "@/lib/cho-neo/beta-analytics";
import { CHO_NEO_ROOM_VOTE_OPEN_EVENT } from "@/lib/cho-neo/room-vote";

export function ChoNeoVillageShell() {
  function openRoomVote() {
    window.dispatchEvent(new CustomEvent(CHO_NEO_ROOM_VOTE_OPEN_EVENT));
    trackChoNeoBetaEvent("feedback_opened", {
      details: { source: "village-guide-room-vote-shortcut" },
    });
  }

  return (
    <main className="cho-neo-village-shell">
      <ChoNeoTimeAmbience />
      <div className="village-night-air" aria-hidden="true" />

      <section className="village-device" aria-labelledby="cho-neo-title">
        <header className="village-topbar">
          <div className="village-brand">
            <div className="village-brand-mark">
              <p>CHỢ NEO</p>
              <span aria-hidden="true" className="village-brand-seal">
                市
              </span>
            </div>
            <small>
              Nhà nhỏ cho người làm nail.
              <span>A private village for nail people.</span>
            </small>
            <a className="village-guide-link" href="#cho-neo-village-guide">
              Hướng dẫn làng
            </a>
          </div>

          <span className="village-nav-card village-mood-card">
            <span aria-hidden="true" className="village-nav-icon">
              <svg viewBox="0 0 48 48" focusable="false">
                <path d="M8 22h32M12 22v18m24-18v18M9 40h30M14 22l10-8 10 8M18 20V10h12v10" />
                <circle cx="24" cy="15" r="3.5" />
              </svg>
            </span>
            <span>
              <strong>
                <ChoNeoTimeMoodLabel />
              </strong>
              <small>Night Market</small>
            </span>
          </span>

          <ChoNeoGuestPassHeaderControl />

          <span
            className="cho-neo-shared-music-slot village-theme-audio"
            data-cho-neo-shared-music-slot
          />
          <ChoNeoBetaFeedback />
        </header>

        <div className="village-app-grid">
          <aside
            className="village-panel village-guide"
            id="cho-neo-village-guide"
            aria-label="Village guide"
          >
            <div className="panel-heading">
              <span>Hướng Dẫn Làng</span>
              <strong>Village Guide</strong>
            </div>

            <button
              className="guide-vote-shortcut"
              onClick={openRoomVote}
              type="button"
            >
              Bình chọn mở phòng
            </button>

            <div className="guide-list">
              {choNeoRooms.map((room, index) => (
                <Link
                  className={`guide-row guide-row-${room.status} guide-row-${room.tone}`}
                  href={room.href}
                  key={room.id}
                  onClick={() =>
                    trackChoNeoBetaEvent("room_sidebar_clicked", {
                      room: room.id,
                      details: { href: room.href, status: room.status },
                    })
                  }
                >
                  <span className="guide-number">
                    <span>{index + 1}</span>
                    <em aria-hidden="true">{room.icon}</em>
                  </span>
                  <span className="guide-copy">
                    <strong>{room.viName}</strong>
                    <small>{room.enName}</small>
                    <em>{room.status === "open" ? room.viStatus : "Sắp"}</em>
                  </span>
                  {room.status === "soon" ? (
                    <span className="guide-state">Sắp</span>
                  ) : null}
                </Link>
              ))}
            </div>

            <div className="guide-preview">
              <strong>Nhìn cửa rồi chọn chỗ ngồi.</strong>
              <span>
                Quán Tám và Bàn Ông Địa đang mở trước. Các cửa còn lại giữ đèn
                chờ làng đông hơn.
              </span>
              <small>Hover or tap a door on the map for more detail.</small>
            </div>
          </aside>

          <ChoNeoVillageMap />
        </div>
      </section>

      <style>{`
        .cho-neo-village-shell,
        .cho-neo-village-shell * {
          box-sizing: border-box;
        }

        .cho-neo-village-shell {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background: var(--cho-neo-shell-background);
        }

        .village-night-air {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background: var(--cho-neo-air-background);
        }

        .village-device {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          width: min(1800px, calc(100% - 16px));
          height: calc(100vh - 16px);
          min-height: 790px;
          margin: 8px auto;
          padding: 4px 10px 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 34px;
          background: var(--cho-neo-device-background);
          box-shadow:
            0 30px 110px rgba(0, 0, 0, 0.62),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .village-device::before {
          content: "";
          position: absolute;
          inset: 8px;
          pointer-events: none;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 27px;
        }

        .village-topbar {
          position: relative;
          z-index: 8;
          display: grid;
          grid-template-columns: minmax(230px, 1fr) max-content max-content max-content max-content;
          align-items: center;
          gap: clamp(8px, 0.8vw, 12px);
          min-width: 0;
          height: 72px;
          min-height: 72px;
          padding: 8px clamp(12px, 1vw, 18px);
          overflow: visible;
          border: 1px solid rgba(248, 211, 145, 0.2);
          border-radius: 22px;
          background:
            radial-gradient(circle at 4% 12%, rgba(248, 211, 145, 0.16), transparent 24%),
            radial-gradient(circle at 68% 42%, rgba(157, 64, 118, 0.24), transparent 34%),
            linear-gradient(135deg, rgba(44, 20, 45, 0.92), rgba(7, 8, 15, 0.94) 44%, rgba(23, 8, 28, 0.92));
          box-shadow:
            0 16px 46px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 247, 237, 0.1),
            inset 0 -1px 0 rgba(248, 211, 145, 0.08);
          isolation: isolate;
          backdrop-filter: blur(18px);
        }

        .village-topbar::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.05), transparent 40%),
            radial-gradient(ellipse at 78% 62%, rgba(0, 0, 0, 0.18), transparent 46%);
        }

        .village-topbar::after {
          content: "";
          position: absolute;
          right: 18%;
          bottom: 9px;
          z-index: -1;
          width: min(310px, 26vw);
          height: 42px;
          pointer-events: none;
          opacity: 0.1;
          background:
            linear-gradient(to top, rgba(248, 211, 145, 0.2), rgba(248, 211, 145, 0.2)) 14% 92% / 5px 38px no-repeat,
            linear-gradient(to top, rgba(248, 211, 145, 0.22), rgba(248, 211, 145, 0.22)) 34% 92% / 4px 54px no-repeat,
            linear-gradient(to top, rgba(248, 211, 145, 0.18), rgba(248, 211, 145, 0.18)) 57% 92% / 6px 44px no-repeat,
            linear-gradient(to top, rgba(248, 211, 145, 0.16), rgba(248, 211, 145, 0.16)) 78% 92% / 4px 62px no-repeat,
            radial-gradient(ellipse at 50% 100%, rgba(248, 211, 145, 0.2), transparent 68%);
        }

        .village-brand {
          min-width: 0;
          padding: 0;
        }

        .village-brand p,
        .village-brand small {
          display: block;
          margin: 0;
        }

        .village-brand-mark {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
        }

        .village-brand p {
          flex: 0 0 auto;
          width: fit-content;
          color: #ffe5ad;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(30px, 2.05vw, 34px);
          font-weight: 880;
          line-height: 0.88;
          letter-spacing: 0;
          white-space: nowrap;
          text-shadow:
            0 1px 0 rgba(120, 53, 15, 0.76),
            0 5px 14px rgba(248, 211, 145, 0.12);
        }

        .village-brand-seal {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 30px;
          height: 30px;
          border: 1px solid rgba(255, 48, 48, 0.84);
          border-radius: 7px;
          color: #ff3b30;
          background: rgba(32, 0, 0, 0.38);
          font-size: 21px;
          font-weight: 900;
          line-height: 1;
          text-shadow: 0 0 14px rgba(255, 59, 48, 0.26);
        }

        .village-brand small {
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.66);
          font-size: 9.5px;
          font-weight: 700;
          line-height: 1.08;
        }

        .village-brand small span {
          display: block;
          margin-top: 1px;
          color: rgba(248, 211, 145, 0.62);
          font-style: italic;
          font-weight: 740;
        }

        .cho-neo-shared-music-slot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          justify-self: end;
          width: 56px;
          min-width: 56px;
          height: 56px;
        }

        .village-guide-link {
          display: none;
          align-items: center;
          justify-content: center;
          min-height: 31px;
          margin-top: 14px;
          padding: 7px 11px;
          border: 1px solid rgba(248, 211, 145, 0.2);
          border-radius: 999px;
          color: rgba(255, 247, 237, 0.82);
          background: rgba(255, 247, 237, 0.055);
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
          transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
        }

        .village-guide-link:hover,
        .village-guide-link:focus-visible {
          border-color: rgba(248, 211, 145, 0.42);
          color: #ffe5ad;
          background: rgba(248, 211, 145, 0.09);
          outline: none;
        }

        .village-panel,
        .room-hotspot-label {
          border: 1px solid rgba(255, 255, 255, 0.13);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 24, 0.68);
          box-shadow:
            0 18px 58px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(18px);
        }

        .village-nav-card,
        .village-login-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          width: auto;
          min-height: 50px;
          padding: 7px 8px;
          border: 1px solid rgba(248, 211, 145, 0.2);
          border-radius: 17px;
          color: #ffe7b7;
          background:
            radial-gradient(circle at 20% 26%, rgba(248, 211, 145, 0.12), transparent 36%),
            linear-gradient(180deg, rgba(34, 18, 24, 0.86), rgba(5, 5, 10, 0.88));
          font-weight: 760;
          text-decoration: none;
          box-shadow:
            0 5px 14px rgba(0, 0, 0, 0.14),
            inset 0 1px 0 rgba(255, 247, 237, 0.07);
          backdrop-filter: blur(16px);
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .village-theme-audio {
          min-width: 0;
          width: 100%;
          max-width: 290px;
          justify-self: stretch;
        }

        .village-login-link:hover,
        .village-login-link:focus-visible {
          transform: translateY(-1px);
          border-color: rgba(248, 211, 145, 0.62);
          background:
            radial-gradient(circle at 20% 26%, rgba(248, 211, 145, 0.16), transparent 36%),
            linear-gradient(180deg, rgba(42, 20, 28, 0.9), rgba(7, 6, 12, 0.9));
          outline: none;
        }

        .village-pass-link {
          cursor: pointer;
          font: inherit;
          justify-self: end;
        }

        .village-pass-avatar {
          width: 31px;
          height: 31px;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 999px;
          background: rgba(248, 211, 145, 0.1);
          font-size: 19px;
        }

        .village-nav-icon {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 0;
          color: #f8d391;
          background: transparent;
          font-size: 30px;
          line-height: 1;
          text-shadow: 0 0 10px rgba(248, 211, 145, 0.1);
        }

        .village-nav-icon svg {
          width: 31px;
          height: 31px;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 2.6;
        }

        .village-nav-card > span:last-child,
        .village-nav-card strong,
        .village-nav-card small,
        .village-login-link > span:last-child,
        .village-login-link strong,
        .village-login-link small {
          display: block;
          min-width: 0;
          line-height: 1;
        }

        .village-nav-card strong,
        .village-login-link strong {
          color: #fff7ed;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .village-nav-card small,
        .village-login-link small {
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.54);
          font-size: 9.5px;
          font-weight: 850;
          line-height: 1.5;
          white-space: nowrap;
        }

        .village-app-grid {
          position: relative;
          z-index: 2;
          flex: 1 1 auto;
          display: grid;
          grid-template-columns: 218px minmax(0, 1fr);
          gap: 14px;
          margin-top: 8px;
          min-height: 0;
        }

        .village-panel {
          position: relative;
          z-index: 7;
          align-self: stretch;
          border-radius: 24px;
          padding: 12px;
          overflow: hidden;
        }

        .panel-heading span,
        .panel-heading strong {
          display: block;
        }

        .panel-heading span {
          color: #f8d391;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .panel-heading strong {
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.74);
          font-size: 12px;
          font-weight: 850;
        }

        .guide-list {
          display: grid;
          gap: 5px;
          margin-top: 11px;
        }

        .guide-vote-shortcut {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          min-height: 34px;
          margin-top: 10px;
          border: 1px solid rgba(248, 211, 145, 0.22);
          border-radius: 12px;
          color: #ffe7b7;
          background: rgba(248, 211, 145, 0.08);
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 950;
        }

        .guide-vote-shortcut:hover,
        .guide-vote-shortcut:focus-visible {
          border-color: rgba(248, 211, 145, 0.46);
          background: rgba(248, 211, 145, 0.14);
          outline: none;
        }

        .guide-row {
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
          min-height: 44px;
          padding: 6px 8px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 15px;
          color: inherit;
          background: rgba(255, 255, 255, 0.035);
          text-decoration: none;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .guide-row:hover,
        .guide-row:focus-visible {
          transform: translateX(3px);
          border-color: rgba(248, 211, 145, 0.42);
          background: rgba(248, 211, 145, 0.075);
          outline: none;
        }

        .guide-number,
        .room-status-row span {
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          border-radius: 999px;
          color: #111827;
          background: #f8d391;
          font-size: 12px;
          font-weight: 950;
        }

        .guide-number {
          position: relative;
          overflow: visible;
        }

        .guide-number span {
          line-height: 1;
        }

        .guide-number em {
          position: absolute;
          right: -5px;
          bottom: -5px;
          display: grid;
          place-items: center;
          width: 16px;
          height: 16px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          color: #f8d391;
          background: #111827;
          font-size: 9px;
          font-style: normal;
          line-height: 1;
        }

        .guide-copy strong,
        .guide-copy small,
        .guide-copy em {
          display: block;
        }

        .guide-copy strong {
          color: #fff7ed;
          font-size: 12px;
          line-height: 1;
        }

        .guide-copy small {
          margin-top: 2px;
          color: rgba(255, 247, 237, 0.54);
          font-size: 9.5px;
          font-weight: 850;
        }

        .guide-copy em {
          margin-top: 2px;
          color: rgba(248, 211, 145, 0.72);
          font-size: 8.5px;
          font-style: normal;
          font-weight: 750;
          line-height: 1;
          text-transform: uppercase;
        }

        .guide-state {
          color: #f8d391;
          padding: 4px 6px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.075);
          font-size: 9px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .guide-row-soon {
          opacity: 0.72;
        }

        .guide-row-soon .guide-number,
        .room-status-soon span,
        .mini-map-pin-soon {
          color: rgba(255, 247, 237, 0.78);
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.13);
        }

        .guide-preview,
        .quiet-card {
          margin-top: 12px;
          padding: 11px;
          border: 1px solid rgba(248, 211, 145, 0.18);
          border-radius: 18px;
          background: rgba(248, 211, 145, 0.065);
        }

        .guide-preview strong,
        .guide-preview span,
        .guide-preview small,
        .quiet-card span,
        .quiet-card strong,
        .quiet-card small {
          display: block;
        }

        .guide-preview strong,
        .quiet-card strong {
          color: #f8d391;
          font-size: 12px;
          line-height: 1.15;
        }

        .guide-preview span,
        .quiet-card small {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 10.5px;
          font-weight: 750;
          line-height: 1.32;
        }

        .guide-preview small,
        .quiet-card span {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.48);
          font-size: 9.5px;
          font-weight: 850;
        }

        .village-scene {
          position: relative;
          min-height: 100%;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 30px;
          background:
            radial-gradient(circle at 55% 35%, rgba(251, 191, 36, 0.18), transparent 28%),
            linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(2, 6, 23, 0.96));
          box-shadow:
            0 30px 90px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          isolation: isolate;
        }

        .scene-art {
          position: absolute;
          inset: -1px;
          z-index: 1;
          overflow: hidden;
          background: #07111d;
          filter: var(--cho-neo-scene-filter);
          transform: scale(1.04);
        }

        .scene-art::after {
          position: absolute;
          inset: 0;
          z-index: 2;
          content: "";
          pointer-events: none;
          background-image:
            var(--cho-neo-scene-wash),
            var(--cho-neo-scene-radial);
        }

        .scene-art-layer {
          position: absolute;
          inset: 0;
          z-index: 1;
          background-repeat: no-repeat;
          background-size: cover;
          background-position: center;
          opacity: 0;
          transition: opacity 1600ms ease-in-out;
          will-change: opacity;
        }

        .scene-art-layer-day {
          opacity: 1;
        }

        :root[data-cho-neo-time="morning"] .scene-art-layer-day,
        :root[data-cho-neo-time="day"] .scene-art-layer-day {
          opacity: 1;
        }

        :root[data-cho-neo-time="golden-dusk"] .scene-art-layer-day,
        :root[data-cho-neo-time="night-market"] .scene-art-layer-day {
          opacity: 0;
        }

        :root[data-cho-neo-time="golden-dusk"] .scene-art-layer-twilight,
        :root[data-cho-neo-time="night-market"] .scene-art-layer-night {
          opacity: 1;
        }

        .scene-vignette {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background: var(--cho-neo-scene-vignette);
        }

        .scene-ambient {
          position: absolute;
          inset: 0;
          z-index: 3;
          opacity: 1;
          pointer-events: none;
          overflow: hidden;
          contain: paint;
          mix-blend-mode: plus-lighter;
        }

        .scene-lantern,
        .scene-reflection,
        .scene-haze {
          position: absolute;
          pointer-events: none;
          will-change: transform, opacity;
        }

        .scene-lantern {
          left: var(--lantern-x);
          top: var(--lantern-y);
          width: clamp(64px, 8vw, 138px);
          height: clamp(52px, 6.6vw, 112px);
          border-radius: 999px;
          background:
            radial-gradient(circle at 50% 44%, rgba(255, 252, 226, 0.82) 0 8%, rgba(255, 221, 124, 0.58) 20%, rgba(251, 146, 60, 0.3) 45%, rgba(244, 63, 94, 0.09) 68%, transparent 80%);
          filter: blur(5.5px);
          opacity: 0.67;
          transform: translate3d(-50%, -50%, 0) scale(0.98);
          animation: choNeoLanternBreathe var(--lantern-speed, 8s) ease-in-out infinite;
        }

        .scene-lantern-cafe {
          --lantern-x: 69%;
          --lantern-y: 36%;
          --lantern-speed: 7.4s;
          width: clamp(54px, 6.5vw, 110px);
          height: clamp(42px, 5.3vw, 90px);
          opacity: 0.48;
          animation-delay: -1.2s;
        }

        .scene-lantern-shrine {
          --lantern-x: 36%;
          --lantern-y: 34%;
          --lantern-speed: 9.1s;
          width: clamp(54px, 6vw, 104px);
          height: clamp(42px, 4.8vw, 82px);
          opacity: 0.46;
          animation-delay: -4.7s;
        }

        .scene-lantern-market {
          --lantern-x: 86%;
          --lantern-y: 51%;
          --lantern-speed: 10.6s;
          width: clamp(44px, 5vw, 84px);
          height: clamp(34px, 4vw, 66px);
          opacity: 0.25;
          display: none;
          animation-delay: -6.1s;
        }

        .scene-lantern-waterfront {
          --lantern-x: 15%;
          --lantern-y: 74%;
          --lantern-speed: 8.8s;
          width: clamp(42px, 4.6vw, 78px);
          height: clamp(14px, 1.7vw, 28px);
          background:
            radial-gradient(ellipse at 44% 50%, rgba(255, 226, 150, 0.53) 0 12%, rgba(251, 146, 60, 0.21) 40%, rgba(244, 63, 94, 0.05) 64%, transparent 78%);
          opacity: 0.25;
          animation-delay: -2.8s;
        }

        .scene-lantern-left-path {
          --lantern-x: 31%;
          --lantern-y: 49%;
          --lantern-speed: 9.6s;
          width: clamp(68px, 7.8vw, 138px);
          height: clamp(44px, 5.2vw, 92px);
          background:
            radial-gradient(ellipse at 45% 48%, rgba(255, 239, 184, 0.8) 0 10%, rgba(255, 194, 102, 0.48) 32%, rgba(245, 120, 54, 0.21) 60%, transparent 80%);
          animation-delay: -5.4s;
        }

        .scene-lantern-fountain-square {
          --lantern-x: 51%;
          --lantern-y: 50%;
          --lantern-speed: 8.2s;
          width: clamp(72px, 8.2vw, 148px);
          height: clamp(44px, 5.4vw, 96px);
          background:
            radial-gradient(ellipse at 52% 50%, rgba(255, 243, 199, 0.76) 0 9%, rgba(251, 191, 91, 0.44) 33%, rgba(245, 120, 54, 0.18) 62%, transparent 81%);
          animation-delay: -1.9s;
        }

        .scene-lantern-market-corner {
          --lantern-x: 73%;
          --lantern-y: 63%;
          --lantern-speed: 10.8s;
          width: clamp(66px, 7.6vw, 136px);
          height: clamp(42px, 5vw, 88px);
          background:
            radial-gradient(ellipse at 48% 46%, rgba(255, 233, 169, 0.74) 0 10%, rgba(251, 169, 78, 0.41) 34%, rgba(194, 65, 12, 0.16) 62%, transparent 81%);
          animation-delay: -7.2s;
        }

        .scene-reflection {
          left: 50%;
          top: 43%;
          width: clamp(120px, 12vw, 190px);
          height: clamp(18px, 2.5vw, 42px);
          border-radius: 999px;
          background:
            linear-gradient(100deg, transparent 0 20%, rgba(255, 237, 173, 0.3) 36%, rgba(253, 186, 116, 0.2) 50%, rgba(255, 219, 168, 0.28) 64%, transparent 82%),
            radial-gradient(ellipse at 50% 50%, rgba(251, 191, 36, 0.18), transparent 70%);
          filter: blur(4px);
          opacity: 0.24;
          transform: translate3d(-50%, -50%, 0) rotate(-2deg);
          animation: choNeoWaterShimmer 7.8s ease-in-out infinite;
        }

        .scene-haze {
          width: clamp(170px, 24vw, 380px);
          height: clamp(90px, 12vw, 190px);
          border-radius: 999px;
          background:
            radial-gradient(ellipse at 50% 50%, rgba(255, 219, 168, 0.14), rgba(195, 93, 89, 0.06) 42%, transparent 70%);
          filter: blur(16px);
          opacity: 0.28;
          transform: translate3d(-50%, -50%, 0);
          animation: choNeoWarmHaze 18s ease-in-out infinite;
        }

        .scene-haze-left {
          left: 20%;
          top: 26%;
          width: clamp(120px, 15vw, 250px);
          height: clamp(70px, 8vw, 140px);
          opacity: 0.14;
          animation-delay: -5s;
        }

        .scene-haze-right {
          left: 66%;
          top: 23%;
          width: clamp(150px, 20vw, 320px);
          opacity: 0.1;
          animation-duration: 23s;
          animation-delay: -11s;
        }

        .room-hotspot {
          position: absolute;
          left: var(--hotspot-x);
          top: var(--hotspot-y);
          z-index: 5;
          width: var(--hotspot-w);
          height: var(--hotspot-h);
          display: grid;
          place-items: center;
          border-radius: 26px;
          color: inherit;
          outline: none;
        }

        .room-hotspot-pin {
          display: grid;
          place-items: center;
          width: 22px;
          height: 22px;
          border: 1px solid rgba(248, 211, 145, 0.34);
          border-radius: 10px;
          color: #f8d391;
          background:
            radial-gradient(circle at 50% 35%, rgba(248, 211, 145, 0.2), transparent 62%),
            rgba(9, 13, 24, 0.72);
          box-shadow:
            0 0 0 3px rgba(248, 211, 145, 0.06),
            0 10px 24px rgba(0, 0, 0, 0.34);
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          line-height: 1;
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
          backdrop-filter: blur(12px);
          animation: choNeoHotspotBreath 9.8s ease-in-out infinite;
        }

        .room-hotspot:nth-of-type(2n) .room-hotspot-pin {
          animation-duration: 11.4s;
          animation-delay: -3.6s;
        }

        .room-hotspot:nth-of-type(3n) .room-hotspot-pin {
          animation-duration: 12.7s;
          animation-delay: -7.2s;
        }

        .room-hotspot-pin:hover,
        .room-hotspot-pin:focus-visible,
        .room-hotspot-selected .room-hotspot-pin {
          transform: translateY(-2px) scale(1.04);
          border-color: rgba(248, 211, 145, 0.72);
          background:
            radial-gradient(circle at 50% 35%, rgba(248, 211, 145, 0.32), transparent 66%),
            rgba(9, 13, 24, 0.84);
          box-shadow:
            0 0 0 5px rgba(248, 211, 145, 0.1),
            0 0 26px rgba(248, 211, 145, 0.18),
            0 14px 32px rgba(0, 0, 0, 0.38);
          outline: none;
          animation-play-state: paused;
        }

        .room-hotspot-label {
          position: absolute;
          left: 50%;
          bottom: calc(50% + 18px);
          min-width: 134px;
          max-width: 190px;
          transform: translate(-50%, 8px) scale(0.96);
          opacity: 0;
          pointer-events: none;
          padding: 10px 11px;
          border-radius: 17px;
          transition: opacity 160ms ease, transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }

        .room-hotspot:hover .room-hotspot-label,
        .room-hotspot:focus-within .room-hotspot-label,
        .room-hotspot-selected .room-hotspot-label {
          transform: translate(-50%, 0) scale(1);
          opacity: 1;
          pointer-events: auto;
          border-color: rgba(248, 211, 145, 0.48);
          outline: none;
        }

        .room-hotspot-title,
        .room-hotspot-title > span:last-child,
        .room-hotspot-label em {
          display: block;
        }

        .room-hotspot-title {
          display: grid;
          grid-template-columns: 28px minmax(0, 1fr);
          gap: 8px;
          align-items: center;
        }

        .room-hotspot-title > span:first-child {
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border: 1px solid rgba(248, 211, 145, 0.22);
          border-radius: 10px;
          color: #f8d391;
          background: rgba(0, 0, 0, 0.28);
          font-size: 14px;
          line-height: 1;
        }

        .room-hotspot-title strong,
        .room-hotspot-title small {
          display: block;
        }

        .room-hotspot-title strong {
          color: #fff7ed;
          font-size: 14px;
          line-height: 1;
        }

        .room-hotspot-title small {
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 10px;
          font-weight: 850;
        }

        .room-hotspot-label em {
          margin-top: 7px;
          width: fit-content;
          padding: 5px 8px;
          border-radius: 999px;
          color: #111827;
          background: #f8d391;
          font-size: 9px;
          font-style: normal;
          font-weight: 950;
          text-transform: uppercase;
        }

        .room-hotspot-label a {
          display: block;
          width: fit-content;
          margin-top: 8px;
          padding: 6px 9px;
          border-radius: 999px;
          color: #111827;
          background: #f8d391;
          font-size: 10px;
          font-weight: 950;
          text-decoration: none;
        }

        .room-hotspot-label a:focus-visible {
          outline: 2px solid rgba(255, 247, 237, 0.76);
          outline-offset: 2px;
        }

        .room-hotspot-soon .room-hotspot-pin {
          opacity: 0.82;
        }

        .room-hotspot-soon .room-hotspot-label em {
          color: rgba(255, 247, 237, 0.76);
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        @keyframes choNeoLanternBreathe {
          0%,
          100% {
            opacity: 0.34;
            transform: translate3d(-50%, -50%, 0) scale(0.94);
          }
          34% {
            opacity: 0.76;
            transform: translate3d(-50%, -50%, 0) scale(1.09);
          }
          62% {
            opacity: 0.46;
            transform: translate3d(-50%, -50%, 0) scale(0.99);
          }
          78% {
            opacity: 0.68;
            transform: translate3d(-50%, -50%, 0) scale(1.05);
          }
        }

        @keyframes choNeoWaterShimmer {
          0%,
          100% {
            opacity: 0.18;
            transform: translate3d(-55%, -50%, 0) rotate(-2deg) scaleX(0.86);
          }
          44% {
            opacity: 0.36;
            transform: translate3d(-47%, -49%, 0) rotate(-1deg) scaleX(1.08);
          }
          72% {
            opacity: 0.24;
            transform: translate3d(-42%, -51%, 0) rotate(-2deg) scaleX(0.94);
          }
        }

        @keyframes choNeoWarmHaze {
          0%,
          100% {
            opacity: 0.16;
            transform: translate3d(-52%, -50%, 0) scale(0.98);
          }
          50% {
            opacity: 0.3;
            transform: translate3d(-48%, -52%, 0) scale(1.04);
          }
        }

        @keyframes choNeoHotspotBreath {
          0%,
          100% {
            box-shadow:
              0 0 0 3px rgba(248, 211, 145, 0.05),
              0 10px 24px rgba(0, 0, 0, 0.34);
          }
          50% {
            box-shadow:
              0 0 0 4px rgba(248, 211, 145, 0.08),
              0 10px 24px rgba(0, 0, 0, 0.34);
          }
        }

        .scene-pilot-ribbon {
          position: absolute;
          left: 50%;
          bottom: 18px;
          z-index: 6;
          width: min(520px, calc(100% - 36px));
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 15px;
          border: 1px solid rgba(248, 211, 145, 0.22);
          border-radius: 20px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 24, 0.76);
          box-shadow: 0 22px 62px rgba(0, 0, 0, 0.36);
          backdrop-filter: blur(16px);
        }

        .scene-pilot-ribbon strong,
        .scene-pilot-ribbon span,
        .scene-pilot-ribbon a {
          display: block;
        }

        .scene-pilot-ribbon strong {
          color: #f8d391;
          font-size: 13px;
        }

        .scene-pilot-ribbon span {
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 11px;
          font-weight: 800;
        }

        .scene-pilot-ribbon a {
          flex: 0 0 auto;
          padding: 9px 12px;
          border-radius: 999px;
          color: #111827;
          background: #f8d391;
          font-size: 12px;
          font-weight: 950;
          text-decoration: none;
        }

        .mobile-room-drawer {
          display: none;
        }

        .mini-map-card {
          position: relative;
          min-height: 180px;
          margin-top: 16px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          background-image:
            linear-gradient(180deg, rgba(3, 7, 18, 0.3), rgba(3, 7, 18, 0.56)),
            url("/images/cho-neo/village-map-july-summer-day.png");
          background-size: cover;
          background-position: center;
          filter: var(--cho-neo-scene-filter);
        }

        :root[data-cho-neo-time="golden-dusk"] .mini-map-card {
          background-image:
            linear-gradient(180deg, rgba(3, 7, 18, 0.3), rgba(3, 7, 18, 0.56)),
            url("/images/cho-neo/village-map-master-twilight.png");
        }

        :root[data-cho-neo-time="night-market"] .mini-map-card {
          background-image:
            linear-gradient(180deg, rgba(3, 7, 18, 0.3), rgba(3, 7, 18, 0.56)),
            url("/images/cho-neo/village-map-summer-night.png");
        }

        .mini-map-pin {
          position: absolute;
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          border-radius: 999px;
          color: #111827;
          background: #f8d391;
          box-shadow: 0 8px 18px rgba(0, 0, 0, 0.32);
          font-size: 12px;
          font-weight: 950;
        }

        .mini-map-pin-cafe { left: 62%; top: 29%; }
        .mini-map-pin-shrine { left: 32%; top: 27%; }
        .mini-map-pin-gallery { left: 24%; top: 50%; }
        .mini-map-pin-owner { left: 82%; top: 56%; }
        .mini-map-pin-technique { left: 72%; top: 50%; }
        .mini-map-pin-waterfront { left: 86%; top: 78%; }
        .mini-map-pin-market { left: 89%; top: 39%; }

        .room-status-list {
          display: grid;
          gap: 6px;
          margin-top: 16px;
        }

        .room-status-list p {
          margin: 0 0 4px;
          color: rgba(255, 247, 237, 0.54);
          font-size: 11px;
          font-weight: 900;
        }

        .room-status-row {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr) auto;
          gap: 8px;
          align-items: center;
          min-height: 34px;
          color: inherit;
          text-decoration: none;
        }

        .room-status-row span {
          width: 24px;
          height: 24px;
          font-size: 11px;
        }

        .room-status-row strong {
          overflow: hidden;
          color: rgba(255, 247, 237, 0.88);
          font-size: 12px;
          line-height: 1;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .room-status-row small {
          color: rgba(255, 247, 237, 0.52);
          font-size: 10px;
          font-weight: 850;
        }

        .village-bottom-nav {
          position: absolute;
          left: 28px;
          right: 28px;
          bottom: 20px;
          z-index: 20;
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 8px;
          padding: 9px;
          border-radius: 24px;
        }

        .bottom-nav-item {
          display: grid;
          place-items: center;
          min-width: 0;
          min-height: 50px;
          padding: 8px 6px;
          border-radius: 17px;
          color: rgba(255, 247, 237, 0.72);
          text-align: center;
          text-decoration: none;
          transition: background 160ms ease, color 160ms ease, transform 160ms ease;
        }

        .bottom-nav-item:hover,
        .bottom-nav-item:focus-visible {
          transform: translateY(-2px);
          background: rgba(248, 211, 145, 0.11);
          outline: none;
        }

        .bottom-nav-item span {
          font-size: 12px;
          font-weight: 950;
          line-height: 1;
        }

        .bottom-nav-item small {
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.44);
          font-size: 8px;
          font-weight: 850;
          line-height: 1.1;
        }

        .bottom-nav-open {
          color: #111827;
          background: #f8d391;
        }

        .bottom-nav-open small {
          color: rgba(17, 24, 39, 0.58);
        }

        .bottom-nav-soon {
          background: rgba(255, 255, 255, 0.055);
        }

        @media (max-width: 1180px) {
          .village-device {
            width: min(980px, calc(100% - 18px));
            padding: 9px 10px 12px;
          }

          .village-topbar {
            grid-template-columns: minmax(220px, 1fr) max-content max-content max-content max-content;
            gap: 8px;
            height: 72px;
            min-height: 72px;
            padding: 8px 12px;
          }

          .village-theme-audio {
            grid-column: auto;
            grid-row: auto;
            width: 56px;
            max-width: 56px;
          }

          .cho-neo-feedback-button {
            grid-column: auto;
            grid-row: auto;
            justify-self: end;
          }

          .village-brand small {
            margin-top: 3px;
          }

          .village-nav-card,
          .village-login-link {
            min-width: 124px;
            padding-inline: 7px;
          }

          .village-app-grid {
            grid-template-columns: 190px minmax(0, 1fr);
            gap: 10px;
            min-height: 0;
          }

          .village-scene {
            min-height: 100%;
          }
        }

        @media (max-width: 900px) and (min-width: 761px) {
          .village-topbar {
            grid-template-columns: minmax(190px, 1fr) max-content max-content max-content max-content;
            gap: 8px;
          }

          .village-nav-card,
          .village-login-link {
            min-width: 112px;
            min-height: 46px;
            padding-inline: 7px;
          }

          .village-nav-card small,
          .village-login-link small {
            display: none;
          }
        }

        @media (max-width: 760px) {
          .cho-neo-village-shell {
            background:
              radial-gradient(circle at 20% 10%, rgba(251, 191, 36, 0.16), transparent 28%),
              linear-gradient(145deg, #03040a 0%, #111827 54%, #1b1020 100%);
          }

          .village-device {
            width: 100%;
            height: auto;
            min-height: 100vh;
            margin: 0;
            padding: 8px 10px 12px;
            border: 0;
            border-radius: 0;
          }

          .village-device::before {
            display: none;
          }

          .village-topbar {
            align-items: center;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
            gap: 10px;
            height: auto;
            min-height: 0;
            padding: 12px;
            border-radius: 24px;
            overflow: visible;
          }

          .village-brand {
            grid-column: 1 / -1;
            grid-row: 1;
            width: 100%;
            padding: 0 92px 0 0;
            z-index: 1;
          }

          .cho-neo-feedback-button {
            grid-column: 3;
            grid-row: 3;
            justify-self: end;
            align-self: center;
            position: relative;
            z-index: 3;
          }

          .village-brand p {
            font-size: clamp(30px, 10vw, 38px);
          }

          .village-brand small {
            margin-top: 8px;
            font-size: 12px;
            line-height: 1.25;
          }

          .village-guide-link {
            min-height: 34px;
            margin-top: 10px;
            padding: 8px 11px;
            font-size: 11px;
          }

          .village-nav-card,
          .village-login-link {
            min-width: 0;
            min-height: 52px;
            padding: 9px 10px;
            border-radius: 18px;
            gap: 8px;
          }

          .village-mood-card {
            grid-column: 1;
            grid-row: 2;
          }

          .village-login-link {
            grid-column: 2 / -1;
            grid-row: 2;
          }

          .village-theme-audio {
            grid-column: 2;
            grid-row: 3;
            width: 56px;
            max-width: 56px;
            justify-self: end;
          }

          .village-nav-icon {
            width: 28px;
            height: 28px;
            border-radius: 10px;
            font-size: 16px;
          }

          .village-nav-card strong,
          .village-login-link strong {
            font-size: 14px;
          }

          .village-nav-card small,
          .village-login-link small {
            font-size: 10px;
          }

          .village-app-grid {
            grid-template-columns: 1fr;
            gap: 6px;
            margin-top: 6px;
            min-height: auto;
            height: auto;
          }

          .village-guide {
            display: none;
          }

          .guide-list {
            grid-template-columns: 1fr;
            gap: 8px;
          }

          .guide-row {
            grid-template-columns: 34px minmax(0, 1fr) auto;
            min-height: 52px;
            padding: 8px;
            border-radius: 16px;
          }

          .guide-copy em {
            display: none;
          }

          .guide-state {
            display: block;
            font-size: 9px;
          }

          .village-scene {
            order: 1;
            aspect-ratio: auto;
            min-height: min(68svh, 640px);
            border-radius: 24px;
          }

          .scene-art {
            transform: none;
          }

          .room-hotspot {
            display: none;
          }

          .mobile-room-drawer {
            position: absolute;
            left: 10px;
            right: 10px;
            bottom: 10px;
            z-index: 7;
            display: grid;
            gap: 7px;
            padding: 9px;
            margin: 0;
            border: 1px solid rgba(248, 211, 145, 0.14);
            border-radius: 20px;
            background:
              linear-gradient(180deg, rgba(3, 7, 18, 0.08), rgba(3, 7, 18, 0.72)),
              rgba(3, 7, 18, 0.56);
            box-shadow: 0 20px 48px rgba(0, 0, 0, 0.34);
            backdrop-filter: blur(14px);
          }

          .mobile-room-group,
          .mobile-room-group > div {
            display: grid;
            grid-template-columns: 1fr;
            gap: 5px;
          }

          .mobile-room-group-soon {
            overflow: hidden;
          }

          .mobile-room-group-soon summary {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            min-height: 32px;
            padding: 6px 9px;
            border: 1px solid rgba(248, 211, 145, 0.16);
            border-radius: 14px;
            color: rgba(255, 247, 237, 0.78);
            background: rgba(255, 247, 237, 0.07);
            cursor: pointer;
            list-style: none;
          }

          .mobile-room-group-soon summary::-webkit-details-marker {
            display: none;
          }

          .mobile-room-group-soon summary span {
            color: rgba(248, 211, 145, 0.9);
            font-size: 11px;
            font-weight: 950;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .mobile-room-group-soon summary em {
            padding: 3px 6px;
            border-radius: 999px;
            color: rgba(255, 247, 237, 0.68);
            background: rgba(255, 255, 255, 0.09);
            font-size: 9px;
            font-style: normal;
            font-weight: 900;
          }

          .mobile-room-group-soon > div {
            margin-top: 5px;
          }

          .mobile-room-drawer p {
            margin: 0;
            color: rgba(248, 211, 145, 0.82);
            font-size: 10px;
            font-weight: 950;
            letter-spacing: 0.1em;
            text-transform: uppercase;
          }

          .mobile-room-drawer a {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: center;
            gap: 10px;
            min-height: 35px;
            width: 100%;
            padding: 7px 9px;
            border: 1px solid rgba(248, 211, 145, 0.18);
            border-radius: 14px;
            color: #fff7ed;
            background: rgba(255, 247, 237, 0.08);
            font-size: 12px;
            font-weight: 950;
            text-decoration: none;
          }

          .mobile-room-drawer a strong {
            display: flex;
            align-items: center;
            gap: 7px;
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .mobile-room-drawer a strong span {
            display: grid;
            flex: 0 0 auto;
            place-items: center;
            width: 20px;
            height: 20px;
            border-radius: 999px;
            color: #111827;
            background: #f8d391;
            font-size: 10px;
          }

          .mobile-room-drawer a small {
            display: flex;
            align-items: center;
            gap: 6px;
            color: rgba(255, 247, 237, 0.58);
            font-size: 9px;
            font-weight: 850;
            text-align: right;
          }

          .mobile-room-drawer a small em {
            padding: 3px 5px;
            border-radius: 999px;
            color: rgba(255, 247, 237, 0.72);
            background: rgba(255, 255, 255, 0.1);
            font-size: 8px;
            font-style: normal;
            text-transform: uppercase;
          }

          .mobile-room-link-soon {
            opacity: 0.74;
          }

          .room-hotspot-cafe {
            --hotspot-x: 70% !important;
            --hotspot-y: 37% !important;
            --hotspot-w: 8% !important;
            --hotspot-h: 8% !important;
          }

          .room-hotspot-shrine {
            --hotspot-x: 42% !important;
            --hotspot-y: 30% !important;
            --hotspot-w: 8% !important;
            --hotspot-h: 8% !important;
          }

          .room-hotspot-gallery {
            --hotspot-x: 25% !important;
            --hotspot-y: 55% !important;
            --hotspot-w: 8% !important;
            --hotspot-h: 8% !important;
          }

          .room-hotspot-owner {
            --hotspot-x: 82% !important;
            --hotspot-y: 61% !important;
            --hotspot-w: 8% !important;
            --hotspot-h: 8% !important;
          }

          .room-hotspot-technique {
            --hotspot-x: 70% !important;
            --hotspot-y: 58% !important;
            --hotspot-w: 8% !important;
            --hotspot-h: 8% !important;
          }

          .room-hotspot-waterfront {
            --hotspot-x: 83% !important;
            --hotspot-y: 79% !important;
            --hotspot-w: 8% !important;
            --hotspot-h: 8% !important;
          }

          .room-hotspot-market {
            --hotspot-x: 88% !important;
            --hotspot-y: 45% !important;
            --hotspot-w: 8% !important;
            --hotspot-h: 8% !important;
          }

          .room-hotspot-label {
            min-width: 118px;
            padding: 8px 9px;
          }

          .room-hotspot-label strong {
            font-size: 13px;
          }

          .scene-pilot-ribbon {
            display: none;
          }

          .scene-pilot-ribbon a {
            width: fit-content;
            margin-top: 10px;
          }

          .village-mini {
            grid-template-columns: 1fr;
            padding: 13px;
            border-radius: 22px;
          }

          .mini-map-card {
            display: none;
          }

          .room-status-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .room-status-list p {
            grid-column: 1 / -1;
          }

          .room-status-row {
            min-height: 38px;
            padding: 6px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.045);
          }

          .room-status-row small {
            display: none;
          }

          .quiet-card {
            margin-top: 0;
          }

          .village-bottom-nav {
            display: none;
          }

          .village-bottom-nav::-webkit-scrollbar {
            display: none;
          }

          .bottom-nav-item {
            flex: 0 0 134px;
            min-height: 46px;
            border-radius: 16px;
          }

          .bottom-nav-item span {
            max-width: 100%;
            overflow: hidden;
            font-size: 11px;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .bottom-nav-item small {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }

        @media (max-width: 430px) {
          .village-scene {
            min-height: min(66svh, 560px);
          }

          .room-status-list {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .scene-ambient {
            opacity: 0.86;
          }

          .scene-haze-right,
          .scene-lantern-market {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .scene-lantern,
          .scene-reflection,
          .scene-haze,
          .room-hotspot-pin {
            animation: none !important;
          }

          .scene-art-layer {
            transition: none;
          }

          .scene-lantern,
          .scene-reflection,
          .scene-haze {
            opacity: 0.18;
          }
        }
      `}</style>
    </main>
  );
}
