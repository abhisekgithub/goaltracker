import type { ReactNode } from "react";

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {title && (
        <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
