import Image from "next/image";
import Link from "next/link";

export default function ChoNeoEntrancePage() {
  return (
    <main className="cho-neo-entrance-page">
      <div className="entrance-atmosphere" aria-hidden="true">
        <span className="lantern lantern-one" />
        <span className="lantern lantern-two" />
        <span className="lantern lantern-three" />
        <span className="lantern lantern-four" />
        <span className="rooftop-line" />
        <span className="market-path" />
        <span className="gate-silhouette" />
      </div>

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
        <Link href="/cho-neo">Vào Chợ</Link>
      </section>

      <p className="entrance-signature">Created by Bao Nguyen &amp; VIKAMI, with GPT.</p>

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
          background:
            radial-gradient(circle at 50% 18%, rgba(248, 211, 145, 0.16), transparent 28%),
            radial-gradient(circle at 18% 78%, rgba(143, 25, 28, 0.26), transparent 35%),
            radial-gradient(circle at 86% 72%, rgba(248, 211, 145, 0.11), transparent 34%),
            linear-gradient(160deg, #100307 0%, #2a0610 36%, #5b1119 66%, #080204 100%);
        }

        .cho-neo-entrance-page::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -3;
          background:
            radial-gradient(ellipse at 50% 76%, rgba(248, 211, 145, 0.12), transparent 38%),
            linear-gradient(to top, rgba(10, 2, 5, 0.66), transparent 46%);
          opacity: 0.8;
        }

        .cho-neo-entrance-page::after {
          content: "";
          position: absolute;
          inset: -18% -10%;
          z-index: -2;
          background:
            radial-gradient(ellipse at center, transparent 0 34%, rgba(8, 1, 4, 0.5) 78%),
            linear-gradient(to top, rgba(8, 1, 4, 0.78), transparent 48%),
            linear-gradient(to bottom, rgba(8, 1, 4, 0.28), transparent 24%);
          pointer-events: none;
        }

        .entrance-atmosphere {
          position: absolute;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .entrance-atmosphere::before {
          content: "";
          position: absolute;
          inset: -3%;
          background-image: url("/images/cho-neo/village-map-summer-night.png");
          background-size: cover;
          background-position: center bottom;
          filter: saturate(0.9) contrast(0.96);
          opacity: 0.64;
          transform: scale(1.02);
        }

        .entrance-atmosphere::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 50% 45%, rgba(58, 7, 17, 0.18), rgba(10, 2, 5, 0.64) 68%),
            linear-gradient(to bottom, rgba(8, 1, 4, 0.64), rgba(38, 5, 12, 0.44) 42%, rgba(7, 1, 4, 0.86));
        }

        .lantern {
          position: absolute;
          width: 58px;
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 214, 128, 0.42), rgba(255, 160, 76, 0.12) 44%, transparent 72%);
          filter: blur(2px);
          opacity: 0.68;
          animation: entrance-breathe 10s ease-in-out infinite;
        }

        .lantern-one {
          top: 26%;
          left: 16%;
          transform: scale(0.72);
        }

        .lantern-two {
          top: 30%;
          right: 15%;
          transform: scale(0.54);
          animation-delay: -3s;
        }

        .lantern-three {
          right: 28%;
          bottom: 28%;
          transform: scale(0.42);
          animation-delay: -6s;
        }

        .lantern-four {
          left: 30%;
          bottom: 30%;
          transform: scale(0.32);
          animation-delay: -4.5s;
        }

        .rooftop-line {
          position: absolute;
          left: 50%;
          bottom: clamp(118px, 21vh, 210px);
          width: min(92vw, 920px);
          height: clamp(74px, 13vh, 128px);
          transform: translateX(-50%);
          background:
            linear-gradient(145deg, transparent 0 43%, rgba(10, 2, 5, 0.64) 43% 56%, transparent 56%),
            linear-gradient(215deg, transparent 0 43%, rgba(10, 2, 5, 0.62) 43% 56%, transparent 56%),
            linear-gradient(to top, rgba(10, 2, 5, 0.78) 0 26%, transparent 26%);
          clip-path: polygon(0 100%, 8% 72%, 17% 88%, 27% 58%, 38% 84%, 50% 50%, 62% 84%, 73% 58%, 83% 88%, 92% 72%, 100% 100%);
          opacity: 0.2;
          filter: blur(0.6px);
        }

        .market-path {
          position: absolute;
          left: 50%;
          bottom: -2vh;
          width: min(76vw, 680px);
          height: 42vh;
          transform: translateX(-50%);
          background:
            radial-gradient(ellipse at center top, rgba(248, 211, 145, 0.18), transparent 40%),
            linear-gradient(to bottom, rgba(248, 211, 145, 0.12), rgba(78, 12, 18, 0.04) 58%, transparent);
          clip-path: polygon(45% 0, 55% 0, 78% 100%, 22% 100%);
          opacity: 0.36;
          filter: blur(0.8px);
        }

        .gate-silhouette {
          position: absolute;
          left: 50%;
          bottom: -1px;
          width: min(94vw, 880px);
          height: clamp(118px, 22vh, 220px);
          transform: translateX(-50%);
          background:
            linear-gradient(to right, transparent 0 7%, rgba(7, 1, 3, 0.78) 7% 8.5%, transparent 8.5% 18%, rgba(7, 1, 3, 0.72) 18% 19.5%, transparent 19.5% 80.5%, rgba(7, 1, 3, 0.72) 80.5% 82%, transparent 82% 91.5%, rgba(7, 1, 3, 0.78) 91.5% 93%, transparent 93%),
            linear-gradient(to bottom, transparent 0 36%, rgba(7, 1, 3, 0.72) 36% 41%, transparent 41%),
            linear-gradient(to top, rgba(7, 1, 3, 0.82) 0 32%, transparent 32%);
          opacity: 0.28;
          filter: blur(0.5px);
        }

        .cho-neo-entrance-card {
          width: min(100%, 480px);
          display: grid;
          justify-items: center;
          gap: 14px;
          text-align: center;
          position: relative;
          animation: entrance-breathe 12s ease-in-out infinite;
        }

        .cho-neo-entrance-card::before {
          content: "";
          position: absolute;
          z-index: -1;
          inset: -34px -42px;
          border-radius: 999px;
          background: radial-gradient(ellipse at center, rgba(28, 5, 10, 0.62), rgba(28, 5, 10, 0.24) 52%, transparent 72%);
          filter: blur(8px);
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
          font-size: clamp(1.9rem, 4.1vw, 2.8rem);
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
        }

        @keyframes entrance-breathe {
          0%,
          100% {
            opacity: 0.82;
          }
          50% {
            opacity: 1;
          }
        }

        @media (max-width: 640px) {
          .cho-neo-entrance-page {
            padding: 30px 20px 78px;
          }

          .cho-neo-entrance-card {
            gap: 13px;
          }

          .market-path {
            width: 120vw;
            bottom: -3vh;
          }

          .gate-silhouette {
            width: 126vw;
            height: 140px;
          }

          .lantern-one {
            left: 4%;
          }

          .lantern-two {
            right: 3%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cho-neo-entrance-card,
          .lantern {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
