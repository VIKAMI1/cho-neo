import { ChoNeoRailItem, type ChoNeoRailItemProps } from "./ChoNeoRailItem";

export type ChoNeoVillageNavItem = ChoNeoRailItemProps & {
  id: string;
};

export const choNeoVillageNavItems: ChoNeoVillageNavItem[] = [
  {
    href: "/cho-neo",
    id: "village",
    label: "Sân Làng",
    symbol: "village",
  },
  {
    href: "/cho-neo/gossip",
    id: "gossip",
    label: "Quán Tám",
    symbol: "gossip",
  },
  {
    href: "/xin-xam",
    id: "xin-xam",
    label: "Xin Xăm",
    symbol: "xin-xam",
  },
  {
    href: "/cho-neo/show-off",
    id: "show-off",
    label: "Phòng Trưng Bày",
    symbol: "gallery",
  },
];

type ChoNeoVillageRailProps = {
  currentId: string;
};

export function ChoNeoVillageRail({ currentId }: ChoNeoVillageRailProps) {
  return (
    <aside className="cho-neo-village-rail" aria-label="Đi trong Chợ Neo">
      <div className="cho-neo-village-rail__brand">
        <span>Chợ Neo</span>
        <strong>Làng nail</strong>
      </div>
      <nav className="cho-neo-village-rail__nav" aria-label="Phòng trong làng">
        {choNeoVillageNavItems.map((item) => (
          <ChoNeoRailItem
            href={item.href}
            isCurrent={item.id === currentId}
            key={item.id}
            label={item.label}
            symbol={item.symbol}
          />
        ))}
      </nav>

      <style jsx>{`
        .cho-neo-village-rail {
          box-sizing: border-box;
          position: sticky;
          top: 1rem;
          align-self: start;
          width: clamp(150px, 13vw, 180px);
          border: 1px solid rgba(135, 62, 42, 0.12);
          border-radius: 24px;
          padding: 0.72rem;
          background:
            radial-gradient(circle at 20% 0%, rgba(255, 213, 143, 0.28), transparent 48%),
            linear-gradient(180deg, rgba(255, 249, 239, 0.92), rgba(255, 235, 232, 0.86));
          box-shadow:
            0 22px 58px rgba(112, 43, 31, 0.1),
            inset 0 0 0 1px rgba(255, 255, 255, 0.52);
          font-family: var(--cho-neo-font-ui);
        }

        .cho-neo-village-rail__brand {
          display: grid;
          gap: 0.16rem;
          padding: 0.38rem 0.42rem 0.72rem;
          color: #5d2119;
        }

        .cho-neo-village-rail__brand span {
          font-family: var(--cho-neo-font-display);
          font-size: 1.28rem;
          font-weight: 600;
          line-height: 0.95;
        }

        .cho-neo-village-rail__brand strong {
          color: rgba(93, 33, 25, 0.62);
          font-size: 0.68rem;
          font-weight: 400;
          letter-spacing: 0;
          text-transform: none;
        }

        .cho-neo-village-rail__nav {
          display: grid;
          gap: 0.28rem;
        }
      `}</style>
    </aside>
  );
}
