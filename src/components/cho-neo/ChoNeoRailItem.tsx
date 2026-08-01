import Link from "next/link";

export type ChoNeoRailSymbol =
  | "village"
  | "gossip"
  | "question"
  | "xin-xam"
  | "gallery";

export type ChoNeoRailItemProps = {
  href: string;
  isCurrent?: boolean;
  label: string;
  symbol: ChoNeoRailSymbol;
};

function ChoNeoRailIcon({ symbol }: { symbol: ChoNeoRailSymbol }) {
  if (symbol === "question") {
    return (
      <svg viewBox="0 0 48 48" focusable="false">
        <circle cx="24" cy="24" r="15" />
        <path d="M19.5 19.5a4.8 4.8 0 1 1 7.6 3.9c-2.2 1.5-3.1 2.4-3.1 4.6" />
        <path d="M24 33.5h.01" />
      </svg>
    );
  }

  if (symbol === "gossip") {
    return (
      <svg viewBox="0 0 48 48" focusable="false">
        <path d="M15 20h17v8.5a8.5 8.5 0 0 1-17 0V20Z" />
        <path d="M32 22h2.5a4.5 4.5 0 0 1 0 9H32" />
        <path d="M13 36h23" />
        <path d="M18 15c-1.5-2 1.3-3 0-5M24 15c-1.5-2 1.3-3 0-5M30 15c-1.5-2 1.3-3 0-5" />
      </svg>
    );
  }

  if (symbol === "xin-xam") {
    return (
      <svg viewBox="0 0 48 48" focusable="false">
        <path d="M17 12h14l2 26H15l2-26Z" />
        <path d="M18 17h12M19 23h10M20 29h8" />
        <path d="M24 8v7" />
        <path d="M14 38h20" />
      </svg>
    );
  }

  if (symbol === "gallery") {
    return (
      <svg viewBox="0 0 48 48" focusable="false">
        <path d="M12 16h24v20H12V16Z" />
        <path d="M17 29l5-5 4 4 3-3 5 6" />
        <path d="M18 12h18v20" />
        <circle cx="30.5" cy="21.5" r="2.2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" focusable="false">
      <path className="rail-icon-fill" d="M8 22.5 24 11l16 11.5H8Z" />
      <path d="M11 24.5h26" />
      <path d="M14.5 24.5V38M33.5 24.5V38" />
      <path d="M19 38V28h10v10" />
      <path d="M10 38h28" />
    </svg>
  );
}

export function ChoNeoRailItem({
  href,
  isCurrent = false,
  label,
  symbol,
}: ChoNeoRailItemProps) {
  return (
    <Link
      aria-current={isCurrent ? "page" : undefined}
      className={`cho-neo-rail-item ${isCurrent ? "cho-neo-rail-item-current" : ""}`}
      href={href}
    >
      <span className="cho-neo-rail-item__icon" aria-hidden="true">
        <ChoNeoRailIcon symbol={symbol} />
      </span>
      <span className="cho-neo-rail-item__label">{label}</span>

      <style jsx>{`
        .cho-neo-rail-item {
          box-sizing: border-box;
          min-height: 48px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          align-items: center;
          gap: 0.54rem;
          border: 1px solid transparent;
          border-radius: 16px;
          padding: 0.42rem 0.52rem;
          color: #713021;
          font-family: var(--cho-neo-font-ui);
          text-decoration: none;
        }

        .cho-neo-rail-item:hover {
          border-color: rgba(154, 77, 46, 0.16);
          background: rgba(255, 248, 237, 0.68);
        }

        .cho-neo-rail-item:focus-visible {
          outline: 3px solid rgba(190, 96, 54, 0.28);
          outline-offset: 2px;
        }

        .cho-neo-rail-item-current {
          border-color: rgba(143, 57, 35, 0.2);
          color: #4b1717;
          background:
            linear-gradient(135deg, rgba(255, 229, 170, 0.52), rgba(255, 245, 237, 0.82)),
            rgba(255, 252, 244, 0.86);
          box-shadow: 0 12px 24px rgba(126, 49, 24, 0.1);
        }

        .cho-neo-rail-item__icon {
          width: 34px;
          height: 34px;
          display: inline-grid;
          place-items: center;
          border-radius: 12px;
          color: #8d3b23;
          background:
            radial-gradient(circle at 50% 28%, rgba(255, 207, 128, 0.5), transparent 56%),
            rgba(115, 45, 25, 0.08);
        }

        .cho-neo-rail-item-current .cho-neo-rail-item__icon {
          color: #6c2519;
          background:
            radial-gradient(circle at 50% 28%, rgba(255, 209, 111, 0.74), transparent 60%),
            rgba(139, 58, 30, 0.14);
        }

        .cho-neo-rail-item__icon svg {
          width: 24px;
          height: 24px;
          display: block;
        }

        .cho-neo-rail-item__icon :global(path),
        .cho-neo-rail-item__icon :global(circle) {
          fill: none;
          stroke: currentColor;
          stroke-width: 2.45;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .cho-neo-rail-item__icon :global(.rail-icon-fill) {
          fill: rgba(255, 201, 109, 0.36);
        }

        .cho-neo-rail-item__label {
          overflow: hidden;
          font-size: 0.84rem;
          font-weight: 500;
          line-height: 1.1;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </Link>
  );
}
