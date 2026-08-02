"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ChoNeoTimeAmbience } from "./ChoNeoTimeAmbience";

type CommunityNoteRoomTone = "tech" | "owner" | "market" | "waterfront";

type CommunityNoteRoomProps = {
  roomId: string;
  viTitle: string;
  enTitle: string;
  purpose: string;
  prompts: string[];
  placeholder: string;
  guardrails: string[];
  tone: CommunityNoteRoomTone;
  locked?: boolean;
  previewScale?: "large" | "small";
  previewImage?: string;
  previewNoteTitle?: string;
  previewNoteBody?: string;
  lockedMessage?: string;
  lockedDetail?: string;
  previewMusicSrc?: string;
  previewMusicLabel?: string;
  showPreviewPrompts?: boolean;
};

type CommunityNote = {
  id: string;
  text: string;
  prompt?: string;
  createdAt: string;
};

const NOTE_LIMIT = 360;
const MAX_NOTES = 32;

const HARSH_PATTERNS = [
  /bóc phốt/i,
  /đồ ngu/i,
  /ngu quá/i,
  /stupid/i,
  /idiot/i,
  /hate/i,
  /ghét/i,
  /đập/i,
  /kill/i,
  /lừa đảo/i,
  /đồ khùng/i,
  /thằng/i,
  /con nhỏ/i,
];

const BLOCKED_PATTERNS = [
  {
    pattern: /(?:\+?\d[\d\s().-]{7,}\d)/,
    message:
      "Đừng để số điện thoại trong phòng nha. Viết lại chung chung hơn một chút.",
  },
  {
    pattern: /\b(?:facebook|instagram|tiktok|zalo)\s*[:@]/i,
    message:
      "Đừng kéo thông tin cá nhân qua đây. Giữ chuyện chung chung cho an toàn.",
  },
];

function getStorageKey(roomId: string) {
  return `choNeoCommunityNotes:${roomId}:v1`;
}

function createNoteId(roomId: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${roomId}-${crypto.randomUUID()}`;
  }
  return `${roomId}-${Date.now()}`;
}

function readStoredNotes(roomId: string) {
  try {
    const stored = window.localStorage.getItem(getStorageKey(roomId));
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Partial<CommunityNote>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((note): note is CommunityNote => {
        return Boolean(note.id && note.text && note.createdAt);
      })
      .slice(0, MAX_NOTES);
  } catch {
    return [];
  }
}

function formatNoteTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Mới ghi";
  return new Intl.DateTimeFormat("vi", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function soundsHarsh(text: string) {
  return HARSH_PATTERNS.some((pattern) => pattern.test(text));
}

function softenNote(text: string) {
  const softened = text
    .replace(/bóc phốt/gi, "nói lại chuyện này nhẹ hơn")
    .replace(/đồ ngu|ngu quá|stupid|idiot/gi, "khó xử")
    .replace(/hate|ghét/gi, "không thoải mái với")
    .replace(/lừa đảo/gi, "làm mình mất lòng tin")
    .replace(/đập|kill/gi, "muốn chuyện dừng lại")
    .replace(/đồ khùng/gi, "làm mình rối")
    .replace(/thằng|con nhỏ/gi, "người đó");

  return `${softened.trim()} Mình muốn nói chuyện này cho nhẹ hơn và tìm cách xử lý êm.`;
}

export function ChoNeoCommunityNoteRoom({
  roomId,
  viTitle,
  enTitle,
  purpose,
  prompts,
  placeholder,
  guardrails,
  tone,
  locked = false,
  previewScale = "large",
  previewImage,
  previewNoteTitle = "Nhìn qua cửa kính.",
  previewNoteBody = "Phòng đang được dọn cho đúng nhịp của làng.",
  lockedMessage = "Câu chuyện tương lai đang chờ sau cửa.",
  lockedDetail,
  previewMusicSrc,
  previewMusicLabel = "Nhạc phòng",
  showPreviewPrompts = true,
}: CommunityNoteRoomProps) {
  const [notes, setNotes] = useState<CommunityNote[]>([]);
  const [draft, setDraft] = useState("");
  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [notice, setNotice] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const [softenOriginal, setSoftenOriginal] = useState("");
  const [softenedDraft, setSoftenedDraft] = useState("");
  const [previewImageFailed, setPreviewImageFailed] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const showPreviewImage = Boolean(previewImage && !previewImageFailed);

  useEffect(() => {
    if (locked) return;
    setNotes(readStoredNotes(roomId));
    setHasLoaded(true);
  }, [locked, roomId]);

  useEffect(() => {
    if (!hasLoaded || locked) return;
    try {
      window.localStorage.setItem(getStorageKey(roomId), JSON.stringify(notes));
    } catch {
      // Local room notes are optional browser memory only.
    }
  }, [hasLoaded, locked, notes, roomId]);

  useEffect(() => {
    setPreviewImageFailed(false);
  }, [previewImage]);

  const roomWords = useMemo(() => {
    if (tone === "owner") {
      return {
        kicker: "Góc sau tiệm",
        stageTitle: "Chủ tiệm thở một chút.",
        stageText: "Pressure can be named without turning into blame.",
        promptLabel: "Câu mở chuyện",
        composerTitle: "Viết một ghi chú cho nhẹ phòng.",
        emptyTitle: "Chưa ai đặt lời lên bàn.",
        emptyText:
          "Bắt đầu bằng một chuyện thật, nói nhẹ, và để người sau thấy đỡ cô đơn.",
        postButton: "Đặt ghi chú",
      };
    }

    return {
      kicker: "Góc sau ca",
      stageTitle: "Thợ nail nói với nhau nhẹ thôi.",
      stageText: "Pressure is allowed here. Attacks are not.",
      promptLabel: "Câu mở chuyện",
      composerTitle: "Viết một ghi chú cho thợ khác đọc được.",
      emptyTitle: "Bàn còn yên.",
      emptyText:
        "Đặt một câu thật, ngắn, và có tình để người sau thấy mình được hiểu.",
      postButton: "Đặt ghi chú",
    };
  }, [tone]);

  function focusInput() {
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handlePromptClick(prompt: string) {
    setSelectedPrompt(prompt);
    setDraft((current) => {
      const trimmed = current.trim();
      return trimmed ? `${trimmed} ${prompt} ` : `${prompt} `;
    });
    setNotice("");
    setSoftenOriginal("");
    setSoftenedDraft("");
    focusInput();
  }

  function publishNote(text: string) {
    const cleanText = text.trim().slice(0, NOTE_LIMIT);
    const nextNote: CommunityNote = {
      id: createNoteId(roomId),
      text: cleanText,
      prompt: selectedPrompt || undefined,
      createdAt: new Date().toISOString(),
    };

    setNotes((current) => [nextNote, ...current].slice(0, MAX_NOTES));
    setDraft("");
    setSelectedPrompt("");
    setNotice("Đã đặt ghi chú lên bàn.");
    setSoftenOriginal("");
    setSoftenedDraft("");
  }

  function validateDraft(text: string) {
    const cleanText = text.trim();
    if (cleanText.length < 10) {
      return "Viết thêm một chút để người khác hiểu chuyện nha.";
    }
    for (const rule of BLOCKED_PATTERNS) {
      if (rule.pattern.test(cleanText)) return rule.message;
    }
    return "";
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanText = draft.trim();
    const validationMessage = validateDraft(cleanText);
    if (validationMessage) {
      setNotice(validationMessage);
      inputRef.current?.focus();
      return;
    }

    if (soundsHarsh(cleanText)) {
      setSoftenOriginal(cleanText);
      setSoftenedDraft(softenNote(cleanText).slice(0, NOTE_LIMIT));
      setNotice("");
      return;
    }

    publishNote(cleanText);
  }

  function handleSoftenedSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationMessage = validateDraft(softenedDraft);
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }
    publishNote(softenedDraft);
  }

  return (
    <main
      className={`community-room community-room-${tone} ${
        locked ? "community-room-locked" : ""
      } ${
        showPreviewImage ? "community-room-has-preview" : ""
      } community-preview-${previewScale}`}
    >
      <ChoNeoTimeAmbience />

      <section className="community-shell" aria-labelledby={`${roomId}-title`}>
        <header className="room-topbar">
          <Link className="soft-link" href="/cho-neo">
            <span>Về Sân Làng</span>
            <small>Back to Village</small>
          </Link>
          <Link className="soft-link" href="/cho-neo/gossip">
            <span>Qua Quán Tám</span>
            <small>Gossip Café</small>
          </Link>
        </header>

        <section className="room-hero">
          <div className="hero-copy">
            <p>{locked ? "Sắp mở" : roomWords.kicker}</p>
            <h1 id={`${roomId}-title`}>
              <span>{viTitle}</span>
              <small>{enTitle}</small>
            </h1>
            <strong>{purpose}</strong>
          </div>

          <div className="room-stage" aria-hidden="true">
            {showPreviewImage ? (
              <Image
                src={previewImage}
                alt={`${viTitle} ${enTitle} locked room preview`}
                fill
                sizes="(max-width: 820px) 100vw, 620px"
                className="stage-preview-image"
                onError={() => setPreviewImageFailed(true)}
              />
            ) : (
              <>
                <span className="stage-lantern stage-lantern-left" />
                <span className="stage-lantern stage-lantern-right" />
                <div className="stage-sign">
                  <span>{viTitle}</span>
                  <small>{enTitle}</small>
                </div>
                <div className="stage-table">
                  <span />
                  <span />
                  <span />
                </div>
              </>
            )}
            <div className="stage-note">
              <strong>{locked ? previewNoteTitle : roomWords.stageTitle}</strong>
              <span>
                {locked
                  ? previewNoteBody
                  : roomWords.stageText}
              </span>
            </div>
            {locked ? (
              <div className="locked-glass" aria-hidden="true">
                <span>Khóa nhẹ</span>
                <strong>Sắp mở</strong>
              </div>
            ) : null}
          </div>
        </section>

        {showPreviewPrompts || !locked ? (
          <section className="prompt-panel" aria-label="Câu mở chuyện">
            <div className="section-heading">
              <p>{roomWords.promptLabel}</p>
              <h2>
                {locked
                  ? "Câu chuyện tương lai đang chờ sau cửa."
                  : "Nhấn một câu, rồi sửa theo chuyện của bạn."}
              </h2>
            </div>
            <div className="prompt-grid">
              {prompts.map((prompt) =>
                locked ? (
                  <span className="locked-prompt" key={prompt}>
                    {prompt}
                  </span>
                ) : (
                  <button
                    key={prompt}
                    type="button"
                    className={selectedPrompt === prompt ? "active" : ""}
                    onClick={() => handlePromptClick(prompt)}
                  >
                    {prompt}
                  </button>
                ),
              )}
            </div>
          </section>
        ) : null}

        {guardrails.length ? (
          <section className="guardrail-strip" aria-label="Giữ phòng êm">
            {guardrails.map((rule) => (
              <span key={rule}>{rule}</span>
            ))}
          </section>
        ) : null}

        {locked ? (
          <section className="locked-preview-card" aria-label={`${viTitle} sắp mở`}>
            <span className="lock-mark" aria-hidden="true">
              ⟡
            </span>
            <div>
              <p>Sắp mở</p>
              <h2>{lockedMessage}</h2>
              <span>
                {lockedDetail ??
                  `Khoe Set vẫn là vòng hoạt động kế tiếp. ${viTitle} sẽ mở khi làng sẵn sàng đón câu chuyện ở đây.`}
              </span>
              <div className="locked-music-preview">
                <strong>{previewMusicLabel}</strong>
                {previewMusicSrc ? (
                  <audio controls preload="none">
                    <source src={previewMusicSrc} type="audio/mpeg" />
                  </audio>
                ) : (
                  <small>Nhạc phòng đang được chuẩn bị.</small>
                )}
              </div>
            </div>
          </section>
        ) : (
        <section className="note-loop">
          <form className="note-composer" onSubmit={handleSubmit}>
            <div className="composer-heading">
              <div>
                <p>Ghi chú trong phòng</p>
                <h2>{roomWords.composerTitle}</h2>
              </div>
              <span>{draft.length}/{NOTE_LIMIT}</span>
            </div>

            <textarea
              ref={inputRef}
              value={draft}
              maxLength={NOTE_LIMIT}
              placeholder={placeholder}
              onChange={(event) => {
                setDraft(event.target.value);
                setNotice("");
              }}
            />

            <div className="composer-actions">
              <p>
                Không tên thật, không tên tiệm, không lộ chuyện riêng. Pao sẽ
                nhắc nhẹ nếu lời đang quá gắt.
              </p>
              <button type="submit">{roomWords.postButton}</button>
            </div>
          </form>

          {softenOriginal ? (
            <form className="pao-softener" onSubmit={handleSoftenedSubmit}>
              <div>
                <p>Pao làm dịu lời</p>
                <h2>Ý vẫn còn, cạnh sắc bớt lại.</h2>
              </div>
              <textarea
                value={softenedDraft}
                maxLength={NOTE_LIMIT}
                onChange={(event) => setSoftenedDraft(event.target.value)}
                aria-label="Bản ghi chú đã được Pao làm dịu"
              />
              <div className="softener-actions">
                <button type="button" onClick={() => {
                  setDraft(softenOriginal);
                  setSoftenOriginal("");
                  setSoftenedDraft("");
                  focusInput();
                }}>
                  Tự sửa tiếp
                </button>
                <button type="submit">Đăng bản đã dịu</button>
              </div>
            </form>
          ) : null}

          {notice ? <p className="notice">{notice}</p> : null}

          <section className="note-feed" aria-label="Ghi chú đã đăng">
            <div className="section-heading">
              <p>Lời mới trong phòng</p>
              <h2>Đọc nhẹ, góp nhẹ.</h2>
            </div>

            {notes.length ? (
              <div className="note-list">
                {notes.map((note) => (
                  <article className="note-card" key={note.id}>
                    <div className="note-meta">
                      <span>Ghi chú trong phòng</span>
                      <time dateTime={note.createdAt}>
                        {formatNoteTime(note.createdAt)}
                      </time>
                    </div>
                    {note.prompt ? <p className="note-prompt">{note.prompt}</p> : null}
                    <p>{note.text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-card">
                <h3>{roomWords.emptyTitle}</h3>
                <p>{roomWords.emptyText}</p>
              </div>
            )}
          </section>
        </section>
        )}
      </section>

      <style>{`
        .community-room {
          min-height: 100vh;
          position: relative;
          overflow-x: hidden;
          color: #fff7ed;
          background:
            radial-gradient(circle at 16% 12%, rgba(251, 191, 36, 0.2), transparent 30%),
            radial-gradient(circle at 86% 18%, rgba(45, 212, 191, 0.12), transparent 28%),
            linear-gradient(180deg, #101224 0%, #21162c 48%, #120f13 100%);
        }

        .community-room-owner {
          background:
            radial-gradient(circle at 16% 12%, rgba(251, 191, 36, 0.18), transparent 30%),
            radial-gradient(circle at 86% 18%, rgba(34, 197, 94, 0.12), transparent 28%),
            linear-gradient(180deg, #101224 0%, #241827 50%, #120f13 100%);
        }

        .community-shell {
          position: relative;
          z-index: 1;
          width: min(1120px, 100%);
          margin: 0 auto;
          padding: 20px;
        }

        .room-topbar {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 16px;
        }

        .soft-link {
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          min-height: 42px;
          padding: 7px 13px;
          border: 1px solid rgba(253, 230, 138, 0.3);
          border-radius: 999px;
          color: #fff7ed;
          background: rgba(17, 24, 39, 0.55);
          text-decoration: none;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
          backdrop-filter: blur(12px);
        }

        .soft-link span {
          font-size: 13px;
          font-weight: 900;
        }

        .soft-link small {
          color: rgba(255, 247, 237, 0.68);
          font-size: 10px;
          font-weight: 800;
        }

        .room-hero {
          display: grid;
          grid-template-columns: minmax(0, 0.86fr) minmax(320px, 1.14fr);
          gap: 18px;
          align-items: stretch;
        }

        .hero-copy,
        .room-stage,
        .prompt-panel,
        .note-composer,
        .pao-softener,
        .note-card,
        .empty-card,
        .locked-preview-card {
          border: 1px solid rgba(253, 230, 138, 0.16);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.66);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.13);
          backdrop-filter: blur(14px);
        }

        .hero-copy {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          min-height: 360px;
          padding: 24px;
          border-radius: 28px;
        }

        .hero-copy p,
        .section-heading p,
        .composer-heading p,
        .pao-softener p {
          margin: 0 0 8px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .hero-copy h1 {
          display: grid;
          gap: 7px;
          margin: 0;
          font-size: clamp(42px, 8vw, 78px);
          line-height: 0.9;
          letter-spacing: -0.055em;
        }

        .hero-copy h1 small {
          color: rgba(255, 247, 237, 0.7);
          font-size: clamp(18px, 2.6vw, 28px);
          line-height: 1.1;
          letter-spacing: 0;
        }

        .hero-copy strong {
          max-width: 540px;
          margin-top: 16px;
          color: rgba(255, 247, 237, 0.86);
          font-size: 17px;
          line-height: 1.55;
        }

        .room-stage {
          position: relative;
          overflow: hidden;
          min-height: 360px;
          border-radius: 28px;
          background:
            radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.26), transparent 25%),
            radial-gradient(circle at 18% 78%, rgba(244, 114, 182, 0.18), transparent 28%),
            radial-gradient(circle at 86% 76%, rgba(45, 212, 191, 0.14), transparent 30%),
            linear-gradient(180deg, rgba(46, 28, 35, 0.88), rgba(20, 14, 19, 0.96));
        }

        .stage-preview-image {
          object-fit: cover;
          object-position: center;
          z-index: 0;
          filter: saturate(1.02) contrast(1.02);
        }

        .room-stage::before {
          content: "";
          position: absolute;
          left: 50%;
          bottom: 28px;
          width: min(520px, 86%);
          height: 170px;
          transform: translateX(-50%) rotate(-1deg);
          border-radius: 50%;
          background:
            radial-gradient(circle at 50% 24%, rgba(253, 230, 138, 0.18), transparent 28%),
            linear-gradient(180deg, #7c3f24, #3f241b);
          box-shadow:
            inset 0 0 40px rgba(0, 0, 0, 0.3),
            0 22px 48px rgba(0, 0, 0, 0.38);
        }

        .community-room-has-preview .room-stage::before {
          inset: 0;
          left: auto;
          bottom: auto;
          width: auto;
          height: auto;
          transform: none;
          border-radius: 0;
          background:
            linear-gradient(90deg, rgba(5, 5, 8, 0.22), transparent 26%, transparent 74%, rgba(5, 5, 8, 0.2)),
            radial-gradient(circle at 50% 58%, transparent 0%, rgba(0, 0, 0, 0.18) 78%);
          box-shadow: none;
          z-index: 1;
          pointer-events: none;
        }

        .stage-lantern {
          position: absolute;
          top: 24px;
          width: 42px;
          height: 56px;
          border-radius: 44% 44% 48% 48%;
          background: radial-gradient(circle, #fde68a 0%, #fb923c 48%, #991b1b 100%);
          box-shadow: 0 0 32px rgba(251, 146, 60, 0.5);
          opacity: 0.88;
        }

        .stage-lantern-left { left: 12%; }
        .stage-lantern-right { right: 12%; }

        .stage-sign {
          position: absolute;
          top: 62px;
          left: 50%;
          display: grid;
          gap: 4px;
          min-width: 220px;
          padding: 16px 20px;
          transform: translateX(-50%) rotate(-0.8deg);
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 18px;
          background: rgba(67, 35, 25, 0.78);
          color: #fff7ed;
          text-align: center;
          box-shadow: 0 16px 34px rgba(0, 0, 0, 0.28);
        }

        .community-room-locked .room-stage::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(110deg, transparent 0%, rgba(255, 255, 255, 0.08) 42%, transparent 62%),
            rgba(255, 247, 237, 0.025);
          pointer-events: none;
        }

        .community-preview-small .room-hero {
          grid-template-columns: minmax(0, 0.95fr) minmax(300px, 0.85fr);
        }

        .community-preview-small .hero-copy,
        .community-preview-small .room-stage {
          min-height: 310px;
        }

        .locked-glass {
          position: absolute;
          left: 20px;
          bottom: 22px;
          z-index: 2;
          display: grid;
          gap: 3px;
          padding: 12px 14px;
          border: 1px solid rgba(255, 247, 237, 0.22);
          border-radius: 18px;
          color: #fff7ed;
          background: rgba(17, 24, 39, 0.46);
          box-shadow: 0 18px 36px rgba(0, 0, 0, 0.28);
          backdrop-filter: blur(14px);
        }

        .locked-glass span {
          color: rgba(255, 247, 237, 0.66);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .locked-glass strong {
          color: #fde68a;
          font-size: 18px;
        }

        .stage-sign span {
          font-size: 22px;
          font-weight: 950;
        }

        .stage-sign small {
          color: rgba(255, 247, 237, 0.74);
          font-size: 12px;
          font-weight: 800;
        }

        .stage-table {
          position: absolute;
          left: 50%;
          bottom: 84px;
          display: flex;
          gap: 18px;
          transform: translateX(-50%);
        }

        .stage-table span {
          width: 56px;
          height: 22px;
          border-radius: 999px;
          background: rgba(253, 230, 138, 0.58);
          box-shadow: 0 0 24px rgba(253, 230, 138, 0.2);
        }

        .stage-note {
          position: absolute;
          right: 20px;
          bottom: 22px;
          z-index: 2;
          display: grid;
          gap: 5px;
          width: min(280px, calc(100% - 40px));
          padding: 13px 15px;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 18px;
          background: rgba(255, 247, 237, 0.92);
          color: #33180f;
          transform: rotate(1deg);
        }

        .stage-note strong {
          font-size: 14px;
          line-height: 1.25;
        }

        .stage-note span {
          color: rgba(51, 24, 15, 0.72);
          font-size: 12px;
          line-height: 1.35;
        }

        .prompt-panel {
          margin-top: 16px;
          padding: 18px;
          border-radius: 24px;
        }

        .section-heading h2,
        .composer-heading h2,
        .pao-softener h2 {
          margin: 0;
          font-size: clamp(21px, 3vw, 30px);
          line-height: 1.08;
          letter-spacing: -0.025em;
        }

        .prompt-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .prompt-grid button,
        .locked-prompt,
        .composer-actions button,
        .softener-actions button {
          display: block;
          min-height: 46px;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 16px;
          color: #fff7ed;
          background: rgba(255, 247, 237, 0.1);
          font: inherit;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
        }

        .prompt-grid button,
        .locked-prompt {
          padding: 12px;
          text-align: left;
          line-height: 1.32;
        }

        .locked-prompt {
          cursor: default;
          color: rgba(255, 247, 237, 0.7);
          background: rgba(255, 247, 237, 0.075);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .prompt-grid button.active,
        .composer-actions button,
        .softener-actions button[type="submit"] {
          color: #111827;
          background: #fde68a;
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.22);
        }

        .guardrail-strip {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0 0;
        }

        .guardrail-strip span {
          padding: 8px 11px;
          border: 1px solid rgba(255, 247, 237, 0.12);
          border-radius: 999px;
          color: rgba(255, 247, 237, 0.78);
          background: rgba(255, 247, 237, 0.075);
          font-size: 12px;
          font-weight: 800;
        }

        .locked-preview-card {
          display: flex;
          gap: 14px;
          align-items: center;
          margin-top: 16px;
          padding: 18px;
          border-radius: 24px;
        }

        .lock-mark {
          flex: 0 0 auto;
          display: inline-grid;
          place-items: center;
          width: 44px;
          height: 44px;
          border: 1px solid rgba(253, 230, 138, 0.28);
          border-radius: 999px;
          color: #fde68a;
          background: rgba(253, 230, 138, 0.1);
          box-shadow: 0 0 28px rgba(251, 191, 36, 0.16);
        }

        .locked-preview-card p {
          margin: 0 0 5px;
          color: #fde68a;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .locked-preview-card h2 {
          margin: 0;
          font-size: clamp(22px, 3vw, 30px);
          line-height: 1.08;
          letter-spacing: -0.025em;
        }

        .locked-preview-card span:not(.lock-mark) {
          display: block;
          max-width: 720px;
          margin-top: 7px;
          color: rgba(255, 247, 237, 0.72);
          line-height: 1.48;
        }

        .locked-music-preview {
          display: grid;
          gap: 7px;
          width: min(360px, 100%);
          margin-top: 13px;
          padding: 10px 12px;
          border: 1px solid rgba(253, 230, 138, 0.16);
          border-radius: 16px;
          background: rgba(253, 230, 138, 0.075);
        }

        .locked-music-preview strong {
          color: #fde68a;
          font-size: 12px;
          line-height: 1.1;
        }

        .locked-music-preview small {
          color: rgba(255, 247, 237, 0.66);
          font-size: 12px;
          font-weight: 800;
        }

        .locked-music-preview audio {
          width: 100%;
          max-width: 100%;
        }

        .note-loop {
          display: grid;
          grid-template-columns: minmax(280px, 0.86fr) minmax(320px, 1.14fr);
          gap: 16px;
          margin-top: 16px;
          align-items: start;
        }

        .note-composer,
        .pao-softener {
          display: grid;
          gap: 13px;
          padding: 18px;
          border-radius: 24px;
        }

        .composer-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .composer-heading span {
          color: rgba(255, 247, 237, 0.62);
          font-size: 12px;
          font-weight: 850;
        }

        textarea {
          width: 100%;
          min-height: 142px;
          resize: vertical;
          border: 1px solid rgba(253, 230, 138, 0.18);
          border-radius: 18px;
          padding: 14px;
          color: #fff7ed;
          background: rgba(0, 0, 0, 0.2);
          font: inherit;
          font-size: 16px;
          line-height: 1.45;
          outline: none;
        }

        textarea:focus {
          border-color: rgba(253, 230, 138, 0.62);
          box-shadow: 0 0 0 4px rgba(253, 230, 138, 0.12);
        }

        .composer-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .composer-actions p {
          margin: 0;
          color: rgba(255, 247, 237, 0.66);
          font-size: 12px;
          line-height: 1.4;
        }

        .composer-actions button,
        .softener-actions button {
          flex: 0 0 auto;
          padding: 0 16px;
        }

        .pao-softener {
          grid-column: 1 / -1;
          border-color: rgba(45, 212, 191, 0.24);
          background:
            radial-gradient(circle at 12% 20%, rgba(45, 212, 191, 0.16), transparent 28%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045)),
            rgba(8, 13, 28, 0.72);
        }

        .softener-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .notice {
          grid-column: 1 / -1;
          margin: 0;
          padding: 12px 14px;
          border: 1px solid rgba(253, 230, 138, 0.22);
          border-radius: 16px;
          color: #fde68a;
          background: rgba(0, 0, 0, 0.22);
          font-size: 14px;
          font-weight: 800;
        }

        .note-feed {
          display: grid;
          gap: 12px;
        }

        .note-list {
          display: grid;
          gap: 10px;
        }

        .note-card,
        .empty-card {
          padding: 16px;
          border-radius: 22px;
        }

        .note-meta {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
          color: rgba(255, 247, 237, 0.56);
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .note-card p {
          margin: 0;
          color: rgba(255, 247, 237, 0.88);
          font-size: 15px;
          line-height: 1.55;
          white-space: pre-wrap;
        }

        .note-card .note-prompt {
          margin-bottom: 8px;
          color: #fde68a;
          font-size: 13px;
          font-weight: 900;
        }

        .empty-card h3 {
          margin: 0;
          font-size: 22px;
        }

        .empty-card p {
          margin: 8px 0 0;
          color: rgba(255, 247, 237, 0.72);
          line-height: 1.5;
        }

        @media (max-width: 820px) {
          .community-shell {
            padding: 14px 14px calc(26px + env(safe-area-inset-bottom));
          }

          .room-hero,
          .note-loop {
            grid-template-columns: 1fr;
          }

          .hero-copy,
          .room-stage {
            min-height: auto;
          }

          .hero-copy {
            padding: 18px;
          }

          .hero-copy h1 {
            font-size: clamp(40px, 13vw, 64px);
          }

          .room-stage {
            min-height: 270px;
          }

          .prompt-grid {
            grid-template-columns: 1fr;
          }

          .composer-actions,
          .softener-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .composer-actions button,
          .softener-actions button {
            width: 100%;
          }

          .note-feed {
            margin-top: 2px;
          }

          .community-room-locked .room-hero {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .community-room-locked.community-preview-small .room-hero {
            grid-template-columns: 1fr;
          }

          .community-room-locked .hero-copy {
            min-height: auto;
            padding: 14px 15px;
            border-radius: 22px;
          }

          .community-room-locked .hero-copy p {
            margin-bottom: 6px;
            font-size: 10px;
            letter-spacing: 0.14em;
          }

          .community-room-locked .hero-copy h1 {
            gap: 4px;
            font-size: clamp(30px, 9vw, 38px);
            line-height: 1.02;
            letter-spacing: -0.035em;
            overflow-wrap: normal;
            word-break: keep-all;
          }

          .community-room-locked .hero-copy h1 small {
            font-size: 14px;
          }

          .community-room-locked .hero-copy strong {
            display: -webkit-box;
            max-width: none;
            margin-top: 10px;
            overflow: hidden;
            color: rgba(255, 247, 237, 0.78);
            font-size: 14px;
            line-height: 1.35;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
          }

          .community-room-locked .room-stage {
            min-height: 250px;
            border-radius: 22px;
          }

          .community-room-locked .stage-note {
            left: 12px;
            right: 12px;
            bottom: 12px;
            width: auto;
            padding: 10px 12px;
            border-radius: 15px;
            transform: none;
          }

          .community-room-locked .stage-note strong {
            font-size: 13px;
          }

          .community-room-locked .stage-note span {
            font-size: 11px;
          }

          .community-room-locked .locked-glass {
            top: 12px;
            right: 12px;
            bottom: auto;
            left: auto;
            padding: 8px 10px;
            border-radius: 14px;
          }

          .community-room-locked .locked-glass span {
            font-size: 9px;
          }

          .community-room-locked .locked-glass strong {
            font-size: 14px;
          }

          .community-room-locked .prompt-panel,
          .community-room-locked .guardrail-strip {
            display: none;
          }

          .community-room-locked .locked-preview-card {
            align-items: flex-start;
            gap: 10px;
            margin-top: 12px;
            padding: 14px;
            border-radius: 20px;
          }

          .community-room-locked .lock-mark {
            width: 34px;
            height: 34px;
          }

          .community-room-locked .locked-preview-card p {
            margin-bottom: 4px;
            font-size: 10px;
            letter-spacing: 0.12em;
          }

          .community-room-locked .locked-preview-card h2 {
            font-size: 19px;
          }

          .community-room-locked .locked-preview-card span:not(.lock-mark) {
            margin-top: 5px;
            font-size: 13px;
            line-height: 1.42;
          }
        }
      `}</style>
    </main>
  );
}
