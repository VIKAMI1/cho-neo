import {
  ONG_DIA_DAILY_MESSAGES,
  ONG_DIA_LOC_READINGS,
  type OngDiaDailyMessage,
  type OngDiaLocCategory,
  type OngDiaLocReading,
} from "./xin-xam-sticky";

export type ShrineMemory = {
  firstVisitedAt: string;
  lastVisitedAt: string;
  visitCount: number;
  lastVisitDay: string;
};

export type DailyMessageMemory = {
  dayKey: string;
  messageId: string;
};

export type LocMemory = {
  id: string;
  dayKey: string;
  wish: string;
  locNumber: string;
  readingId: string;
  unlockedAt?: string;
};

export type LocHistoryEntry = LocMemory & {
  unlockedAt: string;
};

export type OngDiaRitualId =
  | "daily-kind-word"
  | "smooth-opening"
  | "calm-heart"
  | "closing-thanks"
  | "small-reminder";

export type OngDiaShrineRitual = {
  id: OngDiaRitualId;
  label: string;
};

export type OngDiaShrineResult = {
  ritualId: OngDiaRitualId;
  ongDia: string;
  pao: string;
  action: string;
};

export const SHRINE_MEMORY_KEY = "choNeo.ongDiaShrine.v1";
export const DAILY_MESSAGE_KEY = "choNeo.ongDiaDailyMessage.v1";
export const LOC_MEMORY_KEY = "choNeo.ongDiaLocVault.v2";
export const LOC_HISTORY_KEY = "choNeo.ongDiaLocBook.v2";
export const MAX_DAILY_BLESSINGS = 3;

export const ONG_DIA_SHRINE_RITUALS: OngDiaShrineRitual[] = [
  {
    id: "daily-kind-word",
    label: "Xin lời lành hôm nay",
  },
  {
    id: "smooth-opening",
    label: "Xin mở hàng thuận lợi",
  },
  {
    id: "calm-heart",
    label: "Xin bình tâm",
  },
  {
    id: "closing-thanks",
    label: "Cuối ngày cảm ơn",
  },
  {
    id: "small-reminder",
    label: "Xin nhắc một việc nhỏ",
  },
];

export const ONG_DIA_SHRINE_RESULTS: Record<
  OngDiaRitualId,
  OngDiaShrineResult
> = {
  "daily-kind-word": {
    ritualId: "daily-kind-word",
    ongDia: "Hôm nay cứ đi chậm một nhịp. Lời hiền thường mở đường trước.",
    pao: "Pao hiểu là mình đừng vội phản ứng. Giữ giọng nhẹ thì việc khó cũng bớt sắc.",
    action: "Trước ca làm, nhắn hoặc nói một câu tử tế với người đầu tiên mình gặp.",
  },
  "smooth-opening": {
    ritualId: "smooth-opening",
    ongDia: "Mở hàng không cần ồn. Bàn sạch, lòng ngay, khách tới thì đón tử tế.",
    pao: "Không phải hứa hôm nay đông khách. Chỉ là chuẩn bị gọn để cơ hội tới thì mình không rối.",
    action: "Dọn một góc nhỏ ở quầy hoặc bàn làm, rồi kiểm tra món hay dùng nhất.",
  },
  "calm-heart": {
    ritualId: "calm-heart",
    ongDia: "Tim đang mệt thì để nó ngồi xuống chút. Thở xong rồi hãy nói.",
    pao: "Pao hiểu là đừng quyết chuyện quan trọng khi trong lòng còn nóng.",
    action: "Uống nước, thở 3 hơi chậm, rồi viết ra đúng một việc cần xử lý trước.",
  },
  "closing-thanks": {
    ritualId: "closing-thanks",
    ongDia: "Hết ngày rồi, cảm ơn đôi tay mình. Có mệt cũng là đã đi qua.",
    pao: "Pao hiểu là mình được phép công nhận công sức, dù hôm nay chưa hoàn hảo.",
    action: "Trước khi nghỉ, ghi một điều nhỏ hôm nay mình đã làm được.",
  },
  "small-reminder": {
    ritualId: "small-reminder",
    ongDia: "Việc nhỏ chưa xong không phải để mắng mình. Nó chỉ đang chờ được nhắc nhẹ.",
    pao: "Pao hiểu là chọn một việc bé thôi. Xong một việc nhỏ cũng kéo lòng về lại.",
    action: "Chọn một việc dưới 5 phút: trả lời tin nhắn, cất đồ, hoặc ghi lịch hẹn.",
  },
};

export const ONG_DIA_SHRINE_BLESSINGS = [
  "Ông Địa cười rồi. Đi chậm lại một nhịp, chuyện hôm nay sẽ nhẹ hơn.",
  "Có vía lành rồi đó. Làm gì cũng giữ lòng rộng, tay chắc, miệng hiền.",
  "Hôm nay cứ bắt đầu bằng một việc nhỏ tử tế. Lộc hay ghé chỗ có lòng.",
  "Ông Địa nhắc nhẹ: đừng ôm hết một mình. Chia bớt việc, giữ bớt lo.",
  "Xin vía bình an. Nói vừa đủ, làm cho tới, rồi để phần còn lại tự tới.",
  "Một vía may mắn nhỏ cho ngày dài: gặp người dễ thương, việc khó cũng mềm.",
];

export function getOngDiaShrineBlessing(index: number) {
  return (
    ONG_DIA_SHRINE_BLESSINGS[
      Math.abs(index) % ONG_DIA_SHRINE_BLESSINGS.length
    ] ?? ONG_DIA_SHRINE_BLESSINGS[0]
  );
}

export function getOngDiaShrineResult(ritualId: OngDiaRitualId) {
  return ONG_DIA_SHRINE_RESULTS[ritualId];
}

export function touchShrineMemory(todayKey: string, now = new Date()) {
  const nowIso = now.toISOString();
  let nextShrineMemory: ShrineMemory = {
    firstVisitedAt: nowIso,
    lastVisitedAt: nowIso,
    visitCount: 1,
    lastVisitDay: todayKey,
  };

  try {
    const stored = window.localStorage.getItem(SHRINE_MEMORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<ShrineMemory>;
      const lastVisitDay = parsed.lastVisitDay ?? "";
      nextShrineMemory = {
        firstVisitedAt: parsed.firstVisitedAt ?? nowIso,
        lastVisitedAt: nowIso,
        visitCount:
          typeof parsed.visitCount === "number"
            ? parsed.visitCount + (lastVisitDay === todayKey ? 0 : 1)
            : 1,
        lastVisitDay: todayKey,
      };
    }
    window.localStorage.setItem(SHRINE_MEMORY_KEY, JSON.stringify(nextShrineMemory));
  } catch {
    // Local shrine memory is a convenience only. The ritual still works without it.
  }

  return nextShrineMemory;
}

export function loadOrCreateDailyMessage(dayKey: string) {
  try {
    const stored = window.localStorage.getItem(DAILY_MESSAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<DailyMessageMemory>;
      const storedMessage = ONG_DIA_DAILY_MESSAGES.find(
        (message) => message.id === parsed.messageId,
      );
      if (parsed.dayKey === dayKey && storedMessage) return storedMessage;
    }

    const message =
      ONG_DIA_DAILY_MESSAGES[
        Math.abs(hashString(dayKey)) % ONG_DIA_DAILY_MESSAGES.length
      ] ?? ONG_DIA_DAILY_MESSAGES[0];
    window.localStorage.setItem(
      DAILY_MESSAGE_KEY,
      JSON.stringify({ dayKey, messageId: message.id } satisfies DailyMessageMemory),
    );
    return message;
  } catch {
    return ONG_DIA_DAILY_MESSAGES[0] satisfies OngDiaDailyMessage;
  }
}

export function createLocMemoryForWish(
  wish: string,
  dayKey = getLocalDayKey(new Date()),
) {
  const currentMemories = loadLocMemories(dayKey);
  if (currentMemories.length >= MAX_DAILY_BLESSINGS) {
    return {
      ok: false as const,
      memories: currentMemories,
      latest: currentMemories[currentMemories.length - 1] ?? null,
      message:
        "Hôm nay con đã xin đủ 3 lời rồi. Ông Địa nghe rồi, mai ghé lại xin vía mới nha.",
    };
  }

  const blessingNumber = currentMemories.length + 1;
  const locNumber = createLocNumber(`${dayKey}:${blessingNumber}:${wish}`);
  const wishCategory = detectLocWishCategory(wish);
  const preferredReadingId = detectPreferredLocReadingId(wish, wishCategory);
  const reading = chooseLocReading(
    wishCategory,
    `${dayKey}:${blessingNumber}:${wish}:${locNumber}`,
    preferredReadingId,
  );
  const nextLocMemory: LocMemory = {
    id: createLocId(dayKey, blessingNumber, wish),
    dayKey,
    wish,
    locNumber,
    readingId: reading.id,
  };

  const memories = [...currentMemories, nextLocMemory];
  saveLocMemories(memories);

  return {
    ok: true as const,
    memories,
    latest: nextLocMemory,
    reading,
  };
}

export function unlockLocMemory(locMemory: LocMemory) {
  const nextLocMemory: LocMemory = {
    ...locMemory,
    unlockedAt: locMemory.unlockedAt ?? new Date().toISOString(),
  };
  const todayMemories = loadLocMemories(locMemory.dayKey);
  const nextMemories = todayMemories.map((memory) =>
    memory.id === nextLocMemory.id ? nextLocMemory : memory,
  );
  saveLocMemories(nextMemories);
  const history = saveLocHistory(nextLocMemory);

  return {
    locMemory: nextLocMemory,
    memories: nextMemories,
    history,
  };
}

export function loadLocMemories(dayKey: string) {
  try {
    const stored = window.localStorage.getItem(LOC_MEMORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;

    if (Array.isArray(parsed)) {
      return parsed
        .map((value, index) => normalizeLocMemory(value, index))
        .filter((memory): memory is LocMemory => Boolean(memory))
        .filter((memory) => memory.dayKey === dayKey)
        .slice(0, MAX_DAILY_BLESSINGS);
    }

    const migrated = normalizeLocMemory(parsed, 0);
    return migrated?.dayKey === dayKey ? [migrated] : [];
  } catch {
    return [];
  }
}

export function saveLocMemories(memories: LocMemory[]) {
  try {
    window.localStorage.setItem(
      LOC_MEMORY_KEY,
      JSON.stringify(memories.slice(0, MAX_DAILY_BLESSINGS)),
    );
  } catch {
    // Local lộc memory is intentionally browser-only and non-critical.
  }
}

export function loadLocHistory() {
  try {
    const stored = window.localStorage.getItem(LOC_HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .flatMap((value, index): LocHistoryEntry[] => {
        const memory = normalizeLocMemory(value, index);
        return memory?.unlockedAt ? [{ ...memory, unlockedAt: memory.unlockedAt }] : [];
      })
      .slice(0, 7);
  } catch {
    return [];
  }
}

export function saveLocHistory(memory: LocMemory) {
  if (!memory.unlockedAt) return loadLocHistory();

  const nextHistory = [
    memory as LocHistoryEntry,
    ...loadLocHistory().filter((entry) => entry.id !== memory.id),
  ].slice(0, 7);

  try {
    window.localStorage.setItem(LOC_HISTORY_KEY, JSON.stringify(nextHistory));
  } catch {
    // The lộc book is local convenience only.
  }

  return nextHistory;
}

export function normalizeLocMemory(value: unknown, index: number): LocMemory | null {
  if (!value || typeof value !== "object") return null;
  const memory = value as Partial<LocMemory>;
  if (!memory.dayKey || !memory.wish || !memory.locNumber || !memory.readingId) {
    return null;
  }
  return {
    id: memory.id ?? createLocId(memory.dayKey, index + 1, memory.wish),
    dayKey: memory.dayKey,
    wish: memory.wish,
    locNumber: memory.locNumber,
    readingId: memory.readingId,
    unlockedAt: memory.unlockedAt,
  } satisfies LocMemory;
}

export function createLocNumber(seed: string) {
  const value = (Math.abs(hashString(seed)) % 90) + 10;
  return `${value}`.padStart(2, "0");
}

export function createLocId(dayKey: string, blessingNumber: number, wish: string) {
  return `${dayKey}:${blessingNumber}:${Math.abs(hashString(wish))}`;
}

export function detectLocWishCategory(wish: string): OngDiaLocCategory {
  const normalizedWish = normalizeLocWishText(wish);

  return (
    LOC_WISH_CATEGORY_PRIORITY.find((category) =>
      LOC_WISH_CATEGORY_KEYWORDS[category].some((keyword) =>
        hasLocWishKeyword(normalizedWish, keyword),
      ),
    ) ?? "general_luck"
  );
}

export function detectPreferredLocReadingId(
  wish: string,
  category: OngDiaLocCategory,
) {
  if (category !== "exam_test") return null;

  const normalizedWish = normalizeLocWishText(wish);
  const drivingKeywords = [
    "driving test",
    "road test",
    "pass the driving test",
    "license test",
    "bằng lái",
    "bang lai",
    "thi lái xe",
    "thi lai xe",
    "thi bằng lái",
    "thi bang lai",
    "đậu bằng lái",
    "dau bang lai",
  ];

  return drivingKeywords.some((keyword) => hasLocWishKeyword(normalizedWish, keyword))
    ? "thi-lai-xe"
    : null;
}

export function chooseLocReading(
  category: OngDiaLocCategory,
  seed: string,
  preferredReadingId: string | null = null,
): OngDiaLocReading {
  const categoryReadings = ONG_DIA_LOC_READINGS.filter(
    (reading) => reading.category === category,
  );
  const fallbackReadings = ONG_DIA_LOC_READINGS.filter(
    (reading) => reading.category === "general_luck",
  );
  const readings = categoryReadings.length
    ? categoryReadings
    : fallbackReadings.length
      ? fallbackReadings
      : ONG_DIA_LOC_READINGS;
  const preferredReading = preferredReadingId
    ? readings.find((reading) => reading.id === preferredReadingId)
    : null;

  if (preferredReading) return preferredReading;

  return (
    readings[Math.abs(hashString(`${category}:${seed}`)) % readings.length] ??
    readings[0] ??
    ONG_DIA_LOC_READINGS[0]
  );
}

export function getLocReadingById(readingId: string) {
  return (
    ONG_DIA_LOC_READINGS.find((reading) => reading.id === readingId) ??
    ONG_DIA_LOC_READINGS[0]
  );
}

export function getLocalDayKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function hasLocWishKeyword(normalizedWish: string, keyword: string) {
  const normalizedKeyword = normalizeLocWishText(keyword);
  if (!normalizedKeyword) return false;

  if (normalizedKeyword.includes(" ")) {
    return normalizedWish.includes(normalizedKeyword);
  }

  return normalizedWish.split(" ").includes(normalizedKeyword);
}

function normalizeLocWishText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const LOC_WISH_CATEGORY_KEYWORDS: Record<OngDiaLocCategory, string[]> = {
  lost_keys: [
    "chìa khóa",
    "chia khoa",
    "key",
    "keys",
    "lost key",
    "lost keys",
    "mất chìa",
    "mat chia",
    "mất đồ",
    "mat do",
    "thất lạc",
    "that lac",
  ],
  exam_test: [
    "thi",
    "bài thi",
    "bai thi",
    "test",
    "exam",
    "driving test",
    "road test",
    "pass the driving test",
    "pass test",
    "license test",
    "bằng lái",
    "bang lai",
    "thi lái xe",
    "thi lai xe",
    "thi bằng lái",
    "thi bang lai",
    "đậu bằng lái",
    "dau bang lai",
  ],
  health_body: [
    "đau bụng",
    "dau bung",
    "stomach",
    "sick",
    "mệt",
    "met",
    "health",
    "sức khỏe",
    "suc khoe",
  ],
  money_tip: ["tip", "tips", "tiền", "tien", "khách", "khach", "sale", "customers"],
  shop_peace: [
    "tiệm",
    "tiem",
    "salon",
    "shop",
    "nhân viên",
    "nhan vien",
    "khách khó",
    "khach kho",
    "bình yên",
    "binh yen",
  ],
  family_home: [
    "nhà",
    "nha",
    "family",
    "gia đình",
    "gia dinh",
    "con cái",
    "con cai",
    "ba mẹ",
    "ba me",
    "cha mẹ",
    "cha me",
  ],
  confidence: [
    "tự tin",
    "tu tin",
    "confidence",
    "can đảm",
    "can dam",
    "sợ",
    "so",
    "lo",
    "worried",
    "nervous",
  ],
  general_luck: [],
};

const LOC_WISH_CATEGORY_PRIORITY: OngDiaLocCategory[] = [
  "lost_keys",
  "exam_test",
  "health_body",
  "confidence",
  "shop_peace",
  "family_home",
  "money_tip",
];
