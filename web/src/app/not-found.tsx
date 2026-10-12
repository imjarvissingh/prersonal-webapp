import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-5xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <p className="text-slate-600 dark:text-slate-400">That page doesn&apos;t exist.</p>
      <Link href="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
        Back to the dashboard
      </Link>
    </main>
  );
}
