import Link from "next/link";
import { requireChoNeoInvitationAdmin } from "@/lib/cho-neo/invitation-admin";
import { loadChoNeoMatchingReports } from "@/lib/cho-neo/report-admin";
import { ReportAdminClient } from "./ReportAdminClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChoNeoReportAdminPage() {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) {
    return <main className="report-admin"><section className="report-admin-panel"><p className="report-admin-eyebrow">Chợ Neo owner</p><h1>Safety reports</h1><p>{authorization.message}</p><Link href={authorization.reason === "unauthenticated" ? "/login" : "/cho-neo"}>{authorization.reason === "unauthenticated" ? "Go to login" : "Back to Chợ Neo"}</Link></section><ReportAdminStyles /></main>;
  }

  const reports = await loadChoNeoMatchingReports();
  return <main className="report-admin">
    <header className="report-admin-header"><div><p className="report-admin-eyebrow">Chợ Neo owner</p><h1>Safety reports</h1><p>Review harassment, unsafe encounters, and unwanted sales or recruiting reports.</p></div><div className="report-admin-nav"><Link href="/cho-neo/admin/invitations">Invitations</Link><Link href="/cho-neo">Back to Chợ Neo</Link></div></header>
    <section className="report-admin-panel" aria-labelledby="report-queue-title"><h2 id="report-queue-title">Open queue</h2><ReportAdminClient initialReports={reports} /></section>
    <ReportAdminStyles />
  </main>;
}

function ReportAdminStyles() {
  return <style>{`
    .report-admin { min-height: 100vh; padding: 32px min(5vw, 56px); color: #3c2418; background: #f7ead2; font-family: var(--font-cho-neo-ui), system-ui, sans-serif; }
    .report-admin-header, .report-admin-panel { width: min(1040px, 100%); margin: 0 auto 18px; }
    .report-admin-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
    .report-admin-header h1, .report-admin-panel h1 { margin: 0; font-family: var(--font-cho-neo-display), Georgia, serif; font-size: clamp(36px, 5vw, 56px); line-height: .95; }
    .report-admin-header p, .report-admin-panel > p { margin: 8px 0 0; }
    .report-admin-eyebrow { color: #7d5134; font-size: .78rem; font-weight: 650; letter-spacing: .08em; text-transform: uppercase; }
    .report-admin-nav { display: flex; flex-wrap: wrap; gap: 8px; }
    .report-admin a, .report-admin button { min-height: 42px; border: 1px solid rgba(97, 57, 30, .24); border-radius: 12px; padding: 10px 14px; color: #4a2b1c; background: rgba(255,255,255,.5); font: inherit; font-weight: 650; text-decoration: none; }
    .report-admin-panel { border: 1px solid rgba(97,57,30,.16); border-radius: 14px; padding: 18px; background: rgba(255,249,239,.74); }
    .report-admin-panel > h2 { margin: 0 0 14px; }
    .report-admin-list { display: grid; gap: 14px; }
    .report-admin-card { display: grid; gap: 10px; border: 1px solid rgba(97,57,30,.16); border-radius: 14px; padding: 16px; background: rgba(255,255,255,.45); }
    .report-admin-card header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
    .report-admin-card h2, .report-admin-card h3 { margin: 0; }
    .report-admin-card h2 { font-size: 1.2rem; }
    .report-admin-card h3 { font-size: .82rem; text-transform: uppercase; letter-spacing: .05em; color: #7d5134; }
    .report-admin-status { border-radius: 999px; padding: 5px 9px; color: #fff; background: #9a482c; font-size: .75rem; }
    .report-admin-status.reviewing { background: #7d6a31; }
    .report-admin-meta, .report-admin-details, .report-admin-evidence p { margin: 0; line-height: 1.5; }
    .report-admin-meta { color: #7d5134; font-size: .85rem; }
    .report-admin-details { border-left: 3px solid #c47a49; padding-left: 11px; }
    .report-admin-evidence { display: grid; gap: 7px; border-radius: 11px; padding: 12px; background: rgba(255,250,240,.85); }
    .report-admin-evidence p { font-size: .9rem; }
    .report-admin-actions { display: flex; flex-wrap: wrap; gap: 8px; }
    .report-admin-actions button:nth-child(2) { color: #fff8ef; background: #8f2f25; }
    .report-admin-message { border-radius: 10px; padding: 10px 12px; color: #64362d; background: #f9ecd7; }
    @media (max-width: 720px) { .report-admin { padding: 20px 14px; } .report-admin-header { display: grid; } .report-admin-nav { order: 2; } }
  `}</style>;
}
