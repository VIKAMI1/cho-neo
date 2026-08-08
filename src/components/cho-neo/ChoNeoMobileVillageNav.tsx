import { ChoNeoRailItem } from "./ChoNeoRailItem";
import { choNeoVillageNavItems } from "./ChoNeoVillageRail";

type ChoNeoMobileVillageNavProps = {
  currentId: string;
};

export function ChoNeoMobileVillageNav({ currentId }: ChoNeoMobileVillageNavProps) {
  return (
    <nav className="cho-neo-mobile-village-nav" aria-label="Đi trong Chợ Neo">
      {choNeoVillageNavItems.map((item) => (
        <ChoNeoRailItem
          href={item.href}
          isCurrent={item.id === currentId}
          key={item.id}
          label={item.label}
          symbol={item.symbol}
        />
      ))}

      <style jsx>{`
        .cho-neo-mobile-village-nav {
          box-sizing: border-box;
          display: none;
        }

        @media (max-width: 820px) {
          .cho-neo-mobile-village-nav {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            align-items: stretch;
            gap: 0.24rem;
            width: 100%;
            max-width: 100%;
            overflow-x: auto;
            scrollbar-width: none;
            border-bottom: 1px solid rgba(121, 49, 34, 0.1);
            padding: calc(0.48rem + env(safe-area-inset-top, 0px)) 0.54rem 0.48rem;
            background: rgba(255, 249, 239, 0.92);
            box-shadow: 0 6px 18px rgba(112, 43, 31, 0.055);
          }

          .cho-neo-mobile-village-nav::-webkit-scrollbar {
            display: none;
          }

          .cho-neo-mobile-village-nav :global(.cho-neo-rail-item) {
            flex: 0 0 auto;
            min-height: 44px;
            width: max-content;
            min-width: 112px;
            grid-template-columns: 26px auto;
            gap: 0.28rem;
            border-radius: 14px;
            padding: 0.32rem 0.34rem;
          }

          .cho-neo-mobile-village-nav :global(.cho-neo-rail-item__icon) {
            width: 26px;
            height: 26px;
            border-radius: 9px;
          }

          .cho-neo-mobile-village-nav :global(.cho-neo-rail-item__icon svg) {
            width: 19px;
            height: 19px;
          }

          .cho-neo-mobile-village-nav :global(.cho-neo-rail-item__label) {
            font-size: clamp(0.64rem, 2.6vw, 0.76rem);
            line-height: 1.05;
          }
        }

        @media (max-width: 640px) {
          .cho-neo-mobile-village-nav :global(.cho-neo-rail-item) {
            grid-template-columns: 25px minmax(0, 1fr);
            gap: 0.26rem;
            padding: 0.3rem 0.34rem;
          }

          .cho-neo-mobile-village-nav :global(.cho-neo-rail-item__label) {
            max-width: 100%;
          }
        }
      `}</style>
    </nav>
  );
}
