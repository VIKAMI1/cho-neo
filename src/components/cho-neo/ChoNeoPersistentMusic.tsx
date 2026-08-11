"use client";

import { usePathname } from "next/navigation";
import ChoNeoThemeParkAudio from "./ChoNeoThemeParkAudio";

export function ChoNeoPersistentMusic() {
  const pathname = usePathname();
  const shouldMountMusic = isChoNeoMusicPath(pathname);

  if (!shouldMountMusic) {
    return null;
  }

  return <ChoNeoThemeParkAudio className="cho-neo-layout-theme-audio" />;
}

function isChoNeoMusicPath(pathname: string | null) {
  if (pathname === "/cho-neo/entrance") return false;
  return pathname === "/xin-xam" || pathname?.startsWith("/cho-neo") === true;
}
