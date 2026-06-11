import Link from "next/link";
import type { CSSProperties } from "react";

const destinations = [
  {
    name: "Gossip Café",
    href: "/cho-neo/gossip",
    status: "Open",
    kicker: "First mingle room",
    description:
      "Salon talk, market whispers, table chatter, and the daily pulse of the beauty floor.",
    tone: "violet",
    kind: "cafe",
    x: "7%",
    y: "22%",
    tags: ["Tables", "Stories", "House rules"],
  },
  {
    name: "Ông Địa Shrine",
    href: "/cho-neo/shrine",
    status: "Open soon",
    kicker: "Ritual center",
    description:
      "A quiet corner for daily luck, Xin Xăm energy, wishes, and grounded reminders before the workday starts.",
    tone: "gold",
    kind: "shrine",
    x: "39%",
    y: "8%",
    tags: ["Xin Xăm", "Wishes", "Ritual"],
  },
  {
    name: "Show-Off Gallery",
    href: "/cho-neo/show-off",
    status: "Open soon",
    kicker: "Work worth showing",
    description:
      "A gallery for fresh sets, shop glow-ups, shelves, stations, and small wins from the community.",
    tone: "rose",
    kind: "gallery",
    x: "71%",
    y: "23%",
    tags: ["Nails", "Before / after", "Wins"],
  },
  {
    name: "Technique Hall",
    href: "/cho-neo/technique",
    status: "Coming soon",
    kicker: "Skill exchange",
    description:
      "Practical technique talk for products, prep, retention, photos, service flow, and clean shop habits.",
    tone: "cyan",
    kind: "hall",
    x: "14%",
    y: "60%",
    tags: ["How-to", "Products", "Craft"],
  },
  {
    name: "Owner Corner",
    status: "Coming soon",
    kicker: "Small-business room",
    description:
      "Owner and manager talk about pricing, policies, hiring, booking rules, rent, and burnout-proof operations.",
    tone: "green",
    kind: "owner",
    x: "72%",
    y: "59%",
    tags: ["Policies", "Pricing", "Teams"],
  },
  {
    name: "Waterfront",
    status: "Coming soon",
    kicker: "Cool-down path",
    description:
      "A slower place for decompression, off-topic check-ins, late-night reflection, and breathing room.",
    tone: "blue",
    kind: "waterfront",
    x: "41%",
    y: "69%",
    tags: ["Rest", "Check-ins", "After hours"],
  },
  {
    name: "Market Street",
    href: "/cho-neo/market",
    status: "Locked / future",
    kicker: "Commerce later",
    description:
      "Suppliers are not Phase 1. Community comes first, trust comes next, and commerce comes later.",
    tone: "locked",
    kind: "market",
    x: "42%",
    y: "39%",
    tags: ["Not Phase 1", "Trust first", "Later"],
  },
];

function DestinationBuilding({
  destination,
}: {
  destination: (typeof destinations)[number];
}) {
  const content = (
    <>
      <span className="building-glow" />
      <span className="building-shadow" />
      <div className="building-art" aria-hidden="true">
        <span className="roof" />
        <span className="facade">
          <span className="window-row">
            <i />
            <i />
            <i />
          </span>
          <span className="doorway" />
        </span>
      </div>
      <div className="building-copy">
        <div className="building-topline">
          <p>{destination.kicker}</p>
          <span>{destination.status}</span>
        </div>
        <h2>{destination.name}</h2>
        <p>{destination.description}</p>
      </div>
      <div className="building-tags" aria-label={`${destination.name} details`}>
        {destination.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
    </>
  );

  const className = `building building-${destination.tone} building-${destination.kind} ${
    destination.href ? "" : "building-disabled"
  }`;
  const style = {
    "--x": destination.x,
    "--y": destination.y,
  } as CSSProperties;

  if (destination.href) {
    return (
      <Link href={destination.href} className={className} style={style}>
        {content}
      </Link>
    );
  }

  return (
    <article className={className} style={style} aria-disabled="true">
      {content}
    </article>
  );
}

export default function ChoNeoPage() {
  return (
    <main className="forum-page">
      <div className="street-glow" />
      <div className="paper-grid" />

      <section className="forum-shell" aria-labelledby="forum-title">
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Cho Neo Village Square</p>
            <h1 id="forum-title">A hometown for the global nail industry.</h1>
            <p className="intro">
              Cho Neo is not a metaverse. It is a hometown for the global nail
              industry. Build density before geography: one warm square, real
              rooms, useful rituals, and community first.
            </p>
          </div>
        </header>

        <section className="village-note" aria-label="Village direction">
          <strong>Build density before geography.</strong>
          <span>
            One warm square, real rooms, useful rituals, and community first.
            Future districts are parked until the village is alive.
          </span>
        </section>

        <section className="village-map" aria-label="Cho Neo village map">
          <div className="skyline" aria-hidden="true">
            {Array.from({ length: 15 }).map((_, index) => (
              <span key={index} style={{ height: 24 + ((index * 17) % 56) }} />
            ))}
          </div>
          <div className="map-ground" aria-hidden="true">
            <span className="main-path" />
            <span className="cross-path" />
            <span className="side-path side-path-left" />
            <span className="side-path side-path-right" />
            <span className="water-edge" />
          </div>
          <div className="lanterns" aria-hidden="true">
            {Array.from({ length: 10 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>

          <div className="central-square" aria-hidden="true">
            <span className="square-orbit" />
            <span className="square-sign">Village Square</span>
            <span className="square-lamp" />
            <span className="square-plaza" />
          </div>

          {destinations.map((destination, index) => (
            <DestinationBuilding
              key={destination.name}
              destination={destination}
            />
          ))}

          <div className="map-caption" aria-hidden="true">
            <span>Community first</span>
            <span>Commerce later</span>
          </div>
        </section>
      </section>

      <style>{`
        .forum-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 16%, rgba(251, 191, 36, 0.24), transparent 28%),
            radial-gradient(circle at 82% 12%, rgba(45, 212, 191, 0.18), transparent 26%),
            linear-gradient(180deg, #101224 0%, #21162c 45%, #321b29 72%, #151015 100%);
        }

        .street-glow,
        .paper-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .street-glow {
          background:
            radial-gradient(ellipse at 50% 100%, rgba(251, 191, 36, 0.2), transparent 48%),
            radial-gradient(ellipse at 10% 70%, rgba(244, 114, 182, 0.12), transparent 34%),
            radial-gradient(ellipse at 90% 72%, rgba(34, 211, 238, 0.12), transparent 34%);
        }

        .paper-grid {
          top: 36%;
          transform: perspective(560px) rotateX(62deg);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(253, 230, 138, 0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(253, 230, 138, 0.1) 1px, transparent 1px);
          background-size: 54px 54px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 28%, black 100%);
          opacity: 0.58;
        }

        .forum-shell {
          position: relative;
          z-index: 1;
          width: min(1220px, 100%);
          min-height: 100vh;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 4px 2px 0;
        }

        .hero-copy {
          max-width: 920px;
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
          font-size: clamp(38px, 6.4vw, 74px);
          line-height: 0.92;
          letter-spacing: -0.04em;
          text-wrap: balance;
        }

        .intro {
          max-width: 820px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.8);
          font-size: clamp(14px, 1.45vw, 17px);
          line-height: 1.6;
        }

        .village-note {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 20px;
          background: rgba(8, 13, 28, 0.52);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .village-note strong {
          flex: 0 0 auto;
          color: #fde68a;
          font-size: 13px;
          font-weight: 950;
        }

        .village-note span {
          color: rgba(255, 247, 237, 0.72);
          font-size: 13px;
          line-height: 1.45;
        }

        .village-map {
          position: relative;
          min-height: 660px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 18%, rgba(253, 230, 138, 0.18), transparent 28%),
            radial-gradient(circle at 16% 74%, rgba(244, 114, 182, 0.12), transparent 34%),
            radial-gradient(circle at 88% 76%, rgba(45, 212, 191, 0.1), transparent 34%),
            rgba(15, 23, 42, 0.54);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }

        .skyline {
          position: absolute;
          left: 50%;
          top: 28px;
          width: min(760px, 82%);
          height: 96px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 8px;
          transform: translateX(-50%);
          opacity: 0.22;
          pointer-events: none;
        }

        .skyline span {
          width: min(3.2vw, 28px);
          border-radius: 7px 7px 0 0;
          background: linear-gradient(180deg, #273449, #111827);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
        }

        .map-ground,
        .map-ground span,
        .central-square,
        .central-square span,
        .lanterns,
        .lanterns span,
        .map-caption {
          position: absolute;
          pointer-events: none;
        }

        .map-ground {
          inset: 0;
          transform: perspective(760px) rotateX(58deg) translateY(19%);
          transform-origin: bottom center;
        }

        .main-path {
          left: 50%;
          bottom: -42px;
          width: 180px;
          height: 620px;
          transform: translateX(-50%);
          border-radius: 999px 999px 0 0;
          background:
            linear-gradient(90deg, transparent, rgba(253, 230, 138, 0.24), transparent),
            linear-gradient(180deg, rgba(101, 64, 75, 0.78), rgba(75, 47, 60, 0.9));
          box-shadow: inset 0 0 42px rgba(0, 0, 0, 0.2);
        }

        .cross-path {
          left: 10%;
          right: 10%;
          top: 50%;
          height: 126px;
          border-radius: 999px;
          background:
            linear-gradient(180deg, rgba(253, 230, 138, 0.14), transparent),
            rgba(101, 64, 75, 0.76);
          box-shadow: inset 0 0 42px rgba(0, 0, 0, 0.18);
        }

        .side-path {
          width: 300px;
          height: 84px;
          top: 34%;
          border-radius: 999px;
          background: rgba(101, 64, 75, 0.68);
        }

        .side-path-left {
          left: 16%;
          transform: rotate(-18deg);
        }

        .side-path-right {
          right: 15%;
          transform: rotate(17deg);
        }

        .water-edge {
          left: 22%;
          right: 22%;
          bottom: 56px;
          height: 72px;
          border-radius: 999px 999px 18px 18px;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0 18px, transparent 18px 38px),
            linear-gradient(180deg, rgba(45, 212, 191, 0.28), rgba(59, 130, 246, 0.22));
          box-shadow: 0 0 48px rgba(45, 212, 191, 0.18);
        }

        .central-square {
          left: 50%;
          top: 48%;
          width: 250px;
          height: 180px;
          transform: translate(-50%, -50%);
          display: grid;
          place-items: center;
        }

        .square-orbit {
          width: 250px;
          height: 138px;
          border: 1px solid rgba(253, 230, 138, 0.24);
          border-radius: 50%;
          background: rgba(253, 230, 138, 0.08);
          box-shadow:
            0 0 46px rgba(251, 191, 36, 0.2),
            inset 0 0 36px rgba(0, 0, 0, 0.22);
          transform: rotate(-4deg);
        }

        .square-plaza {
          width: 154px;
          height: 74px;
          border-radius: 50%;
          background: #65404b;
          box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.26);
        }

        .square-sign {
          top: 20px;
          padding: 8px 12px;
          border: 1px solid rgba(253, 230, 138, 0.36);
          border-radius: 999px;
          color: #111827;
          background: linear-gradient(180deg, #fef3c7, #fbbf24);
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: 0 0 36px rgba(251, 191, 36, 0.28);
        }

        .square-lamp {
          bottom: 30px;
          width: 18px;
          height: 86px;
          border-radius: 999px;
          background: linear-gradient(180deg, #fff7ed, #f59e0b);
          box-shadow: 0 0 54px rgba(251, 191, 36, 0.7);
        }

        .square-lamp::before {
          content: "";
          position: absolute;
          left: 50%;
          top: -34px;
          width: 70px;
          height: 70px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(circle, #fff7ed 0 14%, #fde68a 32%, rgba(251, 191, 36, 0.16) 68%, transparent 74%);
        }

        .lanterns {
          left: 9%;
          right: 9%;
          top: 45%;
          display: flex;
          justify-content: space-between;
        }

        .lanterns span {
          position: relative;
          width: 11px;
          height: 19px;
          border-radius: 999px;
          background: #ef4444;
          box-shadow: 0 0 24px rgba(239, 68, 68, 0.66);
        }

        .lanterns span:nth-child(even) {
          margin-top: 44px;
          background: #f59e0b;
          box-shadow: 0 0 24px rgba(245, 158, 11, 0.54);
        }

        .building {
          position: absolute;
          left: var(--x);
          top: var(--y);
          z-index: 4;
          width: 230px;
          min-height: 226px;
          display: flex;
          flex-direction: column;
          color: inherit;
          text-decoration: none;
          transform: translateZ(0);
          transition: transform 170ms ease, filter 170ms ease;
        }

        a.building:hover {
          transform: translateY(-5px);
          filter: drop-shadow(0 18px 34px rgba(0, 0, 0, 0.34));
        }

        .building:focus-visible {
          outline: 3px solid rgba(253, 230, 138, 0.88);
          outline-offset: 5px;
          border-radius: 24px;
        }

        .building-disabled {
          cursor: default;
        }

        .building-glow {
          position: absolute;
          inset: -18px 20px auto;
          height: 112px;
          border-radius: 999px;
          opacity: 0.36;
          filter: blur(24px);
        }

        .building-shadow {
          position: absolute;
          left: 50%;
          bottom: -10px;
          width: 82%;
          height: 34px;
          transform: translateX(-50%);
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.34);
          filter: blur(6px);
        }

        .building-art,
        .building-copy,
        .building-tags {
          position: relative;
          z-index: 1;
        }

        .building-art {
          height: 96px;
          display: grid;
          place-items: end center;
        }

        .roof {
          position: absolute;
          top: 2px;
          width: 132px;
          height: 54px;
          border-radius: 20px 20px 8px 8px;
          background: linear-gradient(135deg, rgba(253, 230, 138, 0.96), rgba(245, 158, 11, 0.9));
          clip-path: polygon(50% 0, 100% 66%, 92% 100%, 8% 100%, 0 66%);
          box-shadow: 0 0 32px rgba(251, 191, 36, 0.26);
        }

        .facade {
          position: relative;
          width: 150px;
          height: 74px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 16px 16px 18px 18px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.54)),
            #fef3c7;
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);
        }

        .window-row {
          position: absolute;
          left: 12px;
          right: 12px;
          top: 14px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .window-row i {
          height: 18px;
          border-radius: 7px;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.24), rgba(15, 23, 42, 0.08));
        }

        .doorway {
          position: absolute;
          left: 50%;
          bottom: 0;
          width: 34px;
          height: 30px;
          transform: translateX(-50%);
          border-radius: 14px 14px 0 0;
          background: rgba(17, 24, 39, 0.78);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.28);
        }

        .building-copy {
          margin-top: -6px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 22px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.05)),
            rgba(8, 13, 28, 0.74);
          box-shadow:
            0 16px 44px rgba(0, 0, 0, 0.32),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
        }

        .building-topline {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: center;
        }

        .building-topline p {
          margin: 0;
          color: #fde68a;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .building-topline span {
          flex: 0 0 auto;
          padding: 5px 8px;
          border-radius: 999px;
          color: #111827;
          background: rgba(253, 230, 138, 0.92);
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .building-disabled .building-topline span {
          color: rgba(255, 247, 237, 0.78);
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.14);
        }

        .building h2 {
          margin: 18px 0 0;
          font-size: 25px;
          line-height: 0.96;
          letter-spacing: -0.03em;
        }

        .building-copy > p {
          margin: 10px 0 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 13px;
          line-height: 1.45;
        }

        .building-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 8px;
        }

        .building-tags span {
          padding: 6px 8px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 247, 237, 0.82);
          font-size: 11px;
          font-weight: 800;
        }

        .building-rose .building-glow { background: #fda4af; }
        .building-violet .building-glow { background: #c4b5fd; }
        .building-gold .building-glow { background: #fcd34d; opacity: 0.58; }
        .building-cyan .building-glow { background: #67e8f9; }
        .building-green .building-glow { background: #86efac; }
        .building-blue .building-glow { background: #93c5fd; }
        .building-locked .building-glow { background: #fde68a; opacity: 0.26; }

        .building-shrine {
          width: 270px;
          z-index: 6;
        }

        .building-shrine .building-art {
          height: 124px;
        }

        .building-shrine .roof {
          width: 170px;
          height: 68px;
          background: linear-gradient(135deg, #fef3c7, #f59e0b);
        }

        .building-shrine .facade {
          width: 176px;
          height: 92px;
          background:
            radial-gradient(circle at 50% 36%, rgba(251, 191, 36, 0.36), transparent 34%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.9), rgba(253, 230, 138, 0.62));
        }

        .building-shrine .building-copy {
          border-color: rgba(253, 230, 138, 0.32);
          box-shadow:
            0 20px 64px rgba(0, 0, 0, 0.36),
            0 0 52px rgba(251, 191, 36, 0.18),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .building-market .building-art {
          opacity: 0.86;
        }

        .building-market .building-copy {
          border-color: rgba(253, 230, 138, 0.24);
          background:
            linear-gradient(180deg, rgba(253, 230, 138, 0.12), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.76);
        }

        .building-market .building-copy::after {
          content: "Future";
          position: absolute;
          right: 12px;
          bottom: 12px;
          color: rgba(253, 230, 138, 0.42);
          font-size: 22px;
          font-weight: 950;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          transform: rotate(-8deg);
        }

        .building-waterfront .roof {
          background: linear-gradient(135deg, #bfdbfe, #22d3ee);
        }

        .map-caption {
          left: 50%;
          bottom: 18px;
          display: flex;
          gap: 10px;
          transform: translateX(-50%);
        }

        .map-caption span {
          padding: 8px 10px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(8, 13, 28, 0.62);
          color: rgba(255, 247, 237, 0.72);
          font-size: 12px;
          font-weight: 850;
        }

        @media (max-width: 980px) {
          .forum-shell {
            padding: 18px 14px;
          }

          .hero,
          .village-note {
            flex-direction: column;
            align-items: flex-start;
          }

          .village-map {
            min-height: auto;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
            padding: 18px;
          }

          .skyline,
          .map-ground,
          .lanterns {
            display: none;
          }

          .central-square {
            position: relative;
            left: auto;
            top: auto;
            grid-column: 1 / -1;
            width: 100%;
            height: 190px;
            transform: none;
          }

          .building {
            position: relative;
            left: auto;
            top: auto;
            width: 100%;
            min-height: 236px;
          }

          .building-shrine {
            width: 100%;
          }

          .map-caption {
            position: relative;
            left: auto;
            bottom: auto;
            grid-column: 1 / -1;
            justify-content: center;
            transform: none;
          }
        }

        @media (max-width: 640px) {
          .forum-page {
            overflow: visible;
          }

          .forum-shell {
            padding: 16px 12px 22px;
          }

          h1 {
            font-size: clamp(36px, 13vw, 56px);
          }

          .village-map {
            grid-template-columns: 1fr;
          }

          .building {
            min-height: 230px;
          }

          .building-copy {
            padding: 13px;
          }

          .map-caption {
            flex-direction: column;
            align-items: stretch;
            text-align: center;
          }
        }
      `}</style>
    </main>
  );
}
