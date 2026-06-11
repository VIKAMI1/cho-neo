import Link from "next/link";

const waterfrontSections = [
  {
    title: "Quiet Bench",
    text: "A soft place for a short breath, a small check-in, or a thought that does not need a loud room.",
    tone: "blue",
  },
  {
    title: "Evening Walk",
    text: "Loose conversation after closing, when the lights are still warm and nobody needs to perform.",
    tone: "gold",
  },
  {
    title: "Community Events",
    text: "A future notice board for village gatherings, local meetups, celebrations, and gentle reasons to show up.",
    tone: "green",
  },
  {
    title: "Tea by the Water",
    text: "Slow talk, reflection, family stories, travel notes, and the small rituals that help people reset.",
    tone: "rose",
  },
  {
    title: "Open Conversation",
    text: "Casual threads that do not belong in the café, the hall, or the owner back room.",
    tone: "violet",
  },
];

const sampleTopics = [
  "What kept you going this week?",
  "A small win from the salon floor",
  "Sunday reset before the next rush",
  "Where are people gathering this month?",
  "Stories from the road",
];

export default function ChoNeoWaterfrontPage() {
  return (
    <main className="waterfront-page">
      <div className="water-glow" />
      <div className="water-lines" />

      <section className="waterfront-shell" aria-labelledby="waterfront-title">
        <header className="waterfront-hero">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="waterfront-title">Waterfront</h1>
            <p className="intro">Where the village slows down.</p>
          </div>

          <Link className="back-link" href="/cho-neo">
            Back to Village Square
          </Link>
        </header>

        <section className="shore-room" aria-label="Waterfront gathering area">
          <div className="shore-heading">
            <div>
              <p className="eyebrow">Dusk Shore</p>
              <h2>Soft lights, slower talk, room to breathe.</h2>
            </div>
            <p>
              Waterfront is for calm conversation, reflection, events, and the
              kind of community gathering that does not need to be loud.
            </p>
          </div>

          <div className="shoreline" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="waterfront-grid">
            {waterfrontSections.map((section) => (
              <article
                className={`waterfront-card waterfront-${section.tone}`}
                key={section.title}
              >
                <span className="card-light" />
                <div className="lamp-row" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </div>

          <section className="topic-board" aria-label="Sample waterfront topics">
            <div>
              <p className="eyebrow">Sample Topics</p>
              <h2>Conversations for the edge of the evening.</h2>
            </div>
            <ul>
              {sampleTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </section>

          <p className="future-note">
            Events, ambient sound, and live gathering signals come later. First
            we give the village a place to breathe.
          </p>
        </section>
      </section>

      <style>{`
        .waterfront-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 18%, rgba(251, 191, 36, 0.2), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(45, 212, 191, 0.17), transparent 28%),
            linear-gradient(180deg, #101224 0%, #1d1a31 46%, #0f172a 100%);
        }

        .water-glow,
        .water-lines {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .water-glow {
          background:
            radial-gradient(ellipse at 48% 18%, rgba(253, 230, 138, 0.15), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(45, 212, 191, 0.2), transparent 50%);
        }

        .water-lines {
          top: 48%;
          background:
            repeating-linear-gradient(
              178deg,
              rgba(125, 211, 252, 0.12) 0 2px,
              transparent 2px 38px
            );
          mask-image: linear-gradient(to bottom, transparent 0%, black 22%, black 100%);
          opacity: 0.52;
        }

        .waterfront-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .waterfront-hero {
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
          box-shadow: 0 0 34px rgba(251, 191, 36, 0.2);
        }

        .shore-room {
          position: relative;
          overflow: hidden;
          margin-top: 22px;
          padding: 22px;
          border: 1px solid rgba(186, 230, 253, 0.18);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.15), transparent 28%),
            radial-gradient(circle at 50% 100%, rgba(45, 212, 191, 0.18), transparent 36%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.64);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }

        .shore-room::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -132px;
          width: min(980px, 110%);
          height: 380px;
          transform: translateX(-50%);
          border-radius: 50%;
          background:
            repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 24px, transparent 24px 54px),
            linear-gradient(180deg, rgba(20, 184, 166, 0.34), rgba(30, 64, 175, 0.24));
          box-shadow: inset 0 0 54px rgba(0, 0, 0, 0.26);
        }

        .shore-heading,
        .shoreline,
        .waterfront-grid,
        .topic-board,
        .future-note {
          position: relative;
          z-index: 1;
        }

        .shore-heading {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 18px;
          align-items: end;
        }

        .shore-heading h2,
        .topic-board h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 56px);
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .shore-heading > p {
          margin: 0;
          padding: 14px;
          border: 1px solid rgba(186, 230, 253, 0.22);
          border-radius: 20px;
          background: rgba(14, 165, 233, 0.11);
          color: rgba(255, 247, 237, 0.78);
          font-size: 14px;
          line-height: 1.5;
        }

        .shoreline {
          height: 78px;
          margin: 18px 0 0;
          border-radius: 999px;
          background:
            linear-gradient(90deg, transparent, rgba(253, 230, 138, 0.16), transparent),
            rgba(15, 23, 42, 0.42);
          box-shadow: inset 0 -18px 34px rgba(45, 212, 191, 0.12);
        }

        .shoreline span {
          position: absolute;
          top: 50%;
          width: 80px;
          height: 10px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.36);
          box-shadow: 0 0 24px rgba(251, 191, 36, 0.28);
        }

        .shoreline span:nth-child(1) {
          left: 12%;
        }

        .shoreline span:nth-child(2) {
          left: 46%;
          width: 112px;
        }

        .shoreline span:nth-child(3) {
          right: 12%;
        }

        .waterfront-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          margin-top: 16px;
        }

        .waterfront-card {
          position: relative;
          overflow: hidden;
          min-height: 220px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.68);
          box-shadow:
            0 16px 42px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .waterfront-card::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          height: 8px;
          border-radius: 999px;
          opacity: 0.66;
        }

        .waterfront-blue::after {
          background: #7dd3fc;
        }

        .waterfront-gold::after {
          background: #fde68a;
        }

        .waterfront-green::after {
          background: #86efac;
        }

        .waterfront-rose::after {
          background: #fda4af;
        }

        .waterfront-violet::after {
          background: #c4b5fd;
        }

        .card-light {
          position: absolute;
          inset: -40% -30% auto auto;
          width: 160px;
          height: 160px;
          border-radius: 999px;
          background: rgba(186, 230, 253, 0.14);
          filter: blur(8px);
        }

        .lamp-row {
          display: flex;
          gap: 8px;
          margin-bottom: 28px;
        }

        .lamp-row span {
          width: 18px;
          height: 18px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.58);
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.32);
        }

        .waterfront-card h3 {
          position: relative;
          margin: 0;
          color: #fff7ed;
          font-size: 21px;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .waterfront-card p {
          position: relative;
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 14px;
          line-height: 1.5;
        }

        .topic-board {
          display: grid;
          grid-template-columns: minmax(260px, 0.82fr) minmax(0, 1.18fr);
          gap: 18px;
          align-items: start;
          margin-top: 16px;
          padding: 18px;
          border: 1px solid rgba(186, 230, 253, 0.16);
          border-radius: 26px;
          background: rgba(17, 24, 39, 0.62);
        }

        .topic-board ul {
          display: grid;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        .topic-board li {
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 247, 237, 0.84);
          font-size: 14px;
          line-height: 1.35;
        }

        .future-note {
          margin: 16px 0 0;
          padding: 14px 16px;
          border: 1px solid rgba(186, 230, 253, 0.18);
          border-radius: 18px;
          background: rgba(14, 165, 233, 0.1);
          color: rgba(255, 247, 237, 0.78);
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 1040px) {
          .waterfront-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .waterfront-shell {
            padding: 18px;
          }

          .waterfront-hero,
          .shore-heading,
          .topic-board {
            grid-template-columns: 1fr;
          }

          .waterfront-hero {
            display: grid;
          }

          .back-link {
            width: fit-content;
          }

          .waterfront-grid {
            grid-template-columns: 1fr;
          }

          .shore-room {
            padding: 16px;
            border-radius: 26px;
          }

          .shoreline span:nth-child(2) {
            left: 38%;
          }
        }
      `}</style>
    </main>
  );
}
