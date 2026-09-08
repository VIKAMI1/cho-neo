"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase-browser";

type MatchingAdminMember = {
  displayName: string;
  nailRole: string | null;
  userId: string;
};

export function MatchingIntroductionAdminClient({ members }: { members: MatchingAdminMember[] }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function createIntroduction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      const form = new FormData(event.currentTarget);
      const token = (await createClient().auth.getSession()).data.session?.access_token;
      if (!token) throw new Error("Đăng nhập bằng tài khoản chủ quán trước nha.");

      const response = await fetch("/api/cho-neo/tim-ban-trong-nghe/introductions", {
        body: JSON.stringify({
          expiresInHours: 48,
          icebreaker: form.get("icebreaker"),
          matchNote: form.get("matchNote"),
          memberAUserId: form.get("memberAUserId"),
          memberBUserId: form.get("memberBUserId"),
        }),
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        method: "POST",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Chưa tạo được lời giới thiệu.");

      event.currentTarget.reset();
      setMessage("Đã tạo lời giới thiệu 48 giờ. Hai thành viên cần cùng chào nhau mới mở bàn riêng.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa tạo được lời giới thiệu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="report-admin-panel report-admin-introduction" aria-labelledby="create-introduction-title">
      <h2 id="create-introduction-title">Create private introduction</h2>
      <p>Owner-only control for a deliberate two-member introduction. No profile is made public.</p>
      {members.length >= 2 ? (
        <form className="report-admin-form" onSubmit={createIntroduction}>
          <label>
            <span>Member one</span>
            <select name="memberAUserId" required defaultValue="">
              <option value="" disabled>Select a member</option>
              {members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}{member.nailRole ? ` · ${member.nailRole}` : ""}</option>)}
            </select>
          </label>
          <label>
            <span>Member two</span>
            <select name="memberBUserId" required defaultValue="">
              <option value="" disabled>Select a member</option>
              {members.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}{member.nailRole ? ` · ${member.nailRole}` : ""}</option>)}
            </select>
          </label>
          <label>
            <span>Why this pairing?</span>
            <input name="matchNote" required minLength={2} maxLength={240} placeholder="Cùng nghề, cùng thành phố" />
          </label>
          <label>
            <span>Opening line</span>
            <input name="icebreaker" required minLength={2} maxLength={240} placeholder="Hai bạn cùng làm nail ở Alberta..." />
          </label>
          <button disabled={busy} type="submit">{busy ? "Creating…" : "Create introduction"}</button>
        </form>
      ) : (
        <p>At least two active, verified members with private matching profiles are needed.</p>
      )}
      {message ? <p className="report-admin-message" role="status">{message}</p> : null}
    </section>
  );
}
