"use client";

import Link from "next/link";
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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (readSoftExitState()) {
      window.location.replace("/cho-neo/entrance");
      return;
    }

    setReady(true);
  }, []);

  if (!ready) return null;

  return children;
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
