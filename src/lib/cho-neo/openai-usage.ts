import type { SupabaseClient } from "@supabase/supabase-js";

export type OpenAIUsageClient = Pick<SupabaseClient, "rpc">;

export type OpenAIUsageReservation = {
  allowed: boolean;
  reason: string;
  reservation_id: string | null;
};

export type OpenAIUsageConfig = {
  monthlyRequestLimit: number;
  memberDailyRequestLimit: number;
  estimatedTokens: number;
  cooldownSeconds: number;
  monthlyTokenLimit: number;
};

const DEFAULT_MONTHLY_REQUEST_LIMIT = 300;
const DEFAULT_MEMBER_DAILY_REQUEST_LIMIT = 12;
const DEFAULT_ESTIMATED_TOKENS = 900;
const DEFAULT_COOLDOWN_SECONDS = 3;
const DEFAULT_MONTHLY_SPEND_CAP_USD = 5;
const DEFAULT_ESTIMATED_COST_PER_1K_TOKENS_USD = 0.002;
const inFlightReservations = new Set<string>();

function positiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function positiveNumberEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function getOpenAIUsageConfig(): OpenAIUsageConfig | null {
  const monthlyRequestLimit = positiveIntegerEnv(
    "CHO_NEO_OPENAI_MONTHLY_REQUEST_LIMIT",
    DEFAULT_MONTHLY_REQUEST_LIMIT,
  );
  const memberDailyRequestLimit = positiveIntegerEnv(
    "CHO_NEO_OPENAI_MEMBER_DAILY_REQUEST_LIMIT",
    DEFAULT_MEMBER_DAILY_REQUEST_LIMIT,
  );
  const estimatedTokens = positiveIntegerEnv(
    "CHO_NEO_OPENAI_ESTIMATED_TOKENS_PER_REQUEST",
    DEFAULT_ESTIMATED_TOKENS,
  );
  const cooldownSeconds = positiveIntegerEnv(
    "CHO_NEO_OPENAI_COOLDOWN_SECONDS",
    DEFAULT_COOLDOWN_SECONDS,
  );
  const spendCap = positiveNumberEnv(
    "CHO_NEO_OPENAI_MONTHLY_SPEND_CAP_USD",
    DEFAULT_MONTHLY_SPEND_CAP_USD,
  );
  const estimatedCostPerThousand = positiveNumberEnv(
    "CHO_NEO_OPENAI_ESTIMATED_COST_USD",
    DEFAULT_ESTIMATED_COST_PER_1K_TOKENS_USD,
  );

  if (
    monthlyRequestLimit === null ||
    memberDailyRequestLimit === null ||
    estimatedTokens === null ||
    cooldownSeconds === null ||
    spendCap === null ||
    estimatedCostPerThousand === null
  ) {
    return null;
  }

  return {
    monthlyRequestLimit,
    memberDailyRequestLimit,
    estimatedTokens,
    cooldownSeconds,
    monthlyTokenLimit: Math.floor((spendCap / estimatedCostPerThousand) * 1000),
  };
}

export function claimOpenAIUsageFlight(idempotencyKey: string) {
  if (inFlightReservations.has(idempotencyKey)) return false;
  inFlightReservations.add(idempotencyKey);
  return true;
}

export function releaseOpenAIUsageFlight(idempotencyKey: string) {
  inFlightReservations.delete(idempotencyKey);
}

export async function reserveOpenAIUsage(
  client: OpenAIUsageClient,
  memberUserId: string,
  idempotencyKey: string,
): Promise<OpenAIUsageReservation> {
  const config = getOpenAIUsageConfig();
  if (!config) {
    return { allowed: false, reason: "invalid-usage-config", reservation_id: null };
  }

  const { data, error } = await client.rpc("reserve_cho_neo_openai_usage_v2", {
    p_cooldown_seconds: config.cooldownSeconds,
    p_daily_member_request_limit: config.memberDailyRequestLimit,
    p_estimated_tokens: config.estimatedTokens,
    p_idempotency_key: idempotencyKey,
    p_member_user_id: memberUserId,
    p_monthly_request_limit: config.monthlyRequestLimit,
    p_monthly_token_limit: config.monthlyTokenLimit,
  });

  if (error) return { allowed: false, reason: "usage-unavailable", reservation_id: null };
  const row = (Array.isArray(data) ? data[0] : data) as OpenAIUsageReservation | null;
  if (!row) return { allowed: false, reason: "usage-unavailable", reservation_id: null };
  return {
    allowed: row.allowed === true,
    reason: row.reason ?? "usage-unavailable",
    reservation_id: row.reservation_id ?? null,
  };
}

export async function finalizeOpenAIUsage(
  client: OpenAIUsageClient,
  reservationId: string,
  success: boolean,
  actualTokens: number,
): Promise<boolean> {
  const { error } = await client.rpc("finalize_cho_neo_openai_usage", {
    p_actual_tokens: Math.max(Number.isFinite(actualTokens) ? actualTokens : 0, 0),
    p_reservation_id: reservationId,
    p_success: success,
  });
  return !error;
}
