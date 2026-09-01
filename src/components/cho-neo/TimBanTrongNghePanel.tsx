"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useChoNeoMember } from "@/components/cho-neo/ChoNeoMemberProvider";
import {
  CHO_NEO_CONTACT_METHODS,
  CHO_NEO_MATCHING_AGE_RANGES,
  CHO_NEO_MATCHING_EXPERIENCE_RANGES,
  CHO_NEO_MATCHING_GENDERS,
  CHO_NEO_MATCHING_LANGUAGES,
  CHO_NEO_MATCHING_SITUATIONS,
  type ChoNeoDiscoveryScope,
} from "@/lib/cho-neo/matching";

type MatchingProfile = { ageRange: string; canShare: string; city: string; country: string; discoveryScope: ChoNeoDiscoveryScope; experienceRange: string; funLine: string; gender: string; interests: string; languages: string[]; lookingFor: string; region: string; situation: string; status: "active" | "paused" };
type GuidedAnswers = { connection: string; experience: string; workLife: string };
type ContactDraft = { contactValue: string; method: string };
type PrivateMessage = { body: string; id: string; mine: boolean; sentAt: string };
type Introduction = {
  contactHandoff: { mine: { method: string; value: string } | null; theirs: { method: string; value: string } | null };
  counterpart: { avatar_key: string | null; display_name: string; nail_role: string | null } | null;
  expiresAt: string;
  icebreaker: string | null;
  id: string;
  matchNote: string;
  myDecision: "pending" | "accepted" | "passed";
  privateTable: { lastActiveAt: string; messages: PrivateMessage[]; quietAt: string } | null;
  state: "closed" | "expired" | "mutual" | "pending" | "quiet" | "waiting";
};

const blankProfile: MatchingProfile = { ageRange: "", canShare: "", city: "", country: "", discoveryScope: "nearby", experienceRange: "", funLine: "", gender: "", interests: "", languages: [], lookingFor: "", region: "", situation: "", status: "active" };
const blankGuidedAnswers: GuidedAnswers = { connection: "", experience: "", workLife: "" };
const interestChoices = ["Cà phê", "Du lịch", "Cây cối", "Âm nhạc", "Nấu ăn", "Đi bộ"];
const connectionChoices = ["Trò chuyện", "Làm quen", "Gặp người cùng sở thích", "Tìm bạn đồng hành"];
const escapeChoices = ["Đi du lịch", "Về Việt Nam", "Ở nhà nghỉ ngơi", "Học điều mới"];

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
      {status === "checking" ? "Đang mở quầy…" : "Bước vào Quầy Xã Giao"}
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
  const [contactDrafts, setContactDrafts] = useState<Record<string, ContactDraft>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [contactOpen, setContactOpen] = useState<Record<string, boolean>>({});

  function toggleLanguage(language: string) {
    setForm((current) => ({
      ...current,
      languages: current.languages.includes(language)
        ? current.languages.filter((item) => item !== language)
        : [...current.languages, language].slice(0, 4),
    }));
  }

  function addChoice(field: keyof GuidedAnswers, choice: string) {
    setGuidedAnswers((current) => {
      if (current[field].toLocaleLowerCase("vi").includes(choice.toLocaleLowerCase("vi"))) return current;
      return { ...current, [field]: [current[field], choice].filter(Boolean).join(", ") };
    });
  }

  const callApi = useCallback(async (method: "GET" | "POST", body?: Record<string, unknown>) => {
    const token = session?.access_token;
    if (!token) throw new Error("Đăng nhập để bước vào Quầy Xã Giao nha.");
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

  useEffect(() => {
    if (!introductions.some((intro) => intro.state === "mutual")) return;
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [introductions, load]);

  async function draftProfile() {
    setDrafting(true); setMessage("");
    try {
      const result = await callApi("POST", {
        action: "draft-profile",
        city: form.city,
        country: form.country,
        region: form.region,
        situation: form.situation,
        ...guidedAnswers,
        requestId: crypto.randomUUID(),
      });
      if (!result.draft) throw new Error("Chợ Neo chưa viết được bản nháp.");
      setForm({ ...form, ...result.draft, funLine: guidedAnswers.experience, interests: guidedAnswers.workLife });
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

  async function handoff(action: "share-contact" | "remove-contact", introductionId: string) {
    const draft = contactDrafts[introductionId] ?? { contactValue: "", method: "Facebook" };
    setBusy(true); setMessage("");
    try {
      await callApi("POST", { action, introductionId, ...draft });
      setMessage(action === "share-contact"
        ? "Đã chia sẻ cách liên lạc này riêng với người bạn vừa chào."
        : "Đã thu lại cách liên lạc của bạn.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa cập nhật được cách liên lạc.");
    } finally {
      setBusy(false);
    }
  }

  async function tableAction(action: "close-table" | "keep-table" | "send-message", introductionId: string) {
    const draft = messageDrafts[introductionId] ?? "";
    setBusy(true); setMessage("");
    try {
      await callApi("POST", { action, introductionId, ...(action === "send-message" ? { message: draft } : {}) });
      if (action === "send-message") setMessageDrafts((current) => ({ ...current, [introductionId]: "" }));
      setMessage(action === "close-table" ? "Bàn đã khép lại. Khi muốn gặp thêm người trong nghề, Quầy Xã Giao vẫn còn chỗ cho bạn." : action === "keep-table" ? "Chợ Neo đã giữ bàn thêm cho hai bạn." : "");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Bàn trò chuyện chưa trả lời.");
    } finally {
      setBusy(false);
    }
  }

  if (status !== "ready" || !member) {
    return (
      <section className="tim-ban-panel tim-ban-locked" aria-labelledby="tim-ban-private-title">
        <p className="tim-ban-kicker">Quầy Xã Giao</p>
        <h2 id="tim-ban-private-title">Không có danh bạ để lướt</h2>
        <p>Đăng nhập thành viên nghề nail. Khi bạn tự bật hồ sơ, chủ quán mới có thể giới thiệu từng người một.</p>
        <button onClick={() => void ensureChoNeoMember(() => {})} type="button">{status === "checking" ? "Đang kiểm tra…" : "Mở bằng tài khoản thành viên"}</button>
      </section>
    );
  }

  return (
    <section className="tim-ban-panel" aria-labelledby="tim-ban-private-title">
      <div className="tim-ban-panel-heading">
        <div><p className="tim-ban-kicker">Góc nhỏ của {member.displayName}</p><h2 id="tim-ban-private-title">Kể một chút về bạn</h2></div>
        <span>{form.status === "paused" ? "Đang tạm dừng" : "Không công khai"}</span>
      </div>

      {introductions.length > 0 && <div className="tim-ban-introductions">
        {introductions.map((intro) => <article key={intro.id}>
          <small>{intro.state === "mutual" ? "👋 Hai người đã chào nhau" : intro.state === "quiet" ? "Bàn đã yên một tuần" : intro.state === "waiting" ? "Đã chào · đang chờ người kia" : intro.state === "expired" ? "Lời chào đã hết hạn" : intro.state === "closed" ? "Bàn đã khép lại" : `Lời chào mở đến ${new Date(intro.expiresAt).toLocaleString("vi-VN")}`}</small>
          <h3>{intro.counterpart?.display_name ?? "Một người trong nghề"}</h3>
          <p>{intro.matchNote}</p>
          {intro.state === "pending" && <div className="tim-ban-row"><button disabled={busy} onClick={() => void act("decide", intro.id, { decision: "accepted" })} type="button">👋 Chào bạn</button><button className="quiet" disabled={busy} onClick={() => void act("decide", intro.id, { decision: "passed" })} type="button">Để lần khác</button></div>}
          {intro.state === "quiet" && <section className="tim-ban-private-table"><h4>Bàn đã yên một tuần</h4><p>Muốn nói chuyện tiếp, Chợ Neo vẫn giữ chỗ cho hai bạn.</p><div className="tim-ban-row"><button disabled={busy} onClick={() => void tableAction("keep-table", intro.id)} type="button">Giữ bàn thêm</button><button className="quiet" disabled={busy} onClick={() => void tableAction("close-table", intro.id)} type="button">Khép lại tại đây</button></div></section>}
          {intro.state === "mutual" && <section className="tim-ban-private-table" aria-label="Bàn trò chuyện riêng">
            <div className="tim-ban-table-heading"><div><h4>Bàn trò chuyện riêng</h4><p>Chợ Neo đã mời hai bạn ngồi lại. Cứ nói chuyện tự nhiên nha.</p></div><button className="quiet tim-ban-table-close" disabled={busy} onClick={() => void tableAction("close-table", intro.id)} type="button">Khép bàn</button></div>
            <div className="tim-ban-chat-log" aria-live="polite">
              {intro.privateTable?.messages.length ? intro.privateTable.messages.map((chat) => <div className={chat.mine ? "tim-ban-chat-message mine" : "tim-ban-chat-message"} key={chat.id}><span>{chat.body}</span><small>{new Date(chat.sentAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</small></div>) : <p className="tim-ban-chat-welcome">“{intro.icebreaker}”</p>}
            </div>
            <div className="tim-ban-chat-compose"><textarea aria-label="Lời nhắn" maxLength={500} onChange={(event) => setMessageDrafts((current) => ({ ...current, [intro.id]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); if ((messageDrafts[intro.id]?.trim().length ?? 0) > 0) void tableAction("send-message", intro.id); } }} placeholder="Nhắn một điều…" rows={2} value={messageDrafts[intro.id] ?? ""} /><button disabled={busy || (messageDrafts[intro.id]?.trim().length ?? 0) === 0} onClick={() => void tableAction("send-message", intro.id)} type="button">Gửi</button></div>
            <small className="tim-ban-table-note">Bàn vẫn mở khi hai bạn còn trò chuyện. Sau 7 ngày yên lặng, Chợ Neo sẽ hỏi trước khi khép bàn.</small>
            {(intro.privateTable?.messages.length ?? 0) > 0 && !contactOpen[intro.id] && !intro.contactHandoff.mine && !intro.contactHandoff.theirs && <button className="quiet tim-ban-contact-open" onClick={() => setContactOpen((current) => ({ ...current, [intro.id]: true }))} type="button">Muốn giữ liên lạc sau Chợ Neo?</button>}
          {(contactOpen[intro.id] || intro.contactHandoff.mine || intro.contactHandoff.theirs) && <section className="tim-ban-handoff" aria-label="Chia sẻ liên lạc riêng">
            <h4>Giữ liên lạc sau Chợ Neo</h4>
            <p>Nếu thấy hợp nhau, bạn có thể tự nguyện chia sẻ một cách liên lạc riêng.</p>
            {intro.contactHandoff.theirs && <div className="tim-ban-contact-card"><small>{intro.counterpart?.display_name ?? "Người kia"} đã chia sẻ</small><strong>{intro.contactHandoff.theirs.method}</strong><span>{intro.contactHandoff.theirs.value}</span></div>}
            {intro.contactHandoff.mine ? <div className="tim-ban-row"><span className="tim-ban-my-contact">Bạn đang chia sẻ: <b>{intro.contactHandoff.mine.method}</b> · {intro.contactHandoff.mine.value}</span><button className="quiet" disabled={busy} onClick={() => void handoff("remove-contact", intro.id)} type="button">Thu lại</button></div> : <div className="tim-ban-contact-form">
              <select aria-label="Cách liên lạc" onChange={(e) => setContactDrafts({ ...contactDrafts, [intro.id]: { ...(contactDrafts[intro.id] ?? { contactValue: "" }), method: e.target.value } })} value={contactDrafts[intro.id]?.method ?? "Facebook"}>{CHO_NEO_CONTACT_METHODS.map((method) => <option key={method}>{method}</option>)}</select>
              <input aria-label="Tên tài khoản hoặc đường dẫn" maxLength={180} onChange={(e) => setContactDrafts({ ...contactDrafts, [intro.id]: { ...(contactDrafts[intro.id] ?? { method: "Facebook" }), contactValue: e.target.value } })} placeholder="Tên tài khoản hoặc đường dẫn hồ sơ" value={contactDrafts[intro.id]?.contactValue ?? ""} />
              <button disabled={busy || (contactDrafts[intro.id]?.contactValue.trim().length ?? 0) < 3} onClick={() => void handoff("share-contact", intro.id)} type="button">Chia sẻ riêng</button>
            </div>}
            <small>Không gửi tiền, giấy tờ hoặc thông tin nhạy cảm cho người bạn chưa tin cậy.</small>
          </section>}
            <div className="tim-ban-row tim-ban-safety-actions"><button className="quiet" disabled={busy} onClick={() => void act("block", intro.id)} type="button">Chặn</button><button className="danger" disabled={busy} onClick={() => void act("report", intro.id, { reason: "other" })} type="button">Chặn & báo cáo</button></div>
          </section>}
        </article>)}
      </div>}

      <form onSubmit={save}>
        <div className="tim-ban-location-grid">
          <label>🌎 Quốc gia<input maxLength={80} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Ví dụ: Canada" required value={form.country} /></label>
          <label>Vùng · Tỉnh/Bang<input maxLength={80} onChange={(e) => setForm({ ...form, region: e.target.value })} placeholder="Ví dụ: Alberta" value={form.region} /></label>
          <label>📍 Thành phố<input maxLength={60} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Ví dụ: Calgary" required value={form.city} /></label>
        </div>
        <fieldset className="tim-ban-discovery"><legend>Bạn muốn khám phá bạn mới ở đâu?</legend>
          <label><input checked={form.discoveryScope === "nearby"} name="discovery-scope" onChange={() => setForm({ ...form, discoveryScope: "nearby" })} type="radio" /> <span>📍 <b>Gần tôi</b><small>Cùng thành phố hoặc vùng</small></span></label>
          <label><input checked={form.discoveryScope === "country"} name="discovery-scope" onChange={() => setForm({ ...form, discoveryScope: "country" })} type="radio" /> <span>🏳️ <b>Trong nước</b><small>Bất cứ đâu trong cùng quốc gia</small></span></label>
          <label><input checked={form.discoveryScope === "worldwide"} name="discovery-scope" onChange={() => setForm({ ...form, discoveryScope: "worldwide" })} type="radio" /> <span>🌎 <b>Khắp nơi</b><small>Ngành nail khắp thế giới</small></span></label>
        </fieldset>
        <div className="tim-ban-professional-grid">
          <label>💅 Vai trò<select onChange={(e) => setForm({ ...form, situation: e.target.value })} required value={form.situation}><option value="">Chọn vai trò</option>{CHO_NEO_MATCHING_SITUATIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>🧰 Kinh nghiệm<select onChange={(e) => setForm({ ...form, experienceRange: e.target.value })} required value={form.experienceRange}><option value="">Chọn số năm</option>{CHO_NEO_MATCHING_EXPERIENCE_RANGES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>🎂 Độ tuổi <small>không bắt buộc</small><select onChange={(e) => setForm({ ...form, ageRange: e.target.value })} value={form.ageRange}><option value="">Không hiển thị</option>{CHO_NEO_MATCHING_AGE_RANGES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>👤 Giới tính <small>không bắt buộc</small><select onChange={(e) => setForm({ ...form, gender: e.target.value })} value={form.gender}><option value="">Không hiển thị</option>{CHO_NEO_MATCHING_GENDERS.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <fieldset className="tim-ban-languages"><legend>🗣️ Ngôn ngữ bạn thường dùng</legend>{CHO_NEO_MATCHING_LANGUAGES.map((language) => <label key={language}><input checked={form.languages.includes(language)} onChange={() => toggleLanguage(language)} type="checkbox" /><span>{language}</span></label>)}</fieldset>
        <section className="tim-ban-guide" aria-labelledby="tim-ban-guide-title">
          <div className="tim-ban-guide-heading">
            <div><p className="tim-ban-kicker">Chợ Neo giúp bạn viết</p><h3 id="tim-ban-guide-title">Kể Chợ Neo nghe một chút</h3></div>
            <button className="quiet" onClick={() => setGuideOpen((open) => !open)} type="button">{guideOpen ? "Thu gọn" : "Kể thêm"}</button>
          </div>
          <p>Bạn không cần viết hay. Cứ kể thật bằng tiếng Việt, English hoặc Vietlish. Chợ Neo chỉ giúp sắp chữ—không tự bật hồ sơ.</p>
          {guideOpen && <div className="tim-ban-guide-questions">
            <div className="tim-ban-guide-question"><label htmlFor="tim-ban-interests">☕ Bạn thích gì ngoài công việc?</label><span className="tim-ban-choices">{interestChoices.map((choice) => <button key={choice} onClick={() => addChoice("workLife", choice)} type="button">{choice}</button>)}</span><textarea id="tim-ban-interests" maxLength={320} onChange={(e) => setGuidedAnswers({ ...guidedAnswers, workLife: e.target.value })} placeholder="Chạm vài lựa chọn hoặc kể thêm…" value={guidedAnswers.workLife} /></div>
            <div className="tim-ban-guide-question"><label htmlFor="tim-ban-purpose">💬 Bạn đến Chợ Neo để làm gì?</label><span className="tim-ban-choices">{connectionChoices.map((choice) => <button key={choice} onClick={() => addChoice("connection", choice)} type="button">{choice}</button>)}</span><textarea id="tim-ban-purpose" maxLength={320} onChange={(e) => setGuidedAnswers({ ...guidedAnswers, connection: e.target.value })} placeholder="Chạm vài lựa chọn hoặc kể thêm…" value={guidedAnswers.connection} /></div>
            <div className="tim-ban-guide-question"><label htmlFor="tim-ban-month-off">✈️ Nếu được nghỉ một tháng, bạn muốn đi đâu hoặc làm gì?</label><span className="tim-ban-choices">{escapeChoices.map((choice) => <button key={choice} onClick={() => addChoice("experience", choice)} type="button">{choice}</button>)}</span><textarea id="tim-ban-month-off" maxLength={320} onChange={(e) => setGuidedAnswers({ ...guidedAnswers, experience: e.target.value })} placeholder="Ví dụ: Tôi sẽ biến mất ở Nhật!" value={guidedAnswers.experience} /></div>
            <button disabled={drafting || busy} onClick={() => void draftProfile()} type="button">{drafting ? "Đang lắng nghe & viết…" : "Giúp tôi viết lời giới thiệu"}</button>
          </div>}
        </section>
        <label>Bạn đến Chợ Neo để…<textarea maxLength={240} onChange={(e) => setForm({ ...form, lookingFor: e.target.value })} placeholder="Bản nháp sẽ hiện ở đây để bạn sửa" required value={form.lookingFor} /></label>
        <label>Một chút về bạn<textarea maxLength={240} onChange={(e) => setForm({ ...form, canShare: e.target.value })} placeholder="Bản nháp sẽ hiện ở đây để bạn sửa" required value={form.canShare} /></label>
        {(form.lookingFor || form.canShare) && <section className="tim-ban-profile-preview" aria-label="Xem trước lời giới thiệu">
          <strong>🌿 {member.displayName}</strong>
          {(form.city || form.country) && <span>📍 {[form.city, form.country].filter(Boolean).join(", ")}</span>}
          {form.situation && <span>💅 {form.situation}{form.experienceRange ? ` · ${form.experienceRange}` : ""}</span>}
          {form.languages.length > 0 && <span>🗣️ {form.languages.join(" · ")}</span>}
          {(form.ageRange || form.gender) && <span>Thông tin tự chọn: {[form.ageRange, form.gender].filter(Boolean).join(" · ")}</span>}
          {form.canShare && <div><b>Một chút về {member.displayName}</b><p>“{form.canShare}”</p></div>}
          {form.interests && <div><b>Hay quan tâm</b><p>{form.interests}</p></div>}
          {form.lookingFor && <div><b>Đến Chợ Neo để</b><p>{form.lookingFor}</p></div>}
          {form.funLine && <div><b>Một câu vui</b><p>“{form.funLine}”</p></div>}
          <span>{form.discoveryScope === "worldwide" ? "🌎 Khắp nơi" : form.discoveryScope === "country" ? `🏳️ Trong ${form.country || "nước"}` : "📍 Gần tôi"}</span>
          <small>👋 Người khác chỉ có thể chào. Hai bên cùng chào nhau rồi mới mở kết nối.</small>
        </section>}
        <label className="tim-ban-consent"><input checked={consentAccepted} onChange={(e) => setConsentAccepted(e.target.checked)} type="checkbox" /> Tôi đồng ý để chủ quán dùng riêng các câu trả lời này để giới thiệu người phù hợp. Lời giới thiệu không xuất hiện trong danh bạ.</label>
        <div className="tim-ban-row"><button disabled={busy || !consentAccepted} type="submit">{busy ? "Đang lưu…" : loaded ? "Lưu lời giới thiệu" : "Đúng là tôi · bật lời giới thiệu"}</button>{loaded && <button className="quiet" disabled={busy} onClick={() => void callApi("POST", { action: "pause-profile" }).then(load)} type="button">Tạm dừng</button>}</div>
      </form>
      {message && <p className="tim-ban-message" role="status">{message}</p>}
    </section>
  );
}
