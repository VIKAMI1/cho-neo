"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ChoNeoAvatar = {
  id: string;
  nameVi: string;
  nameEn: string;
  description: string;
  src: string;
  tone: string;
};

type ChoNeoAvatarProfile = {
  avatarId: string;
  avatarSrc: string;
  nickname: string;
  mood: string;
  updatedAt: string;
};

const AVATAR_PROFILE_STORAGE_KEY = "choNeoAvatarProfile";
const LEGACY_GOSSIP_AVATAR_STORAGE_KEY = "choNeoGossipAvatarV1";
const LEGACY_GOSSIP_AVATAR_PROFILE_STORAGE_KEY = "choNeoGossipAvatarProfileV1";

const AVATARS: ChoNeoAvatar[] = [
  {
    id: "nail-tech",
    nameVi: "Thợ Nail",
    nameEn: "Nail Tech",
    description: "Skilled hands. Shop-floor wisdom.",
    src: "/images/cho-neo/avatars/nail-tech-girl.png",
    tone: "rose",
  },
  {
    id: "male-salon-owner",
    nameVi: "Chủ Tiệm Nam",
    nameEn: "Male Salon Owner",
    description: "Runs the shop. Carries the weight.",
    src: "/images/cho-neo/avatars/salon-owner-male.png",
    tone: "amber",
  },
  {
    id: "nail-tech-guy",
    nameVi: "Thợ Nail Nam",
    nameEn: "Nail Tech Guy",
    description: "Skilled on the floor. Hands-on energy.",
    src: "/images/cho-neo/avatars/nail-tech-guy.png",
    tone: "teal",
  },
  {
    id: "gossip-cafe-regular",
    nameVi: "Khách Quen Quán Tám",
    nameEn: "Gossip Café Regular",
    description: "Warm, social, always around the table.",
    src: "/images/cho-neo/avatars/gossip-cafe-regular.png",
    tone: "gold",
  },
  {
    id: "show-off-gay",
    nameVi: "Người Có Gu",
    nameEn: "Show-Off Gay",
    description: "Playful confidence. Big energy. Proud.",
    src: "/images/cho-neo/avatars/show-off-guy.png",
    tone: "violet",
  },
  {
    id: "bling-bling-girl",
    nameVi: "Cô Lấp Lánh",
    nameEn: "Bling-Bling Girl",
    description: "Extra core. Beauty-forward.",
    src: "/images/cho-neo/avatars/bling-bling-girl.png",
    tone: "pink",
  },
  {
    id: "creative-soul",
    nameVi: "Tâm Hồn Sáng Tạo",
    nameEn: "Creative Soul",
    description: "Creative heart. Loves color, mood, and design.",
    src: "/images/cho-neo/avatars/creative-soul.png",
    tone: "cyan",
  },
  {
    id: "female-salon-owner",
    nameVi: "Chủ Tiệm Nữ",
    nameEn: "Female Salon Owner",
    description: "Leads with heart. Runs the shop.",
    src: "/images/cho-neo/avatars/salon-owner-female.png",
    tone: "green",
  },
];

const MOODS = [
  "Nhẹ nhàng",
  "Vui vui",
  "Muốn tám chút",
  "Đi ngang ghé chơi",
  "Cần yên một chút",
];

const GOSSIP_AVATAR_ID_TO_PASSPORT_ID: Record<string, string> = {
  "auntie-owner": "female-salon-owner",
  "front-counter-pro": "male-salon-owner",
  "golden-scissors": "creative-soul",
  "gossip-auntie": "gossip-cafe-regular",
  "salon-queen": "bling-bling-girl",
  "uncle-coffee": "gossip-cafe-regular",
  "weekend-warrior": "show-off-gay",
  "young-nail-tech": "nail-tech",
};

export default function ChoNeoAvatarPage() {
  const [selectedAvatarId, setSelectedAvatarId] = useState(AVATARS[0].id);
  const [nickname, setNickname] = useState("");
  const [mood, setMood] = useState(MOODS[0]);
  const [saveNotice, setSaveNotice] = useState("");

  const selectedAvatar = useMemo(
    () =>
      AVATARS.find((avatar) => avatar.id === selectedAvatarId) ?? AVATARS[0],
    [selectedAvatarId]
  );

  const previewName = nickname.trim() || "Người Ghé Chợ";
  const previewMood = mood.trim() || "Nhẹ nhàng";

  useEffect(() => {
    try {
      const savedProfile =
        window.localStorage.getItem(AVATAR_PROFILE_STORAGE_KEY) ??
        migrateLegacyGossipAvatarProfile();

      if (!savedProfile) {
        return;
      }

      const parsedProfile = JSON.parse(savedProfile) as Partial<ChoNeoAvatarProfile>;
      const savedAvatarId =
        typeof parsedProfile.avatarId === "string"
          ? GOSSIP_AVATAR_ID_TO_PASSPORT_ID[parsedProfile.avatarId] ??
            parsedProfile.avatarId
          : "";
      const savedAvatar = AVATARS.find((avatar) => avatar.id === savedAvatarId);

      if (savedAvatar) {
        setSelectedAvatarId(savedAvatar.id);
      }

      if (typeof parsedProfile.nickname === "string") {
        setNickname(parsedProfile.nickname);
      }

      if (typeof parsedProfile.mood === "string") {
        setMood(parsedProfile.mood);
      }
    } catch {
      // Storage-restricted sessions can still use the page for this visit.
    }
  }, []);

  function saveProfile() {
    const profile: ChoNeoAvatarProfile = {
      avatarId: selectedAvatar.id,
      avatarSrc: selectedAvatar.src,
      nickname: previewName,
      mood: previewMood,
      updatedAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(
        AVATAR_PROFILE_STORAGE_KEY,
        JSON.stringify(profile)
      );
      setSaveNotice("Đã lưu dáng này. Vào Quán Tám thôi.");
    } catch {
      setSaveNotice("Đã chọn cho phiên này. Trình duyệt chưa cho lưu lâu dài.");
    }
  }

  return (
    <main className="avatar-page">
      <div className="market-light" aria-hidden="true" />
      <section className="avatar-shell" aria-labelledby="avatar-title">
        <nav className="avatar-topbar" aria-label="Chợ Neo avatar navigation">
          <Link href="/cho-neo">Về Sân Làng</Link>
          <Link href="/cho-neo/gossip">Vào Quán Tám</Link>
        </nav>

        <header className="avatar-hero">
          <p>Chợ Neo Passport</p>
          <h1 id="avatar-title">Chọn Dáng Vào Chợ</h1>
          <p>Chọn một dáng nhỏ để bạn bước vào Chợ Neo nhẹ nhàng hơn.</p>
        </header>

        <div className="avatar-layout">
          <section className="preview-card" aria-label="Avatar preview">
            <div className={`preview-portrait avatar-${selectedAvatar.tone}`}>
              <Image
                alt={`${selectedAvatar.nameVi} / ${selectedAvatar.nameEn}`}
                height={360}
                priority
                src={selectedAvatar.src}
                width={360}
              />
            </div>
            <div className="preview-copy">
              <span>Đang mang dáng</span>
              <h2>{previewName}</h2>
              <p>{previewMood}</p>
              <small>
                {selectedAvatar.nameVi} / {selectedAvatar.nameEn}
              </small>
            </div>
          </section>

          <section className="setup-card" aria-label="Avatar setup">
            <div className="field-group">
              <label htmlFor="nickname">Tên hiển thị</label>
              <input
                id="nickname"
                maxLength={32}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setSaveNotice("");
                }}
                placeholder="Ví dụ: Cô Ba, Anh Thợ Mới, Người Ghé Chợ"
                type="text"
                value={nickname}
              />
            </div>

            <div className="field-group">
              <label htmlFor="mood">Hôm nay bạn vào chợ với tâm trạng nào?</label>
              <input
                id="mood"
                maxLength={48}
                onChange={(event) => {
                  setMood(event.target.value);
                  setSaveNotice("");
                }}
                type="text"
                value={mood}
              />
              <div className="mood-row" aria-label="Mood suggestions">
                {MOODS.map((suggestedMood) => (
                  <button
                    className={suggestedMood === mood ? "mood-selected" : ""}
                    key={suggestedMood}
                    onClick={() => {
                      setMood(suggestedMood);
                      setSaveNotice("");
                    }}
                    type="button"
                  >
                    {suggestedMood}
                  </button>
                ))}
              </div>
            </div>

            <div className="action-row">
              <button type="button" onClick={saveProfile}>
                Lưu dáng này
              </button>
              <Link href="/cho-neo/gossip">Vào Quán Tám</Link>
            </div>

            {saveNotice ? <p className="save-notice">{saveNotice}</p> : null}
          </section>
        </div>

        <section className="avatar-picker" aria-label="Choose avatar">
          {AVATARS.map((avatar) => {
            const isSelected = avatar.id === selectedAvatar.id;

            return (
              <button
                aria-pressed={isSelected}
                className={`avatar-tile avatar-${avatar.tone} ${
                  isSelected ? "avatar-tile-selected" : ""
                }`}
                key={avatar.id}
                onClick={() => {
                  setSelectedAvatarId(avatar.id);
                  setSaveNotice("");
                }}
                type="button"
              >
                <span className="avatar-image-wrap">
                  <Image
                    alt=""
                    aria-hidden="true"
                    height={220}
                    src={avatar.src}
                    width={220}
                  />
                </span>
                <span className="avatar-name">
                  <strong>{avatar.nameVi}</strong>
                  <small>{avatar.nameEn}</small>
                </span>
                <span className="avatar-description">{avatar.description}</span>
                <span className="selected-mark" aria-hidden="true">
                  {isSelected ? "✓" : ""}
                </span>
              </button>
            );
          })}
        </section>
      </section>

      <style>{`
        .avatar-page {
          position: relative;
          min-height: 100vh;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 18% 10%, rgba(251, 191, 36, 0.22), transparent 30%),
            radial-gradient(circle at 82% 18%, rgba(244, 114, 182, 0.16), transparent 30%),
            radial-gradient(circle at 50% 100%, rgba(45, 212, 191, 0.12), transparent 38%),
            linear-gradient(145deg, #050713 0%, #13111f 40%, #241426 72%, #09060c 100%);
        }

        .market-light {
          position: fixed;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.08), transparent 22%),
            radial-gradient(ellipse at 50% -8%, rgba(253, 230, 138, 0.16), transparent 38%);
        }

        .avatar-shell {
          position: relative;
          z-index: 1;
          width: min(1180px, calc(100% - 28px));
          margin: 0 auto;
          padding: 18px 0 34px;
        }

        .avatar-topbar {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 18px;
        }

        .avatar-topbar a,
        .action-row a,
        .action-row button {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 0 16px;
          font-size: 13px;
          font-weight: 950;
          text-decoration: none;
        }

        .avatar-topbar a,
        .action-row a {
          border: 1px solid rgba(253, 230, 138, 0.22);
          color: #fde68a;
          background: rgba(255, 247, 237, 0.08);
        }

        .avatar-hero {
          max-width: 720px;
          margin-bottom: 18px;
        }

        .avatar-hero p:first-child {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .avatar-hero h1 {
          margin: 0;
          font-size: clamp(38px, 8vw, 76px);
          line-height: 0.92;
          letter-spacing: -0.04em;
        }

        .avatar-hero p:last-child {
          margin: 12px 0 0;
          color: rgba(255, 247, 237, 0.76);
          font-size: clamp(15px, 2vw, 20px);
          font-weight: 800;
          line-height: 1.42;
        }

        .avatar-layout {
          display: grid;
          gap: 14px;
          margin-bottom: 14px;
        }

        .preview-card,
        .setup-card,
        .avatar-tile {
          border: 1px solid rgba(253, 230, 138, 0.17);
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.1), rgba(255, 247, 237, 0.045)),
            rgba(9, 13, 26, 0.78);
          box-shadow:
            0 20px 54px rgba(0, 0, 0, 0.26),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(12px);
        }

        .preview-card {
          display: grid;
          grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
          gap: 14px;
          align-items: center;
          border-radius: 30px;
          padding: 14px;
        }

        .preview-portrait {
          position: relative;
          overflow: hidden;
          aspect-ratio: 1;
          border-radius: 28px;
          background:
            radial-gradient(circle at 36% 14%, rgba(255, 247, 237, 0.36), transparent 28%),
            radial-gradient(circle at 70% 78%, var(--avatar-glow), transparent 36%),
            linear-gradient(135deg, var(--avatar-a), var(--avatar-b));
        }

        .preview-portrait img,
        .avatar-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-copy span,
        .preview-copy small {
          display: block;
          color: rgba(255, 247, 237, 0.58);
          font-size: 12px;
          font-weight: 900;
        }

        .preview-copy h2 {
          margin: 6px 0;
          color: #fff7ed;
          font-size: clamp(26px, 5vw, 44px);
          line-height: 0.98;
          letter-spacing: -0.035em;
        }

        .preview-copy p {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 15px;
          font-weight: 950;
          line-height: 1.25;
        }

        .setup-card {
          display: grid;
          gap: 14px;
          border-radius: 30px;
          padding: 16px;
        }

        .field-group {
          display: grid;
          gap: 9px;
        }

        .field-group label {
          color: #fff7ed;
          font-size: 13px;
          font-weight: 950;
        }

        .field-group input {
          min-height: 46px;
          width: 100%;
          border: 1px solid rgba(253, 230, 138, 0.2);
          border-radius: 16px;
          padding: 0 13px;
          color: #fff7ed;
          background: rgba(255, 247, 237, 0.08);
          font: inherit;
          font-size: 14px;
          font-weight: 760;
          outline: none;
        }

        .field-group input::placeholder {
          color: rgba(255, 247, 237, 0.46);
        }

        .field-group input:focus {
          border-color: rgba(253, 230, 138, 0.62);
          box-shadow: 0 0 0 4px rgba(253, 230, 138, 0.11);
        }

        .mood-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mood-row button {
          min-height: 36px;
          border: 1px solid rgba(255, 247, 237, 0.14);
          border-radius: 999px;
          padding: 0 12px;
          color: rgba(255, 247, 237, 0.76);
          background: rgba(255, 247, 237, 0.07);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
        }

        .mood-row .mood-selected {
          border-color: rgba(253, 230, 138, 0.54);
          color: #111827;
          background: #fde68a;
        }

        .action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .action-row button {
          border: 0;
          color: #111827;
          background: linear-gradient(180deg, #fde68a, #f59e0b);
          cursor: pointer;
        }

        .save-notice {
          margin: 0;
          color: #fde68a;
          font-size: 13px;
          font-weight: 900;
          line-height: 1.35;
        }

        .avatar-picker {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .avatar-tile {
          position: relative;
          display: grid;
          grid-template-columns: 82px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          min-height: 120px;
          border-radius: 24px;
          padding: 12px;
          color: #fff7ed;
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .avatar-tile:hover,
        .avatar-tile:focus-visible,
        .avatar-tile-selected {
          outline: none;
          border-color: rgba(253, 230, 138, 0.62);
          box-shadow:
            0 20px 54px rgba(0, 0, 0, 0.26),
            0 0 0 4px rgba(253, 230, 138, 0.12),
            inset 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .avatar-image-wrap {
          overflow: hidden;
          width: 82px;
          height: 82px;
          border: 1px solid rgba(255, 247, 237, 0.22);
          border-radius: 999px;
          background:
            radial-gradient(circle at 34% 22%, rgba(255, 247, 237, 0.32), transparent 28%),
            linear-gradient(135deg, var(--avatar-a), var(--avatar-b));
        }

        .avatar-name {
          display: block;
          min-width: 0;
        }

        .avatar-name strong,
        .avatar-name small,
        .avatar-description {
          display: block;
        }

        .avatar-name strong {
          color: #fff7ed;
          font-size: 17px;
          font-weight: 950;
          line-height: 1.05;
        }

        .avatar-name small {
          margin-top: 4px;
          color: rgba(255, 247, 237, 0.58);
          font-size: 12px;
          font-weight: 850;
        }

        .avatar-description {
          grid-column: 2;
          margin-top: -26px;
          color: rgba(255, 247, 237, 0.66);
          font-size: 12px;
          font-weight: 760;
          line-height: 1.34;
        }

        .selected-mark {
          position: absolute;
          top: 10px;
          right: 10px;
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 999px;
          color: #111827;
          background: #fde68a;
          font-size: 14px;
          font-weight: 950;
        }

        .avatar-tile:not(.avatar-tile-selected) .selected-mark {
          opacity: 0;
        }

        .avatar-rose {
          --avatar-a: #fda4af;
          --avatar-b: #fb7185;
          --avatar-glow: rgba(251, 113, 133, 0.34);
        }

        .avatar-amber {
          --avatar-a: #fde68a;
          --avatar-b: #f59e0b;
          --avatar-glow: rgba(245, 158, 11, 0.32);
        }

        .avatar-teal {
          --avatar-a: #99f6e4;
          --avatar-b: #14b8a6;
          --avatar-glow: rgba(20, 184, 166, 0.3);
        }

        .avatar-gold {
          --avatar-a: #fef3c7;
          --avatar-b: #fbbf24;
          --avatar-glow: rgba(251, 191, 36, 0.3);
        }

        .avatar-violet {
          --avatar-a: #ddd6fe;
          --avatar-b: #8b5cf6;
          --avatar-glow: rgba(139, 92, 246, 0.34);
        }

        .avatar-pink {
          --avatar-a: #fbcfe8;
          --avatar-b: #ec4899;
          --avatar-glow: rgba(236, 72, 153, 0.32);
        }

        .avatar-cyan {
          --avatar-a: #bae6fd;
          --avatar-b: #38bdf8;
          --avatar-glow: rgba(56, 189, 248, 0.3);
        }

        .avatar-green {
          --avatar-a: #bbf7d0;
          --avatar-b: #22c55e;
          --avatar-glow: rgba(34, 197, 94, 0.28);
        }

        @media (max-width: 520px) {
          .preview-card {
            grid-template-columns: 112px minmax(0, 1fr);
            border-radius: 24px;
          }

          .preview-portrait {
            border-radius: 22px;
          }

          .avatar-description {
            margin-top: -20px;
          }
        }

        @media (min-width: 760px) {
          .avatar-layout {
            grid-template-columns: minmax(320px, 0.86fr) minmax(0, 1.14fr);
          }

          .avatar-picker {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1120px) {
          .avatar-picker {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .avatar-tile {
            grid-template-columns: 1fr;
            align-content: start;
            min-height: 310px;
          }

          .avatar-image-wrap {
            width: 100%;
            height: auto;
            aspect-ratio: 1;
            border-radius: 22px;
          }

          .avatar-description {
            grid-column: auto;
            margin-top: 0;
          }
        }
      `}</style>
    </main>
  );
}

function migrateLegacyGossipAvatarProfile() {
  const legacyProfile = window.localStorage.getItem(
    LEGACY_GOSSIP_AVATAR_PROFILE_STORAGE_KEY
  );
  const legacyAvatarId =
    legacyProfile ? null : window.localStorage.getItem(LEGACY_GOSSIP_AVATAR_STORAGE_KEY);

  if (!legacyProfile && !legacyAvatarId) {
    return null;
  }

  try {
    const parsedProfile = legacyProfile
      ? (JSON.parse(legacyProfile) as { id?: string })
      : null;
    const avatarId = parsedProfile?.id ?? legacyAvatarId ?? AVATARS[0].id;
    const selectedAvatar =
      AVATARS.find((avatar) => avatar.id === avatarId) ?? AVATARS[0];
    const migratedProfile: ChoNeoAvatarProfile = {
      avatarId: selectedAvatar.id,
      avatarSrc: selectedAvatar.src,
      mood: MOODS[0],
      nickname: "Người Ghé Chợ",
      updatedAt: new Date().toISOString(),
    };
    const serializedProfile = JSON.stringify(migratedProfile);

    window.localStorage.setItem(AVATAR_PROFILE_STORAGE_KEY, serializedProfile);
    window.localStorage.removeItem(LEGACY_GOSSIP_AVATAR_STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_GOSSIP_AVATAR_PROFILE_STORAGE_KEY);

    return serializedProfile;
  } catch {
    return null;
  }
}
