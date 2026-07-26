import { Suspense } from "react";
import LoginClient from "./LoginClient";

function LoginFallback() {
  return (
    <main className="min-h-screen bg-[#241019] px-4 py-10 text-[#fff1cf] sm:py-14">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-sm items-center">
        <div className="w-full rounded-2xl border border-[#c99a4a]/55 bg-[#321520]/92 p-6 shadow-2xl shadow-black/30">
          <h1 className="text-2xl font-semibold text-[#fff6df]">Ghé lại Chợ Neo</h1>
          <p className="mt-2 text-sm leading-6 text-[#ecd6ad]">
            Đang mở cổng Chợ Neo…
          </p>
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
