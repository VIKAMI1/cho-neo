import { NextResponse } from "next/server";
import {
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

type OpenAIPrayerPayload = {
  category?: OngDiaWishCategory;
  severity?: OngDiaWishSeverity;
  sections?: Partial<Record<keyof OngDiaPrayerResponse, unknown>>;
};

type OngDiaPrayerSource =
  | "provider_openai"
  | "fallback_no_api_key"
  | "fallback_provider_non_ok"
  | "fallback_json_parse_error"
  | "fallback_validation_error"
  | "fallback_router_only";

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
  serious: boolean,
): OngDiaPrayerResponse {
  if (!value || typeof value !== "object") return fallback;
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

  return {
    loiOngDia: loiOngDia.slice(0, 260),
    ongNhacNhe: ongNhacNhe.slice(0, 260),
    viecNhoHomNay: viecNhoHomNay.slice(0, 180),
    khiChuyenQuaNang: serious
      ? (khiChuyenQuaNang || fallback.khiChuyenQuaNang)?.slice(0, 220)
      : undefined,
  };
}

function getResponseText(payload: OpenAIResponsePayload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim();
}

function createPrayerJson(result: OngDiaPrayerResponse, source: OngDiaPrayerSource) {
  if (source !== "provider_openai") {
    console.warn("[ong-dia-prayer] Using fallback response", { source });
  }
  return NextResponse.json({ result, source });
}

export async function POST(request: Request) {
  let body: PrayerRequest = {};

  try {
    body = (await request.json()) as PrayerRequest;
  } catch {
    return NextResponse.json(
      { error: "Bad request", result: createFallbackOngDiaPrayerResponse("") },
      { status: 400 },
    );
  }

  const prayer = cleanPrayerText(body.prayer);
  const ritual = cleanRitualText(body.ritual);
  const wishRoute = routeOngDiaWish(prayer);
  const serious = wishRoute.severity === "high";
  const fallback = createFallbackOngDiaPrayerResponse(prayer);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return createPrayerJson(fallback, "fallback_no_api_key");
  }

  try {
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
            content:
              "You are writing for the Chợ Neo Ông Địa shrine. First respect the hidden category/severity route provided by the app, then write the visible response. Do not expose category, severity, router, policy, model, or AI to the user. The final voice must sound like a warm Vietnamese shrine elder with grounded folk wisdom, not ChatGPT. You are not an AI assistant, chatbot, fortune teller, therapist, lawyer, doctor, or financial advisor. You are not predicting the future. You are not promising luck. You are giving a culturally warm, spiritually styled, emotionally intelligent response to the user's wish. Balance around 70% directly relevant to the wish, 20% linh thiêng/spiritual warmth, and 10% practical next step. Vietnamese-first. Short lines. Slightly poetic but easy to understand. No corporate language, no clinical therapy language, no long lectures. Avoid phrases like 'Dựa trên thông tin bạn cung cấp', 'Tôi hiểu rằng', 'Bạn đang trải qua', 'Cảm xúc của bạn là hợp lệ', 'Điều quan trọng là', 'Hãy cân nhắc', 'Trong trường hợp này', and 'Tôi khuyên bạn nên'. Do not predict outcomes, promise money, healing, legal results, relationship outcomes, guaranteed future events, karma blame, fate claims, or scary fortune. For self_harm, medical_emergency, abuse_threat_unsafe, legal_trouble, and gambling, be warm and direct about safety. Return only JSON matching the schema.",
          },
          {
            role: "user",
            content: JSON.stringify({
              prayer: prayer || "Xin vía nhẹ",
              ritual: ritual || "Xin vía nhẹ",
              category: wishRoute.category,
              severity: wishRoute.severity,
              serious,
              format: {
                loiOngDia:
                  "1-2 short Vietnamese sentences. Most spiritual/folk-wisdom. Clearly reflect the user's wish. Good phrases: 'Ông nghe lòng con đang nặng', 'Giữ vía bình lại trước đã', 'Lộc không chỉ là tiền vô, lộc còn là tránh mất thêm', 'Đi chậm một nhịp để khỏi bước lộn đường'.",
                ongNhacNhe:
                  "1-2 short plain Vietnamese sentences in Ông Địa elder voice. Explain the issue gently. No outside narrator. No assistant tone.",
                viecNhoHomNay:
                  "1 concrete safe practical action the user can take today. No lecture.",
                khiChuyenQuaNang:
                  "Only if severity is high: 1 gentle natural Vietnamese sentence. Example: 'Nếu con thấy không an toàn, nói với người thân đáng tin hoặc tìm chỗ hỗ trợ gần mình ngay.' For self_harm or medical emergencies, encourage immediate local emergency/support help.",
              },
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "ong_dia_prayer_response",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                category: {
                  type: "string",
                  enum: [
                    "vague_blessing",
                    "shop_business",
                    "money_debt",
                    "gambling",
                    "family_relationship",
                    "burnout_stress",
                    "grief_loss",
                    "abuse_threat_unsafe",
                    "self_harm",
                    "medical_emergency",
                    "legal_trouble",
                    "sexual_inappropriate",
                    "curse_harm_request",
                    "trolling_spam_nonsense",
                    "unknown",
                  ],
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
            },
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
      return createPrayerJson(fallback, "fallback_provider_non_ok");
    }

    const payload = (await response.json()) as OpenAIResponsePayload;
    const text = getResponseText(payload);
    if (!text) {
      return createPrayerJson(fallback, "fallback_validation_error");
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      return createPrayerJson(fallback, "fallback_json_parse_error");
    }

    const result = normalizePrayerResponse(parsed, fallback, serious);
    if (result === fallback) {
      return createPrayerJson(fallback, "fallback_validation_error");
    }
    return createPrayerJson(result, "provider_openai");
  } catch (error) {
    console.warn("[ong-dia-prayer] Provider request failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return createPrayerJson(fallback, "fallback_provider_non_ok");
  }
}
