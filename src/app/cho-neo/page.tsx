import { ChoNeoVillageShell } from "@/components/cho-neo/ChoNeoVillageShell";
import { ChoNeoSoftExitGate } from "@/components/cho-neo/ChoNeoSoftExit";

export default function ChoNeoPage() {
  return (
    <ChoNeoSoftExitGate>
      <ChoNeoVillageShell />
    </ChoNeoSoftExitGate>
  );
}
