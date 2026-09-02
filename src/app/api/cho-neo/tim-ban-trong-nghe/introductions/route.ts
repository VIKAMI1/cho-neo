import { NextResponse } from "next/server";
import { requireChoNeoInvitationAdmin } from "@/lib/cho-neo/invitation-admin";
import { CHO_NEO_INTRODUCTION_TABLE, CHO_NEO_MATCHING_BLOCK_TABLE, CHO_NEO_MATCHING_PROFILE_TABLE, cleanMatchingText } from "@/lib/cho-neo/matching";
import { createMatchingServiceClient, isUuid } from "@/lib/cho-neo/matching-server";
import { CHO_NEO_MEMBER_PROFILE_TABLE } from "@/lib/cho-neo/member-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) return NextResponse.json({ error: "Bàn chủ quán đang khóa." }, { status: authorization.reason === "unauthenticated" ? 401 : 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || !isUuid(body.memberAUserId) || !isUuid(body.memberBUserId) || body.memberAUserId === body.memberBUserId) {
    return NextResponse.json({ error: "Cần hai thành viên khác nhau." }, { status: 400 });
  }
  const matchNote = cleanMatchingText(body.matchNote, 240);
  const icebreaker = cleanMatchingText(body.icebreaker, 240);
  if (matchNote.length < 2 || icebreaker.length < 2) return NextResponse.json({ error: "Thêm lý do ghép và câu mở lời." }, { status: 400 });

  const supabase = createMatchingServiceClient();
  if (!supabase) return NextResponse.json({ error: "Bàn chủ quán chưa sẵn sàng." }, { status: 503 });
  const members = [body.memberAUserId, body.memberBUserId].sort();
  const [{ data: profiles }, { data: memberProfiles }, { data: blocks, error: blockError }] = await Promise.all([
    supabase.from(CHO_NEO_MATCHING_PROFILE_TABLE).select("user_id, status").in("user_id", members).eq("status", "active"),
    supabase.from(CHO_NEO_MEMBER_PROFILE_TABLE).select("user_id, membership_status, suspended_at").in("user_id", members).eq("membership_status", "verified_nail_member").is("suspended_at", null),
    supabase.from(CHO_NEO_MATCHING_BLOCK_TABLE).select("blocker_user_id").or(`and(blocker_user_id.eq.${members[0]},blocked_user_id.eq.${members[1]}),and(blocker_user_id.eq.${members[1]},blocked_user_id.eq.${members[0]})`),
  ]);
  if (blockError || blocks?.length) return NextResponse.json({ error: "Cặp này không thể được giới thiệu." }, { status: 409 });
  if (profiles?.length !== 2 || memberProfiles?.length !== 2) return NextResponse.json({ error: "Cả hai cần bật hồ sơ ghép bạn và còn là thành viên xác nhận." }, { status: 409 });

  // Close stale rows before the partial unique index checks for a live pair.
  // This permits a deliberate later re-introduction without a cron job while
  // preserving the rule that only one current introduction can exist.
  const now = new Date().toISOString();
  const { error: expiryError } = await supabase
    .from(CHO_NEO_INTRODUCTION_TABLE)
    .update({
      member_a_decision: "passed",
      member_b_decision: "passed",
      updated_at: now,
    })
    .eq("member_a_user_id", members[0])
    .eq("member_b_user_id", members[1])
    .lt("expires_at", now);
  if (expiryError) return NextResponse.json({ error: "Chưa kiểm tra được lời giới thiệu cũ." }, { status: 503 });

  const requestedHours = typeof body.expiresInHours === "number" ? body.expiresInHours : 48;
  const expiresInHours = Math.min(168, Math.max(12, requestedHours));
  const { data, error } = await supabase.from(CHO_NEO_INTRODUCTION_TABLE).insert({
    created_by: authorization.userId,
    expires_at: new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString(),
    icebreaker,
    match_note: matchNote,
    member_a_user_id: members[0],
    member_b_user_id: members[1],
  }).select("id, expires_at").single();

  if (error) {
    console.error("[cho-neo:matching-admin]", { code: error.code ?? null });
    return NextResponse.json({ error: error.code === "23505" ? "Cặp này đã có lời giới thiệu đang mở." : "Chưa tạo được lời giới thiệu." }, { status: error.code === "23505" ? 409 : 503 });
  }
  return NextResponse.json({ introduction: data }, { status: 201 });
}
