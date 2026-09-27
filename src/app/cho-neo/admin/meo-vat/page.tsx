import Link from "next/link";
import { requireChoNeoInvitationAdmin } from "@/lib/cho-neo/invitation-admin";
import { ChoNeoMeoVatAdminClient } from "./ChoNeoMeoVatAdminClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChoNeoMeoVatAdminPage() {
  const authorization = await requireChoNeoInvitationAdmin();
  if (authorization.ok === false) {
    return <main className="meo-admin"><section className="meo-admin-panel"><p className="meo-admin-eyebrow">Chợ Neo owner</p><h1>Mẹo Vặt moderation</h1><p>{authorization.message}</p><Link href={authorization.reason === "unauthenticated" ? "/login" : "/cho-neo"}>{authorization.reason === "unauthenticated" ? "Đăng nhập" : "Về Chợ Neo"}</Link></section><MeoVatAdminStyles /></main>;
  }
  return <main className="meo-admin">
    <header className="meo-admin-header"><div><p className="meo-admin-eyebrow">Chợ Neo owner</p><h1>Mẹo Vặt</h1><p>Xem lại chia sẻ và báo cáo từ cộng đồng.</p></div><nav><Link href="/cho-neo/admin/reports">Safety reports</Link><Link href="/cho-neo/admin/invitations">Invitations</Link><Link href="/meo-vat">Mở Mẹo Vặt</Link></nav></header>
    <ChoNeoMeoVatAdminClient />
    <MeoVatAdminStyles />
  </main>;
}

function MeoVatAdminStyles() {
  return <style>{`
    .meo-admin { min-height:100vh; padding:32px min(5vw,56px); color:#3c2418; background:#f7ead2; font-family:var(--font-cho-neo-ui),system-ui,sans-serif; }
    .meo-admin-header,.meo-admin-panel { width:min(1040px,100%); margin:0 auto 18px; }
    .meo-admin-header { display:flex; align-items:flex-start; justify-content:space-between; gap:18px; }
    .meo-admin-header h1,.meo-admin-panel h1 { margin:0; font-family:var(--font-cho-neo-display),Georgia,serif; font-size:clamp(36px,5vw,56px); line-height:.95; }
    .meo-admin-header p,.meo-admin-panel p { margin:8px 0 0; }
    .meo-admin-eyebrow { color:#7d5134; font-size:.78rem; font-weight:650; letter-spacing:.08em; text-transform:uppercase; }
    .meo-admin-header nav { display:flex; flex-wrap:wrap; gap:8px; }
    .meo-admin a,.meo-admin button { min-height:42px; border:1px solid rgba(97,57,30,.24); border-radius:12px; padding:10px 14px; color:#4a2b1c; background:rgba(255,255,255,.5); font:inherit; font-weight:650; text-decoration:none; }
    .meo-admin-panel { border:1px solid rgba(97,57,30,.16); border-radius:14px; padding:18px; background:rgba(255,249,239,.74); }
    .meo-admin-section { width:min(1040px,100%); margin:0 auto 18px; border:1px solid rgba(97,57,30,.16); border-radius:14px; padding:18px; background:rgba(255,249,239,.74); }
    .meo-admin-section h2 { margin:0 0 14px; font-size:1.25rem; }
    .meo-admin-list { display:grid; gap:12px; }
    .meo-admin-card { display:grid; gap:9px; border:1px solid rgba(97,57,30,.16); border-radius:13px; padding:15px; background:rgba(255,255,255,.52); }
    .meo-admin-card header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
    .meo-admin-card h3 { margin:0; color:#4c2d1f; font-family:var(--font-cho-neo-display),Georgia,serif; font-size:1.42rem; font-weight:500; }
    .meo-admin-card p { margin:0; line-height:1.5; white-space:pre-wrap; }
    .meo-admin-meta { color:#805f46; font-size:.82rem; }
    .meo-admin-status { width:max-content; border-radius:999px; padding:5px 9px; color:#69482f; background:#f2e4ca; font-size:.74rem; }
    .meo-admin-actions { display:flex; flex-wrap:wrap; gap:7px; }
    .meo-admin-actions button { cursor:pointer; }
    .meo-admin-actions button:disabled { opacity:.6; cursor:wait; }
    .meo-admin-actions .meo-admin-publish { color:#fff8ef; background:#783e2a; }
    .meo-admin-message { width:min(1040px,100%); margin:0 auto 12px; border-radius:10px; padding:10px 12px; background:#f5e7c9; }
    @media(max-width:720px) { .meo-admin { padding:20px 14px; } .meo-admin-header { display:grid; } .meo-admin-header nav { order:2; } .meo-admin-section { padding:14px; } }
  `}</style>;
}
