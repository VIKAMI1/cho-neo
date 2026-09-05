import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const CHO_NEO_SAFETY_EVENT_TABLE = "cho_neo_safety_events";

export type ChoNeoSafetyEventSource = "language" | "behavior";
export type ChoNeoSafetyEventAction = "warn" | "throttle" | "block" | "review";
export type ChoNeoSafetySeverity = "medium" | "high" | "critical";

export type ChoNeoSafetyEvent = {
  action: ChoNeoSafetyEventAction;
  introductionId: string;
  metadata?: Record<string, boolean | number | string | null>;
  score: number;
  severity: ChoNeoSafetySeverity;
  signalCodes: string[];
  source: ChoNeoSafetyEventSource;
  subjectUserId: string;
};

export async function recordChoNeoSafetyEvent(
  client: SupabaseClient,
  event: ChoNeoSafetyEvent,
) {
  const { error } = await client.from(CHO_NEO_SAFETY_EVENT_TABLE).insert({
    action: event.action,
    agent_version: "cho-neo-safety-agents-v1",
    introduction_id: event.introductionId,
    metadata: event.metadata ?? {},
    score: Math.max(0, Math.min(100, Math.round(event.score))),
    severity: event.severity,
    signal_codes: event.signalCodes.slice(0, 12),
    source: event.source,
    subject_user_id: event.subjectUserId,
  });

  if (error) {
    // Safety telemetry must never take down a conversation. The table is
    // intentionally server-only and can be added before or alongside rollout.
    console.error("[cho-neo:safety-event-write-failed]", {
      code: error.code ?? null,
      source: event.source,
    });
  }
}
