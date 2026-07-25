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
} from "@/lib/cho-neo/ong-dia-ritual";
import { type OngDiaPrayerResponse } from "@/lib/cho-neo/ong-dia-prayer";
import {
  getChoNeoBetaSessionId,
  getChoNeoDeviceType,
  trackChoNeoBetaEvent,
} from "@/lib/cho-neo/beta-analytics";

const SHRINE_STAGE_DAY_IMAGE = "/images/cho-neo/Ong_Dia_Shrine.png";
const SHRINE_STAGE_NIGHT_IMAGE =
  "/images/cho-neo/Ong-Dia-Shrine-Nighttime.png";
const ONG_DIA_V1_SUCCESS_DATE_KEY = "choNeo.ongDiaV1.lastSuccessDate";
const ONG_DIA_V1_RETURN_EVENT_DATE_KEY = "choNeo.ongDiaV1.returnEventDate";
const ONG_DIA_RITUAL_ANIMATION_MS = 1800;

type OngDiaDailyMessage = ReturnType<typeof loadOrCreateDailyMessage>;

type LocUiResult = {
  wish: string;
  locNumber: string;
  waterLine: string;
  vibeLine: string;
};

type PrayerExperience = "conversation" | "ritual" | "xin_xam";
type RitualPhase = "idle" | "ritual" | "pondering";
type OngDiaFeedbackStatus = "idle" | "saving" | "saved" | "error";

type PrayerConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

type PrayerTurn = {
  id: number;
  successAccepted: boolean;
};

type PrayerResponseUi = {
  presentation?: "keepsake" | "compact_retry";
};

type LastPrayerRequest = {
  experience: PrayerExperience;
  prayer: string;
  ritual?: string;
};

const PRAYER_CLEAR_CONFIRMATION =
  "Lời khấn đã tan theo khói. Chợ Neo không lưu lại.";
const PRAYER_PRIVACY_NOTE =
  "Chợ Neo không giữ lời khấn của con. Cuộc trò chuyện chỉ tồn tại trong phiên này và sẽ tan đi khi con rời Bàn Ông Địa hoặc bấm Xóa lời khấn.";
const PRAYER_CLEAR_ANIMATION_MS = 1500;
const COMPACT_PRAYER_FALLBACK =
  "Ông Địa đang nghỉ một nhịp. Con thử lại sau nhé.";
const ONG_DIA_CONVERSATION_STORAGE_PREFIXES = [
  "choNeo.ongDiaConversation",
  "choNeo.ongDiaPrayerConversation",
  "choNeo.ongDiaPrayerSession",
];
const ONG_DIA_RITUAL_FEEDBACK_CHOICES = ["Có", "Không", "Có thể"] as const;
const ONG_DIA_AFTER_CHAT_FEEDBACK_CHOICES = ["Có", "Một chút", "Chưa"] as const;

function isOngDiaDaytime(date = new Date()) {
  const hour = date.getHours();

  return hour >= 6 && hour < 18;
}

function getOngDiaShrineStageImage(date = new Date()) {
  return isOngDiaDaytime(date) ? SHRINE_STAGE_DAY_IMAGE : SHRINE_STAGE_NIGHT_IMAGE;
}

function getNextOngDiaArtworkBoundaryMs(date = new Date()) {
  const nextBoundary = new Date(date);
  const hour = date.getHours();

  nextBoundary.setMinutes(0, 0, 0);

  if (hour < 6) {
    nextBoundary.setHours(6);
  } else if (hour < 18) {
    nextBoundary.setHours(18);
  } else {
    nextBoundary.setDate(nextBoundary.getDate() + 1);
    nextBoundary.setHours(6);
  }

  return Math.max(1000, nextBoundary.getTime() - date.getTime());
}

function useOngDiaShrineStageImage() {
  const [stageImage, setStageImage] = useState(SHRINE_STAGE_DAY_IMAGE);

  useEffect(() => {
    let timeoutId: number | null = null;

    const syncStageImage = () => {
      const now = new Date();
      setStageImage(getOngDiaShrineStageImage(now));
      timeoutId = window.setTimeout(
        syncStageImage,
        getNextOngDiaArtworkBoundaryMs(now),
      );
    };

    syncStageImage();

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  return stageImage;
}

function getPrayerClearAnimationMs() {
  if (typeof window === "undefined") return PRAYER_CLEAR_ANIMATION_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 180
    : PRAYER_CLEAR_ANIMATION_MS;
}

function getOngDiaRitualAnimationMs() {
  if (typeof window === "undefined") return ONG_DIA_RITUAL_ANIMATION_MS;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 180
    : ONG_DIA_RITUAL_ANIMATION_MS;
}

function createOngDiaShareText(response: OngDiaPrayerResponse) {
  return [
    "Lời Ông Địa hôm nay",
    "",
    response.loiOngDia,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function getOngDiaShareUrl() {
  if (typeof window === "undefined") {
    return "https://cho-neo.vercel.app/cho-neo/ong-dia";
  }
  return `${window.location.origin}/cho-neo/ong-dia`;
}

function rememberOngDiaV1SuccessDate(dayKey: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ONG_DIA_V1_SUCCESS_DATE_KEY, dayKey);
  } catch {
    // Local return memory is optional and never blocks the shrine.
  }
}

function trackOngDiaV1NextDayReturn(todayKey: string) {
  if (typeof window === "undefined") return;

  try {
    const lastSuccessDate = window.localStorage.getItem(ONG_DIA_V1_SUCCESS_DATE_KEY);
    const lastReturnEventDate = window.localStorage.getItem(
      ONG_DIA_V1_RETURN_EVENT_DATE_KEY,
    );
    if (
      lastSuccessDate &&
      lastSuccessDate < todayKey &&
      lastReturnEventDate !== todayKey
    ) {
      trackChoNeoBetaEvent("ong_dia_v1_next_day_returned", {
        room: "ong-dia-shrine",
        details: { lastSuccessDate },
      });
      window.localStorage.setItem(ONG_DIA_V1_RETURN_EVENT_DATE_KEY, todayKey);
    }
  } catch {
    // Analytics memory is best-effort.
  }
}

function shouldUseCompactPrayerFallback(
  experience: PrayerExperience,
  ui?: PrayerResponseUi,
) {
  return experience === "conversation" && ui?.presentation === "compact_retry";
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
      content: response.loiOngDia,
    },
  ];

  return nextTurns.slice(-6);
}

function clearOngDiaConversationStorage() {
  if (typeof window === "undefined") return;

  const clearMatchingKeys = (storage: Storage) => {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (
        key &&
        ONG_DIA_CONVERSATION_STORAGE_PREFIXES.some((prefix) =>
          key.startsWith(prefix),
        )
      ) {
        storage.removeItem(key);
      }
    }
  };

  try {
    clearMatchingKeys(window.sessionStorage);
    clearMatchingKeys(window.localStorage);
  } catch {
    // Conversation state is ephemeral; storage cleanup is best-effort.
  }
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
      {blessingSignal > 0 ? (
        <div key={`glint-${blessingSignal}`} className="ong-dia-altar-glint" />
      ) : null}
    </div>
  );
}

export default function OngDiaPage() {
  const shrineStageImage = useOngDiaShrineStageImage();
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
  const [prayerCompactFallback, setPrayerCompactFallback] = useState("");
  const [prayerConversationHistory, setPrayerConversationHistory] = useState<
    PrayerConversationTurn[]
  >([]);
  const [smallPrayer, setSmallPrayer] = useState("");
  const [ritualPhase, setRitualPhase] = useState<RitualPhase>("idle");
  const [followUpMode, setFollowUpMode] = useState(false);
  const [shareNotice, setShareNotice] = useState("");
  const [isPrayerClearing, setIsPrayerClearing] = useState(false);
  const [prayerClearConfirmation, setPrayerClearConfirmation] = useState("");
  const [locResult, setLocResult] = useState<LocUiResult | null>(null);
  const [locNotice, setLocNotice] = useState("");
  const [isOngDiaFeedbackOpen, setIsOngDiaFeedbackOpen] = useState(false);
  const [ongDiaFeedbackStatus, setOngDiaFeedbackStatus] =
    useState<OngDiaFeedbackStatus>("idle");
  const [ongDiaRitualFeedback, setOngDiaRitualFeedback] = useState("");
  const [ongDiaHelpFeedback, setOngDiaHelpFeedback] = useState("");
  const [ongDiaAfterChatFeedback, setOngDiaAfterChatFeedback] = useState("");
  const [ongDiaFinalFeedback, setOngDiaFinalFeedback] = useState("");
  const blessingMessageIndexRef = useRef(0);
  const prayerRequestInFlightRef = useRef(false);
  const prayerRequestTokenRef = useRef(0);
  const activePrayerTurnRef = useRef<PrayerTurn | null>(null);
  const prayerAbortControllerRef = useRef<AbortController | null>(null);
  const lastPrayerRequestRef = useRef<LastPrayerRequest | null>(null);
  const prayerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const prayerClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBlessingVisualAtRef = useRef(0);
  const blessingVisualTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const todayKey = getLocalDayKey(new Date());
    touchShrineMemory(todayKey);
    trackOngDiaV1NextDayReturn(todayKey);
    trackChoNeoBetaEvent("ong_dia_v1_viewed", { room: "ong-dia-shrine" });
    setDailyMessage(loadOrCreateDailyMessage(todayKey));
  }, []);

  useEffect(() => {
    return () => {
      if (blessingVisualTimerRef.current) {
        clearTimeout(blessingVisualTimerRef.current);
      }
      if (prayerClearTimerRef.current) {
        clearTimeout(prayerClearTimerRef.current);
      }
      prayerRequestTokenRef.current += 1;
      activePrayerTurnRef.current = null;
      prayerAbortControllerRef.current?.abort();
      prayerAbortControllerRef.current = null;
      prayerRequestInFlightRef.current = false;
      clearOngDiaConversationStorage();
    };
  }, []);

  function finishPrayerClear(shouldFocusInput = true) {
    setPrayerResponse(null);
    setPrayerConversationHistory([]);
    setPrayerProviderNotice("");
    setPrayerCompactFallback("");
    setRitualPhase("idle");
    setFollowUpMode(false);
    setShareNotice("");
    setIsPrayerResponseLoading(false);
    setIsPrayerClearing(false);
    setSmallPrayer("");
    setBlessingMessage("");
    setLocResult(null);
    setLocNotice("");
    setPrayerClearConfirmation(PRAYER_CLEAR_CONFIRMATION);
    prayerRequestInFlightRef.current = false;
    activePrayerTurnRef.current = null;
    prayerAbortControllerRef.current = null;
    clearOngDiaConversationStorage();

    if (shouldFocusInput) {
      window.requestAnimationFrame(() => {
        prayerInputRef.current?.focus();
      });
    }
  }

  function handleClearPrayerConversation() {
    if (
      isPrayerClearing ||
      (!prayerResponse &&
        prayerConversationHistory.length === 0 &&
        !prayerProviderNotice &&
        !prayerCompactFallback &&
        !isPrayerResponseLoading)
    ) {
      return;
    }

    if (prayerClearTimerRef.current) {
      clearTimeout(prayerClearTimerRef.current);
    }

    setIsPrayerClearing(true);
    setPrayerClearConfirmation("");
    prayerRequestTokenRef.current += 1;
    activePrayerTurnRef.current = null;
    prayerAbortControllerRef.current?.abort();
    prayerAbortControllerRef.current = null;
    prayerRequestInFlightRef.current = false;

    prayerClearTimerRef.current = setTimeout(() => {
      finishPrayerClear();
      prayerClearTimerRef.current = null;
    }, getPrayerClearAnimationMs());
  }

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

    const prayerForEndpoint = (prayerOverride ?? smallPrayer).trim();
    const hasFreeText = Boolean(prayerForEndpoint);
    const history =
      experience === "conversation" ? prayerConversationHistory : [];
    lastPrayerRequestRef.current = {
      experience,
      prayer: prayerForEndpoint,
      ritual,
    };

    if (prayerClearTimerRef.current) {
      clearTimeout(prayerClearTimerRef.current);
      prayerClearTimerRef.current = null;
    }
    const prayerRequestToken = prayerRequestTokenRef.current + 1;
    prayerRequestTokenRef.current = prayerRequestToken;
    activePrayerTurnRef.current = {
      id: prayerRequestToken,
      successAccepted: false,
    };
    const abortController = new AbortController();
    prayerAbortControllerRef.current = abortController;

    const isCurrentPrayerTurn = () =>
      prayerRequestTokenRef.current === prayerRequestToken &&
      activePrayerTurnRef.current?.id === prayerRequestToken;

    const acceptPrayerSuccess = (
      result: OngDiaPrayerResponse,
    ) => {
      if (!isCurrentPrayerTurn()) return false;
      activePrayerTurnRef.current = {
        id: prayerRequestToken,
        successAccepted: true,
      };
      setPrayerResponse(result);
      setPrayerCompactFallback("");
      setPrayerProviderNotice("");
      return true;
    };

    const showPrayerFallback = () => {
      if (!isCurrentPrayerTurn() || activePrayerTurnRef.current?.successAccepted) {
        return false;
      }
      setPrayerResponse(null);
      setPrayerProviderNotice("");
      setPrayerCompactFallback(COMPACT_PRAYER_FALLBACK);
      return true;
    };

    showBlessingMessage();
    setPrayerResponse(null);
    setPrayerProviderNotice("");
    setPrayerCompactFallback("");
    setPrayerClearConfirmation("");
    setShareNotice("");
    setIsPrayerClearing(false);
    setIsPrayerResponseLoading(true);
    setRitualPhase("ritual");
    if (shouldTriggerAtmosphere) {
      triggerBlessingAtmosphere();
    }

    trackChoNeoBetaEvent("ong_dia_v1_submitted", {
      room: "ong-dia-shrine",
      details: {
        hasFreeText,
        experience,
      },
    });

    const ritualPromise = new Promise<void>((resolve) => {
      setTimeout(resolve, getOngDiaRitualAnimationMs());
    });

    try {
      const responsePromise = fetch("/api/cho-neo/ong-dia/prayer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        body: JSON.stringify({
          prayer: prayerForEndpoint,
          ritual,
          experience,
          history,
        }),
      }).then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {
          result?: OngDiaPrayerResponse;
          ui?: PrayerResponseUi;
        };
      });

      let payload: Awaited<typeof responsePromise> | undefined;
      await Promise.race([
        responsePromise.then((nextPayload) => {
          payload = nextPayload;
        }),
        ritualPromise,
      ]);

      if (!isCurrentPrayerTurn()) return;

      if (payload === undefined) {
        setRitualPhase("pondering");
        payload = await responsePromise;
      }

      await ritualPromise;

      if (!isCurrentPrayerTurn()) return;

      if (payload?.result?.loiOngDia) {
        const isAuthoritativeResult =
          experience !== "conversation" ||
          !shouldUseCompactPrayerFallback(experience, payload.ui);
        if (isAuthoritativeResult) {
          const accepted = acceptPrayerSuccess(payload.result);
          if (accepted && experience === "conversation") {
            setPrayerConversationHistory((current) =>
              appendPrayerConversationTurn(current, prayerForEndpoint, payload.result!),
            );
          }
          if (accepted) {
            const todayKey = getLocalDayKey(new Date());
            rememberOngDiaV1SuccessDate(todayKey);
            trackChoNeoBetaEvent("ong_dia_v1_response_shown", {
              room: "ong-dia-shrine",
              details: {
                experience,
              },
            });
          }
        } else {
          showPrayerFallback();
        }
      } else {
        showPrayerFallback();
      }
    } catch (error) {
      if (
        !isCurrentPrayerTurn() ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        return;
      }
      showPrayerFallback();
    } finally {
      if (isCurrentPrayerTurn()) {
        prayerAbortControllerRef.current = null;
        prayerRequestInFlightRef.current = false;
        setIsPrayerResponseLoading(false);
        setRitualPhase("idle");
      }
    }
  }

  function handleBlessingRequest() {
    const experience = smallPrayer.trim() ? "conversation" : "ritual";
    void requestPrayerResponse("Xin vía nhẹ", undefined, true, experience);
  }

  function handleRetryPrayerRequest() {
    const lastRequest = lastPrayerRequestRef.current;
    if (!lastRequest || isPrayerResponseLoading) return;
    void requestPrayerResponse(
      lastRequest.ritual ?? "Xin vía nhẹ",
      lastRequest.prayer,
      true,
      lastRequest.experience,
    );
  }

  function handleFollowUpStart() {
    setPrayerResponse(null);
    setPrayerProviderNotice("");
    setPrayerCompactFallback("");
    setPrayerClearConfirmation("");
    setShareNotice("");
    setSmallPrayer("");
    setFollowUpMode(true);
    trackChoNeoBetaEvent("ong_dia_v1_followup_started", {
      room: "ong-dia-shrine",
      details: { historyTurns: prayerConversationHistory.length },
    });
    window.requestAnimationFrame(() => {
      prayerInputRef.current?.focus();
    });
  }

  async function handleShareKeepsake() {
    if (!prayerResponse) return;

    const text = createOngDiaShareText(prayerResponse);
    const url = getOngDiaShareUrl();

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Lời Ông Địa hôm nay",
          text,
          url,
        });
        setShareNotice("Đã mở chia sẻ lời Ông Địa.");
        trackChoNeoBetaEvent("ong_dia_v1_share_success", {
          room: "ong-dia-shrine",
        });
        return;
      }

      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setShareNotice("Đã copy lời Ông Địa.");
      trackChoNeoBetaEvent("ong_dia_v1_copy_success", {
        room: "ong-dia-shrine",
        details: { fallbackFromShare: true },
      });
    } catch {
      setShareNotice("Chưa chia sẻ được. Con thử Copy nha.");
    }
  }

  async function handleCopyKeepsake() {
    if (!prayerResponse) return;

    try {
      const text = `${createOngDiaShareText(prayerResponse)}\n\n${getOngDiaShareUrl()}`;
      await navigator.clipboard.writeText(text);
      setShareNotice("Đã copy lời Ông Địa.");
      trackChoNeoBetaEvent("ong_dia_v1_copy_success", {
        room: "ong-dia-shrine",
      });
    } catch {
      setShareNotice("Chưa copy được trên trình duyệt này.");
    }
  }

  function handleOutboundClick(destination: "xin-xam" | "quan-tam") {
    trackChoNeoBetaEvent("ong_dia_v1_outbound_clicked", {
      room: "ong-dia-shrine",
      details: { destination },
    });
  }

  function openOngDiaFeedback() {
    setIsOngDiaFeedbackOpen(true);
    setOngDiaFeedbackStatus("idle");
    trackChoNeoBetaEvent("feedback_opened", {
      room: "ong-dia-shrine",
      details: { page: "ong-dia", source: "ong-dia-header" },
    });
  }

  function closeOngDiaFeedback() {
    setIsOngDiaFeedbackOpen(false);
    trackChoNeoBetaEvent("feedback_closed", {
      room: "ong-dia-shrine",
      details: { page: "ong-dia", source: "ong-dia-header" },
    });
  }

  async function submitOngDiaFeedback() {
    setOngDiaFeedbackStatus("saving");

    try {
      const response = await fetch("/api/cho-neo/beta-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "feedback",
          timestamp: new Date().toISOString(),
          path: "/cho-neo/ong-dia",
          room: "ong-dia-shrine",
          deviceType: getChoNeoDeviceType(),
          anonymousSessionId: getChoNeoBetaSessionId(),
          answers: {
            page: "ong-dia",
            ritualInterest: ongDiaRitualFeedback,
            afterChatFeeling: ongDiaAfterChatFeedback,
            responseShown: Boolean(prayerResponse),
          },
          comments: {
            hopedHelp: ongDiaHelpFeedback,
            finalComment: ongDiaFinalFeedback,
          },
          details: {
            page: "ong-dia",
            responseShown: Boolean(prayerResponse),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Feedback save failed");
      }

      setOngDiaFeedbackStatus("saved");
      trackChoNeoBetaEvent("feedback_submitted", {
        room: "ong-dia-shrine",
        details: { page: "ong-dia", responseShown: Boolean(prayerResponse) },
      });
    } catch {
      setOngDiaFeedbackStatus("error");
    }
  }

  function handleLocRequest() {
    const prayer = smallPrayer.trim() || "Xin giữ lòng vững hôm nay.";
    const locMemoryWish = smallPrayer.trim()
      ? "Xin một lộc nhỏ theo lời khấn riêng."
      : "Xin giữ lòng vững hôm nay.";
    const result = createLocMemoryForWish(locMemoryWish);

    void requestPrayerResponse("Mở một lộc nhỏ", prayer, result.ok, "ritual");

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
          <p className="ong-dia-eyebrow ong-dia-sr-only">
            Bàn Ông Địa
          </p>
          <h1 id="ong-dia-title">Ghé Ông Địa</h1>
        </div>

        <div className="ong-dia-header-actions" aria-label="Điều khiển trang Ông Địa">
          <span
            className="cho-neo-shared-music-slot ong-dia-header-music"
            data-cho-neo-shared-music-slot
          />
          <button
            type="button"
            className="ong-dia-feedback-trigger"
            onClick={openOngDiaFeedback}
            aria-haspopup="dialog"
            aria-expanded={isOngDiaFeedbackOpen}
          >
            Góp ý
          </button>
          <Link
            href="/cho-neo"
            className="ong-dia-back"
            aria-label="Về Sân Làng"
            title="Về Sân Làng"
          >
            <span aria-hidden="true">←</span>
          </Link>
        </div>
      </section>

      {isOngDiaFeedbackOpen ? (
        <section
          className="ong-dia-feedback-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="ong-dia-feedback-title"
        >
          <header>
            <div>
              <p id="ong-dia-feedback-title">Góp ý Ông Địa</p>
              <span>Không cần tài khoản. Không gửi lời khấn hay lịch sử trò chuyện.</span>
            </div>
            <button
              type="button"
              onClick={closeOngDiaFeedback}
              aria-label="Đóng góp ý Ông Địa"
            >
              ×
            </button>
          </header>

          <div className="ong-dia-feedback-body">
            <fieldset>
              <legend>
                Bạn có muốn có thêm nghi thức nhỏ như thắp nhang hoặc dâng chè cho Ông Địa không?
              </legend>
              <div className="ong-dia-feedback-options">
                {ONG_DIA_RITUAL_FEEDBACK_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={ongDiaRitualFeedback === choice ? "selected" : ""}
                    onClick={() => setOngDiaRitualFeedback(choice)}
                    aria-pressed={ongDiaRitualFeedback === choice}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </fieldset>

            <label>
              <span>Khi ghé Ông Địa, bạn mong Ông giúp điều gì nhất?</span>
              <input
                value={ongDiaHelpFeedback}
                onChange={(event) => setOngDiaHelpFeedback(event.target.value)}
                maxLength={220}
                placeholder="Viết ngắn thôi cũng được..."
              />
            </label>

            <fieldset>
              <legend>
                Sau khi trò chuyện, bạn có thấy nhẹ lòng hoặc sáng ý hơn không?
              </legend>
              <div className="ong-dia-feedback-options">
                {ONG_DIA_AFTER_CHAT_FEEDBACK_CHOICES.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    className={ongDiaAfterChatFeedback === choice ? "selected" : ""}
                    onClick={() => setOngDiaAfterChatFeedback(choice)}
                    aria-pressed={ongDiaAfterChatFeedback === choice}
                  >
                    {choice}
                  </button>
                ))}
              </div>
            </fieldset>

            <label>
              <span>Bạn muốn góp thêm điều gì?</span>
              <textarea
                value={ongDiaFinalFeedback}
                onChange={(event) => setOngDiaFinalFeedback(event.target.value)}
                maxLength={600}
                placeholder="Góp thêm một ý nhỏ..."
              />
            </label>
          </div>

          <footer>
            <p aria-live="polite">
              {ongDiaFeedbackStatus === "saved"
                ? "Cảm ơn nha. Góp ý đã gửi về Chợ Neo."
                : ongDiaFeedbackStatus === "error"
                  ? "Chưa gửi được. Bạn thử lại sau nha."
                  : "Góp ý này riêng tư, không đăng ra bàn chung."}
            </p>
            <button
              type="button"
              onClick={submitOngDiaFeedback}
              disabled={ongDiaFeedbackStatus === "saving"}
            >
              {ongDiaFeedbackStatus === "saving" ? "Đang gửi..." : "Gửi góp ý"}
            </button>
          </footer>
        </section>
      ) : null}

      <section className="ong-dia-stage-wrap" aria-label="Sân khấu Ông Địa">
        <div
          className={`ong-dia-stage ${
            isBlessingActive ? "ongdia-blessing-active" : ""
          }`}
        >
          <Image
            src={shrineStageImage}
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
          <p>Bàn Ông Địa</p>
          <h2>Hôm nay trong lòng có chuyện gì?</h2>
          <span>{dailyMessage?.title ?? "Có tâm thì nghề ở lâu."}</span>
        </div>

        {blessingMessage ? (
          <p className="ong-dia-soft-blessing ong-dia-sr-only" aria-live="polite">
            {blessingMessage}
          </p>
        ) : null}

        <p
          className="ong-dia-privacy-note"
          aria-label={PRAYER_PRIVACY_NOTE}
          title={PRAYER_PRIVACY_NOTE}
        >
          <span className="ong-dia-lock-mark" aria-hidden="true" />
          Lời khấn chỉ ở trong phiên này và sẽ tan khi con rời bàn hoặc xóa.
        </p>

        {prayerClearConfirmation ? (
          <p className="ong-dia-clear-confirmation" aria-live="polite">
            {prayerClearConfirmation}
          </p>
        ) : null}

        {prayerCompactFallback ? (
          <div className="ong-dia-compact-fallback" role="status" aria-live="polite">
            <span>{prayerCompactFallback}</span>
            <button
              type="button"
              onClick={handleRetryPrayerRequest}
              disabled={isPrayerResponseLoading}
            >
              Thử lại
            </button>
          </div>
        ) : null}

        {prayerResponse ? (
          <article
            className={`ong-dia-keepsake-card ${
              isPrayerClearing ? "ong-dia-prayer-response-clearing" : ""
            }`}
            aria-live="polite"
            aria-busy={isPrayerClearing || isPrayerResponseLoading}
          >
            <div className="ong-dia-keepsake-heading">
              <p>Lời Ông Địa hôm nay</p>
              <span aria-hidden="true" />
            </div>
            <div className="ong-dia-keepsake-line ong-dia-keepsake-main">
              <span>{prayerResponse.loiOngDia}</span>
            </div>
            <div className="ong-dia-keepsake-actions" aria-label="Hành động với lời Ông Địa">
              <button type="button" onClick={handleShareKeepsake}>
                Share
              </button>
              <button type="button" onClick={handleCopyKeepsake}>
                Copy
              </button>
              <button type="button" onClick={handleFollowUpStart}>
                Hỏi thêm một câu
              </button>
            </div>
            {shareNotice ? (
              <p className="ong-dia-share-notice" role="status" aria-live="polite">
                {shareNotice}
              </p>
            ) : null}
          </article>
        ) : null}

        <div className="ong-dia-prayer-panel">
          <label htmlFor="ong-dia-prayer" className="ong-dia-sr-only">
            Khấn một điều nhỏ
          </label>
          <textarea
            id="ong-dia-prayer"
            ref={prayerInputRef}
            value={smallPrayer}
            onChange={(event) => setSmallPrayer(event.target.value)}
            maxLength={160}
            placeholder={
              followUpMode
                ? "Con hỏi thêm nhẹ thôi..."
                : "Cứ nói điều đang ở trong lòng..."
            }
          />
          {ritualPhase !== "idle" || isPrayerResponseLoading ? (
            <p className="ong-dia-ritual-status" role="status" aria-live="polite">
              {ritualPhase === "pondering"
                ? "Ông Địa đang ngẫm một chút..."
                : "Ông Địa đang nghe..."}
            </p>
          ) : null}
          <div className="ong-dia-prayer-actions">
            <div className="ong-dia-prayer-actions-left">
              <button
                type="button"
                onClick={handleBlessingRequest}
                disabled={isPrayerResponseLoading}
              >
                {isPrayerResponseLoading ? "Đang nghe..." : "Thắp nhang xin lời"}
              </button>
              <button
                type="button"
                className="ong-dia-clear-prayer-button"
                onClick={handleClearPrayerConversation}
                aria-label="Xóa lời khấn"
                title="Xóa lời khấn"
                disabled={
                  isPrayerClearing ||
                  (!prayerResponse &&
                    prayerConversationHistory.length === 0 &&
                    !prayerProviderNotice &&
                    !prayerCompactFallback &&
                    !isPrayerResponseLoading)
                }
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <div className="ong-dia-blessing-actions" aria-label="Lối đi tiếp">
              <Link
                href="/xin-xam"
                aria-label="Xin Xăm"
                title="Xin Xăm"
                onClick={() => handleOutboundClick("xin-xam")}
              >
                <svg
                  className="ong-dia-fortune-stick-icon"
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  focusable="false"
                >
                  <path d="M8.4 4.2 11 17.8" />
                  <path d="M15.6 4.2 13 17.8" />
                  <path d="M8.1 18.2h7.8" />
                  <path d="M9.2 21h5.6" />
                  <path d="M7.1 8.4h9.8" />
                </svg>
                <span>Xin Xăm</span>
              </Link>
              <Link
                href="/cho-neo/gossip"
                aria-label="Qua ngồi một chút ở Quán Tám"
                title="Qua ngồi một chút"
                onClick={() => handleOutboundClick("quan-tam")}
              >
                <span>Qua ngồi một chút</span>
              </Link>
            </div>
          </div>
        </div>

        {locResult ? (
          <article
            className="ong-dia-result-card ong-dia-sr-only"
            aria-live="polite"
          >
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
          <p
            className="ong-dia-result-placeholder ong-dia-sr-only"
            aria-live="polite"
          >
            Chạm Ông Địa để nhận một lời lành. Nếu muốn, viết một điều nhỏ rồi
            mở lộc nhẹ cho lòng bớt rối.
          </p>
        )}

        {locNotice ? <p className="ong-dia-loc-notice">{locNotice}</p> : null}

        <p className="ong-dia-safety-copy ong-dia-sr-only">
          Lộc này để giữ lòng, không phải lời hứa chắc chắn về tiền bạc, sức
          khỏe, pháp lý, hay tương lai.
        </p>

        {prayerResponse ? (
          <p className="ong-dia-return-copy">
            Mai ghé lại, lòng đổi thì lời cũng đổi.
          </p>
        ) : null}

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

        .ong-dia-sr-only {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
          padding: 0 !important;
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
          font-size: clamp(2.25rem, 3vw, 2.375rem);
          font-weight: 600;
          line-height: 1.02;
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

        .ong-dia-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.55rem;
          flex: 0 0 auto;
          min-width: 0;
        }

        .ong-dia-header-music {
          flex: 0 0 auto;
        }

        .ong-dia-feedback-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          min-width: 82px;
          padding: 0 0.85rem;
          border: 1px solid rgba(255, 212, 139, 0.3);
          border-radius: 12px;
          color: #ffe7ae;
          background: rgba(52, 22, 12, 0.66);
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          font: inherit;
          font-size: 0.88rem;
          font-weight: 650;
          line-height: 1;
          white-space: nowrap;
        }

        .ong-dia-feedback-trigger:hover,
        .ong-dia-feedback-trigger:focus-visible {
          border-color: rgba(255, 212, 139, 0.52);
          background: rgba(72, 31, 16, 0.78);
          outline: none;
        }

        .ong-dia-back {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          min-height: 44px;
          padding: 0;
          border: 1px solid rgba(255, 212, 139, 0.32);
          border-radius: 14px;
          background: rgba(52, 22, 12, 0.72);
          color: #ffe7ae;
          text-decoration: none;
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.24);
        }

        .ong-dia-back span {
          font-size: 1.22rem;
          line-height: 1;
        }

        .ong-dia-feedback-panel {
          width: min(680px, 100%);
          margin: 0 auto 1rem;
          border: 1px solid rgba(255, 212, 139, 0.24);
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(255, 214, 142, 0.12), transparent 38%),
            rgba(41, 18, 11, 0.94);
          box-shadow: 0 24px 58px rgba(0, 0, 0, 0.34);
          color: #fff4dd;
          overflow: hidden;
        }

        .ong-dia-feedback-panel header,
        .ong-dia-feedback-panel footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.8rem;
          padding: 0.9rem 1rem;
          border-bottom: 1px solid rgba(255, 212, 139, 0.14);
        }

        .ong-dia-feedback-panel footer {
          border-top: 1px solid rgba(255, 212, 139, 0.14);
          border-bottom: 0;
        }

        .ong-dia-feedback-panel p,
        .ong-dia-feedback-panel span,
        .ong-dia-feedback-panel legend {
          margin: 0;
        }

        .ong-dia-feedback-panel header p {
          color: #fff0c2;
          font-size: 1rem;
          font-weight: 680;
          line-height: 1.2;
        }

        .ong-dia-feedback-panel header span,
        .ong-dia-feedback-panel footer p {
          display: block;
          margin-top: 0.22rem;
          color: rgba(255, 244, 221, 0.68);
          font-size: 0.82rem;
          line-height: 1.35;
        }

        .ong-dia-feedback-panel header button,
        .ong-dia-feedback-panel footer button,
        .ong-dia-feedback-options button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 40px;
          border: 1px solid rgba(255, 212, 139, 0.24);
          border-radius: 12px;
          color: #ffe7ae;
          background: rgba(255, 244, 221, 0.07);
          cursor: pointer;
          font: inherit;
          font-size: 0.86rem;
          font-weight: 650;
        }

        .ong-dia-feedback-panel header button {
          flex: 0 0 auto;
          width: 40px;
          padding: 0;
          font-size: 1.2rem;
        }

        .ong-dia-feedback-panel footer button {
          flex: 0 0 auto;
          height: 44px;
          padding: 0 0.95rem;
          background: rgba(92, 42, 19, 0.82);
        }

        .ong-dia-feedback-panel footer button:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .ong-dia-feedback-panel header button:hover,
        .ong-dia-feedback-panel header button:focus-visible,
        .ong-dia-feedback-panel footer button:hover,
        .ong-dia-feedback-panel footer button:focus-visible,
        .ong-dia-feedback-options button:hover,
        .ong-dia-feedback-options button:focus-visible {
          border-color: rgba(255, 212, 139, 0.5);
          outline: none;
        }

        .ong-dia-feedback-body {
          display: grid;
          gap: 0.9rem;
          padding: 1rem;
        }

        .ong-dia-feedback-body fieldset,
        .ong-dia-feedback-body label {
          display: grid;
          gap: 0.55rem;
          min-width: 0;
          margin: 0;
          border: 0;
          padding: 0;
        }

        .ong-dia-feedback-body legend,
        .ong-dia-feedback-body label span {
          color: #fff0c2;
          font-size: 0.92rem;
          font-weight: 620;
          line-height: 1.35;
        }

        .ong-dia-feedback-options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }

        .ong-dia-feedback-options button {
          min-width: 76px;
          padding: 0 0.75rem;
        }

        .ong-dia-feedback-options .selected {
          border-color: rgba(255, 212, 139, 0.72);
          background: rgba(255, 212, 139, 0.16);
          color: #fff7df;
        }

        .ong-dia-feedback-body input,
        .ong-dia-feedback-body textarea {
          width: 100%;
          border: 1px solid rgba(255, 212, 139, 0.24);
          border-radius: 12px;
          color: #fff4dd;
          background: rgba(15, 8, 5, 0.28);
          font: inherit;
          font-size: 0.94rem;
          line-height: 1.45;
          outline: none;
        }

        .ong-dia-feedback-body input {
          height: 44px;
          padding: 0 0.8rem;
        }

        .ong-dia-feedback-body textarea {
          min-height: 88px;
          padding: 0.7rem 0.8rem;
          resize: vertical;
        }

        .ong-dia-feedback-body input::placeholder,
        .ong-dia-feedback-body textarea::placeholder {
          color: rgba(255, 244, 221, 0.42);
        }

        .ong-dia-feedback-body input:focus,
        .ong-dia-feedback-body textarea:focus {
          border-color: rgba(255, 212, 139, 0.58);
          background: rgba(15, 8, 5, 0.36);
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
          object-fit: contain;
          object-position: center;
          pointer-events: none;
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
        .ong-dia-altar-glint,
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

        .ong-dia-altar-glint {
          left: 47.5%;
          top: 61.5%;
          z-index: 4;
          width: 9%;
          aspect-ratio: 1 / 1;
          border-radius: 999px;
          background:
            radial-gradient(circle, rgba(255, 245, 198, 0.9), rgba(255, 192, 86, 0.34) 24%, transparent 58%);
          mix-blend-mode: screen;
          opacity: 0;
          filter: blur(0.5px);
          animation: ong-dia-altar-glint 1.8s ease-out both;
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

        @keyframes ong-dia-altar-glint {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.72);
          }

          38% {
            opacity: 0.72;
            transform: scale(1);
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
          font-size: clamp(1.6875rem, 2.1vw, 1.8125rem);
          font-weight: 600;
          line-height: 1.12;
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
          gap: 0.3rem;
        }

        .ong-dia-daily-message p {
          margin: 0;
          color: #ffd48b !important;
          font-size: 0.72rem;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .ong-dia-daily-message span {
          color: rgba(255, 239, 203, 0.7);
          font-size: 0.94rem;
          line-height: 1.45;
        }

        .ong-dia-loc-notice,
        .ong-dia-safety-copy,
        .ong-dia-clear-confirmation,
        .ong-dia-compact-fallback {
          margin: 0;
          border: 1px solid rgba(255, 212, 139, 0.18);
          border-radius: 16px;
          background: rgba(255, 244, 221, 0.07);
          padding: 0.75rem 0.85rem;
          line-height: 1.45;
        }

        .ong-dia-clear-confirmation {
          color: #fff0c2 !important;
        }

        .ong-dia-soft-blessing,
        .ong-dia-privacy-note {
          margin: 0;
          padding: 0 0.1rem;
          border: 0;
          background: transparent;
          box-shadow: none;
          line-height: 1.45;
        }

        .ong-dia-soft-blessing {
          color: rgba(255, 235, 187, 0.78) !important;
          font-size: 0.9rem;
        }

        .ong-dia-compact-fallback {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.6rem;
          border-color: rgba(255, 186, 83, 0.2);
          background: rgba(255, 244, 221, 0.08);
          color: #ffe7ae !important;
          font-size: 0.94rem;
        }

        .ong-dia-compact-fallback button {
          min-height: 38px;
          border: 1px solid rgba(255, 212, 139, 0.28);
          border-radius: 12px;
          padding: 0.48rem 0.72rem;
          color: #fff4dd;
          background: rgba(124, 45, 18, 0.54);
          font: inherit;
          font-size: 0.84rem;
          font-weight: 700;
          cursor: pointer;
        }

        .ong-dia-compact-fallback button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }

        .ong-dia-privacy-note {
          display: inline-flex;
          gap: 0.42rem;
          align-items: center;
          width: fit-content;
          color: rgba(255, 239, 203, 0.68) !important;
          font-size: 0.82rem;
        }

        .ong-dia-lock-mark {
          position: relative;
          display: inline-block;
          width: 0.62rem;
          height: 0.48rem;
          border: 1.5px solid currentColor;
          border-radius: 3px;
          opacity: 0.72;
        }

        .ong-dia-lock-mark::before {
          position: absolute;
          left: 50%;
          bottom: 100%;
          width: 0.36rem;
          height: 0.28rem;
          border: 1.5px solid currentColor;
          border-bottom: 0;
          border-radius: 999px 999px 0 0;
          content: "";
          transform: translateX(-50%);
        }

        .ong-dia-clear-confirmation {
          border-color: rgba(255, 212, 139, 0.24);
          background: rgba(255, 212, 139, 0.1);
          font-size: 0.9rem;
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
          transition:
            opacity 1.5s ease,
            transform 1.5s ease,
            filter 1.5s ease;
          will-change: opacity, transform, filter;
        }

        .ong-dia-keepsake-card {
          position: relative;
          display: grid;
          gap: 0.78rem;
          overflow: hidden;
          border: 1px solid rgba(255, 218, 157, 0.34);
          border-radius: 18px;
          background:
            linear-gradient(135deg, rgba(255, 244, 221, 0.18), transparent 42%),
            radial-gradient(circle at 88% 10%, rgba(245, 158, 11, 0.2), transparent 30%),
            rgba(255, 244, 221, 0.09);
          padding: clamp(0.95rem, 2vw, 1.25rem);
          box-shadow:
            0 18px 42px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 244, 221, 0.14);
          transition:
            opacity 1.5s ease,
            transform 1.5s ease,
            filter 1.5s ease;
        }

        .ong-dia-keepsake-card::before {
          position: absolute;
          inset: 0;
          pointer-events: none;
          content: "";
          background:
            linear-gradient(90deg, rgba(255, 212, 139, 0.2), transparent 24% 76%, rgba(255, 212, 139, 0.12)),
            linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 34%);
        }

        .ong-dia-keepsake-heading,
        .ong-dia-keepsake-line,
        .ong-dia-keepsake-actions,
        .ong-dia-share-notice {
          position: relative;
          z-index: 1;
        }

        .ong-dia-keepsake-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .ong-dia-keepsake-heading p {
          margin: 0;
          color: #ffe7ae !important;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(1.2rem, 2.8vw, 1.75rem);
          font-weight: 800;
          line-height: 1.1;
        }

        .ong-dia-keepsake-heading span {
          width: 2.3rem;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 212, 139, 0.54);
          box-shadow: 0 0 16px rgba(255, 190, 89, 0.44);
        }

        .ong-dia-keepsake-line {
          display: grid;
          gap: 0.32rem;
          border-top: 1px solid rgba(255, 212, 139, 0.14);
          padding-top: 0.72rem;
        }

        .ong-dia-keepsake-main {
          border-top: 0;
          padding-top: 0;
        }

        .ong-dia-keepsake-line small {
          color: rgba(255, 236, 196, 0.78);
          font-size: 0.72rem;
          font-weight: 760;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .ong-dia-keepsake-line span {
          color: rgba(255, 247, 232, 0.9);
          font-size: clamp(0.98rem, 1.5vw, 1.05rem);
          line-height: 1.48;
        }

        .ong-dia-keepsake-main span {
          color: #fff7ed;
          font-size: clamp(1.08rem, 2vw, 1.22rem);
          line-height: 1.45;
        }

        .ong-dia-keepsake-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding-top: 0.2rem;
        }

        .ong-dia-keepsake-actions button {
          min-height: 40px;
          border: 1px solid rgba(255, 212, 139, 0.24);
          border-radius: 12px;
          background: rgba(26, 12, 7, 0.38);
          color: #ffe7ae;
          padding: 0.46rem 0.72rem;
          font: inherit;
          font-size: 0.82rem;
          font-weight: 780;
          cursor: pointer;
        }

        .ong-dia-keepsake-actions button:first-child {
          background: rgba(255, 212, 139, 0.16);
          color: #ffe7ae;
        }

        .ong-dia-keepsake-actions button:focus-visible,
        .ong-dia-blessing-actions a:focus-visible {
          outline: 3px solid rgba(255, 232, 179, 0.42);
          outline-offset: 2px;
        }

        .ong-dia-share-notice {
          color: rgba(255, 239, 203, 0.78) !important;
          font-size: 0.84rem;
        }

        .ong-dia-prayer-response-clearing {
          opacity: 0;
          transform: translateY(-10px);
          filter: blur(2px);
          pointer-events: none;
        }

        .ong-dia-prayer-response div {
          display: grid;
          grid-template-columns: 0.78rem minmax(0, 1fr);
          gap: 0.58rem;
          align-items: start;
          min-width: 0;
          border-top: 1px solid rgba(255, 212, 139, 0.12);
          padding-top: 0.62rem;
        }

        .ong-dia-prayer-response div:first-of-type {
          border-top: 0;
          padding-top: 0;
        }

        .ong-dia-response-mark {
          display: block;
          width: 0.48rem;
          height: 0.48rem;
          margin-top: 0.42rem;
          border: 1px solid rgba(255, 212, 139, 0.72);
          border-radius: 999px;
          background: rgba(255, 166, 64, 0.34);
          box-shadow: 0 0 14px rgba(255, 175, 76, 0.28);
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
          border-radius: 12px;
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
          gap: 0.72rem;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 0.1rem 0 0;
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
          min-height: 104px;
          resize: vertical;
          border: 1px solid rgba(255, 212, 139, 0.24);
          border-radius: 12px;
          background: rgba(23, 9, 5, 0.5);
          color: #fff4dd;
          padding: 0.85rem 0.9rem;
          font: inherit;
          font-size: 0.98rem;
          font-weight: 500;
          line-height: 1.48;
          outline: none;
          box-shadow: inset 0 1px 0 rgba(255, 244, 221, 0.05);
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
          align-items: center;
          justify-content: space-between;
          gap: 0.58rem;
          width: 100%;
        }

        .ong-dia-prayer-actions-left,
        .ong-dia-blessing-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.58rem;
          max-width: 100%;
        }

        .ong-dia-prayer-actions-left {
          justify-content: flex-start;
        }

        .ong-dia-ritual-status {
          width: fit-content;
          border: 1px solid rgba(255, 212, 139, 0.18);
          border-radius: 12px;
          background: rgba(255, 244, 221, 0.08);
          color: rgba(255, 244, 221, 0.86) !important;
          padding: 0.5rem 0.7rem;
          font-size: 0.78rem;
          font-weight: 760;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .ong-dia-prayer-actions button,
        .ong-dia-blessing-actions a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 44px;
          min-height: 44px;
          border: 1px solid rgba(255, 212, 139, 0.24);
          border-radius: 12px;
          padding: 0.5rem 0.85rem;
          font: inherit;
          font-size: 0.86rem;
          font-weight: 780;
          line-height: 1;
          text-decoration: none;
          text-align: center;
          overflow-wrap: anywhere;
          touch-action: manipulation;
          white-space: nowrap;
        }

        .ong-dia-prayer-actions button {
          color: #251006;
          background: linear-gradient(180deg, rgba(245, 202, 124, 0.96), rgba(208, 139, 64, 0.92));
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(50, 20, 6, 0.2);
        }

        .ong-dia-prayer-actions button:disabled {
          cursor: wait;
          opacity: 0.72;
        }

        .ong-dia-prayer-actions .ong-dia-clear-prayer-button {
          width: 44px;
          padding: 0;
          color: #fff4dd;
          background: rgba(43, 19, 11, 0.42);
          border-color: rgba(255, 212, 139, 0.22);
          box-shadow: none;
        }

        .ong-dia-prayer-actions .ong-dia-clear-prayer-button span {
          font-size: 1.35rem;
          line-height: 1;
        }

        .ong-dia-prayer-actions .ong-dia-clear-prayer-button:disabled {
          cursor: default;
          opacity: 0.45;
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
          justify-content: flex-end;
        }

        .ong-dia-blessing-actions a {
          min-width: 46px;
          border-radius: 12px;
          padding: 0.48rem 0.72rem;
          color: #ffe7ae;
          background: rgba(255, 244, 221, 0.06);
          gap: 0.42rem;
          box-shadow: none;
        }

        .ong-dia-blessing-actions a span {
          color: inherit;
          font-size: 0.82rem;
          font-weight: 760;
        }

        .ong-dia-return-copy {
          color: rgba(255, 239, 203, 0.72) !important;
          font-size: 0.9rem;
        }

        .ong-dia-fortune-stick-icon {
          width: 1.15rem;
          height: 1.15rem;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.75;
          stroke-linecap: round;
          stroke-linejoin: round;
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
            font-size: clamp(1.8125rem, 7vw, 1.9375rem);
            font-weight: 600;
            line-height: 1;
          }

          .ong-dia-copy h1 span {
            display: none;
          }

          .ong-dia-copy p {
            display: none;
          }

          .ong-dia-header-actions {
            flex-wrap: wrap;
            justify-content: flex-start;
            gap: 0.45rem;
            width: 100%;
          }

          .ong-dia-feedback-trigger {
            height: 44px;
            min-width: 76px;
            font-size: 0.84rem;
          }

          .ong-dia-back {
            order: -1;
            width: 44px;
            min-width: 44px;
            height: 44px;
            min-height: 44px;
            padding: 0;
          }

          .ong-dia-feedback-panel {
            margin-bottom: 0.65rem;
            border-radius: 16px;
          }

          .ong-dia-feedback-panel header,
          .ong-dia-feedback-panel footer {
            align-items: flex-start;
            padding: 0.78rem;
          }

          .ong-dia-feedback-panel footer {
            flex-direction: column;
          }

          .ong-dia-feedback-panel footer button {
            width: 100%;
          }

          .ong-dia-feedback-body {
            padding: 0.78rem;
            gap: 0.75rem;
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
            object-fit: contain;
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
            font-size: clamp(1.375rem, 5.8vw, 1.5rem);
            font-weight: 600;
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

          .ong-dia-result-card {
            grid-template-columns: 1fr;
          }

          .ong-dia-prayer-actions {
            display: flex;
            align-items: center;
            justify-content: space-between;
            row-gap: 0.58rem;
          }

          .ong-dia-prayer-actions-left,
          .ong-dia-blessing-actions {
            align-items: center;
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
          .ong-dia-altar-glint,
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
          .ong-dia-altar-glint,
          .ong-dia-wish-response {
            display: none;
          }

          .ong-dia-prayer-response,
          .ong-dia-keepsake-card {
            transition:
              opacity 0.18s ease,
              filter 0.18s ease;
          }

          .ong-dia-prayer-response-clearing {
            transform: none;
            filter: blur(1px);
          }
        }
      `}</style>
    </main>
  );
}
