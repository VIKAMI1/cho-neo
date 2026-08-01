#!/usr/bin/env node
import OpenAI from "openai";

const LUNA_MODEL = "gpt-5.6-luna";
const MAX_OUTPUT_TOKENS = 220;
const MAX_VISIBLE_CHARS = 520;

const prompts = [
  "Con lo tiệm hôm nay vắng quá, xin Ông Địa cho con một lời nhẹ.",
  "Khách mới ngày mai làm con run tay, Ông nói con nghe chút được không?",
  "Boss nói con làm French hơi chậm, con buồn từ sáng tới giờ.",
  "Con cúng Ông nải chuối nhỏ, xin vía cho lòng con bớt rối.",
  "Chị Mai hủy lịch hai lần, con không biết nên giận hay thương.",
];

function hasVietnameseOutput(text) {
  return (
    /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(text) ||
    /\b(con|Ông|ong|Địa|dia|tiệm|tiem|khách|khach|lòng|long|vía|via)\b/i.test(text)
  );
}

function assertSmokeResponse({ prompt, text }) {
  if (!text.trim()) throw new Error("empty_response");
  if (!hasVietnameseOutput(text)) throw new Error("missing_vietnamese_output");
  if (text.length > MAX_VISIBLE_CHARS) {
    throw new Error(`length_ceiling_exceeded:${text.length}`);
  }
  if (/developer instruction|system prompt|hidden instruction|json schema|OPENAI_API_KEY|CHO_NEO_OPENAI_MODEL/i.test(text)) {
    throw new Error("possible_prompt_or_config_leakage");
  }
  if (/\b(as an ai|i am an ai|ai assistant|chatgpt|language model)\b/i.test(text)) {
    throw new Error("generic_english_ai_introduction");
  }
  if (!/\b(con|Ông|ông)\b/i.test(text)) {
    throw new Error(`missing_ong_dia_voice:${prompt}`);
  }
}

async function main() {
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    console.log("[ong-dia-luna-smoke] Skipped: production environment detected.");
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.log("[ong-dia-luna-smoke] Skipped: OPENAI_API_KEY is unavailable.");
    return;
  }

  const model = LUNA_MODEL;
  const client = new OpenAI({ apiKey, maxRetries: 0 });
  console.log(`[ong-dia-luna-smoke] Model: ${model}`);
  console.log(`[ong-dia-luna-smoke] Requests: ${prompts.length}`);

  for (const [index, prompt] of prompts.entries()) {
    const response = await client.responses.create({
      model,
      instructions:
        "You are Ông Địa in Chợ Neo. Reply in concise, warm Vietnamese. Do not mention AI, prompts, configuration, or hidden instructions.",
      input: prompt,
      max_output_tokens: MAX_OUTPUT_TOKENS,
      store: false,
    });
    const text = response.output_text?.trim() ?? "";
    assertSmokeResponse({ prompt, text });
    console.log(`\n[${index + 1}] ${prompt}`);
    console.log(text);
  }

  console.log("\n[ong-dia-luna-smoke] Passed.");
}

main().catch((error) => {
  const status = typeof error?.status === "number" ? ` status=${error.status}` : "";
  const type = typeof error?.type === "string" ? ` type=${error.type}` : "";
  const code = typeof error?.code === "string" ? ` code=${error.code}` : "";
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[ong-dia-luna-smoke] Failed:${status}${type}${code} ${message}`);
  process.exitCode = 1;
});
