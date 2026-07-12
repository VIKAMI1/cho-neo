// src/app/xin-xam/page.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LOCAL_XIN_XAM_SEED_STICKS,
  XIN_XAM_TOPICS,
  type XinXamStick,
  type XinXamTopic,
} from "@/lib/cho-neo/xin-xam-sticky";

const XIN_XAM_STAGE_IMAGE = "/images/cho-neo/Xin-Xam-Room.png";
const XIN_XAM_WEEKLY_KEY = "choNeo.xinXamWeeklyReflection.v1";

type RitualState = "ready" | "drawing" | "drawn" | "revealed";

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

  const selectedTopicCopy =
    XIN_XAM_TOPICS.find((topic) => topic.key === selectedTopic) ??
    XIN_XAM_TOPICS[0];

  const selectedNumber = useMemo(
    () => (selectedStick ? getStickNumber(selectedStick) : "--"),
    [selectedStick],
  );

  useEffect(() => {
    const savedStick = getSavedStickForTopic(selectedTopic);
    setSelectedStick(savedStick);
    setRitualState(savedStick ? "revealed" : "ready");
    setHasLoadedTopic(true);
  }, [selectedTopic]);

  function handleShakeHolder() {
    if (ritualState === "drawing" || ritualState === "revealed") return;
    const nextStick = chooseStick(selectedTopic);
    setSelectedStick(nextStick);
    setRitualState("drawing");
    window.setTimeout(() => {
      setRitualState("drawn");
    }, 980);
  }

  function handleRevealStick() {
    if (!selectedStick || ritualState !== "drawn") return;
    saveWeeklyMemory(selectedTopic, selectedStick);
    setRitualState("revealed");
  }

  const showRisingStick = ritualState === "drawing" || ritualState === "drawn";
  const hasWeeklyQue = ritualState === "revealed" && selectedStick;

  return (
    <main className="xin-xam-page">
      <section className="xin-xam-topbar" aria-label="Điều hướng Xin Xăm">
        <Link href="/cho-neo" className="xin-xam-nav-link">
          <span>Về Chợ Neo</span>
          <small>Back to Village</small>
        </Link>
        <Link href="/cho-neo/ong-dia" className="xin-xam-nav-link">
          <span>Qua Ông Địa</span>
          <small>Ong Dia Shrine</small>
        </Link>
      </section>

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
                onClick={() => setSelectedTopic(topic.key)}
              >
                {topic.label}
              </button>
            ))}
          </div>
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
            disabled={ritualState === "drawing" || ritualState === "revealed"}
            aria-label="Xin một quẻ nhẹ"
          >
            <span className="xam-holder-glow" aria-hidden="true" />
            <span className="xam-holder-label">
              {ritualState === "ready" && "Xin một quẻ nhẹ"}
              {ritualState === "drawing" && "Đang rút quẻ..."}
              {ritualState === "drawn" && "Chạm thẻ xăm"}
              {ritualState === "revealed" && "Đã giữ quẻ"}
            </span>
            <span className="xam-holder-sticks" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>

          {showRisingStick && selectedStick && (
            <button
              type="button"
              className={`xam-rising-stick ${ritualState === "drawn" ? "is-ready" : ""}`}
              onClick={handleRevealStick}
              aria-label={`Mở thẻ xăm số ${selectedNumber}`}
            >
              <span>Quẻ {selectedNumber}</span>
            </button>
          )}
        </section>

        <section
          className={`xam-card ${hasWeeklyQue ? "is-open" : ""}`}
          aria-live="polite"
          aria-label="Lời xăm"
        >
          {selectedStick ? (
            <>
              <div className="xam-card-meta">
                <span>{selectedTopicCopy?.label}</span>
                <strong>Giữ 7 ngày</strong>
              </div>
              <h2>{selectedStick.title}</h2>
              <p className="xam-poem">{selectedStick.lucBat}</p>
              <p>{selectedStick.meaning}</p>
              <div className="xam-action">
                <span>Việc nhỏ tuần này</span>
                <p>{selectedStick.advice}</p>
              </div>
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
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 50% 8%, rgba(220, 76, 30, 0.24), transparent 32rem),
            linear-gradient(180deg, #160907 0%, #2a0e08 52%, #110706 100%);
          color: #fff1d0;
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

        .xin-xam-nav-link {
          display: inline-flex;
          flex-direction: column;
          justify-content: center;
          min-height: 42px;
          border: 1px solid rgba(255, 214, 142, 0.28);
          border-radius: 999px;
          padding: 0.48rem 0.82rem;
          color: #ffe4ab;
          background: rgba(36, 13, 8, 0.72);
          text-decoration: none;
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.24);
        }

        .xin-xam-nav-link span {
          font-size: 0.8rem;
          font-weight: 900;
        }

        .xin-xam-nav-link small {
          color: rgba(255, 241, 208, 0.64);
          font-size: 0.66rem;
        }

        .xin-xam-layout {
          width: min(1320px, 100%);
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-areas:
            "stage stage"
            "intro card";
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
          border: 1px solid rgba(255, 210, 126, 0.22);
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
          border: 1px solid rgba(255, 224, 161, 0.24);
          background: rgba(32, 12, 8, 0.74);
          color: #fff1d0;
          box-shadow: 0 22px 56px rgba(0, 0, 0, 0.28);
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

        .xin-xam-title-card p {
          color: #ffd28a;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .xin-xam-title-card h1 {
          margin-top: 0.25rem;
          color: #fff1d0;
          font-size: clamp(1.55rem, 3vw, 2.45rem);
          line-height: 1.02;
        }

        .xin-xam-title-card span {
          display: block;
          margin-top: 0.42rem;
          color: rgba(255, 241, 208, 0.72);
          font-size: 0.9rem;
          line-height: 1.35;
        }

        .xin-xam-topic-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.45rem;
          margin-top: 0.8rem;
        }

        .xin-xam-topic-grid button {
          min-height: 38px;
          border: 1px solid rgba(255, 224, 161, 0.24);
          border-radius: 999px;
          background: rgba(255, 241, 208, 0.08);
          color: rgba(255, 241, 208, 0.82);
          font: inherit;
          font-size: 0.82rem;
          font-weight: 900;
          cursor: pointer;
        }

        .xin-xam-topic-grid button.active {
          border-color: rgba(255, 210, 126, 0.58);
          background: #ffd28a;
          color: #2b1008;
        }

        .xam-holder-hotspot {
          position: absolute;
          left: 8%;
          bottom: 12%;
          z-index: 4;
          width: clamp(118px, 15vw, 190px);
          height: clamp(118px, 15vw, 190px);
          border: 0;
          border-radius: 999px;
          background: transparent;
          color: #ffe4ab;
          cursor: pointer;
          touch-action: manipulation;
        }

        .xam-holder-hotspot:disabled {
          cursor: default;
        }

        .xam-holder-glow {
          position: absolute;
          inset: 12%;
          border: 1px solid rgba(255, 210, 126, 0.44);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 188, 82, 0.22), transparent 66%);
          box-shadow: 0 0 34px rgba(255, 159, 48, 0.28);
          animation: xamPulse 2.8s ease-in-out infinite;
        }

        .xam-holder-label {
          position: absolute;
          left: 50%;
          bottom: -0.2rem;
          min-width: max-content;
          transform: translateX(-50%);
          border: 1px solid rgba(255, 224, 161, 0.24);
          border-radius: 999px;
          padding: 0.42rem 0.68rem;
          background: rgba(35, 12, 7, 0.76);
          font-size: 0.76rem;
          font-weight: 900;
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.26);
        }

        .xam-holder-sticks {
          position: absolute;
          left: 49%;
          top: 42%;
          width: 46px;
          height: 76px;
          transform: translate(-50%, -50%);
        }

        .xam-holder-sticks span {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 8px;
          height: 72px;
          border-radius: 999px;
          background: linear-gradient(180deg, #9b3f22, #4b170e);
          opacity: 0.58;
          transform-origin: bottom center;
        }

        .xam-holder-sticks span:nth-child(1) {
          transform: translateX(-18px) rotate(-10deg);
        }

        .xam-holder-sticks span:nth-child(2) {
          transform: translateX(-4px) rotate(2deg);
        }

        .xam-holder-sticks span:nth-child(3) {
          transform: translateX(12px) rotate(10deg);
        }

        .xam-holder-hotspot.is-shaking .xam-holder-sticks {
          animation: xamShake 0.78s ease-in-out;
        }

        .xam-rising-stick {
          position: absolute;
          left: 14.5%;
          bottom: 20%;
          z-index: 5;
          width: clamp(34px, 4vw, 48px);
          height: clamp(168px, 23vw, 280px);
          border: 1px solid rgba(255, 217, 139, 0.28);
          border-radius: 999px;
          background: linear-gradient(180deg, #a84b25, #552015);
          color: #ffdf96;
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
          font-weight: 900;
          letter-spacing: 0.1em;
        }

        .xam-rising-stick.is-ready {
          box-shadow:
            0 24px 52px rgba(0, 0, 0, 0.36),
            0 0 34px rgba(255, 190, 82, 0.28);
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
          color: #ffd28a;
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .xam-card-meta strong {
          border-radius: 999px;
          padding: 0.28rem 0.5rem;
          background: rgba(255, 210, 126, 0.16);
          color: #ffe4ab;
        }

        .xam-card h2 {
          margin-top: 0.55rem;
          color: #fff4dd;
          font-size: clamp(1.32rem, 2.6vw, 2rem);
          line-height: 1.05;
        }

        .xam-card p {
          margin-top: 0.65rem;
          color: rgba(255, 241, 208, 0.78);
          font-size: 0.94rem;
          line-height: 1.5;
        }

        .xam-poem {
          white-space: pre-line;
          color: #ffe4ab !important;
          font-style: italic;
        }

        .xam-action {
          margin-top: 0.85rem;
          border-left: 3px solid rgba(255, 210, 126, 0.7);
          padding-left: 0.75rem;
        }

        .xam-action span {
          color: #ffd28a;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .xam-action p {
          margin-top: 0.25rem;
        }

        @keyframes xamPulse {
          0%,
          100% {
            opacity: 0.68;
            transform: scale(0.96);
          }

          50% {
            opacity: 1;
            transform: scale(1.04);
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

          .xin-xam-nav-link {
            min-height: 38px;
            padding: 0.42rem 0.7rem;
          }

          .xin-xam-layout {
            grid-template-columns: 1fr;
            grid-template-areas:
              "stage"
              "intro"
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
            font-size: clamp(1.1rem, 5vw, 1.32rem);
          }

          .xin-xam-title-card p {
            font-size: 0.62rem;
          }

          .xin-xam-title-card span {
            margin-top: 0.25rem;
            font-size: 0.72rem;
            line-height: 1.28;
          }

          .xin-xam-topic-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 0.28rem;
            margin-top: 0.5rem;
          }

          .xin-xam-topic-grid button {
            min-height: 34px;
            padding: 0 0.32rem;
            font-size: 0.72rem;
          }

          .xam-holder-hotspot {
            left: 7%;
            bottom: 13%;
            width: clamp(94px, 28vw, 124px);
            height: clamp(94px, 28vw, 124px);
          }

          .xam-holder-label {
            bottom: -0.08rem;
            padding: 0.32rem 0.5rem;
            font-size: 0.62rem;
          }

          .xam-rising-stick {
            left: 17%;
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
            font-size: clamp(0.98rem, 4.2vw, 1.2rem);
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
        }

        @media (prefers-reduced-motion: reduce) {
          .xam-holder-glow,
          .xam-holder-hotspot.is-shaking .xam-holder-sticks,
          .xam-rising-stick,
          .xam-card.is-open {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
