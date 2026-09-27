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
  isVerifiedChoNeoMeoVatMember,
  loadMeoVatAuthorNames,
  mapMeoVatTip,
} from "@/lib/cho-neo/meo-vat-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TIP_FIELDS = "id, author_user_id, category, title, body, status, created_at, updated_at";

export async function GET(request: Request) {
  const supabase = createChoNeoMeoVatServiceClient();
  if (!supabase) return unavailable();
  const url = new URL(request.url);
  const mineOnly = url.searchParams.get("mine") === "1";
  const viewerId = await getChoNeoMeoVatUserId(request);
  if (mineOnly && !viewerId) return unauthorized();
  if (mineOnly && !(await isVerifiedChoNeoMeoVatMember(supabase, viewerId!))) return forbidden();

  let query = supabase
    .from(CHO_NEO_MEO_VAT_TABLE)
    .select(TIP_FIELDS)
    .order("created_at", { ascending: false })
    .limit(100);
  if (mineOnly) query = query.eq("author_user_id", viewerId);
  else query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) return unavailable();

  try {
    const authorNames = await loadMeoVatAuthorNames(supabase, (data ?? []).map((tip) => tip.author_user_id));
    return NextResponse.json({ tips: (data ?? []).map((tip) => mapMeoVatTip(tip, authorNames, viewerId)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return unavailable();
  }
}

export async function POST(request: Request) {
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
    .insert({
      author_user_id: userId,
      body: normalizeChoNeoMeoVatText(body.body),
      category: body.category,
      title: normalizeChoNeoMeoVatText(body.title),
    })
    .select("id")
    .single();
  if (error || !data) return unavailable();
  return NextResponse.json({ id: data.id, status: "pending_review" }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

function unauthorized() {
  return NextResponse.json({ error: "Đăng nhập và xác nhận thành viên Chợ Neo để gửi mẹo nha." }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ error: "Xác nhận thành viên ngành nail trước khi gửi mẹo nha." }, { status: 403 });
}

function unavailable() {
  return NextResponse.json({ error: "Mẹo Vặt đang bận một nhịp. Thử lại sau nha." }, { status: 503 });
}
