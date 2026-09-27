"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CHO_NEO_MEO_VAT_CATEGORIES, type ChoNeoMeoVatStatus, type ChoNeoMeoVatTip } from "@/lib/cho-neo/meo-vat";

type Report = { createdAt: string; details: string | null; id: string; reason: string; reporterName: string; reviewStatus: string; tipId: string; tipTitle: string };

export function ChoNeoMeoVatAdminClient() {
  const [tips, setTips] = useState<ChoNeoMeoVatTip[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [message, setMessage] = useState("Đang tải hàng chờ...");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/cho-neo/admin/meo-vat", { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.error ?? "Chưa tải được hàng chờ.");
    setTips(Array.isArray(result.tips) ? result.tips : []);
    setReports(Array.isArray(result.reports) ? result.reports : []);
  }

  useEffect(() => { void refresh().then(() => setMessage("")).catch((error) => setMessage(error instanceof Error ? error.message : "Chưa tải được hàng chờ.")); }, []);

  async function act(id: string, action: "set-tip-status" | "set-report-status", status: ChoNeoMeoVatStatus | "reviewing" | "resolved") {
    setBusyId(id); setMessage("");
    try {
      const response = await fetch("/api/cho-neo/admin/meo-vat", { body: JSON.stringify({ action, id, status }), headers: { "Content-Type": "application/json" }, method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error ?? "Chưa cập nhật được hàng chờ.");
      await refresh();
      setMessage("Đã cập nhật hàng chờ Mẹo Vặt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa cập nhật được hàng chờ.");
    } finally { setBusyId(null); }
  }

  return <>
    {message ? <p className="meo-admin-message" role="status">{message}</p> : null}
    <section className="meo-admin-section" aria-labelledby="meo-admin-tip-heading"><h2 id="meo-admin-tip-heading">Chia sẻ</h2>
      {tips.length ? <div className="meo-admin-list">{tips.map((tip) => <article className="meo-admin-card" key={tip.id}>
        <header><div><p className="meo-admin-meta">{categoryLabel(tip.category)} · {tip.authorName} · {formatDate(tip.createdAt)}</p><h3>{tip.title}</h3></div><span className="meo-admin-status">{statusLabel(tip.status)}</span></header>
        <p>{tip.body}</p>
        <div className="meo-admin-actions">
          {tip.status !== "published" ? <button className="meo-admin-publish" disabled={busyId === tip.id} onClick={() => void act(tip.id, "set-tip-status", "published")} type="button">Đăng công khai</button> : null}
          {tip.status === "pending_review" ? <button disabled={busyId === tip.id} onClick={() => void act(tip.id, "set-tip-status", "rejected")} type="button">Từ chối</button> : null}
          {tip.status === "published" ? <button disabled={busyId === tip.id} onClick={() => void act(tip.id, "set-tip-status", "hidden")} type="button">Ẩn chia sẻ</button> : null}
          {tip.status === "hidden" || tip.status === "rejected" ? <button disabled={busyId === tip.id} onClick={() => void act(tip.id, "set-tip-status", "pending_review")} type="button">Đưa lại vào hàng chờ</button> : null}
        </div>
      </article>)}</div> : <p>Chưa có chia sẻ nào.</p>}
    </section>
    <section className="meo-admin-section" aria-labelledby="meo-admin-report-heading"><h2 id="meo-admin-report-heading">Báo cáo mẹo</h2>
      {reports.length ? <div className="meo-admin-list">{reports.map((report) => <article className="meo-admin-card" key={report.id}>
        <header><div><p className="meo-admin-meta">{report.reporterName} · {formatDate(report.createdAt)} · {reasonLabel(report.reason)}</p><h3>{report.tipTitle}</h3></div><span className="meo-admin-status">{report.reviewStatus}</span></header>
        {report.details ? <p>{report.details}</p> : null}
        <div className="meo-admin-actions"><Link href={`/meo-vat/${report.tipId}`} target="_blank">Mở mẹo</Link>{report.reviewStatus === "open" ? <button disabled={busyId === report.id} onClick={() => void act(report.id, "set-report-status", "reviewing")} type="button">Đang xem xét</button> : null}<button disabled={busyId === report.id} onClick={() => void act(report.id, "set-report-status", "resolved")} type="button">Đánh dấu đã xử lý</button></div>
      </article>)}</div> : <p>Không có báo cáo đang chờ.</p>}
    </section>
  </>;
}

function categoryLabel(category: ChoNeoMeoVatTip["category"]) { return CHO_NEO_MEO_VAT_CATEGORIES.find((item) => item.id === category)?.label ?? category; }
function statusLabel(status: ChoNeoMeoVatTip["status"]) { return ({ hidden: "Đang ẩn", pending_review: "Chờ xem lại", published: "Đã đăng", rejected: "Đã từ chối" })[status ?? "pending_review"]; }
function reasonLabel(reason: string) { return ({ inappropriate: "Nội dung không phù hợp", spam: "Spam hoặc quảng cáo", unsafe: "Thông tin có thể gây hại", other: "Lý do khác" })[reason] ?? reason; }
function formatDate(value: string) { return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
