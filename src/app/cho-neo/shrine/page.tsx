import Image from "next/image";
import Link from "next/link";

export default function ChoNeoShrinePage() {
  return (
    <main className="shrine-page">
      <div className="lantern-glow" />
      <div className="floor-grid" />

      <section className="shrine-shell" aria-labelledby="shrine-title">
        <header className="shrine-header">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="shrine-title">Ông Địa Shrine</h1>
            <p className="intro">The cultural heart of Cho Neo Village.</p>
          </div>

          <Link className="back-link" href="/cho-neo">
            Back to Village Square
          </Link>
        </header>

        <section className="shrine-room" aria-label="Ông Địa shrine room">
          <div className="altar">
            <span className="altar-light" />
            <div className="ong-dia-frame">
              <Image
                src="/ong-dia.png"
                alt="Ông Địa"
                width={180}
                height={180}
                priority
              />
            </div>
            <div className="offering-row" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>

          <div className="ritual-grid">
            <section className="ritual-card daily-message">
              <p className="card-kicker">Daily Ông Địa Message</p>
              <h2>Đi chậm, nhìn kỹ, làm ăn có đức thì làng nhớ tên.</h2>
              <p>
                Move slowly, look carefully, and build with good faith. The
                village remembers.
              </p>
            </section>

            <section className="ritual-card wish-bowl">
              <p className="card-kicker">Wish Bowl</p>
              <div className="bowl" aria-hidden="true">
                <span />
              </div>
              <h2>Leave a wish for the village.</h2>
              <p>
                The bowl is quiet for now, but the ritual belongs here.
              </p>
            </section>

            <Link className="ritual-card xin-xam-door" href="/xin-xam">
              <p className="card-kicker">Xin Xăm Door</p>
              <div className="xin-xam-image">
                <Image
                  src="/Xin-Xam.png"
                  alt="Xin Xăm"
                  width={120}
                  height={180}
                />
              </div>
              <h2>Draw a stick when your mind is noisy.</h2>
              <span>Open Xin Xăm</span>
            </Link>
          </div>
        </section>
      </section>

      <style>{`
        .shrine-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 14%, rgba(251, 191, 36, 0.24), transparent 28%),
            radial-gradient(circle at 84% 16%, rgba(244, 114, 182, 0.12), transparent 26%),
            linear-gradient(180deg, #101224 0%, #21162c 42%, #321b29 72%, #151015 100%);
        }

        .lantern-glow,
        .floor-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .lantern-glow {
          background:
            radial-gradient(ellipse at 50% 18%, rgba(253, 230, 138, 0.18), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(251, 191, 36, 0.16), transparent 48%);
        }

        .floor-grid {
          top: 40%;
          transform: perspective(620px) rotateX(62deg);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(253, 230, 138, 0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(253, 230, 138, 0.1) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 100%);
          opacity: 0.48;
        }

        .shrine-shell {
          position: relative;
          z-index: 1;
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .shrine-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .eyebrow,
        .card-kicker {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(46px, 8vw, 92px);
          line-height: 0.9;
          letter-spacing: -0.045em;
          text-wrap: balance;
        }

        .intro {
          max-width: 680px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.82);
          font-size: clamp(16px, 1.8vw, 21px);
          line-height: 1.5;
        }

        .back-link {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 15px;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 0 34px rgba(251, 191, 36, 0.22);
        }

        .shrine-room {
          position: relative;
          overflow: hidden;
          min-height: 650px;
          margin-top: 22px;
          padding: 26px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 20%, rgba(253, 230, 138, 0.22), transparent 30%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.62);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }

        .shrine-room::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -130px;
          width: min(900px, 105%);
          height: 430px;
          transform: translateX(-50%) rotate(-2deg);
          border-radius: 50%;
          background: rgba(75, 47, 60, 0.82);
          box-shadow: inset 0 0 48px rgba(0, 0, 0, 0.24);
        }

        .altar {
          position: relative;
          z-index: 2;
          width: min(420px, 100%);
          margin: 0 auto;
          display: grid;
          justify-items: center;
        }

        .altar-light {
          position: absolute;
          top: -54px;
          width: 260px;
          height: 190px;
          border-radius: 50%;
          background: rgba(251, 191, 36, 0.28);
          filter: blur(28px);
        }

        .ong-dia-frame {
          position: relative;
          width: 196px;
          height: 196px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border: 1px solid rgba(253, 230, 138, 0.34);
          border-radius: 34px;
          background: rgba(253, 230, 138, 0.12);
          box-shadow:
            0 0 58px rgba(251, 191, 36, 0.24),
            0 22px 60px rgba(0, 0, 0, 0.34);
        }

        .ong-dia-frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .offering-row {
          position: relative;
          width: min(360px, 100%);
          height: 92px;
          margin-top: -18px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 50%;
          background: rgba(101, 64, 75, 0.86);
          box-shadow:
            0 18px 40px rgba(0, 0, 0, 0.3),
            inset 0 0 28px rgba(0, 0, 0, 0.22);
        }

        .offering-row span {
          position: absolute;
          bottom: 28px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7ed, #fbbf24);
          box-shadow: 0 0 24px rgba(251, 191, 36, 0.34);
        }

        .offering-row span:nth-child(1) { left: 28%; }
        .offering-row span:nth-child(2) { left: 50%; transform: translateX(-50%); }
        .offering-row span:nth-child(3) { right: 28%; }

        .ritual-grid {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 24px;
        }

        .ritual-card {
          position: relative;
          overflow: hidden;
          min-height: 260px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 26px;
          color: inherit;
          text-decoration: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.72);
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
        }

        .ritual-card::before {
          content: "";
          position: absolute;
          inset: -34px 20px auto;
          height: 104px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.22);
          filter: blur(24px);
        }

        .ritual-card h2,
        .ritual-card p,
        .ritual-card span,
        .xin-xam-image,
        .bowl {
          position: relative;
          z-index: 1;
        }

        .ritual-card h2 {
          margin: 26px 0 0;
          font-size: clamp(24px, 3vw, 38px);
          line-height: 1;
          letter-spacing: -0.035em;
        }

        .ritual-card p:not(.card-kicker) {
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 14px;
          line-height: 1.5;
        }

        .bowl {
          width: 132px;
          height: 74px;
          margin: 24px auto 0;
          border-radius: 12px 12px 999px 999px;
          background: linear-gradient(180deg, #fef3c7, #b45309);
          box-shadow: 0 0 38px rgba(251, 191, 36, 0.22);
        }

        .bowl span {
          position: absolute;
          left: 18px;
          right: 18px;
          top: 12px;
          height: 18px;
          border-radius: 999px;
          background: rgba(17, 24, 39, 0.42);
        }

        .xin-xam-door {
          display: flex;
          flex-direction: column;
        }

        .xin-xam-door:hover {
          border-color: rgba(253, 230, 138, 0.34);
          box-shadow:
            0 24px 70px rgba(0, 0, 0, 0.42),
            0 0 44px rgba(251, 191, 36, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }

        .xin-xam-image {
          width: 86px;
          height: 118px;
          margin: 18px auto 0;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 18px;
          background: rgba(253, 230, 138, 0.1);
        }

        .xin-xam-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .xin-xam-door span {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          min-height: 38px;
          margin-top: auto;
          padding: 0 12px;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 13px;
          font-weight: 950;
        }

        @media (max-width: 900px) {
          .shrine-header {
            flex-direction: column;
          }

          .ritual-grid {
            grid-template-columns: 1fr;
          }

          .ritual-card {
            min-height: auto;
          }
        }

        @media (max-width: 640px) {
          .shrine-shell {
            padding: 16px 12px 22px;
          }

          .back-link {
            width: 100%;
          }

          .shrine-room {
            padding: 18px;
          }
        }
      `}</style>
    </main>
  );
}
