import { Suspense } from "react";
import LoginClient from "./LoginClient";

function LoginFallback() {
  return (
    <main className="min-h-screen bg-[#fbf7ef] text-zinc-900">
      <div className="mx-auto max-w-sm px-4 py-12">
        <div className="rounded-2xl border border-zinc-200 bg-white/85 shadow-sm p-6">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-zinc-600">Loading sign in…</p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}
