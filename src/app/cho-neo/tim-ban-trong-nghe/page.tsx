"use client";

import Image from "next/image";
import Link from "next/link";
import { ChoNeoBetaFeedback } from "@/components/cho-neo/ChoNeoBetaFeedback";
import { useChoNeoMember } from "@/components/cho-neo/ChoNeoMemberProvider";
import { ChoNeoRoomShell } from "@/components/cho-neo/ChoNeoRoomShell";
import { ChoNeoRoomTopBar } from "@/components/cho-neo/ChoNeoRoomTopBar";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";
import {
  TimBanTrongNghePanel,
  TimBanTrongNgheStartButton,
} from "@/components/cho-neo/TimBanTrongNghePanel";

export default function TimBanTrongNghePreviewPage() {
  const { ensureChoNeoMember, profile } = useChoNeoMember();

  return (
    <>
      <ChoNeoTimeAmbience />
      <ChoNeoRoomShell currentNavId="gossip" className="tim-ban-preview-shell">
        <main className="tim-ban-preview">
          <ChoNeoRoomTopBar
            ariaLabel="Quầy Xã Giao controls"
            feedback={<ChoNeoBetaFeedback />}
            memberProfile={profile}
            navigation={
              <Link href="/cho-neo/hoi-cho-neo">Hỏi Chợ Neo</Link>
            }
            onMemberClick={() => {
              void ensureChoNeoMember(async () => undefined);
            }}
            tone="light"
          />

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
              <p className="tim-ban-kicker">Quầy Xã Giao · Sắp mở</p>
              <h1 id="tim-ban-title">Tìm Bạn Trong Nghề</h1>
              <p className="tim-ban-promise">
                Bắt đầu từ nghề chung. Còn hợp nhau đến đâu, để câu chuyện
                trả lời.
              </p>
              <p className="tim-ban-boundary">
                Không chấm điểm. Không bán hàng. Hai người chỉ kết nối khi
                cả hai cùng muốn chào.
              </p>

              <div className="tim-ban-actions">
                <TimBanTrongNgheStartButton />
              </div>
            </div>
          </section>

          <TimBanTrongNghePanel />

          <footer>
            <strong>Chuyện nghề, chuyện đời, chuyện mình.</strong>
            <span>
              Hồ sơ không công khai. Cách liên lạc chỉ mở sau khi hai người
              cùng muốn chào.
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
            margin: 18px auto 0;
          }

          .tim-ban-artwork {
            position: relative;
            height: clamp(300px, 36vw, 460px);
            overflow: hidden;
            border: 1px solid rgba(112, 57, 39, 0.16);
            border-radius: 28px 28px 0 0;
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
            object-position: center 48%;
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
            grid-template-columns: minmax(220px, 0.78fr) minmax(0, 1.22fr);
            gap: 12px clamp(24px, 5vw, 58px);
            border: 1px solid rgba(112, 57, 39, 0.14);
            border-top: 0;
            border-radius: 0 0 24px 24px;
            padding: clamp(20px, 3vw, 30px);
            background: rgba(255, 253, 248, 0.7);
          }

          .tim-ban-copy .tim-ban-kicker {
            grid-column: 1;
            grid-row: 1;
          }

          .tim-ban-copy h1 {
            grid-column: 1;
            grid-row: 2 / span 3;
          }

          .tim-ban-copy .tim-ban-promise,
          .tim-ban-copy .tim-ban-boundary,
          .tim-ban-copy .tim-ban-actions {
            grid-column: 2;
          }
          .tim-ban-copy p,
          .tim-ban-copy h1 {
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
            /* Keep the room—not the headline—as the dominant visual. */
            max-width: 10ch;
            font-family: var(--cho-neo-font-display);
            font-size: clamp(2rem, 3.4vw, 3.25rem);
            font-weight: 500;
            line-height: 0.96;
            letter-spacing: -0.035em;
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

          .tim-ban-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 4px;
          }

          .tim-ban-actions a,
          .tim-ban-actions button {
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
            user-select: none;
            -webkit-user-select: none;
            touch-action: manipulation;
          }

          .tim-ban-actions button {
            cursor: pointer;
          }

          .tim-ban-actions button:disabled {
            cursor: wait;
            opacity: 0.65;
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

          .tim-ban-panel {
            width: min(980px, 100%);
            display: grid;
            gap: 16px;
            margin: 26px auto 0;
            border: 1px solid rgba(112, 57, 39, 0.16);
            border-radius: 22px;
            padding: clamp(18px, 3vw, 26px);
            background: rgba(255, 255, 255, 0.58);
            box-shadow: 0 22px 60px rgba(84, 35, 29, 0.1);
          }
          .tim-ban-panel h2, .tim-ban-panel h3, .tim-ban-panel p { margin: 0; }
          .tim-ban-panel h2 { font-family: var(--cho-neo-font-display); font-size: clamp(1.65rem, 3.2vw, 2.25rem); font-weight: 500; }
          .tim-ban-panel-heading { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
          .tim-ban-panel-heading > span { border-radius: 999px; padding: 7px 10px; color: #7b4b3f; background: #f6ead7; font-size: .76rem; white-space: nowrap; }
          .tim-ban-locked { text-align: center; justify-items: center; }
          .tim-ban-locked p { max-width: 38rem; line-height: 1.65; color: var(--tim-ban-muted); }
          .tim-ban-panel form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 13px; }
          .tim-ban-panel form > .tim-ban-location-grid,
          .tim-ban-panel form > .tim-ban-discovery,
          .tim-ban-panel form > .tim-ban-professional-grid,
          .tim-ban-panel form > .tim-ban-languages,
          .tim-ban-panel form > .tim-ban-guide,
          .tim-ban-panel form > .tim-ban-profile-preview,
          .tim-ban-panel form > .tim-ban-consent,
          .tim-ban-panel form > .tim-ban-row { grid-column: 1 / -1; }
          .tim-ban-panel form > label:has(select) { grid-column: 1 / -1; }
          .tim-ban-location-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
          .tim-ban-professional-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; }
          .tim-ban-professional-grid label { min-width: 0; }
          .tim-ban-professional-grid label small { color: var(--tim-ban-muted); font-size: .68rem; font-weight: 400; }
          .tim-ban-languages { display: flex; flex-wrap: wrap; gap: 8px; margin: 0; border: 0; padding: 0; }
          .tim-ban-languages legend { width: 100%; margin-bottom: 2px; color: #653129; font-size: .88rem; font-weight: 650; }
          .tim-ban-panel .tim-ban-languages label { display: inline-flex; grid-template-columns: none; align-items: center; gap: 6px; border: 1px solid rgba(112,57,39,.16); border-radius: 999px; padding: 8px 11px; background: #fffaf0; cursor: pointer; }
          .tim-ban-panel .tim-ban-languages input { width: 15px; margin: 0; }
          .tim-ban-discovery { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; margin: 0; border: 0; padding: 0; }
          .tim-ban-discovery legend { grid-column: 1 / -1; margin-bottom: 2px; color: #653129; font-size: .88rem; font-weight: 650; }
          .tim-ban-panel .tim-ban-discovery label { grid-template-columns: 18px 1fr; align-items: start; border: 1px solid rgba(112,57,39,.16); border-radius: 13px; padding: 10px; background: #fffaf0; cursor: pointer; }
          .tim-ban-panel .tim-ban-discovery input { width: 16px; margin-top: 2px; }
          .tim-ban-discovery span { display: grid; grid-template-columns: auto 1fr; gap: 0 4px; }
          .tim-ban-discovery small { grid-column: 1 / -1; margin-top: 3px; color: var(--tim-ban-muted); font-weight: 400; line-height: 1.35; }
          .tim-ban-panel label { display: grid; gap: 7px; color: #653129; font-size: .88rem; font-weight: 600; }
          .tim-ban-panel input, .tim-ban-panel select, .tim-ban-panel textarea { width: 100%; border: 1px solid rgba(112,57,39,.2); border-radius: 12px; padding: 12px 13px; color: #54231d; background: #fffdf8; font: inherit; }
          .tim-ban-panel textarea { min-height: 72px; resize: vertical; }
          .tim-ban-panel .tim-ban-consent { grid-template-columns: 20px 1fr; align-items: start; color: var(--tim-ban-muted); font-weight: 400; line-height: 1.5; }
          .tim-ban-panel .tim-ban-consent input { width: 18px; margin-top: 2px; }
          .tim-ban-panel button { min-height: 44px; border: 1px solid #713225; border-radius: 999px; padding: 10px 17px; color: #fff9ed; background: #713225; font-weight: 650; cursor: pointer; }
          .tim-ban-panel button:disabled { cursor: not-allowed; opacity: .5; }
          .tim-ban-panel button.quiet { color: #713225; background: transparent; }
          .tim-ban-panel button.danger { color: #8b291f; border-color: #c88b7e; background: #fff7f3; }
          .tim-ban-row { display: flex; flex-wrap: wrap; gap: 9px; }
          .tim-ban-guide { display: grid; gap: 13px; border: 1px solid rgba(132, 71, 39, .22); border-radius: 18px; padding: 17px; background: linear-gradient(145deg, #fff8eb, #f8ead7); }
          .tim-ban-guide > p { color: var(--tim-ban-muted); font-size: .9rem; line-height: 1.55; }
          .tim-ban-guide-heading { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
          .tim-ban-guide-heading h3 { margin-top: 3px; font-family: var(--cho-neo-font-display); font-size: 1.45rem; font-weight: 500; }
          .tim-ban-guide-heading button { min-height: 36px; padding: 7px 12px; font-size: .8rem; }
          .tim-ban-guide-questions { display: grid; gap: 12px; }
          .tim-ban-guide-question { display: grid; gap: 7px; }
          .tim-ban-guide-questions textarea { min-height: 66px; background: rgba(255, 253, 248, .9); }
          .tim-ban-guide-questions > button { justify-self: start; }
          .tim-ban-choices { display: flex; flex-wrap: wrap; gap: 7px; }
          .tim-ban-panel .tim-ban-choices button { min-height: 34px; border-color: rgba(113, 50, 37, .24); padding: 6px 10px; color: #713225; background: rgba(255, 253, 248, .82); font-size: .78rem; font-weight: 550; }
          .tim-ban-profile-preview { display: grid; gap: 9px; margin: 4px 0; border-left: 3px solid #d8bda2; padding: 13px 16px; color: #40231f; background: rgba(255, 253, 248, .62); }
          .tim-ban-profile-preview > strong { font-size: 1.05rem; }
          .tim-ban-profile-preview > span { color: var(--tim-ban-muted); font-size: .88rem; }
          .tim-ban-profile-preview div { display: grid; gap: 3px; margin-top: 5px; }
          .tim-ban-profile-preview b { font-size: .88rem; }
          .tim-ban-profile-preview p { color: #4f332d; line-height: 1.55; }
          .tim-ban-profile-preview small { margin-top: 5px; color: var(--tim-ban-muted); line-height: 1.45; }
          .tim-ban-message { border-radius: 12px; padding: 11px 13px; color: #64362d; background: #f9ecd7; line-height: 1.5; }
          .tim-ban-introductions { display: grid; gap: 12px; }
          .tim-ban-introductions article { display: grid; gap: 10px; border: 1px solid rgba(112,57,39,.14); border-radius: 16px; padding: 16px; background: #fffaf0; }
          .tim-ban-introductions small { color: #a24d31; }
          .tim-ban-introductions blockquote { margin: 0; border-left: 3px solid #d69763; padding-left: 12px; color: var(--tim-ban-muted); }
          .tim-ban-handoff { display: grid; gap: 11px; border-top: 1px solid rgba(112,57,39,.14); padding-top: 13px; }
          .tim-ban-handoff h4, .tim-ban-handoff p { margin: 0; }
          .tim-ban-handoff h4 { font-family: var(--cho-neo-font-display); font-size: 1.2rem; font-weight: 500; }
          .tim-ban-handoff > p, .tim-ban-handoff > small { color: var(--tim-ban-muted); font-size: .84rem; line-height: 1.5; }
          .tim-ban-contact-form { display: grid; grid-template-columns: minmax(120px, .45fr) minmax(200px, 1fr) auto; gap: 8px; }
          .tim-ban-contact-form select, .tim-ban-contact-form input { min-width: 0; border: 1px solid rgba(112,57,39,.2); border-radius: 11px; padding: 10px 11px; color: #54231d; background: #fffdf8; font: inherit; }
          .tim-ban-contact-form button { white-space: nowrap; }
          .tim-ban-contact-card { display: grid; gap: 4px; border: 1px solid rgba(112,57,39,.16); border-radius: 13px; padding: 12px 14px; background: #fffdf8; }
          .tim-ban-contact-card small { color: var(--tim-ban-muted); }
          .tim-ban-contact-card span { overflow-wrap: anywhere; }
          .tim-ban-my-contact { align-self: center; color: var(--tim-ban-muted); font-size: .86rem; overflow-wrap: anywhere; }

          .tim-ban-preview footer strong {
            color: var(--tim-ban-ink);
            font-family: var(--cho-neo-font-display);
            font-size: 1rem;
            font-weight: 500;
          }

          .tim-ban-preview footer span {
            max-width: 44rem;
            text-align: right;
          }

          @media (max-width: 760px) {
            .tim-ban-preview {
              padding: 14px;
            }

            .tim-ban-hero {
              margin-top: 12px;
            }

            .tim-ban-artwork {
              height: min(82vw, 390px);
              border-radius: 22px 22px 0 0;
            }

            .tim-ban-copy {
              grid-template-columns: 1fr;
              border-radius: 0 0 20px 20px;
              padding: 18px;
            }

            .tim-ban-copy .tim-ban-kicker,
            .tim-ban-copy h1,
            .tim-ban-copy .tim-ban-promise,
            .tim-ban-copy .tim-ban-boundary,
            .tim-ban-copy .tim-ban-actions {
              grid-column: 1;
              grid-row: auto;
            }

            .tim-ban-copy h1 {
              max-width: none;
              font-size: clamp(2rem, 9vw, 2.75rem);
            }

            .tim-ban-actions {
              display: grid;
            }

            .tim-ban-panel {
              margin-top: 32px;
              border-radius: 18px;
              padding: 18px;
            }

            .tim-ban-panel form,
            .tim-ban-location-grid,
            .tim-ban-professional-grid,
            .tim-ban-discovery {
              grid-template-columns: 1fr;
            }

            .tim-ban-panel form > * {
              grid-column: 1 / -1;
            }

            .tim-ban-contact-form {
              grid-template-columns: 1fr;
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
