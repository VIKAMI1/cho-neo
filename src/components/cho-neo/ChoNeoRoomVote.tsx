"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase-browser";
import { useChoNeoMember } from "./ChoNeoMemberProvider";
import {
  inferChoNeoRoomFromPath,
  trackChoNeoBetaEvent,
} from "@/lib/cho-neo/beta-analytics";
import {
  CHO_NEO_ROOM_VOTE_OPEN_EVENT,
  CHO_NEO_ROOM_VOTE_POLL_KEY,
  CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH,
  CHO_NEO_ROOM_VOTE_OPTIONS,
  sanitizeChoNeoRoomVoteReason,
  type ChoNeoRoomVoteOptionKey,
  type ChoNeoRoomVotePresentation,
  type ChoNeoRoomVotePublicResult,
} from "@/lib/cho-neo/room-vote";

export function ChoNeoRoomVote() {
  const pathname = usePathname();
  const room = useMemo(() => inferChoNeoRoomFromPath(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleOpenRoomVote() {
      setIsOpen(true);
      trackChoNeoBetaEvent("room_vote_opened", { room });
    }

    window.addEventListener(CHO_NEO_ROOM_VOTE_OPEN_EVENT, handleOpenRoomVote);
    return () =>
      window.removeEventListener(
        CHO_NEO_ROOM_VOTE_OPEN_EVENT,
        handleOpenRoomVote,
      );
  }, [room]);

  useEffect(() => {
    if (!isOpen) return;

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
      if (event.key === "Escape") closeRoomVote();
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
  }, [isOpen]);

  function closeRoomVote() {
    setIsOpen(false);
    trackChoNeoBetaEvent("room_vote_closed", { room });
  }

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div aria-modal="true" className="cho-neo-room-vote-modal" role="dialog">
      <div className="cho-neo-room-vote-backdrop" onClick={closeRoomVote} />
      <section className="cho-neo-room-vote-card" aria-labelledby="room-vote-title">
        <header className="cho-neo-room-vote-header">
          <div>
            <p id="room-vote-title">Bình chọn mở phòng</p>
            <span>Chọn nơi Chợ Neo nên mở cửa tiếp theo.</span>
          </div>
          <button aria-label="Đóng bình chọn" onClick={closeRoomVote} type="button">
            ×
          </button>
        </header>
        <div className="cho-neo-room-vote-scroll">
          <ChoNeoRoomVoteSection />
        </div>
      </section>
      <style>{`
        .cho-neo-room-vote-modal { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left)); overflow: hidden; }
        .cho-neo-room-vote-backdrop { position: absolute; inset: 0; background: rgba(3, 7, 18, 0.68); backdrop-filter: blur(10px); }
        .cho-neo-room-vote-card { position: relative; z-index: 1; display: grid; grid-template-rows: auto minmax(0, 1fr); width: min(760px, calc(100vw - 48px)); max-height: min(780px, 90svh, calc(100svh - 48px)); overflow: hidden; border: 1px solid rgba(248, 211, 145, 0.24); border-radius: 26px; color: #3a2418; font-family: var(--cho-neo-font-ui); background: linear-gradient(180deg, #fff7ed, #fdeccf); box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38); }
        .cho-neo-room-vote-header { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 15px 16px; border-bottom: 1px solid rgba(120, 53, 15, 0.14); }
        .cho-neo-room-vote-header p { margin: 0; color: #7c2d12; font-size: 20px; font-weight: 500; }
        .cho-neo-room-vote-header span { color: rgba(58, 36, 24, 0.72); font-size: 13px; line-height: 1.35; }
        .cho-neo-room-vote-header button { display: grid; flex: 0 0 auto; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 999px; color: #7c2d12; background: rgba(120, 53, 15, 0.09); cursor: pointer; font: inherit; font-size: 24px; }
        .cho-neo-room-vote-scroll { min-height: 0; overflow-y: auto; }
        .cho-neo-room-vote-scroll * { box-sizing: border-box; }
        .room-vote-section { display: grid; gap: 10px; min-width: 0; padding: 16px; }
        .room-vote-section h3 { margin: 0; color: #7c2d12; font-size: 15px; font-weight: 600; }
        .room-vote-intro, .room-vote-selection p, .room-vote-disclosure p, .room-vote-status { margin: 0; color: rgba(67, 20, 7, 0.76); font-size: 12.5px; line-height: 1.4; }
        .room-vote-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .room-vote-card, .room-vote-reason { display: grid; gap: 9px; min-width: 0; padding: 10px; border: 1px solid rgba(120, 53, 15, 0.11); border-radius: 14px; background: rgba(255, 255, 255, 0.52); }
        .room-vote-card.selected { border-color: rgba(154, 52, 18, 0.44); background: rgba(255, 247, 237, 0.9); }
        .room-vote-card header { display: grid; gap: 2px; }
        .room-vote-card strong { color: #431407; font-size: 15px; font-weight: 600; line-height: 1.18; }
        .room-vote-card small, .room-vote-result, .room-vote-reason-meta, .room-vote-total { color: rgba(67, 20, 7, 0.62); font-size: 11px; }
        .room-vote-card p { margin: 0; color: rgba(67, 20, 7, 0.76); font-size: 12.5px; line-height: 1.35; }
        .room-vote-card footer, .room-vote-reason-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .room-vote-card button, .room-vote-change, .room-vote-retry, .room-vote-reason-actions button { min-height: 44px; padding: 7px 16px; border: 1px solid rgba(120, 53, 15, 0.16); border-radius: 12px; color: #7c2d12; background: rgba(255, 247, 237, 0.86); cursor: pointer; font: inherit; font-size: 12px; font-weight: 500; white-space: nowrap; }
        .room-vote-card button.selected { color: var(--cho-neo-text-primary); background: #9a3412; }
        .room-vote-card button:disabled, .room-vote-reason-actions button:disabled { cursor: default; opacity: 0.68; }
        .room-vote-attention { display: inline-flex; width: fit-content; padding: 3px 7px; border-radius: 999px; color: #7c2d12; background: rgba(251, 191, 36, 0.2); font-size: 11px; font-weight: 600; }
        .room-vote-selection { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid rgba(154, 52, 18, 0.16); border-radius: 14px; background: rgba(154, 52, 18, 0.07); }
        .room-vote-selection strong { color: #7c2d12; }
        .room-vote-reason textarea { width: 100%; min-height: 64px; padding: 9px; border: 1px solid rgba(120, 53, 15, 0.16); border-radius: 12px; color: #431407; background: rgba(255, 247, 237, 0.9); font: inherit; font-size: 13px; resize: vertical; }
        .room-vote-reason span { color: #431407; font-size: 13px; font-weight: 600; }
        .room-vote-reason-actions { justify-content: flex-start; flex-wrap: wrap; }
        .room-vote-disclosure { display: grid; gap: 4px; padding: 10px; border: 1px dashed rgba(120, 53, 15, 0.22); border-radius: 14px; background: rgba(255, 247, 237, 0.5); }
        .room-vote-status.error { color: #991b1b; }
        @media (max-width: 640px) {
          .cho-neo-room-vote-modal { align-items: end; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
          .cho-neo-room-vote-card { width: min(100%, calc(100vw - 24px)); max-height: min(760px, 92svh, calc(100svh - 24px)); border-radius: 22px; }
          .cho-neo-room-vote-grid { grid-template-columns: 1fr; }
          .room-vote-card footer, .room-vote-selection { align-items: stretch; flex-direction: column; }
          .room-vote-card button { width: 100%; min-height: 40px; }
        }
      `}</style>
    </div>,
    document.body,
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

      if (!response.ok) throw new Error("Room vote load failed");

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
      const wasSelected = Boolean(selectedOptionKey);
      setSaveStatus("saving");
      setReasonNotice("");

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Missing Cho Neo pass session");

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

        if (!response.ok) throw new Error("Room vote save failed");

        const next = (await response.json()) as ChoNeoRoomVotePresentation;
        setPresentation(next);
        setReason(next.selection?.optionalReason ?? "");
        setSaveStatus(wasSelected ? "updated" : "saved");
      } catch {
        setSaveStatus("error");
      }
    });
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
    document
      .querySelector<HTMLButtonElement>(".room-vote-card:not(.selected) button")
      ?.focus();
  }

  return (
    <section className="room-vote-section" id="cho-neo-room-vote">
      <h3>Góc Bình Chọn — Mở gì trước?</h3>
      <p className="room-vote-intro">
        Chọn một phòng bạn muốn Chợ Neo ưu tiên nghiên cứu tiếp.
      </p>

      {loadStatus === "error" ? (
        <div className="room-vote-disclosure" role="status">
          <p>Chưa lấy được bình chọn. Chợ Neo không tự bịa số.</p>
          <button className="room-vote-retry" onClick={loadVotePresentation} type="button">
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
          <button className="room-vote-change" onClick={focusOtherChoices} type="button">
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
            <button disabled={saveStatus === "saving"} onClick={saveReason} type="button">
              Lưu lý do
            </button>
            <button disabled={saveStatus === "saving"} onClick={skipReason} type="button">
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
        <p className="room-vote-status" role="status">Đã ghi nhận lựa chọn của bạn.</p>
      ) : saveStatus === "updated" ? (
        <p className="room-vote-status" role="status">Đã cập nhật lựa chọn.</p>
      ) : saveStatus === "error" ? (
        <p className="room-vote-status error" role="alert">Chưa lưu được bình chọn. Thử lại giúp Chợ Neo một nhịp nha.</p>
      ) : loadStatus === "loading" ? (
        <p className="room-vote-status" role="status">Đang lấy ý kiến...</p>
      ) : reasonNotice ? (
        <p className="room-vote-status" role="status">{reasonNotice}</p>
      ) : null}
    </section>
  );
}

function RoomVoteResult({ result }: { result?: ChoNeoRoomVotePublicResult }) {
  if (!result || result.statusLabel) {
    return <span className="room-vote-result">Đang lấy ý kiến</span>;
  }

  return (
    <span className="room-vote-result">
      Hạng {result.rank} · {result.percentage}%
    </span>
  );
}
