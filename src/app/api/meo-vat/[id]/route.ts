import { NextResponse } from "next/server";
import {
  CHO_NEO_MEO_VAT_BODY_MAX_LENGTH,
  CHO_NEO_MEO_VAT_TABLE,
  CHO_NEO_MEO_VAT_TITLE_MAX_LENGTH,
  getChoNeoMeoVatTextError,
  isChoNeoMeoVatCategory,
  normalizeChoNeoMeoVatText,
} from "@/lib/cho-neo/meo-vat";
import {
  createChoNeoMeoVatServiceClient,
  getChoNeoMeoVatUserId,
  isMeoVatUuid,
  isVerifiedChoNeoMeoVatMember,
  loadMeoVatAuthorNames,
  mapMeoVatTip,
} from "@/lib/cho-neo/meo-vat-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const TIP_FIELDS = "id, author_user_id, category, title, body, status, created_at, updated_at";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isMeoVatUuid(id)) return notFound();
  const supabase = createChoNeoMeoVatServiceClient();
  if (!supabase) return unavailable();
  const userId = await getChoNeoMeoVatUserId(request);
  const { data, error } = await supabase.from(CHO_NEO_MEO_VAT_TABLE).select(TIP_FIELDS).eq("id", id).maybeSingle();
  if (error || !data || (data.status !== "published" && data.author_user_id !== userId)) return notFound();
  try {
    const authorNames = await loadMeoVatAuthorNames(supabase, [data.author_user_id]);
    return NextResponse.json({ tip: mapMeoVatTip(data, authorNames, userId) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isMeoVatUuid(id)) return notFound();
  const supabase = createChoNeoMeoVatServiceClient();
  if (!supabase) return unavailable();
  const userId = await getChoNeoMeoVatUserId(request);
  if (!userId) return unauthorized();
  if (!(await isVerifiedChoNeoMeoVatMember(supabase, userId))) return forbidden();

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !isChoNeoMeoVatCategory(body.category)) return NextResponse.json({ error: "Chọn một chủ đề trong danh sách nha." }, { status: 400 });
  const titleError = getChoNeoMeoVatTextError(body.title, CHO_NEO_MEO_VAT_TITLE_MAX_LENGTH, "tiêu đề");
  if (titleError) return NextResponse.json({ error: titleError }, { status: 400 });
  const bodyError = getChoNeoMeoVatTextError(body.body, CHO_NEO_MEO_VAT_BODY_MAX_LENGTH, "nội dung mẹo");
  if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 });

  const { data, error } = await supabase
    .from(CHO_NEO_MEO_VAT_TABLE)
    .update({ category: body.category, title: normalizeChoNeoMeoVatText(body.title), body: normalizeChoNeoMeoVatText(body.body) })
    .eq("id", id)
    .eq("author_user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) return unavailable();
  if (!data) return notFound();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: RouteContext) {
  const { id } = await context.params;
  if (!isMeoVatUuid(id)) return notFound();
  const supabase = createChoNeoMeoVatServiceClient();
  if (!supabase) return unavailable();
  const userId = await getChoNeoMeoVatUserId(request);
  if (!userId) return unauthorized();
  if (!(await isVerifiedChoNeoMeoVatMember(supabase, userId))) return forbidden();
  const { data, error } = await supabase
    .from(CHO_NEO_MEO_VAT_TABLE)
    .delete()
    .eq("id", id)
    .eq("author_user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) return unavailable();
  if (!data) return notFound();
  return NextResponse.json({ ok: true });
}

function unauthorized() {
  return NextResponse.json({ error: "Đăng nhập để quản lý mẹo của bạn nha." }, { status: 401 });
}
function forbidden() {
  return NextResponse.json({ error: "Xác nhận thành viên ngành nail trước khi quản lý mẹo nha." }, { status: 403 });
}
function notFound() {
  return NextResponse.json({ error: "Không tìm thấy mẹo này." }, { status: 404 });
}
function unavailable() {
  return NextResponse.json({ error: "Mẹo Vặt đang bận một nhịp. Thử lại sau nha." }, { status: 503 });
}
