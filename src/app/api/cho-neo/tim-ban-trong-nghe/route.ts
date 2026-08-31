import { NextResponse } from "next/server";
import {
  CHO_NEO_INTRODUCTION_TABLE,
  CHO_NEO_MATCHING_BLOCK_TABLE,
  CHO_NEO_MATCHING_CONSENT_VERSION,
  CHO_NEO_MATCHING_PROFILE_TABLE,
  CHO_NEO_MATCHING_REPORT_TABLE,
  cleanMatchingText,
  isMatchingReportReason,
  validateMatchingProfile,
} from "@/lib/cho-neo/matching";
import { createMatchingServiceClient, getMatchingUser, isUuid } from "@/lib/cho-neo/matching-server";
import { CHO_NEO_MEMBER_PROFILE_TABLE } from "@/lib/cho-neo/member-identity";
import { draftMatchingProfile } from "@/lib/cho-neo/matching-profile-ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const context = await requireMember(request);
  if (context instanceof NextResponse) return context;
  const { supabase, userId } = context;

  const [{ data: profile, error: profileError }, { data: introductions, error: introError }] = await Promise.all([
    supabase.from(CHO_NEO_MATCHING_PROFILE_TABLE).select("city, country, region, discovery_scope, situation, experience_range, age_range, gender, languages, interests, fun_line, looking_for, can_share, status, consent_version, updated_at").eq("user_id", userId).maybeSingle(),
    supabase.from(CHO_NEO_INTRODUCTION_TABLE).select("id, member_a_user_id, member_b_user_id, member_a_decision, member_b_decision, match_note, icebreaker, expires_at, opened_at, created_at").or(`member_a_user_id.eq.${userId},member_b_user_id.eq.${userId}`).order("created_at", { ascending: false }).limit(10),
  ]);
  if (profileError || introError) return unavailable("matching-read-failed");

  const publicIntroductions = await Promise.all((introductions ?? []).map(async (intro) => {
    const isMemberA = intro.member_a_user_id === userId;
    const myDecision = isMemberA ? intro.member_a_decision : intro.member_b_decision;
    const theirDecision = isMemberA ? intro.member_b_decision : intro.member_a_decision;
    const counterpartId = isMemberA ? intro.member_b_user_id : intro.member_a_user_id;
    const isMutual = myDecision === "accepted" && theirDecision === "accepted";
    let counterpart = null;
    if (isMutual) {
      const { data } = await supabase.from(CHO_NEO_MEMBER_PROFILE_TABLE).select("display_name, avatar_key, nail_role").eq("user_id", counterpartId).maybeSingle();
      counterpart = data ?? null;
    }
    return {
      counterpart,
      createdAt: intro.created_at,
      expiresAt: intro.expires_at,
      icebreaker: isMutual ? intro.icebreaker : null,
      id: intro.id,
      matchNote: intro.match_note,
      myDecision,
      openedAt: intro.opened_at,
      state: new Date(intro.expires_at).getTime() <= Date.now() ? "expired" : myDecision === "passed" || theirDecision === "passed" ? "closed" : isMutual ? "mutual" : myDecision === "accepted" ? "waiting" : "pending",
    };
  }));

  return NextResponse.json({
    introductions: publicIntroductions,
    profile: profile ? { ageRange: profile.age_range ?? "", canShare: profile.can_share, city: profile.city, country: profile.country ?? "", discoveryScope: profile.discovery_scope ?? "nearby", consentVersion: profile.consent_version, experienceRange: profile.experience_range ?? "", funLine: profile.fun_line ?? "", gender: profile.gender ?? "", interests: profile.interests ?? "", languages: profile.languages ?? [], lookingFor: profile.looking_for, region: profile.region ?? "", situation: profile.situation, status: profile.status, updatedAt: profile.updated_at } : null,
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const context = await requireMember(request);
  if (context instanceof NextResponse) return context;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return badRequest("Yêu cầu chưa đầy đủ.");
  const { supabase, userId } = context;

  if (body.action === "draft-profile") {
    if (!isUuid(body.requestId)) return badRequest("Yêu cầu viết hồ sơ chưa hợp lệ.");
    const city = cleanMatchingText(body.city, 60);
    const country = cleanMatchingText(body.country, 80);
    const region = cleanMatchingText(body.region, 80);
    const situation = cleanMatchingText(body.situation, 80);
    const workLife = cleanMatchingText(body.workLife, 320);
    const connection = cleanMatchingText(body.connection, 320);
    const experience = cleanMatchingText(body.experience, 320);
    if (!city || !country || !situation) return badRequest("Chọn thành phố, quốc gia và công việc hiện tại trước nha.");
    if ([workLife, connection, experience].filter((answer) => answer.length >= 2).length < 2) {
      return badRequest("Kể Chợ Neo nghe ít nhất hai điều để lời giới thiệu thật sự giống bạn.");
    }
    const result = await draftMatchingProfile(
      { city, connection, country, experience, region, situation, workLife },
      userId,
      supabase,
      String(body.requestId),
    );
    if ("error" in result) {
      console.error("[cho-neo:matching-profile-draft]", { reason: result.error });
      return NextResponse.json({ error: "Chợ Neo chưa viết giúp được lúc này. Bạn vẫn có thể tự viết hoặc thử lại sau nha." }, { status: 503 });
    }
    return NextResponse.json({ draft: result.draft }, { headers: { "Cache-Control": "no-store" } });
  }

  if (body.action === "save-profile") {
    const profile = validateMatchingProfile(body);
    if ("error" in profile) return badRequest(profile.error);
    if (body.consentAccepted !== true) return badRequest("Bạn cần đồng ý trước khi bật ghép bạn.");
    const { error } = await supabase.from(CHO_NEO_MATCHING_PROFILE_TABLE).upsert({
      age_range: profile.ageRange, can_share: profile.canShare, city: profile.city, country: profile.country, discovery_scope: profile.discoveryScope, consent_accepted_at: new Date().toISOString(), consent_version: CHO_NEO_MATCHING_CONSENT_VERSION,
      experience_range: profile.experienceRange, fun_line: profile.funLine, gender: profile.gender, interests: profile.interests, languages: profile.languages, looking_for: profile.lookingFor, region: profile.region || null, situation: profile.situation, status: "active", updated_at: new Date().toISOString(), user_id: userId,
    }, { onConflict: "user_id" });
    return error ? unavailable("profile-save-failed") : NextResponse.json({ ok: true });
  }

  if (body.action === "pause-profile") {
    const { error } = await supabase.from(CHO_NEO_MATCHING_PROFILE_TABLE).update({ status: "paused", updated_at: new Date().toISOString() }).eq("user_id", userId);
    return error ? unavailable("profile-pause-failed") : NextResponse.json({ ok: true });
  }

  if (body.action === "decide") {
    if (!isUuid(body.introductionId) || !["accepted", "passed"].includes(String(body.decision))) return badRequest("Lựa chọn chưa hợp lệ.");
    const { data: intro, error: readError } = await supabase.from(CHO_NEO_INTRODUCTION_TABLE).select("member_a_user_id, member_b_user_id, member_a_decision, member_b_decision, expires_at").eq("id", body.introductionId).maybeSingle();
    if (readError || !intro || ![intro.member_a_user_id, intro.member_b_user_id].includes(userId)) return NextResponse.json({ error: "Lời giới thiệu không còn ở đây." }, { status: 404 });
    if (new Date(intro.expires_at).getTime() <= Date.now()) return badRequest("Lời giới thiệu này đã hết hạn.");
    const mine = intro.member_a_user_id === userId ? "member_a_decision" : "member_b_decision";
    const other = mine === "member_a_decision" ? "member_b_decision" : "member_a_decision";
    const decision = String(body.decision);
    const opened = decision === "accepted" && intro[other] === "accepted";
    const { error } = await supabase.from(CHO_NEO_INTRODUCTION_TABLE).update({ [mine]: decision, ...(opened ? { opened_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() }).eq("id", body.introductionId).eq(mine === "member_a_decision" ? "member_a_user_id" : "member_b_user_id", userId);
    return error ? unavailable("decision-save-failed") : NextResponse.json({ ok: true });
  }

  if (body.action === "block" || body.action === "report") {
    if (!isUuid(body.introductionId)) return badRequest("Lời giới thiệu chưa hợp lệ.");
    const { data: intro } = await supabase.from(CHO_NEO_INTRODUCTION_TABLE).select("member_a_user_id, member_b_user_id").eq("id", body.introductionId).maybeSingle();
    if (!intro || ![intro.member_a_user_id, intro.member_b_user_id].includes(userId)) return NextResponse.json({ error: "Lời giới thiệu không còn ở đây." }, { status: 404 });
    const otherUserId = intro.member_a_user_id === userId ? intro.member_b_user_id : intro.member_a_user_id;
    const { error: blockError } = await supabase.from(CHO_NEO_MATCHING_BLOCK_TABLE).upsert({ blocker_user_id: userId, blocked_user_id: otherUserId });
    if (blockError) return unavailable("block-save-failed");
    await supabase.from(CHO_NEO_INTRODUCTION_TABLE).update({ [intro.member_a_user_id === userId ? "member_a_decision" : "member_b_decision"]: "passed", updated_at: new Date().toISOString() }).eq("id", body.introductionId);
    if (body.action === "report") {
      if (!isMatchingReportReason(body.reason)) return badRequest("Chọn lý do báo cáo nha.");
      const details = cleanMatchingText(body.details, 500) || null;
      const { error } = await supabase.from(CHO_NEO_MATCHING_REPORT_TABLE).insert({ details, introduction_id: body.introductionId, reason: body.reason, reported_user_id: otherUserId, reporter_user_id: userId });
      if (error) return unavailable("report-save-failed");
    }
    return NextResponse.json({ ok: true });
  }

  return badRequest("Hành động chưa được hỗ trợ.");
}

async function requireMember(request: Request) {
  const user = await getMatchingUser(request);
  if (!user) return NextResponse.json({ error: "Đăng nhập để mở khu ghép bạn." }, { status: 401 });
  const supabase = createMatchingServiceClient();
  if (!supabase) return unavailable("missing-service-role");
  const { data, error } = await supabase.from(CHO_NEO_MEMBER_PROFILE_TABLE).select("membership_status").eq("user_id", user.id).maybeSingle();
  if (error) return unavailable("member-read-failed");
  if (data?.membership_status !== "verified_nail_member") return NextResponse.json({ error: "Khu này chỉ mở cho thành viên nghề nail đã xác nhận." }, { status: 403 });
  return { supabase, userId: user.id };
}

function badRequest(error: string) { return NextResponse.json({ error }, { status: 400 }); }
function unavailable(reason: string) {
  console.error("[cho-neo:matching]", { reason });
  return NextResponse.json({ error: "Bàn ghép bạn chưa sẵn sàng. Thử lại sau nha.", reason }, { status: 503 });
}
