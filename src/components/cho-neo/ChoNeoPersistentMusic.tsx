"use client";

import { usePathname } from "next/navigation";
import ChoNeoThemeParkAudio from "./ChoNeoThemeParkAudio";

export function ChoNeoPersistentMusic() {
  const pathname = usePathname();
  const shouldMountMusic =
    pathname === "/xin-xam" || pathname?.startsWith("/cho-neo");

  if (!shouldMountMusic) {
    return null;
  }

  return <ChoNeoThemeParkAudio className="cho-neo-layout-theme-audio" />;
}
