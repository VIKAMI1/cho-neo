import { ChoNeoMemberProvider } from "@/components/cho-neo/ChoNeoMemberProvider";
import ChoNeoThemeParkAudio from "@/components/cho-neo/ChoNeoThemeParkAudio";
import type { ReactNode } from "react";

export default function ChoNeoLayout({ children }: { children: ReactNode }) {
  return (
    <ChoNeoMemberProvider>
      {children}
      <ChoNeoThemeParkAudio className="cho-neo-layout-theme-audio" />
    </ChoNeoMemberProvider>
  );
}
