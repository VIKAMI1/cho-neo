"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChoNeoBetaFeedback } from "@/components/cho-neo/ChoNeoBetaFeedback";
import { ChoNeoMeoVatEditor } from "@/components/cho-neo/ChoNeoMeoVatEditor";
import { useChoNeoMember } from "@/components/cho-neo/ChoNeoMemberProvider";
import { ChoNeoMobileVillageNav } from "@/components/cho-neo/ChoNeoMobileVillageNav";
import { ChoNeoRoomTopBar } from "@/components/cho-neo/ChoNeoRoomTopBar";
import { ChoNeoRoomShell } from "@/components/cho-neo/ChoNeoRoomShell";
import { ChoNeoTimeAmbience } from "@/components/cho-neo/ChoNeoTimeAmbience";
import { ChoNeoVillageRail } from "@/components/cho-neo/ChoNeoVillageRail";
import { CHO_NEO_MEO_VAT_CATEGORIES, type ChoNeoMeoVatCategory, type ChoNeoMeoVatReportReason, type ChoNeoMeoVatTip } from "@/lib/cho-neo/meo-vat";

const reportReasons: { id: ChoNeoMeoVatReportReason; label: string }[] = [
  { id: "inappropriate", label: "Nội dung không phù hợp" },
  { id: "spam", label: "Spam hoặc quảng cáo" },
  { id: "unsafe", label: "Thông tin có thể gây hại" },
  { id: "other", label: "Lý do khác" },
];

export function ChoNeoMeoVatDetail({ tipId }: { tipId: string }) {
  const { ensureChoNeoMember, openProfileSheet, profile, session } = useChoNeoMember();
  const [tip, setTip] = useState<ChoNeoMeoVatTip | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ChoNeoMeoVatReportReason>("inappropriate");
  const [reportDetails, setReportDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    setIsEmbedded(new URLSearchParams(window.location.search).get("embed") === "1");
  }, []);

  async function loadTip() {
    setLoading(true);
    try {
      const response = await fetch(`/api/meo-vat/${tipId}`, {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error ?? "Chưa tải được mẹo này.");
      setTip(payload.tip ?? null);
    } catch (error) {
      setTip(null);
      setNotice(error instanceof Error ? error.message : "Chưa tải được mẹo này.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadTip(); }, [tipId, session?.access_token]);

  async function saveEdit(input: { body: string; category: ChoNeoMeoVatCategory; title: string }) {
    if (!session?.access_token) return setNotice("Đăng nhập lại để cập nhật mẹo nha.");
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/meo-vat/${tipId}`, {
        body: JSON.stringify(input),
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        method: "PATCH",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Chưa cập nhật được mẹo.");
      setEditing(false);
      setNotice("Đã cập nhật chia sẻ của bạn.");
      await loadTip();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa cập nhật được mẹo.");
    } finally { setBusy(false); }
  }

  async function deleteTip() {
    if (!session?.access_token || !window.confirm("Xóa mẹo này khỏi Mẹo Vặt?")) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/meo-vat/${tipId}`, { headers: { Authorization: `Bearer ${session.access_token}` }, method: "DELETE" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Chưa xóa được mẹo.");
        window.location.assign(isEmbedded ? "/meo-vat/cua-toi?embed=1" : "/meo-vat/cua-toi");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa xóa được mẹo.");
      setBusy(false);
    }
  }

  async function submitReport() {
    if (!session?.access_token) return setNotice("Đăng nhập lại để gửi báo cáo nha.");
    setBusy(true); setNotice("");
    try {
      const response = await fetch(`/api/meo-vat/${tipId}/report`, {
        body: JSON.stringify({ details: reportDetails, reason: reportReason }),
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Chưa gửi được báo cáo.");
      setReportOpen(false); setReportDetails(""); setNotice("Báo cáo đã được gửi để Chợ Neo xem lại.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Chưa gửi được báo cáo.");
    } finally { setBusy(false); }
  }

  function requestReport() {
    void ensureChoNeoMember(async () => { setReportOpen(true); setNotice(""); });
  }

  return <>
    <ChoNeoTimeAmbience />
    <ChoNeoRoomShell currentNavId="meo-vat" className="meo-vat-detail-shell">
      <div className={`meo-vat-detail-layout${isEmbedded ? " meo-vat-detail-layout--embedded" : ""}`}>
        {!isEmbedded ? <ChoNeoVillageRail currentId="meo-vat" /> : null}
        <div className="meo-vat-detail-content">
          {!isEmbedded ? <ChoNeoMobileVillageNav currentId="meo-vat" /> : null}
          {!isEmbedded ? <ChoNeoRoomTopBar ariaLabel="Mẹo Vặt controls" feedback={<ChoNeoBetaFeedback />} memberProfile={profile} onMemberClick={() => { void ensureChoNeoMember(async () => openProfileSheet()); }} /> : null}
          <Link className="meo-vat-back" href={isEmbedded ? "/meo-vat?embed=1" : "/meo-vat"}>← Về Mẹo Vặt</Link>
          {loading ? <p className="meo-vat-detail-message">Đang mở chia sẻ...</p> : !tip ? <section className="meo-vat-detail-message"><h1>Chưa tìm thấy mẹo</h1><p>{notice || "Mẹo này có thể đã được gỡ hoặc đường dẫn chưa đúng."}</p></section> : <article className="meo-vat-detail-card">
            {editing ? <>
              <div className="meo-vat-detail-heading"><p className="meo-vat-detail-eyebrow">Chỉnh sửa chia sẻ</p><button className="meo-vat-action" onClick={() => setEditing(false)} type="button">Hủy</button></div>
              <ChoNeoMeoVatEditor initialBody={tip.body} initialCategory={tip.category} initialTitle={tip.title} isBusy={busy} notice={notice} onSubmit={(input) => { void saveEdit(input); }} submitLabel="Lưu thay đổi" />
            </> : <>
              <div className="meo-vat-detail-heading"><span className="meo-vat-detail-category">{categoryLabel(tip.category)}</span>{tip.isOwner && tip.status ? <span className={`meo-vat-tip-status meo-vat-tip-status--${tip.status}`}>{tipStatusLabel(tip.status)}</span> : null}</div>
              <h1>{tip.title}</h1>
              <p className="meo-vat-detail-author">{tip.authorName} <span aria-hidden="true">·</span> {formatDate(tip.createdAt)}{tip.updatedAt && tip.updatedAt !== tip.createdAt ? " · Đã cập nhật" : ""}</p>
              {tip.isOwner && tip.status !== "published" ? <p className="meo-vat-detail-review-note">Chia sẻ này chỉ hiển thị với bạn trong lúc chờ Chợ Neo xem lại.</p> : null}
              <div className="meo-vat-detail-body">{tip.body}</div>
              {notice ? <p className="meo-vat-notice" role="status">{notice}</p> : null}
              <div className="meo-vat-detail-actions">
                {tip.isOwner ? <><button className="meo-vat-action meo-vat-action-primary" disabled={busy} onClick={() => { setEditing(true); setNotice(""); }} type="button">Chỉnh sửa</button><button className="meo-vat-action meo-vat-action-danger" disabled={busy} onClick={() => { void deleteTip(); }} type="button">Xóa mẹo</button><Link className="meo-vat-action" href="/meo-vat/cua-toi">Mẹo của tôi</Link></> : <button className="meo-vat-action" onClick={requestReport} type="button">Báo cáo mẹo</button>}
              </div>
              {reportOpen ? <form className="meo-vat-report-form" onSubmit={(event) => { event.preventDefault(); void submitReport(); }}>
                <label><span>Lý do báo cáo</span><select onChange={(event) => setReportReason(event.target.value as ChoNeoMeoVatReportReason)} value={reportReason}>{reportReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.label}</option>)}</select></label>
                <label><span>Thông tin thêm (không bắt buộc)</span><textarea maxLength={500} onChange={(event) => setReportDetails(event.target.value)} rows={4} value={reportDetails} /></label>
                <div className="meo-vat-detail-actions"><button className="meo-vat-action meo-vat-action-primary" disabled={busy} type="submit">{busy ? "Đang gửi..." : "Gửi báo cáo"}</button><button className="meo-vat-action" onClick={() => setReportOpen(false)} type="button">Đóng</button></div>
              </form> : null}
            </>}
          </article>}
        </div>
      </div>
    </ChoNeoRoomShell>
    <ChoNeoMeoVatDetailStyles />
  </>;
}

function categoryLabel(category: ChoNeoMeoVatCategory) { return CHO_NEO_MEO_VAT_CATEGORIES.find((item) => item.id === category)?.label ?? category; }
function tipStatusLabel(status: NonNullable<ChoNeoMeoVatTip["status"]>) { return ({ hidden: "Đang ẩn", pending_review: "Đang chờ xem", published: "Đã đăng", rejected: "Chưa được đăng" })[status]; }
function formatDate(value: string) { return new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }

function ChoNeoMeoVatDetailStyles() {
  return <style jsx global>{`
    .meo-vat-detail-shell { min-height:100vh; color:#38251c; background:#f8eedb; font-family:var(--font-cho-neo-ui),system-ui,sans-serif; }
    .meo-vat-detail-layout { display:grid; grid-template-columns:148px minmax(0,1fr); gap:clamp(14px,2vw,26px); width:min(1180px,100%); margin:0 auto; padding:clamp(18px,3vw,34px); }
    .meo-vat-detail-layout--embedded { display:block; width:100%; padding:0; }
    .meo-vat-detail-content { min-width:0; }
    .meo-vat-detail-layout .cho-neo-village-rail { margin-top:55px; }
    .meo-vat-detail-content .cho-neo-room-top-bar { border-color:rgba(97,57,30,.18); }
    .meo-vat-detail-content .cho-neo-room-top-bar__back,.meo-vat-detail-content .cho-neo-room-top-bar__member,.meo-vat-detail-content .cho-neo-room-top-bar :global(.cho-neo-feedback-button) { color:#603521; border-color:rgba(97,57,30,.2); background:rgba(255,255,255,.35); }
    .meo-vat-detail-content .cho-neo-room-top-bar__member strong { color:#603521; }
    .meo-vat-back { display:inline-flex; margin:4px 0 15px; color:#783e2a; font-weight:650; text-decoration:none; }
    .meo-vat-detail-card,.meo-vat-detail-message { border:1px solid rgba(114,67,39,.14); border-radius:22px; padding:clamp(20px,4vw,42px); background:rgba(255,251,242,.84); box-shadow:0 14px 34px rgba(89,51,29,.06); }
    .meo-vat-detail-message { max-width:760px; color:#755943; }
    .meo-vat-detail-heading { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:17px; }
    .meo-vat-detail-category { width:max-content; border-radius:999px; padding:6px 10px; color:#7e4f31; background:#f7e7c8; font-size:.75rem; font-weight:700; }
    .meo-vat-tip-status { border-radius:999px; padding:5px 9px; color:#725133; background:#f4e9d3; font-size:.72rem; font-weight:650; }
    .meo-vat-tip-status--published { color:#376447; background:#e3f0df; }
    .meo-vat-tip-status--rejected,.meo-vat-tip-status--hidden { color:#804137; background:#f4e1d8; }
    .meo-vat-detail-eyebrow { flex:1; margin:0; color:#946242; font-size:.73rem; font-weight:700; letter-spacing:.1em; text-transform:uppercase; }
    .meo-vat-detail-card h1,.meo-vat-detail-message h1 { margin:0; color:#4f2b20; font-family:var(--font-cho-neo-display),Georgia,serif; font-size:clamp(34px,6vw,58px); font-weight:500; line-height:.99; }
    .meo-vat-detail-author { margin:14px 0 22px; color:#8c6d55; font-size:.86rem; }
    .meo-vat-detail-review-note { border-radius:12px; padding:12px 14px; color:#684832; background:#f4e9d3; line-height:1.5; }
    .meo-vat-detail-body { color:#533b2c; font-size:clamp(16px,2vw,18px); line-height:1.8; white-space:pre-wrap; overflow-wrap:anywhere; }
    .meo-vat-detail-actions { display:flex; flex-wrap:wrap; gap:9px; margin-top:24px; }
    .meo-vat-action { display:inline-flex; align-items:center; justify-content:center; min-height:42px; border:1px solid rgba(93,45,29,.18); border-radius:12px; padding:9px 13px; color:#603521; background:rgba(255,255,255,.65); font:inherit; font-weight:650; text-decoration:none; cursor:pointer; }
    .meo-vat-action:disabled { opacity:.6; cursor:wait; }
    .meo-vat-action-primary { border-color:#763a27; color:#fff8eb; background:#783e2a; }
    .meo-vat-action-danger { color:#843c30; background:#f7e9df; }
    .meo-vat-report-form { display:grid; gap:12px; margin-top:18px; border-top:1px solid rgba(114,67,39,.15); padding-top:18px; }
    .meo-vat-report-form label { display:grid; gap:7px; color:#684832; font-size:.87rem; font-weight:650; }
    .meo-vat-report-form select,.meo-vat-report-form textarea { width:100%; box-sizing:border-box; border:1px solid rgba(105,67,43,.2); border-radius:12px; padding:11px 13px; color:#432c20; background:rgba(255,255,255,.82); font:inherit; }
    .meo-vat-report-form textarea { resize:vertical; }
    .meo-vat-notice { margin:18px 0 0; border-radius:12px; padding:11px 13px; color:#5b3a27; background:#f5e7c9; line-height:1.5; }
    @media(max-width:820px) { .meo-vat-detail-layout { display:block; padding:0 14px 28px; } .meo-vat-detail-layout > .cho-neo-village-rail { display:none; } .meo-vat-detail-content .cho-neo-room-top-bar { margin-top:10px; } }
    @media(max-width:620px) { .meo-vat-detail-layout { padding:0 12px 24px; } .meo-vat-detail-card,.meo-vat-detail-message { border-radius:18px; padding:22px 18px; } }
  `}</style>;
}
