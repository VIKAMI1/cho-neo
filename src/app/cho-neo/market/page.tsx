import Link from "next/link";

const futureSections = [
  {
    title: "Supplier Booths",
    text: "Future booth spaces for vendors who respect the village and earn trust before selling.",
    tone: "gold",
  },
  {
    title: "Product Drops",
    text: "A later place for useful launches, not noisy blasts or pressure campaigns.",
    tone: "rose",
  },
  {
    title: "Trusted Tools",
    text: "Community-vetted tools, equipment, and practical shop supplies when the system is ready.",
    tone: "cyan",
  },
  {
    title: "Community Deals",
    text: "Future offers that serve members instead of interrupting the rooms where people gather.",
    tone: "green",
  },
  {
    title: "Verified Brands",
    text: "Brand presence may come later with rules, proof, and clear separation from conversation.",
    tone: "violet",
  },
];

export default function ChoNeoMarketPage() {
  return (
    <main className="market-page">
      <div className="street-glow" />
      <div className="shutter-grid" />

      <section className="market-shell" aria-labelledby="market-title">
        <header className="market-hero">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="market-title">Market Street</h1>
            <p className="intro">
              Reserved for the future marketplace of Cho Neo Village.
            </p>
          </div>

          <Link className="back-link" href="/cho-neo">
            <span className="back-kicker">Cho Neo Village</span>
            <span>Back to Village Square</span>
          </Link>
        </header>

        <section className="closed-street" aria-label="Locked Market Street">
          <div className="street-heading">
            <div>
              <p className="eyebrow">Closed For Phase 1</p>
              <h2>Community comes first. Commerce comes second.</h2>
            </div>
            <p>
              Market Street is closed for Phase 1. The village must build trust
              before suppliers enter.
            </p>
          </div>

          <div className="storefront-row" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className="locked-grid">
            {futureSections.map((section) => (
              <article
                className={`locked-card locked-${section.tone}`}
                key={section.title}
              >
                <span className="card-light" />
                <span className="lock-label">Locked</span>
                <div className="shutter" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </div>

          <p className="guardrail">
            Suppliers may have booths later. They do not control village
            conversation. No spam, no product dumping, no hijacking the café.
          </p>
        </section>
      </section>

      <style>{`
        .market-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 16%, rgba(251, 191, 36, 0.22), transparent 30%),
            radial-gradient(circle at 82% 14%, rgba(244, 114, 182, 0.13), transparent 28%),
            linear-gradient(180deg, #101224 0%, #21162c 48%, #151015 100%);
        }

        .street-glow,
        .shutter-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .street-glow {
          background:
            radial-gradient(ellipse at 50% 18%, rgba(253, 230, 138, 0.16), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(251, 191, 36, 0.12), transparent 48%);
        }

        .shutter-grid {
          top: 40%;
          transform: perspective(620px) rotateX(62deg);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(253, 230, 138, 0.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(253, 230, 138, 0.08) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 100%);
          opacity: 0.44;
        }

        .market-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .market-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
        }

        .eyebrow {
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
          max-width: 700px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.82);
          font-size: clamp(16px, 1.8vw, 21px);
          line-height: 1.5;
        }

        .back-link {
          flex: 0 0 auto;
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-height: 50px;
          padding: 7px 15px;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          line-height: 1.1;
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 0 34px rgba(251, 191, 36, 0.2);
        }

        .back-kicker {
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.68;
        }

        .closed-street {
          position: relative;
          overflow: hidden;
          margin-top: 22px;
          padding: 22px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.16), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.66);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
        }

        .closed-street::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -124px;
          width: min(940px, 108%);
          height: 360px;
          transform: translateX(-50%) rotate(-1deg);
          border-radius: 50%;
          background: rgba(75, 47, 60, 0.84);
          box-shadow: inset 0 0 48px rgba(0, 0, 0, 0.28);
        }

        .street-heading,
        .storefront-row,
        .locked-grid,
        .guardrail {
          position: relative;
          z-index: 1;
        }

        .street-heading {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 18px;
          align-items: end;
        }

        .street-heading h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 56px);
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .street-heading > p {
          margin: 0;
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 20px;
          background: rgba(253, 230, 138, 0.1);
          color: rgba(255, 247, 237, 0.8);
          font-size: 14px;
          line-height: 1.5;
        }

        .storefront-row {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-top: 20px;
          height: 86px;
        }

        .storefront-row span {
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 18px 18px 8px 8px;
          background:
            repeating-linear-gradient(
              180deg,
              rgba(253, 230, 138, 0.18) 0 8px,
              rgba(15, 23, 42, 0.62) 8px 16px
            );
          box-shadow:
            0 0 28px rgba(251, 191, 36, 0.1),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .locked-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .locked-card {
          position: relative;
          overflow: hidden;
          min-height: 230px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.74);
          box-shadow:
            0 16px 42px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.09);
        }

        .locked-card::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          height: 8px;
          border-radius: 999px;
          opacity: 0.56;
        }

        .locked-gold::after {
          background: #fde68a;
        }

        .locked-rose::after {
          background: #fda4af;
        }

        .locked-cyan::after {
          background: #67e8f9;
        }

        .locked-green::after {
          background: #86efac;
        }

        .locked-violet::after {
          background: #c4b5fd;
        }

        .card-light {
          position: absolute;
          inset: -40% -30% auto auto;
          width: 160px;
          height: 160px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.11);
          filter: blur(8px);
        }

        .lock-label {
          position: relative;
          z-index: 1;
          display: inline-flex;
          margin-bottom: 14px;
          padding: 7px 10px;
          border: 1px solid rgba(253, 230, 138, 0.24);
          border-radius: 999px;
          color: #fde68a;
          background: rgba(253, 230, 138, 0.08);
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .shutter {
          position: relative;
          z-index: 1;
          display: grid;
          gap: 5px;
          margin-bottom: 18px;
        }

        .shutter span {
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 247, 237, 0.18);
        }

        .locked-card h3 {
          position: relative;
          z-index: 1;
          margin: 0;
          color: #fff7ed;
          font-size: 21px;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .locked-card p {
          position: relative;
          z-index: 1;
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.7);
          font-size: 14px;
          line-height: 1.5;
        }

        .guardrail {
          margin: 16px 0 0;
          padding: 14px 16px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 18px;
          background: rgba(253, 230, 138, 0.1);
          color: rgba(255, 247, 237, 0.8);
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 1040px) {
          .locked-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .market-shell {
            padding: 18px;
          }

          .market-hero,
          .street-heading {
            display: grid;
            grid-template-columns: 1fr;
          }

          .back-link {
            width: fit-content;
          }

          .storefront-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            height: 148px;
          }

          .locked-grid {
            grid-template-columns: 1fr;
          }

          .closed-street {
            padding: 16px;
            border-radius: 26px;
          }
        }
      `}</style>
    </main>
  );
}
