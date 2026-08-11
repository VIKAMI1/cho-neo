import Image from "next/image";
import { ChoNeoExitCue } from "@/components/cho-neo/ChoNeoExitCue";
import { ChoNeoEnterMarketLink } from "@/components/cho-neo/ChoNeoSoftExit";

export default function ChoNeoEntrancePage() {
  return (
    <main className="cho-neo-entrance-page">
      <div className="entrance-atmosphere" aria-hidden="true" />

      <section aria-labelledby="cho-neo-entrance-title" className="cho-neo-entrance-card">
        <Image
          alt="Chợ Neo"
          className="entrance-emblem"
          height={112}
          priority
          src="/icon.png"
          width={112}
        />
        <h1 id="cho-neo-entrance-title">Hẹn gặp lại.</h1>
        <p className="entrance-teaser">Lần sau ghé lại, Chợ có thể đã khác.</p>
        <ChoNeoEnterMarketLink>Vào Chợ</ChoNeoEnterMarketLink>
      </section>

      <p className="entrance-signature">Created by Bao Nguyen &amp; VIKAMI, with GPT.</p>
      <ChoNeoExitCue />

      <style>{`
        .cho-neo-entrance-page {
          min-height: 100vh;
          min-height: 100svh;
          position: relative;
          display: grid;
          place-items: center;
          overflow: hidden;
          padding: clamp(28px, 7vh, 72px) 24px;
          color: #fff4df;
          isolation: isolate;
          background: #21060c;
        }

        .cho-neo-entrance-page::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            radial-gradient(ellipse at 50% 43%, rgba(20, 3, 8, 0.38), rgba(20, 3, 8, 0.12) 38%, transparent 60%),
            radial-gradient(ellipse at center, transparent 0 48%, rgba(9, 1, 4, 0.26) 100%),
            linear-gradient(to bottom, rgba(10, 1, 4, 0.2), rgba(80, 10, 17, 0.13) 46%, rgba(8, 1, 3, 0.24));
          pointer-events: none;
        }

        .cho-neo-entrance-page::after {
          content: "";
          position: absolute;
          inset: -18% -10%;
          z-index: -1;
          background:
            radial-gradient(ellipse at center, rgba(40, 5, 12, 0.34) 0 42%, rgba(10, 1, 4, 0.72) 82%),
            linear-gradient(to bottom, rgba(14, 2, 6, 0.36), rgba(34, 3, 10, 0.64) 58%, rgba(7, 1, 3, 0.78));
          opacity: 0;
          animation: entrance-background-darken 8s ease-in-out forwards;
          pointer-events: none;
        }

        .entrance-atmosphere {
          position: absolute;
          inset: 0;
          z-index: -2;
          overflow: hidden;
          pointer-events: none;
        }

        .entrance-atmosphere::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image: url("/images/cho-neo/cho-neo-farewell-market.png");
          background-size: cover;
          background-position: center;
          animation: entrance-artwork-fade 8s ease-in-out forwards;
        }

        .entrance-atmosphere::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 48%, transparent 0 36%, rgba(22, 3, 7, 0.12) 74%),
            linear-gradient(to bottom, rgba(40, 4, 9, 0.08), rgba(18, 2, 6, 0.16));
          animation: entrance-artwork-fade 8s ease-in-out forwards;
        }

        .cho-neo-entrance-card {
          width: min(100%, 480px);
          display: grid;
          justify-items: center;
          gap: 14px;
          text-align: center;
          position: relative;
          animation: entrance-foreground-fade 6s ease-in-out forwards;
        }

        .cho-neo-entrance-card::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: -34px -42px;
          border-radius: 999px;
          background: radial-gradient(ellipse at center, rgba(26, 4, 9, 0.36), rgba(26, 4, 9, 0.12) 54%, transparent 74%);
          filter: blur(10px);
        }

        .cho-neo-entrance-card p,
        .cho-neo-entrance-card h1,
        .entrance-signature {
          margin: 0;
        }

        .entrance-emblem {
          width: clamp(78px, 13vw, 112px);
          height: clamp(78px, 13vw, 112px);
          margin-bottom: 2px;
          border-radius: 18px;
          box-shadow:
            0 14px 36px rgba(0, 0, 0, 0.32),
            0 0 28px rgba(248, 211, 145, 0.18);
        }

        .cho-neo-entrance-card h1 {
          color: #fff4df;
          font-family: var(--font-newsreader), Georgia, serif;
          font-size: clamp(1.9rem, 4.1vw, 3rem);
          font-weight: 600;
          line-height: 1.08;
          text-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        }

        .entrance-teaser {
          max-width: 31rem;
          color: rgba(255, 244, 223, 0.78);
          font-size: clamp(1rem, 2.5vw, 1.18rem);
          font-weight: 400;
          line-height: 1.55;
        }

        .cho-neo-entrance-card a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 8px;
          border: 1px solid rgba(248, 211, 145, 0.5);
          border-radius: 12px;
          padding: 11px 20px;
          color: #3b1d2a;
          background: linear-gradient(180deg, #ffe3a1, #f8c66f);
          font-size: 0.98rem;
          font-weight: 600;
          text-decoration: none;
          box-shadow:
            0 16px 34px rgba(0, 0, 0, 0.28),
            0 0 28px rgba(248, 211, 145, 0.16);
          animation: entrance-link-hit-area 6s steps(1, end) forwards;
        }

        .cho-neo-entrance-card a:hover,
        .cho-neo-entrance-card a:focus-visible {
          transform: translateY(-1px);
          box-shadow:
            0 18px 36px rgba(0, 0, 0, 0.3),
            0 0 34px rgba(248, 211, 145, 0.22);
        }

        .cho-neo-entrance-card a:focus-visible {
          outline: 3px solid rgba(255, 244, 223, 0.65);
          outline-offset: 3px;
        }

        .entrance-signature {
          position: absolute;
          left: 50%;
          bottom: clamp(18px, 4vh, 34px);
          width: min(100% - 48px, 520px);
          transform: translateX(-50%);
          color: rgba(255, 244, 223, 0.58);
          font-size: clamp(0.78rem, 2vw, 0.9rem);
          font-weight: 400;
          line-height: 1.45;
          text-align: center;
          animation: entrance-foreground-fade 6s ease-in-out forwards;
        }

        .entrance-exit-cue {
          position: absolute;
          left: 50%;
          bottom: calc(env(safe-area-inset-bottom, 0px) + clamp(30px, 7vh, 58px));
          z-index: 2;
          width: min(100% - 48px, 340px);
          transform: translateX(-50%);
          color: rgba(255, 244, 223, 0.72);
          text-align: center;
          opacity: 0;
          pointer-events: none;
          animation: entrance-exit-cue-appear 0.9s ease 8.3s forwards;
        }

        .entrance-exit-cue p,
        .entrance-exit-cue span {
          display: block;
          margin: 0;
          text-shadow: 0 10px 26px rgba(0, 0, 0, 0.38);
        }

        .entrance-exit-cue p {
          font-size: clamp(0.9rem, 2.8vw, 1rem);
          font-weight: 500;
          line-height: 1.45;
        }

        .entrance-exit-cue span {
          margin-top: 3px;
          color: rgba(255, 244, 223, 0.48);
          font-size: clamp(0.76rem, 2.35vw, 0.84rem);
          font-weight: 400;
          line-height: 1.4;
        }

        .exit-gesture {
          position: relative;
          height: 72px;
          margin-bottom: 8px;
        }

        .exit-gesture-pulse {
          position: absolute;
          left: 50%;
          bottom: 6px;
          width: 54px;
          height: 18px;
          border: 1px solid rgba(255, 225, 175, 0.28);
          border-radius: 999px;
          transform: translateX(-50%);
          box-shadow: 0 0 22px rgba(248, 198, 111, 0.1);
          animation: entrance-gesture-pulse 3.2s ease 8.3s 2 forwards;
        }

        .exit-gesture-hand {
          position: absolute;
          left: 50%;
          bottom: 10px;
          color: rgba(255, 244, 223, 0.58);
          transform: translateX(-50%);
          filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.28));
          animation: entrance-gesture-swipe 3.2s ease 8.3s 2 forwards;
        }

        @keyframes entrance-foreground-fade {
          0%,
          58.333% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes entrance-artwork-fade {
          0%,
          75% {
            opacity: 1;
          }

          100% {
            opacity: 0;
          }
        }

        @keyframes entrance-link-hit-area {
          0%,
          99.9% {
            pointer-events: auto;
            visibility: visible;
          }

          100% {
            pointer-events: none;
            visibility: hidden;
          }
        }

        @keyframes entrance-background-darken {
          0%,
          75% {
            opacity: 0;
          }

          100% {
            opacity: 1;
          }
        }

        @keyframes entrance-exit-cue-appear {
          to {
            opacity: 1;
          }
        }

        @keyframes entrance-gesture-swipe {
          0%,
          18% {
            opacity: 0.48;
            transform: translateX(-50%) translateY(0);
          }

          48% {
            opacity: 0.72;
            transform: translateX(-50%) translateY(-34px);
          }

          72% {
            opacity: 0.26;
            transform: translateX(-50%) translateY(-42px);
          }

          100% {
            opacity: 0.38;
            transform: translateX(-50%) translateY(-22px);
          }
        }

        @keyframes entrance-gesture-pulse {
          0%,
          20% {
            opacity: 0.28;
            transform: translateX(-50%) scale(0.84);
          }

          52% {
            opacity: 0.48;
            transform: translateX(-50%) scale(1.12);
          }

          100% {
            opacity: 0.18;
            transform: translateX(-50%) scale(1);
          }
        }

        @media (max-width: 640px) {
          .cho-neo-entrance-page {
            padding: 30px 20px 78px;
          }

          .cho-neo-entrance-card {
            gap: 13px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cho-neo-entrance-page::after,
          .entrance-atmosphere::before,
          .entrance-atmosphere::after,
          .cho-neo-entrance-card,
          .cho-neo-entrance-card a,
          .entrance-signature {
            animation: none;
          }

          .entrance-exit-cue {
            opacity: 1;
            animation: none;
          }

          .exit-gesture-hand,
          .exit-gesture-pulse {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
