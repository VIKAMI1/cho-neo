import Link from "next/link";

export default function RegionPage() {
  return (
    <main className="region-page">
      <section className="region-card">
        <p className="eyebrow">ChoNeo World Gate</p>
        <h1>North America</h1>
        <p className="intro">Suburbs, downtown leases, weekend rush, school pickups, and nail shops built one client at a time.</p>

        <div className="placeholder">
          <p>Static placeholder only.</p>
          <strong>No backend. No database. No auth. No 3D yet.</strong>
        </div>

        <section className="city-panel" aria-label="Future city blocks">
          <h2>Future city blocks</h2>
          <ul>
              <li>California</li>
              <li>Texas</li>
              <li>Toronto</li>
              <li>Calgary</li>
              <li>Vancouver</li>
              <li>New York</li>
          </ul>
        </section>

        <div className="actions">
          <Link href="/cho-neo/world">Back to World</Link>
          <Link href="/cho-neo">Enter Forum</Link>
        </div>
      </section>

      <style>{`
        .region-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #fff7ed;
          background:
            radial-gradient(circle at 20% 18%, rgba(251, 191, 36, 0.2), transparent 30%),
            radial-gradient(circle at 80% 12%, rgba(45, 212, 191, 0.16), transparent 28%),
            linear-gradient(180deg, #101224 0%, #21162c 48%, #151015 100%);
        }

        .region-card {
          width: min(860px, 100%);
          padding: 28px;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 28px;
          background: rgba(15, 23, 42, 0.72);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.24em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          font-size: clamp(42px, 8vw, 82px);
          line-height: 0.94;
        }

        .intro {
          max-width: 680px;
          margin: 18px 0 0;
          color: rgba(255, 247, 237, 0.78);
          font-size: 18px;
          line-height: 1.55;
        }

        .placeholder {
          margin-top: 24px;
          padding: 18px;
          border-radius: 20px;
          background: rgba(253, 230, 138, 0.1);
          border: 1px solid rgba(253, 230, 138, 0.2);
        }

        .placeholder p {
          margin: 0 0 6px;
          color: rgba(255, 247, 237, 0.72);
        }

        .city-panel {
          margin-top: 24px;
        }

        .city-panel h2 {
          margin: 0 0 12px;
          font-size: 16px;
          color: #fde68a;
        }

        ul {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
          gap: 10px;
          padding: 0;
          margin: 0;
          list-style: none;
        }

        li {
          padding: 12px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 247, 237, 0.86);
          font-weight: 800;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-top: 26px;
        }

        .actions a {
          color: #111827;
          background: #fde68a;
          text-decoration: none;
          font-weight: 900;
          padding: 12px 16px;
          border-radius: 999px;
        }

        .actions a:last-child {
          color: #fff7ed;
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
      `}</style>
    </main>
  );
}
