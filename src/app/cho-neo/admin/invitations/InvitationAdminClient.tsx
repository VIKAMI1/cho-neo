"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { createChoNeoOwnerInvitation, type InvitationCreateState } from "./actions";
import type { ChoNeoNailRole } from "@/lib/cho-neo/member-identity";

type RoleOption = {
  label: string;
  value: ChoNeoNailRole;
};

export function InvitationAdminClient({ roleOptions }: { roleOptions: RoleOption[] }) {
  const [state, action, isPending] = useActionState<InvitationCreateState, FormData>(
    createChoNeoOwnerInvitation,
    {},
  );
  const [canShare, setCanShare] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const defaultExpiration = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  async function copyLink() {
    if (!state.privateJoinUrl) return;

    await navigator.clipboard.writeText(state.privateJoinUrl);
    setCopyMessage("Copied.");
  }

  async function shareLink() {
    if (!state.privateJoinUrl || !navigator.share) return;

    await navigator.share({
      text: "Private Chợ Neo invitation",
      title: "Chợ Neo invitation",
      url: state.privateJoinUrl,
    });
  }

  return (
    <section className="invitation-panel" aria-labelledby="create-invitation-title">
      <h2 id="create-invitation-title">Create private invitation</h2>
      <form action={action} className="invitation-form">
        <label>
          <span>Recipient name</span>
          <input name="recipientName" required maxLength={120} placeholder="Bao Nguyen" />
        </label>

        <label>
          <span>Recipient contact/email</span>
          <input name="recipientContact" maxLength={120} placeholder="name@example.com" />
        </label>

        <label>
          <span>Intended industry role</span>
          <select name="intendedRole" required defaultValue="other_industry">
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Expiration</span>
          <input name="expiresAt" type="date" defaultValue={defaultExpiration} />
        </label>

        <div className="fixed-uses">Max uses: 1</div>

        <button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create invitation"}
        </button>
      </form>

      {state.error ? <p className="form-message error">{state.error}</p> : null}

      {state.privateJoinUrl ? (
        <div className="created-link" role="status">
          <p>Private join URL for {state.recipientName}. It is shown once.</p>
          <code>{state.privateJoinUrl}</code>
          <div className="created-actions">
            <button type="button" onClick={copyLink}>
              Copy Link
            </button>
            {canShare ? (
              <button type="button" onClick={shareLink}>
                Share
              </button>
            ) : (
              <span>Sharing unavailable. Use Copy Link.</span>
            )}
          </div>
          {copyMessage ? <p className="form-message">{copyMessage}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
