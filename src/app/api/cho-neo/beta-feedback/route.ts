import { appendFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type BetaPayload = {
  kind?: "feedback" | "event";
  eventName?: string;
  timestamp?: string;
  path?: string;
  room?: string;
  deviceType?: string;
  anonymousSessionId?: string;
  selectedVillageMood?: string;
  details?: Record<string, unknown>;
  answers?: Record<string, unknown>;
  comments?: Record<string, string>;
  contact?: string;
  musicIncluded?: boolean;
};

const MAX_BODY_BYTES = 32_000;

export async function POST(request: Request) {
  const bodyText = await request.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Feedback is too large." },
      { status: 413 }
    );
  }

  let payload: BetaPayload;
  try {
    payload = JSON.parse(bodyText) as BetaPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid feedback payload." },
      { status: 400 }
    );
  }

  const normalized = normalizePayload(payload, request);

  try {
    const supabaseStored = await storeWithSupabase(normalized);
    if (supabaseStored) {
      return NextResponse.json({ ok: true, stored: "supabase" });
    }
  } catch (error) {
    console.warn("[cho-neo:beta-feedback] Supabase storage failed", error);
  }

  try {
    await storeWithJsonl(normalized);
    return NextResponse.json({ ok: true, stored: "jsonl" });
  } catch (error) {
    console.error("[cho-neo:beta-feedback] JSONL storage failed", error);
    return NextResponse.json(
      { ok: false, error: "Feedback could not be stored." },
      { status: 500 }
    );
  }
}

function normalizePayload(payload: BetaPayload, request: Request) {
  const now = new Date().toISOString();
  const kind = payload.kind === "event" ? "event" : "feedback";
  const url = new URL(request.url);

  return {
    kind,
    event_name: cleanText(payload.eventName, 80),
    created_at: safeIso(payload.timestamp) ?? now,
    page_path: cleanText(payload.path, 240) || url.pathname,
    room: cleanText(payload.room, 80),
    device_type: cleanText(payload.deviceType, 40),
    anonymous_session_id: cleanText(payload.anonymousSessionId, 120),
    selected_village_mood: cleanText(payload.selectedVillageMood, 80),
    music_included: Boolean(payload.musicIncluded),
    payload: {
      answers: sanitizeRecord(payload.answers),
      comments: sanitizeRecord(payload.comments),
      contact: cleanText(payload.contact, 160),
      details: sanitizeRecord(payload.details),
      userAgent: cleanText(request.headers.get("user-agent"), 260),
    },
  };
}

async function storeWithSupabase(record: ReturnType<typeof normalizePayload>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return false;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const { error } = await supabase.from("cho_neo_feedback").insert(record);
  if (error) {
    console.warn("[cho-neo:beta-feedback] Supabase insert skipped", {
      code: error.code,
      message: error.message,
    });
    return false;
  }

  return true;
}

async function storeWithJsonl(record: ReturnType<typeof normalizePayload>) {
  const feedbackDir =
    process.env.CHO_NEO_FEEDBACK_DIR ?? path.join(tmpdir(), "cho-neo-beta");
  const feedbackPath = path.join(feedbackDir, "feedback-events.jsonl");
  await mkdir(feedbackDir, { recursive: true });
  await appendFile(feedbackPath, `${JSON.stringify(record)}\n`, "utf8");
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function safeIso(value: unknown) {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function sanitizeRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const next: Record<string, unknown> = {};
  for (const [key, recordValue] of Object.entries(value)) {
    const cleanKey = cleanText(key, 80);
    if (!cleanKey) continue;

    if (typeof recordValue === "string") {
      next[cleanKey] = cleanText(recordValue, 1200);
    } else if (
      typeof recordValue === "number" ||
      typeof recordValue === "boolean" ||
      recordValue === null
    ) {
      next[cleanKey] = recordValue;
    }
  }

  return next;
}
