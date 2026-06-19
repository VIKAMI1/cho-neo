import Link from "next/link";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";

const gallerySections = [
  {
    title: "Fresh Nail Work",
    text: "New sets, clean fills, seasonal colors, and the little details only another tech notices.",
    tone: "rose",
  },
  {
    title: "Salon Showcase",
    text: "Stations, shelves, front desks, lighting, signs, and the pride of keeping a shop alive.",
    tone: "gold",
  },
  {
    title: "Before / After",
    text: "Repairs, transformations, grow-outs, remodels, and proof that careful work changes the room.",
    tone: "cyan",
  },
  {
    title: "Community Recognition",
    text: "Applause for good craft, steady effort, kind service, and people carrying the village forward.",
    tone: "green",
  },
  {
    title: "Upload Your Work",
    text: "Use the existing Show-Off upload flow when you are ready to add your own work.",
    tone: "violet",
  },
];

export default function ChoNeoShowOffPage() {
  return (
    <main className="gallery-page">
      <ChoNeoTimeAmbience />
      <div className="gallery-glow" />
      <div className="floor-grid" />

      <section className="gallery-shell" aria-labelledby="gallery-title">
        <header className="gallery-hero">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="gallery-title">Show-Off Gallery</h1>
            <p className="intro">Where the village shows its work.</p>
          </div>

          <Link className="back-link" href="/cho-neo">
            <span className="back-kicker">Cho Neo Village</span>
            <span>Back to Village Square</span>
          </Link>
        </header>

        <section className="gallery-wall" aria-label="Show-Off Gallery sections">
          <div className="wall-heading">
            <p className="eyebrow">Community Wall</p>
            <h2>Proud work, shared without shouting.</h2>
            <p>
              This is for members showing work, not supplier advertising.
            </p>
          </div>

          <div className="spotlight-actions">
            <Link href="/show-off">View Gallery</Link>
            <Link href="/show-off/new">Upload Work</Link>
          </div>

          <div className="gallery-grid">
            {gallerySections.map((section) => (
              <article className={`gallery-card gallery-${section.tone}`} key={section.title}>
                <span className="card-light" />
                <div className="frame" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <style>{`
        .gallery-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background: var(--cho-neo-room-page-background);
        }

        .gallery-glow,
        .floor-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .gallery-glow {
          background: var(--cho-neo-room-glow-background);
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
          opacity: var(--cho-neo-floor-opacity);
        }

        .gallery-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .gallery-hero {
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

        .back-link,
        .spotlight-actions a {
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

        .back-link {
          flex: 0 0 auto;
          flex-direction: column;
          align-items: flex-start;
          min-height: 50px;
          padding: 7px 15px;
          line-height: 1.1;
        }

        .back-kicker {
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.68;
        }

        .gallery-wall {
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

        .gallery-wall::before {
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

        .wall-heading,
        .spotlight-actions,
        .gallery-grid {
          position: relative;
          z-index: 1;
        }

        .wall-heading {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 10px;
          max-width: 780px;
        }

        .wall-heading h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 56px);
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .wall-heading p:not(.eyebrow) {
          margin: 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: 15px;
          line-height: 1.5;
        }

        .spotlight-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }

        .spotlight-actions a:last-child {
          color: #fff7ed;
          background: rgba(255, 255, 255, 0.11);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: none;
        }

        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
          margin-top: 22px;
        }

        .gallery-card {
          position: relative;
          overflow: hidden;
          min-height: 260px;
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
          opacity: 0.34;
          filter: blur(22px);
        }

        .gallery-rose .card-light { background: #fda4af; }
        .gallery-gold .card-light { background: #fcd34d; }
        .gallery-cyan .card-light { background: #67e8f9; }
        .gallery-green .card-light { background: #86efac; }
        .gallery-violet .card-light { background: #c4b5fd; }

        .frame,
        .gallery-card h3,
        .gallery-card p {
          position: relative;
          z-index: 1;
        }

        .frame {
          display: grid;
          grid-template-columns: 1fr 0.78fr;
          grid-template-rows: repeat(2, 52px);
          gap: 7px;
        }

        .frame span {
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 14px;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.58)),
            #fef3c7;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22);
        }

        .frame span:first-child {
          grid-row: span 2;
        }

        .gallery-card h3 {
          margin: 18px 0 0;
          font-size: 24px;
          line-height: 0.98;
          letter-spacing: -0.03em;
        }

        .gallery-card p {
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.7);
          font-size: 13px;
          line-height: 1.45;
        }

        @media (max-width: 1020px) {
          .gallery-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .gallery-shell {
            max-width: 100vw;
            overflow-x: hidden;
            padding: 16px 12px 22px;
          }

          .gallery-hero {
            flex-direction: column;
          }

          h1 {
            max-width: 100%;
            overflow-wrap: anywhere;
            font-size: clamp(38px, 12vw, 50px);
          }

          .back-link,
          .spotlight-actions a {
            width: 100%;
          }

          .spotlight-actions {
            flex-direction: column;
          }

          .gallery-grid {
            grid-template-columns: 1fr;
          }

          .gallery-card {
            min-height: auto;
          }

          .frame {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
