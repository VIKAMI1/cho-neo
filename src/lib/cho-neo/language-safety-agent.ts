import "server-only";

type LanguageSafetyAction = "allow" | "warn" | "block";

export type LanguageSafetyDecision = {
  action: LanguageSafetyAction;
  degraded: boolean;
  score: number;
  severity: "medium" | "high" | "critical";
  signalCodes: string[];
  userMessage?: string;
};

type ModerationResult = {
  flagged?: unknown;
  categories?: Record<string, unknown>;
};

const hardPatterns: Array<{ code: string; pattern: RegExp }> = [
  { code: "threat", pattern: /(?:giết|đánh chết|đâm|bắn|doạ|đe dọa|kill you|hurt you|i will find you)/iu },
  { code: "doxxing", pattern: /(?:địa chỉ nhà|home address|số căn cước|social security|passport number|mật khẩu|password)/iu },
  { code: "sexual-coercion", pattern: /(?:gửi ảnh nóng|gửi ảnh nude|send nudes|show me your body|sex video)/iu },
];

const cautionPatterns: Array<{ code: string; pattern: RegExp }> = [
  { code: "money-request", pattern: /(?:chuyển tiền|cho mượn tiền|send money|gift card|crypto investment)/iu },
  { code: "contact-pressure", pattern: /(?:trả lời ngay|đừng block|don't block me|you owe me|give me your number now)/iu },
];

const blockedModerationCategories = new Set([
  "harassment/threatening",
  "hate/threatening",
  "violence",
  "violence/graphic",
  "sexual/minors",
  "self-harm/intent",
  "self-harm/instructions",
  "illicit/violent",
]);

const cautionModerationCategories = new Set([
  "harassment",
  "hate",
  "sexual",
  "illicit",
]);

function localLanguageCheck(text: string): LanguageSafetyDecision {
  const hardSignals = hardPatterns.filter(({ pattern }) => pattern.test(text)).map(({ code }) => code);
  if (hardSignals.length > 0) {
    return {
      action: "block",
      degraded: false,
      score: 98,
      severity: "critical",
      signalCodes: hardSignals,
      userMessage: "Tin nhắn này không thể gửi vì có nội dung đe dọa hoặc không an toàn.",
    };
  }

  const cautionSignals = cautionPatterns.filter(({ pattern }) => pattern.test(text)).map(({ code }) => code);
  if (cautionSignals.length > 0) {
    return {
      action: "warn",
      degraded: false,
      score: 72,
      severity: "medium",
      signalCodes: cautionSignals,
      userMessage: "Hãy viết lại tin nhắn theo cách tôn trọng và không gây áp lực nha.",
    };
  }

  return {
    action: "allow",
    degraded: false,
    score: 0,
    severity: "medium",
    signalCodes: [],
  };
}

function categoryIsTrue(categories: Record<string, unknown> | undefined, category: string) {
  return categories?.[category] === true;
}

export async function runLanguageSafetyAgent(text: string): Promise<LanguageSafetyDecision> {
  const local = localLanguageCheck(text);
  if (local.action === "block") return local;

  const aiEnabled = process.env.CHO_NEO_SAFETY_AI_ENABLED === "true";
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!aiEnabled || !apiKey) return local;

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: text,
        model: "omni-moderation-latest",
      }),
      signal: AbortSignal.timeout(2_500),
    });

    if (!response.ok) {
      return { ...local, degraded: true };
    }

    const payload = await response.json().catch(() => null) as { results?: ModerationResult[] } | null;
    const result = payload?.results?.[0];
    const categories = result?.categories;
    const blockedSignals = [...blockedModerationCategories].filter((category) => categoryIsTrue(categories, category));
    if (blockedSignals.length > 0) {
      return {
        action: "block",
        degraded: false,
        score: 96,
        severity: "critical",
        signalCodes: blockedSignals,
        userMessage: "Tin nhắn này không thể gửi vì có nội dung đe dọa hoặc không an toàn.",
      };
    }

    const cautionSignals = [...cautionModerationCategories].filter((category) => categoryIsTrue(categories, category));
    if (result?.flagged === true || cautionSignals.length > 0) {
      return {
        action: "warn",
        degraded: false,
        score: 78,
        severity: "high",
        signalCodes: cautionSignals.length > 0 ? cautionSignals : ["moderation-review"],
        userMessage: "Hãy viết lại tin nhắn theo cách tôn trọng và không gây áp lực nha.",
      };
    }

    return local;
  } catch {
    // A provider outage must not make Chợ Neo unusable. Local hard rules
    // remain active and the degraded flag is recorded without message text.
    return { ...local, degraded: true };
  }
}
