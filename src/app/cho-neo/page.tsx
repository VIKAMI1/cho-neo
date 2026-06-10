import Link from "next/link";

const sections = [
  {
    title: "Show Off",
    href: "/cho-neo/show-off",
    kicker: "Sets, stations, shelves",
    text: "Post the nails, the lash room, the cafe counter, the fresh sign, or the small win that deserves applause.",
    tags: ["Beauty", "Before / after", "Wins"],
    tone: "rose",
  },
  {
    title: "Gossip",
    href: "/cho-neo/gossip",
    kicker: "Salon talk, softly lit",
    text: "A place for community pulse checks, harmless tea, family updates, city rumors, and the stories between shifts.",
    tags: ["Tea", "Life", "Local"],
    tone: "violet",
  },
  {
    title: "Market",
    href: "/cho-neo/market",
    kicker: "Goods, plugs, services",
    text: "Find tools, furniture, supplier leads, lease tips, job posts, and small-business deals from people nearby.",
    tags: ["Tools", "Deals", "Work"],
    tone: "gold",
  },
  {
    title: "Ask / Help",
    href: "/cho-neo/ask-help",
    kicker: "Questions with answers",
    text: "Ask practical questions about paperwork, shops, schools, beauty work, moving cities, or getting unstuck.",
    tags: ["Advice", "How-to", "Support"],
    tone: "cyan",
  },
];

const storefronts = ["Nails", "Pho", "Cafe", "Market", "Lashes"];

export default function ChoNeoPage() {
  return (
    <main className="forum-page">
      <div className="street-glow" />
      <div className="paper-grid" />

      <section className="forum-shell" aria-labelledby="forum-title">
        <header className="hero">
          <div className="hero-copy">
            <p className="eyebrow">ChoNeo Forum</p>
            <h1 id="forum-title">Four doors into the everyday Vietnamese diaspora.</h1>
            <p className="intro">
              A modern community hub for beauty businesses, small shops, cafe
              conversations, family momentum, and practical help across cities.
            </p>
          </div>

          <Link className="world-link" href="/cho-neo/world">
            Visit World Plaza
          </Link>
        </header>

        <section className="section-doors" aria-label="Forum sections">
          {sections.map((section) => (
            <Link
              key={section.title}
              href={section.href}
              className={`door door-${section.tone}`}
            >
              <span className="door-light" />
              <div className="door-topline">
                <p>{section.kicker}</p>
                <span>Open</span>
              </div>
              <h2>{section.title}</h2>
              <p className="door-text">{section.text}</p>
              <div className="door-tags" aria-label={`${section.title} topics`}>
                {section.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </Link>
          ))}
        </section>

        <section className="street" aria-label="ChoNeo community street">
          <div className="lantern-line" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, index) => (
              <span key={index} />
            ))}
          </div>

          <div className="storefronts">
            {storefronts.map((name, index) => (
              <div className={`store store-${index}`} key={name}>
                <div className="awning" />
                <strong>{name}</strong>
                <div className="windows">
                  <span />
                  <span />
                </div>
              </div>
            ))}
          </div>
        </section>
      </section>

      <style>{`
        .forum-page {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
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
          width: min(1180px, 100%);
          min-height: 100vh;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 4px 2px 0;
        }

        .hero-copy {
          max-width: 820px;
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
          max-width: 680px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.78);
          font-size: clamp(14px, 1.45vw, 17px);
          line-height: 1.6;
        }

        .world-link {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid rgba(253, 230, 138, 0.62);
          border-radius: 999px;
          color: #17110b;
          background: linear-gradient(180deg, #fef3c7, #fbbf24);
          font-size: 14px;
          font-weight: 950;
          text-decoration: none;
          box-shadow: 0 0 44px rgba(251, 191, 36, 0.28);
        }

        .section-doors {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .door {
          position: relative;
          min-height: 286px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 26px;
          color: inherit;
          text-decoration: none;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.62);
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
        }

        .door:hover {
          transform: translateY(-4px);
          border-color: rgba(253, 230, 138, 0.42);
          box-shadow:
            0 26px 70px rgba(0, 0, 0, 0.42),
            0 0 44px rgba(251, 191, 36, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
        }

        .door:focus-visible {
          outline: 3px solid rgba(253, 230, 138, 0.88);
          outline-offset: 4px;
        }

        .door-light {
          position: absolute;
          inset: 18px 20px auto;
          height: 104px;
          border-radius: 999px;
          opacity: 0.42;
          filter: blur(24px);
        }

        .door-rose .door-light { background: #fda4af; }
        .door-violet .door-light { background: #c4b5fd; }
        .door-gold .door-light { background: #fcd34d; }
        .door-cyan .door-light { background: #67e8f9; }

        .door-topline {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .door-topline p {
          margin: 0;
          color: #fde68a;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .door-topline span {
          flex: 0 0 auto;
          padding: 6px 9px;
          border-radius: 999px;
          color: #111827;
          background: rgba(253, 230, 138, 0.92);
          font-size: 11px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .door h2 {
          position: relative;
          z-index: 1;
          margin: 58px 0 0;
          font-size: clamp(28px, 3vw, 42px);
          line-height: 0.94;
          letter-spacing: -0.035em;
        }

        .door-text {
          position: relative;
          z-index: 1;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 14px;
          line-height: 1.5;
        }

        .door-tags {
          position: relative;
          z-index: 1;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: auto;
          padding-top: 22px;
        }

        .door-tags span {
          padding: 7px 9px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 247, 237, 0.82);
          font-size: 12px;
          font-weight: 800;
        }

        .street {
          position: relative;
          overflow: hidden;
          min-height: 232px;
          margin-top: auto;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 30px;
          background:
            radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.2), transparent 34%),
            rgba(15, 23, 42, 0.56);
          box-shadow:
            0 22px 70px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }

        .lantern-line {
          display: flex;
          justify-content: center;
          gap: min(3.4vw, 38px);
          padding-top: 20px;
        }

        .lantern-line span {
          width: 16px;
          height: 22px;
          border-radius: 999px;
          background: #ef4444;
          box-shadow: 0 0 28px rgba(239, 68, 68, 0.64);
        }

        .storefronts {
          position: absolute;
          left: 50%;
          bottom: 18px;
          width: min(940px, calc(100% - 28px));
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 10px;
          transform: translateX(-50%);
        }

        .store {
          min-height: 126px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 18px;
          color: #111827;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.56));
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
        }

        .store-0 { background-color: #ffe4e6; }
        .store-1 { background-color: #fef3c7; }
        .store-2 { background-color: #cffafe; }
        .store-3 { background-color: #d1fae5; }
        .store-4 { background-color: #ede9fe; }

        .awning {
          height: 16px;
          border-radius: 14px 14px 6px 6px;
          background: repeating-linear-gradient(90deg, #111827 0 16px, #fef3c7 16px 28px);
        }

        .store strong {
          display: block;
          margin-top: 10px;
          padding: 8px 6px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.72);
          text-align: center;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .windows {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
          margin-top: 10px;
        }

        .windows span {
          height: 25px;
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.08));
        }

        @media (max-width: 980px) {
          .forum-shell {
            padding: 18px 14px;
          }

          .hero {
            flex-direction: column;
          }

          .section-doors {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .storefronts {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            position: relative;
            left: auto;
            bottom: auto;
            margin: 26px auto 18px;
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

          .world-link {
            width: 100%;
          }

          .section-doors,
          .storefronts {
            grid-template-columns: 1fr;
          }

          .door {
            min-height: 250px;
          }

          .street {
            min-height: auto;
          }
        }
      `}</style>
    </main>
  );
}
