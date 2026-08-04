"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function PrivateInvitationEntry() {
  const [joinHref, setJoinHref] = useState("/join");

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get("next");
    if (!next || !isSafeReturnTo(next)) return;
    setJoinHref(`/join?next=${encodeURIComponent(next)}`);
  }, []);

  return (
    <main className="cho-neo-private-entry">
      <section aria-labelledby="cho-neo-private-entry-title">
        <p>Chợ Neo</p>
        <h1 id="cho-neo-private-entry-title">Mở cửa theo lời mời riêng</h1>
        <span aria-hidden="true" className="cho-neo-private-entry-rule" />
        <p>
          Chợ Neo dành cho những người được mời. Mở liên kết riêng bạn nhận được để tạo tên gọi và bước vào chợ.
        </p>
        <Link href={joinHref}>Mở lời mời</Link>
        <small>Chưa có lời mời? Chợ Neo hiện chưa mở đăng ký công khai.</small>
      </section>
      <style jsx>{`
        .cho-neo-private-entry {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 24px;
          color: #fff4dc;
          background: #24101a;
          font-family: var(--cho-neo-font-ui, sans-serif);
        }

        section {
          width: min(440px, 100%);
          display: grid;
          gap: 16px;
          padding: clamp(24px, 6vw, 42px);
          border: 1px solid #d8a95d;
          border-radius: 8px;
          background: #321724;
        }

        section > p:first-child {
          margin: 0;
          color: #e1ae66;
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        h1 {
          margin: 0;
          color: #fff4dc;
          font-size: clamp(1.9rem, 6vw, 2.8rem);
          line-height: 1.08;
        }

        section > p:not(:first-child) {
          margin: 0;
          color: #e6cfab;
          line-height: 1.6;
        }

        .cho-neo-private-entry-rule {
          width: 64px;
          height: 2px;
          background: #cf714b;
        }

        a {
          display: inline-flex;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          border: 1px solid #8b3a3c;
          border-radius: 4px;
          color: #fffaf0;
          background: #8b3a3c;
          font-weight: 700;
          text-decoration: none;
        }

        a:focus-visible {
          outline: 3px solid #e0a45d;
          outline-offset: 2px;
        }

        small {
          color: #c9ae91;
          line-height: 1.5;
        }
      `}</style>
    </main>
  );
}

function isSafeReturnTo(value: string) {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/^[a-z][a-z0-9+.-]*:/i.test(value)
  );
}
