import { getChoNeoTextSafetyError } from "./text-safety";

export const CHO_NEO_MEO_VAT_TABLE = "cho_neo_meo_vat_tips";
export const CHO_NEO_MEO_VAT_REPORT_TABLE = "cho_neo_meo_vat_reports";
export const CHO_NEO_MEO_VAT_TITLE_MAX_LENGTH = 100;
export const CHO_NEO_MEO_VAT_BODY_MAX_LENGTH = 3000;

export const CHO_NEO_MEO_VAT_CATEGORIES = [
  { id: "nail_tips", label: "Nail Tips" },
  { id: "salon_business", label: "Salon Business" },
  { id: "products", label: "Products" },
  { id: "vietnamese_life", label: "Vietnamese Life" },
] as const;

export type ChoNeoMeoVatCategory = (typeof CHO_NEO_MEO_VAT_CATEGORIES)[number]["id"];
export type ChoNeoMeoVatStatus = "pending_review" | "published" | "rejected" | "hidden";
export type ChoNeoMeoVatReportReason = "inappropriate" | "spam" | "unsafe" | "other";

export type ChoNeoMeoVatTip = {
  authorName: string;
  body: string;
  category: ChoNeoMeoVatCategory;
  createdAt: string;
  id: string;
  isOwner?: boolean;
  status?: ChoNeoMeoVatStatus;
  title: string;
  updatedAt?: string;
};

export function isChoNeoMeoVatCategory(value: unknown): value is ChoNeoMeoVatCategory {
  return typeof value === "string" && CHO_NEO_MEO_VAT_CATEGORIES.some((category) => category.id === value);
}

export function normalizeChoNeoMeoVatText(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFC").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
    : "";
}

export function getChoNeoMeoVatTextError(value: unknown, maxLength: number, label: string) {
  const text = normalizeChoNeoMeoVatText(value);
  if (!text) return `Viết ${label} trước khi gửi nha.`;
  if (text.length > maxLength) return `${label} tối đa ${maxLength} ký tự.`;
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f<>]/.test(text)) return `${label} có ký tự chưa dùng được.`;
  if (getChoNeoTextSafetyError(text)) return `${label} chưa phù hợp để đăng công khai nha.`;
  return null;
}

export function canEditChoNeoMeoVatTip(userId: string | null | undefined, tip: { authorUserId: string }) {
  return Boolean(userId && userId === tip.authorUserId);
}

export function canReportChoNeoMeoVatTip(
  userId: string | null | undefined,
  tip: { authorUserId: string; status: string },
) {
  return Boolean(userId && tip.status === "published" && userId !== tip.authorUserId);
}

export function filterChoNeoMeoVatFeed<T extends ChoNeoMeoVatTip>(
  tips: T[],
  category: ChoNeoMeoVatCategory | "all" = "all",
  search = "",
  includeUnpublished = false,
) {
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  return tips
    .filter((tip) => includeUnpublished || tip.status === undefined || tip.status === "published")
    .filter((tip) => category === "all" || tip.category === category)
    .filter((tip) => !normalizedSearch || `${tip.title}\n${tip.body}\n${tip.authorName}`.toLocaleLowerCase("vi").includes(normalizedSearch))
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}
