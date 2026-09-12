"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import type { ChoNeoMatchingReport } from "@/lib/cho-neo/report-admin";

const reasonLabels: Record<string, string> = {
  harassment: "Quấy rối",
  other: "Lý do khác",
  recruiting: "Tuyển dụng",
  sales: "Bán hàng",
  unsafe: "Không an toàn",
};

export function ReportAdminClient({ initialReports }: { initialReports: ChoNeoMatchingReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function refresh() {
    const token = (await createClient().auth.getSession()).data.session?.access_token;
    if (!token) throw new Error("Đăng nhập để mở hàng đợi an toàn.");
    const response = await fetch("/api/cho-neo/admin/reports", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Chưa tải lại được hàng đợi.");
    setReports(result.reports ?? []);
  }

  async function act(reportId: string, action: "suspend-member" | "unsuspend-member" | "update-status", status?: "reviewing" | "resolved") {
    if (action === "suspend-member" && !window.confirm("Tạm khóa thành viên bị báo cáo? Hành động này chặn họ vào Chợ Neo.")) return;
    if (action === "unsuspend-member" && !window.confirm("Khôi phục thành viên này? Họ sẽ có thể vào lại Chợ Neo.")) return;
    setBusyId(reportId); setMessage("");
    try {
      const token = (await createClient().auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Đăng nhập để quản lý báo cáo.");
      const response = await fetch("/api/cho-neo/admin/reports", {
        body: JSON.stringify({ action, reportId, ...(status ? { status } : {}) }),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Chưa cập nhật được báo cáo.");
      setMessage(action === "suspend-member" ? "Đã tạm khóa thành viên. Báo cáo vẫn nằm trong hàng đợi để ghi nhận xử lý." : action === "unsuspend-member" ? "Đã khôi phục thành viên." : "Đã cập nhật trạng thái báo cáo.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa cập nhật được báo cáo.");
    } finally {
      setBusyId(null);
    }
  }

  return <>
    {message ? <p className="report-admin-message" role="status">{message}</p> : null}
    {reports.length ? <div className="report-admin-list">
      {reports.map((report) => <article className="report-admin-card" key={report.id}>
        <header>
          <div><p className="report-admin-eyebrow">{reasonLabels[report.reason] ?? report.reason}</p><h2>{report.reported?.displayName ?? "Thành viên không còn hồ sơ"}</h2></div>
          <span className={`report-admin-status ${report.reviewStatus}`}>{report.reviewStatus}</span>
        </header>
        <p className="report-admin-meta">Báo cáo bởi {report.reporter?.displayName ?? "thành viên"} · {formatDate(report.createdAt)}</p>
        {report.details ? <p className="report-admin-details">{report.details}</p> : null}
        <section className="report-admin-evidence" aria-label="Message evidence">
          <h3>Tin nhắn lưu tạm</h3>
          {report.messageEvidence.length ? report.messageEvidence.map((message, index) => <p key={`${report.id}-${index}`}><strong>{message.sender_user_id === report.reported?.userId ? report.reported.displayName : report.reporter?.displayName ?? "Thành viên"}:</strong> {message.body ?? ""}</p>) : <p>Không có tin nhắn được lưu.</p>}
        </section>
        <div className="report-admin-actions">
          {report.reviewStatus === "open" ? <button disabled={busyId === report.id} onClick={() => void act(report.id, "update-status", "reviewing")} type="button">Đang xem xét</button> : null}
          {report.reported?.membershipStatus === "suspended" ? <button disabled={busyId === report.id} onClick={() => void act(report.id, "unsuspend-member")} type="button">Khôi phục thành viên</button> : <button disabled={busyId === report.id} onClick={() => void act(report.id, "suspend-member")} type="button">Tạm khóa thành viên</button>}
          <button disabled={busyId === report.id} onClick={() => void act(report.id, "update-status", "resolved")} type="button">Đánh dấu đã xử lý</button>
        </div>
      </article>)}
    </div> : <p>Không có báo cáo đang chờ xử lý.</p>}
  </>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
