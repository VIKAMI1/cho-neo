"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import Link from "next/link";

const supabase = createClient();

type Role = "tech" | "owner" | "lurker";

export default function ProfilePage() {
  const [email, setEmail] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("tech");
  const [salonName, setSalonName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;

      const user = userData.user;
      if (!user) {
        setEmail(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profile) {
        setDisplayName(profile.display_name || "");
        setRole((profile.role || "tech") as Role);
        setSalonName(profile.salon_name || "");
      }

      setLoading(false);
    }

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      alert("Display name is required");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      alert("Not signed in");
      return;
    }

    setSaving(true);

    const payload = {
      id: userData.user.id,
      display_name: displayName.trim(),
      role,
      salon_name: salonName.trim() || null,
    };

    // upsert = insert or update same PK
    const { error } = await supabase.from("profiles").upsert(payload);

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Profile saved");
  };

  if (loading) {
    return <main className="max-w-md mx-auto p-6">Loading…</main>;
  }

  if (!email) {
    return (
      <main className="max-w-md mx-auto p-6 space-y-4">
        <p>You are not signed in.</p>
        <Link className="underline text-sm" href="/login">
          Go to login
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto p-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Profile</h1>
        <Link className="underline text-sm" href="/">
          Back to Chợ
        </Link>
      </header>

      <p className="text-xs text-gray-500 mb-2">Signed in as {email}</p>

      <form onSubmit={saveProfile} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Display name</label>
          <input
            className="border p-2 w-full text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ví dụ: Bé Na, Cô Sáu Nails..."
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Role</label>
          <div className="flex gap-3 text-sm">
            {(["tech", "owner", "lurker"] as Role[]).map((r) => (
              <label key={r} className="flex items-center gap-1">
                <input
                  type="radio"
                  value={r}
                  checked={role === r}
                  onChange={() => setRole(r)}
                />
                <span>
                  {r === "tech"
                    ? "Nail tech"
                    : r === "owner"
                    ? "Salon owner"
                    : "Just watching"}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Salon name (optional)</label>
          <input
            className="border p-2 w-full text-sm"
            value={salonName}
            onChange={(e) => setSalonName(e.target.value)}
            placeholder="Paradize Nails, Tiệm Nhà Em..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="border px-4 py-2 text-sm"
        
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </main>
  );
}
