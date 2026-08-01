"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  getChoNeoBetaSessionId,
  getChoNeoDeviceType,
  inferChoNeoRoomFromPath,
  trackChoNeoBetaEvent,
} from "@/lib/cho-neo/beta-analytics";

const FEEDBACK_CATEGORIES = [
  ["improvement", "Góp ý cải thiện"],
  ["bug", "Báo lỗi"],
  ["content", "Góp ý nội dung"],
  ["other", "Khác"],
] as const;

type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number][0];

export function ChoNeoBetaFeedback() {
  const pathname = usePathname();
  const room = useMemo(() => inferChoNeoRoomFromPath(pathname), [pathname]);
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("improvement");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

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
      if (event.key === "Escape") closeFeedback();
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

  function openFeedback() {
    setStatus("idle");
    setIsOpen(true);
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
          musicIncluded: false,
          answers: { category },
          comments: { message },
          contact: "",
        }),
      });

      if (!response.ok) throw new Error("Feedback save failed");

      setStatus("saved");
      trackChoNeoBetaEvent("feedback_submitted", { room });
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        aria-label="Mở góp ý"
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
              <section className="feedback-card" aria-labelledby="feedback-title">
                <header className="feedback-header">
                  <div>
                    <p id="feedback-title">Góp ý cho Chợ Neo</p>
                    <span>Một góp ý ngắn thôi, để Chợ Neo biết đường chăm lại.</span>
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
                  <fieldset className="feedback-section feedback-category-section">
                    <legend>Bạn muốn góp ý về</legend>
                    <div className="feedback-options">
                      {FEEDBACK_CATEGORIES.map(([value, label]) => (
                        <label className="feedback-category" key={value}>
                          <input
                            checked={category === value}
                            name="cho-neo-feedback-category"
                            onChange={() => setCategory(value)}
                            type="radio"
                            value={value}
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <label className="feedback-section feedback-textarea">
                    <span>Nói ngắn gọn điều bạn muốn gửi</span>
                    <textarea
                      aria-label="Nội dung góp ý"
                      maxLength={1200}
                      onChange={(event) => setMessage(event.target.value)}
                      placeholder="Viết một điều bạn thấy, một lỗi gặp phải, hoặc một ý tưởng..."
                      rows={5}
                      value={message}
                    />
                  </label>
                </div>

                <footer className="feedback-footer">
                  {status === "saved" ? (
                    <p>Cảm ơn nha. Góp ý đã được ghi nhận riêng tư.</p>
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
            document.body,
          )
        : null}

      <style>{`
        .cho-neo-feedback-button {
          position: static;
          z-index: 80;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 44px;
          padding: 7px 16px;
          border: 1px solid rgba(248, 211, 145, 0.3);
          border-radius: 12px;
          color: var(--cho-neo-text-primary);
          background: linear-gradient(180deg, rgba(73, 35, 45, 0.9), rgba(16, 9, 18, 0.94));
          box-shadow: 0 7px 18px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 247, 237, 0.1);
          cursor: pointer;
          font: inherit;
          font-weight: 500;
          line-height: 1;
        }

        .cho-neo-feedback-button::before {
          content: "♥";
          display: block;
          color: #ffd4dc;
          font-size: 16px;
          line-height: 1;
        }

        .cho-neo-feedback-button span { font-size: 11px; font-weight: 500; }
        .cho-neo-feedback-button small { display: none; }

        .cho-neo-feedback-modal {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
          overflow: hidden;
        }

        .cho-neo-feedback-modal *, .cho-neo-feedback-modal *::before, .cho-neo-feedback-modal *::after { box-sizing: border-box; }
        .feedback-backdrop { position: absolute; inset: 0; background: rgba(3, 7, 18, 0.68); backdrop-filter: blur(10px); }
        .feedback-card {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          width: min(620px, calc(100vw - 48px));
          min-width: 0;
          max-height: min(680px, 90svh, calc(100svh - 48px));
          overflow: hidden;
          border: 1px solid rgba(248, 211, 145, 0.24);
          border-radius: 26px;
          color: #3a2418;
          font-family: var(--cho-neo-font-ui);
          background: linear-gradient(180deg, #fff7ed, #fdeccf);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
        }

        .feedback-header, .feedback-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 15px 16px; }
        .feedback-header { border-bottom: 1px solid rgba(120, 53, 15, 0.14); }
        .feedback-footer { border-top: 1px solid rgba(120, 53, 15, 0.14); background: rgba(255, 247, 237, 0.9); }
        .feedback-header p, .feedback-footer p { min-width: 0; margin: 0; overflow-wrap: anywhere; }
        .feedback-header p { color: #7c2d12; font-size: 20px; font-weight: 500; }
        .feedback-header span, .feedback-footer p { color: rgba(58, 36, 24, 0.72); font-size: 13px; line-height: 1.35; }
        .feedback-header button, .feedback-footer button { border: 0; cursor: pointer; font: inherit; font-weight: 600; }
        .feedback-header button { display: grid; flex: 0 0 auto; place-items: center; width: 36px; height: 36px; border-radius: 999px; color: #7c2d12; background: rgba(120, 53, 15, 0.09); font-size: 24px; }
        .feedback-footer button { flex: 0 0 auto; min-height: 44px; padding: 7px 16px; border-radius: 12px; color: var(--cho-neo-text-primary); background: linear-gradient(180deg, #9a3412, #7c2d12); font-weight: 500; white-space: nowrap; }
        .feedback-footer button:disabled { cursor: default; opacity: 0.64; }
        .feedback-scroll { display: grid; gap: 14px; min-width: 0; padding: 14px 16px 28px; overflow-y: auto; }
        .feedback-section { display: grid; gap: 10px; min-width: 0; padding: 10px; border: 1px solid rgba(120, 53, 15, 0.11); border-radius: 16px; background: rgba(255, 255, 255, 0.52); }
        .feedback-category-section { margin: 0; }
        .feedback-category-section legend, .feedback-textarea span { padding: 0; color: #431407; font-size: 14px; font-weight: 600; }
        .feedback-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        .feedback-category { display: flex; align-items: center; gap: 8px; min-height: 42px; padding: 8px 10px; border: 1px solid rgba(120, 53, 15, 0.16); border-radius: 12px; color: #7c2d12; background: rgba(255, 247, 237, 0.82); font-size: 13px; cursor: pointer; }
        .feedback-category input { accent-color: #9a3412; }
        .feedback-textarea textarea { width: 100%; min-height: 130px; padding: 10px; border: 1px solid rgba(120, 53, 15, 0.16); border-radius: 13px; color: #431407; background: rgba(255, 247, 237, 0.9); font: inherit; font-size: 14px; resize: vertical; }

        @media (max-width: 640px) {
          .cho-neo-feedback-button { min-height: 44px; padding: 7px 12px; }
          .cho-neo-feedback-button::before { font-size: 15px; }
          .cho-neo-feedback-button span { font-size: 10px; }
          .cho-neo-feedback-modal { align-items: end; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
          .feedback-card { width: min(100%, calc(100vw - 24px)); max-height: min(680px, 92svh, calc(100svh - 24px)); border-radius: 22px; }
          .feedback-header, .feedback-footer { align-items: flex-start; flex-direction: column; padding: 13px; }
          .feedback-header { position: relative; padding-right: 54px; }
          .feedback-header button { position: absolute; top: 10px; right: 10px; }
          .feedback-footer button { width: 100%; }
          .feedback-scroll { padding: 12px 13px 28px; }
          .feedback-options { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}
