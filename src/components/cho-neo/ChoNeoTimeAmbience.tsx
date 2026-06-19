"use client";

import { useEffect, useState } from "react";

type ChoNeoTimeMood = "morning" | "day" | "golden-dusk" | "night-market";

const MOOD_LABELS: Record<ChoNeoTimeMood, { vi: string; en: string }> = {
  morning: { vi: "Buổi sáng", en: "Morning" },
  day: { vi: "Ban ngày", en: "Day" },
  "golden-dusk": { vi: "Chiều lên đèn", en: "Golden dusk" },
  "night-market": { vi: "Chợ đêm", en: "Night market" },
};

function getLocalTimeMood(date: Date): ChoNeoTimeMood {
  const hour = date.getHours();

  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "golden-dusk";
  return "night-market";
}

export function ChoNeoTimeAmbience() {
  useEffect(() => {
    document.documentElement.dataset.choNeoTime = getLocalTimeMood(new Date());
  }, []);

  return (
    <>
      <span aria-hidden="true" className="cho-neo-time-ambience" />
      <style>{`
        :root {
          --cho-neo-shell-background:
            radial-gradient(circle at 20% 12%, rgba(251, 191, 36, 0.22), transparent 20%),
            radial-gradient(circle at 72% 8%, rgba(244, 114, 182, 0.2), transparent 22%),
            radial-gradient(circle at 80% 86%, rgba(20, 184, 166, 0.15), transparent 30%),
            linear-gradient(135deg, #02030a 0%, #081020 34%, #251426 70%, #04040a 100%);
          --cho-neo-air-background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 22%),
            radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.36) 84%);
          --cho-neo-device-background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025)),
            rgba(6, 10, 18, 0.82);
          --cho-neo-scene-wash: linear-gradient(180deg, rgba(3, 7, 18, 0.18), rgba(3, 7, 18, 0.06) 40%, rgba(3, 7, 18, 0.32));
          --cho-neo-scene-radial: radial-gradient(circle at 50% 44%, rgba(251, 191, 36, 0.13), transparent 34%);
          --cho-neo-scene-filter: saturate(1.18) contrast(1.08) brightness(0.9);
          --cho-neo-scene-vignette:
            linear-gradient(90deg, rgba(3, 7, 18, 0.2), transparent 20%, transparent 80%, rgba(3, 7, 18, 0.22)),
            radial-gradient(circle at 50% 48%, transparent 0%, rgba(0, 0, 0, 0.2) 82%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.05), transparent 14%, rgba(0, 0, 0, 0.14));
          --cho-neo-room-page-background:
            radial-gradient(circle at 20% 16%, rgba(251, 191, 36, 0.22), transparent 30%),
            radial-gradient(circle at 78% 14%, rgba(244, 114, 182, 0.16), transparent 28%),
            linear-gradient(180deg, #101224 0%, #21162c 48%, #151015 100%);
          --cho-neo-room-glow-background:
            radial-gradient(ellipse at 50% 20%, rgba(253, 230, 138, 0.16), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(251, 191, 36, 0.14), transparent 48%);
          --cho-neo-room-card-radial: radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.18), transparent 28%);
          --cho-neo-floor-opacity: 0.48;
        }

        :root[data-cho-neo-time="morning"] {
          --cho-neo-shell-background:
            radial-gradient(circle at 22% 10%, rgba(253, 230, 138, 0.2), transparent 24%),
            radial-gradient(circle at 80% 18%, rgba(125, 211, 252, 0.14), transparent 28%),
            radial-gradient(circle at 74% 86%, rgba(45, 212, 191, 0.12), transparent 32%),
            linear-gradient(135deg, #111827 0%, #1f2a37 38%, #3a2a32 72%, #111827 100%);
          --cho-neo-air-background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.08), transparent 30%),
            radial-gradient(ellipse at 48% 12%, rgba(253, 230, 138, 0.13), transparent 42%);
          --cho-neo-device-background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.04)),
            rgba(15, 23, 42, 0.8);
          --cho-neo-scene-wash: linear-gradient(180deg, rgba(255, 247, 237, 0.11), rgba(255, 247, 237, 0.04) 42%, rgba(3, 7, 18, 0.16));
          --cho-neo-scene-radial: radial-gradient(circle at 42% 18%, rgba(253, 230, 138, 0.17), transparent 34%);
          --cho-neo-scene-filter: saturate(1.02) contrast(1.02) brightness(1.08);
          --cho-neo-scene-vignette:
            linear-gradient(90deg, rgba(15, 23, 42, 0.12), transparent 24%, transparent 80%, rgba(15, 23, 42, 0.14)),
            radial-gradient(circle at 50% 48%, transparent 0%, rgba(0, 0, 0, 0.12) 84%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.08), transparent 18%, rgba(0, 0, 0, 0.08));
          --cho-neo-room-page-background:
            radial-gradient(circle at 22% 14%, rgba(253, 230, 138, 0.2), transparent 30%),
            radial-gradient(circle at 78% 18%, rgba(125, 211, 252, 0.13), transparent 28%),
            linear-gradient(180deg, #172033 0%, #2a2739 50%, #171923 100%);
          --cho-neo-room-glow-background:
            radial-gradient(ellipse at 48% 16%, rgba(253, 230, 138, 0.16), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(125, 211, 252, 0.09), transparent 48%);
          --cho-neo-room-card-radial: radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.14), transparent 28%);
          --cho-neo-floor-opacity: 0.34;
        }

        :root[data-cho-neo-time="day"] {
          --cho-neo-shell-background:
            radial-gradient(circle at 20% 12%, rgba(253, 230, 138, 0.18), transparent 24%),
            radial-gradient(circle at 78% 14%, rgba(56, 189, 248, 0.13), transparent 28%),
            radial-gradient(circle at 78% 84%, rgba(45, 212, 191, 0.14), transparent 32%),
            linear-gradient(135deg, #101827 0%, #23314a 40%, #34253a 72%, #111827 100%);
          --cho-neo-air-background:
            linear-gradient(180deg, rgba(255, 247, 237, 0.055), transparent 28%),
            radial-gradient(ellipse at 50% 100%, rgba(45, 212, 191, 0.08), transparent 48%);
          --cho-neo-device-background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.035)),
            rgba(11, 18, 32, 0.8);
          --cho-neo-scene-wash: linear-gradient(180deg, rgba(255, 247, 237, 0.06), rgba(255, 247, 237, 0.02) 42%, rgba(3, 7, 18, 0.18));
          --cho-neo-scene-radial: radial-gradient(circle at 52% 28%, rgba(253, 230, 138, 0.11), transparent 34%);
          --cho-neo-scene-filter: saturate(1.08) contrast(1.04) brightness(1.02);
          --cho-neo-scene-vignette:
            linear-gradient(90deg, rgba(3, 7, 18, 0.14), transparent 22%, transparent 80%, rgba(3, 7, 18, 0.16)),
            radial-gradient(circle at 50% 48%, transparent 0%, rgba(0, 0, 0, 0.14) 84%),
            linear-gradient(180deg, rgba(255, 247, 237, 0.05), transparent 16%, rgba(0, 0, 0, 0.1));
          --cho-neo-room-page-background:
            radial-gradient(circle at 22% 18%, rgba(253, 230, 138, 0.18), transparent 30%),
            radial-gradient(circle at 78% 14%, rgba(56, 189, 248, 0.11), transparent 28%),
            linear-gradient(180deg, #111a2c 0%, #263149 48%, #151923 100%);
          --cho-neo-room-glow-background:
            radial-gradient(ellipse at 50% 20%, rgba(253, 230, 138, 0.13), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(45, 212, 191, 0.1), transparent 48%);
          --cho-neo-room-card-radial: radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.14), transparent 28%);
          --cho-neo-floor-opacity: 0.4;
        }

        :root[data-cho-neo-time="night-market"] {
          --cho-neo-shell-background:
            radial-gradient(circle at 18% 10%, rgba(251, 191, 36, 0.18), transparent 20%),
            radial-gradient(circle at 72% 12%, rgba(236, 72, 153, 0.24), transparent 24%),
            radial-gradient(circle at 78% 84%, rgba(20, 184, 166, 0.17), transparent 32%),
            linear-gradient(135deg, #01030a 0%, #07101f 34%, #231029 70%, #020207 100%);
          --cho-neo-air-background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.035), transparent 22%),
            radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.46) 84%);
          --cho-neo-device-background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.085), rgba(255, 255, 255, 0.02)),
            rgba(3, 7, 18, 0.88);
          --cho-neo-scene-wash: linear-gradient(180deg, rgba(3, 7, 18, 0.24), rgba(3, 7, 18, 0.08) 40%, rgba(3, 7, 18, 0.42));
          --cho-neo-scene-radial: radial-gradient(circle at 52% 44%, rgba(251, 191, 36, 0.16), transparent 34%);
          --cho-neo-scene-filter: saturate(1.28) contrast(1.12) brightness(0.82);
          --cho-neo-scene-vignette:
            linear-gradient(90deg, rgba(3, 7, 18, 0.28), transparent 20%, transparent 80%, rgba(3, 7, 18, 0.3)),
            radial-gradient(circle at 50% 48%, transparent 0%, rgba(0, 0, 0, 0.28) 82%),
            linear-gradient(180deg, rgba(244, 114, 182, 0.045), transparent 14%, rgba(0, 0, 0, 0.2));
          --cho-neo-room-page-background:
            radial-gradient(circle at 20% 16%, rgba(251, 191, 36, 0.18), transparent 30%),
            radial-gradient(circle at 78% 14%, rgba(236, 72, 153, 0.18), transparent 28%),
            linear-gradient(180deg, #070b18 0%, #1f112b 50%, #08070d 100%);
          --cho-neo-room-glow-background:
            radial-gradient(ellipse at 50% 20%, rgba(253, 230, 138, 0.14), transparent 42%),
            radial-gradient(ellipse at 50% 100%, rgba(236, 72, 153, 0.12), transparent 48%);
          --cho-neo-room-card-radial: radial-gradient(circle at 50% 12%, rgba(253, 230, 138, 0.2), transparent 28%);
          --cho-neo-floor-opacity: 0.52;
        }

        .cho-neo-time-ambience {
          display: none;
        }
      `}</style>
    </>
  );
}

export function ChoNeoTimeMoodLabel() {
  const [mood, setMood] = useState<ChoNeoTimeMood>("golden-dusk");

  useEffect(() => {
    const localMood = getLocalTimeMood(new Date());
    document.documentElement.dataset.choNeoTime = localMood;
    setMood(localMood);
  }, []);

  const label = MOOD_LABELS[mood];

  return (
    <>
      <strong>{label.vi}</strong>
      <small>{label.en}</small>
    </>
  );
}
