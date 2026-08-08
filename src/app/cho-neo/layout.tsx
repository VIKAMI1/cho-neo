import { ChoNeoMemberProvider } from "@/components/cho-neo/ChoNeoMemberProvider";
import type { ReactNode } from "react";

export default function ChoNeoLayout({ children }: { children: ReactNode }) {
  return <ChoNeoMemberProvider>{children}</ChoNeoMemberProvider>;
}
