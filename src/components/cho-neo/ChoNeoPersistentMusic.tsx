"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CHO_NEO_SOFT_EXIT_STORAGE_KEY } from "./ChoNeoSoftExit";
import ChoNeoThemeParkAudio from "./ChoNeoThemeParkAudio";

export function ChoNeoPersistentMusic() {
  const pathname = usePathname();
  const [softExitChecked, setSoftExitChecked] = useState(pathname !== "/cho-neo");
  const [softExitActive, setSoftExitActive] = useState(false);

  useEffect(() => {
    if (pathname !== "/cho-neo") {
      setSoftExitActive(false);
      setSoftExitChecked(true);
      return;
    }

    try {
      setSoftExitActive(window.localStorage.getItem(CHO_NEO_SOFT_EXIT_STORAGE_KEY) === "true");
    } catch {
      setSoftExitActive(false);
    }
    setSoftExitChecked(true);
  }, [pathname]);

  const shouldMountMusic = isChoNeoMusicPath(pathname);

  if (!shouldMountMusic || !softExitChecked || softExitActive) {
    return null;
  }

  return <ChoNeoThemeParkAudio className="cho-neo-layout-theme-audio" />;
}

function isChoNeoMusicPath(pathname: string | null) {
  if (pathname === "/cho-neo/entrance") return false;
  return pathname === "/xin-xam" || pathname?.startsWith("/cho-neo") === true;
}
