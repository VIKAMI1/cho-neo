"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
} from "react";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";

const KHOE_SET_HERO_IMAGE = "/images/cho-neo/khoe-set-gallery-hero-v1.png";
const KHOE_SET_POSTS_KEY = "choNeoKhoeSetPostsV1";
const CAPTION_LIMIT = 180;
const KHOE_SET_FRAME_IMAGES = [
  {
    alt: "ARGENTIUM silver sparkle nail design",
    objectPosition: "center center",
    src: "/images/cho-neo/Reference%20image/Agardenofsparkle.JPG",
  },
  {
    alt: "ARGENTIUM chrome 3D nail design",
    objectPosition: "center center",
    src: "/images/cho-neo/Reference%20image/AgChrome3d.JPG",
  },
  {
    alt: "ARGENTIUM colorful geometric nail design",
    objectPosition: "center center",
    src: "/images/cho-neo/Reference%20image/AgColor.JPG",
  },
  {
    alt: "ARGENTIUM orange floral nail design",
    objectPosition: "center center",
    src: "/images/cho-neo/Reference%20image/AgOrange.JPG",
  },
  {
    alt: "ARGENTIUM barely there beautifully bold nail design",
    objectPosition: "center center",
    src: "/images/cho-neo/Reference%20image/BarelyThereBB.JPG",
  },
] as const;

const KHOE_SET_FRAME_SLOTS = [
  {
    className: "khoe-set-frame-slot-1",
    desktop: { height: "29%", left: "58.4%", top: "60.6%", width: "7.2%" },
    mobile: { height: "27.5%", left: "48.2%", top: "58.4%", width: "9%" },
    rotate: "1deg",
  },
  {
    className: "khoe-set-frame-slot-2",
    desktop: { height: "29%", left: "66.5%", top: "61%", width: "7.7%" },
    mobile: { height: "27.5%", left: "58.6%", top: "58.6%", width: "10%" },
    rotate: "2deg",
  },
  {
    className: "khoe-set-frame-slot-3",
    desktop: { height: "29%", left: "74.4%", top: "61.3%", width: "7.8%" },
    mobile: { height: "27.5%", left: "68.4%", top: "58.9%", width: "9.8%" },
    rotate: "2deg",
  },
  {
    className: "khoe-set-frame-slot-4",
    desktop: { height: "29%", left: "82.5%", top: "61.4%", width: "8%" },
    mobile: { height: "27.5%", left: "78.3%", top: "59.2%", width: "9.8%" },
    rotate: "3deg",
  },
  {
    className: "khoe-set-frame-slot-5",
    desktop: { height: "29%", left: "91%", top: "61.8%", width: "8.5%" },
    mobile: { height: "27.5%", left: "88.3%", top: "59.5%", width: "9.9%" },
    rotate: "4deg",
  },
] as const;

const KHOE_SET_CATEGORIES = [
  "Mới làm",
  "Khách thích",
  "Màu đẹp",
  "Trend",
  "Ý tưởng",
] as const;

type KhoeSetCategory = (typeof KHOE_SET_CATEGORIES)[number];

type KhoeSetPost = {
  id: string;
  category: KhoeSetCategory;
  caption: string;
  imageDataUrl?: string;
  createdAt: string;
};

type KhoeSetFrameSlot = (typeof KHOE_SET_FRAME_SLOTS)[number];
type KhoeSetFrameStyle = CSSProperties & Record<`--${string}`, string>;

const PROMPT_CHIPS = [
  "Set hôm nay khách mê lắm...",
  "Màu này lên tay đẹp bất ngờ...",
  "Một ý tưởng cho khách thích nhẹ nhàng...",
  "Trend này tiệm mình muốn thử...",
  "Khoe nhẹ một bộ mới làm...",
];

function readStoredPosts() {
  try {
    const stored = window.localStorage.getItem(KHOE_SET_POSTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Partial<KhoeSetPost>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((post): post is KhoeSetPost => {
        return Boolean(
          post.id &&
            post.caption &&
            post.category &&
            KHOE_SET_CATEGORIES.includes(post.category as KhoeSetCategory) &&
            post.createdAt,
        );
      })
      .slice(0, 24);
  } catch {
    return [];
  }
}

function formatPostTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Mới đăng";
  return new Intl.DateTimeFormat("vi", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getKhoeSetFrameStyle(slot: KhoeSetFrameSlot): KhoeSetFrameStyle {
  return {
    "--frame-height": slot.desktop.height,
    "--frame-left": slot.desktop.left,
    "--frame-mobile-height": slot.mobile.height,
    "--frame-mobile-left": slot.mobile.left,
    "--frame-mobile-top": slot.mobile.top,
    "--frame-mobile-width": slot.mobile.width,
    "--frame-rotate": slot.rotate,
    "--frame-top": slot.desktop.top,
    "--frame-width": slot.desktop.width,
  };
}

export default function ChoNeoShowOffPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<KhoeSetCategory>("Mới làm");
  const [caption, setCaption] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>();
  const [posts, setPosts] = useState<KhoeSetPost[]>([]);
  const [notice, setNotice] = useState("");
  const captionRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setPosts(readStoredPosts());
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KHOE_SET_POSTS_KEY, JSON.stringify(posts));
    } catch {
      // Local gallery posts are optional browser memory only.
    }
  }, [posts]);

  const filteredPosts = useMemo(
    () => posts.filter((post) => post.category === selectedCategory),
    [posts, selectedCategory],
  );

  function handlePromptClick(prompt: string) {
    setCaption((current) => {
      const trimmed = current.trim();
      return trimmed ? `${trimmed} ${prompt}` : `${prompt} `;
    });
    setNotice("");
    window.setTimeout(() => captionRef.current?.focus(), 0);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setNotice("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Chọn hình nail thôi nha.");
      return;
    }
    if (file.size > 1_500_000) {
      setNotice("Hình hơi nặng. Chọn ảnh dưới 1.5MB để giữ phòng nhẹ.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCaption = caption.trim();
    if (cleanCaption.length < 5) {
      setNotice("Viết thêm một chút cho mọi người hiểu set này nha.");
      captionRef.current?.focus();
      return;
    }

    const nextPost: KhoeSetPost = {
      id: `khoe-set-${Date.now()}`,
      category: selectedCategory,
      caption: cleanCaption.slice(0, CAPTION_LIMIT),
      imageDataUrl,
      createdAt: new Date().toISOString(),
    };

    setPosts((current) => [nextPost, ...current].slice(0, 24));
    setCaption("");
    setImageDataUrl(undefined);
    setNotice("Đã đặt set lên kệ Khoe Set.");
  }

  return (
    <main className="khoe-set-page">
      <ChoNeoTimeAmbience />

      <section className="khoe-set-shell" aria-labelledby="khoe-set-title">
        <header className="khoe-set-topbar">
          <Link className="soft-link" href="/cho-neo">
            <span>Về Sân Làng</span>
            <small>Back to Village</small>
          </Link>
          <Link className="soft-link" href="/cho-neo/gossip">
            <span>Qua Quán Tám</span>
            <small>Gossip Café</small>
          </Link>
        </header>

        <section className="khoe-set-hero">
          <Image
            src={KHOE_SET_HERO_IMAGE}
            alt="Khoe Set Đẹp bright nail inspiration salon corner"
            fill
            priority
            sizes="(max-width: 860px) 100vw, 1180px"
            className="khoe-set-hero-image"
          />
          <div className="khoe-set-frame-overlays" aria-label="ARGENTIUM table frame photos">
            {KHOE_SET_FRAME_IMAGES.map((frame, frameIndex) => (
              <span
                className={`khoe-set-frame ${KHOE_SET_FRAME_SLOTS[frameIndex].className}`}
                key={frame.src}
                style={getKhoeSetFrameStyle(KHOE_SET_FRAME_SLOTS[frameIndex])}
              >
                <img
                  src={frame.src}
                  alt={frame.alt}
                  style={{ objectPosition: frame.objectPosition }}
                />
              </span>
            ))}
          </div>
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-copy">
            <p>Khoe Set Đẹp</p>
            <h1 id="khoe-set-title">Khoe set mới, giữ vui cho làng.</h1>
            <span>
              Show fresh sets, pretty colors, client-loved designs, and small
              salon wins.
            </span>
          </div>
        </section>

        <section className="room-intro" aria-label="Giới thiệu Khoe Set">
          <div>
            <p className="section-kicker">Phòng Khoe Set</p>
            <h2>Đẹp thì khoe nhẹ. Ai thích thì học ý tưởng.</h2>
            <p>
              Một góc sáng để đăng set mới làm, màu khách mê, trend muốn thử,
              và những bộ móng khiến tiệm thấy tự hào.
            </p>
          </div>
        </section>

        <nav className="category-row" aria-label="Danh mục Khoe Set">
          {KHOE_SET_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={category === selectedCategory ? "active" : ""}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </nav>

        <section className="prompt-strip" aria-label="Gợi ý mở lời">
          <div>
            <p className="section-kicker">Gợi ý mở lời</p>
            <span>Nhấn một câu để bắt đầu caption.</span>
          </div>
          <div className="prompt-chips">
            {PROMPT_CHIPS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </section>

        <section className="khoe-set-board">
          <form className="composer-card" onSubmit={handleSubmit}>
            <div className="composer-heading">
              <div>
                <p className="section-kicker">Đặt set lên kệ</p>
                <h2>Caption ngắn thôi, hình đẹp nói tiếp.</h2>
              </div>
              <span>{caption.length}/{CAPTION_LIMIT}</span>
            </div>

            <div className="image-picker">
              {imageDataUrl ? (
                <img src={imageDataUrl} alt="Ảnh set nail đang chuẩn bị đăng" />
              ) : (
                <div>
                  <strong>Thêm hình set</strong>
                  <span>Ảnh nằm trên máy bạn, lưu tạm trong trình duyệt này.</span>
                </div>
              )}
              <label>
                Chọn ảnh
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
            </div>

            <textarea
              ref={captionRef}
              value={caption}
              maxLength={CAPTION_LIMIT}
              onChange={(event) => {
                setCaption(event.target.value);
                setNotice("");
              }}
              placeholder="Khoe nhẹ một bộ mới làm..."
            />

            <div className="composer-actions">
              <p>
                Không cần viết dài. Một màu, một cảm giác, một lý do khách
                thích là đủ.
              </p>
              <button type="submit">Đăng set</button>
            </div>
            {notice && <p className="notice">{notice}</p>}
          </form>

          <section className="feed-column" aria-label="Bài Khoe Set">
            <div className="feed-heading">
              <div>
                <p className="section-kicker">Set mới trong phòng</p>
                <h2>{selectedCategory}</h2>
              </div>
            </div>

            {filteredPosts.length > 0 ? (
              <div className="post-grid">
                {filteredPosts.map((post) => (
                  <article className="set-card" key={post.id}>
                    <div className="set-image">
                      {post.imageDataUrl ? (
                        <img src={post.imageDataUrl} alt="Set nail được chia sẻ" />
                      ) : (
                        <span>Set</span>
                      )}
                    </div>
                    <div className="set-copy">
                      <div>
                        <span>{post.category}</span>
                        <small>{formatPostTime(post.createdAt)}</small>
                      </div>
                      <p>{post.caption}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <strong>Chưa có set nào trong mục này.</strong>
                <span>
                  Khoe một bộ bạn thấy vui, một màu khách khen, hoặc một ý
                  tưởng muốn để dành cho tiệm.
                </span>
              </div>
            )}
          </section>
        </section>

        <section className="soft-rules" aria-label="Nếp phòng Khoe Set">
          <span>Khoe để vui, không chê tay nghề người khác.</span>
          <span>Không spam bán hàng.</span>
          <span>Giữ mặt khách riêng tư nếu ảnh có người.</span>
        </section>
      </section>

      <style>{`
        .khoe-set-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 20% 0%, rgba(255, 190, 194, 0.32), transparent 28rem),
            radial-gradient(circle at 86% 18%, rgba(253, 224, 138, 0.24), transparent 30rem),
            linear-gradient(180deg, #fff7ed 0%, #fdecef 48%, #fff8f2 100%);
          color: #401919;
        }

        .khoe-set-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: clamp(0.8rem, 2vw, 1.4rem);
        }

        .khoe-set-topbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          margin-bottom: 0.75rem;
        }

        .soft-link {
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          min-height: 42px;
          border: 1px solid rgba(148, 64, 39, 0.16);
          border-radius: 999px;
          padding: 0.48rem 0.82rem;
          color: #6f2b21;
          background: rgba(255, 255, 255, 0.74);
          text-decoration: none;
          box-shadow: 0 10px 26px rgba(127, 29, 29, 0.08);
        }

        .soft-link span {
          font-size: 0.8rem;
          font-weight: 950;
        }

        .soft-link small {
          color: rgba(83, 35, 31, 0.58);
          font-size: 0.66rem;
        }

        .khoe-set-hero {
          position: relative;
          min-height: clamp(280px, 42vw, 500px);
          overflow: hidden;
          border-radius: clamp(20px, 3vw, 34px);
          background: #fbe7df;
          box-shadow:
            0 24px 70px rgba(127, 29, 29, 0.16),
            inset 0 0 0 1px rgba(255, 255, 255, 0.62);
          isolation: isolate;
        }

        .khoe-set-hero-image {
          z-index: 0;
          object-fit: cover;
          object-position: center;
        }

        .khoe-set-frame-overlays {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
        }

        .khoe-set-frame {
          position: absolute;
          display: block;
          left: var(--frame-left);
          top: var(--frame-top);
          width: var(--frame-width);
          height: var(--frame-height);
          overflow: hidden;
          border-radius: 2px;
          background: #f8efe5;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.42),
            0 2px 6px rgba(92, 39, 27, 0.12);
          transform: rotate(var(--frame-rotate));
        }

        .khoe-set-frame img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(77, 24, 24, 0.5), rgba(77, 24, 24, 0.06) 48%, transparent),
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 244, 237, 0.18));
        }

        .hero-copy {
          position: relative;
          z-index: 3;
          width: min(520px, 92%);
          padding: clamp(1rem, 3vw, 2rem);
          color: #fff9f1;
          text-shadow: 0 8px 26px rgba(64, 16, 16, 0.32);
        }

        .hero-copy p,
        .hero-copy h1,
        .hero-copy span,
        .room-intro h2,
        .room-intro p,
        .section-kicker,
        .composer-heading h2,
        .feed-heading h2 {
          margin: 0;
        }

        .hero-copy p,
        .section-kicker {
          color: #ffe4ad;
          font-size: 0.72rem;
          font-weight: 950;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .hero-copy h1 {
          margin-top: 0.35rem;
          font-size: clamp(2.2rem, 6vw, 4.85rem);
          line-height: 0.95;
          text-wrap: balance;
        }

        .hero-copy span {
          display: block;
          max-width: 420px;
          margin-top: 0.72rem;
          color: rgba(255, 249, 241, 0.82);
          font-size: clamp(0.98rem, 1.55vw, 1.15rem);
          line-height: 1.5;
        }

        .room-intro,
        .prompt-strip,
        .composer-card,
        .feed-column,
        .soft-rules {
          border: 1px solid rgba(148, 64, 39, 0.11);
          background: rgba(255, 255, 255, 0.76);
          box-shadow: 0 18px 46px rgba(127, 29, 29, 0.08);
          backdrop-filter: blur(14px);
        }

        .room-intro {
          margin-top: 0.9rem;
          border-radius: 24px;
          padding: clamp(1rem, 2vw, 1.25rem);
        }

        .room-intro h2 {
          margin-top: 0.25rem;
          color: #4b1717;
          font-size: clamp(1.55rem, 3vw, 2.55rem);
          line-height: 1;
        }

        .room-intro p:not(.section-kicker) {
          max-width: 760px;
          margin-top: 0.55rem;
          color: rgba(64, 25, 25, 0.72);
          line-height: 1.55;
        }

        .category-row,
        .prompt-chips {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.1rem;
          scrollbar-width: none;
        }

        .category-row::-webkit-scrollbar,
        .prompt-chips::-webkit-scrollbar {
          display: none;
        }

        .category-row {
          margin-top: 0.85rem;
        }

        .category-row button,
        .prompt-chips button {
          flex: 0 0 auto;
          min-height: 42px;
          border: 1px solid rgba(148, 64, 39, 0.14);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.78);
          color: #6f2b21;
          font-weight: 900;
          cursor: pointer;
        }

        .category-row button {
          padding: 0 0.92rem;
        }

        .category-row button.active {
          border-color: transparent;
          color: #fff8f1;
          background: #b84b4a;
          box-shadow: 0 12px 28px rgba(184, 75, 74, 0.22);
        }

        .prompt-strip {
          display: grid;
          grid-template-columns: minmax(160px, 0.34fr) minmax(0, 1fr);
          gap: 0.9rem;
          align-items: center;
          margin-top: 0.75rem;
          border-radius: 22px;
          padding: 0.85rem;
        }

        .prompt-strip span {
          display: block;
          margin-top: 0.24rem;
          color: rgba(64, 25, 25, 0.58);
          font-size: 0.86rem;
        }

        .prompt-chips button {
          padding: 0 0.78rem;
          font-size: 0.86rem;
          white-space: nowrap;
        }

        .khoe-set-board {
          display: grid;
          grid-template-columns: minmax(300px, 0.82fr) minmax(0, 1.18fr);
          gap: 0.9rem;
          align-items: start;
          margin-top: 0.9rem;
        }

        .composer-card,
        .feed-column {
          border-radius: 26px;
          padding: clamp(0.9rem, 2vw, 1.1rem);
        }

        .composer-heading,
        .feed-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
        }

        .composer-heading h2,
        .feed-heading h2 {
          margin-top: 0.22rem;
          color: #4b1717;
          font-size: 1.45rem;
          line-height: 1.05;
        }

        .composer-heading > span {
          color: rgba(64, 25, 25, 0.48);
          font-size: 0.8rem;
          font-weight: 800;
        }

        .image-picker {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 0.7rem;
          align-items: center;
          margin-top: 0.85rem;
          border: 1px dashed rgba(148, 64, 39, 0.22);
          border-radius: 20px;
          padding: 0.65rem;
          background: rgba(255, 247, 237, 0.72);
        }

        .image-picker img,
        .set-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-picker img {
          min-height: 140px;
          border-radius: 16px;
        }

        .image-picker div {
          min-height: 98px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          border-radius: 16px;
          padding: 0.8rem;
          background:
            radial-gradient(circle at 30% 20%, rgba(251, 207, 232, 0.72), transparent 46%),
            linear-gradient(135deg, #fff7ed, #ffe4e6);
        }

        .image-picker strong,
        .image-picker span {
          display: block;
        }

        .image-picker strong {
          color: #4b1717;
        }

        .image-picker span {
          margin-top: 0.25rem;
          color: rgba(64, 25, 25, 0.6);
          font-size: 0.84rem;
          line-height: 1.35;
        }

        .image-picker label {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          border-radius: 999px;
          padding: 0 0.85rem;
          color: #fff8f1;
          background: #6f2b21;
          font-size: 0.84rem;
          font-weight: 950;
          cursor: pointer;
        }

        .image-picker input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        textarea {
          width: 100%;
          min-height: 112px;
          resize: vertical;
          margin-top: 0.75rem;
          border: 1px solid rgba(148, 64, 39, 0.14);
          border-radius: 20px;
          padding: 0.82rem;
          color: #401919;
          background: rgba(255, 255, 255, 0.82);
          font: inherit;
          line-height: 1.45;
          outline: none;
        }

        textarea:focus {
          border-color: rgba(184, 75, 74, 0.55);
          box-shadow: 0 0 0 4px rgba(251, 207, 232, 0.52);
        }

        .composer-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          margin-top: 0.75rem;
        }

        .composer-actions p,
        .notice {
          margin: 0;
          color: rgba(64, 25, 25, 0.58);
          font-size: 0.84rem;
          line-height: 1.35;
        }

        .composer-actions button {
          flex: 0 0 auto;
          min-height: 46px;
          border: 0;
          border-radius: 999px;
          padding: 0 1rem;
          color: #fff8f1;
          background: #b84b4a;
          font-weight: 950;
          cursor: pointer;
          box-shadow: 0 12px 28px rgba(184, 75, 74, 0.22);
        }

        .notice {
          margin-top: 0.65rem;
          color: #9f3a38;
          font-weight: 800;
        }

        .post-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.75rem;
          margin-top: 0.8rem;
        }

        .set-card {
          overflow: hidden;
          border: 1px solid rgba(148, 64, 39, 0.1);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 14px 34px rgba(127, 29, 29, 0.08);
        }

        .set-image {
          display: grid;
          place-items: center;
          aspect-ratio: 4 / 3;
          background:
            radial-gradient(circle at 40% 20%, rgba(251, 207, 232, 0.72), transparent 46%),
            linear-gradient(135deg, #fff7ed, #fed7aa);
          color: rgba(111, 43, 33, 0.5);
          font-weight: 950;
        }

        .set-copy {
          padding: 0.75rem;
        }

        .set-copy div {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.7rem;
        }

        .set-copy span {
          border-radius: 999px;
          padding: 0.24rem 0.48rem;
          color: #fff8f1;
          background: #b84b4a;
          font-size: 0.72rem;
          font-weight: 900;
        }

        .set-copy small {
          color: rgba(64, 25, 25, 0.5);
          font-weight: 800;
        }

        .set-copy p {
          margin: 0.6rem 0 0;
          color: #401919;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }

        .empty-state {
          display: grid;
          gap: 0.4rem;
          margin-top: 0.8rem;
          border: 1px dashed rgba(148, 64, 39, 0.18);
          border-radius: 22px;
          padding: 1rem;
          background: rgba(255, 247, 237, 0.7);
        }

        .empty-state strong {
          color: #4b1717;
          font-size: 1.15rem;
        }

        .empty-state span {
          color: rgba(64, 25, 25, 0.62);
          line-height: 1.5;
        }

        .soft-rules {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.9rem;
          border-radius: 999px;
          padding: 0.65rem;
        }

        .soft-rules span {
          border-radius: 999px;
          padding: 0.35rem 0.62rem;
          color: rgba(64, 25, 25, 0.68);
          background: rgba(255, 247, 237, 0.72);
          font-size: 0.8rem;
          font-weight: 800;
        }

        @media (max-width: 900px) {
          .khoe-set-board,
          .prompt-strip {
            grid-template-columns: 1fr;
          }

          .post-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .khoe-set-shell {
            padding: 0.7rem;
          }

          .khoe-set-topbar {
            justify-content: flex-start;
          }

          .soft-link {
            flex: 1 1 150px;
          }

          .khoe-set-hero {
            min-height: 300px;
          }

          .khoe-set-hero-image {
            object-position: 58% 50%;
          }

          .khoe-set-frame {
            left: var(--frame-mobile-left);
            top: var(--frame-mobile-top);
            width: var(--frame-mobile-width);
            height: var(--frame-mobile-height);
          }

          .hero-shade {
            background:
              linear-gradient(180deg, rgba(77, 24, 24, 0.52), rgba(77, 24, 24, 0.08) 58%, rgba(255, 244, 237, 0.15)),
              linear-gradient(90deg, rgba(77, 24, 24, 0.2), transparent);
          }

          .hero-copy {
            width: 100%;
            padding: 1rem;
          }

          .hero-copy h1 {
            font-size: clamp(2rem, 11vw, 3rem);
          }

          .image-picker,
          .composer-actions {
            grid-template-columns: 1fr;
            flex-direction: column;
            align-items: stretch;
          }

          .image-picker label,
          .composer-actions button {
            width: 100%;
          }

          .soft-rules {
            border-radius: 22px;
          }
        }
      `}</style>
    </main>
  );
}
