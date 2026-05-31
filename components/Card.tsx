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
      className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {title && (
        <h2 className="mb-3 text-base font-semibold text-zinc-900 sm:mb-4 sm:text-lg dark:text-zinc-50">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
