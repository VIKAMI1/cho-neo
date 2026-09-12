import Link from "next/link";
import { requireChoNeoInvitationAdmin } from "@/lib/cho-neo/invitation-admin";
import { createChoNeoInvitationServiceClient } from "@/lib/cho-neo/invitation-admin";
import { CHO_NEO_MATCHING_PROFILE_TABLE } from "@/lib/cho-neo/matching";
import { CHO_NEO_MEMBER_PROFILE_TABLE } from "@/lib/cho-neo/member-identity";
import { loadChoNeoMatchingReports } from "@/lib/cho-neo/report-admin";
import { MatchingIntroductionAdminClient } from "./MatchingIntroductionAdminClient";
import { ReportAdminClient } from "./ReportAdminClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChoNeoReportAdminPage() {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) {
    return <main className="report-admin"><section className="report-admin-panel"><p className="report-admin-eyebrow">Chợ Neo owner</p><h1>Safety reports</h1><p>{authorization.message}</p><Link href={authorization.reason === "unauthenticated" ? "/login" : "/cho-neo"}>{authorization.reason === "unauthenticated" ? "Go to login" : "Back to Chợ Neo"}</Link></section><ReportAdminStyles /></main>;
  }

  const [reports, members] = await Promise.all([
    loadChoNeoMatchingReports(),
    loadActiveMatchingMembers(),
  ]);
  return <main className="report-admin">
    <header className="report-admin-header"><div><p className="report-admin-eyebrow">Chợ Neo owner</p><h1>Safety reports</h1><p>Review harassment, unsafe encounters, and unwanted sales or recruiting reports.</p></div><div className="report-admin-nav"><Link href="/cho-neo/admin/invitations">Invitations</Link><Link href="/cho-neo">Back to Chợ Neo</Link></div></header>
    <MatchingIntroductionAdminClient members={members} />
    <section className="report-admin-panel" aria-labelledby="report-queue-title"><h2 id="report-queue-title">Open queue</h2><ReportAdminClient initialReports={reports} /></section>
    <ReportAdminStyles />
  </main>;
}

async function loadActiveMatchingMembers() {
  const supabase = createChoNeoInvitationServiceClient();
  if (!supabase) return [];

  const [{ data: matchingProfiles, error: matchingError }, { data: memberProfiles, error: memberError }] = await Promise.all([
    supabase.from(CHO_NEO_MATCHING_PROFILE_TABLE).select("user_id").eq("status", "active").limit(200),
    supabase.from(CHO_NEO_MEMBER_PROFILE_TABLE).select("user_id, display_name, nail_role").eq("membership_status", "verified_nail_member").is("suspended_at", null).limit(200),
  ]);

  if (matchingError || memberError) {
    console.error("[cho-neo:admin-matching] member lookup failed", { matchingCode: matchingError?.code ?? null, memberCode: memberError?.code ?? null });
    return [];
  }

  const activeIds = new Set((matchingProfiles ?? []).map((profile) => profile.user_id));
  return (memberProfiles ?? [])
    .filter((member) => activeIds.has(member.user_id))
    .map((member) => ({ displayName: member.display_name, nailRole: member.nail_role, userId: member.user_id }));
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
    .report-admin-introduction { margin-bottom: 18px; }
    .report-admin-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 14px; }
    .report-admin-form label { display: grid; gap: 6px; }
    .report-admin-form label span { color: #7d5134; font-size: .82rem; font-weight: 650; }
    .report-admin-form input, .report-admin-form select { width: 100%; min-height: 42px; border: 1px solid rgba(97,57,30,.22); border-radius: 10px; padding: 9px 11px; color: #3c2418; background: rgba(255,255,255,.72); font: inherit; }
    .report-admin-form button { grid-column: 1 / -1; justify-self: start; color: #fff8ef; background: #7d3f2d; cursor: pointer; }
    .report-admin-form button:disabled { opacity: .62; cursor: wait; }
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
    @media (max-width: 720px) { .report-admin { padding: 20px 14px; } .report-admin-header { display: grid; } .report-admin-nav { order: 2; } .report-admin-form { grid-template-columns: 1fr; } .report-admin-form button { grid-column: auto; } }
  `}</style>;
}
