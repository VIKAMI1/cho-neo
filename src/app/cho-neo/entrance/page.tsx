import Link from "next/link";

export default function ChoNeoEntrancePage() {
  return (
    <main className="cho-neo-entrance-page">
      <div className="entrance-atmosphere" aria-hidden="true">
        <span className="lantern lantern-one" />
        <span className="lantern lantern-two" />
        <span className="lantern lantern-three" />
        <span className="market-depth" />
        <span className="gate-silhouette" />
      </div>

      <section aria-labelledby="cho-neo-entrance-title" className="cho-neo-entrance-card">
        <p className="entrance-brand">Chợ Neo</p>
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
            radial-gradient(circle at 50% 18%, rgba(248, 211, 145, 0.18), transparent 26%),
            radial-gradient(circle at 12% 72%, rgba(177, 42, 34, 0.22), transparent 34%),
            radial-gradient(circle at 88% 70%, rgba(248, 211, 145, 0.1), transparent 31%),
            linear-gradient(160deg, #18050b 0%, #3a0711 42%, #5b1119 67%, #120509 100%);
        }

        .cho-neo-entrance-page::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -3;
          background:
            linear-gradient(90deg, rgba(255, 244, 223, 0.028) 1px, transparent 1px),
            linear-gradient(0deg, rgba(255, 244, 223, 0.02) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: linear-gradient(to bottom, transparent, black 18%, black 70%, transparent);
          opacity: 0.55;
        }

        .cho-neo-entrance-page::after {
          content: "";
          position: absolute;
          inset: -18% -10%;
          z-index: -2;
          background:
            radial-gradient(ellipse at center, transparent 0 42%, rgba(8, 1, 4, 0.42) 76%),
            linear-gradient(to top, rgba(8, 1, 4, 0.72), transparent 42%);
          pointer-events: none;
        }

        .entrance-atmosphere {
          position: absolute;
          inset: 0;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .lantern {
          position: absolute;
          width: 72px;
          aspect-ratio: 1;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 210, 117, 0.38), rgba(255, 160, 76, 0.12) 46%, transparent 72%);
          filter: blur(2px);
          opacity: 0.75;
          animation: entrance-breathe 9s ease-in-out infinite;
        }

        .lantern-one {
          top: 16%;
          left: 18%;
          transform: scale(0.72);
        }

        .lantern-two {
          top: 24%;
          right: 16%;
          transform: scale(0.54);
          animation-delay: -3s;
        }

        .lantern-three {
          right: 28%;
          bottom: 24%;
          transform: scale(0.42);
          animation-delay: -6s;
        }

        .market-depth {
          position: absolute;
          left: 50%;
          bottom: 5vh;
          width: min(82vw, 760px);
          height: 30vh;
          transform: translateX(-50%);
          background:
            linear-gradient(110deg, transparent 0 34%, rgba(248, 211, 145, 0.13) 34% 35%, transparent 35% 100%),
            linear-gradient(250deg, transparent 0 34%, rgba(248, 211, 145, 0.1) 34% 35%, transparent 35% 100%),
            radial-gradient(ellipse at center bottom, rgba(248, 211, 145, 0.2), transparent 58%);
          clip-path: polygon(8% 100%, 30% 16%, 70% 16%, 92% 100%);
          opacity: 0.56;
          filter: blur(0.2px);
        }

        .gate-silhouette {
          position: absolute;
          left: 50%;
          bottom: -1px;
          width: min(94vw, 880px);
          height: clamp(118px, 22vh, 220px);
          transform: translateX(-50%);
          background:
            linear-gradient(to right, transparent 0 5%, #120408 5% 8%, transparent 8% 17%, #120408 17% 20%, transparent 20% 80%, #120408 80% 83%, transparent 83% 92%, #120408 92% 95%, transparent 95%),
            linear-gradient(to bottom, transparent 0 34%, #120408 34% 42%, transparent 42%),
            linear-gradient(135deg, transparent 0 43%, #120408 43% 48%, transparent 48%),
            linear-gradient(225deg, transparent 0 43%, #120408 43% 48%, transparent 48%),
            linear-gradient(to top, #0b0205 0 34%, transparent 34%);
          opacity: 0.74;
        }

        .cho-neo-entrance-card {
          width: min(100%, 520px);
          display: grid;
          justify-items: center;
          gap: 15px;
          text-align: center;
          animation: entrance-breathe 12s ease-in-out infinite;
        }

        .cho-neo-entrance-card p,
        .cho-neo-entrance-card h1,
        .entrance-signature {
          margin: 0;
        }

        .entrance-brand {
          color: #f8d391;
          font-size: clamp(1rem, 2.3vw, 1.18rem);
          font-weight: 600;
          letter-spacing: 0;
          text-shadow: 0 0 22px rgba(248, 211, 145, 0.26);
        }

        .cho-neo-entrance-card h1 {
          color: #fff4df;
          font-family: var(--font-newsreader), Georgia, serif;
          font-size: clamp(3rem, 10vw, 6.8rem);
          font-weight: 600;
          line-height: 0.95;
          text-shadow: 0 16px 42px rgba(0, 0, 0, 0.34);
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
            padding: 28px 20px 76px;
          }

          .cho-neo-entrance-card {
            gap: 13px;
          }

          .market-depth {
            width: 120vw;
            bottom: 7vh;
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
