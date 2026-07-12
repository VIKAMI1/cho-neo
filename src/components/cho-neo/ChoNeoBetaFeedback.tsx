"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  getChoNeoBetaSessionId,
  getChoNeoDeviceType,
  hasChoNeoMusicActivity,
  inferChoNeoRoomFromPath,
  trackChoNeoBetaEvent,
} from "@/lib/cho-neo/beta-analytics";

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

export function ChoNeoBetaFeedback() {
  const pathname = usePathname();
  const room = useMemo(() => inferChoNeoRoomFromPath(pathname), [pathname]);
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
    setIncludeMusic(pathname === "/cho-neo" || hasChoNeoMusicActivity());
  }, [pathname, isOpen]);

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
        className="cho-neo-feedback-button"
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
          color: #ffe7b7;
          background:
            radial-gradient(circle at 50% 24%, rgba(255, 214, 222, 0.2), transparent 20%),
            linear-gradient(180deg, rgba(73, 35, 45, 0.9), rgba(16, 9, 18, 0.94));
          box-shadow:
            0 7px 18px rgba(0, 0, 0, 0.18),
            inset 0 1px 0 rgba(255, 247, 237, 0.1);
          cursor: pointer;
          font: inherit;
          font-weight: 850;
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
          font-weight: 820;
        }

        .cho-neo-feedback-button small {
          display: none;
        }

        .cho-neo-feedback-modal {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding:
            max(24px, env(safe-area-inset-top))
            max(24px, env(safe-area-inset-right))
            max(24px, env(safe-area-inset-bottom))
            max(24px, env(safe-area-inset-left));
          overflow: hidden;
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
          max-height: min(780px, 90svh, calc(100svh - 48px));
          min-height: 0;
          overflow: hidden;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 26px;
          color: #3a2418;
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
          margin: 0;
        }

        .feedback-header p {
          color: #7c2d12;
          font-size: 20px;
          font-weight: 950;
        }

        .feedback-header span,
        .feedback-footer p {
          color: rgba(58, 36, 24, 0.72);
          font-size: 13px;
          font-weight: 750;
          line-height: 1.35;
        }

        .feedback-header button,
        .feedback-footer button {
          border: 0;
          cursor: pointer;
          font: inherit;
          font-weight: 950;
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
          color: #fff7ed;
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
          padding: 14px 16px 88px;
          overscroll-behavior: contain;
          overflow-y: auto;
          scrollbar-gutter: stable;
        }

        .feedback-section {
          display: grid;
          gap: 10px;
        }

        .feedback-section h3 {
          margin: 0;
          color: #7c2d12;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .feedback-question,
        .feedback-textarea,
        .feedback-contact {
          display: grid;
          gap: 7px;
          padding: 10px;
          border: 1px solid rgba(120, 53, 15, 0.11);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.52);
        }

        .feedback-question p,
        .feedback-textarea span,
        .feedback-contact span {
          margin: 0;
          color: #431407;
          font-size: 14px;
          font-weight: 900;
          line-height: 1.25;
        }

        .feedback-question small {
          color: rgba(67, 20, 7, 0.62);
          font-size: 11px;
          font-weight: 750;
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
          font-weight: 950;
        }

        .feedback-scale button {
          width: 34px;
        }

        .feedback-options button {
          padding: 7px 10px;
        }

        .feedback-scale .selected,
        .feedback-options .selected {
          color: #fff7ed;
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

          .cho-neo-feedback-modal {
            align-items: end;
            padding:
              max(12px, env(safe-area-inset-top))
              max(10px, env(safe-area-inset-right))
              max(12px, env(safe-area-inset-bottom))
              max(10px, env(safe-area-inset-left));
          }

          .feedback-card {
            width: 100%;
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
