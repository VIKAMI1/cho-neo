export const CHO_NEO_MATCHING_CONSENT_VERSION = "cho-neo-matching-consent-v1";
export const CHO_NEO_MATCHING_PROFILE_TABLE = "cho_neo_matching_profiles";
export const CHO_NEO_INTRODUCTION_TABLE = "cho_neo_introductions";
export const CHO_NEO_MATCHING_BLOCK_TABLE = "cho_neo_matching_blocks";
export const CHO_NEO_MATCHING_REPORT_TABLE = "cho_neo_matching_reports";
export const CHO_NEO_CONTACT_HANDOFF_TABLE = "cho_neo_contact_handoffs";
export const CHO_NEO_PRIVATE_MESSAGE_TABLE = "cho_neo_private_messages";
export const CHO_NEO_TABLE_QUIET_DAYS = 7;
export const CHO_NEO_MESSAGE_MAX_LENGTH = 500;

export const CHO_NEO_MATCHING_SITUATIONS = [
  "Mới vào nghề",
  "Đang làm thợ",
  "Đang làm chủ tiệm",
  "Đang chuyển tiệm hoặc thành phố",
  "Đang học thêm kỹ thuật",
] as const;

export const CHO_NEO_MATCHING_EXPERIENCE_RANGES = [
  "Mới vào nghề",
  "1–3 năm",
  "4–7 năm",
  "8–12 năm",
  "13+ năm",
] as const;

export const CHO_NEO_MATCHING_AGE_RANGES = [
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55+",
] as const;

export const CHO_NEO_MATCHING_GENDERS = [
  "Nữ",
  "Nam",
  "Khác",
  "Không muốn nói",
] as const;

export const CHO_NEO_MATCHING_LANGUAGES = [
  "Việt",
  "English",
  "Vietlish",
  "Español",
  "Khác",
] as const;

export const CHO_NEO_CONTACT_METHODS = [
  "Facebook",
  "Messenger",
  "Instagram",
  "WhatsApp",
  "Khác",
] as const;

export const CHO_NEO_MATCHING_REPORT_REASONS = [
  "sales",
  "recruiting",
  "harassment",
  "unsafe",
  "other",
] as const;

export const CHO_NEO_DISCOVERY_SCOPES = ["nearby", "country", "worldwide"] as const;
export type ChoNeoDiscoveryScope = (typeof CHO_NEO_DISCOVERY_SCOPES)[number];

export type ChoNeoContactMethod = (typeof CHO_NEO_CONTACT_METHODS)[number];

export type MatchingReportReason =
  (typeof CHO_NEO_MATCHING_REPORT_REASONS)[number];

export function cleanMatchingText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.normalize("NFC").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function validateMatchingProfile(input: Record<string, unknown>) {
  const city = cleanMatchingText(input.city, 60);
  const country = cleanMatchingText(input.country, 80);
  const region = cleanMatchingText(input.region, 80);
  const discoveryScope = cleanMatchingText(input.discoveryScope, 20);
  const situation = cleanMatchingText(input.situation, 80);
  const experienceRange = cleanMatchingText(input.experienceRange, 20);
  const ageRange = cleanMatchingText(input.ageRange, 20);
  const gender = cleanMatchingText(input.gender, 30);
  const languages = Array.isArray(input.languages)
    ? [...new Set(input.languages.map((value) => cleanMatchingText(value, 20)).filter(Boolean))].slice(0, 4)
    : [];
  const lookingFor = cleanMatchingText(input.lookingFor, 240);
  const canShare = cleanMatchingText(input.canShare, 240);
  const interests = cleanMatchingText(input.interests, 240);
  const funLine = cleanMatchingText(input.funLine, 240);

  if (city.length < 2) return { error: "Cho Chợ Neo biết thành phố của bạn nha." } as const;
  if (country.length < 2) return { error: "Cho Chợ Neo biết quốc gia của bạn nha." } as const;
  if (region.length === 1) return { error: "Tên tỉnh, bang hoặc vùng cần ít nhất hai ký tự nha." } as const;
  if (!CHO_NEO_DISCOVERY_SCOPES.includes(discoveryScope as ChoNeoDiscoveryScope)) {
    return { error: "Chọn nơi bạn muốn khám phá bạn mới nha." } as const;
  }
  if (!CHO_NEO_MATCHING_SITUATIONS.includes(situation as never)) {
    return { error: "Chọn vai trò gần với bạn nhất nha." } as const;
  }
  if (!CHO_NEO_MATCHING_EXPERIENCE_RANGES.includes(experienceRange as never)) {
    return { error: "Chọn số năm kinh nghiệm gần nhất nha." } as const;
  }
  if (ageRange && !CHO_NEO_MATCHING_AGE_RANGES.includes(ageRange as never)) {
    return { error: "Độ tuổi chưa hợp lệ." } as const;
  }
  if (gender && !CHO_NEO_MATCHING_GENDERS.includes(gender as never)) {
    return { error: "Lựa chọn giới tính chưa hợp lệ." } as const;
  }
  if (languages.length === 0 || languages.some((value) => !CHO_NEO_MATCHING_LANGUAGES.includes(value as never))) {
    return { error: "Chọn ít nhất một ngôn ngữ bạn thường dùng nha." } as const;
  }
  if (lookingFor.length < 2) return { error: "Bạn đang cần một người bạn để nói chuyện gì?" } as const;
  if (canShare.length < 2) return { error: "Bạn có thể chia sẻ điều gì với người kia?" } as const;

  return { ageRange: ageRange || null, canShare, city, country, discoveryScope, experienceRange, funLine: funLine || null, gender: gender || null, interests: interests || null, languages, lookingFor, region, situation } as const;
}

export function isMatchingReportReason(value: unknown): value is MatchingReportReason {
  return typeof value === "string" && CHO_NEO_MATCHING_REPORT_REASONS.includes(value as MatchingReportReason);
}

export function validatePrivateMessage(value: unknown) {
  const body = cleanMatchingText(value, CHO_NEO_MESSAGE_MAX_LENGTH);
  if (!body) return { error: "Viết một lời nhắn trước nha." } as const;
  return { body } as const;
}
