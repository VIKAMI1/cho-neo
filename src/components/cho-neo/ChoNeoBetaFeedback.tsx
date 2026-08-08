"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase-browser";
import { useChoNeoMember } from "./ChoNeoMemberProvider";
import {
  getChoNeoBetaSessionId,
  getChoNeoDeviceType,
  hasChoNeoMusicActivity,
  inferChoNeoRoomFromPath,
  trackChoNeoBetaEvent,
} from "@/lib/cho-neo/beta-analytics";
import {
  buildChoNeoRoomVotePresentation,
  CHO_NEO_ROOM_VOTE_OPEN_EVENT,
  CHO_NEO_ROOM_VOTE_POLL_KEY,
  CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH,
  CHO_NEO_ROOM_VOTE_OPTIONS,
  sanitizeChoNeoRoomVoteReason,
  type ChoNeoRoomVoteOptionKey,
  type ChoNeoRoomVotePresentation,
  type ChoNeoRoomVotePublicResult,
} from "@/lib/cho-neo/room-vote";

type RatingQuestion = {
  id: string;
  vi: string;
  en: string;
  scale: 5 | 10;
};

type OptionQuestion = {
  id: string;
  vi: string;
  en?: string;
  options: string[];
};

const CORE_QUESTIONS: RatingQuestion[] = [
  {
    id: "understand_cho_neo",
    vi: "Bạn có hiểu Chợ Neo là gì không?",
    en: "I understand what Chợ Neo is.",
    scale: 5,
  },
  {
    id: "know_next_tap",
    vi: "Bạn có biết bấm vào đâu tiếp theo không?",
    en: "I know where to tap/click next.",
    scale: 5,
  },
  {
    id: "warm_vietnamese_different",
    vi: "Chợ Neo có cảm giác ấm, Việt, và khác biệt không?",
    en: "Chợ Neo feels warm, Vietnamese, and different.",
    scale: 5,
  },
  {
    id: "safe_to_share",
    vi: "Bạn có thấy nơi này đủ an toàn để góp chuyện không?",
    en: "I feel safe enough to share here.",
    scale: 5,
  },
  {
    id: "mobile_comfort",
    vi: "Dùng trên điện thoại có dễ chịu không?",
    en: "The mobile experience feels comfortable.",
    scale: 5,
  },
  {
    id: "return_intent",
    vi: "Bạn có muốn quay lại Chợ Neo không?",
    en: "How likely are you to come back?",
    scale: 10,
  },
];

const MUSIC_RATING_QUESTIONS: RatingQuestion[] = [
  {
    id: "music_alive",
    vi: "Nhạc có làm Chợ Neo có hồn hơn không?",
    en: "Did the music make Chợ Neo feel more alive?",
    scale: 5,
  },
  {
    id: "music_matches_mood",
    vi: "Nhạc có hợp với không khí làng không?",
    en: "Did the music match the village mood?",
    scale: 5,
  },
  {
    id: "music_stay_longer",
    vi: "Nhạc có làm bạn muốn ở lại lâu hơn không?",
    en: "Did the music make you want to stay longer?",
    scale: 5,
  },
];

const MUSIC_OPTION_QUESTIONS: OptionQuestion[] = [
  {
    id: "music_too_much",
    vi: "Nhạc có bị phiền, nặng, hoặc quá nhiều không?",
    en: "Was the music distracting, heavy, or too much?",
    options: ["Không", "Hơi hơi", "Có"],
  },
  {
    id: "music_direction",
    vi: "Bạn thích hướng nhạc nào hơn?",
    options: [
      "Truyền thống Việt nhiều hơn",
      "Điện tử nhẹ / floating hơn",
      "Dàn dây cello/viola/bass nhiều hơn",
      "Nhẹ hơn, ít nhạc cụ hơn",
      "Sôi động hơn một chút",
      "Không cần đổi",
    ],
  },
];

type ChoNeoBetaFeedbackProps = {
  presentation?: "default" | "rect";
};

export function ChoNeoBetaFeedback({
  presentation = "default",
}: ChoNeoBetaFeedbackProps = {}) {
  const pathname = usePathname();
  const room = useMemo(() => inferChoNeoRoomFromPath(pathname), [pathname]);
  const feedbackButtonClassName =
    presentation === "rect"
      ? "cho-neo-feedback-button cho-neo-feedback-button-rect"
      : "cho-neo-feedback-button";
  const [isOpen, setIsOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [comments, setComments] = useState({
    confusing: "",
    favorite: "",
    fixFirst: "",
    musicFeeling: "",
  });
  const [contact, setContact] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );
  const [includeMusic, setIncludeMusic] = useState(pathname === "/cho-neo");

  const roomQuestions = useMemo(() => getRoomQuestions(room), [room]);

  useEffect(() => {
    trackChoNeoBetaEvent("cho_neo_page_view", { room });
    if (room === "ong-dia-shrine") {
      trackChoNeoBetaEvent("ong_dia_opened", { room });
    }
    if (room === "show-off-gallery") {
      trackChoNeoBetaEvent("khoe_set_opened", { room });
    }
  }, [room]);

  useEffect(() => {
    if (getLocalFeedbackMock() === "resumed-vote") {
      setIsOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || getLocalFeedbackMock() !== "resumed-vote") return;
    window.setTimeout(() => {
      document
        .getElementById("cho-neo-room-vote")
        ?.scrollIntoView({ block: "start" });
    }, 150);
  }, [isOpen]);

  useEffect(() => {
    setIncludeMusic(pathname === "/cho-neo" || hasChoNeoMusicActivity());
  }, [pathname, isOpen]);

  useEffect(() => {
    function handleOpenRoomVote() {
      setIsOpen(true);
      setStatus("idle");
      trackChoNeoBetaEvent("feedback_opened", {
        room,
        details: { section: "room-vote" },
      });
      window.setTimeout(() => {
        document
          .getElementById("cho-neo-room-vote")
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 120);
    }

    window.addEventListener(CHO_NEO_ROOM_VOTE_OPEN_EVENT, handleOpenRoomVote);

    return () => {
      window.removeEventListener(
        CHO_NEO_ROOM_VOTE_OPEN_EVENT,
        handleOpenRoomVote,
      );
    };
  }, [room]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    const originalPosition = document.body.style.position;
    const originalTop = document.body.style.top;
    const originalWidth = document.body.style.width;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const scrollY = window.scrollY;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.documentElement.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        trackChoNeoBetaEvent("feedback_closed", { room });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.width = originalWidth;
      document.documentElement.style.overflow = originalHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, room]);

  function openFeedback() {
    setIsOpen(true);
    setStatus("idle");
    trackChoNeoBetaEvent("feedback_opened", { room });
  }

  function closeFeedback() {
    setIsOpen(false);
    trackChoNeoBetaEvent("feedback_closed", { room });
  }

  async function submitFeedback() {
    setStatus("saving");

    try {
      const response = await fetch("/api/cho-neo/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          timestamp: new Date().toISOString(),
          path: pathname,
          room,
          deviceType: getChoNeoDeviceType(),
          anonymousSessionId: getChoNeoBetaSessionId(),
          musicIncluded: includeMusic,
          answers,
          comments,
          contact,
        }),
      });

      if (!response.ok) {
        throw new Error("Feedback save failed");
      }

      setStatus("saved");
      trackChoNeoBetaEvent("feedback_submitted", {
        room,
        details: { musicIncluded: includeMusic },
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        className={feedbackButtonClassName}
        onClick={openFeedback}
        type="button"
      >
        <span>Góp ý</span>
        <small>Feedback</small>
      </button>

      {isOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              aria-modal="true"
              className="cho-neo-feedback-modal"
              role="dialog"
            >
              <div className="feedback-backdrop" onClick={closeFeedback} />
              <section className="feedback-card">
                <header className="feedback-header">
                  <div>
                    <p>Góp ý nhanh cho Chợ Neo</p>
                    <span>
                      Chấm nhanh vài câu thôi. Nếu muốn nói thêm, có ô viết bên
                      dưới.
                    </span>
                  </div>
                  <button
                    aria-label="Đóng góp ý"
                    onClick={closeFeedback}
                    type="button"
                  >
                    ×
                  </button>
                </header>

                <div className="feedback-scroll">
                  <FeedbackQuestionList
                    answers={answers}
                    onAnswer={setAnswers}
                    questions={CORE_QUESTIONS}
                  />

                  <ChoNeoRoomVoteSection />

                  {roomQuestions.rating.length > 0 ||
                  roomQuestions.options.length > 0 ? (
                    <section className="feedback-section">
                      <h3>Câu hỏi theo phòng</h3>
                      <FeedbackQuestionList
                        answers={answers}
                        onAnswer={setAnswers}
                        questions={roomQuestions.rating}
                      />
                      <FeedbackOptionList
                        answers={answers}
                        onAnswer={setAnswers}
                        questions={roomQuestions.options}
                      />
                    </section>
                  ) : null}

                  {includeMusic ? (
                    <section className="feedback-section">
                      <h3>Nhạc làng</h3>
                      <FeedbackQuestionList
                        answers={answers}
                        onAnswer={setAnswers}
                        questions={MUSIC_RATING_QUESTIONS}
                      />
                      <FeedbackOptionList
                        answers={answers}
                        onAnswer={setAnswers}
                        questions={MUSIC_OPTION_QUESTIONS}
                      />
                      <label className="feedback-textarea">
                        <span>
                          Nghe nhạc xong bạn thấy Chợ Neo giống nơi nào?
                        </span>
                        <textarea
                          maxLength={600}
                          onChange={(event) =>
                            setComments((current) => ({
                              ...current,
                              musicFeeling: event.target.value,
                            }))
                          }
                          placeholder="Ví dụ: ấm, thiêng, buồn, sang, quê, hiện đại, hơi nặng, hơi giả..."
                          value={comments.musicFeeling}
                        />
                      </label>
                    </section>
                  ) : null}

                  <section className="feedback-section">
                    <h3>Nói thêm nếu muốn</h3>
                    <FeedbackTextArea
                      label="Chỗ nào làm bạn khó hiểu?"
                      onChange={(value) =>
                        setComments((current) => ({
                          ...current,
                          confusing: value,
                        }))
                      }
                      value={comments.confusing}
                    />
                    <FeedbackTextArea
                      label="Chỗ nào làm bạn thích nhất?"
                      onChange={(value) =>
                        setComments((current) => ({
                          ...current,
                          favorite: value,
                        }))
                      }
                      value={comments.favorite}
                    />
                    <FeedbackTextArea
                      label="Muốn Chợ Neo sửa gì trước?"
                      onChange={(value) =>
                        setComments((current) => ({
                          ...current,
                          fixFirst: value,
                        }))
                      }
                      value={comments.fixFirst}
                    />
                    <label className="feedback-contact">
                      <span>Tên/email nếu muốn tụi mình hỏi thêm</span>
                      <input
                        maxLength={160}
                        onChange={(event) => setContact(event.target.value)}
                        value={contact}
                      />
                    </label>
                  </section>
                </div>

                <footer className="feedback-footer">
                  {status === "saved" ? (
                    <p>
                      Cảm ơn nha. Góp ý này giúp Chợ Neo lớn lên đàng hoàng hơn.
                    </p>
                  ) : status === "error" ? (
                    <p>Chưa lưu được góp ý. Thử lại giúp Chợ Neo một nhịp nha.</p>
                  ) : (
                    <p>Góp ý này riêng tư, không đăng ra bàn chung.</p>
                  )}
                  <button
                    disabled={status === "saving" || status === "saved"}
                    onClick={submitFeedback}
                    type="button"
                  >
                    {status === "saving" ? "Đang lưu..." : "Gửi góp ý"}
                  </button>
                </footer>
              </section>
            </div>,
            document.body
          )
        : null}

      <style>{`
        .cho-neo-feedback-button {
          position: static;
          z-index: 80;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 1px;
          width: 56px;
          min-height: 56px;
          padding: 6px 5px;
          border: 1px solid rgba(248, 211, 145, 0.3);
          border-radius: 999px;
          color: var(--cho-neo-text-primary);
          background:
            radial-gradient(circle at 50% 24%, rgba(255, 214, 222, 0.2), transparent 20%),
            linear-gradient(180deg, rgba(73, 35, 45, 0.9), rgba(16, 9, 18, 0.94));
          box-shadow:
            0 7px 18px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 247, 237, 0.1);
          cursor: pointer;
          font: inherit;
          font-weight: 600;
          line-height: 1;
        }

        .cho-neo-feedback-button::before {
          content: "♥";
          display: block;
          color: #ffd4dc;
          font-size: 22px;
          line-height: 0.9;
          text-shadow: 0 4px 12px rgba(255, 166, 180, 0.18);
        }

        .cho-neo-feedback-button span {
          font-size: 10.5px;
          font-weight: 500;
        }

        .cho-neo-feedback-button small {
          display: none;
        }

        .cho-neo-feedback-button-rect {
          box-sizing: border-box;
          flex-direction: row;
          gap: 6px;
          width: auto;
          min-width: 78px;
          height: 44px;
          min-height: 44px;
          max-height: 44px;
          padding: 0 11px;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 10px;
          color: var(--room-pass2-text-secondary);
          background: rgba(255, 247, 237, 0.055);
          box-shadow: none;
          font-size: 11px;
          font-weight: 500;
          text-shadow: none;
        }

        .cho-neo-feedback-button-rect::before {
          content: "♡";
          color: #efb8aa;
          font-size: 13px;
          line-height: 1;
          text-shadow: none;
        }

        .cho-neo-feedback-button-rect span {
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
        }

        .cho-neo-feedback-modal {
          position: fixed;
          inset: 0;
          z-index: 100;
          box-sizing: border-box;
          display: grid;
          place-items: center;
          padding:
            max(24px, env(safe-area-inset-top))
            max(24px, env(safe-area-inset-right))
            max(24px, env(safe-area-inset-bottom))
            max(24px, env(safe-area-inset-left));
          overflow: hidden;
        }

        .cho-neo-feedback-modal * {
          box-sizing: border-box;
        }

        .feedback-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(3, 7, 18, 0.68);
          backdrop-filter: blur(10px);
        }

        .feedback-card {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          width: min(760px, calc(100vw - 48px));
          min-width: 0;
          max-height: min(780px, 90svh, calc(100svh - 48px));
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 26px;
          color: #3a2418;
          font-family: var(--cho-neo-font-ui);
          font-weight: 400;
          background:
            radial-gradient(circle at 12% 0%, rgba(251, 191, 36, 0.18), transparent 30%),
            linear-gradient(180deg, #fff7ed, #fdeccf);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
        }

        .feedback-header,
        .feedback-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 15px 16px;
          border-color: rgba(120, 53, 15, 0.14);
          flex: 0 0 auto;
        }

        .feedback-header {
          border-bottom: 1px solid rgba(120, 53, 15, 0.14);
        }

        .feedback-footer {
          border-top: 1px solid rgba(120, 53, 15, 0.14);
          position: relative;
          z-index: 2;
          background: rgba(255, 247, 237, 0.9);
          backdrop-filter: blur(8px);
        }

        .feedback-header p,
        .feedback-footer p {
          min-width: 0;
          margin: 0;
          overflow-wrap: anywhere;
        }

        .feedback-header p {
          color: #7c2d12;
          font-size: 20px;
          font-family: var(--cho-neo-font-display);
          font-weight: 500;
        }

        .feedback-header span,
        .feedback-footer p {
          min-width: 0;
          color: rgba(58, 36, 24, 0.72);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .feedback-header button,
        .feedback-footer button {
          border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 600;
        }

        .feedback-header button {
          display: grid;
          flex: 0 0 auto;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          color: #7c2d12;
          background: rgba(120, 53, 15, 0.09);
          font-size: 24px;
        }

        .feedback-footer button {
          flex: 0 0 auto;
          min-height: 42px;
          padding: 10px 14px;
          border-radius: 999px;
          color: var(--cho-neo-text-primary);
          background: linear-gradient(180deg, #9a3412, #7c2d12);
        }

        .feedback-footer button:disabled {
          cursor: default;
          opacity: 0.64;
        }

        .feedback-scroll {
          display: grid;
          gap: 14px;
          min-height: 0;
          min-width: 0;
          padding: 14px 16px 88px;
          overscroll-behavior: contain;
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-gutter: stable;
        }

        .feedback-section {
          display: grid;
          gap: 10px;
          min-width: 0;
        }

        .feedback-section h3 {
          margin: 0;
          color: #7c2d12;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
          overflow-wrap: anywhere;
        }

        .feedback-question,
        .room-vote-card,
        .feedback-textarea,
        .feedback-contact {
          display: grid;
          gap: 7px;
          min-width: 0;
          padding: 10px;
          border: 1px solid rgba(120, 53, 15, 0.11);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.52);
        }

        .room-vote-section {
          scroll-margin-top: 16px;
        }

        .room-vote-intro {
          margin: 0;
          color: rgba(67, 20, 7, 0.72);
          font-size: 13px;
          font-weight: 400;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .room-vote-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .room-vote-card {
          align-content: start;
          gap: 9px;
          min-height: 0;
          border-radius: 14px;
        }

        .room-vote-card.selected {
          border-color: rgba(154, 52, 18, 0.44);
          background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.9), rgba(255, 255, 255, 0.62));
          box-shadow: inset 0 0 0 1px rgba(154, 52, 18, 0.16);
        }

        .room-vote-card header {
          display: grid;
          gap: 2px;
        }

        .room-vote-card strong {
          color: #431407;
          font-size: 15px;
          font-weight: 600;
          line-height: 1.18;
          overflow-wrap: anywhere;
        }

        .room-vote-card small {
          color: rgba(67, 20, 7, 0.62);
          font-size: 11px;
          font-weight: 400;
          overflow-wrap: anywhere;
        }

        .room-vote-card p {
          margin: 0;
          color: rgba(67, 20, 7, 0.76);
          font-size: 12.5px;
          font-weight: 400;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }

        .room-vote-card footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          min-width: 0;
        }

        .room-vote-card button,
        .room-vote-change,
        .room-vote-retry,
        .room-vote-reason-actions button {
          min-height: 36px;
          border: 1px solid rgba(120, 53, 15, 0.16);
          border-radius: 999px;
          color: #7c2d12;
          background: rgba(255, 247, 237, 0.86);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          white-space: normal;
        }

        .room-vote-card button {
          padding: 7px 10px;
        }

        .room-vote-card button.selected {
          color: var(--cho-neo-text-primary);
          background: #9a3412;
        }

        .room-vote-card button:disabled,
        .room-vote-reason-actions button:disabled {
          cursor: default;
          opacity: 0.68;
        }

        .room-vote-result {
          color: rgba(67, 20, 7, 0.62);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }

        .room-vote-attention {
          display: inline-flex;
          width: fit-content;
          padding: 3px 7px;
          border-radius: 999px;
          color: #7c2d12;
          background: rgba(251, 191, 36, 0.2);
          font-size: 11px;
          font-weight: 600;
        }

        .room-vote-selection {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px;
          border: 1px solid rgba(154, 52, 18, 0.16);
          border-radius: 14px;
          background: rgba(154, 52, 18, 0.07);
        }

        .room-vote-selection p,
        .room-vote-disclosure p,
        .room-vote-status {
          margin: 0;
          color: rgba(67, 20, 7, 0.76);
          font-size: 12.5px;
          font-weight: 500;
          line-height: 1.35;
        }

        .room-vote-selection strong {
          color: #7c2d12;
        }

        .room-vote-change,
        .room-vote-retry {
          flex: 0 0 auto;
          padding: 7px 10px;
        }

        .room-vote-reason {
          display: grid;
          gap: 7px;
          padding: 10px;
          border: 1px solid rgba(120, 53, 15, 0.11);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.48);
        }

        .room-vote-reason span {
          color: #431407;
          font-size: 13px;
          font-weight: 600;
        }

        .room-vote-reason textarea {
          width: 100%;
          min-height: 64px;
          padding: 9px;
          border: 1px solid rgba(120, 53, 15, 0.16);
          border-radius: 12px;
          color: #431407;
          background: rgba(255, 247, 237, 0.9);
          font: inherit;
          font-size: 13px;
          resize: vertical;
        }

        .room-vote-reason-meta,
        .room-vote-total {
          color: rgba(67, 20, 7, 0.58);
          font-size: 11px;
          font-weight: 500;
        }

        .room-vote-reason-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px;
        }

        .room-vote-reason-actions button {
          padding: 7px 11px;
        }

        .room-vote-disclosure {
          display: grid;
          gap: 4px;
          padding: 10px;
          border: 1px dashed rgba(120, 53, 15, 0.22);
          border-radius: 14px;
          background: rgba(255, 247, 237, 0.5);
        }

        .room-vote-status.error {
          color: #991b1b;
        }

        .feedback-question p,
        .feedback-textarea span,
        .feedback-contact span {
          margin: 0;
          color: #431407;
          font-size: 14px;
          font-weight: 600;
          line-height: 1.25;
        }

        .feedback-question small {
          color: rgba(67, 20, 7, 0.62);
          font-size: 11px;
          font-weight: 400;
        }

        .feedback-scale,
        .feedback-options {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .feedback-scale button,
        .feedback-options button {
          min-height: 34px;
          border: 1px solid rgba(120, 53, 15, 0.16);
          border-radius: 999px;
          color: #7c2d12;
          background: rgba(255, 247, 237, 0.82);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 600;
        }

        .feedback-scale button {
          width: 34px;
        }

        .feedback-options button {
          padding: 7px 10px;
        }

        .feedback-scale .selected,
        .feedback-options .selected {
          color: var(--cho-neo-text-primary);
          background: #9a3412;
        }

        .feedback-textarea textarea,
        .feedback-contact input {
          width: 100%;
          border: 1px solid rgba(120, 53, 15, 0.16);
          border-radius: 13px;
          color: #431407;
          background: rgba(255, 247, 237, 0.9);
          font: inherit;
          font-size: 14px;
        }

        .feedback-textarea textarea {
          min-height: 70px;
          padding: 10px;
          resize: vertical;
        }

        .feedback-contact input {
          min-height: 40px;
          padding: 0 10px;
        }

        @media (max-width: 640px) {
          .cho-neo-feedback-button {
            position: relative;
            width: 52px;
            min-width: 52px;
            min-height: 52px;
            padding: 6px 5px;
            border-radius: 999px;
            flex-direction: column;
            gap: 1px;
          }

          .cho-neo-feedback-button::before {
            font-size: 19px;
          }

          .cho-neo-feedback-button span {
            font-size: 9.5px;
          }

          .cho-neo-feedback-button small {
            display: none;
          }

          .cho-neo-feedback-button-rect {
            position: static;
            flex-direction: row;
            gap: 6px;
            width: auto;
            min-width: 78px;
            height: 44px;
            min-height: 44px;
            max-height: 44px;
            padding: 0 11px;
            border-radius: 10px;
          }

          .cho-neo-feedback-button-rect::before {
            font-size: 13px;
          }

          .cho-neo-feedback-button-rect span {
            font-size: 11px;
          }

          .cho-neo-feedback-modal {
            align-items: end;
            padding:
              max(12px, env(safe-area-inset-top))
              max(12px, env(safe-area-inset-right))
              max(12px, env(safe-area-inset-bottom))
              max(12px, env(safe-area-inset-left));
          }

          .feedback-card {
            width: min(100%, calc(100vw - 24px));
            max-height: min(760px, 92svh, calc(100svh - 24px));
            border-radius: 22px;
          }

          .feedback-header,
          .feedback-footer {
            align-items: flex-start;
            flex-direction: column;
            padding: 13px;
          }

          .feedback-header {
            position: relative;
            padding-right: 54px;
          }

          .feedback-header button {
            position: absolute;
            top: 10px;
            right: 10px;
          }

          .feedback-footer button {
            width: 100%;
          }

          .feedback-scroll {
            padding: 12px 13px 96px;
          }

          .room-vote-grid {
            grid-template-columns: 1fr;
          }

          .room-vote-card footer {
            align-items: stretch;
            flex-direction: column;
          }

          .room-vote-card button {
            width: 100%;
            min-height: 40px;
          }

          .room-vote-selection {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-height: 700px) and (min-width: 641px) {
          .feedback-card {
            max-height: calc(100svh - 48px);
          }

          .feedback-scroll {
            padding-bottom: 96px;
          }
        }
      `}</style>
    </>
  );
}

function ChoNeoRoomVoteSection() {
  const supabase = useMemo(() => createClient(), []);
  const { ensureChoNeoMember } = useChoNeoMember();
  const [presentation, setPresentation] =
    useState<ChoNeoRoomVotePresentation | null>(null);
  const [loadStatus, setLoadStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "updated" | "error"
  >("idle");
  const [reason, setReason] = useState("");
  const [reasonNotice, setReasonNotice] = useState("");

  useEffect(() => {
    if (getLocalRoomVoteMock() === "resumed-vote") {
      setPresentation(
        buildChoNeoRoomVotePresentation({
          rows: [{ option_key: "nail-tech-corner" }],
          selection: {
            option_key: "nail-tech-corner",
            optional_reason: "Muốn học nghề cùng nhau.",
          },
        }),
      );
      setReason("Muốn học nghề cùng nhau.");
      setLoadStatus("ready");
      setSaveStatus("saved");
      return;
    }

    void loadVotePresentation();
  }, []);

  const selectedOptionKey = presentation?.selection?.optionKey ?? null;

  async function loadVotePresentation() {
    setLoadStatus("loading");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/cho-neo/room-vote", {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!response.ok) {
        throw new Error("Room vote load failed");
      }

      const next = (await response.json()) as ChoNeoRoomVotePresentation;
      setPresentation(next);
      setReason(next.selection?.optionalReason ?? "");
      setLoadStatus("ready");
    } catch {
      setLoadStatus("error");
    }
  }

  async function submitVote(
    optionKey: ChoNeoRoomVoteOptionKey,
    nextReason = reason,
  ) {
    await ensureChoNeoMember(async () => {
      await persistVote(optionKey, nextReason);
    });
  }

  async function persistVote(
    optionKey: ChoNeoRoomVoteOptionKey,
    nextReason = reason,
  ) {
    const wasSelected = Boolean(selectedOptionKey);
    setSaveStatus("saving");
    setReasonNotice("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        throw new Error("Missing Cho Neo pass session");
      }

      const response = await fetch("/api/cho-neo/room-vote", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          pollKey: CHO_NEO_ROOM_VOTE_POLL_KEY,
          optionKey,
          optionalReason: sanitizeChoNeoRoomVoteReason(nextReason),
        }),
      });

      if (!response.ok) {
        throw new Error("Room vote save failed");
      }

      const next = (await response.json()) as ChoNeoRoomVotePresentation;
      setPresentation(next);
      setReason(next.selection?.optionalReason ?? "");
      setSaveStatus(wasSelected ? "updated" : "saved");
    } catch {
      setSaveStatus("error");
    }
  }

  async function saveReason() {
    if (!selectedOptionKey) return;
    await submitVote(selectedOptionKey, reason);
    setReasonNotice("Đã lưu lý do riêng tư.");
  }

  async function skipReason() {
    if (!selectedOptionKey) return;
    setReason("");
    await submitVote(selectedOptionKey, "");
    setReasonNotice("Đã bỏ qua lý do.");
  }

  function focusOtherChoices() {
    document.querySelector<HTMLButtonElement>(".room-vote-card:not(.selected) button")?.focus();
  }

  return (
    <section
      className="feedback-section room-vote-section"
      id="cho-neo-room-vote"
    >
      <h3>Góc Bình Chọn — Mở gì trước?</h3>
      <p className="room-vote-intro">
        Chọn một phòng bạn muốn Chợ Neo ưu tiên nghiên cứu tiếp. Không cần đăng
        nhập hay để lại liên hệ.
      </p>

      {loadStatus === "error" ? (
        <div className="room-vote-disclosure" role="status">
          <p>Chưa lấy được bình chọn. Chợ Neo không tự bịa số.</p>
          <button
            className="room-vote-retry"
            onClick={loadVotePresentation}
            type="button"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      <div className="room-vote-grid">
        {CHO_NEO_ROOM_VOTE_OPTIONS.map((option) => {
          const isSelected = option.key === selectedOptionKey;
          const result = presentation?.results.find(
            (item) => item.key === option.key,
          );

          return (
            <article
              aria-current={isSelected ? "true" : undefined}
              className={isSelected ? "room-vote-card selected" : "room-vote-card"}
              key={option.key}
            >
              <header>
                <strong>{option.title}</strong>
                <small>{option.englishTitle}</small>
              </header>
              <p>{option.description}</p>
              {result?.attentionLabel ? (
                <span className="room-vote-attention">{result.attentionLabel}</span>
              ) : null}
              <footer>
                <RoomVoteResult result={result} />
                <button
                  aria-label={
                    isSelected
                      ? `Đã chọn ${option.title}`
                      : `Tôi muốn phòng ${option.title}`
                  }
                  className={isSelected ? "selected" : ""}
                  disabled={isSelected || saveStatus === "saving"}
                  onClick={() => submitVote(option.key)}
                  type="button"
                >
                  {isSelected ? "Đã chọn" : "Tôi muốn phòng này"}
                </button>
              </footer>
            </article>
          );
        })}
      </div>

      {presentation?.selection ? (
        <div className="room-vote-selection" role="status">
          <p>
            Bạn đã chọn: <strong>{presentation.selection.title}</strong>
          </p>
          <button
            className="room-vote-change"
            onClick={focusOtherChoices}
            type="button"
          >
            Đổi lựa chọn
          </button>
        </div>
      ) : null}

      {presentation?.selection ? (
        <label className="room-vote-reason">
          <span>Vì sao bạn muốn mở phòng này?</span>
          <textarea
            aria-describedby="room-vote-reason-meta"
            maxLength={CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonNotice("");
            }}
            value={reason}
          />
          <span className="room-vote-reason-meta" id="room-vote-reason-meta">
            Riêng tư, tối đa {CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH} ký tự, không
            nhận link hay HTML. {reason.length}/{CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH}
          </span>
          <span className="room-vote-reason-actions">
            <button
              disabled={saveStatus === "saving"}
              onClick={saveReason}
              type="button"
            >
              Lưu lý do
            </button>
            <button
              disabled={saveStatus === "saving"}
              onClick={skipReason}
              type="button"
            >
              Bỏ qua
            </button>
          </span>
        </label>
      ) : null}

      <div className="room-vote-disclosure">
        {presentation?.disclosure.state === "public" ? (
          <span className="room-vote-total">
            Tổng lượt tham gia: {presentation.disclosure.totalVotes}
          </span>
        ) : (
          <span className="room-vote-total">Đang lấy ý kiến</span>
        )}
        <p>Phiếu bình chọn giúp Chợ Neo chọn hướng phát triển tiếp theo.</p>
        <p>Kết quả không phải cam kết mở phòng ngay.</p>
      </div>

      {saveStatus === "saved" ? (
        <p className="room-vote-status" role="status">
          Đã ghi nhận lựa chọn của bạn.
        </p>
      ) : saveStatus === "updated" ? (
        <p className="room-vote-status" role="status">
          Đã cập nhật lựa chọn.
        </p>
      ) : saveStatus === "error" ? (
        <p className="room-vote-status error" role="alert">
          Chưa lưu được bình chọn. Thử lại giúp Chợ Neo một nhịp nha.
        </p>
      ) : loadStatus === "loading" ? (
        <p className="room-vote-status" role="status">
          Đang lấy ý kiến...
        </p>
      ) : reasonNotice ? (
        <p className="room-vote-status" role="status">
          {reasonNotice}
        </p>
      ) : null}
    </section>
  );
}

function getLocalRoomVoteMock() {
  if (typeof window === "undefined") return "";
  if (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "";
  }
  return new URLSearchParams(window.location.search).get("choNeoMemberMock") ?? "";
}

function getLocalFeedbackMock() {
  if (typeof window === "undefined") return "";
  if (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return "";
  }
  return new URLSearchParams(window.location.search).get("choNeoFeedbackMock") ?? "";
}

function RoomVoteResult({
  result,
}: {
  result?: ChoNeoRoomVotePublicResult;
}) {
  if (!result || result.statusLabel) {
    return <span className="room-vote-result">Đang lấy ý kiến</span>;
  }

  return (
    <span className="room-vote-result">
      Hạng {result.rank} · {result.percentage}%
    </span>
  );
}

function FeedbackQuestionList({
  answers,
  onAnswer,
  questions,
}: {
  answers: Record<string, number | string>;
  onAnswer: (answers: Record<string, number | string>) => void;
  questions: RatingQuestion[];
}) {
  return (
    <>
      {questions.map((question) => (
        <div className="feedback-question" key={question.id}>
          <p>{question.vi}</p>
          <small>{question.en}</small>
          <div className="feedback-scale">
            {Array.from({ length: question.scale }, (_, index) => index + 1).map(
              (value) => (
                <button
                  className={answers[question.id] === value ? "selected" : ""}
                  key={value}
                  onClick={() => onAnswer({ ...answers, [question.id]: value })}
                  type="button"
                >
                  {value}
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function FeedbackOptionList({
  answers,
  onAnswer,
  questions,
}: {
  answers: Record<string, number | string>;
  onAnswer: (answers: Record<string, number | string>) => void;
  questions: OptionQuestion[];
}) {
  return (
    <>
      {questions.map((question) => (
        <div className="feedback-question" key={question.id}>
          <p>{question.vi}</p>
          {question.en ? <small>{question.en}</small> : null}
          <div className="feedback-options">
            {question.options.map((option) => (
              <button
                className={answers[question.id] === option ? "selected" : ""}
                key={option}
                onClick={() => onAnswer({ ...answers, [question.id]: option })}
                type="button"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function FeedbackTextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="feedback-textarea">
      <span>{label}</span>
      <textarea
        maxLength={800}
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function getRoomQuestions(room: string) {
  const rating: RatingQuestion[] = [];
  const options: OptionQuestion[] = [];

  if (room === "gossip-cafe") {
    rating.push(
      {
        id: "gossip_read_interest",
        vi: "Bạn có muốn đọc chuyện trong Quán Tám không?",
        en: "I want to read table talk in Gossip Café.",
        scale: 5,
      },
      {
        id: "gossip_easy_to_write",
        vi: "Bạn có thấy dễ để viết một câu góp chuyện không?",
        en: "It feels easy to add a note.",
        scale: 5,
      },
      {
        id: "gossip_fun_not_chaotic",
        vi: "Quán Tám có vui mà vẫn không quá hỗn loạn không?",
        en: "Gossip Café feels lively without being chaotic.",
        scale: 5,
      }
    );
  }

  if (room === "ong-dia-shrine") {
    rating.push({
      id: "ong_dia_warm_charming",
      vi: "Ông Địa trả lời có ấm và có duyên không?",
      en: "Ong Dia feels warm and charming.",
      scale: 5,
    });
    options.push({
      id: "ong_dia_too_ai_spiritual",
      vi: "Câu trả lời có giống AI giả bộ tâm linh quá không?",
      options: ["Không", "Hơi hơi", "Có"],
    });
  }

  if (room === "show-off-gallery") {
    rating.push(
      {
        id: "showoff_want_view_sets",
        vi: "Bạn có muốn xem set móng của người khác không?",
        en: "I want to see other nail sets.",
        scale: 5,
      },
      {
        id: "showoff_want_post",
        vi: "Bạn có muốn khoe set của mình không?",
        en: "I want to share my own set.",
        scale: 5,
      },
      {
        id: "showoff_beautiful_trustworthy",
        vi: "Phòng này có cảm giác đẹp và đáng tin không?",
        en: "This room feels beautiful and trustworthy.",
        scale: 5,
      }
    );
  }

  if (room === "village-map") {
    rating.push(
      {
        id: "map_explore_interest",
        vi: "Bản đồ làng có làm bạn muốn khám phá không?",
        en: "The village map makes me want to explore.",
        scale: 5,
      },
      {
        id: "map_room_names_clear",
        vi: "Tên các phòng có dễ hiểu không?",
        en: "The room names are easy to understand.",
        scale: 5,
      },
      {
        id: "map_icons_clickable",
        vi: "Icon trên bản đồ có dễ biết là bấm được không?",
        en: "The map icons feel clickable.",
        scale: 5,
      }
    );
  }

  return { rating, options };
}
