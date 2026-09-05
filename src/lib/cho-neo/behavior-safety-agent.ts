import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type BehaviorSafetyDecision = {
  action: "allow" | "throttle" | "review";
  degraded: boolean;
  metadata?: Record<string, boolean | number | string | null>;
  score: number;
  severity: "medium" | "high" | "critical";
  signalCodes: string[];
  userMessage?: string;
};

type BehaviorInput = {
  client: SupabaseClient;
  messagesThisMinute: number;
  subjectUserId: string;
};

function countOf(value: { count: number | null; error: unknown }) {
  return typeof value.count === "number" ? value.count : 0;
}

export async function runBehaviorSafetyAgent({
  client,
  messagesThisMinute,
  subjectUserId,
}: BehaviorInput): Promise<BehaviorSafetyDecision> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const [hourMessages, openReports, blockCount] = await Promise.all([
    client
      .from("cho_neo_private_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_user_id", subjectUserId)
      .gte("created_at", hourAgo),
    client
      .from("cho_neo_matching_reports")
      .select("id", { count: "exact", head: true })
      .eq("reported_user_id", subjectUserId)
      .eq("review_status", "open"),
    client
      .from("cho_neo_matching_blocks")
      .select("blocker_user_id", { count: "exact", head: true })
      .eq("blocked_user_id", subjectUserId),
  ]);

  if (hourMessages.error || openReports.error || blockCount.error) {
    return {
      action: "allow",
      degraded: true,
      score: 0,
      severity: "medium",
      signalCodes: ["behavior-data-unavailable"],
    };
  }

  const hourMessageCount = countOf(hourMessages);
  const openReportCount = countOf(openReports);
  const blockTotal = countOf(blockCount);
  const signals: string[] = [];
  const metadata = { blockTotal, hourMessageCount, messagesThisMinute, openReportCount };

  if (messagesThisMinute >= 8) signals.push("rapid-messaging");
  if (hourMessageCount >= 30) signals.push("high-hour-volume");
  if (openReportCount >= 2) signals.push("multiple-open-reports");
  if (blockTotal >= 3) signals.push("repeated-blocks");

  if (messagesThisMinute >= 8 || hourMessageCount >= 30) {
    return {
      action: "throttle",
      degraded: false,
      metadata,
      score: 88,
      severity: "high",
      signalCodes: signals,
      userMessage: "Chậm một chút nha—Chợ Neo tạm dừng gửi tin để giữ cuộc trò chuyện an toàn.",
    };
  }

  if (openReportCount >= 2 || blockTotal >= 3) {
    return {
      action: "review",
      degraded: false,
      metadata,
      score: 76,
      severity: "high",
      signalCodes: signals,
    };
  }

  return {
    action: "allow",
    degraded: false,
    metadata,
    score: signals.length > 0 ? 35 : 0,
    severity: "medium",
    signalCodes: signals,
  };
}

