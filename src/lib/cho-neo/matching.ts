export const CHO_NEO_MATCHING_CONSENT_VERSION = "cho-neo-matching-consent-v1";
export const CHO_NEO_MATCHING_PROFILE_TABLE = "cho_neo_matching_profiles";
export const CHO_NEO_INTRODUCTION_TABLE = "cho_neo_introductions";
export const CHO_NEO_MATCHING_BLOCK_TABLE = "cho_neo_matching_blocks";
export const CHO_NEO_MATCHING_REPORT_TABLE = "cho_neo_matching_reports";

export const CHO_NEO_MATCHING_SITUATIONS = [
  "Mới vào nghề",
  "Đang làm thợ",
  "Đang làm chủ tiệm",
  "Đang chuyển tiệm hoặc thành phố",
  "Đang học thêm kỹ thuật",
] as const;

export const CHO_NEO_MATCHING_REPORT_REASONS = [
  "sales",
  "recruiting",
  "harassment",
  "unsafe",
  "other",
] as const;

export type MatchingReportReason =
  (typeof CHO_NEO_MATCHING_REPORT_REASONS)[number];

export function cleanMatchingText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function validateMatchingProfile(input: Record<string, unknown>) {
  const city = cleanMatchingText(input.city, 60);
  const situation = cleanMatchingText(input.situation, 80);
  const lookingFor = cleanMatchingText(input.lookingFor, 240);
  const canShare = cleanMatchingText(input.canShare, 240);

  if (city.length < 2) return { error: "Cho Chợ Neo biết thành phố của bạn nha." } as const;
  if (!CHO_NEO_MATCHING_SITUATIONS.includes(situation as never)) {
    return { error: "Chọn hoàn cảnh gần với bạn nhất nha." } as const;
  }
  if (lookingFor.length < 2) return { error: "Bạn đang cần một người bạn để nói chuyện gì?" } as const;
  if (canShare.length < 2) return { error: "Bạn có thể chia sẻ điều gì với người kia?" } as const;

  return { canShare, city, lookingFor, situation } as const;
}

export function isMatchingReportReason(value: unknown): value is MatchingReportReason {
  return typeof value === "string" && CHO_NEO_MATCHING_REPORT_REASONS.includes(value as MatchingReportReason);
}
