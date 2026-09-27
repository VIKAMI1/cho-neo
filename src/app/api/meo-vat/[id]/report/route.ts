import { NextResponse } from "next/server";
import { canReportChoNeoMeoVatTip, CHO_NEO_MEO_VAT_REPORT_TABLE, CHO_NEO_MEO_VAT_TABLE, type ChoNeoMeoVatReportReason } from "@/lib/cho-neo/meo-vat";
import {
  createChoNeoMeoVatServiceClient,
  getChoNeoMeoVatUserId,
  isMeoVatUuid,
  isVerifiedChoNeoMeoVatMember,
} from "@/lib/cho-neo/meo-vat-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const reasons = new Set<ChoNeoMeoVatReportReason>(["inappropriate", "spam", "unsafe", "other"]);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!isMeoVatUuid(id)) return notFound();
  const supabase = createChoNeoMeoVatServiceClient();
  if (!supabase) return unavailable();
  const userId = await getChoNeoMeoVatUserId(request);
  if (!userId) return unauthorized();
  if (!(await isVerifiedChoNeoMeoVatMember(supabase, userId))) return forbidden();

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.reason !== "string" || !reasons.has(body.reason as ChoNeoMeoVatReportReason)) {
    return NextResponse.json({ error: "Chọn lý do báo cáo nha." }, { status: 400 });
  }
  const details = typeof body.details === "string" ? body.details.trim().slice(0, 500) : "";
  const { data: tip, error: tipError } = await supabase
    .from(CHO_NEO_MEO_VAT_TABLE)
    .select("id, author_user_id")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (tipError) return unavailable();
  if (!tip || !canReportChoNeoMeoVatTip(userId, { authorUserId: tip.author_user_id, status: "published" })) return notFound();

  const { error } = await supabase.from(CHO_NEO_MEO_VAT_REPORT_TABLE).insert({
    details: details || null,
    reason: body.reason,
    reporter_user_id: userId,
    tip_id: id,
  });
  if (error?.code === "23505") return NextResponse.json({ error: "Bạn đã gửi báo cáo cho mẹo này rồi nha." }, { status: 409 });
  if (error) return unavailable();
  return NextResponse.json({ ok: true }, { status: 201 });
}

function unauthorized() { return NextResponse.json({ error: "Đăng nhập để báo cáo mẹo nha." }, { status: 401 }); }
function forbidden() { return NextResponse.json({ error: "Xác nhận thành viên ngành nail trước khi báo cáo nha." }, { status: 403 }); }
function notFound() { return NextResponse.json({ error: "Không tìm thấy mẹo này." }, { status: 404 }); }
function unavailable() { return NextResponse.json({ error: "Báo cáo chưa gửi được. Thử lại sau nha." }, { status: 503 }); }
