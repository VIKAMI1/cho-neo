import Link from "next/link";

const businessSections = [
  {
    title: "Staffing Table",
    text: "Team schedules, reliability, training gaps, boundaries, and the hard talks owners avoid until they cannot.",
    tone: "green",
  },
  {
    title: "Pricing Desk",
    text: "Service menus, add-ons, discounts, timing, margins, and how to explain price without shrinking yourself.",
    tone: "gold",
  },
  {
    title: "Difficult Clients",
    text: "Complaints, refunds, late arrivals, rework requests, no-shows, and staying calm when the room gets hot.",
    tone: "rose",
  },
  {
    title: "Lease & Bills",
    text: "Rent, utilities, slow weeks, payroll pressure, supply costs, and the numbers behind keeping the lights on.",
    tone: "slate",
  },
  {
    title: "Hiring Board",
    text: "Finding techs, protecting the team culture, interviews, trial days, and hiring without poisoning the room.",
    tone: "cyan",
  },
  {
    title: "Owner Survival Notes",
    text: "Burnout, boundaries, family pressure, quiet wins, and the small systems that help owners last.",
    tone: "violet",
  },
];

const sampleTopics = [
  "How do you handle techs taking clients?",
  "Should chrome be an add-on or included?",
  "Slow season payroll pressure",
  "When a client complains after three weeks",
  "Hiring without poisoning the team",
  "How much discount is too much?",
];

export default function ChoNeoOwnerCornerPage() {
  return (
    <main className="owner-page">
      <div className="backroom-glow" />
      <div className="ledger-grid" />

      <section className="owner-shell" aria-labelledby="owner-title">
        <header className="owner-hero">
          <div>
            <p className="eyebrow">Cho Neo Village</p>
            <h1 id="owner-title">Owner Corner</h1>
            <p className="intro">
              Where shop owners talk about the hard parts of running the
              business.
            </p>
          </div>

          <Link className="back-link" href="/cho-neo">
            <span className="back-kicker">Cho Neo Village</span>
            <span>Back to Village Square</span>
          </Link>
        </header>

        <section className="backroom" aria-label="Owner Corner business room">
          <div className="room-heading">
            <div>
              <p className="eyebrow">Business Back Room</p>
              <h2>Numbers, people, pressure, and staying open.</h2>
            </div>
            <p>
              No doxxing. No shop-name attacks. No supplier pitching. Hard
              truth is allowed; poison is not.
            </p>
          </div>

          <div className="business-grid">
            {businessSections.map((section) => (
              <article
                className={`business-card business-${section.tone}`}
                key={section.title}
              >
                <span className="card-light" />
                <div className="ledger-strip" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h3>{section.title}</h3>
                <p>{section.text}</p>
              </article>
            ))}
          </div>

          <section className="topic-board" aria-label="Sample owner topics">
            <div>
              <p className="eyebrow">Sample Topics</p>
              <h2>Problems owners bring after closing time.</h2>
            </div>
            <ul>
              {sampleTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </section>

          <p className="future-note">
            Owner Corner will need stronger privacy and role controls later.
            For now, this is a static room shell.
          </p>
        </section>
      </section>

      <style>{`
        .owner-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 18%, rgba(251, 191, 36, 0.2), transparent 30%),
            radial-gradient(circle at 82% 14%, rgba(34, 197, 94, 0.12), transparent 28%),
            linear-gradient(180deg, #101224 0%, #21162c 48%, #120f13 100%);
        }

        .backroom-glow,
        .ledger-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .backroom-glow {
          background:
            radial-gradient(ellipse at 48% 18%, rgba(253, 230, 138, 0.14), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(132, 204, 22, 0.09), transparent 48%);
        }

        .ledger-grid {
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

        .owner-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .owner-hero {
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
          max-width: 740px;
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

        .backroom {
          position: relative;
          overflow: hidden;
          margin-top: 22px;
          padding: 22px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 34px;
          background:
            radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.15), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.04)),
            rgba(8, 13, 28, 0.68);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.42),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
        }

        .backroom::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -126px;
          width: min(900px, 105%);
          height: 360px;
          transform: translateX(-50%) rotate(1deg);
          border-radius: 50%;
          background: rgba(64, 42, 49, 0.84);
          box-shadow: inset 0 0 48px rgba(0, 0, 0, 0.28);
        }

        .room-heading,
        .business-grid,
        .topic-board,
        .future-note {
          position: relative;
          z-index: 1;
        }

        .room-heading {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
          gap: 18px;
          align-items: end;
        }

        .room-heading h2,
        .topic-board h2 {
          margin: 0;
          font-size: clamp(30px, 4vw, 56px);
          line-height: 0.95;
          letter-spacing: -0.04em;
        }

        .room-heading > p {
          margin: 0;
          padding: 14px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 20px;
          background: rgba(253, 230, 138, 0.09);
          color: rgba(255, 247, 237, 0.78);
          font-size: 14px;
          line-height: 1.5;
        }

        .business-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 22px;
        }

        .business-card {
          position: relative;
          overflow: hidden;
          min-height: 210px;
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 24px;
          background: rgba(15, 23, 42, 0.72);
          box-shadow:
            0 16px 42px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .business-card::after {
          content: "";
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 18px;
          height: 8px;
          border-radius: 999px;
          opacity: 0.64;
        }

        .business-green::after {
          background: #86efac;
        }

        .business-gold::after {
          background: #fde68a;
        }

        .business-rose::after {
          background: #fda4af;
        }

        .business-slate::after {
          background: #cbd5e1;
        }

        .business-cyan::after {
          background: #67e8f9;
        }

        .business-violet::after {
          background: #c4b5fd;
        }

        .card-light {
          position: absolute;
          inset: -40% -30% auto auto;
          width: 160px;
          height: 160px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.12);
          filter: blur(8px);
        }

        .ledger-strip {
          display: flex;
          gap: 6px;
          margin-bottom: 26px;
        }

        .ledger-strip span {
          width: 42px;
          height: 8px;
          border-radius: 999px;
          background: rgba(255, 247, 237, 0.24);
        }

        .business-card h3 {
          position: relative;
          margin: 0;
          color: #fff7ed;
          font-size: 22px;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .business-card p {
          position: relative;
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 14px;
          line-height: 1.5;
        }

        .topic-board {
          display: grid;
          grid-template-columns: minmax(260px, 0.8fr) minmax(0, 1.2fr);
          gap: 18px;
          align-items: start;
          margin-top: 16px;
          padding: 18px;
          border: 1px solid rgba(253, 230, 138, 0.15);
          border-radius: 26px;
          background: rgba(17, 24, 39, 0.7);
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
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 18px;
          background: rgba(253, 230, 138, 0.1);
          color: rgba(255, 247, 237, 0.78);
          font-size: 14px;
          line-height: 1.5;
        }

        @media (max-width: 840px) {
          .owner-shell {
            padding: 18px;
          }

          .owner-hero,
          .room-heading,
          .topic-board {
            grid-template-columns: 1fr;
          }

          .owner-hero {
            display: grid;
          }

          .back-link {
            width: fit-content;
          }

          .business-grid {
            grid-template-columns: 1fr;
          }

          .backroom {
            padding: 16px;
            border-radius: 26px;
          }
        }
      `}</style>
    </main>
  );
}
