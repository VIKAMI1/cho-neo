import type { ReactNode } from "react";
import { ChoNeoMobileVillageNav } from "./ChoNeoMobileVillageNav";
import { ChoNeoVillageRail } from "./ChoNeoVillageRail";

type ChoNeoRoomShellProps = {
  children: ReactNode;
  className?: string;
  currentNavId: string;
  rightPanel?: ReactNode;
};

export function ChoNeoRoomShell({
  children,
  className = "",
  currentNavId,
  rightPanel,
}: ChoNeoRoomShellProps) {
  const classes = ["cho-neo-room-shell", className].filter(Boolean).join(" ");

  return (
    <main className={classes}>
      <ChoNeoMobileVillageNav currentId={currentNavId} />
      <div className="cho-neo-room-shell__layout">
        <ChoNeoVillageRail currentId={currentNavId} />
        <div className="cho-neo-room-shell__content">{children}</div>
        {rightPanel ? (
          <aside className="cho-neo-room-shell__right-panel">{rightPanel}</aside>
        ) : null}
      </div>

      <style jsx>{`
        .cho-neo-room-shell {
          box-sizing: border-box;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .cho-neo-room-shell__layout {
          box-sizing: border-box;
          width: min(1400px, 100%);
          display: grid;
          grid-template-columns: minmax(150px, 180px) minmax(0, 1fr);
          gap: clamp(0.72rem, 1.5vw, 1.1rem);
          margin: 0 auto;
          padding: clamp(0.8rem, 2vw, 1.3rem);
        }

        .cho-neo-room-shell__content {
          box-sizing: border-box;
          min-width: 0;
        }

        .cho-neo-room-shell__right-panel {
          min-width: 0;
        }

        .cho-neo-room-shell__layout:has(.cho-neo-room-shell__right-panel) {
          grid-template-columns:
            minmax(150px, 180px)
            minmax(0, 1fr)
            minmax(230px, 300px);
        }

        @media (max-width: 1100px) {
          .cho-neo-room-shell__layout:has(.cho-neo-room-shell__right-panel) {
            grid-template-columns: minmax(150px, 170px) minmax(0, 1fr);
          }

          .cho-neo-room-shell__right-panel {
            grid-column: 2;
          }
        }

        @media (max-width: 820px) {
          .cho-neo-room-shell__layout,
          .cho-neo-room-shell__layout:has(.cho-neo-room-shell__right-panel) {
            display: block;
            width: 100%;
            padding: 0;
          }

          .cho-neo-room-shell__layout :global(.cho-neo-village-rail) {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
