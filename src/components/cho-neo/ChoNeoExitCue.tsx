"use client";

import { useEffect, useState } from "react";

type ExitCueMode = "standalone-mobile" | "browser";

export function ChoNeoExitCue() {
  const [mode, setMode] = useState<ExitCueMode | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const mobileLike =
      window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(max-width: 760px)").matches;

    setMode(standalone && mobileLike ? "standalone-mobile" : "browser");
  }, []);

  if (mode === null) return null;

  const isStandaloneMobile = mode === "standalone-mobile";

  return (
    <aside
      aria-live="polite"
      className={`entrance-exit-cue ${isStandaloneMobile ? "entrance-exit-cue-gesture" : "entrance-exit-cue-browser"}`}
    >
      {isStandaloneMobile ? (
        <div aria-hidden="true" className="exit-gesture">
          <span className="exit-gesture-pulse" />
          <svg
            aria-hidden="true"
            className="exit-gesture-hand"
            fill="none"
            height="52"
            viewBox="0 0 44 52"
            width="44"
          >
            <path
              d="M18.5 25.5V8.75a4.25 4.25 0 0 1 8.5 0V26l1.4-2.25a4 4 0 0 1 6.95 3.95l-5.05 9.45a15.2 15.2 0 0 1-13.4 8.1h-1.2A12.2 12.2 0 0 1 3.5 33.05v-5.8a3.85 3.85 0 0 1 6.2-3.05l8.8 6.95"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.25"
            />
          </svg>
        </div>
      ) : null}
      <p>{isStandaloneMobile ? "Vuốt lên để về Màn hình chính" : "Bạn có thể đóng trang này để rời Chợ Neo."}</p>
      <span>{isStandaloneMobile ? "Swipe up to return Home" : "You can close this page to leave Chợ Neo."}</span>
    </aside>
  );
}
