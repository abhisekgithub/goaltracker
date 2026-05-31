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
  {
    href: "/focus",
    title: "Deep Focus",
    description:
      "15–90 minute sessions with sound and desktop alerts when time is up.",
    color: "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40",
  },
];

export default async function Home() {
  const session = await auth();

  return (
    <div className="page-stack">
      <header className="page-header">
        <h1 className="page-title">Personal Tracker</h1>
        <p className="page-subtitle">
          Spending, goals, todos, and focus sessions in one place. Sign in to
          sync spend, goals, and todos to MongoDB. Focus timer works without an
          account.
        </p>
      </header>

      {!session?.user && (
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="btn-secondary">
            Sign in
          </Link>
          <Link href="/register" className="btn-primary">
            Create account
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className={`block rounded-2xl border p-4 transition-shadow active:scale-[0.99] sm:p-5 sm:hover:shadow-md ${m.color}`}
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
