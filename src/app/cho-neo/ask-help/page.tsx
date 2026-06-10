import Link from "next/link";

export default function ChoNeoAskHelpPage() {
  return (
    <main className="section-page">
      <section className="section-card">
        <p className="eyebrow">ChoNeo Forum Door</p>
        <h1>Ask / Help</h1>
        <p className="intro">
          Static placeholder for advice on paperwork, shop setup, moving cities,
          schools, beauty work, family logistics, and the questions people actually ask.
        </p>

        <div className="placeholder">
          <p>Forum section placeholder only.</p>
          <strong>No backend. No database. No auth.</strong>
        </div>

        <div className="actions">
          <Link href="/cho-neo">Back to Forum</Link>
          <Link href="/cho-neo/world">Visit World Plaza</Link>
        </div>
      </section>

      <style>{`
        .section-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #fff7ed;
          background:
            radial-gradient(circle at 22% 18%, rgba(251, 191, 36, 0.22), transparent 30%),
            radial-gradient(circle at 78% 14%, rgba(103, 232, 249, 0.18), transparent 28%),
            linear-gradient(180deg, #101224 0%, #21162c 48%, #151015 100%);
        }

        .section-card {
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
