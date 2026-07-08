import { NextResponse } from "next/server";
import {
  applySafetyOverride,
  createFallbackOngDiaPrayerResponse,
  routeOngDiaWish,
  type OngDiaWishCategory,
  type OngDiaWishSeverity,
  type OngDiaPrayerResponse,
} from "@/lib/cho-neo/ong-dia-prayer";

const MAX_PRAYER_LENGTH = 320;

type PrayerRequest = {
  prayer?: string;
  ritual?: string;
};

type OpenAIResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
};

type ChatCompletionResponsePayload = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

type OpenAIPrayerPayload = {
  category?: OngDiaWishCategory;
  severity?: OngDiaWishSeverity;
  sections?: Partial<Record<keyof OngDiaPrayerResponse, unknown>>;
};

type OngDiaAiProvider = "fallback" | "openai" | "groq" | "deepseek" | "glm";

type OngDiaPrayerSource =
  | "provider_openai"
  | "provider_groq"
  | "provider_deepseek"
  | "provider_glm"
  | "fallback_no_api_key"
  | "fallback_provider_non_ok"
  | "fallback_json_parse_error"
  | "fallback_validation_error"
  | "fallback_router_only";

const ONG_DIA_AI_PROVIDERS = new Set<OngDiaAiProvider>([
  "fallback",
  "openai",
  "groq",
  "deepseek",
  "glm",
]);

const CHAT_PROVIDER_CONFIG: Record<
  Exclude<OngDiaAiProvider, "fallback" | "openai">,
  {
    apiKeyEnv: string;
    endpoint: string;
    modelEnv: string;
    defaultModel: string;
    source: Extract<
      OngDiaPrayerSource,
      "provider_groq" | "provider_deepseek" | "provider_glm"
    >;
  }
> = {
  groq: {
    apiKeyEnv: "GROQ_API_KEY",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.1-8b-instant",
    source: "provider_groq",
  },
  deepseek: {
    apiKeyEnv: "DEEPSEEK_API_KEY",
    endpoint: "https://api.deepseek.com/chat/completions",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    source: "provider_deepseek",
  },
  glm: {
    apiKeyEnv: "GLM_API_KEY",
    endpoint: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    modelEnv: "GLM_MODEL",
    defaultModel: "glm-4-flash",
    source: "provider_glm",
  },
};

const ONG_DIA_CATEGORY_ENUM: OngDiaWishCategory[] = [
  "vague_blessing",
  "shop_business",
  "money_debt",
  "gambling",
  "gambling_debt",
  "family_relationship",
  "burnout_stress",
  "severe_burnout_despair",
  "grief_loss",
  "abuse_threat_unsafe",
  "domestic_violence",
  "coercion_blackmail",
  "child_elder_safety",
  "sexual_exploitation",
  "self_harm",
  "medical_emergency",
  "legal_trouble",
  "legal_danger",
  "severe_debt_crisis",
  "substance_addiction",
  "delusional_paranoid_fear",
  "guaranteed_spiritual_answer",
  "sexual_inappropriate",
  "curse_harm_request",
  "trolling_spam_nonsense",
  "unknown",
];

const ONG_DIA_SYSTEM_PROMPT =
  "You are writing for the Chợ Neo Ông Địa shrine. First respect the hidden category/severity route provided by the app, then write the visible response. Do not expose category, severity, router, policy, model, or AI to the user. The final voice must sound like a warm Vietnamese shrine elder with grounded folk wisdom, not ChatGPT. You are not an AI assistant, chatbot, fortune teller, therapist, lawyer, doctor, or financial advisor. You are not predicting the future. You are not promising luck. You are giving a culturally warm, spiritually styled, emotionally intelligent response to the user's wish. Balance around 70% directly relevant to the wish, 20% linh thiêng/spiritual warmth, and 10% practical next step. Vietnamese-first. Short lines. Slightly poetic but easy to understand. No corporate language, no clinical therapy language, no long lectures. Avoid phrases like 'Dựa trên thông tin bạn cung cấp', 'Tôi hiểu rằng', 'Bạn đang trải qua', 'Cảm xúc của bạn là hợp lệ', 'Điều quan trọng là', 'Hãy cân nhắc', 'Trong trường hợp này', and 'Tôi khuyên bạn nên'. Do not predict outcomes, promise money, healing, legal results, relationship outcomes, guaranteed future events, karma blame, fate claims, or scary fortune. For self_harm, medical_emergency, abuse_threat_unsafe, legal_trouble, gambling_debt, coercion_blackmail, domestic_violence, sexual_exploitation, child_elder_safety, and severe_debt_crisis, be warm and direct about safety. Return only JSON matching the schema.";

function cleanPrayerText(value: unknown) {
  return typeof value === "string"
    ? value.trim().slice(0, MAX_PRAYER_LENGTH)
    : "";
}

function cleanRitualText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function normalizePrayerResponse(
  value: unknown,
  fallback: OngDiaPrayerResponse,
  route: { category: OngDiaWishCategory; severity: OngDiaWishSeverity },
): OngDiaPrayerResponse {
  if (!value || typeof value !== "object") return fallback;
  const serious = route.severity === "high";
  const record = value as OpenAIPrayerPayload;
  const sections = record.sections ?? {};
  const loiOngDia =
    typeof sections.loiOngDia === "string" ? sections.loiOngDia.trim() : "";
  const ongNhacNhe =
    typeof sections.ongNhacNhe === "string" ? sections.ongNhacNhe.trim() : "";
  const viecNhoHomNay =
    typeof sections.viecNhoHomNay === "string"
      ? sections.viecNhoHomNay.trim()
      : "";
  const khiChuyenQuaNang =
    typeof sections.khiChuyenQuaNang === "string"
      ? sections.khiChuyenQuaNang.trim()
      : "";

  if (!loiOngDia || !ongNhacNhe || !viecNhoHomNay) return fallback;

  return applySafetyOverride({
    loiOngDia: loiOngDia.slice(0, 260),
    ongNhacNhe: ongNhacNhe.slice(0, 260),
    viecNhoHomNay: viecNhoHomNay.slice(0, 180),
    khiChuyenQuaNang: serious
      ? (khiChuyenQuaNang || fallback.khiChuyenQuaNang)?.slice(0, 220)
      : undefined,
  }, route);
}

function getResponseText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
}

function getChatResponseText(payload: ChatCompletionResponsePayload) {
  return payload.choices
    ?.map((choice) => choice.message?.content ?? "")
    .join("")
    .trim();
}

function getOngDiaAiProvider(): OngDiaAiProvider {
  const requestedProvider = process.env.ONG_DIA_AI_PROVIDER?.trim().toLowerCase();
  if (!requestedProvider) return "fallback";
  if (ONG_DIA_AI_PROVIDERS.has(requestedProvider as OngDiaAiProvider)) {
    return requestedProvider as OngDiaAiProvider;
  }
  console.warn("[ong-dia-prayer] Unknown provider requested; using fallback", {
    provider: requestedProvider,
  });
  return "fallback";
}

function createPrayerJson(
  result: OngDiaPrayerResponse,
  source: OngDiaPrayerSource,
  provider: OngDiaAiProvider,
) {
  const diagnostics = { provider, source };
  if (source.startsWith("provider_")) {
    console.info("[ong-dia-prayer] Using provider response", diagnostics);
  } else {
    console.warn("[ong-dia-prayer] Using fallback response", diagnostics);
  }
  return NextResponse.json({ result });
}

function createProviderInput(
  prayer: string,
  ritual: string,
  wishRoute: { category: OngDiaWishCategory; severity: OngDiaWishSeverity },
) {
  return {
    prayer: prayer || "Xin vía nhẹ",
    ritual: ritual || "Xin vía nhẹ",
    category: wishRoute.category,
    severity: wishRoute.severity,
    serious: wishRoute.severity === "high",
    format: {
      loiOngDia:
        "1-2 short Vietnamese sentences. Most spiritual/folk-wisdom. Clearly reflect the user's wish. Good phrases: 'Ông nghe lòng con đang nặng', 'Giữ vía bình lại trước đã', 'Lộc không chỉ là tiền vô, lộc còn là tránh mất thêm', 'Đi chậm một nhịp để khỏi bước lộn đường'.",
      ongNhacNhe:
        "1-2 short plain Vietnamese sentences in Ông Địa elder voice. Explain the issue gently. No outside narrator. No assistant tone.",
      viecNhoHomNay:
        "1 concrete safe practical action the user can take today. No lecture.",
      khiChuyenQuaNang:
        "Only if severity is high: 1 gentle natural Vietnamese sentence. For self_harm, medical emergencies, abuse, coercion, exploitation, domestic violence, child/elder safety, and debt/gambling danger, encourage immediate trusted/local support. The server may replace this line deterministically.",
    },
  };
}

function createJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      category: {
        type: "string",
        enum: ONG_DIA_CATEGORY_ENUM,
      },
      severity: {
        type: "string",
        enum: ["low", "medium", "high"],
      },
      sections: {
        type: "object",
        additionalProperties: false,
        properties: {
          loiOngDia: { type: "string" },
          ongNhacNhe: { type: "string" },
          viecNhoHomNay: { type: "string" },
          khiChuyenQuaNang: { type: ["string", "null"] },
        },
        required: [
          "loiOngDia",
          "ongNhacNhe",
          "viecNhoHomNay",
          "khiChuyenQuaNang",
        ],
      },
    },
    required: ["category", "severity", "sections"],
  };
}

async function requestOpenAIResponse(
  apiKey: string,
  providerInput: ReturnType<typeof createProviderInput>,
) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content: ONG_DIA_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: JSON.stringify(providerInput),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "ong_dia_prayer_response",
          strict: true,
          schema: createJsonSchema(),
        },
      },
      max_output_tokens: 420,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("[ong-dia-prayer] OpenAI provider returned non-OK", {
      status: response.status,
    });
    return null;
  }

  const payload = (await response.json()) as OpenAIResponsePayload;
  return getResponseText(payload);
}

async function requestChatProviderResponse(
  provider: Exclude<OngDiaAiProvider, "fallback" | "openai">,
  apiKey: string,
  providerInput: ReturnType<typeof createProviderInput>,
) {
  const config = CHAT_PROVIDER_CONFIG[provider];
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env[config.modelEnv] ?? config.defaultModel,
      messages: [
        {
          role: "system",
          content: `${ONG_DIA_SYSTEM_PROMPT} Return a JSON object with category, severity, and sections. Do not wrap it in Markdown.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            ...providerInput,
            schema: createJsonSchema(),
          }),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.45,
      max_tokens: 420,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("[ong-dia-prayer] Chat provider returned non-OK", {
      provider,
      status: response.status,
    });
    return null;
  }

  const payload = (await response.json()) as ChatCompletionResponsePayload;
  return getChatResponseText(payload);
}

export async function POST(request: Request) {
  let body: PrayerRequest = {};

  try {
    body = (await request.json()) as PrayerRequest;
  } catch {
    return NextResponse.json(
      { result: createFallbackOngDiaPrayerResponse("") },
      { status: 400 },
    );
  }

  const prayer = cleanPrayerText(body.prayer);
  const ritual = cleanRitualText(body.ritual);
  const wishRoute = routeOngDiaWish(prayer);
  const fallback = createFallbackOngDiaPrayerResponse(prayer);
  const provider = getOngDiaAiProvider();
  const providerInput = createProviderInput(prayer, ritual, wishRoute);

  if (provider === "fallback") {
    return createPrayerJson(fallback, "fallback_router_only", provider);
  }

  try {
    let text: string | undefined | null;
    let source: Extract<
      OngDiaPrayerSource,
      "provider_openai" | "provider_groq" | "provider_deepseek" | "provider_glm"
    >;

    if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return createPrayerJson(fallback, "fallback_no_api_key", provider);
      }
      text = await requestOpenAIResponse(apiKey, providerInput);
      source = "provider_openai";
    } else {
      const config = CHAT_PROVIDER_CONFIG[provider];
      const apiKey = process.env[config.apiKeyEnv];
      if (!apiKey) {
        return createPrayerJson(fallback, "fallback_no_api_key", provider);
      }
      text = await requestChatProviderResponse(provider, apiKey, providerInput);
      source = config.source;
    }

    if (!text) {
      return createPrayerJson(fallback, "fallback_provider_non_ok", provider);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return createPrayerJson(fallback, "fallback_json_parse_error", provider);
    }

    const result = normalizePrayerResponse(parsed, fallback, wishRoute);
    if (result === fallback) {
      return createPrayerJson(fallback, "fallback_validation_error", provider);
    }
    return createPrayerJson(result, source, provider);
  } catch (error) {
    console.warn("[ong-dia-prayer] Provider request failed", {
      provider,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return createPrayerJson(fallback, "fallback_provider_non_ok", provider);
  }
}
