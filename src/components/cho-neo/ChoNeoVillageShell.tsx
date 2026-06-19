import { ChoNeoMusicOverlay } from "./ChoNeoMusicOverlay";
import { ChoNeoBottomNav } from "./ChoNeoBottomNav";
import { ChoNeoVillageMap } from "./ChoNeoVillageMap";
import { choNeoRooms, openChoNeoRooms, soonChoNeoRooms } from "@/lib/cho-neo/rooms";

export function ChoNeoVillageShell() {
  return (
    <main className="cho-neo-village-shell">
      <div className="village-night-air" aria-hidden="true" />

      <section className="village-device" aria-labelledby="cho-neo-title">
        <header className="village-topbar">
          <div className="village-brand">
            <p>CHỢ NEO</p>
            <span>Village</span>
            <small>
              Nhà nhỏ cho người làm nail.
              <br />
              A private village for nail people.
            </small>
          </div>

          <div className="village-status-grid" aria-label="Village status">
            <div className="status-card status-card-invited">
              <span>10 invited</span>
              <strong>10 người mời</strong>
              <small>First pilot circle</small>
            </div>
            <div className="status-card status-card-open">
              <span>{openChoNeoRooms.length} rooms open</span>
              <strong>{openChoNeoRooms.length} cửa đang mở</strong>
              <small>Quán, shrine, gallery</small>
            </div>
            <div className="status-card status-card-mood">
              <span>Village mood</span>
              <strong>Đang ấm lên</strong>
              <small>Warming up</small>
            </div>
          </div>

          <ChoNeoMusicOverlay />
        </header>

        <div className="village-app-grid">
          <aside className="village-panel village-guide" aria-label="Village guide">
            <div className="panel-heading">
              <span>Hướng Dẫn Làng</span>
              <strong>Village Guide</strong>
            </div>

            <div className="guide-list">
              {choNeoRooms.map((room, index) => (
                <a
                  className={`guide-row guide-row-${room.status} guide-row-${room.tone}`}
                  href={room.href}
                  key={room.id}
                >
                  <span className="guide-number">
                    <span>{index + 1}</span>
                    <em aria-hidden="true">{room.icon}</em>
                  </span>
                  <span className="guide-copy">
                    <strong>{room.viName}</strong>
                    <small>{room.enName}</small>
                    <em>{room.viDescription}</em>
                  </span>
                  <span className="guide-state">
                    {room.status === "open" ? "Mở" : "Sắp"}
                  </span>
                </a>
              ))}
            </div>

            <div className="pilot-note">
              <strong>V1 pilot</strong>
              <span>
                Mời ít người trước để giữ làng ấm, rõ, và không ồn.
              </span>
              <small>Small first, careful first.</small>
            </div>
          </aside>

          <ChoNeoVillageMap />

          <aside className="village-panel village-mini" aria-label="Room status">
            <div className="panel-heading">
              <span>Bản Đồ Nhỏ</span>
              <strong>Mini Map</strong>
            </div>

            <div className="mini-map-card" aria-hidden="true">
              {choNeoRooms.map((room, index) => (
                <span
                  className={`mini-map-pin mini-map-pin-${room.tone} mini-map-pin-${room.status}`}
                  key={room.id}
                >
                  {index + 1}
                </span>
              ))}
            </div>

            <div className="room-status-list">
              <p>Trạng thái cửa / Room Status</p>
              {choNeoRooms.map((room, index) => (
                <a
                  className={`room-status-row room-status-${room.status}`}
                  href={room.href}
                  key={room.id}
                >
                  <span>{index + 1}</span>
                  <strong>{room.viName}</strong>
                  <small>{room.status === "open" ? "Đang mở" : "Sắp mở"}</small>
                </a>
              ))}
            </div>

            <div className="quiet-card">
              <span>Hôm nay</span>
              <strong>Đang khởi động</strong>
              <small>Visitors today: -- / warming up</small>
            </div>
          </aside>
        </div>

        <ChoNeoBottomNav />
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
          background:
            radial-gradient(circle at 20% 12%, rgba(251, 191, 36, 0.22), transparent 20%),
            radial-gradient(circle at 72% 8%, rgba(244, 114, 182, 0.2), transparent 22%),
            radial-gradient(circle at 80% 86%, rgba(20, 184, 166, 0.15), transparent 30%),
            linear-gradient(135deg, #02030a 0%, #081020 34%, #251426 70%, #04040a 100%);
        }

        .village-night-air {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 22%),
            radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.36) 84%);
        }

        .village-device {
          position: relative;
          z-index: 1;
          width: min(1480px, calc(100% - 28px));
          height: calc(100vh - 28px);
          min-height: 860px;
          margin: 14px auto;
          padding: 24px 28px 84px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 38px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025)),
            rgba(6, 10, 18, 0.82);
          box-shadow:
            0 30px 110px rgba(0, 0, 0, 0.62),
            inset 0 1px 0 rgba(255, 255, 255, 0.18);
        }

        .village-device::before {
          content: "";
          position: absolute;
          inset: 10px;
          pointer-events: none;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 30px;
        }

        .village-topbar {
          position: relative;
          z-index: 8;
          display: grid;
          grid-template-columns: minmax(200px, 260px) 1fr auto;
          align-items: start;
          gap: 22px;
        }

        .village-brand p,
        .village-brand span,
        .village-brand small {
          display: block;
          margin: 0;
        }

        .village-brand p {
          color: #f8d391;
          font-size: clamp(32px, 3.65vw, 52px);
          font-weight: 950;
          line-height: 0.86;
          letter-spacing: 0.04em;
        }

        .village-brand span {
          margin-top: 8px;
          color: #f8d391;
          font-size: 15px;
          font-weight: 950;
          letter-spacing: 0.36em;
          text-transform: uppercase;
        }

        .village-brand small {
          margin-top: 16px;
          color: rgba(255, 247, 237, 0.74);
          font-size: 14px;
          font-weight: 750;
          line-height: 1.45;
        }

        .village-status-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
        }

        .status-card,
        .village-panel,
        .room-hotspot-label,
        .village-bottom-nav,
        .music-overlay {
          border: 1px solid rgba(255, 255, 255, 0.13);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 24, 0.68);
          box-shadow:
            0 18px 58px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(18px);
        }

        .status-card {
          min-height: 82px;
          padding: 13px 16px;
          border-radius: 22px;
        }

        .status-card span,
        .status-card strong,
        .status-card small {
          display: block;
        }

        .status-card span {
          color: rgba(255, 247, 237, 0.62);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .status-card strong {
          margin-top: 8px;
          color: #fff7ed;
          font-size: 18px;
          line-height: 1.05;
        }

        .status-card small {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.58);
          font-size: 12px;
          font-weight: 800;
        }

        .status-card-invited {
          border-color: rgba(45, 212, 191, 0.22);
        }

        .status-card-open {
          border-color: rgba(251, 191, 36, 0.34);
          box-shadow:
            0 18px 58px rgba(251, 146, 60, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .status-card-mood {
          border-color: rgba(244, 114, 182, 0.24);
        }

        .village-app-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 260px minmax(0, 1fr) 220px;
          gap: 18px;
          margin-top: 18px;
          height: calc(100vh - 236px);
          min-height: 548px;
        }

        .village-panel {
          position: relative;
          z-index: 7;
          align-self: stretch;
          border-radius: 26px;
          padding: 14px;
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
          gap: 6px;
          margin-top: 13px;
        }

        .guide-row {
          display: grid;
          grid-template-columns: 38px minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          min-height: 58px;
          padding: 7px 9px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 17px;
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
          width: 30px;
          height: 30px;
          border-radius: 999px;
          color: #111827;
          background: #f8d391;
          font-size: 13px;
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
          width: 18px;
          height: 18px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          color: #f8d391;
          background: #111827;
          font-size: 10px;
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
          font-size: 13px;
          line-height: 1;
        }

        .guide-copy small {
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.54);
          font-size: 11px;
          font-weight: 850;
        }

        .guide-copy em {
          margin-top: 5px;
          color: rgba(255, 247, 237, 0.54);
          font-size: 10px;
          font-style: normal;
          font-weight: 750;
          line-height: 1.2;
        }

        .guide-state {
          color: #f8d391;
          font-size: 10px;
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

        .pilot-note,
        .quiet-card {
          margin-top: 12px;
          padding: 12px;
          border: 1px solid rgba(248, 211, 145, 0.18);
          border-radius: 18px;
          background: rgba(248, 211, 145, 0.065);
        }

        .pilot-note strong,
        .pilot-note span,
        .pilot-note small,
        .quiet-card span,
        .quiet-card strong,
        .quiet-card small {
          display: block;
        }

        .pilot-note strong,
        .quiet-card strong {
          color: #f8d391;
          font-size: 13px;
        }

        .pilot-note span,
        .quiet-card small {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 12px;
          font-weight: 750;
          line-height: 1.4;
        }

        .pilot-note small,
        .quiet-card span {
          margin-top: 6px;
          color: rgba(255, 247, 237, 0.48);
          font-size: 11px;
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
          background-image:
            linear-gradient(180deg, rgba(3, 7, 18, 0.18), rgba(3, 7, 18, 0.06) 40%, rgba(3, 7, 18, 0.32)),
            radial-gradient(circle at 50% 44%, rgba(251, 191, 36, 0.13), transparent 34%),
            url("/images/cho-neo/village-map-v1.png"),
            url("/images/cho-neo/village-map-v1.webp"),
            url("/images/cho-neo/isometric-village-placeholder.png");
          background-size: cover;
          background-position: center;
          filter: saturate(1.18) contrast(1.08) brightness(0.9);
          transform: scale(1.04);
        }

        .scene-vignette {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(3, 7, 18, 0.2), transparent 20%, transparent 80%, rgba(3, 7, 18, 0.22)),
            radial-gradient(circle at 50% 48%, transparent 0%, rgba(0, 0, 0, 0.2) 82%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 14%, rgba(0, 0, 0, 0.14));
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

        .scene-panel-open {
          position: absolute;
          left: 18px;
          top: 18px;
          z-index: 6;
          padding: 11px 13px;
          border: 1px solid rgba(248, 211, 145, 0.22);
          border-radius: 18px;
          background: rgba(8, 13, 24, 0.68);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(14px);
        }

        .scene-panel-open p,
        .scene-panel-open strong,
        .scene-panel-open span {
          display: block;
          margin: 0;
        }

        .scene-panel-open p {
          color: #f8d391;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .scene-panel-open strong {
          margin-top: 4px;
          font-size: 18px;
        }

        .scene-panel-open span {
          color: rgba(255, 247, 237, 0.62);
          font-size: 11px;
          font-weight: 850;
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
            url("/images/cho-neo/village-map-v1.png"),
            url("/images/cho-neo/village-map-v1.webp"),
            url("/images/cho-neo/isometric-village-placeholder.png");
          background-size: cover;
          background-position: center;
          filter: saturate(0.72) brightness(0.82);
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
        .mini-map-pin-market { left: 47%; top: 74%; }

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
            padding: 20px 20px 92px;
          }

          .village-topbar {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .village-brand {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px 18px;
            align-items: end;
          }

          .village-brand small {
            grid-column: 1 / -1;
            margin-top: 0;
          }

          .village-app-grid {
            grid-template-columns: minmax(0, 1fr);
            min-height: auto;
          }

          .village-guide,
          .village-mini {
            order: 2;
          }

          .village-guide {
            display: none;
          }

          .village-scene {
            order: 1;
            min-height: 610px;
          }

          .village-mini {
            display: grid;
            grid-template-columns: 220px minmax(0, 1fr) 180px;
            gap: 14px;
            align-items: start;
          }

          .village-mini .panel-heading {
            grid-column: 1 / -1;
          }

          .mini-map-card,
          .room-status-list,
          .quiet-card {
            margin-top: 0;
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
            min-height: 100vh;
            margin: 0;
            padding: 16px 12px 110px;
            border: 0;
            border-radius: 0;
          }

          .village-device::before {
            display: none;
          }

          .village-brand {
            display: block;
          }

          .village-brand p {
            font-size: clamp(32px, 12vw, 48px);
          }

          .village-brand span {
            margin-top: 6px;
            font-size: 12px;
          }

          .village-brand small {
            margin-top: 12px;
            font-size: 13px;
          }

          .village-status-grid {
            grid-template-columns: 1fr 1fr;
          }

          .status-card {
            min-height: 74px;
            padding: 12px;
            border-radius: 18px;
          }

          .status-card strong {
            margin-top: 6px;
            font-size: 15px;
          }

          .status-card small {
            display: none;
          }

          .status-card-mood {
            grid-column: 1 / -1;
          }

          .village-app-grid {
            margin-top: 14px;
          }

          .village-scene {
            min-height: 590px;
            border-radius: 24px;
          }

          .scene-art {
            background-position: 42% center;
            transform: scale(1.14);
          }

          .room-hotspot {
            display: grid;
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
            --hotspot-x: 52% !important;
            --hotspot-y: 86% !important;
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

          .scene-panel-open {
            left: 12px;
            top: 12px;
          }

          .scene-pilot-ribbon {
            bottom: 12px;
            width: calc(100% - 24px);
            display: block;
            padding: 12px;
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
            position: fixed;
            left: 10px;
            right: 10px;
            bottom: 10px;
            display: flex;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            gap: 6px;
            padding: 7px;
            border-radius: 22px;
            background: rgba(3, 7, 18, 0.82);
            scrollbar-width: none;
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
          .village-status-grid {
            grid-template-columns: 1fr;
          }

          .village-scene {
            min-height: 560px;
          }

          .room-status-list {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
