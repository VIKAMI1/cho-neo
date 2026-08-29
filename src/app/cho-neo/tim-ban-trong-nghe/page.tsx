"use client";

import Image from "next/image";
import Link from "next/link";
import { ChoNeoRoomShell } from "@/components/cho-neo/ChoNeoRoomShell";
import { ChoNeoRoomTopBar } from "@/components/cho-neo/ChoNeoRoomTopBar";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";

const matchingSignals = [
  "Cùng thành phố",
  "Cùng hoàn cảnh trong nghề",
  "Điều bạn đang cần",
  "Điều bạn có thể chia sẻ",
];

export default function TimBanTrongNghePreviewPage() {
  return (
    <>
      <ChoNeoTimeAmbience />
      <ChoNeoRoomShell currentNavId="gossip" className="tim-ban-preview-shell">
        <main className="tim-ban-preview">
          <ChoNeoRoomTopBar ariaLabel="Tìm Bạn Trong Nghề controls" />

          <section className="tim-ban-hero" aria-labelledby="tim-ban-title">
            <div className="tim-ban-artwork">
              <Image
                alt="Quán Xã Giao trong Chợ Neo"
                fill
                priority
                sizes="(max-width: 760px) 100vw, 48vw"
                src="/images/cho-neo/Quay-Xa-Giao.png"
              />
              <span>Quán đang chuẩn bị bàn</span>
            </div>

            <div className="tim-ban-copy">
              <p className="tim-ban-kicker">Quán Xã Giao · Sắp mở</p>
              <h1 id="tim-ban-title">Tìm Bạn Trong Nghề</h1>
              <p className="tim-ban-promise">
                Chợ Neo sẽ giới thiệu một người trong nghề có thể hiểu câu
                chuyện của bạn.
              </p>
              <p className="tim-ban-boundary">
                Không hẹn hò. Không lướt hồ sơ. Không bán hàng. Hai bên chỉ mở
                cửa khi cùng muốn làm quen.
              </p>

              <ul aria-label="Những điều Chợ Neo sẽ dùng để giới thiệu">
                {matchingSignals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>

              <div className="tim-ban-actions">
                <Link href="/cho-neo/hoi-cho-neo">Hỏi một chuyện trong nghề</Link>
                <Link className="secondary" href="/cho-neo">
                  Trở lại sân làng
                </Link>
              </div>
            </div>
          </section>

          <footer>
            <strong>Chuyện nghề, chuyện đời, chuyện mình.</strong>
            <span>
              Chợ chưa nhận hồ sơ ghép bạn cho đến khi quyền riêng tư và chặn
              báo cáo được kiểm tra xong.
            </span>
          </footer>
        </main>

        <style>{`
          .tim-ban-preview-shell {
            --tim-ban-ink: #54231d;
            --tim-ban-muted: #7c5b51;
            --tim-ban-paper: #fff8ea;
          }

          .tim-ban-preview {
            box-sizing: border-box;
            min-height: 100%;
            padding: clamp(18px, 3vw, 36px);
            color: var(--tim-ban-ink);
            background:
              radial-gradient(circle at 12% 8%, rgba(232, 170, 92, 0.18), transparent 32%),
              linear-gradient(180deg, #fffaf0, #f8edda);
          }

          .tim-ban-preview *,
          .tim-ban-preview *::before,
          .tim-ban-preview *::after {
            box-sizing: border-box;
          }

          .tim-ban-hero {
            width: min(1120px, 100%);
            display: grid;
            grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.95fr);
            gap: clamp(24px, 5vw, 64px);
            align-items: center;
            margin: clamp(24px, 5vh, 60px) auto 0;
          }

          .tim-ban-artwork {
            position: relative;
            min-height: clamp(360px, 56vw, 620px);
            overflow: hidden;
            border: 1px solid rgba(112, 57, 39, 0.16);
            border-radius: 28px 28px 90px 28px;
            background: #351416;
            box-shadow: 0 30px 70px rgba(84, 35, 29, 0.18);
          }

          .tim-ban-artwork::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, transparent 58%, rgba(35, 10, 12, 0.78));
          }

          .tim-ban-artwork img {
            object-fit: cover;
          }

          .tim-ban-artwork span {
            position: absolute;
            z-index: 1;
            right: 22px;
            bottom: 22px;
            left: 22px;
            color: #fff4dd;
            font-size: 0.88rem;
            letter-spacing: 0.04em;
            text-align: center;
          }

          .tim-ban-copy {
            display: grid;
            gap: 18px;
          }

          .tim-ban-copy p,
          .tim-ban-copy h1,
          .tim-ban-copy ul {
            margin: 0;
          }

          .tim-ban-kicker {
            color: #a24d31;
            font-size: 0.82rem;
            font-weight: 600;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .tim-ban-copy h1 {
            max-width: 10ch;
            font-family: var(--cho-neo-font-display);
            font-size: clamp(3rem, 6.5vw, 6rem);
            font-weight: 500;
            line-height: 0.9;
            letter-spacing: -0.045em;
          }

          .tim-ban-promise {
            max-width: 34rem;
            color: #653129;
            font-family: var(--cho-neo-font-display);
            font-size: clamp(1.28rem, 2.3vw, 1.8rem);
            line-height: 1.35;
          }

          .tim-ban-boundary {
            max-width: 36rem;
            color: var(--tim-ban-muted);
            line-height: 1.7;
          }

          .tim-ban-copy ul {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            padding: 0;
            list-style: none;
          }

          .tim-ban-copy li {
            min-height: 52px;
            display: flex;
            align-items: center;
            border: 1px solid rgba(122, 66, 45, 0.13);
            border-radius: 14px;
            padding: 12px 14px;
            background: rgba(255, 255, 255, 0.5);
            font-size: 0.92rem;
          }

          .tim-ban-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 4px;
          }

          .tim-ban-actions a {
            min-height: 46px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid #713225;
            border-radius: 999px;
            padding: 11px 18px;
            color: #fff9ed;
            background: #713225;
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: none;
          }

          .tim-ban-actions a.secondary {
            color: #713225;
            background: transparent;
          }

          .tim-ban-preview footer {
            width: min(1120px, 100%);
            display: flex;
            justify-content: space-between;
            gap: 20px;
            margin: 42px auto 0;
            border-top: 1px solid rgba(112, 57, 39, 0.14);
            padding-top: 18px;
            color: var(--tim-ban-muted);
            font-size: 0.82rem;
            line-height: 1.5;
          }

          .tim-ban-preview footer strong {
            color: var(--tim-ban-ink);
            font-family: var(--cho-neo-font-display);
            font-size: 1rem;
            font-weight: 500;
          }

          .tim-ban-preview footer span {
            max-width: 36rem;
            text-align: right;
          }

          @media (max-width: 760px) {
            .tim-ban-preview {
              padding: 14px;
            }

            .tim-ban-hero {
              grid-template-columns: 1fr;
              margin-top: 18px;
            }

            .tim-ban-artwork {
              min-height: min(112vw, 470px);
              border-radius: 22px 22px 58px 22px;
            }

            .tim-ban-copy h1 {
              max-width: none;
              font-size: clamp(3rem, 16vw, 4.8rem);
            }

            .tim-ban-copy ul {
              grid-template-columns: 1fr;
            }

            .tim-ban-actions {
              display: grid;
            }

            .tim-ban-preview footer {
              display: grid;
            }

            .tim-ban-preview footer span {
              text-align: left;
            }
          }
        `}</style>
      </ChoNeoRoomShell>
    </>
  );
}
