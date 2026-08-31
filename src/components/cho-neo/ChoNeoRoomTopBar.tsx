import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  isVerifiedChoNeoMemberProfile,
  type ChoNeoMemberProfile,
} from "@/lib/cho-neo/member-identity";

type ChoNeoRoomTopBarProps = {
  ariaLabel: string;
  feedback?: ReactNode;
  memberProfile?: ChoNeoMemberProfile | null;
  navigation?: ReactNode;
  onMemberClick?: () => void;
  tone?: "dark" | "light";
};

export function ChoNeoRoomTopBar({
  ariaLabel,
  feedback,
  memberProfile,
  navigation,
  onMemberClick,
  tone = "dark",
}: ChoNeoRoomTopBarProps) {
  const verifiedMember = isVerifiedChoNeoMemberProfile(memberProfile) ? memberProfile : null;

  return (
    <div className={`cho-neo-room-top-bar cho-neo-room-top-bar--${tone}`} aria-label={ariaLabel}>
      <Link className="cho-neo-room-top-bar__back" href="/cho-neo">
        <span aria-hidden="true">←</span>
        <span>Sân Làng</span>
      </Link>
      {navigation ? (
        <nav className="cho-neo-room-top-bar__navigation" aria-label="Đi nhanh trong Chợ Neo">
          {navigation}
        </nav>
      ) : null}
      <div className="cho-neo-room-top-bar__actions">
        {onMemberClick ? (
          <button className="cho-neo-room-top-bar__member" onClick={onMemberClick} type="button">
            {verifiedMember ? (
              <>
                <span aria-hidden="true" className="cho-neo-room-top-bar__avatar">
                  <Image alt="" height={32} src={verifiedMember.avatar.src} width={32} />
                </span>
                <span className="cho-neo-room-top-bar__member-copy">
                  <strong>{verifiedMember.displayName}</strong>
                  <small>Thành viên</small>
                </span>
              </>
            ) : (
              <strong>Vào Chợ</strong>
            )}
          </button>
        ) : null}
        <span
          className="cho-neo-shared-music-slot cho-neo-room-top-bar__music"
          data-cho-neo-shared-music-slot
        />
        {feedback}
      </div>

      <style jsx>{`
        .cho-neo-room-top-bar {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          width: 100%;
          min-height: 50px;
          min-width: 0;
          max-width: 100%;
          margin-bottom: 18px;
          border-bottom: 1px solid rgba(248, 211, 145, 0.08);
          padding: 0 0 7px;
        }

        .cho-neo-room-top-bar__back,
        .cho-neo-room-top-bar__member,
        .cho-neo-room-top-bar :global(.cho-neo-feedback-button) {
          box-sizing: border-box;
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 44px;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 10px;
          padding: 7px 12px;
          overflow: hidden;
          color: rgba(255, 247, 237, 0.86);
          background: rgba(255, 247, 237, 0.04);
          box-shadow: none;
          font: inherit;
          font-size: 13px;
          font-weight: 400;
          text-decoration: none;
          text-overflow: ellipsis;
        }

        .cho-neo-room-top-bar__navigation {
          display: flex;
          flex: 1 1 auto;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .cho-neo-room-top-bar__navigation :global(a),
        .cho-neo-room-top-bar__navigation :global(span) {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 10px;
          padding: 8px 12px;
          color: rgba(255, 247, 237, 0.76);
          font-size: 12px;
          text-decoration: none;
          white-space: nowrap;
        }

        .cho-neo-room-top-bar__navigation :global([aria-current="page"]) {
          color: #fff7ed;
          background: rgba(255, 247, 237, 0.1);
          font-weight: 600;
        }

        .cho-neo-room-top-bar__navigation :global(a:hover) {
          color: #fff7ed;
          background: rgba(255, 247, 237, 0.07);
        }

        .cho-neo-room-top-bar__actions {
          display: flex;
          flex: 0 1 auto;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          min-width: 0;
        }

        .cho-neo-room-top-bar__member {
          max-width: min(240px, 34vw);
          cursor: pointer;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cho-neo-room-top-bar__member strong {
          min-width: 0;
          overflow: hidden;
          color: rgba(255, 247, 237, 0.9);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.05;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cho-neo-room-top-bar__avatar {
          display: block;
          flex: 0 0 30px;
          width: 30px;
          height: 30px;
          overflow: hidden;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 999px;
          background: rgba(248, 211, 145, 0.1);
        }

        .cho-neo-room-top-bar__avatar :global(img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .cho-neo-room-top-bar__member-copy {
          display: grid;
          min-width: 0;
          gap: 3px;
          text-align: left;
        }

        .cho-neo-room-top-bar__member-copy small {
          min-width: 0;
          overflow: hidden;
          color: rgba(255, 247, 237, 0.48);
          font-size: 10px;
          font-weight: 400;
          line-height: 1;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .cho-neo-room-top-bar__back:hover,
        .cho-neo-room-top-bar__member:hover,
        .cho-neo-room-top-bar :global(.cho-neo-feedback-button:hover) {
          border-color: rgba(248, 211, 145, 0.48);
          background: rgba(255, 247, 237, 0.08);
        }

        .cho-neo-room-top-bar__back:focus-visible,
        .cho-neo-room-top-bar__member:focus-visible,
        .cho-neo-room-top-bar :global(.cho-neo-feedback-button:focus-visible) {
          outline: 3px solid rgba(248, 211, 145, 0.32);
          outline-offset: 2px;
        }

        .cho-neo-room-top-bar__music {
          display: grid;
          flex: 0 0 44px;
          place-items: center;
          width: 44px;
          min-width: 44px;
          height: 44px;
        }

        .cho-neo-room-top-bar__music :global(.cho-neo-theme-audio) {
          width: 44px;
          min-width: 44px;
          height: 44px;
          min-height: 44px;
          border-radius: 10px;
          padding: 0;
          background: rgba(255, 247, 237, 0.04);
          box-shadow: none;
        }

        .cho-neo-room-top-bar__music :global(.theme-audio-controls) {
          width: 100%;
          height: 100%;
        }

        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__back,
        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__member,
        .cho-neo-room-top-bar--light :global(.cho-neo-feedback-button) {
          border-color: rgba(101, 49, 41, 0.18);
          color: #653129;
          background: rgba(255, 255, 255, 0.52);
        }

        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__member strong,
        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__navigation :global(a),
        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__navigation :global(span) {
          color: #653129;
        }

        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__navigation :global([aria-current="page"]) {
          color: #fff8ea;
          background: #713225;
        }

        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__member-copy small {
          color: rgba(101, 49, 41, 0.62);
        }

        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__navigation :global(a) {
          border-color: rgba(101, 49, 41, 0.18);
          background: rgba(255, 255, 255, 0.52);
        }

        .cho-neo-room-top-bar--light .cho-neo-room-top-bar__music :global(.cho-neo-theme-audio) {
          border: 1px solid rgba(101, 49, 41, 0.18);
          background: rgba(255, 255, 255, 0.52);
        }

        .cho-neo-room-top-bar__music :global(.theme-music-toggle) {
          width: 100%;
          height: 100%;
          border: 0;
          border-radius: 10px;
          background: transparent;
          box-shadow: none;
          font-size: 22px;
          text-shadow: none;
        }

        .cho-neo-room-top-bar :global(.cho-neo-feedback-button) {
          min-width: 64px;
          height: 44px;
          min-height: 44px;
          margin: 0;
          cursor: pointer;
          white-space: nowrap;
        }

        .cho-neo-room-top-bar :global(.cho-neo-feedback-button)::before {
          content: "♥";
          color: rgba(255, 214, 222, 0.88);
          font-size: 14px;
          line-height: 1;
        }

        .cho-neo-room-top-bar :global(.cho-neo-feedback-button small) {
          display: none;
        }

        @media (max-width: 640px) {
          .cho-neo-room-top-bar {
            gap: 8px;
            min-height: 50px;
            margin-bottom: 14px;
          }

          .cho-neo-room-top-bar__back {
            width: 44px;
            min-width: 44px;
            padding-inline: 0;
          }

          .cho-neo-room-top-bar__back span:last-child,
          .cho-neo-room-top-bar__member-copy small,
          .cho-neo-room-top-bar :global(.cho-neo-feedback-button span) {
            position: absolute;
            width: 1px;
            height: 1px;
            overflow: hidden;
            clip: rect(0 0 0 0);
            clip-path: inset(50%);
            white-space: nowrap;
          }

          .cho-neo-room-top-bar__member {
            flex: 1 1 auto;
            max-width: min(46vw, 190px);
            padding-inline: 8px;
          }

          .cho-neo-room-top-bar__navigation {
            order: 3;
            width: 100%;
            overflow-x: auto;
            padding-top: 4px;
          }

          .cho-neo-room-top-bar {
            flex-wrap: wrap;
          }

          .cho-neo-room-top-bar__navigation :global(a),
          .cho-neo-room-top-bar__navigation :global(span) {
            min-height: 36px;
            padding: 7px 10px;
          }

          .cho-neo-room-top-bar__actions {
            flex: 1 1 auto;
          }

          .cho-neo-room-top-bar__avatar {
            flex-basis: 28px;
            width: 28px;
            height: 28px;
          }

          .cho-neo-room-top-bar :global(.cho-neo-feedback-button) {
            width: 44px;
            min-width: 44px;
            padding-inline: 0;
          }
        }
      `}</style>
    </div>
  );
}
