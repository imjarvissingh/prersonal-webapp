import Link from "next/link";
import type { Project } from "@/lib/types";
import { formatShort } from "@/lib/dates";
import { HealthBadge, ProgressBar } from "./ui";

export function ProjectCard({ project }: { project: Project }) {
  const { stats } = project;
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: project.color }} />
          <h3 className="truncate font-semibold">{project.title}</h3>
        </div>
        <HealthBadge health={stats.health} title={stats.reasons.join(" · ")} />
      </div>
      {project.description && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{project.description}</p>}
      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>
          {stats.done}/{stats.total} tasks
        </span>
        <span className="font-semibold text-slate-700 dark:text-slate-200">{stats.progress}%</span>
      </div>
      <ProgressBar value={stats.progress} health={stats.health} expected={stats.expectedProgress} className="mt-1.5" />
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
        {project.dueDate && <span>Due {formatShort(project.dueDate)}</span>}
        {stats.overdue > 0 && <span className="text-red-600 dark:text-red-400">{stats.overdue} overdue</span>}
        {project.status !== "active" && <span className="capitalize">{project.status.replace("_", " ")}</span>}
        {project.aiGenerated && <span>✨ AI plan</span>}
      </div>
    </Link>
  );
}
