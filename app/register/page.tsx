import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
      <AuthForm mode="register" />
    </Suspense>
  );
}
