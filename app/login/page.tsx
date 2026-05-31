import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
