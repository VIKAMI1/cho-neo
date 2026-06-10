import Link from "next/link";

const peopleInside = [
  { name: "Mai T.", role: "nail tech", city: "Calgary", tone: "rose" },
  { name: "Linh P.", role: "shop owner", city: "Garden Grove", tone: "gold" },
  { name: "Vy N.", role: "lash artist", city: "London", tone: "cyan" },
  { name: "An D.", role: "supplier", city: "Saigon", tone: "violet" },
  { name: "Kim H.", role: "front desk", city: "Houston", tone: "green" },
];

const tables = [
  {
    title: "Front Counter",
    label: "quick chatter",
    description: "Fast hellos, tiny wins, price checks, appointment chaos, and the kind of talk that happens while coffee is still hot.",
    members: 18,
    bubbles: [
      {
        name: "Mai",
        city: "Calgary",
        message: "Anyone seeing slower weekday walk-ins this month?",
        side: "left",
      },
      {
        name: "Tina",
        city: "London",
        message: "Acrylic is still strong here, but BIAB questions are growing.",
        side: "right",
      },
      {
        name: "Kim",
        city: "Houston",
        message: "Chrome powder still moves when one auntie posts a story.",
        side: "left",
      },
    ],
    seats: ["MT", "KP", "VN", "LD", "AH"],
  },
  {
    title: "Corner Table",
    label: "salon stories",
    description: "Longer stories from the beauty floor: funny clients, hard days, family pressure, and the little rituals that keep a shop alive.",
    members: 12,
    bubbles: [
      {
        name: "Vy",
        city: "Garden Grove",
        message: "Client brought her mom, cousin, and a whole dinner plan.",
        side: "left",
      },
      {
        name: "Lan",
        city: "Melbourne",
        message: "Late but wants full art? I smile and point to the clock.",
        side: "right",
      },
      {
        name: "Hana",
        city: "Toronto",
        message: "One regular made the room laugh today. Saved my shift.",
        side: "left",
      },
    ],
    seats: ["LT", "HN", "TV", "MC"],
  },
  {
    title: "Supply Table",
    label: "product rumors",
    description: "Product chatter without the smoke: what is worth buying, what is overhyped, and which supplier actually ships on time.",
    members: 9,
    bubbles: [
      {
        name: "Anh",
        city: "Saigon",
        message: "Supplier price changed again. Watch your margins.",
        side: "left",
      },
      {
        name: "Bao",
        city: "Westminster",
        message: "That lamp is fast, but the timer button feels cheap.",
        side: "right",
      },
      {
        name: "Nhi",
        city: "Seattle",
        message: "Builder gel is good. Brush cap is the drama.",
        side: "left",
      },
    ],
    seats: ["AD", "BN", "PQ", "SL", "NT", "VX"],
  },
  {
    title: "Staff Room",
    label: "owner/tech talk",
    description: "Small-business talk for owners, techs, reception, and managers comparing policies, pay, scheduling, and burnout fixes.",
    members: 15,
    bubbles: [
      {
        name: "Linh",
        city: "California",
        message: "Deposits helped, but clear reschedule rules helped more.",
        side: "left",
      },
      {
        name: "Kim",
        city: "Houston",
        message: "We made lunch rotation sacred. Nobody eats standing now.",
        side: "right",
      },
      {
        name: "Duc",
        city: "Calgary",
        message: "Price changes land better when you explain product costs.",
        side: "left",
      },
    ],
    seats: ["LP", "KH", "TN", "YL", "DM"],
  },
  {
    title: "City Board",
    label: "Calgary, California, London, Saigon",
    description: "Diaspora check-ins by city: openings, closures, lease talk, neighborhood notes, travel tips, and where the crowd is moving.",
    members: 21,
    bubbles: [
      {
        name: "Mina",
        city: "Calgary",
        message: "Which plaza has decent parking after 6?",
        side: "left",
      },
      {
        name: "Tina",
        city: "London",
        message: "Rent is wild here too. Tiny rooms, big numbers.",
        side: "right",
      },
      {
        name: "Anh",
        city: "Saigon",
        message: "Supply run tip: bring photos, not just product names.",
        side: "left",
      },
    ],
    seats: ["CG", "CA", "LDN", "SGN", "TX"],
  },
];

const rules = [
  "No doxxing",
  "No naming real people for attacks",
  "No business takedowns without proof",
  "Keep it useful, funny, or kind",
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .replace(".", "");
}

export default function ChoNeoGossipPage() {
  return (
    <main className="cafe-page">
      <div className="room-glow" />
      <div className="street-grid" />

      <section className="cafe-shell" aria-labelledby="gossip-title">
        <header className="cafe-hero">
          <div>
            <p className="eyebrow">ChoNeo Mingle Room</p>
            <h1 id="gossip-title">Gossip Café</h1>
            <p className="subtitle">
              Salon talk, market whispers, and stories from the diaspora beauty floor.
            </p>
          </div>

          <div className="hero-actions">
            <Link href="/cho-neo">Back to Forum</Link>
            <Link href="/cho-neo/world">World Plaza</Link>
          </div>
        </header>

        <div className="room-layout">
          <aside className="presence-panel" aria-label="Who is inside">
            <div className="panel-heading">
              <p>Who is inside</p>
              <strong>{peopleInside.length} nearby</strong>
            </div>

            <div className="people-list">
              {peopleInside.map((person) => (
                <div className="person-chip" key={person.name}>
                  <span className={`avatar avatar-${person.tone}`}>
                    {initials(person.name)}
                  </span>
                  <span>
                    <strong>{person.name}</strong>
                    <small>
                      {person.role} - {person.city}
                    </small>
                  </span>
                </div>
              ))}
            </div>

            <div className="counter-card">
              <span className="coffee-light" />
              <p>Room mood</p>
              <strong>Warm, busy, and slightly spicy.</strong>
              <small>Static v1: seats are decorative until real mingle features arrive.</small>
            </div>
          </aside>

          <section className="tables" aria-label="Conversation tables">
            {tables.map((table) => (
              <article className="table-card" key={table.title}>
                <div className="table-top">
                  <div>
                    <p>{table.label}</p>
                    <h2>{table.title}</h2>
                  </div>
                  <span>{table.members} inside</span>
                </div>

                <p className="table-description">{table.description}</p>

                <div className="seat-row" aria-label={`${table.title} seats`}>
                  {table.seats.map((seat, index) => (
                    <span key={`${seat}-${index}`}>{seat}</span>
                  ))}
                </div>

                <div className="discussion-lines">
                  {table.bubbles.map((bubble) => (
                    <div
                      className={`chat-bubble chat-bubble-${bubble.side}`}
                      key={`${bubble.name}-${bubble.city}-${bubble.message}`}
                    >
                      <small>
                        {bubble.name} · {bubble.city}
                      </small>
                      <p>{bubble.message}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>

        <section className="house-rules" aria-label="House rules">
          <div>
            <p className="eyebrow">House Rules</p>
            <h2>Keep the room sharp, not cruel.</h2>
          </div>
          <ul>
            {rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>
      </section>

      <style>{`
        .cafe-page {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 16% 14%, rgba(251, 191, 36, 0.25), transparent 28%),
            radial-gradient(circle at 84% 12%, rgba(244, 114, 182, 0.16), transparent 26%),
            linear-gradient(180deg, #101224 0%, #21162c 42%, #321b29 72%, #151015 100%);
        }

        .room-glow,
        .street-grid {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .room-glow {
          background:
            radial-gradient(ellipse at 50% 18%, rgba(253, 230, 138, 0.15), transparent 40%),
            radial-gradient(ellipse at 12% 74%, rgba(244, 114, 182, 0.12), transparent 34%),
            radial-gradient(ellipse at 88% 76%, rgba(45, 212, 191, 0.1), transparent 34%);
        }

        .street-grid {
          top: 38%;
          transform: perspective(600px) rotateX(62deg);
          transform-origin: bottom center;
          background-image:
            linear-gradient(rgba(253, 230, 138, 0.13) 1px, transparent 1px),
            linear-gradient(90deg, rgba(253, 230, 138, 0.1) 1px, transparent 1px);
          background-size: 56px 56px;
          mask-image: linear-gradient(to bottom, transparent 0%, black 24%, black 100%);
          opacity: 0.5;
        }

        .cafe-shell {
          position: relative;
          z-index: 1;
          width: min(1240px, 100%);
          margin: 0 auto;
          padding: 24px;
        }

        .cafe-hero {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          padding: 4px 2px 0;
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
        }

        .subtitle {
          max-width: 760px;
          margin: 14px 0 0;
          color: rgba(255, 247, 237, 0.82);
          font-size: clamp(16px, 1.8vw, 21px);
          line-height: 1.5;
        }

        .hero-actions {
          flex: 0 0 auto;
          display: flex;
          gap: 10px;
        }

        .hero-actions a {
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

        .hero-actions a:last-child {
          color: #fff7ed;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.16);
        }

        .room-layout {
          display: grid;
          grid-template-columns: minmax(250px, 0.72fr) minmax(0, 1.8fr);
          gap: 16px;
          margin-top: 22px;
          align-items: start;
        }

        .presence-panel,
        .table-card,
        .house-rules {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.62);
          box-shadow:
            0 18px 54px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(12px);
        }

        .presence-panel {
          position: sticky;
          top: 18px;
          padding: 16px;
          border-radius: 26px;
        }

        .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .panel-heading p,
        .panel-heading strong {
          margin: 0;
        }

        .panel-heading p {
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .panel-heading strong {
          color: rgba(255, 247, 237, 0.72);
          font-size: 12px;
        }

        .people-list {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .person-chip {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
        }

        .avatar {
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 38px;
          height: 38px;
          border-radius: 999px;
          color: #111827;
          font-size: 12px;
          font-weight: 950;
          box-shadow: 0 0 24px rgba(251, 191, 36, 0.16);
        }

        .avatar-rose { background: #fda4af; }
        .avatar-gold { background: #fcd34d; }
        .avatar-cyan { background: #67e8f9; }
        .avatar-violet { background: #c4b5fd; }
        .avatar-green { background: #86efac; }

        .person-chip strong,
        .person-chip small {
          display: block;
        }

        .person-chip strong {
          color: #fff7ed;
          font-size: 14px;
        }

        .person-chip small {
          margin-top: 2px;
          color: rgba(255, 247, 237, 0.62);
          font-size: 12px;
          text-transform: capitalize;
        }

        .counter-card {
          position: relative;
          overflow: hidden;
          margin-top: 14px;
          padding: 16px;
          border-radius: 22px;
          background: rgba(253, 230, 138, 0.1);
          border: 1px solid rgba(253, 230, 138, 0.18);
        }

        .coffee-light {
          position: absolute;
          inset: -30px 20px auto;
          height: 80px;
          border-radius: 999px;
          background: rgba(251, 191, 36, 0.34);
          filter: blur(22px);
        }

        .counter-card p,
        .counter-card strong,
        .counter-card small {
          position: relative;
          display: block;
          margin: 0;
        }

        .counter-card p {
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .counter-card strong {
          margin-top: 8px;
          font-size: 19px;
          line-height: 1.15;
        }

        .counter-card small {
          margin-top: 10px;
          color: rgba(255, 247, 237, 0.62);
          line-height: 1.45;
        }

        .tables {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .table-card {
          position: relative;
          overflow: hidden;
          min-height: 322px;
          padding: 16px;
          border-radius: 26px;
        }

        .table-card::before {
          content: "";
          position: absolute;
          inset: 14px 18px auto;
          height: 96px;
          border-radius: 999px;
          background: rgba(196, 181, 253, 0.16);
          filter: blur(24px);
        }

        .table-card:nth-child(2n)::before {
          background: rgba(251, 191, 36, 0.18);
        }

        .table-card:nth-child(3n)::before {
          background: rgba(45, 212, 191, 0.14);
        }

        .table-top,
        .table-description,
        .seat-row,
        .discussion-lines {
          position: relative;
          z-index: 1;
        }

        .table-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 14px;
        }

        .table-top p {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .table-top h2 {
          margin: 0;
          font-size: clamp(25px, 3vw, 38px);
          line-height: 0.95;
          letter-spacing: -0.035em;
        }

        .table-top > span {
          flex: 0 0 auto;
          padding: 7px 10px;
          border-radius: 999px;
          color: #111827;
          background: rgba(253, 230, 138, 0.92);
          font-size: 12px;
          font-weight: 950;
        }

        .table-description {
          margin: 16px 0 0;
          color: rgba(255, 247, 237, 0.72);
          font-size: 14px;
          line-height: 1.52;
        }

        .seat-row {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 16px;
        }

        .seat-row span {
          display: grid;
          place-items: center;
          min-width: 31px;
          height: 31px;
          padding: 0 8px;
          border-radius: 999px;
          color: #111827;
          background: linear-gradient(180deg, #fff7ed, #fcd34d);
          font-size: 11px;
          font-weight: 950;
          box-shadow: 0 0 22px rgba(251, 191, 36, 0.18);
        }

        .discussion-lines {
          display: grid;
          gap: 10px;
          margin-top: 16px;
        }

        .chat-bubble {
          position: relative;
          width: min(88%, 330px);
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 247, 237, 0.11);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
        }

        .chat-bubble-left {
          justify-self: start;
          border-radius: 18px 18px 18px 6px;
        }

        .chat-bubble-right {
          justify-self: end;
          border-radius: 18px 18px 6px 18px;
          background: rgba(253, 230, 138, 0.16);
          border-color: rgba(253, 230, 138, 0.18);
        }

        .chat-bubble::after {
          content: "";
          position: absolute;
          bottom: -1px;
          width: 10px;
          height: 10px;
          background: inherit;
          border-bottom: inherit;
        }

        .chat-bubble-left::after {
          left: -3px;
          border-left: inherit;
          border-radius: 0 0 0 8px;
          transform: skewX(-18deg);
        }

        .chat-bubble-right::after {
          right: -3px;
          border-right: inherit;
          border-radius: 0 0 8px 0;
          transform: skewX(18deg);
        }

        .chat-bubble small {
          display: block;
          margin: 0;
          color: #fde68a;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.05em;
        }

        .chat-bubble p {
          margin: 5px 0 0;
          color: rgba(255, 247, 237, 0.82);
          font-size: 13px;
          line-height: 1.45;
        }

        .house-rules {
          display: grid;
          grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
          gap: 18px;
          margin-top: 16px;
          padding: 18px;
          border-radius: 26px;
        }

        .house-rules h2 {
          margin: 0;
          font-size: clamp(24px, 3.2vw, 42px);
          line-height: 0.98;
          letter-spacing: -0.035em;
        }

        .house-rules ul {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        .house-rules li {
          padding: 12px 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 247, 237, 0.84);
          font-weight: 850;
        }

        @media (max-width: 980px) {
          .cafe-shell {
            padding: 18px 14px;
          }

          .cafe-hero,
          .room-layout,
          .house-rules {
            grid-template-columns: 1fr;
          }

          .cafe-hero {
            flex-direction: column;
          }

          .presence-panel {
            position: relative;
            top: auto;
          }
        }

        @media (max-width: 720px) {
          .tables,
          .house-rules ul {
            grid-template-columns: 1fr;
          }

          .hero-actions {
            width: 100%;
            flex-direction: column;
          }

          .hero-actions a {
            width: 100%;
          }

          .table-top {
            flex-direction: column;
          }
        }
      `}</style>
    </main>
  );
}
