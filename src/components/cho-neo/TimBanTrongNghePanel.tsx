"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useChoNeoMember } from "@/components/cho-neo/ChoNeoMemberProvider";
import { CHO_NEO_MATCHING_SITUATIONS } from "@/lib/cho-neo/matching";

type MatchingProfile = { canShare: string; city: string; lookingFor: string; situation: string; status: "active" | "paused" };
type GuidedAnswers = { connection: string; experience: string; workLife: string };
type Introduction = {
  counterpart: { avatar_key: string | null; display_name: string; nail_role: string | null } | null;
  expiresAt: string;
  icebreaker: string | null;
  id: string;
  matchNote: string;
  myDecision: "pending" | "accepted" | "passed";
  state: "closed" | "expired" | "mutual" | "pending" | "waiting";
};

const blankProfile: MatchingProfile = { canShare: "", city: "", lookingFor: "", situation: "", status: "active" };
const blankGuidedAnswers: GuidedAnswers = { connection: "", experience: "", workLife: "" };

export function TimBanTrongNgheStartButton() {
  const { ensureChoNeoMember, status } = useChoNeoMember();

  async function start() {
    await ensureChoNeoMember(() => {
      document.getElementById("tim-ban-private-title")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <button disabled={status === "checking"} onClick={() => void start()} type="button">
      {status === "checking" ? "Đang mở bàn…" : "Bắt đầu tìm bạn"}
    </button>
  );
}

export function TimBanTrongNghePanel() {
  const { ensureChoNeoMember, profile: member, session, status } = useChoNeoMember();
  const [form, setForm] = useState<MatchingProfile>(blankProfile);
  const [introductions, setIntroductions] = useState<Introduction[]>([]);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [guidedAnswers, setGuidedAnswers] = useState<GuidedAnswers>(blankGuidedAnswers);
  const [drafting, setDrafting] = useState(false);

  const callApi = useCallback(async (method: "GET" | "POST", body?: Record<string, unknown>) => {
    const token = session?.access_token;
    if (!token) throw new Error("Đăng nhập để mở bàn ghép bạn nha.");
    const response = await fetch("/api/cho-neo/tim-ban-trong-nghe", {
      body: body ? JSON.stringify(body) : undefined,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      method,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Bàn ghép bạn chưa trả lời.");
    return result;
  }, [session?.access_token]);

  const load = useCallback(async () => {
    if (status !== "ready" || !session?.access_token) return;
    try {
      const result = await callApi("GET");
      if (result.profile) {
        setForm(result.profile);
        setGuideOpen(false);
      }
      setIntroductions(result.introductions ?? []);
      setLoaded(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa mở được bàn ghép bạn.");
    }
  }, [callApi, session?.access_token, status]);

  useEffect(() => { void load(); }, [load]);

  async function draftProfile() {
    setDrafting(true); setMessage("");
    try {
      const result = await callApi("POST", {
        action: "draft-profile",
        city: form.city,
        situation: form.situation,
        ...guidedAnswers,
        requestId: crypto.randomUUID(),
      });
      if (!result.draft) throw new Error("Chợ Neo chưa viết được bản nháp.");
      setForm({ ...form, ...result.draft });
      setGuideOpen(false);
      setMessage("Đây chỉ là bản nháp. Đọc lại, sửa cho đúng giọng của bạn rồi mới bật hồ sơ nha.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chợ Neo chưa viết giúp được lúc này.");
    } finally {
      setDrafting(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      await callApi("POST", { action: "save-profile", ...form, consentAccepted });
      setMessage("Đã bật hồ sơ riêng. Chỉ chủ quán dùng nó để tìm một lời giới thiệu phù hợp.");
      setConsentAccepted(false);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa lưu được hồ sơ."); }
    finally { setBusy(false); }
  }

  async function act(action: "block" | "decide" | "report", introductionId: string, extras: Record<string, unknown> = {}) {
    setBusy(true); setMessage("");
    try {
      await callApi("POST", { action, introductionId, ...extras });
      setMessage(action === "report" ? "Đã chặn và gửi báo cáo riêng cho Chợ Neo." : action === "block" ? "Đã chặn. Hai người sẽ không được ghép lại." : "Đã ghi nhận lựa chọn của bạn.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa lưu được lựa chọn."); }
    finally { setBusy(false); }
  }

  if (status !== "ready" || !member) {
    return (
      <section className="tim-ban-panel tim-ban-locked" aria-labelledby="tim-ban-private-title">
        <p className="tim-ban-kicker">Phòng riêng</p>
        <h2 id="tim-ban-private-title">Không có danh bạ để lướt</h2>
        <p>Đăng nhập thành viên nghề nail. Khi bạn tự bật hồ sơ, chủ quán mới có thể giới thiệu từng người một.</p>
        <button onClick={() => void ensureChoNeoMember(() => {})} type="button">{status === "checking" ? "Đang kiểm tra…" : "Mở bằng tài khoản thành viên"}</button>
      </section>
    );
  }

  return (
    <section className="tim-ban-panel" aria-labelledby="tim-ban-private-title">
      <div className="tim-ban-panel-heading">
        <div><p className="tim-ban-kicker">Bàn riêng của {member.displayName}</p><h2 id="tim-ban-private-title">Một lời giới thiệu mỗi lần</h2></div>
        <span>{form.status === "paused" ? "Đang tạm dừng" : "Không công khai"}</span>
      </div>

      {introductions.length > 0 && <div className="tim-ban-introductions">
        {introductions.map((intro) => <article key={intro.id}>
          <small>{intro.state === "mutual" ? "Cả hai đã mở cửa" : intro.state === "waiting" ? "Đang chờ người kia" : intro.state === "expired" ? "Đã hết hạn" : intro.state === "closed" ? "Đã khép lại" : `Mở đến ${new Date(intro.expiresAt).toLocaleString("vi-VN")}`}</small>
          <h3>{intro.counterpart?.display_name ?? "Một người trong nghề"}</h3>
          <p>{intro.matchNote}</p>
          {intro.icebreaker && <blockquote>“{intro.icebreaker}”</blockquote>}
          {intro.state === "pending" && <div className="tim-ban-row"><button disabled={busy} onClick={() => void act("decide", intro.id, { decision: "accepted" })} type="button">Muốn làm quen</button><button className="quiet" disabled={busy} onClick={() => void act("decide", intro.id, { decision: "passed" })} type="button">Để lần khác</button></div>}
          {intro.state === "mutual" && <div className="tim-ban-row"><button className="quiet" disabled={busy} onClick={() => void act("block", intro.id)} type="button">Chặn</button><button className="danger" disabled={busy} onClick={() => void act("report", intro.id, { reason: "other" })} type="button">Chặn & báo cáo</button></div>}
        </article>)}
      </div>}

      <form onSubmit={save}>
        <label>Thành phố<input maxLength={60} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ví dụ: Calgary" required value={form.city} /></label>
        <label>Hoàn cảnh hiện tại<select onChange={(e) => setForm({ ...form, situation: e.target.value })} required value={form.situation}><option value="">Chọn một điều</option>{CHO_NEO_MATCHING_SITUATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
        <section className="tim-ban-guide" aria-labelledby="tim-ban-guide-title">
          <div className="tim-ban-guide-heading">
            <div><p className="tim-ban-kicker">Chợ Neo giúp bạn viết</p><h3 id="tim-ban-guide-title">Kể Chợ Neo nghe một chút</h3></div>
            <button className="quiet" onClick={() => setGuideOpen((open) => !open)} type="button">{guideOpen ? "Thu gọn" : "Kể thêm"}</button>
          </div>
          <p>Bạn không cần viết hay. Cứ kể thật bằng tiếng Việt, English hoặc Vietlish. Chợ Neo chỉ giúp sắp chữ—không tự bật hồ sơ.</p>
          {guideOpen && <div className="tim-ban-guide-questions">
            <label>Dạo này trong cuộc sống, điều gì đang nằm trong lòng bạn?<textarea maxLength={320} onChange={(e) => setGuidedAnswers({ ...guidedAnswers, workLife: e.target.value })} placeholder="Ví dụ: Đi làm nhiều nên ít có cơ hội gặp gỡ…" value={guidedAnswers.workLife} /></label>
            <label>Bạn muốn gặp một người như thế nào, và hai người có thể cùng chia sẻ điều gì?<textarea maxLength={320} onChange={(e) => setGuidedAnswers({ ...guidedAnswers, connection: e.target.value })} placeholder="Ví dụ: Một người bạn nam biết lắng nghe, cùng trò chuyện và đi du lịch…" value={guidedAnswers.connection} /></label>
            <label>Nếu hợp nhau, bạn mong mối quan hệ có thể đi đến đâu? Bạn mang điều gì chân thành vào mối quan hệ này?<textarea maxLength={320} onChange={(e) => setGuidedAnswers({ ...guidedAnswers, experience: e.target.value })} placeholder="Ví dụ: Cởi mở để tiến xa hơn; tôi biết lắng nghe và tôn trọng cảm xúc…" value={guidedAnswers.experience} /></label>
            <button disabled={drafting || busy} onClick={() => void draftProfile()} type="button">{drafting ? "Đang lắng nghe & viết…" : "Giúp tôi viết lời giới thiệu"}</button>
          </div>}
        </section>
        <label>Bạn muốn tìm một người như thế nào?<textarea maxLength={240} onChange={(e) => setForm({ ...form, lookingFor: e.target.value })} placeholder="Bản nháp sẽ hiện ở đây để bạn sửa" required value={form.lookingFor} /></label>
        <label>Bạn có thể mang điều gì vào mối quan hệ này?<textarea maxLength={240} onChange={(e) => setForm({ ...form, canShare: e.target.value })} placeholder="Bản nháp sẽ hiện ở đây để bạn sửa" required value={form.canShare} /></label>
        <label className="tim-ban-consent"><input checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} type="checkbox" /> Tôi đồng ý để chủ quán dùng riêng bốn câu trả lời này để ghép bạn. Hồ sơ không xuất hiện trong danh bạ.</label>
        <div className="tim-ban-row"><button disabled={busy || !consentAccepted} type="submit">{busy ? "Đang lưu…" : loaded ? "Lưu & bật ghép bạn" : "Bật hồ sơ riêng"}</button>{loaded && <button className="quiet" disabled={busy} onClick={() => void callApi("POST", { action: "pause-profile" }).then(load)} type="button">Tạm dừng</button>}</div>
      </form>
      {message && <p className="tim-ban-message" role="status">{message}</p>}
    </section>
  );
}
