"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { cx } from "./ui";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/tasks", label: "Today", icon: "☑" },
  { href: "/projects", label: "Projects", icon: "◆" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-6 md:flex dark:border-slate-800 dark:bg-slate-900">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">DT</span>
          <span className="font-semibold">Dev Tracker</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
                isActive(item.href)
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              <span aria-hidden className="w-4 text-center">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
          <p className="truncate px-2 text-sm font-medium">{user?.name}</p>
          <p className="truncate px-2 text-xs text-slate-500">{user?.email}</p>
          <button onClick={logout} className="mt-3 px-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              "flex flex-col items-center gap-0.5 py-2.5 text-xs",
              isActive(item.href) ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500",
            )}
          >
            <span aria-hidden className="text-base">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
