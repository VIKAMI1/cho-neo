"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ChoNeoRoomShell } from "@/components/cho-neo/ChoNeoRoomShell";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";
import { GalleryGrid } from "@/components/cho-neo/show-off/GalleryGrid";
import { GallerySearch } from "@/components/cho-neo/show-off/GallerySearch";
import { RoomArtwork } from "@/components/cho-neo/show-off/RoomArtwork";
import { UploadPanel } from "@/components/cho-neo/show-off/UploadPanel";
import {
  KHOE_SET_CATEGORIES,
  type KhoeSetCategory,
  type KhoeSetPost,
  type RoomArtworkConfig,
} from "@/components/cho-neo/show-off/types";

const RENDER_KHOE_SET_FRAME_OVERLAYS = false;
const KHOE_SET_POSTS_KEY = "choNeoKhoeSetPostsV1";
const CAPTION_LIMIT = 180;
const DEFAULT_CREATOR_NAME = "Nail Artist";

const ROOM_ARTWORK: RoomArtworkConfig = {
  src: "/images/cho-neo/Reference%20image/Khoe-Set-Room.png",
  alt: "Phòng Trưng Bày boutique nail studio with warm sunlight, flowers, marble table, color wheels, and framed nail displays",
  objectPosition: "center center",
  aspectRatio: "16 / 5.2",
  caption: "Không gian tham khảo của Phòng Trưng Bày",
};

const UPLOAD_CATEGORIES = KHOE_SET_CATEGORIES.filter(
  (category) => category !== "Mới nhất",
) as KhoeSetCategory[];

const PROMPT_CHIPS = [
  "Set hôm nay khách mê lắm...",
  "Màu này lên tay đẹp bất ngờ...",
  "Một ý tưởng cho khách thích nhẹ nhàng...",
  "Chi tiết hoa nhỏ làm bộ này mềm hơn...",
  "Khoe một góc màu mới của tiệm...",
];

type LegacyKhoeSetPost = Partial<KhoeSetPost> & {
  category?: string;
  imageDataUrl?: string;
};

function normalizeCategory(value?: string): KhoeSetCategory {
  if (value === "Mới làm") return "Mới nhất";
  if (value === "Khách thích") return "Khách mê";
  if (value === "Trend") return "Xu hướng";
  if (KHOE_SET_CATEGORIES.includes(value as KhoeSetCategory)) {
    return value as KhoeSetCategory;
  }
  return "Mới nhất";
}

function parseStyleTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function normalizePost(post: LegacyKhoeSetPost): KhoeSetPost | null {
  if (!post.id || !post.caption || !post.createdAt) return null;

  return {
    id: post.id,
    category: normalizeCategory(post.category),
    caption: post.caption,
    imageDataUrl: post.imageDataUrl,
    createdAt: post.createdAt,
    creatorName: post.creatorName?.trim() || DEFAULT_CREATOR_NAME,
    creatorAvatar: post.creatorAvatar,
    styleTags: Array.isArray(post.styleTags)
      ? post.styleTags.filter(Boolean).slice(0, 4)
      : [],
  };
}

function readStoredPosts() {
  try {
    const stored = window.localStorage.getItem(KHOE_SET_POSTS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as LegacyKhoeSetPost[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizePost)
      .filter((post): post is KhoeSetPost => Boolean(post))
      .slice(0, 36);
  } catch {
    return [];
  }
}

function getSearchText(post: KhoeSetPost) {
  return [
    post.caption,
    post.category,
    post.creatorName,
    ...post.styleTags,
  ]
    .join(" ")
    .toLowerCase();
}

export default function ChoNeoShowOffPage() {
  const [selectedCategory, setSelectedCategory] =
    useState<KhoeSetCategory>("Mới nhất");
  const [composerCategory, setComposerCategory] =
    useState<KhoeSetCategory>("Khách mê");
  const [query, setQuery] = useState("");
  const [caption, setCaption] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [styleTagsText, setStyleTagsText] = useState("");
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

  const visiblePosts = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return posts.filter((post) => {
      const categoryMatch =
        selectedCategory === "Mới nhất" || post.category === selectedCategory;
      const queryMatch = cleanQuery ? getSearchText(post).includes(cleanQuery) : true;
      return categoryMatch && queryMatch;
    });
  }, [posts, query, selectedCategory]);

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
      category: composerCategory,
      caption: cleanCaption.slice(0, CAPTION_LIMIT),
      imageDataUrl,
      createdAt: new Date().toISOString(),
      creatorName: creatorName.trim() || DEFAULT_CREATOR_NAME,
      styleTags: parseStyleTags(styleTagsText),
    };

    setPosts((current) => [nextPost, ...current].slice(0, 36));
    setCaption("");
    setStyleTagsText("");
    setImageDataUrl(undefined);
    setSelectedCategory("Mới nhất");
    setNotice("Đã đặt bộ móng lên tường trưng bày.");
  }

  return (
    <ChoNeoRoomShell className="show-off-page" currentNavId="show-off">
      <ChoNeoTimeAmbience />

      <section className="show-off-shell" aria-labelledby="show-off-title">
        <section className="show-off-main">
          <header className="show-off-topbar">
            <GallerySearch value={query} onChange={setQuery} />
            <a className="show-off-mobile-post-link" href="#dang-bo-mong">
              + Đăng bộ móng
            </a>
          </header>

          <div className="show-off-room-layout">
            <section className="show-off-gallery-stack">
              <section className="show-off-hero">
                <RoomArtwork artwork={ROOM_ARTWORK} />
                <div className="show-off-hero-copy">
                  <p>Phòng Trưng Bày</p>
                  <h1 id="show-off-title">Khoe bộ móng mới, giữ lại màu đẹp và ý tưởng khách mê.</h1>
                  <span>
                    Một góc nhẹ để người làm nail lưu tác phẩm, kể vài chữ về
                    màu, kiểu, và cảm hứng phía sau mỗi bộ móng.
                  </span>
                  <a href="#dang-bo-mong">
                    <strong>+</strong>
                    Đăng bộ móng
                  </a>
                </div>
              </section>

              <nav className="show-off-category-row" aria-label="Danh mục Phòng Trưng Bày">
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

              <GalleryGrid posts={visiblePosts} totalCount={posts.length} query={query} />
            </section>

            <UploadPanel
              caption={caption}
              captionLimit={CAPTION_LIMIT}
              captionRef={captionRef}
              categoryOptions={UPLOAD_CATEGORIES}
              creatorName={creatorName}
              imageDataUrl={imageDataUrl}
              notice={notice}
              promptChips={PROMPT_CHIPS}
              selectedCategory={composerCategory}
              styleTagsText={styleTagsText}
              onCaptionChange={(value) => {
                setCaption(value);
                setNotice("");
              }}
              onCategoryChange={setComposerCategory}
              onCreatorNameChange={setCreatorName}
              onImageChange={handleImageChange}
              onPromptClick={handlePromptClick}
              onStyleTagsChange={setStyleTagsText}
              onSubmit={handleSubmit}
            />
          </div>
        </section>
      </section>

      <style>{`
        .show-off-page,
        .show-off-page * {
          box-sizing: border-box;
        }

        .show-off-page {
          min-height: 100vh;
          overflow-x: hidden;
          color: #4a1b24;
          background:
            linear-gradient(90deg, rgba(251, 232, 229, 0.78), transparent 12rem),
            linear-gradient(180deg, #fffaf6 0%, #fdeceb 54%, #fff7f0 100%);
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .show-off-shell {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          min-height: 100vh;
          margin: 0;
          overflow-x: hidden;
          padding: 0;
        }

        .show-off-nav {
          position: sticky;
          top: 0;
          align-self: start;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
          min-height: 100vh;
          border-right: 1px solid rgba(129, 54, 66, 0.1);
          padding: 1.5rem 0.9rem;
          background: rgba(255, 250, 247, 0.7);
          backdrop-filter: blur(18px);
        }

        .show-off-brand {
          color: #5b2029;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.7rem;
          font-style: italic;
          text-decoration: none;
        }

        .show-off-nav nav {
          display: grid;
          gap: 0.55rem;
        }

        .show-off-nav nav a {
          display: flex;
          flex-direction: column;
          justify-content: center;
          min-height: 48px;
          border: 1px solid transparent;
          border-radius: 8px;
          padding: 0.55rem 0.7rem;
          color: #6d333d;
          font-size: 0.84rem;
          font-weight: 560;
          text-decoration: none;
        }

        .show-off-nav nav a.active {
          border-color: rgba(164, 73, 87, 0.18);
          color: #8f2e42;
          background: rgba(255, 239, 238, 0.88);
          box-shadow: 0 10px 24px rgba(137, 47, 62, 0.06);
        }

        .show-off-nav small {
          margin-top: 0.18rem;
          color: rgba(91, 32, 41, 0.58);
          font-size: 0.72rem;
          font-weight: 500;
        }

        .show-off-main {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: hidden;
          padding-top: 0.62rem;
        }

        .show-off-topbar {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          min-height: 46px;
        }

        .show-off-search {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          width: min(420px, 100%);
          height: 42px;
          border: 1px solid rgba(132, 58, 69, 0.14);
          border-radius: 16px;
          padding: 0 0.9rem;
          color: #8f5360;
          background: rgba(255, 255, 255, 0.8);
          box-shadow: 0 10px 30px rgba(129, 54, 66, 0.05);
        }

        .show-off-search input {
          width: 100%;
          border: 0;
          color: #4a1b24;
          background: transparent;
          font: inherit;
          font-size: 0.9rem;
          outline: none;
        }

        .show-off-search input::placeholder {
          color: rgba(74, 27, 36, 0.48);
        }

        .show-off-mobile-post-link {
          display: none;
        }

        .show-off-hero {
          position: relative;
          min-height: clamp(320px, 27vw, 390px);
          margin-top: 0.2rem;
          overflow: hidden;
          border-radius: 18px;
          background: #f4ddd6;
          box-shadow: 0 22px 62px rgba(117, 49, 60, 0.1);
          isolation: isolate;
        }

        .show-off-hero-copy {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: min(54%, 600px);
          min-height: clamp(320px, 27vw, 390px);
          padding: clamp(1.4rem, 2.4vw, 2rem) clamp(1.1rem, 2.5vw, 2.4rem);
        }

        .show-off-hero-copy p,
        .show-off-section-heading p,
        .show-off-upload-summary p {
          margin: 0;
          color: #c47442;
          font-size: 0.74rem;
          font-weight: 620;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .show-off-hero-copy h1 {
          max-width: 560px;
          margin: 0.65rem 0 0;
          color: #54202a;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(1.95rem, 2.72vw, 2.88rem);
          font-weight: 400;
          line-height: 1.08;
          text-wrap: balance;
        }

        .show-off-hero-copy > span {
          max-width: 450px;
          margin-top: 0.82rem;
          color: rgba(74, 27, 36, 0.66);
          font-size: 0.94rem;
          font-weight: 400;
          line-height: 1.62;
        }

        .show-off-hero-copy a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.7rem;
          width: fit-content;
          min-height: 44px;
          margin-top: 1.05rem;
          border-radius: 14px;
          padding: 0 1.15rem;
          color: #fff9f7;
          background: #b32345;
          font-size: 0.92rem;
          font-weight: 660;
          text-decoration: none;
          box-shadow: 0 12px 24px rgba(179, 35, 69, 0.17);
        }

        .show-off-hero-copy strong {
          font-size: 1.22rem;
          font-weight: 500;
        }

        .show-off-room-artwork {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          min-height: 0;
          margin: 0;
          overflow: hidden;
          border-radius: inherit;
          background: #f4ddd6;
          box-shadow: none;
        }

        .show-off-room-artwork::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(255, 249, 245, 0.95) 0%, rgba(255, 249, 245, 0.84) 32%, rgba(255, 249, 245, 0.46) 56%, rgba(255, 249, 245, 0.06) 82%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 242, 237, 0.12));
        }

        .show-off-room-artwork-image {
          object-fit: cover;
        }

        .show-off-room-artwork figcaption {
          position: absolute;
          z-index: 2;
          right: 1rem;
          bottom: 0.9rem;
          display: flex;
          gap: 0.45rem;
          align-items: center;
          border-radius: 14px;
          padding: 0.42rem 0.68rem;
          color: rgba(84, 32, 42, 0.72);
          background: rgba(255, 250, 246, 0.7);
          font-size: 0.72rem;
          backdrop-filter: blur(12px);
        }

        .show-off-room-artwork small {
          color: rgba(84, 32, 42, 0.5);
        }

        .show-off-category-row {
          display: flex;
          gap: 0.62rem;
          margin: 0.9rem 0 1rem;
          overflow-x: auto;
          padding-bottom: 0.1rem;
          scrollbar-width: none;
        }

        .show-off-category-row::-webkit-scrollbar,
        .show-off-prompt-row::-webkit-scrollbar {
          display: none;
        }

        .show-off-category-row button {
          flex: 0 0 auto;
          min-height: 40px;
          border: 1px solid rgba(146, 67, 80, 0.15);
          border-radius: 14px;
          padding: 0 1rem;
          color: #74323e;
          background: rgba(255, 255, 255, 0.58);
          font: inherit;
          font-size: 0.86rem;
          font-weight: 560;
          cursor: pointer;
        }

        .show-off-category-row button.active {
          border-color: #b32345;
          color: #fff9f7;
          background: #b32345;
          box-shadow: 0 10px 24px rgba(179, 35, 69, 0.14);
        }

        .show-off-room-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(310px, 338px);
          gap: 1.15rem;
          align-items: start;
          max-width: 100%;
          min-width: 0;
        }

        .show-off-gallery-stack {
          min-width: 0;
        }

        .show-off-gallery-section {
          min-width: 0;
        }

        .show-off-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
          margin: 0 0 0.75rem;
        }

        .show-off-section-heading h2 {
          margin: 0.2rem 0 0;
          color: #54202a;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.56rem;
          font-weight: 400;
        }

        .show-off-section-heading > span {
          color: #ad6170;
          font-size: 0.84rem;
          font-weight: 560;
        }

        .show-off-gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.78rem;
        }

        .show-off-card {
          overflow: hidden;
          border: 1px solid rgba(141, 66, 78, 0.1);
          border-radius: 9px;
          background: rgba(255, 251, 248, 0.9);
          box-shadow: 0 10px 28px rgba(111, 43, 55, 0.06);
        }

        .show-off-card-image {
          display: grid;
          place-items: center;
          aspect-ratio: 1.22 / 1;
          overflow: hidden;
          background: linear-gradient(135deg, #fff8f3, #f4d6d8);
          color: rgba(116, 50, 62, 0.45);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.2rem;
        }

        .show-off-card:nth-child(4n + 2) .show-off-card-image,
        .show-off-card:nth-child(4n + 4) .show-off-card-image {
          aspect-ratio: 1.12 / 1;
        }

        .show-off-card-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .show-off-card-body {
          padding: 0.72rem;
        }

        .show-off-creator-row {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 0.48rem;
          align-items: center;
        }

        .show-off-avatar {
          display: grid;
          place-items: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          object-fit: cover;
        }

        .show-off-avatar-fallback {
          color: #fff9f7;
          background: #7b3642;
          font-size: 0.72rem;
          font-weight: 580;
        }

        .show-off-creator-row strong,
        .show-off-creator-row small {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .show-off-creator-row strong {
          color: #4f1e28;
          font-size: 0.82rem;
          font-weight: 620;
        }

        .show-off-creator-row small {
          color: rgba(79, 30, 40, 0.46);
          font-size: 0.7rem;
          font-weight: 500;
        }

        .show-off-card-body p {
          margin: 0.58rem 0 0;
          color: #4d2029;
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .show-off-tag-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.34rem;
          margin-top: 0.62rem;
        }

        .show-off-tag-row span {
          border: 1px solid rgba(164, 73, 87, 0.15);
          border-radius: 999px;
          padding: 0.23rem 0.48rem;
          color: #8d3a49;
          background: rgba(255, 242, 239, 0.72);
          font-size: 0.68rem;
          font-weight: 520;
        }

        .show-off-upload-rail {
          position: sticky;
          top: 0.9rem;
          display: grid;
          gap: 0.8rem;
        }

        .show-off-upload-card,
        .show-off-room-rules,
        .show-off-empty-state {
          border: 1px solid rgba(141, 66, 78, 0.12);
          border-radius: 12px;
          background: rgba(255, 251, 248, 0.86);
          box-shadow: 0 14px 40px rgba(111, 43, 55, 0.06);
          backdrop-filter: blur(14px);
        }

        .show-off-upload-card {
          padding: 1rem;
        }

        .show-off-upload-summary {
          display: flex;
          width: 100%;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.8rem;
          border: 0;
          padding: 0;
          color: inherit;
          background: transparent;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .show-off-upload-summary h2 {
          margin: 0.24rem 0 0;
          color: #54202a;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.34rem;
          font-weight: 400;
        }

        .show-off-upload-summary > span {
          flex: 0 0 auto;
          color: rgba(84, 32, 42, 0.45);
          font-size: 0.76rem;
          font-weight: 560;
        }

        .show-off-upload-preview {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 0.62rem;
          margin-top: 0.9rem;
        }

        .show-off-upload-preview > span,
        .show-off-upload-preview img {
          display: grid;
          place-items: center;
          width: 100%;
          aspect-ratio: 1.9 / 1;
          border: 1px dashed rgba(179, 35, 69, 0.24);
          border-radius: 8px;
          color: #b32345;
          background: linear-gradient(135deg, #fffaf6, #f8dfdf);
          font-size: 1.4rem;
        }

        .show-off-upload-preview img {
          display: block;
          object-fit: cover;
        }

        .show-off-upload-preview label {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          justify-self: start;
          min-width: 132px;
          min-height: 40px;
          border: 1px solid rgba(179, 35, 69, 0.2);
          border-radius: 8px;
          padding: 0 0.92rem;
          color: #8f2e42;
          background: rgba(255, 247, 244, 0.76);
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
        }

        .show-off-upload-preview input {
          position: absolute;
          inset: 0;
          opacity: 0;
          cursor: pointer;
        }

        .show-off-field {
          display: grid;
          gap: 0.32rem;
          margin-top: 0.72rem;
        }

        .show-off-field span {
          color: rgba(84, 32, 42, 0.62);
          font-size: 0.72rem;
          font-weight: 560;
        }

        .show-off-field input,
        .show-off-field select,
        .show-off-upload-card textarea {
          width: 100%;
          border: 1px solid rgba(141, 66, 78, 0.14);
          border-radius: 8px;
          color: #4a1b24;
          background: rgba(255, 255, 255, 0.68);
          font: inherit;
          font-size: 0.86rem;
          outline: none;
        }

        .show-off-field input,
        .show-off-field select {
          min-height: 38px;
          padding: 0 0.68rem;
        }

        .show-off-upload-card textarea {
          min-height: 92px;
          margin-top: 0.72rem;
          resize: vertical;
          padding: 0.72rem;
          line-height: 1.45;
        }

        .show-off-field input:focus,
        .show-off-field select:focus,
        .show-off-upload-card textarea:focus {
          border-color: rgba(179, 35, 69, 0.46);
          box-shadow: 0 0 0 3px rgba(179, 35, 69, 0.11);
        }

        .show-off-prompt-row {
          display: flex;
          gap: 0.42rem;
          margin-top: 0.72rem;
          overflow-x: auto;
          padding-bottom: 0.08rem;
          scrollbar-width: none;
        }

        .show-off-prompt-row button {
          flex: 0 0 auto;
          min-height: 32px;
          border: 1px solid rgba(141, 66, 78, 0.15);
          border-radius: 12px;
          padding: 0 0.62rem;
          color: #85404b;
          background: rgba(255, 246, 243, 0.74);
          font: inherit;
          font-size: 0.74rem;
          font-weight: 520;
          cursor: pointer;
        }

        .show-off-submit {
          width: fit-content;
          min-width: 148px;
          min-height: 40px;
          margin: 0.82rem auto 0;
          border: 0;
          border-radius: 12px;
          padding: 0 1.05rem;
          color: #fff9f7;
          background: #b32345;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 650;
          cursor: pointer;
          box-shadow: 0 10px 22px rgba(179, 35, 69, 0.15);
        }

        .show-off-notice {
          margin: 0.68rem 0 0;
          color: #9a3f4f;
          font-size: 0.8rem;
          font-weight: 520;
          line-height: 1.35;
        }

        .show-off-room-rules {
          display: grid;
          gap: 0.45rem;
          padding: 0.9rem 1rem;
        }

        .show-off-room-rules strong {
          color: #662a35;
          font-size: 0.86rem;
          font-weight: 560;
        }

        .show-off-room-rules span {
          color: rgba(74, 27, 36, 0.62);
          font-size: 0.8rem;
          line-height: 1.35;
        }

        .show-off-empty-state {
          display: grid;
          gap: 0.45rem;
          width: 100%;
          min-width: 0;
          min-height: 320px;
          place-content: center;
          padding: 1.5rem;
          text-align: center;
        }

        .show-off-empty-state strong {
          width: min(100%, 28rem);
          min-width: 0;
          justify-self: center;
          color: #54202a;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 1.65rem;
          font-weight: 400;
        }

        .show-off-empty-state span {
          width: min(100%, 28rem);
          min-width: 0;
          max-width: 100%;
          justify-self: center;
          color: rgba(74, 27, 36, 0.62);
          overflow-wrap: anywhere;
        }

        @media (max-width: 1240px) {
          .show-off-gallery-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 1040px) {
          .show-off-shell {
            grid-template-columns: 1fr;
            padding: 0.7rem;
          }

          .show-off-nav {
            position: relative;
            min-height: auto;
            border-right: 0;
            border-bottom: 1px solid rgba(129, 54, 66, 0.12);
            padding: 0.4rem 0 0.7rem;
          }

          .show-off-brand {
            display: none;
          }

          .show-off-nav nav {
            display: flex;
            overflow-x: auto;
          }

          .show-off-nav nav a {
            flex: 0 0 auto;
            min-height: 40px;
          }

          .show-off-topbar {
            justify-content: space-between;
          }

          .show-off-mobile-post-link {
            display: none;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            border: 1px solid rgba(179, 35, 69, 0.18);
            border-radius: 999px;
            padding: 0 0.9rem;
            color: #8f2e42;
            background: rgba(255, 255, 255, 0.75);
            font-size: 0.84rem;
            font-weight: 760;
            text-decoration: none;
          }

          .show-off-room-layout {
            grid-template-columns: 1fr;
          }

          .show-off-hero {
            min-height: clamp(270px, 35vw, 330px);
          }

          .show-off-hero-copy {
            width: min(58%, 460px);
            min-height: clamp(270px, 35vw, 330px);
            padding: 1.1rem 1.2rem;
          }

          .show-off-hero-copy h1 {
            font-size: clamp(1.9rem, 5.3vw, 2.75rem);
          }

          .show-off-upload-rail {
            position: static;
          }
        }

        @media (max-width: 680px) {
          .show-off-shell {
            gap: 0.55rem;
          }

          .show-off-main {
            padding-top: 0;
          }

          .show-off-search {
            flex: 1 1 auto;
            min-width: 0;
          }

          .show-off-mobile-post-link {
            flex: 0 0 auto;
            padding: 0 0.72rem;
          }

          .show-off-hero {
            min-height: 235px;
            border-radius: 14px;
          }

          .show-off-room-artwork::before {
            background:
              linear-gradient(90deg, rgba(255, 249, 245, 0.94) 0%, rgba(255, 249, 245, 0.76) 44%, rgba(255, 249, 245, 0.16) 78%, transparent 100%),
              linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 242, 237, 0.08));
          }

          .show-off-room-artwork figcaption {
            display: none;
          }

          .show-off-hero-copy {
            width: min(76%, 320px);
            min-height: 235px;
            padding: 0.9rem;
          }

          .show-off-hero-copy p {
            font-size: 0.66rem;
          }

          .show-off-hero-copy h1 {
            font-size: clamp(1.55rem, 7.4vw, 2.05rem);
          }

          .show-off-hero-copy > span {
            margin-top: 0.58rem;
            font-size: 0.78rem;
            line-height: 1.42;
          }

          .show-off-hero-copy a {
            min-height: 38px;
            margin-top: 0.75rem;
            padding: 0 0.9rem;
            font-size: 0.82rem;
          }

          .show-off-category-row {
            margin: 0.72rem 0;
          }

          .show-off-category-row button {
            min-height: 40px;
            padding: 0 0.9rem;
          }

          .show-off-section-heading h2 {
            font-size: 1.42rem;
          }

          .show-off-empty-state strong,
          .show-off-empty-state span {
            width: min(100%, 17rem);
          }

          .show-off-gallery-grid {
            grid-template-columns: 1fr;
            gap: 0.72rem;
          }

          .show-off-card-image,
          .show-off-card:nth-child(4n + 2) .show-off-card-image,
          .show-off-card:nth-child(4n + 4) .show-off-card-image {
            aspect-ratio: 1.18 / 1;
          }

          .show-off-upload-card {
            padding: 0.82rem;
          }

          .show-off-upload-summary {
            align-items: center;
          }

          .show-off-upload-summary h2 {
            font-size: 1.24rem;
          }

          .show-off-upload-rail:not(.is-open) .show-off-upload-form,
          .show-off-upload-rail:not(.is-open) .show-off-room-rules {
            display: none;
          }

          .show-off-upload-preview {
            grid-template-columns: minmax(0, 1fr) 112px;
            align-items: stretch;
          }

          .show-off-upload-preview label {
            justify-self: stretch;
            min-width: 0;
            padding: 0 0.7rem;
          }

          .show-off-upload-preview > span,
          .show-off-upload-preview img {
            aspect-ratio: auto;
            min-height: 72px;
          }
        }
      `}</style>
    </ChoNeoRoomShell>
  );
}
