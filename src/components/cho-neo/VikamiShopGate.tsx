"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { trackChoNeoBetaEvent } from "@/lib/cho-neo/beta-analytics";
import {
  VIKAMI_GREEN_PILOT_CAMPAIGN,
  VIKAMI_PILOT_COLLECTION_HANDLE,
} from "@/lib/cho-neo/vikami-shop";

type VikamiShopGateProps = {
  shopUrl: string | null;
};

export function VikamiShopGate({ shopUrl }: VikamiShopGateProps) {
  const shopConnected = Boolean(shopUrl);

  useEffect(() => {
    trackChoNeoBetaEvent("shop_gate_viewed", {
      room: "market-street",
      details: {
        connected: shopConnected,
        campaign: VIKAMI_GREEN_PILOT_CAMPAIGN,
        collectionHandle: VIKAMI_PILOT_COLLECTION_HANDLE,
      },
    });
  }, [shopConnected]);

  return (
    <main className="vikami-shop-gate">
      <div className="vikami-shop-atmosphere" aria-hidden="true" />
      <section className="vikami-shop-card" aria-labelledby="vikami-shop-title">
        <header className="vikami-shop-header">
          <Link className="vikami-shop-back" href="/cho-neo">
            <span aria-hidden="true">←</span> Về Chợ Neo
          </Link>
          <span className="vikami-shop-mark" aria-hidden="true">V</span>
          <span className="vikami-shop-status">
            <i aria-hidden="true" /> {shopConnected ? "Cổng đã sẵn sàng" : "Đang chuẩn bị"}
          </span>
        </header>

        <div className="vikami-shop-content">
          <div className="vikami-shop-copy">
            <p className="vikami-shop-kicker">VIKAMI SHOP / GHÉ TIỆM VIKAMI</p>
            <h1 id="vikami-shop-title">Một cánh cửa nhỏ ra tiệm.</h1>
            <p className="vikami-shop-lede">
              Chợ Neo là chỗ gặp nhau. VIKAMI là nơi xem những món đồ được chọn
              cho người làm nghề và người thương cái đẹp.
            </p>

            <div className="vikami-shop-trust-note">
              <span aria-hidden="true">✦</span>
              <p>
                Con sẽ rời Chợ Neo để sang cửa hàng VIKAMI. Giỏ hàng, thanh toán
                và đơn mua sẽ do Shopify xử lý.
              </p>
            </div>

            {shopConnected ? (
              <a
                className="vikami-shop-cta"
                href={shopUrl ?? undefined}
                rel="noreferrer"
                target="_blank"
                onClick={() =>
                  trackChoNeoBetaEvent("shop_gate_outbound_clicked", {
                    room: "market-street",
                    details: {
                      campaign: VIKAMI_GREEN_PILOT_CAMPAIGN,
                      collectionHandle: VIKAMI_PILOT_COLLECTION_HANDLE,
                    },
                  })
                }
              >
                Ghé tiệm VIKAMI <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <div className="vikami-shop-cta vikami-shop-cta-disabled" aria-disabled="true">
                Cửa hàng đang kết nối
              </div>
            )}

            <p className="vikami-shop-smallprint">
              {shopConnected
                ? "Cửa hàng mở ở một tab mới để con luôn biết mình đang ở đâu."
                : "Shopify chưa được nối vào Chợ Neo. Chưa có mã giảm giá hay Lộc nào được cấp."}
            </p>
          </div>

          <div className="vikami-shop-art" aria-label="VIKAMI shop preview">
            <Image
              alt="Cổng Phố Chợ VIKAMI trong Chợ Neo"
              fill
              priority
              sizes="(max-width: 760px) 100vw, 46vw"
              src="/images/cho-neo/pho-cho-locked-preview-16x9.png"
            />
            <div className="vikami-shop-art-label">
              <strong>Selected for the pilot</strong>
              <span>{VIKAMI_PILOT_COLLECTION_HANDLE}</span>
            </div>
          </div>
        </div>

        <footer className="vikami-shop-footer">
          <span>Chợ Neo × VIKAMI</span>
          <span>Không có quyền giảm giá nào nằm trong trình duyệt.</span>
        </footer>
      </section>

      <style>{`
        .vikami-shop-gate,
        .vikami-shop-gate * { box-sizing: border-box; }
        .vikami-shop-gate {
          min-height: 100vh; position: relative; display: grid; place-items: center;
          overflow: hidden; padding: 20px; color: #fff7ed; background: #090711;
          font-family: var(--cho-neo-font-ui);
        }
        .vikami-shop-atmosphere {
          position: absolute; inset: -20%;
          background: radial-gradient(circle at 18% 20%, rgba(248, 211, 145, .18), transparent 24%),
            radial-gradient(circle at 82% 72%, rgba(157, 64, 118, .3), transparent 30%),
            linear-gradient(135deg, #211129, #090711 55%, #120817); filter: blur(12px);
        }
        .vikami-shop-card {
          position: relative; width: min(1120px, 100%); overflow: hidden;
          border: 1px solid rgba(248, 211, 145, .26); border-radius: 30px;
          background: rgba(24, 12, 28, .9); box-shadow: 0 30px 100px rgba(0, 0, 0, .55), inset 0 1px 0 rgba(255, 255, 255, .1);
          backdrop-filter: blur(22px);
        }
        .vikami-shop-header, .vikami-shop-footer {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 20px 26px; color: rgba(255, 247, 237, .72); font-size: 11px;
          letter-spacing: .08em; text-transform: uppercase;
        }
        .vikami-shop-header { border-bottom: 1px solid rgba(248, 211, 145, .12); }
        .vikami-shop-back { color: inherit; text-decoration: none; }
        .vikami-shop-back:hover, .vikami-shop-back:focus-visible { color: #f8d391; }
        .vikami-shop-mark {
          display: grid; place-items: center; width: 34px; height: 34px;
          border: 1px solid rgba(248, 211, 145, .65); border-radius: 50%; color: #f8d391;
          font-family: Georgia, serif; font-size: 20px; letter-spacing: 0;
        }
        .vikami-shop-status { display: inline-flex; align-items: center; gap: 7px; }
        .vikami-shop-status i {
          width: 7px; height: 7px; border-radius: 50%; background: ${shopConnected ? "#84d7a5" : "#f0b86e"};
          box-shadow: 0 0 14px currentColor;
        }
        .vikami-shop-content {
          display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, .9fr);
          gap: clamp(28px, 6vw, 76px); align-items: center; padding: clamp(34px, 7vw, 84px) clamp(26px, 7vw, 88px);
        }
        .vikami-shop-copy { max-width: 510px; }
        .vikami-shop-kicker { margin: 0 0 18px; color: #f8d391; font-size: 11px; font-weight: 700; letter-spacing: .16em; }
        .vikami-shop-copy h1 {
          max-width: 460px; margin: 0; color: #fff7ed; font-family: var(--cho-neo-font-display);
          font-size: clamp(42px, 6vw, 76px); font-weight: 500; line-height: .98; letter-spacing: -.04em;
        }
        .vikami-shop-lede { max-width: 470px; margin: 24px 0 0; color: rgba(255, 247, 237, .74); font-size: 16px; line-height: 1.65; }
        .vikami-shop-trust-note { display: grid; grid-template-columns: auto 1fr; gap: 12px; margin: 26px 0; padding: 14px 16px; border: 1px solid rgba(248, 211, 145, .16); border-radius: 14px; background: rgba(255, 247, 237, .04); }
        .vikami-shop-trust-note > span { color: #f8d391; font-size: 17px; }
        .vikami-shop-trust-note p { margin: 0; color: rgba(255, 247, 237, .68); font-size: 13px; line-height: 1.5; }
        .vikami-shop-cta { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 0 20px; border: 1px solid #f8d391; border-radius: 999px; color: #1c0e1b; background: #f8d391; font-size: 13px; font-weight: 700; text-decoration: none; transition: transform .2s ease, background .2s ease; }
        .vikami-shop-cta:not(.vikami-shop-cta-disabled):hover, .vikami-shop-cta:not(.vikami-shop-cta-disabled):focus-visible { transform: translateY(-2px); background: #ffe7b3; }
        .vikami-shop-cta-disabled { cursor: not-allowed; border-color: rgba(248, 211, 145, .24); color: rgba(255, 247, 237, .5); background: rgba(255, 247, 237, .08); }
        .vikami-shop-smallprint { max-width: 390px; margin: 12px 0 0; color: rgba(255, 247, 237, .44); font-size: 11px; line-height: 1.45; }
        .vikami-shop-art { position: relative; aspect-ratio: 16 / 11; overflow: hidden; border: 1px solid rgba(248, 211, 145, .22); border-radius: 22px; background: #160d1a; box-shadow: 0 22px 55px rgba(0, 0, 0, .32); }
        .vikami-shop-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 38%, rgba(9, 7, 17, .86)); }
        .vikami-shop-art img { object-fit: cover; opacity: .92; }
        .vikami-shop-art-label { position: absolute; right: 20px; bottom: 18px; left: 20px; z-index: 1; display: grid; gap: 5px; }
        .vikami-shop-art-label strong { color: #fff7ed; font-family: var(--cho-neo-font-display); font-size: 22px; font-weight: 500; }
        .vikami-shop-art-label span { color: rgba(248, 211, 145, .75); font-size: 10px; letter-spacing: .08em; }
        .vikami-shop-footer { border-top: 1px solid rgba(248, 211, 145, .12); color: rgba(255, 247, 237, .46); font-size: 10px; letter-spacing: .05em; text-transform: none; }
        @media (max-width: 760px) {
          .vikami-shop-gate { align-items: start; padding: 10px; }
          .vikami-shop-card { border-radius: 22px; }
          .vikami-shop-header, .vikami-shop-footer { padding: 16px; }
          .vikami-shop-status { font-size: 9px; }
          .vikami-shop-content { grid-template-columns: 1fr; gap: 30px; padding: 38px 20px 34px; }
          .vikami-shop-copy h1 { font-size: clamp(44px, 15vw, 64px); }
          .vikami-shop-lede { font-size: 15px; }
          .vikami-shop-cta { width: 100%; }
          .vikami-shop-art { order: -1; aspect-ratio: 16 / 10; }
          .vikami-shop-footer { align-items: start; flex-direction: column; gap: 5px; }
        }
      `}</style>
    </main>
  );
}
