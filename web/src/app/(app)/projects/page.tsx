"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { Health, ProjectStatus } from "@/lib/types";
import { ProjectCard } from "@/components/ProjectCard";
import { EmptyState, ErrorBanner, PageLoader, cx } from "@/components/ui";

const statusTabs: { value: ProjectStatus | "current" | "all"; label: string }[] = [
  { value: "current", label: "Current" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

export default function ProjectsPage() {
  const [tab, setTab] = useState<ProjectStatus | "current" | "all">("current");
  const [health, setHealth] = useState<Health | "all">("all");
  const { data, error, loading, reload } = useAsync(
    () => api.projects(tab === "current" ? undefined : tab),
    [tab],
  );

  const projects = (data?.projects ?? []).filter((p) => health === "all" || p.stats.health === health);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Link href="/projects/new" className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500">
          + New project
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {statusTabs.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={cx(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                tab === t.value ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-500",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <select
          value={health}
          onChange={(e) => setHealth(e.target.value as Health | "all")}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Filter by health"
        >
          <option value="all">Any health</option>
          <option value="green">On track</option>
          <option value="yellow">At risk</option>
          <option value="red">Off track</option>
        </select>
      </div>

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {!data && loading ? (
        <PageLoader />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects here"
          body="Start one from a prompt and let Gemini do the planning."
          action={
            <Link href="/projects/new" className="text-sm font-medium text-indigo-600 hover:underline">
              Create a project
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
