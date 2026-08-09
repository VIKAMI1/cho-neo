"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";

export default function SessionSync() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // The OAuth callback owns the PKCE exchange.
    // Do not refresh/remount it while its one-time code is being consumed.
    if (pathname === "/auth/callback") return;

    const supabase = createClient();
    let active = true;

    void supabase.auth.getSession().then(() => {
      if (!active) return;

      if (
        typeof window !== "undefined" &&
        window.location.hash.includes("access_token")
      ) {
        router.replace("/");
        return;
      }

      router.refresh();
    });

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (active) router.refresh();
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  return null;
}
