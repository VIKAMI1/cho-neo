"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SessionSync() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      if (typeof window !== "undefined" && window.location.hash.includes("access_token")) {
        router.replace("/");
      }
      router.refresh();
    });
    const { data: sub } = supabase.auth.onAuthStateChange(() => router.refresh());
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  return null;
}
