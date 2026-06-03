"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatRoutineRange,
  getRoutineNow,
  routineNowMessage,
} from "@/lib/routine";
import { useAppData } from "@/lib/storage";

type RoutineNowBannerProps = {
  compact?: boolean;
};

export function RoutineNowBanner({ compact = false }: RoutineNowBannerProps) {
  const { data, hydrated, isAuthenticated } = useAppData();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const status = useMemo(
    () => getRoutineNow(data.routineBlocks ?? []),
    [data.routineBlocks, tick],
  );

  if (!isAuthenticated || !hydrated) return null;

  const { label, detail } = routineNowMessage(status);
  const range =
    status.kind === "current" || status.kind === "upcoming"
      ? formatRoutineRange(status.block)
      : null;

  if (compact) {
    return (
      <Link
        href="/routine"
        className="block truncate rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-100"
      >
        <span className="text-emerald-600 dark:text-emerald-400">{label}:</span>{" "}
        {detail}
      </Link>
    );
  }

  return (
    <Link
      href="/routine"
      className={`block rounded-2xl border transition-colors hover:border-emerald-400 ${
        status.kind === "current"
          ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/50 dark:to-teal-950/30"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg ${
            status.kind === "current"
              ? "bg-emerald-600 text-white"
              : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
          aria-hidden
        >
          {status.kind === "current" ? "●" : "◷"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            {label}
          </p>
          <p className="mt-0.5 truncate text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {detail}
          </p>
          {range && (
            <p className="mt-1 text-sm text-zinc-500">{range}</p>
          )}
          {status.kind === "empty" && (
            <p className="mt-1 text-sm text-zinc-500">
              Tap to build your morning-to-night schedule
            </p>
          )}
        </div>
        <span className="shrink-0 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          Routine →
        </span>
      </div>
    </Link>
  );
}
