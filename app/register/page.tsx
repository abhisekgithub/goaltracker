import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
      <div className="mx-auto w-full max-w-md pb-8">
        <AuthForm mode="register" />
      </div>
    </Suspense>
  );
}
