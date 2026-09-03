import { NextResponse } from "next/server";
import {
  CHO_NEO_CONTACT_HANDOFF_TABLE,
  CHO_NEO_CONTACT_METHODS,
  CHO_NEO_INTRODUCTION_TABLE,
  CHO_NEO_MATCHING_BLOCK_TABLE,
  CHO_NEO_MATCHING_CONSENT_VERSION,
  CHO_NEO_MATCHING_PROFILE_TABLE,
  CHO_NEO_MATCHING_REPORT_TABLE,
  CHO_NEO_PRIVATE_MESSAGE_TABLE,
  CHO_NEO_TABLE_QUIET_DAYS,
  cleanMatchingText,
  isMatchingReportReason,
  validatePrivateMessage,
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
    supabase.from(CHO_NEO_INTRODUCTION_TABLE).select("id, member_a_user_id, member_b_user_id, member_a_decision, member_b_decision, match_note, icebreaker, expires_at, opened_at, table_last_active_at, table_closed_at, created_at").or(`member_a_user_id.eq.${userId},member_b_user_id.eq.${userId}`).order("created_at", { ascending: false }).limit(10),
  ]);
  if (profileError || introError) return unavailable("matching-read-failed");

  const safetyEntries = await Promise.all((introductions ?? []).map(async (intro) => [
    intro.id,
    await getIntroductionSafetyState(supabase, intro.member_a_user_id, intro.member_b_user_id, intro.id),
  ] as const));
  if (safetyEntries.some(([, safety]) => safety === null)) return unavailable("matching-safety-read-failed");
  const safetyByIntroduction = new Map(safetyEntries as Array<[string, { blocked: boolean; reported: boolean }]>);

  let publicIntroductions;
  try {
    publicIntroductions = await Promise.all((introductions ?? []).map(async (intro) => {
      const isMemberA = intro.member_a_user_id === userId;
      const myDecision = isMemberA ? intro.member_a_decision : intro.member_b_decision;
      const theirDecision = isMemberA ? intro.member_b_decision : intro.member_a_decision;
      const counterpartId = isMemberA ? intro.member_b_user_id : intro.member_a_user_id;
      const safety = safetyByIntroduction.get(intro.id)!;
      const isMutual = myDecision === "accepted" && theirDecision === "accepted";
      const expired = new Date(intro.expires_at).getTime() <= Date.now();
      const canExposePrivateTable = isMutual && !safety.blocked && !safety.reported && !intro.table_closed_at && !expired;
      let counterpart = null;
      let contactHandoff = { mine: null as { method: string; value: string } | null, theirs: null as { method: string; value: string } | null };
      let privateTable = null as null | {
        lastActiveAt: string;
        messages: Array<{ body: string; id: string; mine: boolean; sentAt: string }>;
        quietAt: string;
      };
      if (isMutual && !safety.blocked && !safety.reported) {
        const { data, error: counterpartError } = await supabase.from(CHO_NEO_MEMBER_PROFILE_TABLE).select("display_name, avatar_key, nail_role").eq("user_id", counterpartId).maybeSingle();
        if (counterpartError) throw new Error("counterpart-read-failed");
        counterpart = data ?? null;
        if (canExposePrivateTable) {
          const [{ data: contacts, error: contactError }, { data: messages, error: messageError }] = await Promise.all([
            supabase.from(CHO_NEO_CONTACT_HANDOFF_TABLE).select("user_id, method, contact_value").eq("introduction_id", intro.id),
            supabase.from(CHO_NEO_PRIVATE_MESSAGE_TABLE).select("id, sender_user_id, body, created_at").eq("introduction_id", intro.id).order("created_at", { ascending: true }).limit(100),
          ]);
          if (contactError || messageError) throw new Error("private-data-read-failed");
          for (const contact of contacts ?? []) {
            const value = { method: contact.method, value: contact.contact_value };
            if (contact.user_id === userId) contactHandoff.mine = value;
            if (contact.user_id === counterpartId) contactHandoff.theirs = value;
          }
          const lastActiveAt = intro.table_last_active_at ?? intro.opened_at ?? intro.created_at;
          privateTable = {
            lastActiveAt,
            messages: (messages ?? []).map((message) => ({ body: message.body, id: message.id, mine: message.sender_user_id === userId, sentAt: message.created_at })),
            quietAt: new Date(new Date(lastActiveAt).getTime() + CHO_NEO_TABLE_QUIET_DAYS * 86_400_000).toISOString(),
          };
        }
      }
      const tableIsQuiet = privateTable ? new Date(privateTable.quietAt).getTime() <= Date.now() : false;
      return {
        contactHandoff,
        counterpart,
        createdAt: intro.created_at,
        expiresAt: intro.expires_at,
        icebreaker: isMutual ? intro.icebreaker : null,
        id: intro.id,
        matchNote: intro.match_note,
        myDecision,
        openedAt: intro.opened_at,
        privateTable,
        state: safety.blocked || safety.reported || myDecision === "passed" || theirDecision === "passed" || intro.table_closed_at ? "closed" : isMutual ? tableIsQuiet ? "quiet" : "mutual" : expired ? "expired" : myDecision === "accepted" ? "waiting" : "pending",
      };
    }));
  } catch {
    return unavailable("matching-private-read-failed");
  }

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
    const safety = await getIntroductionSafetyState(supabase, intro.member_a_user_id, intro.member_b_user_id, body.introductionId);
    if (!safety) return unavailable("matching-safety-read-failed");
    if (safety.blocked || safety.reported) return NextResponse.json({ error: "Lời giới thiệu này đã được khép lại vì an toàn." }, { status: 403 });
    if (intro[mine] === "passed") return badRequest("Bạn đã bỏ qua lời giới thiệu này rồi.");
    const opened = decision === "accepted" && intro[other] === "accepted";
    const now = new Date().toISOString();
    const { error } = await supabase.from(CHO_NEO_INTRODUCTION_TABLE).update({ [mine]: decision, ...(opened ? { opened_at: now, table_last_active_at: now } : {}), updated_at: now }).eq("id", body.introductionId).eq(mine === "member_a_decision" ? "member_a_user_id" : "member_b_user_id", userId).neq(mine, "passed");
    return error ? unavailable("decision-save-failed") : NextResponse.json({ ok: true });
  }

  if (body.action === "send-message" || body.action === "keep-table" || body.action === "close-table") {
    if (!isUuid(body.introductionId)) return badRequest("Bàn trò chuyện chưa hợp lệ.");
    const { data: intro, error: introError } = await supabase
      .from(CHO_NEO_INTRODUCTION_TABLE)
      .select("member_a_user_id, member_b_user_id, member_a_decision, member_b_decision, opened_at, table_last_active_at, table_closed_at")
      .eq("id", body.introductionId)
      .maybeSingle();
    if (introError || !intro || ![intro.member_a_user_id, intro.member_b_user_id].includes(userId)) {
      return NextResponse.json({ error: "Bàn trò chuyện không còn ở đây." }, { status: 404 });
    }
    const safety = await getIntroductionSafetyState(supabase, intro.member_a_user_id, intro.member_b_user_id, body.introductionId);
    if (!safety) return unavailable("matching-safety-read-failed");
    if (safety.blocked || safety.reported) return NextResponse.json({ error: "Bàn trò chuyện này đã được khép lại vì an toàn." }, { status: 403 });
    if (intro.member_a_decision !== "accepted" || intro.member_b_decision !== "accepted") {
      return badRequest("Hai người cần cùng chào nhau trước nha.");
    }
    if (intro.table_closed_at) return badRequest("Bàn trò chuyện này đã khép lại.");
    const now = new Date();
    const lastActiveAt = new Date(intro.table_last_active_at ?? intro.opened_at ?? 0);
    const quietAt = new Date(lastActiveAt.getTime() + CHO_NEO_TABLE_QUIET_DAYS * 86_400_000);
    if (body.action === "close-table") {
      const { error } = await supabase.from(CHO_NEO_INTRODUCTION_TABLE).update({ table_closed_at: now.toISOString(), table_closed_by: userId, updated_at: now.toISOString() }).eq("id", body.introductionId);
      return error ? unavailable("table-close-failed") : NextResponse.json({ ok: true });
    }
    if (body.action === "keep-table") {
      if (now.getTime() < quietAt.getTime()) return badRequest("Bàn vẫn đang mở nha.");
      const { error } = await supabase.from(CHO_NEO_INTRODUCTION_TABLE).update({ table_last_active_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", body.introductionId);
      return error ? unavailable("table-keep-failed") : NextResponse.json({ ok: true });
    }
    if (now.getTime() >= quietAt.getTime()) return badRequest("Bàn đã yên một tuần. Chọn giữ bàn thêm trước khi nhắn tiếp nha.");
    const message = validatePrivateMessage(body.message);
    if ("error" in message) return badRequest(message.error);
    const minuteAgo = new Date(now.getTime() - 60_000).toISOString();
    const { count, error: rateLimitError } = await supabase.from(CHO_NEO_PRIVATE_MESSAGE_TABLE).select("id", { count: "exact", head: true }).eq("introduction_id", body.introductionId).eq("sender_user_id", userId).gte("created_at", minuteAgo);
    if (rateLimitError || count === null || count === undefined) return unavailable("message-rate-limit-read-failed");
    if (count >= 10) return NextResponse.json({ error: "Chậm một chút nha—bạn vừa gửi khá nhiều lời nhắn." }, { status: 429 });
    const { error } = await supabase.from(CHO_NEO_PRIVATE_MESSAGE_TABLE).insert({ body: message.body, introduction_id: body.introductionId, sender_user_id: userId });
    if (error) return unavailable("message-send-failed");
    await supabase.from(CHO_NEO_INTRODUCTION_TABLE).update({ table_last_active_at: now.toISOString(), updated_at: now.toISOString() }).eq("id", body.introductionId);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "share-contact" || body.action === "remove-contact") {
    if (!isUuid(body.introductionId)) return badRequest("Lời giới thiệu chưa hợp lệ.");
    const { data: intro, error: introError } = await supabase
      .from(CHO_NEO_INTRODUCTION_TABLE)
      .select("member_a_user_id, member_b_user_id, member_a_decision, member_b_decision, table_closed_at")
      .eq("id", body.introductionId)
      .maybeSingle();
    if (introError || !intro || ![intro.member_a_user_id, intro.member_b_user_id].includes(userId)) {
      return NextResponse.json({ error: "Lời giới thiệu không còn ở đây." }, { status: 404 });
    }
    const safety = await getIntroductionSafetyState(supabase, intro.member_a_user_id, intro.member_b_user_id, body.introductionId);
    if (!safety) return unavailable("matching-safety-read-failed");
    if (safety.blocked || safety.reported) return NextResponse.json({ error: "Lời giới thiệu này đã được khép lại vì an toàn." }, { status: 403 });
    const mutual = intro.member_a_decision === "accepted" && intro.member_b_decision === "accepted";
    if (!mutual || intro.table_closed_at) {
      return badRequest("Hai người cần cùng chào nhau trước khi chia sẻ liên lạc.");
    }
    if (body.action === "remove-contact") {
      const { error } = await supabase.from(CHO_NEO_CONTACT_HANDOFF_TABLE).delete().eq("introduction_id", body.introductionId).eq("user_id", userId);
      return error ? unavailable("contact-remove-failed") : NextResponse.json({ ok: true });
    }
    const method = cleanMatchingText(body.method, 20);
    const contactValue = cleanMatchingText(body.contactValue, 180);
    if (!CHO_NEO_CONTACT_METHODS.includes(method as never) || contactValue.length < 3) {
      return badRequest("Chọn cách liên lạc và nhập tên hoặc đường dẫn hợp lệ nha.");
    }
    const { error } = await supabase.from(CHO_NEO_CONTACT_HANDOFF_TABLE).upsert({
      contact_value: contactValue,
      introduction_id: body.introductionId,
      method,
      updated_at: new Date().toISOString(),
      user_id: userId,
    }, { onConflict: "introduction_id,user_id" });
    return error ? unavailable("contact-share-failed") : NextResponse.json({ ok: true });
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
      const { data: messages } = await supabase.from(CHO_NEO_PRIVATE_MESSAGE_TABLE).select("sender_user_id, body, created_at").eq("introduction_id", body.introductionId).order("created_at", { ascending: true }).limit(100);
      const { error } = await supabase.from(CHO_NEO_MATCHING_REPORT_TABLE).insert({
        details,
        evidence_expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        introduction_id: body.introductionId,
        message_evidence: messages ?? [],
        reason: body.reason,
        reported_user_id: otherUserId,
        reporter_user_id: userId,
      });
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
  const { data, error } = await supabase.from(CHO_NEO_MEMBER_PROFILE_TABLE).select("membership_status, suspended_at").eq("user_id", user.id).is("suspended_at", null).maybeSingle();
  if (error) return unavailable("member-read-failed");
  if (data?.membership_status !== "verified_nail_member") return NextResponse.json({ error: "Khu này chỉ mở cho thành viên nghề nail đã xác nhận." }, { status: 403 });
  return { supabase, userId: user.id };
}

async function getIntroductionSafetyState(
  supabase: NonNullable<ReturnType<typeof createMatchingServiceClient>>,
  memberAUserId: string,
  memberBUserId: string,
  introductionId: string,
) {
  const [{ data: blocks, error: blockError }, { data: reports, error: reportError }] = await Promise.all([
    supabase.from(CHO_NEO_MATCHING_BLOCK_TABLE).select("blocker_user_id, blocked_user_id").or(`and(blocker_user_id.eq.${memberAUserId},blocked_user_id.eq.${memberBUserId}),and(blocker_user_id.eq.${memberBUserId},blocked_user_id.eq.${memberAUserId})`).limit(1),
    supabase.from(CHO_NEO_MATCHING_REPORT_TABLE).select("introduction_id").eq("introduction_id", introductionId).limit(1),
  ]);
  if (blockError || reportError) return null;
  return { blocked: (blocks ?? []).length > 0, reported: (reports ?? []).length > 0 };
}

function badRequest(error: string) { return NextResponse.json({ error }, { status: 400 }); }
function unavailable(reason: string) {
  console.error("[cho-neo:matching]", { reason });
  return NextResponse.json({ error: "Bàn ghép bạn chưa sẵn sàng. Thử lại sau nha.", reason }, { status: 503 });
}
