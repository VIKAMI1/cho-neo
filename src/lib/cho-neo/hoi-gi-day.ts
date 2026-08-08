import { getChoNeoTextSafetyError } from "./text-safety";

export const HOI_GI_DAY_QUESTION_MAX_LENGTH = 320;
export const HOI_GI_DAY_CONTRIBUTION_MAX_LENGTH = 420;
export const HOI_GI_DAY_FALLBACK =
  "NeoPao đang nghỉ một nhịp. Câu hỏi của bạn vẫn được giữ để người trong Chợ góp ý.";
export const HOI_CHO_NEO_CANONICAL_ROUTE = "/cho-neo/hoi-cho-neo";
export const HOI_CHO_NEO_LEGACY_ROUTE = "/cho-neo/hoi-gi-day";

export const HOI_GI_DAY_TOPICS = [
  "nail_technique",
  "salon_operations",
  "customer_service",
  "nail_products",
  "workplace_experience",
  "general",
] as const;

export type HoiGiDayTopic = (typeof HOI_GI_DAY_TOPICS)[number];
export type HoiGiDayDestination = "neopao" | "community";
export type HoiGiDayFeedbackType = "correct" | "addition" | "correction";
export type HoiGiDayReviewStatus = "pending_review" | "approved" | "rejected";

export type HoiChoNeoContinuation = {
  href: "/cho-neo/technique" | "/cho-neo/owner-corner" | "/cho-neo/gossip";
  label: "Góc Thợ Nail" | "Góc Chủ Tiệm" | "Quán Tám";
};

export function isHoiGiDayDestination(value: unknown): value is HoiGiDayDestination {
  return value === "neopao" || value === "community";
}

export function isHoiGiDayFeedbackType(value: unknown): value is HoiGiDayFeedbackType {
  return value === "correct" || value === "addition" || value === "correction";
}

export function isHoiGiDayTopic(value: unknown): value is HoiGiDayTopic {
  return typeof value === "string" && HOI_GI_DAY_TOPICS.includes(value as HoiGiDayTopic);
}

export function normalizeHoiGiDayText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFC").replace(/[ \t\r\n]+/g, " ").trim()
    : "";
}

export function getHoiGiDayTextError(value: unknown, maxLength: number) {
  const text = normalizeHoiGiDayText(value);

  if (!text) return "Viết một câu hỏi ngắn trước khi gửi nha.";
  if (text.length > maxLength) return `Câu hỏi tối đa ${maxLength} ký tự.`;
  if (/[\u0000-\u001f\u007f]/.test(text)) return "Câu hỏi có ký tự chưa dùng được.";
  if (/[<>]/.test(text)) return "Giữ câu hỏi ở dạng chữ thường, không HTML nha.";
  const safetyError = getChoNeoTextSafetyError(text);
  if (safetyError === "disallowed-url") {
    return "Đừng để link hay thông tin cá nhân trong câu hỏi nha.";
  }
  if (safetyError) return "Câu hỏi này chưa phù hợp để đăng công khai nha.";

  return null;
}

export function isPublishedHoiGiDayStatus(value: unknown) {
  return value === "published";
}

export function getHoiChoNeoContinuation(topic: HoiGiDayTopic): HoiChoNeoContinuation | null {
  if (topic === "nail_technique" || topic === "nail_products") {
    return { href: "/cho-neo/technique", label: "Góc Thợ Nail" };
  }
  if (topic === "salon_operations" || topic === "workplace_experience") {
    return { href: "/cho-neo/owner-corner", label: "Góc Chủ Tiệm" };
  }
  if (topic === "customer_service" || topic === "general") {
    return { href: "/cho-neo/gossip", label: "Quán Tám" };
  }
  return null;
}
