"use client";

export function SyncStatus({
  saving,
  error,
}: {
  saving?: boolean;
  error?: string | null;
}) {
  if (!saving && !error) return null;

  return (
    <p
      className={`text-xs ${
        error ? "text-red-600 dark:text-red-400" : "text-zinc-500"
      }`}
      role="status"
    >
      {error ?? "Saving…"}
    </p>
  );
}
