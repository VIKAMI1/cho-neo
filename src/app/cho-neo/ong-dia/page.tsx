import Image from "next/image";
import Link from "next/link";
import OngDiaThreeLayer from "./OngDiaThreeLayer";

const SHRINE_STAGE_IMAGE = "/images/cho-neo/ong-dia-shrine-stage-v1.png";

export default function OngDiaPage() {
  return (
    <main className="ong-dia-page">
      <section className="ong-dia-shell" aria-labelledby="ong-dia-title">
        <div className="ong-dia-copy">
          <p className="ong-dia-eyebrow">
            Bàn Ông Địa
            <span>Ong Dia Shrine</span>
          </p>
          <h1 id="ong-dia-title">
            Ghé Ông Địa
            <span>Warm shrine stage</span>
          </h1>
          <p>
            Một góc nhỏ để xin vía bình an, giữ lòng nhẹ, rồi đi tiếp một ngày
            làm nghề.
            <span>
              A warm neighborhood shrine stage for a steady heart and practical
              luck.
            </span>
          </p>
        </div>

        <Link href="/cho-neo" className="ong-dia-back">
          <span>Về Sân Làng</span>
          <small>Back to Village</small>
        </Link>
      </section>

      <section className="ong-dia-stage-wrap" aria-label="Sân khấu Ông Địa">
        <div className="ong-dia-stage">
          <Image
            src={SHRINE_STAGE_IMAGE}
            alt="Warm Vietnamese Ông Địa shrine stage with altar offerings, fruit, chè trays, lanterns, a resting cat, and a Shiba Inu"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 1180px"
            className="ong-dia-stage-image"
          />
          <div className="ong-dia-center-guide" aria-hidden="true" />
          <OngDiaThreeLayer />
        </div>
      </section>

      <section className="ong-dia-note" aria-label="Ghi chú phát triển">
        <p>
          Ông Địa hiện là mô hình Three.js nhẹ để giữ chỗ.
          <span>
            Later, replace the placeholder with{" "}
            <code>/public/models/cho-neo/ong-dia.glb</code>.
          </span>
        </p>
      </section>

      <style>{`
        .ong-dia-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 50% 10%, rgba(255, 177, 73, 0.24), transparent 36rem),
            linear-gradient(180deg, #190d09 0%, #2a120b 44%, #130907 100%);
          color: #fff4dd;
          padding: clamp(1rem, 2.5vw, 2rem);
        }

        .ong-dia-shell {
          width: min(1180px, 100%);
          margin: 0 auto 1rem;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
        }

        .ong-dia-copy {
          max-width: 720px;
        }

        .ong-dia-eyebrow,
        .ong-dia-copy h1,
        .ong-dia-copy p {
          margin: 0;
        }

        .ong-dia-eyebrow {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          align-items: center;
          color: #ffd48b;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ong-dia-eyebrow span {
          color: rgba(255, 244, 221, 0.7);
          letter-spacing: 0.08em;
        }

        .ong-dia-copy h1 {
          margin-top: 0.35rem;
          color: #fff0c2;
          font-size: clamp(2.05rem, 5vw, 4.75rem);
          line-height: 0.95;
          text-shadow: 0 0 28px rgba(255, 159, 53, 0.42);
        }

        .ong-dia-copy h1 span,
        .ong-dia-copy p span {
          display: block;
        }

        .ong-dia-copy h1 span {
          margin-top: 0.18rem;
          color: rgba(255, 212, 139, 0.75);
          font-size: 0.32em;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ong-dia-copy p {
          margin-top: 0.7rem;
          color: rgba(255, 244, 221, 0.82);
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
          line-height: 1.55;
        }

        .ong-dia-copy p span {
          color: rgba(255, 244, 221, 0.62);
        }

        .ong-dia-back {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-height: 44px;
          padding: 0.55rem 0.85rem;
          border: 1px solid rgba(255, 212, 139, 0.32);
          border-radius: 999px;
          background: rgba(52, 22, 12, 0.72);
          color: #ffe7ae;
          text-decoration: none;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24);
        }

        .ong-dia-back span {
          font-size: 0.82rem;
          font-weight: 800;
        }

        .ong-dia-back small {
          color: rgba(255, 244, 221, 0.66);
          font-size: 0.67rem;
        }

        .ong-dia-stage-wrap {
          width: min(1180px, 100%);
          margin: 0 auto;
          border-radius: clamp(18px, 3vw, 30px);
          background:
            linear-gradient(135deg, rgba(255, 211, 138, 0.22), transparent 22%),
            rgba(38, 16, 8, 0.86);
          padding: clamp(0.35rem, 1vw, 0.7rem);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.5),
            inset 0 0 0 1px rgba(255, 218, 157, 0.22);
        }

        .ong-dia-stage {
          position: relative;
          aspect-ratio: 7 / 4;
          width: 100%;
          overflow: hidden;
          border-radius: clamp(14px, 2.2vw, 24px);
          background: #1a0d08;
          isolation: isolate;
        }

        .ong-dia-stage-image {
          object-fit: cover;
          object-position: center;
          z-index: 0;
        }

        .ong-dia-stage::after {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          content: "";
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 198, 97, 0.14), transparent 18rem),
            linear-gradient(180deg, rgba(10, 4, 2, 0.04), rgba(10, 4, 2, 0.18));
        }

        .ong-dia-center-guide {
          position: absolute;
          left: 50%;
          top: 43%;
          z-index: 2;
          width: min(16vw, 180px);
          aspect-ratio: 1 / 1;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 202, 113, 0.18), transparent 62%);
          filter: blur(3px);
          opacity: 0.74;
          pointer-events: none;
        }

        .ong-dia-three-layer {
          position: absolute;
          inset: 0;
          z-index: 3;
          cursor: pointer;
          pointer-events: auto;
        }

        .ong-dia-three-layer canvas {
          display: block;
          width: 100%;
          height: 100%;
        }

        .ong-dia-note {
          width: min(1180px, 100%);
          margin: 0.85rem auto 0;
          color: rgba(255, 244, 221, 0.68);
          font-size: 0.82rem;
          line-height: 1.45;
        }

        .ong-dia-note p {
          margin: 0;
        }

        .ong-dia-note span {
          display: block;
        }

        .ong-dia-note code {
          color: #ffe0a1;
        }

        @media (max-width: 760px) {
          .ong-dia-page {
            padding: 0.75rem;
          }

          .ong-dia-shell {
            align-items: stretch;
            flex-direction: column;
            margin-bottom: 0.75rem;
          }

          .ong-dia-copy h1 {
            font-size: clamp(2rem, 12vw, 3.2rem);
          }

          .ong-dia-back {
            width: fit-content;
          }

          .ong-dia-stage-wrap {
            border-radius: 18px;
            padding: 0.3rem;
          }

          .ong-dia-stage {
            aspect-ratio: 4 / 5;
          }

          .ong-dia-stage-image {
            object-position: 50% 50%;
          }

          .ong-dia-center-guide {
            top: 45%;
            width: 34vw;
          }
        }
      `}</style>
    </main>
  );
}
