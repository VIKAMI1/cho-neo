import { NextResponse } from "next/server";
import { createChoNeoInvitationServiceClient, requireChoNeoInvitationAdmin } from "@/lib/cho-neo/invitation-admin";
import { CHO_NEO_MEO_VAT_REPORT_TABLE, CHO_NEO_MEO_VAT_TABLE, type ChoNeoMeoVatStatus } from "@/lib/cho-neo/meo-vat";
import { isMeoVatUuid, loadMeoVatAuthorNames, mapMeoVatTip } from "@/lib/cho-neo/meo-vat-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const tipStatuses = new Set<ChoNeoMeoVatStatus>(["pending_review", "published", "rejected", "hidden"]);
const reportStatuses = new Set(["reviewing", "resolved"]);

export async function GET() {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) return authorizationResponse(authorization.reason);
  const supabase = createChoNeoInvitationServiceClient();
  if (!supabase) return unavailable();

  const [{ data: tips, error: tipsError }, { data: reports, error: reportsError }] = await Promise.all([
    supabase.from(CHO_NEO_MEO_VAT_TABLE).select("id, author_user_id, category, title, body, status, created_at, updated_at").order("created_at", { ascending: false }).limit(100),
    supabase.from(CHO_NEO_MEO_VAT_REPORT_TABLE).select("id, tip_id, reporter_user_id, reason, details, review_status, created_at").neq("review_status", "resolved").order("created_at", { ascending: true }).limit(100),
  ]);
  if (tipsError || reportsError) return unavailable();
  const ids = [...(tips ?? []).map((tip) => tip.author_user_id), ...(reports ?? []).map((report) => report.reporter_user_id)];
  try {
    const names = await loadMeoVatAuthorNames(supabase, ids);
    const tipById = new Map((tips ?? []).map((tip) => [tip.id, tip]));
    return NextResponse.json({
      reports: (reports ?? []).map((report) => ({
        createdAt: report.created_at,
        details: report.details,
        id: report.id,
        reason: report.reason,
        reporterName: names.get(report.reporter_user_id) ?? "Thành viên Chợ Neo",
        reviewStatus: report.review_status,
        tipTitle: tipById.get(report.tip_id)?.title ?? "Mẹo không còn tồn tại",
        tipId: report.tip_id,
      })),
      tips: (tips ?? []).map((tip) => mapMeoVatTip(tip, names, authorization.userId)),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) return authorizationResponse(authorization.reason);
  const supabase = createChoNeoInvitationServiceClient();
  if (!supabase) return unavailable();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !isMeoVatUuid(body.id)) return NextResponse.json({ error: "Mẹo hoặc báo cáo chưa hợp lệ." }, { status: 400 });

  if (body.action === "set-tip-status" && typeof body.status === "string" && tipStatuses.has(body.status as ChoNeoMeoVatStatus)) {
    const { error } = await supabase.from(CHO_NEO_MEO_VAT_TABLE).update({ status: body.status }).eq("id", body.id);
    if (error) return unavailable();
    return NextResponse.json({ ok: true });
  }
  if (body.action === "set-report-status" && typeof body.status === "string" && reportStatuses.has(body.status)) {
    const { error } = await supabase.from(CHO_NEO_MEO_VAT_REPORT_TABLE).update({ review_status: body.status }).eq("id", body.id);
    if (error) return unavailable();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Hành động chưa được hỗ trợ." }, { status: 400 });
}

function authorizationResponse(reason: "unauthenticated" | "forbidden") {
  return NextResponse.json({ error: reason === "unauthenticated" ? "Đăng nhập bằng tài khoản quản trị để tiếp tục." : "Tài khoản này không có quyền quản trị Mẹo Vặt." }, { status: reason === "unauthenticated" ? 401 : 403 });
}
function unavailable() { return NextResponse.json({ error: "Hàng chờ Mẹo Vặt đang bận một nhịp." }, { status: 503 }); }
