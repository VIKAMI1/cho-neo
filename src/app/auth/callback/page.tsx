import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

function AuthCallbackFallback() {
  return (
    <main className="min-h-screen bg-[#fbf7ef] flex items-center justify-center">
      <div className="rounded-2xl border border-zinc-200 bg-white/85 shadow-sm px-5 py-4">
        <div className="text-sm text-zinc-700">Signing you in…</div>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<AuthCallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
