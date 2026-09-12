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
    href: "/cho-neo/tim-ban-trong-nghe",
    id: "gossip",
    label: "Quán Xã Giao",
    symbol: "gossip",
  },
  {
    href: "/cho-neo/hoi-cho-neo",
    id: "hoi-cho-neo",
    label: "Hỏi Chợ Neo",
    symbol: "question",
  },
  {
    href: "/xin-xam",
    id: "xin-xam",
    label: "Xin Xăm",
    symbol: "xin-xam",
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
          width: clamp(136px, 11vw, 148px);
          border: 1px solid rgba(135, 62, 42, 0.1);
          border-radius: 16px;
          padding: 0.52rem;
          background: rgba(255, 249, 239, 0.78);
          box-shadow: 0 10px 30px rgba(112, 43, 31, 0.055);
          font-family: var(--cho-neo-font-ui);
        }

        .cho-neo-village-rail__brand {
          display: grid;
          gap: 0.16rem;
          padding: 0.28rem 0.32rem 0.56rem;
          color: #5d2119;
        }

        .cho-neo-village-rail__brand span {
          font-family: var(--cho-neo-font-display);
          font-size: 1.12rem;
          font-weight: 500;
          line-height: 0.95;
        }

        .cho-neo-village-rail__brand strong {
          color: rgba(93, 33, 25, 0.62);
          font-size: 0.64rem;
          font-weight: 400;
          letter-spacing: 0;
          text-transform: none;
        }

        .cho-neo-village-rail__nav {
          display: grid;
          gap: 0.2rem;
        }
      `}</style>
    </aside>
  );
}
