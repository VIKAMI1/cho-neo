import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginClient />
    </Suspense>
  );
}

function LoginFallback() {
  return (
    <main className="cho-neo-login-page" aria-busy="true">
      <section className="cho-neo-login-card" aria-labelledby="cho-neo-login-loading">
        <p id="cho-neo-login-loading">Loading Chợ Neo…</p>
      </section>
    </main>
  );
}
