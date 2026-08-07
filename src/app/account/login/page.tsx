import LoginClient from "@/app/login/LoginClient";
import { Suspense } from "react";

export default function AccountLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
