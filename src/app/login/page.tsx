import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<ChoNeoLoginLoading />}>
      <LoginClient />
    </Suspense>
  );
}

function ChoNeoLoginLoading() {
  return (
    <main className="min-h-screen bg-[#12080f] text-[#fff1cf]">
      <div className="mx-auto grid min-h-screen max-w-md place-items-center px-4">
        <section className="w-full rounded-2xl border border-[#d8a95d66] bg-[#24101a] p-6 shadow-2xl">
          <h1 className="text-xl font-semibold">Vào Chợ Neo</h1>
          <p className="mt-2 text-sm text-[#e8cf9d]">Đang mở cổng Chợ Neo...</p>
        </section>
      </div>
    </main>
  );
}
