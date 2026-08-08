"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChoNeoBetaFeedback } from "@/components/cho-neo/ChoNeoBetaFeedback";
import { ChoNeoRoomShell } from "@/components/cho-neo/ChoNeoRoomShell";
import { useChoNeoMember } from "@/components/cho-neo/ChoNeoMemberProvider";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";
import {
  HOI_GI_DAY_FALLBACK,
  HOI_GI_DAY_QUESTION_MAX_LENGTH,
  type HoiGiDayDestination,
  type HoiGiDayFeedbackType,
  type HoiGiDayTopic,
} from "@/lib/cho-neo/hoi-gi-day";

type HoiGiDayAnswer = {
  answerId: string;
  answerSource: "neopao" | "community" | "reviewed";
  answerText: string;
  createdAt: string;
};

type HoiGiDayQuestion = {
  answers: HoiGiDayAnswer[];
  createdAt: string;
  destination: HoiGiDayDestination;
  questionId: string;
  questionText: string;
  questionTopic: HoiGiDayTopic;
  continuation?: { href: string; label: string } | null;
};

type FeedbackDraft = {
  contribution: string;
  status: "idle" | "saving" | "saved" | "error";
  type: HoiGiDayFeedbackType;
};

const QUESTION_CHIPS = [
  ["Lifting", "nail_technique"],
  ["Khách trễ", "customer_service"],
  ["Sản phẩm", "nail_products"],
  ["Giá dịch vụ", "salon_operations"],
  ["Giữ thợ", "workplace_experience"],
  ["Khách khó", "customer_service"],
] as const;

const API_URL = "/api/cho-neo/hoi-gi-day/questions";

export default function HoiChoNeoPage() {
  const { ensureChoNeoMember, profile, session } = useChoNeoMember();
  const [questionTopic, setQuestionTopic] = useState<HoiGiDayTopic>("general");
  const [questionText, setQuestionText] = useState("");
  const [questions, setQuestions] = useState<HoiGiDayQuestion[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<HoiGiDayQuestion | null>(null);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, FeedbackDraft>>({});
  const [openFeedbackAnswerId, setOpenFeedbackAnswerId] = useState<string | null>(null);
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch(API_URL, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { questions?: HoiGiDayQuestion[] } | null) => {
        if (!cancelled && Array.isArray(payload?.questions)) setQuestions(payload.questions);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  function chooseChip(label: string, topic: HoiGiDayTopic) {
    setQuestionText(label);
    setQuestionTopic(topic);
  }

  async function submitQuestion() {
    setIsSaving(true);
    setNotice("");

    try {
      const response = await fetch(API_URL, {
        body: JSON.stringify({
          action: "ask",
          destination: "neopao",
          questionText,
          questionTopic,
        }),
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setNotice(payload?.error ?? "Câu hỏi chưa gửi được. Thử lại một nhịp nha.");
        return;
      }

      const nextQuestion = payload?.question as HoiGiDayQuestion | undefined;
      const nextAnswer = payload?.answer as HoiGiDayAnswer | undefined;
      if (nextQuestion) {
        const submittedQuestion = {
          ...nextQuestion,
          answers: nextAnswer ? [nextAnswer] : [],
        };
        setActiveQuestion(submittedQuestion);
        setQuestions((current) => [submittedQuestion, ...current]);
      }
      setQuestionText("");
      setQuestionTopic("general");
      setNotice(
        nextAnswer?.answerText === HOI_GI_DAY_FALLBACK
          ? HOI_GI_DAY_FALLBACK
          : "NeoPao đã gửi gợi ý đầu tiên. Kiểm tra thêm với kinh nghiệm thực tế trước khi áp dụng.",
      );
    } catch {
      setNotice("Mạng vừa chậm một nhịp. Câu hỏi chưa gửi được, thử lại nha.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleQuestionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ensureChoNeoMember(submitQuestion);
  }

  function updateFeedbackDraft(answerId: string, update: Partial<FeedbackDraft>) {
    setFeedbackDrafts((current) => ({
      ...current,
      [answerId]: {
        contribution: current[answerId]?.contribution ?? "",
        status: current[answerId]?.status ?? "idle",
        type: current[answerId]?.type ?? "addition",
        ...update,
      },
    }));
  }

  async function submitFeedback(questionId: string, answerId: string) {
    const draft = feedbackDrafts[answerId];
    if (!draft) return;
    updateFeedbackDraft(answerId, { status: "saving" });

    try {
      const response = await fetch(API_URL, {
        body: JSON.stringify({
          action: "feedback",
          answerId,
          contributionText: draft.contribution,
          feedbackType: draft.type,
          questionId,
        }),
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        method: "POST",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        updateFeedbackDraft(answerId, { status: "error" });
        setNotice(payload?.error ?? "Góp ý chưa gửi được. Thử lại nha.");
        return;
      }
      updateFeedbackDraft(answerId, { status: "saved" });
      setNotice("Góp ý đã vào hàng chờ xem lại, chưa thay đổi câu trả lời.");
    } catch {
      updateFeedbackDraft(answerId, { status: "error" });
      setNotice("Mạng vừa chậm một nhịp. Góp ý chưa gửi được.");
    }
  }

  function chooseFeedback(questionId: string, answerId: string, type: HoiGiDayFeedbackType) {
    updateFeedbackDraft(answerId, { type, status: "idle" });
    if (type === "correct") {
      void ensureChoNeoMember(() => submitFeedback(questionId, answerId));
    }
  }

  function continueFromActive() {
    if (!activeQuestion) return;
    const context = `Tiếp chuyện câu hỏi "${activeQuestion.questionText}": `;
    setQuestionText((current) =>
      `${context}${current.trim()}`.slice(0, HOI_GI_DAY_QUESTION_MAX_LENGTH),
    );
    setQuestionTopic(activeQuestion.questionTopic);
    setNotice("");
    questionInputRef.current?.focus();
  }

  function answerFeedback(questionId: string, answer: HoiGiDayAnswer) {
    if (answer.answerSource !== "neopao") return null;
    if (openFeedbackAnswerId !== answer.answerId) return null;
    const draft = feedbackDrafts[answer.answerId];
    return (
      <div className="hoi-feedback" aria-label="Góp ý cho gợi ý NeoPao">
        <p className="hoi-feedback-prompt">Góp ý của bạn về câu trả lời này</p>
        <div className="hoi-feedback-actions">
          {(
              [
              ["correct", "Đúng"],
              ["addition", "Bổ sung"],
              ["correction", "Cần sửa"],
            ] as const
          ).map(([type, label]) => (
            <button
              className={draft?.type === type ? "is-selected" : ""}
              key={type}
              onClick={() => chooseFeedback(questionId, answer.answerId, type)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        {draft && (draft.type === "addition" || draft.type === "correction") ? (
          <div className="hoi-contribution">
            <label htmlFor={`hoi-contribution-${answer.answerId}`}>
              Bạn đã gặp trường hợp này ngoài tiệm như thế nào?
            </label>
            <textarea
              id={`hoi-contribution-${answer.answerId}`}
              maxLength={420}
              onChange={(event) => updateFeedbackDraft(answer.answerId, { contribution: event.target.value })}
              placeholder="Bạn đã gặp trường hợp này ngoài tiệm như thế nào?"
              value={draft.contribution}
            />
            <button
              className="hoi-submit-secondary"
              disabled={draft.status === "saving" || !draft.contribution.trim()}
              onClick={() => void ensureChoNeoMember(() => submitFeedback(questionId, answer.answerId))}
              type="button"
            >
              {draft.status === "saving" ? "Đang gửi..." : "Gửi góp ý"}
            </button>
            {draft.status === "saved" ? <small>Đã vào hàng chờ xem lại.</small> : null}
          </div>
        ) : null}
      </div>
    );
  }

  const recentQuestions = questions.filter(
    (question) => question.questionId !== activeQuestion?.questionId,
  );

  return (
    <>
      <ChoNeoTimeAmbience />
      <ChoNeoRoomShell currentNavId="hoi-cho-neo" className="hoi-gi-day-shell">
        <div className="hoi-gi-day-page">
          <header className="hoi-hero">
            <div className="hoi-header-actions" aria-label="Hỏi Chợ Neo controls">
              <Link className="hoi-back" href="/cho-neo">← Sân Làng</Link>
              <button className="hoi-login" onClick={() => ensureChoNeoMember(async () => undefined)} type="button">
                {profile ? profile.displayName : "Vào Chợ"}
              </button>
              <span className="cho-neo-shared-music-slot hoi-music" data-cho-neo-shared-music-slot />
              <ChoNeoBetaFeedback />
            </div>
            <h1>Hỏi Chợ Neo</h1>
            <p className="hoi-subtitle">Hỏi một chuyện nghề. NeoPao trả lời trước.</p>
          </header>

          <form className="hoi-composer" onSubmit={handleQuestionSubmit}>
            <div className="hoi-section-heading">
              <label htmlFor="hoi-question">Bạn đang vướng chuyện gì?</label>
              <small>{questionText.length}/{HOI_GI_DAY_QUESTION_MAX_LENGTH}</small>
            </div>
            <textarea
              id="hoi-question"
              maxLength={HOI_GI_DAY_QUESTION_MAX_LENGTH}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Hỏi Chợ Neo một chuyện..."
              ref={questionInputRef}
              value={questionText}
            />
            <div className="hoi-chip-row" aria-label="Gợi ý câu hỏi">
              {QUESTION_CHIPS.map(([label, topic]) => (
                <button key={label} onClick={() => chooseChip(label, topic)} type="button">{label}</button>
              ))}
            </div>
            <button className="hoi-submit" disabled={isSaving || !questionText.trim()} type="submit">
              {isSaving ? "Đang giữ câu hỏi..." : "Hỏi Chợ Neo"}
            </button>
            {notice ? <p className="hoi-notice" role="status">{notice}</p> : null}
          </form>

          {activeQuestion ? (
            <section className="hoi-active" aria-labelledby="hoi-active-heading">
              <div className="hoi-active-heading">
                <strong id="hoi-active-heading">NeoPao</strong>
                <small>Gợi ý đầu tiên</small>
              </div>
              <p className="hoi-active-question">{activeQuestion.questionText}</p>
              {activeQuestion.answers[0] ? (
                <div className="hoi-active-answer">
                  <p>{activeQuestion.answers[0].answerText}</p>
                  {answerFeedback(activeQuestion.questionId, activeQuestion.answers[0])}
                </div>
              ) : null}
              <div className="hoi-active-actions">
                <button onClick={continueFromActive} type="button">Hỏi thêm</button>
                {activeQuestion.answers[0] ? (
                  <button
                    aria-expanded={openFeedbackAnswerId === activeQuestion.answers[0].answerId}
                    onClick={() => setOpenFeedbackAnswerId((current) => current === activeQuestion.answers[0]?.answerId ? null : activeQuestion.answers[0]?.answerId ?? null)}
                    type="button"
                  >
                    Góp ý
                  </button>
                ) : null}
              </div>
              <p className="hoi-active-note">Gợi ý đầu tiên để tham khảo cùng kinh nghiệm thực tế của bạn.</p>
            </section>
          ) : null}

          <details className="hoi-recent">
            <summary>Câu hỏi gần đây · {recentQuestions.length}</summary>
            <div className="hoi-recent-list">
              {recentQuestions.length ? recentQuestions.map((question) => (
                <details className="hoi-recent-item" key={question.questionId}>
                  <summary>
                    <span>{question.questionText}</span>
                    <small>{question.questionTopic.replaceAll("_", " ")}</small>
                  </summary>
                  <div className="hoi-recent-content">
                    {question.answers.map((answer) => (
                      <div className="hoi-recent-answer" key={answer.answerId}>
                        <strong>{answer.answerSource === "neopao" ? "NeoPao" : answer.answerSource === "community" ? "Kinh nghiệm cộng đồng — đang chờ duyệt" : "Kinh nghiệm Chợ Neo đã duyệt"}</strong>
                        <p>{answer.answerText}</p>
                        {answer.answerSource === "neopao" ? (
                          <button
                            aria-expanded={openFeedbackAnswerId === answer.answerId}
                            className="hoi-feedback-trigger"
                            onClick={() => setOpenFeedbackAnswerId((current) => current === answer.answerId ? null : answer.answerId)}
                            type="button"
                          >
                            Góp ý
                          </button>
                        ) : null}
                        {answerFeedback(question.questionId, answer)}
                      </div>
                    ))}
                    {question.continuation ? (
                      <Link className="hoi-continuation" href={question.continuation.href}>
                        Bàn tiếp chuyện này ở {question.continuation.label} →
                      </Link>
                    ) : null}
                  </div>
                </details>
              )) : (
                <p className="hoi-empty">Chưa có câu hỏi gần đây.</p>
              )}
            </div>
          </details>
        </div>
      </ChoNeoRoomShell>

      <style>{`
        .hoi-gi-day-shell { color: #fff7ed; background: #170b0b; }
        .hoi-gi-day-page { width: min(760px, 100%); min-width: 0; margin: 0 auto; padding: 12px 0 48px; }
        .hoi-hero, .hoi-composer, .hoi-active, .hoi-recent { min-width: 0; }
        .hoi-hero { padding: 4px 0 0; }
        .hoi-header-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 26px; }
        .hoi-back, .hoi-login, .hoi-submit, .hoi-active-actions button, .hoi-submit-secondary, .hoi-feedback-actions button, .hoi-chip-row button { min-height: 44px; border-radius: 12px; font: inherit; font-weight: 500; }
        .hoi-back, .hoi-login { display: inline-flex; align-items: center; justify-content: center; padding: 7px 14px; border: 1px solid rgba(248, 211, 145, 0.26); color: #fff7ed; background: rgba(255, 247, 237, 0.08); text-decoration: none; }
        .hoi-login { cursor: pointer; }
        .hoi-music { display: grid; flex: 0 0 auto; place-items: center; width: 46px; min-width: 46px; height: 46px; }
        .hoi-hero h1 { margin: 0; color: #fff7ed; font-family: var(--cho-neo-font-display); font-size: clamp(38px, 6vw, 54px); font-weight: 500; line-height: 1; }
        .hoi-subtitle { max-width: 560px; margin: 12px 0 0; color: #f8d391; font-size: 16px; font-weight: 400; line-height: 1.45; }
        .hoi-composer { display: grid; gap: 12px; margin-top: 22px; padding: 18px; border: 1px solid rgba(248, 211, 145, 0.2); border-radius: 16px; background: rgba(255, 247, 237, 0.055); }
        .hoi-section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
        .hoi-section-heading label { margin: 0; color: #f8d391; font-size: 15px; font-weight: 500; }
        .hoi-section-heading small { flex: 0 0 auto; color: rgba(255, 247, 237, 0.5); font-size: 11px; font-weight: 400; }
        .hoi-composer textarea, .hoi-contribution textarea { width: 100%; min-height: 120px; padding: 13px; border: 1px solid rgba(248, 211, 145, 0.24); border-radius: 12px; color: #fff7ed; background: rgba(8, 5, 8, 0.74); font: inherit; font-size: 16px; line-height: 1.4; resize: vertical; }
        .hoi-composer textarea::placeholder, .hoi-contribution textarea::placeholder { color: rgba(255, 247, 237, 0.42); }
        .hoi-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .hoi-chip-row button { padding: 6px 11px; border: 1px solid rgba(248, 211, 145, 0.2); color: rgba(255, 247, 237, 0.78); background: rgba(255, 247, 237, 0.06); cursor: pointer; font-size: 11px; }
        .hoi-submit { width: 100%; padding: 7px 16px; border: 1px solid rgba(248, 211, 145, 0.38); color: #27130c; background: #f8d391; cursor: pointer; }
        .hoi-submit:disabled, .hoi-submit-secondary:disabled { cursor: default; opacity: 0.55; }
        .hoi-notice, .hoi-empty { margin: 0; color: #f8d391; font-size: 12px; line-height: 1.45; }
        .hoi-active { margin-top: 22px; padding: 20px; border: 1px solid rgba(248, 211, 145, 0.3); border-radius: 16px; background: rgba(248, 211, 145, 0.09); }
        .hoi-active-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .hoi-active-heading strong { color: #f8d391; font-size: 14px; font-weight: 500; }
        .hoi-active-heading small { color: rgba(255, 247, 237, 0.52); font-size: 11px; }
        .hoi-active-question { margin: 16px 0 0; color: #fff7ed; font-size: 18px; font-weight: 500; line-height: 1.4; }
        .hoi-active-answer { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 247, 237, 0.14); }
        .hoi-active-answer > p { margin: 0; color: rgba(255, 247, 237, 0.9); font-size: 15px; line-height: 1.55; }
        .hoi-active-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; }
        .hoi-active-actions button, .hoi-submit-secondary, .hoi-feedback-actions button { padding: 7px 14px; border: 1px solid rgba(248, 211, 145, 0.3); color: #fff7ed; background: rgba(255, 247, 237, 0.07); cursor: pointer; }
        .hoi-active-actions button:hover, .hoi-feedback-actions button:hover, .hoi-feedback-trigger:hover { border-color: rgba(248, 211, 145, 0.65); }
        .hoi-active-note { margin: 16px 0 0; color: rgba(255, 247, 237, 0.58); font-size: 11px; line-height: 1.45; }
        .hoi-recent { margin-top: 28px; border-top: 1px solid rgba(255, 247, 237, 0.14); }
        .hoi-recent > summary { min-height: 48px; padding: 14px 0; color: #f8d391; cursor: pointer; font-size: 14px; font-weight: 500; list-style-position: inside; }
        .hoi-recent-list { padding-bottom: 2px; }
        .hoi-recent-item { border-top: 1px solid rgba(255, 247, 237, 0.1); }
        .hoi-recent-item > summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; min-height: 48px; padding: 10px 0; color: rgba(255, 247, 237, 0.82); cursor: pointer; list-style-position: inside; }
        .hoi-recent-item > summary span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hoi-recent-item > summary small { flex: 0 0 auto; color: rgba(255, 247, 237, 0.42); font-size: 10px; }
        .hoi-recent-content { padding: 0 0 16px 22px; }
        .hoi-recent-answer { padding: 12px 0; border-top: 1px solid rgba(255, 247, 237, 0.08); }
        .hoi-recent-answer strong { color: #f8d391; font-size: 12px; font-weight: 500; }
        .hoi-recent-answer p { margin: 5px 0 0; color: rgba(255, 247, 237, 0.78); font-size: 13px; line-height: 1.5; }
        .hoi-feedback-trigger { min-height: 36px; margin-top: 8px; padding: 5px 10px; border: 1px solid rgba(248, 211, 145, 0.22); border-radius: 10px; color: rgba(255, 247, 237, 0.78); background: transparent; cursor: pointer; font: inherit; font-size: 11px; }
        .hoi-continuation { display: inline-block; margin-top: 12px; color: #f8d391; font-size: 12px; font-weight: 500; text-decoration: none; }
        .hoi-feedback { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 247, 237, 0.12); }
        .hoi-feedback-prompt { margin: 0 !important; color: rgba(255, 247, 237, 0.62) !important; font-size: 11px !important; }
        .hoi-feedback-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .hoi-feedback-actions button.is-selected { border-color: rgba(248, 211, 145, 0.62); background: rgba(248, 211, 145, 0.18); }
        .hoi-contribution { display: grid; gap: 8px; margin-top: 10px; }
        .hoi-contribution label { color: rgba(255, 247, 237, 0.7); font-size: 11px; font-weight: 500; }
        .hoi-contribution textarea { min-height: 84px; font-size: 14px; }
        .hoi-contribution small { color: #f8d391; font-size: 10px; }

        @media (max-width: 640px) {
          .hoi-gi-day-page { padding: 4px 0 32px; }
          .hoi-header-actions { margin-bottom: 22px; }
          .hoi-back { flex: 1 1 auto; }
          .hoi-login { max-width: 116px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hoi-feedback-actions button { flex: 1 1 0; min-width: 0; }
          .hoi-composer, .hoi-active { padding: 16px; }
          .hoi-active-question { font-size: 16px; }
          .hoi-recent-item > summary small { display: none; }
        }
      `}</style>
    </>
  );
}
