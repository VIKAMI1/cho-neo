import Link from "next/link";

const learningSections = [
  {
    title: "Quick Questions",
    text: "Short practical questions from the floor: one issue, one answer, no performance.",
    tone: "cyan",
  },
  {
    title: "Technique Bench",
    text: "Methods, timing, prep, retention, shaping, fills, and the small habits that make work cleaner.",
    tone: "gold",
  },
  {
    title: "Product Notes",
    text: "Product talk with context: how it behaves, when it helps, and when it is just hype.",
    tone: "rose",
  },
  {
    title: "Troubleshooting Table",
    text: "Lifting, flooding, chipping, peeling, heat spikes, timing problems, and service flow fixes.",
    tone: "green",
  },
  {
    title: "Class Board",
    text: "A future board for lessons, demos, and village-led learning sessions when the hall is ready.",
    tone: "violet",
  },
];

const sampleTopics = [
  "Why does chrome rub off too fast?",
  "Builder gel lifting near the cuticle",
  "Fast fill technique without flooding",
  "Best way to explain service timing to clients",
  "What products are worth teaching new techs first?",
];

export default function ChoNeoTechniquePage() {
  return (
    <main className="technique-page">
      <div className="workshop-glow" />
      <div className="floor-grid" />

      <section className="technique-shell" aria-labelledby="technique-title">
        <header className="technique-hero">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="technique-title">Technique Hall</h1>
            <p className="intro">Where the village learns the craft.</p>
          </div>

          <Link className="back-link" href="/cho-neo">
            Back to Village Square
          </Link>
        </header>

        <section className="workshop-room" aria-label="Technique Hall workshop">
          <div className="bench-header">
            <div>
              <p className="eyebrow">Workshop Board</p>
              <h2>Hands steady. Notes useful. No supplier noise.</h2>
            </div>
            <p>
              Technique Hall is for learning and craft. Product talk is allowed;
              supplier spam is not.
            </p>
          </div>

          <div className="learning-grid">
            {learningSections.map((section) => (
              <article className={`learning-card learning-${section.tone}`} key={section.title}>
                <span className="card-light" />
                <div className="tool-strip" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </div>

          <section className="topic-board" aria-label="Sample topics">
            <div>
              <p className="eyebrow">Sample Topics</p>
              <h2>Questions already waiting on the bench.</h2>
            </div>
            <ul>
              {sampleTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </section>

          <p className="future-note">
            Live classes and real Q&amp;A come later. First we build the hall.
          </p>
        </section>
      </section>

      <style>{`
        .technique-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 16%, rgba(251, 191, 36, 0.22), transparent 30%),
            radial-gradient(circle at 82% 14%, rgba(45, 212, 191, 0.14), transparent 28%),
            linear-gradient(180deg, #101224 0%, #21162c 48%, #151015 100%);
        }

        .workshop-glow,
        .floor-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .workshop-glow {
          background:
            radial-gradient(ellipse at 50% 20%, rgba(253, 230, 138, 0.15), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(45, 212, 191, 0.1), transparent 48%);
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

        .technique-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .technique-hero {
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
          box-shadow: 0 0 34px rgba(251, 191, 36, 0.22);
        }

        .workshop-room {
          position: relative;
          overflow: hidden;
          margin-top: 22px;
          padding: 22px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.18), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.62);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.38),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(12px);
        }

        .workshop-room::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -120px;
          width: min(900px, 105%);
          height: 360px;
          transform: translateX(-50%) rotate(-2deg);
          border-radius: 50%;
          background: rgba(75, 47, 60, 0.78);
          box-shadow: inset 0 0 48px rgba(0, 0, 0, 0.24);
        }

        .bench-header,
        .learning-grid,
        .topic-board,
        .future-note {
          position: relative;
          z-index: 1;
        }

        .bench-header {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 18px;
          align-items: end;
        }

        .bench-header h2,
        .topic-board h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 56px);
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .bench-header > p {
          margin: 0;
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 20px;
          background: rgba(253, 230, 138, 0.1);
          color: rgba(255, 247, 237, 0.78);
          font-size: 14px;
          line-height: 1.5;
        }

        .learning-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .learning-card {
          position: relative;
          overflow: hidden;
          min-height: 250px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 24px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.72);
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
        }

        .card-light {
          position: absolute;
          inset: -28px 20px auto;
          height: 100px;
          border-radius: 999px;
          opacity: 0.32;
          filter: blur(22px);
        }

        .learning-cyan .card-light { background: #67e8f9; }
        .learning-gold .card-light { background: #fcd34d; }
        .learning-rose .card-light { background: #fda4af; }
        .learning-green .card-light { background: #86efac; }
        .learning-violet .card-light { background: #c4b5fd; }

        .tool-strip,
        .learning-card h3,
        .learning-card p {
          position: relative;
          z-index: 1;
        }

        .tool-strip {
          display: grid;
          grid-template-columns: 1fr 0.76fr 0.52fr;
          gap: 7px;
          align-items: end;
          min-height: 82px;
        }

        .tool-strip span {
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px 999px 10px 10px;
          background: linear-gradient(180deg, #fff7ed, #fbbf24);
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22);
        }

        .tool-strip span:nth-child(1) { height: 82px; }
        .tool-strip span:nth-child(2) { height: 58px; }
        .tool-strip span:nth-child(3) { height: 42px; }

        .learning-card h3 {
          margin: 18px 0 0;
          font-size: 24px;
          line-height: 0.98;
          letter-spacing: -0.03em;
        }

        .learning-card p {
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.7);
          font-size: 13px;
          line-height: 1.45;
        }

        .topic-board {
          display: grid;
          grid-template-columns: minmax(240px, 0.76fr) minmax(0, 1.24fr);
          gap: 18px;
          margin-top: 18px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 26px;
          background: rgba(8, 13, 28, 0.66);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .topic-board ul {
          display: grid;
          gap: 10px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .topic-board li {
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 247, 237, 0.84);
          font-weight: 850;
        }

        .future-note {
          margin: 18px 0 0;
          padding: 14px 16px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.1);
          color: rgba(255, 247, 237, 0.8);
          font-size: 14px;
          font-weight: 850;
          text-align: center;
        }

        @media (max-width: 1040px) {
          .learning-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .technique-shell {
            padding: 16px 12px 22px;
          }

          .technique-hero,
          .bench-header,
          .topic-board {
            grid-template-columns: 1fr;
          }

          .technique-hero {
            flex-direction: column;
          }

          .back-link {
            width: 100%;
          }
        }

        @media (max-width: 640px) {
          .learning-grid {
            grid-template-columns: 1fr;
          }

          .learning-card {
            min-height: auto;
          }

          .future-note {
            border-radius: 22px;
          }
        }
      `}</style>
    </main>
  );
}
