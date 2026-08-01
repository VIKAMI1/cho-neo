"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
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
  ["Lifting sau vài ngày", "nail_technique"],
  ["Khách trễ giờ", "customer_service"],
  ["Chọn sản phẩm", "nail_products"],
  ["Giá dịch vụ", "salon_operations"],
  ["Giữ thợ", "workplace_experience"],
  ["Xử lý khách khó", "customer_service"],
] as const;

const API_URL = "/api/cho-neo/hoi-gi-day/questions";

export default function HoiChoNeoPage() {
  const { ensureChoNeoMember, profile, session } = useChoNeoMember();
  const [questionTopic, setQuestionTopic] = useState<HoiGiDayTopic>("general");
  const [questionText, setQuestionText] = useState("");
  const [questions, setQuestions] = useState<HoiGiDayQuestion[]>([]);
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, FeedbackDraft>>({});

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
        setQuestions((current) => [
          { ...nextQuestion, answers: nextAnswer ? [nextAnswer] : [] },
          ...current,
        ]);
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

  function answerFeedback(questionId: string, answer: HoiGiDayAnswer) {
    if (answer.answerSource !== "neopao") return null;
    const draft = feedbackDrafts[answer.answerId];
    return (
      <div className="hoi-feedback" aria-label="Góp ý cho gợi ý NeoPao">
        <p className="hoi-feedback-prompt">Gợi ý này có sát với kinh nghiệm của bạn không?</p>
        <div className="hoi-feedback-actions">
          {(
              [
              ["correct", "Đúng với kinh nghiệm của tôi"],
              ["addition", "Tôi muốn bổ sung"],
              ["correction", "Có điểm cần sửa"],
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
            <p className="hoi-eyebrow">Chợ Neo · Day One</p>
            <h1>Hỏi Chợ Neo<span>Ask Chợ Neo</span></h1>
            <p className="hoi-subtitle">NeoPao trả lời trước. Người trong nghề góp chuyện thật.</p>
            <p className="hoi-intro">Bạn đang vướng chuyện gì trong nghề hoặc trong tiệm?</p>
            <p className="hoi-scope">Tập trung vào nghề nail, vận hành tiệm, khách hàng, sản phẩm và chuyện làm nghề.</p>
          </header>

          <section className="hoi-destinations" aria-labelledby="hoi-destination-heading">
            <div className="hoi-section-heading">
              <p id="hoi-destination-heading">Một câu hỏi, một gợi ý đầu tiên</p>
              <small>Ask once</small>
            </div>
            <div className="hoi-destination hoi-destination-neopao">
              <span className="hoi-destination-icon">✦</span>
              <span><strong>NeoPao trả lời trước</strong><small>First answer from NeoPao</small></span>
              <em>Người trong nghề góp chuyện thật sau đó.</em>
            </div>
          </section>

          <form className="hoi-composer" onSubmit={handleQuestionSubmit}>
            <div className="hoi-section-heading">
              <label htmlFor="hoi-question">Câu hỏi của bạn</label>
              <small>{questionText.length}/{HOI_GI_DAY_QUESTION_MAX_LENGTH}</small>
            </div>
            <textarea
              id="hoi-question"
              maxLength={HOI_GI_DAY_QUESTION_MAX_LENGTH}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Hỏi Chợ Neo một chuyện..."
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
            <p className="hoi-private-note">Gợi ý đầu tiên không thay thế kinh nghiệm thực tế. Góp ý không tự huấn luyện hay thay đổi NeoPao.</p>
            {notice ? <p className="hoi-notice" role="status">{notice}</p> : null}
          </form>

          <section className="hoi-published" aria-labelledby="hoi-published-heading">
            <div className="hoi-section-heading">
              <p id="hoi-published-heading">Người trong Chợ nói gì?</p>
              <small>Published experience</small>
            </div>
            {questions.length ? questions.map((question) => (
              <article className="hoi-question" key={question.questionId}>
                <div className="hoi-question-meta">
                  <span>Hỏi Chợ Neo</span>
                  <small>{question.questionTopic.replaceAll("_", " ")}</small>
                </div>
                <h2>{question.questionText}</h2>
                {question.answers.map((answer) => (
                  <div className="hoi-answer" key={answer.answerId}>
                    {answer.answerSource === "neopao" ? <strong>Gợi ý đầu tiên từ NeoPao</strong> : answer.answerSource === "community" ? <strong>Kinh nghiệm cộng đồng — đang chờ duyệt</strong> : <strong>Kinh nghiệm Chợ Neo đã duyệt</strong>}
                    <p>{answer.answerText}</p>
                    {answer.answerSource === "neopao" ? <small>Đây là gợi ý đầu tiên. Kiểm tra thêm với kinh nghiệm thực tế trước khi áp dụng.</small> : null}
                    {answerFeedback(question.questionId, answer)}
                  </div>
                ))}
                {question.continuation ? (
                  <Link className="hoi-continuation" href={question.continuation.href}>
                    Bàn tiếp chuyện này ở {question.continuation.label} →
                  </Link>
                ) : null}
              </article>
            )) : (
              <p className="hoi-empty">Chưa có câu hỏi công khai. Bạn có thể mở bàn đầu tiên.</p>
            )}
          </section>
        </div>
      </ChoNeoRoomShell>

      <style>{`
        .hoi-gi-day-shell { color: #fff7ed; background: #170b0b; }
        .hoi-gi-day-page { width: min(820px, 100%); min-width: 0; margin: 0 auto; padding: 12px 0 48px; }
        .hoi-hero, .hoi-destinations, .hoi-composer, .hoi-published { min-width: 0; }
        .hoi-hero { padding: 4px 0 18px; }
        .hoi-header-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 28px; }
        .hoi-back, .hoi-login, .hoi-submit, .hoi-submit-secondary, .hoi-feedback-actions button, .hoi-chip-row button { min-height: 44px; border-radius: 12px; font: inherit; font-weight: 500; }
        .hoi-back, .hoi-login { display: inline-flex; align-items: center; justify-content: center; padding: 7px 14px; border: 1px solid rgba(248, 211, 145, 0.26); color: #fff7ed; background: rgba(255, 247, 237, 0.08); text-decoration: none; }
        .hoi-login { cursor: pointer; }
        .hoi-music { display: grid; flex: 0 0 auto; place-items: center; width: 46px; min-width: 46px; height: 46px; }
        .hoi-eyebrow { margin: 0 0 10px; color: #f8d391; font-size: 12px; font-weight: 600; }
        .hoi-hero h1 { margin: 0; color: #fff7ed; font-family: var(--cho-neo-font-display); font-size: clamp(42px, 7vw, 74px); font-weight: 600; line-height: 0.94; }
        .hoi-hero h1 span { display: block; margin-top: 7px; color: rgba(255, 247, 237, 0.52); font-family: var(--cho-neo-font-ui); font-size: 14px; font-weight: 400; line-height: 1.2; }
        .hoi-subtitle { margin: 14px 0 0; color: #f8d391; font-size: 16px; font-weight: 500; }
        .hoi-intro { max-width: 640px; margin: 12px 0 0; color: #fff7ed; font-size: 18px; line-height: 1.45; }
        .hoi-scope { max-width: 640px; margin: 8px 0 0; color: rgba(255, 247, 237, 0.62); font-size: 12px; line-height: 1.45; }
        .hoi-destinations, .hoi-composer, .hoi-published { margin-top: 22px; }
        .hoi-section-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; min-width: 0; }
        .hoi-section-heading p, .hoi-section-heading label { margin: 0; color: #f8d391; font-size: 14px; font-weight: 600; }
        .hoi-section-heading small { flex: 0 0 auto; color: rgba(255, 247, 237, 0.45); font-size: 10px; font-weight: 400; }
        .hoi-destination { display: grid; grid-template-columns: 44px minmax(0, 1fr); gap: 8px 12px; width: 100%; min-height: 96px; margin-top: 10px; padding: 14px; border: 1px solid rgba(248, 211, 145, 0.2); border-radius: 12px; color: #fff7ed; background: rgba(255, 247, 237, 0.055); cursor: pointer; text-align: left; }
        .hoi-destination.is-selected { border-color: rgba(248, 211, 145, 0.62); background: linear-gradient(135deg, rgba(248, 211, 145, 0.2), rgba(123, 44, 52, 0.24)); }
        .hoi-destination-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: #2b1212; background: #f8d391; font-size: 22px; }
        .hoi-destination > span:nth-child(2) { display: grid; align-content: center; min-width: 0; }
        .hoi-destination strong { font-size: 16px; font-weight: 600; line-height: 1.1; }
        .hoi-destination span small { margin-top: 3px; color: rgba(255, 247, 237, 0.5); font-size: 10px; font-weight: 400; }
        .hoi-destination em { grid-column: 1 / -1; color: rgba(255, 247, 237, 0.72); font-size: 12px; font-style: normal; line-height: 1.35; }
        .hoi-composer { display: grid; gap: 10px; padding-top: 4px; }
        .hoi-composer textarea, .hoi-contribution textarea { width: 100%; min-height: 104px; padding: 12px; border: 1px solid rgba(248, 211, 145, 0.24); border-radius: 12px; color: #fff7ed; background: rgba(8, 5, 8, 0.74); font: inherit; font-size: 16px; line-height: 1.4; resize: vertical; }
        .hoi-composer textarea::placeholder, .hoi-contribution textarea::placeholder { color: rgba(255, 247, 237, 0.42); }
        .hoi-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
        .hoi-chip-row button { min-height: 36px; padding: 6px 10px; border: 1px solid rgba(248, 211, 145, 0.2); color: rgba(255, 247, 237, 0.78); background: rgba(255, 247, 237, 0.06); cursor: pointer; font-size: 11px; }
        .hoi-submit { width: 100%; padding: 7px 16px; border: 1px solid rgba(248, 211, 145, 0.38); color: #27130c; background: #f8d391; cursor: pointer; }
        .hoi-submit:disabled, .hoi-submit-secondary:disabled { cursor: default; opacity: 0.55; }
        .hoi-private-note, .hoi-notice, .hoi-empty { margin: 0; color: rgba(255, 247, 237, 0.58); font-size: 11px; line-height: 1.4; }
        .hoi-notice { color: #f8d391; }
        .hoi-question { margin-top: 10px; padding: 14px; border: 1px solid rgba(248, 211, 145, 0.16); border-radius: 12px; background: rgba(255, 247, 237, 0.045); }
        .hoi-question-meta { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
        .hoi-question-meta span { color: #f8d391; font-size: 11px; font-weight: 600; }
        .hoi-question-meta small { color: rgba(255, 247, 237, 0.42); font-size: 10px; text-transform: none; }
        .hoi-question h2 { margin: 8px 0 0; color: #fff7ed; font-size: 17px; font-weight: 500; line-height: 1.3; }
        .hoi-answer { margin-top: 12px; padding: 12px; border-left: 2px solid #f8d391; border-radius: 0 10px 10px 0; background: rgba(248, 211, 145, 0.08); }
        .hoi-answer strong { color: #f8d391; font-size: 12px; font-weight: 600; }
        .hoi-answer p { margin: 6px 0 0; color: rgba(255, 247, 237, 0.88); font-size: 14px; line-height: 1.45; }
        .hoi-answer > small { display: block; margin-top: 8px; color: rgba(255, 247, 237, 0.54); font-size: 10px; line-height: 1.35; }
        .hoi-feedback { margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255, 247, 237, 0.12); }
        .hoi-feedback-prompt { margin: 0 !important; color: rgba(255, 247, 237, 0.62) !important; font-size: 11px !important; }
        .hoi-feedback-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .hoi-feedback-actions button, .hoi-submit-secondary { padding: 7px 12px; border: 1px solid rgba(248, 211, 145, 0.24); color: #fff7ed; background: rgba(255, 247, 237, 0.06); cursor: pointer; font-size: 11px; }
        .hoi-feedback-actions button.is-selected { border-color: rgba(248, 211, 145, 0.62); background: rgba(248, 211, 145, 0.18); }
        .hoi-contribution { display: grid; gap: 8px; margin-top: 10px; }
        .hoi-contribution label { color: rgba(255, 247, 237, 0.7); font-size: 11px; font-weight: 500; }
        .hoi-contribution textarea { min-height: 84px; font-size: 14px; }
        .hoi-contribution small { color: #f8d391; font-size: 10px; }

        @media (min-width: 720px) {
          .hoi-destinations { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .hoi-destinations .hoi-section-heading { grid-column: 1 / -1; }
          .hoi-destination { margin-top: 0; }
        }

        @media (max-width: 640px) {
          .hoi-gi-day-page { padding: 4px 0 32px; }
          .hoi-header-actions { margin-bottom: 22px; }
          .hoi-back { flex: 1 1 auto; }
          .hoi-login { max-width: 116px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .hoi-feedback-actions button { flex: 1 1 0; min-width: 0; }
          .hoi-destination strong { font-size: 15px; }
        }
      `}</style>
    </>
  );
}
