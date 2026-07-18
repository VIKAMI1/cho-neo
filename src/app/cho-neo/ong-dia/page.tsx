"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  createLocMemoryForWish,
  getLocalDayKey,
  getOngDiaShrineBlessing,
  loadOrCreateDailyMessage,
  touchShrineMemory,
  type ShrineMemory,
} from "@/lib/cho-neo/ong-dia-ritual";
import {
  createFallbackOngDiaPrayerResponse,
  type OngDiaPrayerResponse,
} from "@/lib/cho-neo/ong-dia-prayer";

const SHRINE_STAGE_IMAGE = "/images/cho-neo/Ong_Dia_Shrine.png";

type OngDiaDailyMessage = ReturnType<typeof loadOrCreateDailyMessage>;

type LocUiResult = {
  wish: string;
  locNumber: string;
  waterLine: string;
  vibeLine: string;
};

type PrayerExperience = "conversation" | "ritual" | "xin_xam";

type PrayerConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

type PrayerResponseMeta = {
  source?: string;
  generatedByProvider?: boolean;
};

function createPrayerProviderNotice(meta?: PrayerResponseMeta) {
  if (!meta || meta.generatedByProvider) return "";

  if (meta.source === "fallback_deterministic_ritual") {
    return "Ông Địa giữ lời vía sẵn cho nghi lễ nhỏ này.";
  }

  if (meta.source === "fallback_safety_guardrail") {
    return "Ông Địa giữ lời an toàn trước, rồi mới nói chuyện nhẹ sau.";
  }

  if (meta.source === "fallback_no_api_key") {
    return "Hôm nay đường AI chưa mở, Ông Địa dùng lời giữ vía sẵn.";
  }

  if (meta.source === "fallback_provider_timeout") {
    return "Ông Địa nghe chậm quá, nên trả lời bằng lời giữ vía sẵn.";
  }

  if (meta.source === "fallback_provider_rate_limited") {
    return "Đường AI đang đông, Ông Địa dùng lời giữ vía sẵn trước.";
  }

  if (meta.source?.startsWith("fallback_")) {
    return "Ông Địa chưa gọi được AI, nên dùng lời giữ vía sẵn.";
  }

  return "";
}

function appendPrayerConversationTurn(
  history: PrayerConversationTurn[],
  userPrayer: string,
  response: OngDiaPrayerResponse,
) {
  const nextTurns: PrayerConversationTurn[] = [
    ...history,
    { role: "user", content: userPrayer || "Xin vía nhẹ" },
    {
      role: "assistant",
      content: [response.loiOngDia, response.ongNhacNhe, response.viecNhoHomNay]
        .filter(Boolean)
        .join(" "),
    },
  ];

  return nextTurns.slice(-6);
}

function OngDiaShrineAtmosphere({ blessingSignal }: { blessingSignal: number }) {
  return (
    <div className="ong-dia-atmosphere" aria-hidden="true">
      <div className="ong-dia-window-rays">
        <span />
        <span />
        <span />
      </div>
      <div className="ong-dia-lattice-shadow" />
      <div className="ong-dia-lantern-glow ong-dia-lantern-glow-left" />
      <div className="ong-dia-lantern-glow ong-dia-lantern-glow-right" />
      <div className="ong-dia-lantern-glow ong-dia-lantern-glow-floor" />
      <div className="ong-dia-incense-smoke">
        <span />
        <span />
        <span />
      </div>
      <div className="ong-dia-dust-motes">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      {blessingSignal > 0 ? (
        <div key={blessingSignal} className="ong-dia-wish-response">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}
    </div>
  );
}

export default function OngDiaPage() {
  const [shrineMemory, setShrineMemory] = useState<ShrineMemory | null>(null);
  const [dailyMessage, setDailyMessage] = useState<OngDiaDailyMessage | null>(
    null,
  );
  const [blessingSignal, setBlessingSignal] = useState(0);
  const [isBlessingActive, setIsBlessingActive] = useState(false);
  const [blessingMessage, setBlessingMessage] = useState("");
  const [prayerResponse, setPrayerResponse] =
    useState<OngDiaPrayerResponse | null>(null);
  const [isPrayerResponseLoading, setIsPrayerResponseLoading] = useState(false);
  const [prayerProviderNotice, setPrayerProviderNotice] = useState("");
  const [prayerConversationHistory, setPrayerConversationHistory] = useState<
    PrayerConversationTurn[]
  >([]);
  const [smallPrayer, setSmallPrayer] = useState("");
  const [locResult, setLocResult] = useState<LocUiResult | null>(null);
  const [locNotice, setLocNotice] = useState("");
  const blessingMessageIndexRef = useRef(0);
  const prayerRequestInFlightRef = useRef(false);
  const lastBlessingVisualAtRef = useRef(0);
  const blessingVisualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const visitCopy = shrineMemory
    ? shrineMemory.visitCount > 1
      ? `Con đã ghé bàn Ông Địa ${shrineMemory.visitCount} ngày.`
      : "Lần đầu ghé bàn Ông Địa trong trình duyệt này."
    : "Ông Địa đang dọn bàn.";

  useEffect(() => {
    const todayKey = getLocalDayKey(new Date());
    setShrineMemory(touchShrineMemory(todayKey));
    setDailyMessage(loadOrCreateDailyMessage(todayKey));
  }, []);

  useEffect(() => {
    return () => {
      if (blessingVisualTimerRef.current) {
        clearTimeout(blessingVisualTimerRef.current);
      }
    };
  }, []);

  function showBlessingMessage() {
    blessingMessageIndexRef.current += 1;
    setBlessingMessage(getOngDiaShrineBlessing(blessingMessageIndexRef.current));
  }

  function triggerBlessingAtmosphere() {
    const now = Date.now();
    if (now - lastBlessingVisualAtRef.current < 3000) return;
    lastBlessingVisualAtRef.current = now;

    setBlessingSignal((current) => current + 1);
    setIsBlessingActive(true);

    if (blessingVisualTimerRef.current) {
      clearTimeout(blessingVisualTimerRef.current);
    }

    blessingVisualTimerRef.current = setTimeout(() => {
      setIsBlessingActive(false);
    }, 2200);
  }

  async function requestPrayerResponse(
    ritual: string,
    prayerOverride?: string,
    shouldTriggerAtmosphere = true,
    experience: PrayerExperience = "conversation",
  ) {
    if (prayerRequestInFlightRef.current) return;
    prayerRequestInFlightRef.current = true;

    const prayer = (prayerOverride ?? smallPrayer).trim();
    const fallback = createFallbackOngDiaPrayerResponse(prayer);
    const history =
      experience === "conversation" ? prayerConversationHistory : [];

    showBlessingMessage();
    setPrayerResponse(fallback);
    setPrayerProviderNotice("");
    setIsPrayerResponseLoading(true);
    if (shouldTriggerAtmosphere) {
      triggerBlessingAtmosphere();
    }

    try {
      const response = await fetch("/api/cho-neo/ong-dia/prayer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prayer,
          ritual,
          experience,
          history,
        }),
      });

      if (!response.ok) {
        setPrayerProviderNotice(
          "Đường nghe lời đang nghẽn. Con thử lại một nhịp nữa nha.",
        );
        return;
      }

      const payload = (await response.json()) as {
        result?: OngDiaPrayerResponse;
        meta?: PrayerResponseMeta;
      };

      if (
        payload.result?.loiOngDia &&
        payload.result.ongNhacNhe &&
        payload.result.viecNhoHomNay
      ) {
        setPrayerResponse(payload.result);
        setPrayerProviderNotice(createPrayerProviderNotice(payload.meta));
        if (experience === "conversation") {
          setPrayerConversationHistory((current) =>
            appendPrayerConversationTurn(current, prayer, payload.result!),
          );
        }
      } else {
        setPrayerProviderNotice(
          "Ông Địa nghe chưa rõ, nên giữ tạm một lời nhẹ cho con.",
        );
      }
    } catch {
      setPrayerResponse(fallback);
      setPrayerProviderNotice(
        "Đường nghe lời đang chập chờn. Con thử lại một nhịp nữa nha.",
      );
    } finally {
      prayerRequestInFlightRef.current = false;
      setIsPrayerResponseLoading(false);
    }
  }

  function handleBlessingRequest() {
    const experience = smallPrayer.trim() ? "conversation" : "ritual";
    void requestPrayerResponse("Xin vía nhẹ", undefined, true, experience);
  }

  function handleLocRequest() {
    const wish = smallPrayer.trim() || "Xin giữ lòng vững hôm nay.";
    const result = createLocMemoryForWish(wish);

    void requestPrayerResponse("Mở một lộc nhỏ", wish, result.ok, "ritual");

    if (!result.ok) {
      setLocNotice(result.message);
      return;
    }

    setLocNotice("");
    setLocResult({
      wish: result.latest.wish,
      locNumber: result.latest.locNumber,
      waterLine: result.reading.waterLine,
      vibeLine: result.reading.vibeLine,
    });
  }

  return (
    <main className="ong-dia-page">
      <section className="ong-dia-shell" aria-labelledby="ong-dia-title">
        <div className="ong-dia-copy">
          <p className="ong-dia-eyebrow">
            Bàn Ông Địa
            <span>Ong Dia Shrine</span>
          </p>
          <h1 id="ong-dia-title">
            Ghé Ông Địa
            <span>Warm shrine stage</span>
          </h1>
          <p>
            Một góc nhỏ để xin vía bình an, giữ lòng nhẹ, rồi đi tiếp một ngày
            làm nghề.
            <span>
              A warm neighborhood shrine stage for a steady heart and practical
              luck.
            </span>
          </p>
        </div>

        <Link href="/cho-neo" className="ong-dia-back">
          <span>Về Sân Làng</span>
          <small>Back to Village</small>
        </Link>
      </section>

      <section className="ong-dia-stage-wrap" aria-label="Sân khấu Ông Địa">
        <div
          className={`ong-dia-stage ${
            isBlessingActive ? "ongdia-blessing-active" : ""
          }`}
        >
          <Image
            src={SHRINE_STAGE_IMAGE}
            alt="Warm Vietnamese Ông Địa shrine stage with altar offerings, fruit, chè trays, lanterns, a resting cat, and a Shiba Inu"
            fill
            priority
            sizes="(max-width: 900px) 100vw, 1180px"
            className="ong-dia-stage-image"
          />
          <OngDiaShrineAtmosphere blessingSignal={blessingSignal} />
          <div className="ong-dia-center-guide" aria-hidden="true" />
        </div>
      </section>

      <section className="ong-dia-blessing-card" aria-label="Xin vía Ông Địa">
        <div className="ong-dia-daily-message">
          <p className="ong-dia-ritual-kicker">
            Lời Ông Địa hôm nay
            <span>{visitCopy}</span>
          </p>
          <h2>{dailyMessage?.title ?? "Có tâm thì nghề ở lâu."}</h2>
          <p>
            {dailyMessage?.body ??
              "Ông Địa nhắc nhẹ: giữ lời mềm, tay chắc, lòng yên rồi hãy đi tiếp."}
          </p>
        </div>

        {blessingMessage ? (
          <p className="ong-dia-soft-blessing" aria-live="polite">
            {blessingMessage}
          </p>
        ) : null}

        {prayerResponse ? (
          <article className="ong-dia-prayer-response" aria-live="polite">
            {isPrayerResponseLoading ? (
              <p className="ong-dia-response-loading">Ông Địa đang nghe...</p>
            ) : null}
            <div>
              <p>Lời Ông Địa</p>
              <span>{prayerResponse.loiOngDia}</span>
            </div>
            <div>
              <p>Ông nhắc nhẹ</p>
              <span>{prayerResponse.ongNhacNhe}</span>
            </div>
            <div>
              <p>Việc nhỏ hôm nay</p>
              <span>{prayerResponse.viecNhoHomNay}</span>
            </div>
            {prayerResponse.khiChuyenQuaNang ? (
              <div>
                <p>Khi chuyện quá nặng</p>
                <span>{prayerResponse.khiChuyenQuaNang}</span>
              </div>
            ) : null}
            {prayerProviderNotice ? (
              <p className="ong-dia-provider-notice">{prayerProviderNotice}</p>
            ) : null}
          </article>
        ) : null}

        <div className="ong-dia-prayer-panel">
          <label htmlFor="ong-dia-prayer">
            Khấn một điều nhỏ
            <span>Small prayer</span>
          </label>
          <textarea
            id="ong-dia-prayer"
            value={smallPrayer}
            onChange={(event) => setSmallPrayer(event.target.value)}
            maxLength={160}
            placeholder="Ông Địa ơi, cho con bình tĩnh hôm nay..."
          />
          <div className="ong-dia-prayer-actions">
            <button
              type="button"
              onClick={handleBlessingRequest}
              disabled={isPrayerResponseLoading}
            >
              {isPrayerResponseLoading ? "Đang nghe..." : "Xin vía nhẹ"}
            </button>
            <button
              type="button"
              onClick={handleLocRequest}
              disabled={isPrayerResponseLoading}
            >
              Mở một lộc nhỏ
            </button>
          </div>
        </div>

        {locResult ? (
          <article className="ong-dia-result-card" aria-live="polite">
            <div>
              <p>Lộc nhỏ hôm nay</p>
              <h3>Số vía: {locResult.locNumber}</h3>
            </div>
            <div>
              <p>Lời giữ vía</p>
              <span>{locResult.waterLine}</span>
            </div>
            <div>
              <p>Câu giữ lòng</p>
              <span>{locResult.vibeLine}</span>
            </div>
          </article>
        ) : (
          <p className="ong-dia-result-placeholder" aria-live="polite">
            Chạm Ông Địa để nhận một lời lành. Nếu muốn, viết một điều nhỏ rồi
            mở lộc nhẹ cho lòng bớt rối.
          </p>
        )}

        {locNotice ? <p className="ong-dia-loc-notice">{locNotice}</p> : null}

        <p className="ong-dia-safety-copy">
          Lộc này để giữ lòng, không phải lời hứa chắc chắn về tiền bạc, sức
          khỏe, pháp lý, hay tương lai.
        </p>

        <div className="ong-dia-blessing-actions">
          <Link href="/xin-xam">Qua phòng Xin Xăm</Link>
        </div>
      </section>

      <style>{`
        .ong-dia-page {
          min-height: 100vh;
          overflow-x: hidden;
          background:
            radial-gradient(circle at 50% 10%, rgba(255, 177, 73, 0.24), transparent 36rem),
            linear-gradient(180deg, #190d09 0%, #2a120b 44%, #130907 100%);
          color: #fff4dd;
          padding: clamp(1rem, 2.5vw, 2rem);
        }

        .ong-dia-page,
        .ong-dia-page * {
          box-sizing: border-box;
        }

        .ong-dia-shell {
          width: min(1180px, 100%);
          margin: 0 auto 1rem;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1rem;
        }

        .ong-dia-copy {
          max-width: 720px;
        }

        .ong-dia-eyebrow,
        .ong-dia-copy h1,
        .ong-dia-copy p {
          margin: 0;
        }

        .ong-dia-eyebrow {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
          align-items: center;
          color: #ffd48b;
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ong-dia-eyebrow span {
          color: rgba(255, 244, 221, 0.7);
          letter-spacing: 0.08em;
        }

        .ong-dia-copy h1 {
          margin-top: 0.35rem;
          color: #fff0c2;
          font-size: clamp(2.05rem, 5vw, 4.75rem);
          line-height: 0.95;
          text-shadow: 0 0 28px rgba(255, 159, 53, 0.42);
        }

        .ong-dia-copy h1 span,
        .ong-dia-copy p span {
          display: block;
        }

        .ong-dia-copy h1 span {
          margin-top: 0.18rem;
          color: rgba(255, 212, 139, 0.75);
          font-size: 0.32em;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ong-dia-copy p {
          margin-top: 0.7rem;
          color: rgba(255, 244, 221, 0.82);
          font-size: clamp(0.95rem, 1.5vw, 1.05rem);
          line-height: 1.55;
        }

        .ong-dia-copy p span {
          color: rgba(255, 244, 221, 0.62);
        }

        .ong-dia-back {
          display: inline-flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-height: 44px;
          padding: 0.55rem 0.85rem;
          border: 1px solid rgba(255, 212, 139, 0.32);
          border-radius: 999px;
          background: rgba(52, 22, 12, 0.72);
          color: #ffe7ae;
          text-decoration: none;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24);
        }

        .ong-dia-back span {
          font-size: 0.82rem;
          font-weight: 800;
        }

        .ong-dia-back small {
          color: rgba(255, 244, 221, 0.66);
          font-size: 0.67rem;
        }

        .ong-dia-stage-wrap {
          width: min(1180px, 100%);
          margin: 0 auto;
          border-radius: clamp(18px, 3vw, 30px);
          background:
            linear-gradient(135deg, rgba(255, 211, 138, 0.22), transparent 22%),
            rgba(38, 16, 8, 0.86);
          padding: clamp(0.35rem, 1vw, 0.7rem);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.5),
            inset 0 0 0 1px rgba(255, 218, 157, 0.22);
        }

        .ong-dia-stage {
          position: relative;
          aspect-ratio: 1448 / 1086;
          width: 100%;
          overflow: hidden;
          border-radius: clamp(14px, 2.2vw, 24px);
          background: #1a0d08;
          isolation: isolate;
        }

        .ong-dia-stage-image {
          object-fit: cover;
          object-position: center;
          z-index: 0;
        }

        .ong-dia-stage::after {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          content: "";
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 198, 97, 0.14), transparent 18rem),
            linear-gradient(180deg, rgba(10, 4, 2, 0.04), rgba(10, 4, 2, 0.18));
          transition: opacity 0.7s ease, background 0.7s ease;
        }

        .ongdia-blessing-active::after {
          background:
            radial-gradient(circle at 50% 42%, rgba(255, 211, 126, 0.22), transparent 18rem),
            radial-gradient(circle at 61% 43%, rgba(255, 188, 91, 0.13), transparent 12rem),
            linear-gradient(180deg, rgba(10, 4, 2, 0.02), rgba(10, 4, 2, 0.13));
        }

        .ong-dia-atmosphere {
          position: absolute;
          z-index: 2;
          inset: 0;
          pointer-events: none;
        }

        .ong-dia-window-rays,
        .ong-dia-lattice-shadow,
        .ong-dia-lantern-glow,
        .ong-dia-incense-smoke,
        .ong-dia-dust-motes,
        .ong-dia-wish-response {
          position: absolute;
          pointer-events: none;
        }

        .ong-dia-window-rays {
          left: -6%;
          top: 4%;
          width: 46%;
          height: 76%;
          mix-blend-mode: screen;
          opacity: 0.45;
          animation: ong-dia-rays-breathe 68s ease-in-out infinite;
          transition: opacity 0.7s ease;
        }

        .ong-dia-window-rays span {
          position: absolute;
          left: 0;
          width: 112%;
          height: 17%;
          border-radius: 999px;
          background: linear-gradient(
            95deg,
            rgba(255, 218, 137, 0.36),
            rgba(255, 186, 83, 0.13) 52%,
            rgba(255, 228, 178, 0)
          );
          filter: blur(18px);
          transform-origin: left center;
        }

        .ong-dia-window-rays span:nth-child(1) {
          top: 6%;
          transform: rotate(15deg);
        }

        .ong-dia-window-rays span:nth-child(2) {
          top: 29%;
          opacity: 0.72;
          transform: rotate(9deg);
          animation: ong-dia-ray-shift 76s ease-in-out infinite;
        }

        .ong-dia-window-rays span:nth-child(3) {
          top: 53%;
          opacity: 0.52;
          transform: rotate(4deg);
          animation: ong-dia-ray-shift 89s ease-in-out -12s infinite;
        }

        .ong-dia-lattice-shadow {
          left: -12%;
          top: 7%;
          width: 63%;
          height: 82%;
          opacity: 0.23;
          mix-blend-mode: multiply;
          background:
            repeating-linear-gradient(
              81deg,
              rgba(42, 20, 12, 0.28) 0 4px,
              transparent 4px 38px
            ),
            repeating-linear-gradient(
              8deg,
              rgba(42, 20, 12, 0.18) 0 3px,
              transparent 3px 44px
            ),
            radial-gradient(ellipse at 18% 32%, rgba(41, 62, 27, 0.2), transparent 34%),
            radial-gradient(ellipse at 9% 56%, rgba(41, 62, 27, 0.18), transparent 24%);
          filter: blur(3.5px);
          transform: rotate(1deg);
          animation: ong-dia-shadow-drift 61s ease-in-out infinite;
        }

        .ong-dia-lantern-glow {
          border-radius: 999px;
          background: radial-gradient(
            circle,
            rgba(255, 210, 92, 0.44),
            rgba(255, 111, 44, 0.18) 42%,
            rgba(255, 115, 36, 0) 72%
          );
          filter: blur(8px);
          mix-blend-mode: screen;
          opacity: 0.58;
          animation: ong-dia-lantern-breathe 8.8s ease-in-out infinite;
          transition: opacity 0.7s ease, filter 0.7s ease;
        }

        .ong-dia-lantern-glow-left {
          left: 24.8%;
          top: 8.4%;
          width: 10.4%;
          height: 18%;
          animation-duration: 8.9s;
          animation-delay: -1.7s;
        }

        .ong-dia-lantern-glow-right {
          left: 62.8%;
          top: 8.8%;
          width: 10.8%;
          height: 18.4%;
          animation-duration: 10.6s;
          animation-delay: -4.1s;
        }

        .ong-dia-lantern-glow-floor {
          left: 76.4%;
          top: 76.1%;
          width: 6.6%;
          height: 10.8%;
          opacity: 0.52;
          filter: blur(6px);
          animation-duration: 7.7s;
          animation-delay: -2.9s;
        }

        .ong-dia-incense-smoke {
          left: 61.7%;
          top: 31.4%;
          width: 8%;
          height: 25%;
          opacity: 0.56;
          transition: opacity 0.7s ease, transform 0.7s ease;
        }

        .ong-dia-incense-smoke span {
          position: absolute;
          bottom: 0;
          width: 2px;
          height: 74%;
          border-radius: 999px;
          background: linear-gradient(
            180deg,
            rgba(255, 245, 222, 0),
            rgba(255, 240, 209, 0.42) 36%,
            rgba(255, 245, 222, 0)
          );
          filter: blur(1.5px);
          transform-origin: bottom center;
          animation: ong-dia-smoke-rise 8.6s ease-in-out infinite;
        }

        .ong-dia-incense-smoke span:nth-child(1) {
          left: 34%;
          animation-delay: -1.2s;
        }

        .ong-dia-incense-smoke span:nth-child(2) {
          left: 50%;
          height: 88%;
          opacity: 0.82;
          animation-delay: -4.5s;
          animation-duration: 10.4s;
        }

        .ong-dia-incense-smoke span:nth-child(3) {
          left: 63%;
          height: 67%;
          opacity: 0.68;
          animation-delay: -6.8s;
          animation-duration: 9.5s;
        }

        .ong-dia-dust-motes {
          left: 6%;
          top: 12%;
          width: 38%;
          height: 58%;
          mix-blend-mode: screen;
          opacity: 0.72;
          transition: opacity 0.7s ease;
        }

        .ong-dia-dust-motes span {
          position: absolute;
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: rgba(255, 230, 166, 0.68);
          box-shadow: 0 0 8px rgba(255, 206, 112, 0.42);
          opacity: 0;
          animation: ong-dia-dust-float 15s ease-in-out infinite;
        }

        .ong-dia-dust-motes span:nth-child(1) {
          left: 8%;
          top: 18%;
          animation-delay: -2.5s;
        }

        .ong-dia-dust-motes span:nth-child(2) {
          left: 21%;
          top: 52%;
          animation-delay: -8.2s;
          animation-duration: 19s;
        }

        .ong-dia-dust-motes span:nth-child(3) {
          left: 34%;
          top: 31%;
          animation-delay: -5.6s;
          animation-duration: 17s;
        }

        .ong-dia-dust-motes span:nth-child(4) {
          left: 46%;
          top: 62%;
          animation-delay: -11s;
          animation-duration: 18.5s;
        }

        .ong-dia-dust-motes span:nth-child(5) {
          left: 58%;
          top: 25%;
          animation-delay: -13.4s;
          animation-duration: 16.2s;
        }

        .ong-dia-dust-motes span:nth-child(6) {
          left: 67%;
          top: 48%;
          animation-delay: -6.5s;
          animation-duration: 21s;
        }

        .ong-dia-dust-motes span:nth-child(7) {
          left: 79%;
          top: 36%;
          animation-delay: -9.4s;
          animation-duration: 14.8s;
        }

        .ong-dia-dust-motes span:nth-child(8) {
          left: 88%;
          top: 57%;
          animation-delay: -3.2s;
          animation-duration: 20s;
        }

        .ong-dia-dust-motes span:nth-child(9) {
          left: 96%;
          top: 20%;
          animation-delay: -15s;
          animation-duration: 18s;
        }

        .ong-dia-wish-response {
          inset: 0;
          background:
            radial-gradient(circle at 50% 40%, rgba(255, 225, 144, 0.34), transparent 28%),
            radial-gradient(circle at 66% 33%, rgba(255, 170, 72, 0.22), transparent 22%),
            linear-gradient(180deg, rgba(255, 210, 120, 0.08), transparent 62%);
          mix-blend-mode: screen;
          opacity: 0;
          animation: ong-dia-wish-listened 2.2s ease-out both;
        }

        .ong-dia-wish-response span {
          position: absolute;
          left: 62%;
          top: 64%;
          width: 4px;
          height: 4px;
          border-radius: 999px;
          background: rgba(255, 226, 148, 0.82);
          box-shadow: 0 0 10px rgba(255, 190, 89, 0.72);
          animation: ong-dia-wish-particle 2.2s ease-out both;
        }

        .ongdia-blessing-active .ong-dia-window-rays {
          opacity: 0.58;
        }

        .ongdia-blessing-active .ong-dia-lantern-glow {
          filter: blur(10px);
          opacity: 0.72;
        }

        .ongdia-blessing-active .ong-dia-incense-smoke {
          opacity: 0.74;
          transform: translate3d(0, -1.5%, 0);
        }

        .ongdia-blessing-active .ong-dia-dust-motes {
          opacity: 0.88;
        }

        .ong-dia-wish-response span:nth-child(2) {
          left: 50%;
          top: 66%;
          animation-delay: 0.12s;
        }

        .ong-dia-wish-response span:nth-child(3) {
          left: 70%;
          top: 73%;
          animation-delay: 0.22s;
        }

        .ong-dia-wish-response span:nth-child(4) {
          left: 57%;
          top: 55%;
          animation-delay: 0.34s;
        }

        .ong-dia-wish-response span:nth-child(5) {
          left: 77%;
          top: 78%;
          animation-delay: 0.42s;
        }

        @keyframes ong-dia-rays-breathe {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
            opacity: 0.38;
          }

          48% {
            transform: translate3d(1.7%, 1.1%, 0) scale(1.04);
            opacity: 0.55;
          }
        }

        @keyframes ong-dia-ray-shift {
          0%,
          100% {
            opacity: 0.56;
            transform: translateX(0) rotate(9deg);
          }

          52% {
            opacity: 0.76;
            transform: translateX(3%) rotate(11deg);
          }
        }

        @keyframes ong-dia-shadow-drift {
          0%,
          100% {
            transform: translate3d(0, 0, 0) rotate(1deg);
            opacity: 0.18;
          }

          50% {
            transform: translate3d(2.3%, 1.4%, 0) rotate(0.35deg);
            opacity: 0.25;
          }
        }

        @keyframes ong-dia-lantern-breathe {
          0%,
          100% {
            transform: scale(0.96);
            opacity: 0.42;
          }

          50% {
            transform: scale(1.08);
            opacity: 0.7;
          }
        }

        @keyframes ong-dia-smoke-rise {
          0% {
            transform: translate3d(0, 8%, 0) rotate(2deg) scaleY(0.82);
            opacity: 0;
          }

          24% {
            opacity: 0.58;
          }

          64% {
            opacity: 0.42;
          }

          100% {
            transform: translate3d(12px, -24%, 0) rotate(13deg) scaleY(1.08);
            opacity: 0;
          }
        }

        @keyframes ong-dia-dust-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
            opacity: 0;
          }

          28% {
            opacity: 0.28;
          }

          54% {
            transform: translate3d(14px, -18px, 0);
            opacity: 0.48;
          }

          78% {
            opacity: 0.18;
          }
        }

        @keyframes ong-dia-wish-listened {
          0% {
            opacity: 0;
            filter: brightness(1);
          }

          28% {
            opacity: 0.72;
            filter: brightness(1.08);
          }

          100% {
            opacity: 0;
            filter: brightness(1);
          }
        }

        @keyframes ong-dia-wish-particle {
          0% {
            transform: translate3d(0, 0, 0) scale(0.45);
            opacity: 0;
          }

          18% {
            opacity: 0.78;
          }

          100% {
            transform: translate3d(-14px, -76px, 0) scale(1.15);
            opacity: 0;
          }
        }

        .ong-dia-center-guide {
          position: absolute;
          left: 50%;
          top: 43%;
          z-index: 2;
          width: min(16vw, 180px);
          aspect-ratio: 1 / 1;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(circle, rgba(255, 202, 113, 0.18), transparent 62%);
          filter: blur(3px);
          opacity: 0.74;
          pointer-events: none;
        }

        .ong-dia-blessing-card {
          width: min(1180px, 100%);
          margin: 0.9rem auto 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1rem;
          align-items: start;
          padding: clamp(0.9rem, 2vw, 1.2rem);
          border: 1px solid rgba(255, 212, 139, 0.2);
          border-radius: 22px;
          background:
            linear-gradient(135deg, rgba(255, 214, 142, 0.14), transparent 34%),
            rgba(50, 22, 13, 0.76);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
        }

        .ong-dia-blessing-card p,
        .ong-dia-blessing-card h2 {
          margin: 0;
        }

        .ong-dia-blessing-card h2 {
          color: #fff0c2;
          font-size: clamp(1.5rem, 3vw, 2.4rem);
          line-height: 1;
        }

        .ong-dia-blessing-card p {
          margin-top: 0.55rem;
          color: rgba(255, 244, 221, 0.72);
          line-height: 1.5;
        }

        .ong-dia-ritual-kicker,
        .ong-dia-result-card p,
        .ong-dia-result-placeholder,
        .ong-dia-prayer-panel label {
          color: #ffd48b !important;
          font-weight: 900;
        }

        .ong-dia-ritual-kicker {
          font-size: 0.78rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ong-dia-ritual-kicker span {
          display: block;
          margin-top: 0.22rem;
          color: rgba(255, 244, 221, 0.62);
          font-size: 0.82em;
          letter-spacing: 0;
          text-transform: none;
        }

        .ong-dia-daily-message {
          display: grid;
          gap: 0.25rem;
        }

        .ong-dia-soft-blessing,
        .ong-dia-loc-notice,
        .ong-dia-safety-copy {
          margin: 0;
          border: 1px solid rgba(255, 212, 139, 0.18);
          border-radius: 16px;
          background: rgba(255, 244, 221, 0.07);
          padding: 0.75rem 0.85rem;
          line-height: 1.45;
        }

        .ong-dia-soft-blessing {
          color: #fff0c2 !important;
        }

        .ong-dia-prayer-response {
          display: grid;
          gap: 0.65rem;
          margin: 0;
          border: 1px solid rgba(255, 212, 139, 0.2);
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(255, 244, 221, 0.13), transparent 42%),
            rgba(255, 244, 221, 0.08);
          padding: 0.85rem;
        }

        .ong-dia-prayer-response div {
          min-width: 0;
          border-top: 1px solid rgba(255, 212, 139, 0.12);
          padding-top: 0.62rem;
        }

        .ong-dia-prayer-response div:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .ong-dia-prayer-response p,
        .ong-dia-response-loading {
          margin: 0;
          color: #ffd48b !important;
          font-size: 0.78rem;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ong-dia-prayer-response span {
          display: block;
          margin-top: 0.28rem;
          color: rgba(255, 244, 221, 0.84);
          line-height: 1.46;
        }

        .ong-dia-response-loading {
          border: 1px solid rgba(255, 212, 139, 0.16);
          border-radius: 999px;
          background: rgba(255, 244, 221, 0.08);
          padding: 0.5rem 0.7rem;
          width: fit-content;
        }

        .ong-dia-loc-notice {
          color: #ffd48b !important;
        }

        .ong-dia-provider-notice {
          margin: 0.15rem 0 0;
          color: rgba(255, 239, 203, 0.78);
          font-size: 0.83rem;
          line-height: 1.45;
        }

        .ong-dia-safety-copy {
          color: rgba(255, 244, 221, 0.66) !important;
          font-size: 0.88rem;
        }

        .ong-dia-prayer-panel {
          display: grid;
          gap: 0.65rem;
          border: 1px solid rgba(255, 212, 139, 0.18);
          border-radius: 18px;
          background: rgba(255, 244, 221, 0.08);
          padding: 0.85rem;
        }

        .ong-dia-prayer-panel label {
          display: block;
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ong-dia-prayer-panel label span {
          display: block;
          margin-top: 0.16rem;
          color: rgba(255, 244, 221, 0.58);
          font-size: 0.82em;
          letter-spacing: 0;
          text-transform: none;
        }

        .ong-dia-prayer-panel textarea {
          width: 100%;
          min-height: 92px;
          resize: vertical;
          border: 1px solid rgba(255, 212, 139, 0.22);
          border-radius: 16px;
          background: rgba(22, 8, 4, 0.55);
          color: #fff4dd;
          padding: 0.8rem 0.85rem;
          font: inherit;
          font-size: 0.96rem;
          line-height: 1.42;
          outline: none;
        }

        .ong-dia-prayer-panel textarea::placeholder {
          color: rgba(255, 244, 221, 0.46);
        }

        .ong-dia-prayer-panel textarea:focus {
          border-color: rgba(255, 212, 139, 0.58);
          box-shadow: 0 0 0 3px rgba(255, 212, 139, 0.12);
        }

        .ong-dia-prayer-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.55rem;
        }

        .ong-dia-prayer-actions button,
        .ong-dia-blessing-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 46px;
          border: 1px solid rgba(255, 212, 139, 0.24);
          border-radius: 999px;
          padding: 0.45rem 0.8rem;
          font: inherit;
          font-size: 0.86rem;
          font-weight: 900;
          text-decoration: none;
          text-align: center;
          overflow-wrap: anywhere;
          touch-action: manipulation;
        }

        .ong-dia-prayer-actions button {
          color: #251006;
          background: rgba(255, 212, 139, 0.86);
          cursor: pointer;
        }

        .ong-dia-prayer-actions button:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .ong-dia-prayer-actions button:last-child {
          background: #ffd48b;
          box-shadow: 0 0 28px rgba(255, 180, 82, 0.25);
        }

        .ong-dia-result-card {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.75rem;
        }

        .ong-dia-result-card div,
        .ong-dia-result-placeholder {
          min-width: 0;
          border: 1px solid rgba(255, 212, 139, 0.18);
          border-radius: 18px;
          background: rgba(255, 244, 221, 0.07);
          padding: 0.85rem;
        }

        .ong-dia-result-card h3 {
          margin: 0.35rem 0 0;
          color: #fff0c2;
          font-size: clamp(1.1rem, 2vw, 1.35rem);
          line-height: 1.25;
        }

        .ong-dia-result-card span {
          display: block;
          margin-top: 0.35rem;
          color: rgba(255, 244, 221, 0.78);
          line-height: 1.45;
        }

        .ong-dia-result-placeholder {
          margin: 0;
          line-height: 1.45;
        }

        .ong-dia-blessing-actions {
          display: flex;
          justify-content: flex-end;
        }

        .ong-dia-blessing-actions a {
          color: #ffe7ae;
          background: rgba(255, 255, 255, 0.07);
        }

        @media (max-width: 760px) {
          .ong-dia-page {
            padding: max(0.75rem, env(safe-area-inset-top)) 0.65rem max(1rem, env(safe-area-inset-bottom));
          }

          .ong-dia-shell {
            align-items: stretch;
            flex-direction: column;
            gap: 0.5rem;
            margin-bottom: 0.55rem;
          }

          .ong-dia-copy {
            max-width: none;
          }

          .ong-dia-eyebrow {
            font-size: 0.68rem;
            letter-spacing: 0.08em;
          }

          .ong-dia-copy h1 {
            margin-top: 0.22rem;
            font-size: clamp(1.55rem, 8vw, 2.2rem);
            line-height: 1;
          }

          .ong-dia-copy h1 span {
            display: none;
          }

          .ong-dia-copy p {
            display: none;
          }

          .ong-dia-back {
            order: -1;
            width: fit-content;
            min-height: 42px;
            padding: 0.48rem 0.78rem;
          }

          .ong-dia-stage-wrap {
            border-radius: 18px;
            padding: 0.26rem;
          }

          .ong-dia-stage {
            aspect-ratio: 1448 / 1086;
            min-height: 0;
            max-height: 42svh;
          }

          .ong-dia-stage-image {
            object-fit: cover;
            object-position: 50% 50%;
          }

          .ong-dia-stage::after {
            background:
              radial-gradient(circle at 50% 43%, rgba(255, 198, 97, 0.1), transparent 10rem),
              linear-gradient(180deg, rgba(10, 4, 2, 0.02), rgba(10, 4, 2, 0.12));
          }

          .ong-dia-window-rays {
            left: -8%;
            top: 4%;
            width: 50%;
            height: 68%;
            opacity: 0.38;
          }

          .ong-dia-lattice-shadow {
            width: 58%;
            opacity: 0.16;
          }

          .ong-dia-lantern-glow-left {
            left: 25.1%;
            top: 8.6%;
            width: 10.8%;
            height: 18.5%;
          }

          .ong-dia-lantern-glow-right {
            left: 63%;
            top: 8.6%;
            width: 11%;
            height: 18.5%;
          }

          .ong-dia-lantern-glow-floor {
            left: 76.5%;
            top: 75.6%;
            width: 7%;
            height: 11.4%;
          }

          .ong-dia-incense-smoke {
            left: 61.8%;
            top: 31.8%;
            width: 8%;
            height: 24%;
            opacity: 0.44;
          }

          .ong-dia-dust-motes {
            opacity: 0.48;
          }

          .ong-dia-center-guide {
            top: 43%;
            width: 18vw;
          }

          .ong-dia-blessing-card {
            grid-template-columns: 1fr;
            border-radius: 18px;
            gap: 0.65rem;
            margin-top: 0.65rem;
            padding: 0.75rem;
          }

          .ong-dia-blessing-card h2 {
            font-size: clamp(1.15rem, 5.7vw, 1.35rem);
            line-height: 1.12;
          }

          .ong-dia-blessing-card p {
            font-size: 0.86rem;
            line-height: 1.38;
          }

          .ong-dia-prayer-panel {
            padding: 0.72rem;
          }

          .ong-dia-prayer-panel textarea {
            min-height: 82px;
            font-size: 1rem;
          }

          .ong-dia-prayer-actions,
          .ong-dia-result-card {
            grid-template-columns: 1fr;
          }

          .ong-dia-prayer-actions {
            display: grid;
          }

          .ong-dia-blessing-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 430px) {
          .ong-dia-page {
            padding-left: 0.5rem;
            padding-right: 0.5rem;
          }

          .ong-dia-stage-wrap,
          .ong-dia-blessing-card {
            width: 100%;
          }

          .ong-dia-back span {
            font-size: 0.78rem;
          }

          .ong-dia-back small {
            font-size: 0.62rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ong-dia-window-rays,
          .ong-dia-lattice-shadow,
          .ong-dia-lantern-glow,
          .ong-dia-incense-smoke span,
          .ong-dia-dust-motes span,
          .ong-dia-wish-response,
          .ong-dia-wish-response span {
            animation: none;
          }

          .ong-dia-window-rays {
            opacity: 0.3;
          }

          .ong-dia-lattice-shadow {
            opacity: 0.13;
          }

          .ong-dia-lantern-glow {
            opacity: 0.5;
          }

          .ong-dia-incense-smoke span {
            transform: translate3d(4px, -8%, 0) rotate(7deg) scaleY(0.96);
            opacity: 0.28;
          }

          .ong-dia-dust-motes,
          .ong-dia-wish-response {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}
