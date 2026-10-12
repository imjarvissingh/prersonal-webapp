"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/useAsync";
import { formatMinutes, weekdayLetter } from "@/lib/dates";
import type { Level, Task, TaskStatus } from "@/lib/types";
import { ProjectCard } from "@/components/ProjectCard";
import { TaskItem } from "@/components/TaskItem";
import { Card, EmptyState, ErrorBanner, PageLoader, ProgressBar, cx } from "@/components/ui";

function Stat({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold", tone)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
    </Card>
  );
}

const energyLabels: Record<Level, string> = { high: "High energy", medium: "Medium energy", low: "Low energy" };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, loading, reload, setData } = useAsync(() => api.dashboard(), []);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(task: Task, status: TaskStatus) {
    if (!data) return;
    setBusy(task.id);
    setData({ ...data, todayTasks: data.todayTasks.map((t) => (t.id === task.id ? { ...t, status } : t)) });
    try {
      await api.updateTask(task.id, { status });
    } finally {
      setBusy(null);
      reload();
    }
  }

  if (!data && loading) return <PageLoader />;
  if (!data) return <ErrorBanner message={error || "Could not load the dashboard"} onRetry={reload} />;

  const { overall, todaySummary, todayTasks, activity, projects } = data;
  const maxActivity = Math.max(1, ...activity.map((a) => a.completed));
  const openToday = todayTasks.filter((t) => t.status !== "done");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting()}, {user?.name.split(" ")[0]}
          </h1>
          <p className="text-sm text-slate-500">
            {todaySummary.total === 0
              ? "Nothing planned for today yet."
              : `${todaySummary.done} of ${todaySummary.total} tasks done today${
                  todaySummary.rolledOver ? ` · ${todaySummary.rolledOver} rolled over from earlier` : ""
                }.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks" className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium hover:bg-white dark:border-slate-700 dark:hover:bg-slate-900">
            Plan today
          </Link>
          <Link href="/projects/new" className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-500">
            ✨ New AI project
          </Link>
        </div>
      </header>

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Overall progress" value={`${overall.progress}%`} sub={`${overall.doneTasks}/${overall.totalTasks} project tasks`} />
        <Stat label="Today" value={`${todaySummary.progress}%`} sub={`${formatMinutes(todaySummary.doneMinutes)} of ${formatMinutes(todaySummary.plannedMinutes)} planned`} />
        <Stat label="Done this week" value={overall.completedThisWeek} sub={`${overall.backlogTasks} in backlog`} />
        <Stat
          label="Overdue"
          value={overall.overdueTasks}
          tone={overall.overdueTasks > 0 ? "text-red-600 dark:text-red-400" : undefined}
          sub={`${overall.activeProjects} active project${overall.activeProjects === 1 ? "" : "s"}`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Today&apos;s focus</h2>
            <Link href="/tasks" className="text-sm text-indigo-600 hover:underline">
              Open planner →
            </Link>
          </div>
          {todayTasks.length === 0 ? (
            <EmptyState
              title="Your day is a blank slate"
              body="Pull tasks from your projects into today, or add a quick one."
              action={
                <Link href="/tasks" className="text-sm font-medium text-indigo-600 hover:underline">
                  Plan today
                </Link>
              }
            />
          ) : (
            <div className="space-y-2">
              {[...openToday, ...todayTasks.filter((t) => t.status === "done")].slice(0, 8).map((task) => (
                <div key={task.id} className={cx(busy === task.id && "pointer-events-none opacity-70")}>
                  <TaskItem task={task} onToggle={toggle} today={data.today} />
                </div>
              ))}
              {todayTasks.length > 8 && (
                <Link href="/tasks" className="block text-center text-sm text-slate-500 hover:underline">
                  +{todayTasks.length - 8} more
                </Link>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <Card>
            <h2 className="mb-4 font-semibold">Energy budget</h2>
            <div className="space-y-3">
              {(["high", "medium", "low"] as Level[]).map((level) => {
                const e = todaySummary.energy[level];
                return (
                  <div key={level}>
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>{energyLabels[level]}</span>
                      <span>
                        {e.done}/{e.total}
                      </span>
                    </div>
                    <ProgressBar value={e.total ? (e.done / e.total) * 100 : 0} />
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Last 7 days</h2>
            <div className="flex h-28 items-end justify-between gap-2">
              {activity.map((a) => (
                <div key={a.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-500">{a.completed || ""}</span>
                  <div
                    className={cx("w-full rounded-t", a.date === data.today ? "bg-indigo-500" : "bg-indigo-200 dark:bg-indigo-900")}
                    style={{ height: `${Math.max(4, (a.completed / maxActivity) * 80)}px` }}
                    title={`${a.date}: ${a.completed} completed`}
                  />
                  <span className="text-[10px] text-slate-500">{weekdayLetter(a.date)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Project health</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-emerald-50 py-2 dark:bg-emerald-950/40">
                <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">{overall.healthCounts.green}</p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">On track</p>
              </div>
              <div className="rounded-lg bg-amber-50 py-2 dark:bg-amber-950/40">
                <p className="text-xl font-semibold text-amber-700 dark:text-amber-300">{overall.healthCounts.yellow}</p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">At risk</p>
              </div>
              <div className="rounded-lg bg-red-50 py-2 dark:bg-red-950/40">
                <p className="text-xl font-semibold text-red-700 dark:text-red-300">{overall.healthCounts.red}</p>
                <p className="text-[11px] text-red-700/80 dark:text-red-300/80">Off track</p>
              </div>
            </div>
          </Card>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Active projects</h2>
          <Link href="/projects" className="text-sm text-indigo-600 hover:underline">
            All projects →
          </Link>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            body="Describe what you want to build and Gemini will break it into milestones and tasks."
            action={
              <Link href="/projects/new" className="text-sm font-medium text-indigo-600 hover:underline">
                Scaffold a project with AI
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
      </section>
    </div>
  );
}
