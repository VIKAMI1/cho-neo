"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChoNeoGossipAvatar = {
  id: string;
  nameVi: string;
  nameEn: string;
  description: string;
  emoji: string;
  initials: string;
  tone: string;
};

const AVATAR_STORAGE_KEY = "choNeoGossipAvatarV1";
const AVATAR_PROFILE_STORAGE_KEY = "choNeoGossipAvatarProfileV1";

const AVATARS: ChoNeoGossipAvatar[] = [
  {
    id: "nail-tech",
    nameVi: "Thợ Nail",
    nameEn: "Nail Tech",
    description: "Skilled hands. Shop-floor wisdom.",
    emoji: "💅",
    initials: "TN",
    tone: "rose",
  },
  {
    id: "male-salon-owner",
    nameVi: "Chủ Tiệm Nam",
    nameEn: "Male Salon Owner",
    description: "Runs the shop. Carries the weight.",
    emoji: "☕",
    initials: "CT",
    tone: "amber",
  },
  {
    id: "nail-tech-guy",
    nameVi: "Thợ Nail Nam",
    nameEn: "Nail Tech Guy",
    description: "Skilled on the floor. Hands-on energy.",
    emoji: "🛠️",
    initials: "NN",
    tone: "teal",
  },
  {
    id: "gossip-cafe-regular",
    nameVi: "Khách Quen Quán Tám",
    nameEn: "Gossip Café Regular",
    description: "Warm, social, always around the table.",
    emoji: "🧋",
    initials: "KQ",
    tone: "gold",
  },
  {
    id: "show-off-gay",
    nameVi: "Người Có Gu",
    nameEn: "Show-Off Gay",
    description: "Playful confidence. Big energy. Proud.",
    emoji: "✨",
    initials: "GU",
    tone: "violet",
  },
  {
    id: "bling-bling-girl",
    nameVi: "Cô Lấp Lánh",
    nameEn: "Bling-Bling Girl",
    description: "Extra core. Beauty-forward.",
    emoji: "💎",
    initials: "LL",
    tone: "pink",
  },
  {
    id: "creative-soul",
    nameVi: "Tâm Hồn Sáng Tạo",
    nameEn: "Creative Soul",
    description: "Creative heart. Loves color, mood, and design.",
    emoji: "🎨",
    initials: "ST",
    tone: "cyan",
  },
  {
    id: "female-salon-owner",
    nameVi: "Chủ Tiệm Nữ",
    nameEn: "Female Salon Owner",
    description: "Leads with heart. Runs the shop.",
    emoji: "🌿",
    initials: "CN",
    tone: "green",
  },
];

export default function ChoNeoGossipAvatarPage() {
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATARS[0].id);
  const [saveNotice, setSaveNotice] = useState("");

  const selectedAvatar = useMemo(
    () =>
      AVATARS.find((avatar) => avatar.id === selectedAvatarId) ?? AVATARS[0],
    [selectedAvatarId]
  );

  useEffect(() => {
    try {
      const savedAvatarId = window.localStorage.getItem(AVATAR_STORAGE_KEY);

      if (savedAvatarId && AVATARS.some((avatar) => avatar.id === savedAvatarId)) {
        setSelectedAvatarId(savedAvatarId);
      }
    } catch {
      // Storage-restricted sessions can still choose for the current visit.
    }
  }, []);

  function saveSelectedAvatar() {
    try {
      window.localStorage.setItem(AVATAR_STORAGE_KEY, selectedAvatar.id);
      window.localStorage.setItem(
        AVATAR_PROFILE_STORAGE_KEY,
        JSON.stringify(selectedAvatar)
      );
      setSaveNotice("Đã chọn avatar. Vào Quán Tám thôi.");
    } catch {
      setSaveNotice("Đã chọn cho phiên này. Trình duyệt chưa cho lưu lâu dài.");
    }
  }

  return (
    <main className="avatar-page">
      <div className="avatar-glow" aria-hidden="true" />
      <section className="avatar-shell" aria-labelledby="avatar-title">
        <nav className="avatar-topbar" aria-label="Avatar page navigation">
          <Link href="/cho-neo/gossip">Về Quán Tám</Link>
          <span>Gossip Café Avatar V1</span>
        </nav>

        <header className="avatar-hero">
          <p>Chợ Neo / Quán Tám</p>
          <h1 id="avatar-title">Chọn mặt làng của bạn</h1>
          <p>
            Pick your village face. Đổi sau cũng được. Bạn thuộc về nơi này.
          </p>
        </header>

        <section className="avatar-grid" aria-label="Chợ Neo avatar choices">
          {AVATARS.map((avatar) => {
            const isSelected = avatar.id === selectedAvatarId;

            return (
              <button
                className={`avatar-card avatar-${avatar.tone} ${
                  isSelected ? "avatar-card-selected" : ""
                }`}
                key={avatar.id}
                onClick={() => {
                  setSelectedAvatarId(avatar.id);
                  setSaveNotice("");
                }}
                type="button"
              >
                <span className="avatar-check" aria-hidden="true">
                  {isSelected ? "✓" : ""}
                </span>
                <span className="avatar-portrait" aria-hidden="true">
                  <span>{avatar.emoji}</span>
                  <strong>{avatar.initials}</strong>
                </span>
                <span className="avatar-copy">
                  <strong>
                    {avatar.nameVi}
                    <span>{avatar.nameEn}</span>
                  </strong>
                  <small>{avatar.description}</small>
                </span>
              </button>
            );
          })}
        </section>

        <section className="avatar-action-panel" aria-live="polite">
          <div>
            <span className={`selected-token avatar-${selectedAvatar.tone}`}>
              {selectedAvatar.emoji}
            </span>
            <p>
              Đang chọn: <strong>{selectedAvatar.nameVi}</strong>
              <span>{selectedAvatar.nameEn}</span>
            </p>
          </div>
          <button type="button" onClick={saveSelectedAvatar}>
            Dùng avatar này
          </button>
          {saveNotice ? <p className="save-notice">{saveNotice}</p> : null}
          <Link className="back-link" href="/cho-neo/gossip">
            Về Quán Tám
          </Link>
        </section>
      </section>

      <style>{`
        .avatar-page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 20% 8%, rgba(251, 191, 36, 0.18), transparent 28%),
            radial-gradient(circle at 80% 16%, rgba(236, 72, 153, 0.16), transparent 26%),
            radial-gradient(circle at 52% 88%, rgba(45, 212, 191, 0.12), transparent 34%),
            linear-gradient(135deg, #050712 0%, #151023 42%, #271321 72%, #07050a 100%);
        }

        .avatar-glow {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.06), transparent 24%),
            radial-gradient(ellipse at 50% 0%, rgba(253, 230, 138, 0.16), transparent 38%);
        }

        .avatar-shell {
          position: relative;
          z-index: 1;
          width: min(1120px, calc(100% - 28px));
          margin: 0 auto;
          padding: 18px 0 28px;
        }

        .avatar-topbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .avatar-topbar a,
        .back-link {
          display: inline-flex;
          min-height: 38px;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 999px;
          padding: 0 14px;
          color: #fde68a;
          background: rgba(255, 247, 237, 0.08);
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
        }

        .avatar-topbar span {
          color: rgba(255, 247, 237, 0.58);
          font-size: 12px;
          font-weight: 850;
        }

        .avatar-hero {
          max-width: 760px;
          margin-bottom: 18px;
        }

        .avatar-hero p:first-child {
          margin: 0 0 9px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .avatar-hero h1 {
          margin: 0;
          font-size: clamp(36px, 8vw, 72px);
          line-height: 0.95;
          letter-spacing: -0.045em;
        }

        .avatar-hero p:last-child {
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: clamp(15px, 2vw, 19px);
          font-weight: 800;
          line-height: 1.4;
        }

        .avatar-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .avatar-card {
          position: relative;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          gap: 14px;
          align-items: center;
          min-height: 132px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 24px;
          padding: 14px;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 12%, var(--avatar-glow), transparent 34%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.1), rgba(255, 247, 237, 0.045)),
            rgba(13, 18, 32, 0.74);
          box-shadow:
            0 18px 48px rgba(0, 0, 0, 0.22),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .avatar-card:hover,
        .avatar-card:focus-visible,
        .avatar-card-selected {
          outline: none;
          border-color: rgba(253, 230, 138, 0.58);
          box-shadow:
            0 18px 48px rgba(0, 0, 0, 0.24),
            0 0 0 4px rgba(253, 230, 138, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .avatar-check {
          position: absolute;
          top: 12px;
          right: 12px;
          display: grid;
          place-items: center;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          font-weight: 950;
        }

        .avatar-card:not(.avatar-card-selected) .avatar-check {
          opacity: 0;
        }

        .avatar-portrait,
        .selected-token {
          display: grid;
          place-items: center;
          border: 1px solid rgba(255, 247, 237, 0.22);
          border-radius: 999px;
          background:
            radial-gradient(circle at 34% 22%, rgba(255, 247, 237, 0.36), transparent 28%),
            linear-gradient(135deg, var(--avatar-a), var(--avatar-b));
        }

        .avatar-portrait {
          width: 74px;
          height: 74px;
        }

        .avatar-portrait span {
          font-size: 28px;
        }

        .avatar-portrait strong {
          margin-top: -4px;
          color: rgba(17, 24, 39, 0.7);
          font-size: 11px;
          font-weight: 950;
        }

        .avatar-copy strong {
          display: block;
          color: #fff7ed;
          font-size: 18px;
          font-weight: 950;
          line-height: 1.05;
        }

        .avatar-copy strong span {
          display: block;
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.58);
          font-size: 12px;
          font-weight: 850;
        }

        .avatar-copy small {
          display: block;
          margin-top: 8px;
          color: rgba(255, 247, 237, 0.68);
          font-size: 13px;
          font-weight: 760;
          line-height: 1.35;
        }

        .avatar-action-panel {
          display: grid;
          gap: 12px;
          margin-top: 16px;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 26px;
          padding: 14px;
          background:
            radial-gradient(circle at 12% 0%, rgba(253, 230, 138, 0.14), transparent 30%),
            rgba(255, 247, 237, 0.075);
        }

        .avatar-action-panel > div {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .selected-token {
          width: 48px;
          height: 48px;
          flex: 0 0 auto;
          font-size: 22px;
        }

        .avatar-action-panel p {
          margin: 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: 14px;
          font-weight: 800;
          line-height: 1.3;
        }

        .avatar-action-panel p span {
          display: block;
          margin-top: 3px;
          color: rgba(255, 247, 237, 0.56);
          font-size: 12px;
        }

        .avatar-action-panel button {
          min-height: 44px;
          border: 0;
          border-radius: 999px;
          color: #111827;
          background: linear-gradient(180deg, #fde68a, #fbbf24);
          cursor: pointer;
          font-size: 14px;
          font-weight: 950;
        }

        .save-notice {
          color: #fde68a !important;
        }

        .avatar-rose {
          --avatar-a: #fda4af;
          --avatar-b: #fb7185;
          --avatar-glow: rgba(251, 113, 133, 0.32);
        }

        .avatar-amber {
          --avatar-a: #fde68a;
          --avatar-b: #f59e0b;
          --avatar-glow: rgba(245, 158, 11, 0.3);
        }

        .avatar-teal {
          --avatar-a: #99f6e4;
          --avatar-b: #14b8a6;
          --avatar-glow: rgba(20, 184, 166, 0.28);
        }

        .avatar-gold {
          --avatar-a: #fef3c7;
          --avatar-b: #fbbf24;
          --avatar-glow: rgba(251, 191, 36, 0.28);
        }

        .avatar-violet {
          --avatar-a: #ddd6fe;
          --avatar-b: #8b5cf6;
          --avatar-glow: rgba(139, 92, 246, 0.32);
        }

        .avatar-pink {
          --avatar-a: #fbcfe8;
          --avatar-b: #ec4899;
          --avatar-glow: rgba(236, 72, 153, 0.3);
        }

        .avatar-cyan {
          --avatar-a: #bae6fd;
          --avatar-b: #38bdf8;
          --avatar-glow: rgba(56, 189, 248, 0.28);
        }

        .avatar-green {
          --avatar-a: #bbf7d0;
          --avatar-b: #22c55e;
          --avatar-glow: rgba(34, 197, 94, 0.26);
        }

        @media (min-width: 680px) {
          .avatar-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .avatar-action-panel {
            grid-template-columns: minmax(0, 1fr) auto auto;
            align-items: center;
          }
        }

        @media (min-width: 1040px) {
          .avatar-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .avatar-card {
            grid-template-columns: 1fr;
            align-content: start;
            min-height: 238px;
          }

          .avatar-portrait {
            width: 86px;
            height: 86px;
          }
        }
      `}</style>
    </main>
  );
}
