const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const URL_LIKE_PATTERN =
  /\b(?:https?:\/\/|www\.|[\w.-]+\.(?:com|net|org|io|co|ca|vn)\b)/i;
const UNSAFE_TEXT_PATTERN =
  /\b(?:fuck|shit|bitch|cunt|dick|pussy|asshole|đụ|địt|lồn|cặc|buồi|bạo hành|bao hanh|bị đánh|bi danh|đe dọa|de doa|dọa đánh|doa danh|giết|giet|đánh chết|danh chet|threat|kill)\b/i;

function normalizeForSafety(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi");
}

export function getChoNeoTextSafetyError(value: unknown) {
  if (typeof value !== "string") return null;
  if (CONTROL_CHARACTER_PATTERN.test(value)) return "control-character";
  if (URL_LIKE_PATTERN.test(value)) return "disallowed-url";
  if (UNSAFE_TEXT_PATTERN.test(value) || UNSAFE_TEXT_PATTERN.test(normalizeForSafety(value))) {
    return "unsafe-language";
  }
  return null;
}
