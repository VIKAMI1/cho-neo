import Link from "next/link";

export default function ChoNeoEntrancePage() {
  return (
    <main className="cho-neo-entrance-page">
      <section aria-labelledby="cho-neo-entrance-title" className="cho-neo-entrance-card">
        <p>Chợ Neo</p>
        <h1 id="cho-neo-entrance-title">Hẹn gặp lại.</h1>
        <Link href="/cho-neo">Vào Chợ</Link>
      </section>

      <style>{`
        .cho-neo-entrance-page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #fff4df;
          background:
            radial-gradient(circle at top, rgba(248, 211, 145, 0.16), transparent 34%),
            linear-gradient(145deg, #2a0711 0%, #4f0d18 48%, #16060b 100%);
        }

        .cho-neo-entrance-card {
          width: min(100%, 420px);
          display: grid;
          justify-items: center;
          gap: 14px;
          text-align: center;
        }

        .cho-neo-entrance-card p,
        .cho-neo-entrance-card h1 {
          margin: 0;
        }

        .cho-neo-entrance-card p {
          color: #f8d391;
          font-size: 0.92rem;
          font-weight: 600;
          letter-spacing: 0;
        }

        .cho-neo-entrance-card h1 {
          color: #fff4df;
          font-family: var(--font-newsreader), Georgia, serif;
          font-size: clamp(2.4rem, 9vw, 4.6rem);
          font-weight: 600;
          line-height: 0.98;
        }

        .cho-neo-entrance-card a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(248, 211, 145, 0.42);
          border-radius: 12px;
          padding: 11px 18px;
          color: #3b1d2a;
          background: #f8d391;
          font-size: 0.96rem;
          font-weight: 600;
          text-decoration: none;
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.24);
        }

        .cho-neo-entrance-card a:focus-visible {
          outline: 3px solid rgba(255, 244, 223, 0.65);
          outline-offset: 3px;
        }
      `}</style>
    </main>
  );
}
