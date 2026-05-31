import Link from "next/link";
import { auth } from "@/auth";

const modules = [
  {
    href: "/spend",
    title: "Spend Tracker",
    description:
      "Monthly budgets by category, log daily spends, charts, and remaining budget.",
    color: "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40",
  },
  {
    href: "/goals",
    title: "Goal Tracker",
    description:
      "Goals with start and end dates, daily repeatable actions, and progress.",
    color: "border-teal-200 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40",
  },
  {
    href: "/todos",
    title: "Todo Tracker",
    description: "Task list with optional due dates and filters.",
    color: "border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950/40",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">
          Personal Tracker
        </h1>
        <p className="mt-2 max-w-xl text-zinc-600 dark:text-zinc-400">
          One app for spending, goals, and todos. Sign in to sync your data to
          MongoDB. Spend, goals, and todos require an account.
        </p>
      </header>

      {!session?.user && (
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-white dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Create account
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`rounded-xl border p-5 transition-shadow hover:shadow-md ${m.color}`}
          >
            <h2 className="text-lg font-semibold">{m.title}</h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {m.description}
            </p>
            <span className="mt-4 inline-block text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Open →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
