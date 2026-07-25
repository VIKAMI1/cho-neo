import ChoNeoThemeParkAudio from "@/components/cho-neo/ChoNeoThemeParkAudio";
import type { ReactNode } from "react";

export default function ChoNeoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <ChoNeoThemeParkAudio className="cho-neo-layout-theme-audio" />
    </>
  );
}
