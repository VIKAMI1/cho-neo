import { NextResponse } from "next/server";
import { requireChoNeoInvitationAdmin, createChoNeoInvitationServiceClient } from "@/lib/cho-neo/invitation-admin";
import { CHO_NEO_MATCHING_REPORT_TABLE } from "@/lib/cho-neo/matching";
import { CHO_NEO_MEMBER_PROFILE_TABLE } from "@/lib/cho-neo/member-identity";
import { isUuid } from "@/lib/cho-neo/matching-server";
import { loadChoNeoMatchingReports } from "@/lib/cho-neo/report-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) return authorizationResponse(authorization.reason);
  return NextResponse.json({ reports: await loadChoNeoMatchingReports() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) return authorizationResponse(authorization.reason);

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const reportId = body?.reportId;
  if (!isUuid(reportId)) return NextResponse.json({ error: "Báo cáo chưa hợp lệ." }, { status: 400 });

  const supabase = createChoNeoInvitationServiceClient();
  if (!supabase) return NextResponse.json({ error: "Safety queue is not configured." }, { status: 503 });

  if (body?.action === "update-status") {
    const status = body.status;
    if (status !== "reviewing" && status !== "resolved") {
      return NextResponse.json({ error: "Trạng thái báo cáo chưa hợp lệ." }, { status: 400 });
    }
    const { error } = await supabase
      .from(CHO_NEO_MATCHING_REPORT_TABLE)
      .update({ review_status: status })
      .eq("id", reportId);
    return error
      ? NextResponse.json({ error: "Chưa cập nhật được báo cáo." }, { status: 503 })
      : NextResponse.json({ ok: true });
  }

  if (body?.action === "suspend-member") {
    const { data: report, error: reportError } = await supabase
      .from(CHO_NEO_MATCHING_REPORT_TABLE)
      .select("reported_user_id")
      .eq("id", reportId)
      .maybeSingle();
    if (reportError) return NextResponse.json({ error: "Chưa đọc được báo cáo." }, { status: 503 });
    if (!report?.reported_user_id) return NextResponse.json({ error: "Báo cáo không còn tồn tại." }, { status: 404 });

    const { error } = await supabase
      .from(CHO_NEO_MEMBER_PROFILE_TABLE)
      .update({ membership_status: "suspended", suspended_at: new Date().toISOString() })
      .eq("user_id", report.reported_user_id)
      .neq("membership_status", "rejected");
    if (error) return NextResponse.json({ error: "Chưa tạm khóa được thành viên." }, { status: 503 });

    return NextResponse.json({ ok: true, suspendedUserId: report.reported_user_id });
  }

  if (body?.action === "unsuspend-member") {
    const { data: report, error: reportError } = await supabase
      .from(CHO_NEO_MATCHING_REPORT_TABLE)
      .select("reported_user_id")
      .eq("id", reportId)
      .maybeSingle();
    if (reportError) return NextResponse.json({ error: "Chưa đọc được báo cáo." }, { status: 503 });
    if (!report?.reported_user_id) return NextResponse.json({ error: "Báo cáo không còn tồn tại." }, { status: 404 });

    const { error } = await supabase
      .from(CHO_NEO_MEMBER_PROFILE_TABLE)
      .update({ membership_status: "verified_nail_member", suspended_at: null })
      .eq("user_id", report.reported_user_id)
      .eq("membership_status", "suspended")
      .not("suspended_at", "is", null);
    if (error) return NextResponse.json({ error: "Chưa khôi phục được thành viên." }, { status: 503 });

    return NextResponse.json({ ok: true, unsuspendedUserId: report.reported_user_id });
  }

  return NextResponse.json({ error: "Hành động chưa được hỗ trợ." }, { status: 400 });
}

function authorizationResponse(reason: "unauthenticated" | "forbidden") {
  return NextResponse.json(
    { error: reason === "unauthenticated" ? "Đăng nhập để mở hàng đợi an toàn." : "Tài khoản này không được mở hàng đợi an toàn." },
    { status: reason === "unauthenticated" ? 401 : 403 },
  );
}
