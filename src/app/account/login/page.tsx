import { Suspense } from "react";
import LoginClient from "@/app/login/LoginClient";

export default function AccountLoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#fbf7ef]" />}>
      <LoginClient />
    </Suspense>
  );
}
