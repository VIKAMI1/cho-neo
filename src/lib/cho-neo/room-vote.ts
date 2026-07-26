export const CHO_NEO_ROOM_VOTE_POLL_KEY = "cho-neo-room-vote-v1";
export const CHO_NEO_ROOM_VOTE_OPEN_EVENT = "cho-neo:open-room-vote";
export const CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH = 280;
export const CHO_NEO_ROOM_VOTE_PUBLIC_RESULTS_THRESHOLD = 10;
export const CHO_NEO_ROOM_VOTE_ATTENTION_THRESHOLD = 20;

export type ChoNeoRoomVoteOptionKey =
  | "show-off"
  | "owner-corner"
  | "nail-tech-corner"
  | "waterfront";

export type ChoNeoRoomVoteOption = {
  description: string;
  englishTitle: string;
  href: string;
  key: ChoNeoRoomVoteOptionKey;
  order: number;
  title: string;
};

export type ChoNeoRoomVotePublicResult = {
  attentionLabel?: "Được quan tâm";
  key: ChoNeoRoomVoteOptionKey;
  percentage?: number;
  rank?: number;
  statusLabel?: "Đang lấy ý kiến";
};

export type ChoNeoRoomVotePresentation = {
  disclosure:
    | { state: "collecting"; label: "Đang lấy ý kiến" }
    | { state: "public"; totalVotes: number };
  options: ChoNeoRoomVoteOption[];
  pollKey: typeof CHO_NEO_ROOM_VOTE_POLL_KEY;
  results: ChoNeoRoomVotePublicResult[];
  selection: {
    optionKey: ChoNeoRoomVoteOptionKey;
    optionalReason: string;
    title: string;
  } | null;
  statement: [string, string];
};

export type ChoNeoRoomVoteRow = {
  option_key: ChoNeoRoomVoteOptionKey;
};

export type ChoNeoRoomVoteSelectionRow = {
  option_key: ChoNeoRoomVoteOptionKey;
  optional_reason: string | null;
};

export const CHO_NEO_ROOM_VOTE_OPTIONS: ChoNeoRoomVoteOption[] = [
  {
    key: "show-off",
    order: 1,
    title: "Khoe Sắc Đẹp",
    englishTitle: "Show-Off Gallery",
    description:
      "Khoe tác phẩm, mẫu mới và những bàn tay làm nghề đáng tự hào.",
    href: "/cho-neo/show-off",
  },
  {
    key: "owner-corner",
    order: 2,
    title: "Góc Chủ Tiệm",
    englishTitle: "Owner Corner",
    description:
      "Chuyện nhân sự, khách hàng, giá cả và cách giữ tiệm vận hành tốt.",
    href: "/cho-neo/owner-corner",
  },
  {
    key: "nail-tech-corner",
    order: 3,
    title: "Góc Thợ Nail",
    englishTitle: "Nail Tech Corner",
    description:
      "Chia sẻ kỹ thuật, dụng cụ, sản phẩm và kinh nghiệm làm nghề.",
    href: "/cho-neo/technique",
  },
  {
    key: "waterfront",
    order: 4,
    title: "Bến Nước",
    englishTitle: "Waterfront",
    description:
      "Một góc nhẹ hơn để kể chuyện đời, nghỉ ngơi và hiểu nhau ngoài công việc.",
    href: "/cho-neo/waterfront",
  },
];

export const CHO_NEO_ROOM_VOTE_STATEMENT: [string, string] = [
  "Phiếu bình chọn giúp Chợ Neo chọn hướng phát triển tiếp theo.",
  "Kết quả không phải cam kết mở phòng ngay.",
];

export function isChoNeoRoomVoteOptionKey(
  value: unknown,
): value is ChoNeoRoomVoteOptionKey {
  return (
    typeof value === "string" &&
    CHO_NEO_ROOM_VOTE_OPTIONS.some((option) => option.key === value)
  );
}

export function getChoNeoRoomVoteOption(key: ChoNeoRoomVoteOptionKey) {
  return CHO_NEO_ROOM_VOTE_OPTIONS.find((option) => option.key === key) ?? null;
}

export function sanitizeChoNeoRoomVoteReason(value: unknown) {
  if (typeof value !== "string") return "";

  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, CHO_NEO_ROOM_VOTE_REASON_MAX_LENGTH);
}

export function isChoNeoRoomVoteReasonUnsafe(value: string) {
  return (
    /<\/?[a-z][\s\S]*>/i.test(value) ||
    /\b(?:https?:\/\/|www\.)\S+/i.test(value) ||
    /\b(?:javascript:|data:text\/html|<script)\b/i.test(value)
  );
}

export function buildChoNeoRoomVotePresentation({
  rows,
  selection,
}: {
  rows: ChoNeoRoomVoteRow[];
  selection: ChoNeoRoomVoteSelectionRow | null;
}): ChoNeoRoomVotePresentation {
  const totals = new Map<ChoNeoRoomVoteOptionKey, number>();

  for (const option of CHO_NEO_ROOM_VOTE_OPTIONS) {
    totals.set(option.key, 0);
  }

  for (const row of rows) {
    if (!isChoNeoRoomVoteOptionKey(row.option_key)) continue;
    totals.set(row.option_key, (totals.get(row.option_key) ?? 0) + 1);
  }

  const totalVotes = Array.from(totals.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  const rankedKeys = [...CHO_NEO_ROOM_VOTE_OPTIONS]
    .sort((first, second) => {
      const voteDelta =
        (totals.get(second.key) ?? 0) - (totals.get(first.key) ?? 0);
      return voteDelta || first.order - second.order;
    })
    .map((option) => option.key);

  const disclosure =
    totalVotes >= CHO_NEO_ROOM_VOTE_PUBLIC_RESULTS_THRESHOLD
      ? ({ state: "public", totalVotes } as const)
      : ({ state: "collecting", label: "Đang lấy ý kiến" } as const);

  return {
    disclosure,
    options: CHO_NEO_ROOM_VOTE_OPTIONS,
    pollKey: CHO_NEO_ROOM_VOTE_POLL_KEY,
    results: CHO_NEO_ROOM_VOTE_OPTIONS.map((option) => {
      if (disclosure.state === "collecting") {
        return {
          key: option.key,
          statusLabel: disclosure.label,
        };
      }

      const rank = rankedKeys.indexOf(option.key) + 1;
      const count = totals.get(option.key) ?? 0;
      const result: ChoNeoRoomVotePublicResult = {
        key: option.key,
        percentage: Math.round((count / totalVotes) * 100),
        rank,
      };

      if (totalVotes >= CHO_NEO_ROOM_VOTE_ATTENTION_THRESHOLD && rank === 1) {
        result.attentionLabel = "Được quan tâm";
      }

      return result;
    }),
    selection:
      selection && isChoNeoRoomVoteOptionKey(selection.option_key)
        ? {
            optionKey: selection.option_key,
            optionalReason: selection.optional_reason ?? "",
            title: getChoNeoRoomVoteOption(selection.option_key)?.title ?? "",
          }
        : null,
    statement: CHO_NEO_ROOM_VOTE_STATEMENT,
  };
}
