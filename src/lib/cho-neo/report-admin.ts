import "server-only";

import {
  CHO_NEO_MATCHING_REPORT_TABLE,
} from "@/lib/cho-neo/matching";
import {
  CHO_NEO_MEMBER_PROFILE_TABLE,
} from "@/lib/cho-neo/member-identity";
import { createChoNeoInvitationServiceClient } from "@/lib/cho-neo/invitation-admin";

export type ChoNeoReportMember = {
  displayName: string;
  membershipStatus: string;
  nailRole: string | null;
  suspendedAt: string | null;
  userId: string;
};

export type ChoNeoMatchingReport = {
  createdAt: string;
  details: string | null;
  evidenceExpiresAt: string | null;
  id: string;
  introductionId: string;
  messageEvidence: Array<{ body?: string; created_at?: string; sender_user_id?: string }>;
  reason: string;
  reported: ChoNeoReportMember | null;
  reporter: ChoNeoReportMember | null;
  reviewStatus: "open" | "reviewing" | "resolved";
};

export async function loadChoNeoMatchingReports() {
  const supabase = createChoNeoInvitationServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(CHO_NEO_MATCHING_REPORT_TABLE)
    .select("id, reporter_user_id, reported_user_id, introduction_id, reason, details, message_evidence, evidence_expires_at, review_status, created_at")
    .in("review_status", ["open", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[cho-neo:admin-reports] list failed", { code: error.code ?? null });
    return [];
  }

  const rows = (data ?? []) as Array<{
    created_at: string;
    details: string | null;
    evidence_expires_at: string | null;
    id: string;
    introduction_id: string;
    message_evidence: unknown;
    reason: string;
    reported_user_id: string;
    reporter_user_id: string;
    review_status: "open" | "reviewing" | "resolved";
  }>;
  const userIds = [...new Set(rows.flatMap((row) => [row.reporter_user_id, row.reported_user_id]))];
  const { data: members, error: memberError } = userIds.length
    ? await supabase
        .from(CHO_NEO_MEMBER_PROFILE_TABLE)
        .select("user_id, display_name, nail_role, membership_status, suspended_at")
        .in("user_id", userIds)
    : { data: [], error: null };

  if (memberError) {
    console.error("[cho-neo:admin-reports] member lookup failed", { code: memberError.code ?? null });
  }

  const memberById = new Map(
    (members ?? []).map((member) => [member.user_id, {
      displayName: member.display_name,
      membershipStatus: member.membership_status,
      nailRole: member.nail_role,
      suspendedAt: member.suspended_at,
      userId: member.user_id,
    } satisfies ChoNeoReportMember]),
  );

  return rows.map((row) => ({
    createdAt: row.created_at,
    details: row.details,
    evidenceExpiresAt: row.evidence_expires_at,
    id: row.id,
    introductionId: row.introduction_id,
    messageEvidence: Array.isArray(row.message_evidence) ? row.message_evidence.filter(isEvidenceMessage) : [],
    reason: row.reason,
    reported: memberById.get(row.reported_user_id) ?? null,
    reporter: memberById.get(row.reporter_user_id) ?? null,
    reviewStatus: row.review_status,
  } satisfies ChoNeoMatchingReport));
}

function isEvidenceMessage(value: unknown): value is { body?: string; created_at?: string; sender_user_id?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  return (
    (message.body === undefined || typeof message.body === "string") &&
    (message.created_at === undefined || typeof message.created_at === "string") &&
    (message.sender_user_id === undefined || typeof message.sender_user_id === "string")
  );
}
