import Link from "next/link";

const regions = [
  {
    name: "North America",
    href: "/cho-neo/world/north-america",
    tone: "cyan",
    skyline: [34, 62, 48, 76, 42, 58],
    note: "shops, suburbs, downtown leases",
  },
  {
    name: "South America",
    href: "/cho-neo/world/south-america",
    tone: "green",
    skyline: [28, 52, 40, 68, 36, 48],
    note: "new routes, trade, family calls",
  },
  {
    name: "Asia",
    href: "/cho-neo/world/asia",
    tone: "rose",
    skyline: [44, 78, 56, 50, 68, 38],
    note: "suppliers, visits, late-night deals",
  },
  {
    name: "Australia",
    href: "/cho-neo/world/australia",
    tone: "gold",
    skyline: [28, 44, 66, 36, 54, 42],
    note: "coastal cities, steady work",
  },
  {
    name: "Europe",
    href: "/cho-neo/world/europe",
    tone: "violet",
    skyline: [54, 36, 70, 58, 42, 64],
    note: "old streets, fresh storefronts",
  },
];

const shops = ["Nails", "Lashes", "Beauty", "Café", "Market"];

function Skyline({ heights }: { heights: number[] }) {
  return (
    <div className="skyline" aria-hidden="true">
      {heights.map((height, index) => (
        <span key={`${height}-${index}`} style={{ height }} />
      ))}
    </div>
  );
}

function RegionGate({
  name,
  href,
  tone,
  skyline,
  note,
}: {
  name: string;
  href: string;
  tone: string;
  skyline: number[];
  note: string;
}) {
  return (
    <Link className={`gate gate-${tone}`} href={href} aria-label={`Enter ${name}`}>
      <div className="gate-glow" />
      <Skyline heights={skyline} />
      <div className="portal">
        <div className="portal-arch" />
        <div className="portal-floor" />
      </div>
      <h2>{name}</h2>
      <p>{note}</p>
      <span className="gate-cta">Enter region</span>
    </Link>
  );
}

function Storefront({ name, index }: { name: string; index: number }) {
  return (
    <div className={`store store-${index}`}>
      <div className="store-awning" />
      <div className="store-sign">{name}</div>
      <div className="store-windows">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function Sedan({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className={`sedan ${reverse ? "sedan-reverse" : ""}`} aria-hidden="true">
      <div className="sedan-body" />
      <div className="sedan-cabin" />
      <div className="sedan-light" />
      <div className="wheel wheel-left" />
      <div className="wheel wheel-right" />
    </div>
  );
}

export default function ChoNeoWorldPage() {
  return (
    <main className="world-page">
      <div className="night-sky" />
      <div className="street-grid" />
      <div className="distant-city" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} style={{ height: 34 + ((index * 19) % 70) }} />
        ))}
      </div>

      <section className="world-shell" aria-labelledby="world-title">
        <header className="world-header">
          <div>
            <p className="eyebrow">ChoNeo World</p>
            <h1 id="world-title">A dusk plaza for Vietnamese lives in motion.</h1>
            <p className="intro">
              A front porch for the forum: warm lights, small businesses, family
              momentum, and gates opening toward cities around the world.
            </p>
          </div>
          <Link className="forum-link" href="/cho-neo">
            Enter ChoNeo Forum
          </Link>
        </header>

        <div className="world-stage">
          <div className="gates gates-left">
            {regions.slice(0, 2).map((region) => (
              <RegionGate key={region.name} {...region} />
            ))}
          </div>

          <section className="plaza" aria-label="Central ChoNeo plaza">
            <div className="plaza-orbit" />
            <div className="light-column">
              <span className="light-top" />
              <span className="light-stem" />
              <span className="light-base" />
            </div>

            <div className="hub-card">
              <p>Central ChoNeo Plaza</p>
              <strong>Forum first. World as the welcome layer.</strong>
            </div>

            <div className="storefront-row">
              {shops.map((shop, index) => (
                <Storefront key={shop} name={shop} index={index} />
              ))}
            </div>

            <div className="gathering" aria-hidden="true">
              {Array.from({ length: 10 }).map((_, index) => (
                <span key={index} className={index % 2 ? "stool stool-low" : "stool"} />
              ))}
            </div>

            <div className="cars">
              <Sedan />
              <Sedan reverse />
            </div>
          </section>

          <div className="gates gates-right">
            {regions.slice(2).map((region) => (
              <RegionGate key={region.name} {...region} />
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .world-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 22% 16%, rgba(251, 191, 36, 0.25), transparent 28%),
            radial-gradient(circle at 78% 14%, rgba(45, 212, 191, 0.18), transparent 26%),
            linear-gradient(180deg, #101224 0%, #21162c 42%, #321b29 70%, #151015 100%);
        }

        .night-sky,
        .street-grid,
        .distant-city {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .night-sky {
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.58) 1px, transparent 1.5px),
            radial-gradient(circle, rgba(255,217,143,0.42) 1px, transparent 1.5px);
          background-position: 10% 16%, 70% 8%;
          background-size: 88px 88px, 132px 132px;
          opacity: 0.22;
        }

        .street-grid {
          top: 42%;
          transform: perspective(520px) rotateX(62deg) translateY(12%);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(251, 191, 36, 0.16) 1px, transparent 1px),
            linear-gradient(90deg, rgba(251, 191, 36, 0.13) 1px, transparent 1px);
          background-size: 58px 58px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 100%);
          opacity: 0.55;
        }

        .distant-city {
          top: auto;
          bottom: 20%;
          height: 140px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 8px;
          opacity: 0.26;
          filter: blur(0.2px);
        }

        .distant-city span {
          width: min(3.4vw, 34px);
          border-radius: 6px 6px 0 0;
          background: linear-gradient(180deg, #273449, #111827);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
        }

        .world-shell {
          position: relative;
          z-index: 1;
          min-height: 100vh;
          width: min(1440px, 100%);
          margin: 0 auto;
          padding: 18px 22px 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .world-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 4px 2px 0;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.26em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          max-width: 860px;
          font-size: clamp(36px, 6.2vw, 76px);
          line-height: 0.9;
          letter-spacing: -0.04em;
          text-wrap: balance;
        }

        .intro {
          margin: 18px 0 0;
          max-width: 680px;
          color: rgba(255, 247, 237, 0.78);
          font-size: clamp(14px, 1.6vw, 17px);
          line-height: 1.7;
        }

        .forum-link {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          padding: 0 18px;
          border: 1px solid rgba(253, 230, 138, 0.65);
          border-radius: 999px;
          color: #16110a;
          background: linear-gradient(180deg, #fef3c7, #fbbf24);
          font-size: 14px;
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 0 44px rgba(251, 191, 36, 0.32);
        }

        .world-stage {
          flex: 1;
          display: grid;
          grid-template-columns: minmax(180px, 0.72fr) minmax(420px, 1.46fr) minmax(180px, 0.9fr);
          gap: 18px;
          align-items: stretch;
        }

        .gates {
          display: grid;
          gap: 16px;
          align-content: center;
        }

        .gate {
          position: relative;
          min-height: 214px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 28px;
          padding: 14px;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.045)),
            rgba(8, 13, 28, 0.58);
          box-shadow:
            0 18px 50px rgba(0,0,0,0.34),
            inset 0 1px 0 rgba(255,255,255,0.12);
          backdrop-filter: blur(12px);
          transform: perspective(900px) rotateY(0deg);
        }

        .gates-left .gate:nth-child(1) { transform: perspective(900px) rotateY(8deg); }
        .gates-left .gate:nth-child(2) { transform: perspective(900px) rotateY(5deg) translateX(12px); }
        .gates-right .gate:nth-child(1) { transform: perspective(900px) rotateY(-7deg); }
        .gates-right .gate:nth-child(2) { transform: perspective(900px) rotateY(-4deg) translateX(-10px); }
        .gates-right .gate:nth-child(3) { transform: perspective(900px) rotateY(-8deg); }

        .gate-glow {
          position: absolute;
          inset: 16px 24px auto;
          height: 96px;
          border-radius: 999px;
          opacity: 0.48;
          filter: blur(24px);
        }

        .gate-cyan .gate-glow { background: #67e8f9; }
        .gate-green .gate-glow { background: #86efac; }
        .gate-rose .gate-glow { background: #fda4af; }
        .gate-gold .gate-glow { background: #fcd34d; }
        .gate-violet .gate-glow { background: #c4b5fd; }

        .skyline {
          position: relative;
          height: 80px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 5px;
          opacity: 0.88;
        }

        .skyline span {
          width: 18px;
          border-radius: 5px 5px 0 0;
          background:
            repeating-linear-gradient(180deg, rgba(253,230,138,0.32) 0 4px, transparent 4px 13px),
            linear-gradient(180deg, #172033, #050816);
          box-shadow: 0 0 22px rgba(0,0,0,0.25);
        }

        .portal {
          position: relative;
          height: 86px;
          margin-top: -2px;
          display: grid;
          place-items: center;
        }

        .portal-arch {
          width: 86px;
          height: 82px;
          border: 12px solid rgba(255, 247, 237, 0.72);
          border-bottom: 0;
          border-radius: 52px 52px 12px 12px;
          background: radial-gradient(circle at 50% 68%, rgba(255,255,255,0.62), rgba(251,191,36,0.15) 36%, rgba(0,0,0,0.22) 68%);
          box-shadow:
            0 0 34px rgba(251, 191, 36, 0.24),
            inset 0 0 24px rgba(255,255,255,0.16);
        }

        .portal-floor {
          position: absolute;
          bottom: 0;
          width: 120px;
          height: 18px;
          border-radius: 999px;
          background: rgba(0,0,0,0.34);
          box-shadow: 0 0 22px rgba(251,191,36,0.22);
        }

        .gate h2 {
          position: relative;
          margin: 10px 0 4px;
          text-align: center;
          font-size: 14px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .gate p {
          position: relative;
          margin: 0 auto;
          max-width: 210px;
          color: rgba(255, 247, 237, 0.66);
          text-align: center;
          font-size: 12px;
          line-height: 1.45;
        }

        .plaza {
          position: relative;
          min-height: 650px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 38px;
          background:
            radial-gradient(circle at 50% 28%, rgba(251, 191, 36, 0.28), transparent 26%),
            linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.04)),
            rgba(17, 24, 39, 0.44);
          box-shadow:
            0 28px 90px rgba(0,0,0,0.44),
            inset 0 1px 0 rgba(255,255,255,0.16);
          backdrop-filter: blur(14px);
        }

        .plaza::before,
        .plaza::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 78px;
          transform: translateX(-50%) rotate(-3deg);
          width: min(720px, 96%);
          height: 330px;
          border-radius: 50%;
          background: #4b2f3c;
          box-shadow: inset 0 0 42px rgba(0,0,0,0.24);
        }

        .plaza::after {
          bottom: 118px;
          width: min(560px, 78%);
          height: 230px;
          transform: translateX(-50%) rotate(2deg);
          background: #65404b;
          border: 1px solid rgba(253, 230, 138, 0.15);
        }

        .plaza-orbit {
          position: absolute;
          inset: 64px 10% auto;
          height: 190px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(253,230,138,0.20), transparent 64%);
          filter: blur(6px);
        }

        .light-column {
          position: relative;
          z-index: 2;
          width: 170px;
          height: 240px;
          margin: 36px auto 0;
        }

        .light-top {
          position: absolute;
          left: 50%;
          top: 0;
          width: 124px;
          height: 124px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(circle, #fff7ed 0 12%, #fde68a 28%, rgba(251,191,36,0.16) 66%, transparent 72%);
          box-shadow: 0 0 80px rgba(251, 191, 36, 0.66);
        }

        .light-stem {
          position: absolute;
          left: 50%;
          top: 70px;
          width: 18px;
          height: 130px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7ed, #f59e0b);
          box-shadow: 0 0 46px rgba(251, 191, 36, 0.58);
        }

        .light-base {
          position: absolute;
          left: 50%;
          bottom: 18px;
          width: 150px;
          height: 34px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgba(8, 13, 28, 0.82);
          box-shadow: 0 0 34px rgba(0,0,0,0.3);
        }

        .hub-card {
          position: relative;
          z-index: 3;
          width: min(430px, calc(100% - 34px));
          margin: -10px auto 0;
          padding: 16px 18px;
          border: 1px solid rgba(253,230,138,0.28);
          border-radius: 999px;
          text-align: center;
          background: rgba(8, 13, 28, 0.66);
          box-shadow: 0 0 44px rgba(251,191,36,0.18);
        }

        .hub-card p,
        .hub-card strong {
          display: block;
          margin: 0;
        }

        .hub-card p {
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .hub-card strong {
          margin-top: 5px;
          font-size: 14px;
          color: rgba(255,247,237,0.86);
        }

        .storefront-row {
          position: relative;
          z-index: 4;
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          width: min(760px, calc(100% - 28px));
          margin: 42px auto 0;
        }

        .store {
          min-height: 134px;
          padding: 11px;
          border: 1px solid rgba(255,255,255,0.25);
          border-radius: 20px;
          background: linear-gradient(180deg, rgba(255,255,255,0.88), rgba(255,255,255,0.52));
          color: #111827;
          box-shadow:
            0 14px 34px rgba(0,0,0,0.22),
            0 0 34px rgba(251, 191, 36, 0.18);
          transform: perspective(420px) rotateX(4deg);
        }

        .store-0 { background-color: #ffe4e6; }
        .store-1 { background-color: #ede9fe; }
        .store-2 { background-color: #fef3c7; }
        .store-3 { background-color: #cffafe; }
        .store-4 { background-color: #d1fae5; }

        .store-awning {
          height: 18px;
          border-radius: 14px 14px 6px 6px;
          background:
            repeating-linear-gradient(90deg, #111827 0 16px, #fef3c7 16px 28px);
        }

        .store-sign {
          margin-top: 12px;
          padding: 8px 6px;
          border-radius: 12px;
          background: rgba(255,255,255,0.74);
          text-align: center;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.46);
        }

        .store-windows {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 5px;
          margin-top: 12px;
        }

        .store-windows span {
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(15,23,42,0.20), rgba(15,23,42,0.08));
        }

        .gathering {
          position: relative;
          z-index: 5;
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 30px;
        }

        .stool {
          width: 28px;
          height: 19px;
          border-radius: 999px 999px 10px 10px;
          background: #ef4444;
          box-shadow: 0 8px 0 #991b1b, 0 12px 20px rgba(0,0,0,0.28);
        }

        .stool-low {
          background: #f59e0b;
          box-shadow: 0 8px 0 #92400e, 0 12px 20px rgba(0,0,0,0.28);
        }

        .cars {
          position: relative;
          z-index: 5;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          width: min(620px, calc(100% - 40px));
          margin: 26px auto 0;
        }

        .sedan {
          position: relative;
          width: 158px;
          height: 58px;
        }

        .sedan-reverse {
          transform: scaleX(-1);
        }

        .sedan-body {
          position: absolute;
          left: 12px;
          bottom: 16px;
          width: 132px;
          height: 30px;
          border-radius: 34px 48px 12px 12px;
          background: linear-gradient(180deg, #111827, #030712);
          box-shadow: 0 14px 24px rgba(0,0,0,0.34);
        }

        .sedan-cabin {
          position: absolute;
          left: 52px;
          bottom: 34px;
          width: 58px;
          height: 23px;
          transform: skewX(-18deg);
          border-radius: 16px 18px 4px 4px;
          background: linear-gradient(180deg, rgba(207,250,254,0.46), rgba(103,232,249,0.18));
        }

        .sedan-light {
          position: absolute;
          right: 15px;
          bottom: 34px;
          width: 20px;
          height: 5px;
          border-radius: 999px;
          background: #fde68a;
          box-shadow: 0 0 18px #fde68a;
        }

        .wheel {
          position: absolute;
          bottom: 5px;
          width: 24px;
          height: 24px;
          border: 7px solid #030712;
          border-radius: 999px;
          background: #71717a;
        }

        .wheel-left { left: 32px; }
        .wheel-right { right: 32px; }

        @media (max-width: 980px) {
          .world-shell {
            padding: 18px 14px;
          }

          .world-header {
            flex-direction: column;
          }

          .world-stage {
            grid-template-columns: 1fr;
          }

          .gates {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gates-right {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .gate,
          .gates-left .gate:nth-child(1),
          .gates-left .gate:nth-child(2),
          .gates-right .gate:nth-child(1),
          .gates-right .gate:nth-child(2),
          .gates-right .gate:nth-child(3) {
            transform: none;
          }

          .plaza {
            min-height: 610px;
          }

          .storefront-row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .world-shell {
            padding: 16px 12px 22px;
          }

          h1 {
            font-size: clamp(36px, 14vw, 58px);
          }

          .forum-link {
            width: 100%;
          }

          .gates,
          .gates-right {
            grid-template-columns: 1fr;
          }

          .gate {
            min-height: 196px;
          }

          .plaza {
            min-height: 740px;
            border-radius: 28px;
          }

          .storefront-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            margin-top: 30px;
          }

          .store {
            min-height: 120px;
          }

          .gathering {
            flex-wrap: wrap;
            width: 220px;
            margin-left: auto;
            margin-right: auto;
          }

          .cars {
            width: 100%;
            gap: 10px;
            justify-content: center;
          }

          .sedan {
            width: 130px;
            transform: scale(0.86);
          }

          .sedan-reverse {
            transform: scaleX(-1) scale(0.86);
          }
        }
        .gate {
          color: inherit;
          text-decoration: none;
          cursor: pointer;
        }

        .gate:focus-visible {
          outline: 3px solid rgba(253, 230, 138, 0.9);
          outline-offset: 4px;
        }

        .gate-cta {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: fit-content;
          margin-top: 10px;
          padding: 7px 10px;
          border-radius: 999px;
          color: #111827;
          background: rgba(253, 230, 138, 0.92);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

      `}</style>
    </main>
  );
}
