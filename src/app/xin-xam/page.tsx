// src/app/xin-xam/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  getChoNeoBetaSessionId,
  getChoNeoDeviceType,
  trackChoNeoBetaEvent,
} from "@/lib/cho-neo/beta-analytics";
import {
  createXinXamLocSo,
  LOCAL_XIN_XAM_SEED_STICKS,
  XIN_XAM_TOPICS,
  type XinXamStick,
  type XinXamTopic,
} from "@/lib/cho-neo/xin-xam-sticky";

const XIN_XAM_STAGE_IMAGE = "/images/cho-neo/Xin-Xam-Room.png";
const XIN_XAM_WEEKLY_KEY = "choNeo.xinXamWeeklyReflection.v1";

type RitualState = "ready" | "drawing" | "drawn" | "revealing" | "revealed";
type FeedbackStatus = "idle" | "saving" | "saved" | "error";

type WeeklyReflectionMemory = Partial<
  Record<
    XinXamTopic,
    {
      periodKey: string;
      stickId: string;
      drawnAt: string;
    }
  >
>;

const RITUAL_FEEDBACK_CHOICES = ["Có", "Không", "Có thể"] as const;
const AFTER_CHAT_FEEDBACK_CHOICES = ["Có", "Một chút", "Chưa"] as const;
const XIN_XAM_TOPIC_ICONS: Record<XinXamTopic, string> = {
  tiem: "店",
  tien: "◉",
  tinh: "♡",
  "ban-than": "☘",
};

function getStickNumber(stick: XinXamStick) {
  const index = LOCAL_XIN_XAM_SEED_STICKS.findIndex((seed) => seed.id === stick.id);
  return String(index + 1).padStart(2, "0");
}

function getCurrentWeekKey(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 1);
  const dayMs = 24 * 60 * 60 * 1000;
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / dayMs);
  const week = Math.floor(dayOfYear / 7) + 1;
  return `${date.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function chooseStick(topic: XinXamTopic) {
  const topicSticks = LOCAL_XIN_XAM_SEED_STICKS.filter(
    (stick) => stick.topic === topic,
  );
  const pool = topicSticks.length ? topicSticks : LOCAL_XIN_XAM_SEED_STICKS;
  const index = Math.floor(Math.random() * pool.length);
  return (pool[index] ?? pool[0] ?? LOCAL_XIN_XAM_SEED_STICKS[0]) as XinXamStick;
}

function loadWeeklyMemory() {
  try {
    const stored = window.localStorage.getItem(XIN_XAM_WEEKLY_KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as WeeklyReflectionMemory;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveWeeklyMemory(topic: XinXamTopic, stick: XinXamStick) {
  try {
    const memory = loadWeeklyMemory();
    memory[topic] = {
      periodKey: getCurrentWeekKey(),
      stickId: stick.id,
      drawnAt: new Date().toISOString(),
    };
    window.localStorage.setItem(XIN_XAM_WEEKLY_KEY, JSON.stringify(memory));
  } catch {
    // The weekly quẻ is local comfort state only; the ritual still works without it.
  }
}

function getSavedStickForTopic(topic: XinXamTopic) {
  const saved = loadWeeklyMemory()[topic];
  if (!saved || saved.periodKey !== getCurrentWeekKey()) return null;
  return LOCAL_XIN_XAM_SEED_STICKS.find((stick) => stick.id === saved.stickId) ?? null;
}

export default function XinXamPage() {
  const [selectedTopic, setSelectedTopic] = useState<XinXamTopic>("tiem");
  const [ritualState, setRitualState] = useState<RitualState>("ready");
  const [selectedStick, setSelectedStick] = useState<XinXamStick | null>(null);
  const [hasLoadedTopic, setHasLoadedTopic] = useState(false);
  const [isLocSoOpen, setIsLocSoOpen] = useState(false);
  const [dismissedTopic, setDismissedTopic] = useState<XinXamTopic | null>(null);
  const [drawNotice, setDrawNotice] = useState("");
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>("idle");
  const [ritualFeedback, setRitualFeedback] = useState("");
  const [helpFeedback, setHelpFeedback] = useState("");
  const [afterChatFeedback, setAfterChatFeedback] = useState("");
  const [finalFeedback, setFinalFeedback] = useState("");
  const drawTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const drawInProgressRef = useRef(false);

  const selectedTopicCopy =
    XIN_XAM_TOPICS.find((topic) => topic.key === selectedTopic) ??
    XIN_XAM_TOPICS[0];

  const selectedNumber = useMemo(
    () => (selectedStick ? getStickNumber(selectedStick) : "--"),
    [selectedStick],
  );

  useEffect(() => {
    const savedStick = getSavedStickForTopic(selectedTopic);
    const shouldShowSavedStick = savedStick && dismissedTopic !== selectedTopic;
    setSelectedStick(shouldShowSavedStick ? savedStick : null);
    setRitualState(shouldShowSavedStick ? "revealed" : "ready");
    setIsLocSoOpen(false);
    setHasLoadedTopic(true);
  }, [dismissedTopic, selectedTopic]);

  useEffect(
    () => () => {
      if (drawTimerRef.current) window.clearTimeout(drawTimerRef.current);
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
      drawInProgressRef.current = false;
    },
    [],
  );

  function handleShakeHolder() {
    if (ritualState !== "ready" || drawInProgressRef.current) return;
    const savedStick = getSavedStickForTopic(selectedTopic);
    if (savedStick) {
      setDismissedTopic(null);
      setSelectedStick(savedStick);
      setRitualState("revealed");
      setIsLocSoOpen(false);
      setDrawNotice(
        "Quẻ này đang được giữ trong 7 ngày. Đổi qua chuyện khác nếu muốn xin thêm.",
      );
      return;
    }
    if (drawTimerRef.current) window.clearTimeout(drawTimerRef.current);
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    const nextStick = chooseStick(selectedTopic);
    drawInProgressRef.current = true;
    setDismissedTopic(null);
    setDrawNotice("");
    setSelectedStick(nextStick);
    setRitualState("drawing");
    drawTimerRef.current = window.setTimeout(() => {
      setRitualState("drawn");
      revealTimerRef.current = window.setTimeout(() => {
        saveWeeklyMemory(selectedTopic, nextStick);
        setDismissedTopic(null);
        setDrawNotice("");
        setRitualState("revealing");
        const revealDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 220;
        revealTimerRef.current = window.setTimeout(() => {
          setRitualState("revealed");
          drawInProgressRef.current = false;
        }, revealDelay);
      }, 980);
    }, 980);
  }

  function handleRevealStick() {
    if (!selectedStick || ritualState !== "drawn" || drawInProgressRef.current) return;
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    saveWeeklyMemory(selectedTopic, selectedStick);
    setDismissedTopic(null);
    setDrawNotice("");
    setRitualState("revealing");
    const revealDelay = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? 0
      : 220;
    revealTimerRef.current = window.setTimeout(() => {
      setRitualState("revealed");
      drawInProgressRef.current = false;
    }, revealDelay);
  }

  function handleOpenFeedback() {
    setIsFeedbackOpen(true);
    setFeedbackStatus("idle");
    trackChoNeoBetaEvent("feedback_opened", {
      room: "xin-xam",
      details: { page: "xin-xam", source: "xin-xam-header" },
    });
  }

  function handleCloseFeedback() {
    setIsFeedbackOpen(false);
    trackChoNeoBetaEvent("feedback_closed", {
      room: "xin-xam",
      details: { page: "xin-xam", source: "xin-xam-header" },
    });
  }

  async function handleSubmitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedbackStatus("saving");

    try {
      const response = await fetch("/api/cho-neo/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          timestamp: new Date().toISOString(),
          path: window.location.pathname,
          room: "xin-xam",
          deviceType: getChoNeoDeviceType(),
          anonymousSessionId: getChoNeoBetaSessionId(),
          answers: {
            page: "xin-xam",
            ritual: ritualFeedback,
            hopedHelp: helpFeedback,
            feltBetter: afterChatFeedback,
            responseHadBeenShown: Boolean(hasWeeklyQue),
          },
          comments: {
            final: finalFeedback,
          },
          details: {
            page: "xin-xam",
            source: "xin-xam-header",
            selectedTopic,
          },
        }),
      });

      if (!response.ok) throw new Error("Feedback failed");

      setFeedbackStatus("saved");
      trackChoNeoBetaEvent("feedback_submitted", {
        room: "xin-xam",
        details: {
          page: "xin-xam",
          source: "xin-xam-header",
          responseHadBeenShown: Boolean(hasWeeklyQue),
        },
      });
    } catch {
      setFeedbackStatus("error");
    }
  }

  const showRisingStick =
    ritualState === "drawing" ||
    ritualState === "drawn" ||
    ritualState === "revealing";
  const hasOpenedQue =
    (ritualState === "revealing" || ritualState === "revealed") && selectedStick;
  const hasWeeklyQue = ritualState === "revealed" && selectedStick;
  const isTopicLocked =
    ritualState === "drawing" ||
    ritualState === "drawn" ||
    ritualState === "revealing";
  const locSo = useMemo(
    () =>
      selectedStick && hasOpenedQue
        ? createXinXamLocSo(selectedStick.id, selectedTopic)
        : null,
    [hasOpenedQue, selectedStick, selectedTopic],
  );
  const formatLocSoNumber = (number: number) => String(number).padStart(2, "0");
  const formattedLocSoNumbers =
    locSo?.mainNumbers.map(formatLocSoNumber).join(" · ") ?? "";

  function handleTopicSelect(topic: XinXamTopic) {
    setDismissedTopic(null);
    setDrawNotice("");
    setSelectedTopic(topic);
  }

  function handleChangeConcern() {
    if (drawTimerRef.current) window.clearTimeout(drawTimerRef.current);
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    drawInProgressRef.current = false;
    setDismissedTopic(selectedTopic);
    setSelectedStick(null);
    setRitualState("ready");
    setIsLocSoOpen(false);
    setDrawNotice("");
  }

  return (
    <main className="xin-xam-page">
      <section className="xin-xam-topbar" aria-label="Điều hướng Xin Xăm">
        <Link href="/cho-neo" className="xin-xam-header-control">
          ‹ Chợ Neo
        </Link>

        <div className="xin-xam-topbar-actions">
          <span
            className="cho-neo-shared-music-slot xin-xam-header-music"
            data-cho-neo-shared-music-slot
            data-cho-neo-music-presentation="rect"
          />
          <button
            type="button"
            className="xin-xam-header-control"
            onClick={handleOpenFeedback}
            aria-expanded={isFeedbackOpen}
            aria-controls="xin-xam-feedback-panel"
          >
            Góp ý
          </button>
          <Link href="/cho-neo/ong-dia" className="xin-xam-header-control">
            Ông Địa
          </Link>
        </div>
      </section>

      {isFeedbackOpen && (
        <section
          id="xin-xam-feedback-panel"
          className="xin-xam-feedback-panel"
          aria-label="Góp ý Xin Xăm"
        >
          {feedbackStatus === "saved" ? (
            <div className="xin-xam-feedback-confirmation" role="status">
              Cảm ơn bạn. Chợ Neo đã nhận góp ý rồi.
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback}>
              <fieldset>
                <legend>
                  Bạn có muốn có thêm nghi thức nhỏ như thắp nhang hoặc dâng chè
                  cho Ông Địa không?
                </legend>
                <div className="xin-xam-feedback-choices">
                  {RITUAL_FEEDBACK_CHOICES.map((choice) => (
                    <label key={choice}>
                      <input
                        type="radio"
                        name="xin-xam-ritual"
                        value={choice}
                        checked={ritualFeedback === choice}
                        onChange={() => setRitualFeedback(choice)}
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label>
                <span>Khi ghé Ông Địa, bạn mong Ông giúp điều gì nhất?</span>
                <input
                  type="text"
                  value={helpFeedback}
                  onChange={(event) => setHelpFeedback(event.target.value)}
                />
              </label>

              <fieldset>
                <legend>
                  Sau khi trò chuyện, bạn có thấy nhẹ lòng hoặc sáng ý hơn không?
                </legend>
                <div className="xin-xam-feedback-choices">
                  {AFTER_CHAT_FEEDBACK_CHOICES.map((choice) => (
                    <label key={choice}>
                      <input
                        type="radio"
                        name="xin-xam-after-chat"
                        value={choice}
                        checked={afterChatFeedback === choice}
                        onChange={() => setAfterChatFeedback(choice)}
                      />
                      <span>{choice}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label>
                <span>Bạn muốn góp thêm điều gì?</span>
                <textarea
                  value={finalFeedback}
                  onChange={(event) => setFinalFeedback(event.target.value)}
                  rows={2}
                />
              </label>

              {feedbackStatus === "error" && (
                <p className="xin-xam-feedback-error" role="alert">
                  Chưa gửi được góp ý. Bạn thử lại sau nha.
                </p>
              )}

              <div className="xin-xam-feedback-actions">
                <button type="submit" disabled={feedbackStatus === "saving"}>
                  {feedbackStatus === "saving" ? "Đang gửi..." : "Gửi góp ý"}
                </button>
                <button type="button" onClick={handleCloseFeedback}>
                  Đóng
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <div className="xin-xam-layout">
        <section className="xin-xam-title-card" aria-labelledby="xin-xam-title">
          <p>Xin Xăm</p>
          <h1 id="xin-xam-title">Chọn một chuyện, giữ một quẻ.</h1>
          <span>
            Mỗi chuyện giữ một quẻ trong 7 ngày. Đọc rồi ngồi với nó một chút.
          </span>

          <div className="xin-xam-topic-grid" aria-label="Chọn chuyện xin xăm">
            {XIN_XAM_TOPICS.map((topic) => (
              <button
                key={topic.key}
                type="button"
                className={selectedTopic === topic.key ? "active" : ""}
                disabled={isTopicLocked}
                onClick={() => handleTopicSelect(topic.key)}
              >
                <span aria-hidden="true">{XIN_XAM_TOPIC_ICONS[topic.key]}</span>
                <strong>{topic.label}</strong>
              </button>
            ))}
          </div>
        </section>

        <section
          className={`xam-loc-so-annex ${
            hasOpenedQue && locSo && isLocSoOpen ? "is-open" : ""
          } ${hasOpenedQue && locSo ? "" : "is-locked"}`}
          aria-live="polite"
          aria-label="Lộc Số Theo Quẻ"
        >
          <button
            type="button"
            onClick={() => {
              if (hasOpenedQue && locSo) setIsLocSoOpen(true);
            }}
            disabled={!hasOpenedQue || !locSo}
          >
            <span aria-hidden="true">✦</span>
            <span>
              <strong>Lộc Số Theo Quẻ</strong>
              <small>
                {hasOpenedQue && locSo
                  ? "Lấy một bộ số vui từ quẻ hôm nay."
                  : "Rút một quẻ trước để mở lộc số hôm nay."}
              </small>
            </span>
          </button>

          {hasOpenedQue && locSo && isLocSoOpen && (
            <div className="xam-loc-so-result">
              <p>{formattedLocSoNumbers}</p>
              <span>Số thêm · {formatLocSoNumber(locSo.bonusNumber)}</span>
            </div>
          )}
        </section>

        <section className="xin-xam-room" aria-label="Phòng Xin Xăm">
          <Image
            src={XIN_XAM_STAGE_IMAGE}
            alt="Phòng Xin Xăm riêng với bàn thờ đỏ vàng, người hướng dẫn, thiếu nữ áo dài vàng, chuông sân, mèo nhìn từ cửa, nhang trầm và ống xin xăm phía trước"
            fill
            priority
            sizes="(max-width: 820px) 100vw, 920px"
            className="xin-xam-stage-image"
          />

          <div className="xin-xam-room-shade" aria-hidden="true" />

          <button
            type="button"
            className={`xam-holder-hotspot ${ritualState === "drawing" ? "is-shaking" : ""}`}
            onClick={handleShakeHolder}
            disabled={ritualState !== "ready"}
            aria-label="Xin một quẻ nhẹ"
          >
            <span className="xam-holder-glow" aria-hidden="true" />
            <span className="xam-holder-rim" aria-hidden="true" />
            <span className="xam-holder-symbol" aria-hidden="true">福</span>
            {ritualState === "ready" && (
              <span className="xam-holder-label">Xin một quẻ nhẹ</span>
            )}
          </button>

          {showRisingStick && selectedStick && (
            <button
              type="button"
              className={`xam-rising-stick ${ritualState === "drawn" ? "is-ready" : ""} ${
                ritualState === "revealing" ? "is-retracting" : ""
              }`}
              onClick={handleRevealStick}
              aria-label={`Mở thẻ xăm số ${selectedNumber}`}
              disabled={ritualState !== "drawn" || drawInProgressRef.current}
            >
              <span>Quẻ {selectedNumber}</span>
            </button>
          )}
        </section>

        <section
          className={`xam-card ${hasOpenedQue ? "is-open" : ""}`}
          aria-live="polite"
          aria-label="Lời xăm"
        >
          {hasOpenedQue && selectedStick ? (
            <>
              <div className="xam-card-meta">
                <span>{selectedTopicCopy?.label} · Quẻ {selectedNumber}</span>
                <strong>Đã rút</strong>
              </div>
              <h2>{selectedStick.title}</h2>
              <p className="xam-poem">{selectedStick.lucBat}</p>
              <p>{selectedStick.meaning}</p>
              <div className="xam-action">
                <span>Việc nhỏ tuần này</span>
                <p>{selectedStick.advice}</p>
              </div>
              {drawNotice && <p className="xam-draw-notice">{drawNotice}</p>}

              <button
                type="button"
                className="xam-change-topic"
                onClick={handleChangeConcern}
              >
                Đổi đề tài
              </button>
            </>
          ) : (
            <>
              <div className="xam-card-meta">
                <span>{selectedTopicCopy?.label}</span>
                <strong>{hasLoadedTopic ? "Chưa rút" : "Đang mở"}</strong>
              </div>
              <h2>{selectedTopicCopy?.helper}</h2>
              <p>
                Chọn một chuyện thôi. Chạm ống xin xăm, đợi một thẻ nhô lên,
                rồi mở quẻ nhẹ để giữ trong tuần.
              </p>
            </>
          )}
        </section>
      </div>

      <style>{`
        .xin-xam-page {
          --room-pass2-text-primary: #f7eee8;
          --room-pass2-text-secondary: rgba(247, 238, 232, 0.78);
          --room-pass2-text-muted: rgba(247, 238, 232, 0.6);
          --room-pass2-border: rgba(217, 141, 126, 0.34);
          --room-pass2-border-soft: rgba(217, 141, 126, 0.22);
          --room-pass2-surface: rgba(79, 32, 22, 0.9);
          --room-pass2-surface-soft: rgba(66, 27, 20, 0.84);
          --room-pass2-control: rgba(114, 46, 31, 0.9);
          --cho-neo-text-primary: var(--room-pass2-text-primary);
          --cho-neo-text-accent: #efb8aa;
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 50% 8%, rgba(220, 76, 30, 0.2), transparent 32rem),
            radial-gradient(circle at 50% 72%, rgba(217, 141, 126, 0.12), transparent 38rem),
            linear-gradient(180deg, #140706 0%, #2e130c 54%, #180b08 100%);
          color: var(--cho-neo-text-primary);
          font-family: var(--cho-neo-font-ui);
          font-weight: 400;
          padding: clamp(0.75rem, 2vw, 1.2rem);
        }

        .xin-xam-topbar {
          position: relative;
          z-index: 5;
          width: min(1320px, 100%);
          margin: clamp(0.45rem, 1.4vw, 1rem) auto 0.85rem;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
        }

        .xin-xam-topbar-actions {
          display: inline-flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
        }

        .xin-xam-header-control {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          min-width: 92px;
          border: 1px solid var(--room-pass2-border);
          border-radius: 12px;
          padding: 0 0.8rem;
          color: var(--cho-neo-text-accent);
          background: var(--room-pass2-control);
          text-decoration: none;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 600;
          line-height: 1;
          white-space: nowrap;
        }

        .xin-xam-header-music {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          min-width: 92px;
        }

        .xin-xam-header-music :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio) {
          width: auto !important;
          min-width: 0 !important;
          height: 44px !important;
          min-height: 44px !important;
          max-height: 44px !important;
          padding: 0 !important;
          border: 0 !important;
          border-radius: 12px !important;
          background: transparent !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }

        .xin-xam-header-music :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle) {
          width: auto !important;
          min-width: 92px !important;
          height: 44px !important;
          min-height: 44px !important;
          max-height: 44px !important;
          padding: 0 0.8rem !important;
          border: 1px solid var(--room-pass2-border) !important;
          border-radius: 12px !important;
          color: var(--cho-neo-text-accent) !important;
          background: var(--room-pass2-control) !important;
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2) !important;
          font: inherit !important;
          font-size: 0.88rem !important;
          font-weight: 600 !important;
          line-height: 1 !important;
          text-shadow: none !important;
        }

        .xin-xam-header-music :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle[aria-pressed="true"]) {
          color: var(--cho-neo-text-accent) !important;
          text-shadow: none !important;
        }

        .xin-xam-header-music :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle:hover),
        .xin-xam-header-music :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle:focus-visible) {
          border-color: rgba(255, 212, 139, 0.52) !important;
          background: rgba(72, 31, 16, 0.78) !important;
          outline: none;
        }

        .xin-xam-header-music :global(.cho-neo-theme-audio.cho-neo-layout-theme-audio .theme-music-toggle:focus-visible) {
          box-shadow:
            0 0 0 2px rgba(255, 229, 146, 0.3),
            0 12px 26px rgba(0, 0, 0, 0.2) !important;
        }

        .xin-xam-header-control:hover,
        .xin-xam-header-control:focus-visible {
          border-color: rgba(255, 212, 139, 0.52);
          background: rgba(72, 31, 16, 0.78);
          outline: none;
        }

        .xin-xam-header-control:focus-visible {
          box-shadow:
            0 0 0 2px rgba(255, 229, 146, 0.3),
            0 12px 26px rgba(0, 0, 0, 0.2);
        }

        .xin-xam-feedback-panel {
          position: relative;
          z-index: 6;
          width: min(620px, 100%);
          margin: 0 auto 0.85rem;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 18px;
          padding: 0.82rem;
          background: var(--room-pass2-surface-soft);
          box-shadow: 0 20px 48px rgba(0, 0, 0, 0.3);
          color: var(--cho-neo-text-primary);
        }

        .xin-xam-feedback-panel form {
          display: grid;
          gap: 0.7rem;
        }

        .xin-xam-feedback-panel fieldset,
        .xin-xam-feedback-panel label {
          display: grid;
          gap: 0.38rem;
          min-width: 0;
          margin: 0;
          border: 0;
          padding: 0;
        }

        .xin-xam-feedback-panel legend,
        .xin-xam-feedback-panel label span {
          color: var(--cho-neo-text-accent);
          font-size: 0.82rem;
          font-weight: 600;
          line-height: 1.35;
        }

        .xin-xam-feedback-choices {
          display: flex;
          flex-wrap: wrap;
          gap: 0.42rem;
        }

        .xin-xam-feedback-choices label {
          display: inline-flex;
        }

        .xin-xam-feedback-choices input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .xin-xam-feedback-choices span,
        .xin-xam-feedback-actions button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          border: 1px solid rgba(255, 224, 161, 0.28);
          border-radius: 12px;
          padding: 0 0.7rem;
          background: rgba(255, 241, 208, 0.08);
          color: var(--cho-neo-text-accent);
          font: inherit;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }

        .xin-xam-feedback-choices input:checked + span {
          border-color: rgba(255, 210, 126, 0.58);
          background: rgba(255, 210, 126, 0.2);
        }

        .xin-xam-feedback-choices input:focus-visible + span,
        .xin-xam-feedback-actions button:focus-visible {
          outline: 2px solid rgba(255, 229, 146, 0.76);
          outline-offset: 2px;
        }

        .xin-xam-feedback-panel input[type="text"],
        .xin-xam-feedback-panel textarea {
          width: 100%;
          border: 1px solid rgba(255, 224, 161, 0.24);
          border-radius: 12px;
          padding: 0.55rem 0.62rem;
          background: rgba(11, 5, 4, 0.44);
          color: var(--cho-neo-text-primary);
          font: inherit;
          font-size: 0.86rem;
        }

        .xin-xam-feedback-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.45rem;
        }

        .xin-xam-feedback-actions button:first-child {
          border-color: rgba(255, 210, 126, 0.46);
          background: rgba(255, 210, 126, 0.15);
        }

        .xin-xam-feedback-actions button:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .xin-xam-feedback-error,
        .xin-xam-feedback-confirmation {
          margin: 0;
          color: var(--room-pass2-text-secondary);
          font-size: 0.84rem;
          line-height: 1.4;
        }

        .xin-xam-layout {
          width: min(1320px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-areas:
            "stage stage"
            "intro card"
            "locso card";
          gap: clamp(0.75rem, 1.6vw, 1.1rem);
          align-items: start;
        }

        .xin-xam-room {
          grid-area: stage;
          position: relative;
          width: 100%;
          aspect-ratio: 1672 / 941;
          margin: 0;
          overflow: hidden;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: clamp(18px, 2.4vw, 30px);
          background: #130806;
          box-shadow:
            0 34px 90px rgba(0, 0, 0, 0.58),
            inset 0 0 0 1px rgba(255, 224, 161, 0.08);
          isolation: isolate;
        }

        .xin-xam-stage-image {
          z-index: 0;
          object-fit: contain;
          object-position: center;
        }

        .xin-xam-room-shade {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            radial-gradient(circle at 22% 78%, rgba(255, 176, 68, 0.14), transparent 15rem),
            linear-gradient(180deg, rgba(9, 3, 2, 0.08), rgba(9, 3, 2, 0.2));
        }

        .xin-xam-title-card,
        .xam-card {
          position: relative;
          z-index: 3;
          border: 1px solid var(--room-pass2-border);
          background: var(--room-pass2-surface);
          color: var(--cho-neo-text-primary);
          box-shadow: 0 22px 56px rgba(0, 0, 0, 0.24);
          backdrop-filter: blur(12px);
        }

        .xin-xam-title-card {
          grid-area: intro;
          max-width: none;
          border-radius: 20px;
          padding: clamp(0.8rem, 2vw, 1.05rem);
        }

        .xin-xam-title-card p,
        .xin-xam-title-card h1,
        .xin-xam-title-card span,
        .xam-card p,
        .xam-card h2 {
          margin: 0;
        }

        .xin-xam-title-card > p {
          color: var(--cho-neo-text-accent);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .xin-xam-title-card h1 {
          margin-top: 0.25rem;
          color: var(--cho-neo-text-primary);
          font-family: var(--cho-neo-font-display);
          font-size: clamp(1.06rem, 2vw, 1.64rem);
          font-weight: 600;
          line-height: 1.06;
        }

        .xin-xam-title-card span {
          display: block;
          margin-top: 0.42rem;
          color: var(--room-pass2-text-secondary);
          font-size: 0.9rem;
          font-weight: 400;
          line-height: 1.35;
        }

        .xin-xam-topic-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.34rem;
          margin-top: 0.8rem;
        }

        .xin-xam-topic-grid button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.22rem;
          min-height: 38px;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 12px;
          padding: 0 0.3rem;
          background: var(--room-pass2-control);
          color: var(--room-pass2-text-primary);
          font: inherit;
          font-size: 0.74rem;
          font-weight: 600;
          line-height: 1;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 236, 184, 0.08),
            0 10px 20px rgba(0, 0, 0, 0.14);
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease,
            box-shadow 160ms ease;
        }

        .xin-xam-topic-grid button:hover,
        .xin-xam-topic-grid button:focus-visible {
          border-color: rgba(217, 141, 126, 0.5);
          background: rgba(133, 55, 39, 0.94);
          outline: none;
        }

        .xin-xam-topic-grid button:focus-visible {
          box-shadow:
            0 0 0 2px rgba(255, 229, 146, 0.28),
            0 10px 20px rgba(0, 0, 0, 0.14);
        }

        .xin-xam-topic-grid button.active {
          border-color: rgba(255, 205, 118, 0.72);
          background: linear-gradient(180deg, #c9904e, #a86b34);
          color: #2b1008;
          box-shadow:
            inset 0 0 0 1px rgba(255, 232, 164, 0.26),
            inset 0 1px 0 rgba(255, 241, 199, 0.22);
        }

        .xin-xam-topic-grid button.active span {
          color: #2b1008;
        }

        .xin-xam-topic-grid button:disabled {
          cursor: default;
        }

        .xin-xam-topic-grid button span {
          flex: 0 0 auto;
          color: var(--cho-neo-text-accent);
          font-size: 0.84rem;
          line-height: 1;
        }

        .xin-xam-topic-grid button strong {
          min-width: 0;
          overflow: hidden;
          font: inherit;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .xam-holder-hotspot {
          position: absolute;
          left: 37.6%;
          top: 87.4%;
          z-index: 4;
          width: clamp(50px, 5vw, 70px);
          height: clamp(50px, 5vw, 70px);
          border: 1px solid rgba(255, 221, 125, 0.82);
          border-radius: 50%;
          background:
            radial-gradient(circle at 38% 30%, rgba(255, 199, 120, 0.42), transparent 18%),
            radial-gradient(circle at 50% 58%, #f23824 0%, #c51513 54%, #740908 100%);
          color: var(--cho-neo-text-accent);
          cursor: pointer;
          touch-action: manipulation;
          transform: translate(-50%, -50%);
          box-shadow:
            0 0 0 1px rgba(107, 17, 8, 0.92),
            0 0 18px rgba(238, 31, 20, 0.48),
            0 0 30px rgba(255, 101, 42, 0.22),
            inset 0 1px 6px rgba(255, 230, 161, 0.35),
            inset 0 -7px 13px rgba(83, 5, 5, 0.42);
          transition:
            box-shadow 160ms ease,
            filter 160ms ease,
            transform 120ms ease;
        }

        .xam-holder-hotspot:disabled {
          cursor: default;
          opacity: 0.82;
        }

        .xam-holder-hotspot:hover:not(:disabled),
        .xam-holder-hotspot:focus-visible {
          filter: saturate(1.12);
          box-shadow:
            0 0 0 1px rgba(255, 229, 146, 0.9),
            0 0 22px rgba(248, 37, 24, 0.62),
            0 0 42px rgba(255, 113, 45, 0.34),
            inset 0 1px 7px rgba(255, 230, 161, 0.44),
            inset 0 -7px 13px rgba(83, 5, 5, 0.42);
        }

        .xam-holder-hotspot:focus-visible {
          outline: 2px solid rgba(255, 229, 146, 0.92);
          outline-offset: 3px;
        }

        .xam-holder-hotspot:active:not(:disabled) {
          transform: translate(-50%, -50%) scale(0.96);
        }

        .xam-holder-glow {
          position: absolute;
          inset: -34%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(245, 47, 28, 0.48), transparent 68%);
          animation: xamPulse 2.8s ease-in-out infinite;
          pointer-events: none;
        }

        .xam-holder-rim {
          position: absolute;
          inset: 7px;
          border: 1px solid rgba(255, 219, 122, 0.78);
          border-radius: 50%;
          box-shadow:
            inset 0 0 0 1px rgba(112, 12, 8, 0.58),
            0 0 10px rgba(255, 215, 116, 0.16);
          animation: xamRimBreath 3.6s ease-in-out infinite;
          pointer-events: none;
        }

        .xam-holder-symbol {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          color: var(--cho-neo-text-accent);
          font-family: var(--cho-neo-font-display);
          font-size: clamp(1.32rem, 2vw, 1.9rem);
          font-weight: 600;
          line-height: 1;
          text-shadow:
            0 1px 0 rgba(89, 7, 4, 0.82),
            0 0 8px rgba(255, 229, 146, 0.38);
          animation: xamSealBreath 3.6s ease-in-out infinite;
          pointer-events: none;
        }

        .xam-holder-label {
          position: absolute;
          left: 50%;
          top: calc(100% + 0.46rem);
          min-width: max-content;
          transform: translateX(-50%);
          border: 1px solid rgba(255, 224, 161, 0.28);
          border-radius: 12px;
          padding: 0.36rem 0.56rem;
          background: rgba(48, 17, 10, 0.82);
          color: var(--cho-neo-text-accent);
          font-size: 0.72rem;
          font-weight: 600;
          line-height: 1;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.24);
          pointer-events: none;
        }

        .xam-holder-hotspot.is-shaking .xam-holder-symbol {
          animation: xamShake 0.78s ease-in-out;
        }

        .xam-rising-stick {
          position: absolute;
          left: 36.6%;
          bottom: 20%;
          z-index: 5;
          width: clamp(34px, 4vw, 48px);
          height: clamp(168px, 23vw, 280px);
          border: 1px solid rgba(255, 217, 139, 0.28);
          border-radius: 999px;
          background: linear-gradient(180deg, #a84b25, #552015);
          color: var(--cho-neo-text-accent);
          cursor: pointer;
          box-shadow: 0 22px 46px rgba(0, 0, 0, 0.34);
          transform: rotate(-8deg) translateY(54px);
          animation: xamRise 0.9s ease-out forwards;
          touch-action: manipulation;
        }

        .xam-rising-stick span {
          writing-mode: vertical-rl;
          display: inline-flex;
          align-items: center;
          gap: 0.18rem;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.02em;
        }

        .xam-rising-stick.is-ready {
          box-shadow:
            0 24px 52px rgba(0, 0, 0, 0.36),
            0 0 34px rgba(255, 190, 82, 0.28);
        }

        .xam-rising-stick.is-retracting {
          pointer-events: none;
          animation: xamRetract 0.22s ease-in forwards;
        }

        .xam-card {
          grid-area: card;
          width: auto;
          border-radius: 24px;
          padding: clamp(0.9rem, 2vw, 1.15rem);
          opacity: 0.94;
          transform: translateY(0);
        }

        .xam-card.is-open {
          animation: xamCardOpen 0.42s ease-out;
        }

        .xam-card-meta {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          color: var(--cho-neo-text-accent);
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .xam-card-meta strong {
          border-radius: 999px;
          padding: 0.28rem 0.5rem;
          background: rgba(255, 210, 126, 0.16);
          color: var(--cho-neo-text-accent);
        }

        .xam-card h2 {
          margin-top: 0.55rem;
          color: var(--cho-neo-text-primary);
          font-family: var(--cho-neo-font-display);
          font-size: clamp(0.98rem, 1.75vw, 1.34rem);
          font-weight: 600;
          line-height: 1.08;
        }

        .xam-card p {
          margin-top: 0.65rem;
          color: var(--room-pass2-text-secondary);
          font-size: 0.94rem;
          font-weight: 400;
          line-height: 1.5;
        }

        .xam-poem {
          white-space: pre-line;
          color: var(--cho-neo-text-accent) !important;
          font-style: italic;
        }

        .xam-action {
          margin-top: 0.85rem;
          border-left: 3px solid rgba(255, 210, 126, 0.7);
          padding-left: 0.75rem;
        }

        .xam-action span {
          color: var(--cho-neo-text-accent);
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          text-transform: none;
        }

        .xam-action p {
          margin-top: 0.25rem;
        }

        .xam-change-topic {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 36px;
          margin-top: 0.9rem;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 12px;
          padding: 0 0.72rem;
          background: rgba(114, 46, 31, 0.56);
          color: var(--room-pass2-text-secondary);
          cursor: pointer;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1;
        }

        .xam-change-topic:hover,
        .xam-change-topic:focus-visible {
          border-color: rgba(255, 224, 161, 0.34);
          background: rgba(255, 241, 208, 0.1);
          color: var(--cho-neo-text-accent);
          outline: none;
        }

        .xam-change-topic:focus-visible {
          box-shadow: 0 0 0 2px rgba(255, 229, 146, 0.24);
        }

        .xam-draw-notice {
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 12px;
          padding: 0.58rem 0.68rem;
          background: rgba(114, 46, 31, 0.5);
          color: var(--room-pass2-text-secondary) !important;
          font-size: 0.82rem !important;
          line-height: 1.36 !important;
        }

        .xam-loc-so-annex {
          grid-area: locso;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 16px;
          padding: 0.72rem;
          background:
            linear-gradient(135deg, rgba(75, 30, 22, 0.88), rgba(54, 22, 17, 0.82)),
            radial-gradient(circle at 100% 0%, rgba(217, 141, 126, 0.13), transparent 8rem);
          box-shadow:
            inset 0 0 0 1px rgba(255, 234, 178, 0.05),
            0 12px 24px rgba(0, 0, 0, 0.14);
        }

        .xam-loc-so-annex.is-open {
          background:
            linear-gradient(135deg, rgba(118, 50, 34, 0.92), rgba(82, 32, 23, 0.86)),
            radial-gradient(circle at 100% 0%, rgba(217, 141, 126, 0.17), transparent 8rem);
          border-color: var(--room-pass2-border);
        }

        .xam-loc-so-annex.is-locked {
          opacity: 0.88;
        }

        .xam-loc-so-annex button {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 0.56rem;
          border: 0;
          padding: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font: inherit;
          text-align: left;
        }

        .xam-loc-so-annex button:disabled {
          cursor: default;
        }

        .xam-loc-so-annex button:focus-visible {
          outline: 2px solid rgba(255, 229, 146, 0.82);
          outline-offset: 4px;
          border-radius: 10px;
        }

        .xam-loc-so-annex button > span:first-child {
          display: inline-flex;
          width: 28px;
          height: 28px;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--room-pass2-border-soft);
          border-radius: 10px;
          background: rgba(114, 46, 31, 0.58);
          color: var(--cho-neo-text-accent);
          line-height: 1;
        }

        .xam-loc-so-annex button > span:last-child {
          display: grid;
          gap: 0.16rem;
          min-width: 0;
        }

        .xam-loc-so-annex strong {
          color: var(--cho-neo-text-accent);
          font-size: 0.88rem;
          line-height: 1.05;
        }

        .xam-loc-so-annex small {
          color: var(--room-pass2-text-secondary);
          font-size: 0.78rem;
          line-height: 1.3;
        }

        .xam-loc-so-heading {
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 0.35rem 0.65rem;
        }

        .xam-loc-so-nav h3,
        .xam-loc-so-nav p {
          margin: 0;
        }

        .xam-loc-so-nav h3 {
          color: var(--cho-neo-text-accent);
          font-size: 0.88rem;
          line-height: 1;
        }

        .xam-loc-so-heading p {
          color: var(--room-pass2-text-secondary);
          font-size: 0.78rem;
          line-height: 1.3;
        }

        .xam-loc-so-result {
          margin-top: 0.65rem;
          border-top: 1px solid var(--room-pass2-border-soft);
          padding-top: 0.58rem;
        }

        .xam-loc-so-result p {
          color: var(--cho-neo-text-primary);
          font-size: clamp(1rem, 1.7vw, 1.22rem);
          font-weight: 600;
          letter-spacing: 0.025em;
          line-height: 1.35;
        }

        .xam-loc-so-result span {
          display: inline-flex;
          margin-top: 0.35rem;
          border: 1px solid rgba(255, 224, 161, 0.22);
          border-radius: 12px;
          padding: 0.2rem 0.48rem;
          background: rgba(255, 241, 208, 0.08);
          color: var(--cho-neo-text-accent);
          font-size: 0.76rem;
          font-weight: 600;
        }

        @keyframes xamPulse {
          0%,
          100% {
            opacity: 0.74;
            transform: scale(0.95);
          }

          50% {
            opacity: 1;
            transform: scale(1.07);
          }
        }

        @keyframes xamSealBreath {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0.99);
          }

          50% {
            transform: translate(-50%, -50%) scale(1.025);
          }
        }

        @keyframes xamRimBreath {
          0%,
          100% {
            transform: scale(0.99);
          }

          50% {
            transform: scale(1.025);
          }
        }

        @keyframes xamShake {
          0%,
          100% {
            transform: translate(-50%, -50%) rotate(0deg);
          }

          25% {
            transform: translate(-50%, -50%) rotate(-8deg);
          }

          55% {
            transform: translate(-50%, -50%) rotate(7deg);
          }

          80% {
            transform: translate(-50%, -50%) rotate(-4deg);
          }
        }

        @keyframes xamRise {
          from {
            opacity: 0.68;
            transform: rotate(-8deg) translateY(78px);
          }

          to {
            opacity: 1;
            transform: rotate(-8deg) translateY(0);
          }
        }

        @keyframes xamRetract {
          from {
            opacity: 1;
            transform: rotate(-8deg) translateY(0);
          }

          to {
            opacity: 0;
            transform: rotate(-8deg) translateY(46px);
          }
        }

        @keyframes xamCardOpen {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.98);
          }

          to {
            opacity: 0.94;
            transform: translateY(0) scale(1);
          }
        }

        @media (max-width: 820px) {
          .xin-xam-page {
            padding: 0.55rem;
          }

          .xin-xam-topbar {
            margin-bottom: 0.5rem;
            gap: 0.45rem;
          }

          .xin-xam-topbar-actions {
            gap: 0.38rem;
          }

          .xin-xam-header-control {
            min-width: auto;
            height: 44px;
            padding: 0 0.62rem;
            font-size: 0.82rem;
          }

          .xin-xam-feedback-panel {
            margin-bottom: 0.55rem;
            border-radius: 16px;
            padding: 0.68rem;
          }

          .xin-xam-layout {
            grid-template-columns: 1fr;
            grid-template-areas:
              "stage"
              "intro"
              "locso"
              "card";
            gap: 0.6rem;
          }

          .xin-xam-room {
            aspect-ratio: 1672 / 941;
            margin-bottom: 0;
            overflow: hidden;
            border-radius: 20px;
          }

          .xin-xam-stage-image {
            object-fit: contain;
            object-position: center;
          }

          .xin-xam-title-card {
            max-width: none;
            border-radius: 16px;
            padding: 0.58rem 0.64rem;
          }

          .xin-xam-title-card h1 {
            font-size: clamp(0.98rem, 4vw, 1.08rem);
            line-height: 1.08;
          }

          .xin-xam-title-card > p {
            font-size: 0.62rem;
          }

          .xin-xam-title-card span {
            margin-top: 0.25rem;
            font-size: 0.72rem;
            line-height: 1.28;
          }

          .xin-xam-topic-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.22rem;
            margin-top: 0.5rem;
          }

          .xin-xam-topic-grid button {
            min-height: 34px;
            gap: 0.08rem;
            padding: 0 0.1rem;
            border-radius: 10px;
            font-size: 0.56rem;
          }

          .xin-xam-topic-grid button span {
            font-size: 0.64rem;
          }

          .xam-holder-hotspot {
            left: 37.6%;
            top: 87.4%;
            width: clamp(44px, 12vw, 52px);
            height: clamp(44px, 12vw, 52px);
          }

          .xam-holder-label {
            top: auto;
            bottom: calc(100% + 0.34rem);
            padding: 0.3rem 0.44rem;
            border-radius: 10px;
            font-size: 0.6rem;
          }

          .xam-rising-stick {
            left: 36.6%;
            bottom: 24%;
            width: 30px;
            height: clamp(138px, 38vw, 180px);
          }

          .xam-card {
            width: auto;
            border-radius: 16px;
            padding: 0.72rem;
            max-height: none;
            overflow: visible;
          }

          .xam-card-meta {
            font-size: 0.62rem;
            gap: 0.35rem;
          }

          .xam-card h2 {
            margin-top: 0.35rem;
            font-size: clamp(0.9rem, 3.6vw, 1rem);
            line-height: 1.1;
          }

          .xam-card p {
            margin-top: 0.42rem;
            font-size: 0.78rem;
            line-height: 1.32;
          }

          .xam-action {
            margin-top: 0.5rem;
            padding-left: 0.5rem;
          }

          .xam-loc-so-annex {
            margin-top: 0.65rem;
            border-radius: 14px;
            padding: 0.58rem;
          }

          .xam-loc-so-heading {
            display: block;
          }

          .xam-loc-so-heading p {
            margin-top: 0.26rem;
            font-size: 0.72rem;
          }

          .xam-loc-so-result p {
            font-size: 0.96rem;
            letter-spacing: 0.025em;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .xam-holder-glow,
          .xam-holder-rim,
          .xam-holder-symbol,
          .xam-holder-hotspot.is-shaking .xam-holder-symbol,
          .xam-rising-stick,
          .xam-rising-stick.is-retracting,
          .xam-card.is-open {
            animation: none;
          }

          .xam-holder-hotspot {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
