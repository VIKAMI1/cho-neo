"use client";
import { createClient } from "@/lib/supabase-browser";
import { useState } from "react";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");

  const signInWithOtp = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin }
    });
    alert(error ? error.message : "Check your email for the magic link.");
  };

  return (
    <div className="max-w-sm mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Sign in</h1>
      <input
        className="border p-2 w-full mb-3"
        placeholder="you@example.com"
        value={email}
        onChange={(e)=>setEmail(e.target.value)}
      />
      <button className="border px-4 py-2" onClick={signInWithOtp}>Send magic link</button>
    </div>
  );
}
