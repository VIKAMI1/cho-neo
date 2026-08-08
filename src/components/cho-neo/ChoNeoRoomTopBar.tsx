import Link from "next/link";
import type { ReactNode } from "react";

type ChoNeoRoomTopBarProps = {
  ariaLabel: string;
  feedback?: ReactNode;
  memberLabel?: string;
  onMemberClick?: () => void;
};

export function ChoNeoRoomTopBar({
  ariaLabel,
  feedback,
  memberLabel,
  onMemberClick,
}: ChoNeoRoomTopBarProps) {
  return (
    <div className="cho-neo-room-top-bar" aria-label={ariaLabel}>
      <Link className="cho-neo-room-top-bar__back" href="/cho-neo">
        <span aria-hidden="true">←</span>
        <span>Sân Làng</span>
      </Link>
      {memberLabel && onMemberClick ? (
        <button className="cho-neo-room-top-bar__member" onClick={onMemberClick} type="button">
          {memberLabel}
        </button>
      ) : null}
      <span
        className="cho-neo-shared-music-slot cho-neo-room-top-bar__music"
        data-cho-neo-shared-music-slot
      />
      {feedback}

      <style jsx>{`
        .cho-neo-room-top-bar {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          max-width: 100%;
          margin-bottom: 20px;
          overflow-x: auto;
          scrollbar-width: none;
          white-space: nowrap;
        }

        .cho-neo-room-top-bar::-webkit-scrollbar {
          display: none;
        }

        .cho-neo-room-top-bar__back,
        .cho-neo-room-top-bar__member {
          box-sizing: border-box;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 44px;
          max-width: 154px;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 10px;
          padding: 7px 12px;
          overflow: hidden;
          color: rgba(255, 247, 237, 0.86);
          background: rgba(255, 247, 237, 0.045);
          font: inherit;
          font-size: 13px;
          font-weight: 400;
          text-decoration: none;
          text-overflow: ellipsis;
        }

        .cho-neo-room-top-bar__member {
          cursor: pointer;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cho-neo-room-top-bar__back:hover,
        .cho-neo-room-top-bar__member:hover {
          border-color: rgba(248, 211, 145, 0.48);
          background: rgba(255, 247, 237, 0.08);
        }

        .cho-neo-room-top-bar__back:focus-visible,
        .cho-neo-room-top-bar__member:focus-visible {
          outline: 3px solid rgba(248, 211, 145, 0.32);
          outline-offset: 2px;
        }

        .cho-neo-room-top-bar__music {
          display: grid;
          flex: 0 0 42px;
          place-items: center;
          width: 42px;
          min-width: 42px;
          height: 44px;
        }

        @media (max-width: 640px) {
          .cho-neo-room-top-bar {
            margin-bottom: 16px;
          }

          .cho-neo-room-top-bar__back,
          .cho-neo-room-top-bar__member {
            padding-inline: 10px;
          }
        }
      `}</style>
    </div>
  );
}
