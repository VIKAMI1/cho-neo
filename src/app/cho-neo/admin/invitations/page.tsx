import Link from "next/link";
import { InvitationAdminClient } from "./InvitationAdminClient";
import {
  createChoNeoInvitationServiceClient,
  requireChoNeoInvitationAdmin,
} from "@/lib/cho-neo/invitation-admin";
import {
  CHO_NEO_MEMBER_INVITATION_TABLE,
  CHO_NEO_NAIL_ROLES,
  type ChoNeoNailRole,
} from "@/lib/cho-neo/member-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type InvitationRow = {
  created_at: string;
  expires_at: string;
  id: string;
  intended_role: ChoNeoNailRole | null;
  recipient_contact: string | null;
  recipient_name: string | null;
  redeemed_at: string | null;
  revoked_at: string | null;
  status: "issued" | "redeemed" | "revoked" | "expired";
  use_count: number;
};

const ROLE_LABELS: Record<ChoNeoNailRole, string> = {
  educator: "Educator",
  nail_student: "Nail student",
  nail_technician: "Nail technician",
  other_industry: "Other industry",
  salon_owner: "Salon owner",
  supplier: "Supplier",
};

export default async function ChoNeoInvitationAdminPage() {
  const authorization = await requireChoNeoInvitationAdmin();

  if (authorization.ok === false) {
    return (
      <main className="invitation-admin">
        <section className="invitation-panel">
          <p className="eyebrow">Chợ Neo owner</p>
          <h1>Invitation admin</h1>
          <p>{authorization.message}</p>
          {authorization.reason === "unauthenticated" ? (
            <Link href="/login">Go to login</Link>
          ) : (
            <Link href="/cho-neo">Back to Chợ Neo</Link>
          )}
        </section>
        <InvitationStyles />
      </main>
    );
  }

  const invitations = await loadInvitations();

  return (
    <main className="invitation-admin">
      <header className="invitation-header">
        <div>
          <p className="eyebrow">Chợ Neo owner</p>
          <h1>Private invitations</h1>
          <p>Create one-use invitation links for the accepted onboarding flow.</p>
        </div>
        <Link href="/cho-neo">Back to Chợ Neo</Link>
      </header>

      <InvitationAdminClient
        roleOptions={CHO_NEO_NAIL_ROLES.map((role) => ({
          label: ROLE_LABELS[role],
          value: role,
        }))}
      />

      <section className="invitation-panel" aria-labelledby="invitation-list-title">
        <h2 id="invitation-list-title">Invitations</h2>
        {invitations.length ? (
          <div className="invitation-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Expires</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td>
                      <strong>{invitation.recipient_name || "Unnamed recipient"}</strong>
                      {invitation.recipient_contact ? <span>{invitation.recipient_contact}</span> : null}
                    </td>
                    <td>{ROLE_LABELS[invitation.intended_role ?? "other_industry"]}</td>
                    <td>{formatDate(invitation.created_at)}</td>
                    <td>{formatDate(invitation.expires_at)}</td>
                    <td>{getInvitationStatusLabel(invitation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No invitations yet.</p>
        )}
      </section>

      <InvitationStyles />
    </main>
  );
}

async function loadInvitations() {
  const supabase = createChoNeoInvitationServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(CHO_NEO_MEMBER_INVITATION_TABLE)
    .select(
      "id, recipient_name, recipient_contact, intended_role, created_at, expires_at, status, use_count, redeemed_at, revoked_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[cho-neo:admin-invitations] list failed", {
      code: error.code ?? null,
    });
    return [];
  }

  return (data ?? []) as InvitationRow[];
}

function getInvitationStatusLabel(invitation: InvitationRow) {
  if (invitation.status === "revoked" || invitation.revoked_at) return "Revoked";
  if (invitation.status === "redeemed" || invitation.redeemed_at || invitation.use_count > 0) {
    return "Joined";
  }
  if (invitation.status === "expired" || new Date(invitation.expires_at).getTime() <= Date.now()) {
    return "Expired";
  }
  return "Not used";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function InvitationStyles() {
  return (
    <style>{`
      .invitation-admin {
        min-height: 100vh;
        padding: 32px min(5vw, 56px);
        color: #3c2418;
        background: #f7ead2;
        font-family: var(--font-cho-neo-ui), system-ui, sans-serif;
      }

      .invitation-header,
      .invitation-panel {
        width: min(1040px, 100%);
        margin: 0 auto 18px;
      }

      .invitation-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .invitation-header h1,
      .invitation-panel h1 {
        margin: 0;
        font-family: var(--font-cho-neo-display), Georgia, serif;
        font-size: clamp(36px, 5vw, 56px);
        line-height: 0.95;
      }

      .invitation-header p,
      .invitation-panel p {
        margin: 8px 0 0;
      }

      .eyebrow {
        color: #7d5134;
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .invitation-header a,
      .invitation-panel a,
      .invitation-form button,
      .created-actions button {
        min-height: 44px;
        border: 1px solid rgba(97, 57, 30, 0.24);
        border-radius: 12px;
        padding: 0 16px;
        color: #4a2b1c;
        background: rgba(255, 255, 255, 0.5);
        font: inherit;
        font-weight: 600;
        text-decoration: none;
      }

      .invitation-panel {
        border: 1px solid rgba(97, 57, 30, 0.16);
        border-radius: 14px;
        padding: 18px;
        background: rgba(255, 249, 239, 0.74);
      }

      .invitation-panel h2 {
        margin: 0 0 14px;
        font-size: 1.08rem;
      }

      .invitation-form {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .invitation-form label {
        display: grid;
        gap: 6px;
        font-size: 0.9rem;
        font-weight: 600;
      }

      .invitation-form input,
      .invitation-form select {
        min-height: 44px;
        border: 1px solid rgba(97, 57, 30, 0.22);
        border-radius: 12px;
        padding: 0 12px;
        color: inherit;
        background: rgba(255, 255, 255, 0.64);
        font: inherit;
      }

      .fixed-uses {
        display: flex;
        align-items: center;
        min-height: 44px;
        color: #7d5134;
        font-size: 0.9rem;
      }

      .invitation-form button {
        justify-self: start;
      }

      .form-message {
        color: #6b442e;
        font-size: 0.92rem;
      }

      .form-message.error {
        color: #9b2f20;
      }

      .created-link {
        display: grid;
        gap: 10px;
        margin-top: 16px;
        border-top: 1px solid rgba(97, 57, 30, 0.14);
        padding-top: 14px;
      }

      .created-link code {
        overflow-wrap: anywhere;
        border-radius: 10px;
        padding: 10px;
        background: rgba(74, 43, 28, 0.08);
      }

      .created-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .created-actions span {
        color: #7d5134;
        font-size: 0.9rem;
      }

      .invitation-table-wrap {
        overflow-x: auto;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.92rem;
      }

      th,
      td {
        border-bottom: 1px solid rgba(97, 57, 30, 0.12);
        padding: 12px 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        color: #7d5134;
        font-size: 0.78rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      td strong,
      td span {
        display: block;
      }

      td span {
        margin-top: 3px;
        color: #7d5134;
        font-size: 0.84rem;
      }

      @media (max-width: 720px) {
        .invitation-admin {
          padding: 20px 14px;
        }

        .invitation-header,
        .invitation-form {
          grid-template-columns: 1fr;
        }

        .invitation-header {
          display: grid;
        }
      }
    `}</style>
  );
}
