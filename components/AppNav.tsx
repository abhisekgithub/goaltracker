"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const links = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/spend", label: "Spend", short: "Spend" },
  { href: "/goals", label: "Goals", short: "Goals" },
  { href: "/todos", label: "Todos", short: "Todos" },
  { href: "/focus", label: "Focus", short: "Focus" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function AppNav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const hideNav = pathname.startsWith("/login") || pathname.startsWith("/register");

  if (hideNav) return null;

  const authBlock =
    status === "loading" ? (
      <span className="text-xs text-zinc-400">…</span>
    ) : session?.user ? (
      <>
        <span className="hidden max-w-[140px] truncate text-xs text-zinc-500 lg:inline">
          {session.user.email}
        </span>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="touch-target rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </>
    ) : (
      <>
        <Link
          href="/login"
          className="touch-target rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Sign in
        </Link>
        <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">
          Register
        </Link>
      </>
    );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4">
          <Link
            href="/"
            className="text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-400"
          >
            Tracker
          </Link>
          <div className="flex items-center gap-2">{authBlock}</div>
        </div>
      </header>

      {/* Desktop top nav */}
      <nav className="sticky top-0 z-40 hidden border-b border-zinc-200 bg-white/95 backdrop-blur-md md:block dark:border-zinc-800 dark:bg-zinc-950/95">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-1 px-6 py-3">
          <Link
            href="/"
            className="mr-3 text-sm font-semibold tracking-tight text-emerald-700 dark:text-emerald-400"
          >
            Tracker
          </Link>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`touch-target rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, href)
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="ml-auto flex items-center gap-2">{authBlock}</div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav
        className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95"
        aria-label="Main"
      >
        <div className="mx-auto grid h-[var(--bottom-nav-height)] max-w-lg grid-cols-5">
          {links.map(({ href, short }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
                  active
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-zinc-500 dark:text-zinc-400"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${
                    active
                      ? "bg-emerald-100 dark:bg-emerald-950/80"
                      : ""
                  }`}
                  aria-hidden
                >
                  {short.charAt(0)}
                </span>
                {short}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
