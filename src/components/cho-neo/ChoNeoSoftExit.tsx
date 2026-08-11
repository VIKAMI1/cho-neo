"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export const CHO_NEO_SOFT_EXIT_STORAGE_KEY = "choNeoSoftExited";

function readSoftExitState() {
  try {
    return window.localStorage.getItem(CHO_NEO_SOFT_EXIT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberSoftExit() {
  try {
    window.localStorage.setItem(CHO_NEO_SOFT_EXIT_STORAGE_KEY, "true");
  } catch {
    // The link still navigates even when storage is unavailable.
  }
}

function clearSoftExit() {
  try {
    window.localStorage.removeItem(CHO_NEO_SOFT_EXIT_STORAGE_KEY);
  } catch {
    // The link still navigates even when storage is unavailable.
  }
}

export function ChoNeoSoftExitGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (readSoftExitState()) {
      router.replace("/cho-neo/entrance");
      return;
    }

    setReady(true);
  }, [router]);

  if (!ready) return <ChoNeoSoftExitFallback />;

  return children;
}

function ChoNeoSoftExitFallback() {
  return (
    <main aria-label="Đang rời Chợ Neo" className="cho-neo-soft-exit-fallback">
      <span aria-hidden="true">Chợ Neo</span>
      <style>{`
        .cho-neo-soft-exit-fallback {
          min-height: 100vh;
          min-height: 100svh;
          display: grid;
          place-items: center;
          overflow: hidden;
          color: rgba(255, 244, 223, 0.22);
          background:
            radial-gradient(ellipse at center, rgba(48, 7, 15, 0.58) 0 34%, rgba(16, 1, 5, 0.92) 78%),
            linear-gradient(180deg, #21060c, #090104);
          isolation: isolate;
        }

        .cho-neo-soft-exit-fallback span {
          font-family: var(--font-newsreader), Georgia, serif;
          font-size: clamp(0.86rem, 2.4vw, 1rem);
          font-weight: 500;
          letter-spacing: 0;
        }
      `}</style>
    </main>
  );
}

export function ChoNeoSoftExitLink({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link className={className} href="/cho-neo/entrance" onClick={rememberSoftExit}>
      {children}
    </Link>
  );
}

export function ChoNeoEnterMarketLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/cho-neo" onClick={clearSoftExit}>
      {children}
    </Link>
  );
}
