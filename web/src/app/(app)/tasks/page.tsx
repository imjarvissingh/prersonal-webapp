"use client";

import { useCallback, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { addDays, formatDay, formatMinutes, localDateKey } from "@/lib/dates";
import type { Level, Task, TaskInput, TaskStatus } from "@/lib/types";
import { TaskItem } from "@/components/TaskItem";
import { TaskEditor } from "@/components/TaskEditor";
import { Button, Card, EmptyState, EnergyTag, ErrorBanner, PageLoader, ProgressBar, cx, inputClass } from "@/components/ui";

type EnergyFilter = Level | "all";

export default function TasksPage() {
  const [date, setDate] = useState(localDateKey());
  const [energy, setEnergy] = useState<EnergyFilter>("all");
  const [editing, setEditing] = useState<Task | null>(null);
  const [creating, setCreating] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const day = useAsync(() => api.tasks({ date }), [date]);
  const backlog = useAsync(() => api.tasks({ backlog: true }), []);
  const projects = useAsync(() => api.projects(), []);

  const today = day.data?.today ?? localDateKey();
  const tasks = useMemo(() => day.data?.tasks ?? [], [day.data]);
  const visible = energy === "all" ? tasks : tasks.filter((t) => t.energy === energy);
  const blocked = visible.filter((t) => t.timeBlock).sort((a, b) => a.timeBlock!.start.localeCompare(b.timeBlock!.start));
  const unblocked = visible.filter((t) => !t.timeBlock);
  const done = tasks.filter((t) => t.status === "done").length;
  const planned = tasks.reduce((s, t) => s + (t.estimateMinutes || 0), 0);
  const backlogOpen = (backlog.data?.tasks ?? []).filter((t) => t.status !== "done");

  const refresh = useCallback(() => {
    day.reload();
    backlog.reload();
  }, [day, backlog]);

  async function toggle(task: Task, status: TaskStatus) {
    if (day.data) {
      day.setData({ ...day.data, tasks: day.data.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) });
    }
    try {
      await api.updateTask(task.id, { status });
    } finally {
      day.reload();
    }
  }

  async function save(input: TaskInput & { title: string }) {
    if (editing) await api.updateTask(editing.id, input);
    else await api.createTask(input);
    refresh();
  }

  async function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title) return;
    setQuickTitle("");
    await api.createTask({ title, scheduledDate: date });
    day.reload();
  }

  async function pullIntoDay(task: Task) {
    await api.updateTask(task.id, { scheduledDate: date });
    refresh();
  }

  async function sendToBacklog(task: Task) {
    await api.updateTask(task.id, { scheduledDate: null });
    refresh();
  }

  async function autoSchedule() {
    setScheduling(true);
    setNotice(null);
    try {
      const res = await api.autoSchedule(date);
      if (day.data) day.setData({ ...day.data, tasks: res.tasks });
      setNotice(
        res.placed === 0 && res.unplaced.length === 0
          ? "Everything already has a time block."
          : `Blocked out ${res.placed} task${res.placed === 1 ? "" : "s"}${
              res.unplaced.length ? `, ${res.unplaced.length} didn't fit in your working hours` : ""
            }.`,
      );
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not auto-schedule");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}>
            ←
          </Button>
          <div className="min-w-40 text-center">
            <h1 className="text-xl font-semibold">{formatDay(date, today)}</h1>
            <p className="text-xs text-slate-500">{date}</p>
          </div>
          <Button variant="secondary" aria-label="Next day" onClick={() => setDate(addDays(date, 1))}>
            →
          </Button>
          {date !== today && (
            <Button variant="ghost" onClick={() => setDate(today)}>
              Today
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={autoSchedule} loading={scheduling} disabled={date < today}>
            ⏱ Auto time-block
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            + Task
          </Button>
        </div>
      </header>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span>
            <strong>{done}</strong>/{tasks.length} done · {formatMinutes(planned)} planned
          </span>
          <div className="flex gap-1">
            {(["all", "high", "medium", "low"] as EnergyFilter[]).map((e) => (
              <button
                key={e}
                onClick={() => setEnergy(e)}
                className={cx(
                  "rounded-full px-3 py-1 text-xs font-medium capitalize",
                  energy === e
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300",
                )}
              >
                {e === "all" ? "All energy" : e}
              </button>
            ))}
          </div>
        </div>
        <ProgressBar value={tasks.length ? (done / tasks.length) * 100 : 0} className="mt-3" />
      </Card>

      {notice && <p className="rounded-lg bg-indigo-50 px-4 py-2 text-sm text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">{notice}</p>}
      {day.error && <ErrorBanner message={day.error} onRetry={day.reload} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <form onSubmit={quickAdd}>
            <input
              className={inputClass}
              placeholder={`Quick add to ${formatDay(date, today).toLowerCase()}… (press Enter)`}
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
            />
          </form>

          {!day.data && day.loading ? (
            <PageLoader />
          ) : (
            <>
              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Time blocks</h2>
                {blocked.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No time blocks yet. Use <em>Auto time-block</em> to slot open tasks into your working hours, high-energy work first.
                  </p>
                ) : (
                  <ol className="relative space-y-2 border-l-2 border-indigo-100 pl-4 dark:border-indigo-950">
                    {blocked.map((task) => (
                      <li key={task.id} className="relative">
                        <span className="absolute -left-[23px] top-4 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-950" />
                        <TaskItem task={task} onToggle={toggle} onEdit={setEditing} today={today} />
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Anytime</h2>
                {unblocked.length === 0 && blocked.length === 0 ? (
                  <EmptyState title="Nothing planned" body="Add a task above or pull one in from your backlog." />
                ) : unblocked.length === 0 ? (
                  <p className="text-sm text-slate-500">Every task has a slot.</p>
                ) : (
                  unblocked.map((task) => (
                    <div key={task.id} className="flex items-center gap-2">
                      <div className="flex-1">
                        <TaskItem
                          task={task}
                          onToggle={toggle}
                          onEdit={setEditing}
                          onStart={(t) => toggle(t, "in_progress")}
                          today={today}
                        />
                      </div>
                      {task.status !== "done" && (
                        <button
                          title="Move to backlog"
                          onClick={() => sendToBacklog(task)}
                          className="rounded p-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                        >
                          ⤓
                        </button>
                      )}
                    </div>
                  ))
                )}
              </section>
            </>
          )}
        </div>

        <aside className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Backlog</h2>
          {backlogOpen.length === 0 ? (
            <p className="text-sm text-slate-500">Your backlog is empty. AI-generated project tasks land here.</p>
          ) : (
            <div className="max-h-[70vh] space-y-2 overflow-y-auto pr-1">
              {backlogOpen.slice(0, 50).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <EnergyTag energy={task.energy} />
                      {task.project && <span className="truncate">{task.project.title}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => pullIntoDay(task)}
                    className="shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    + {formatDay(date, today)}
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>

      <TaskEditor
        open={creating || editing !== null}
        task={editing}
        defaults={{ scheduledDate: date }}
        projects={projects.data?.projects ?? []}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSave={save}
        onDelete={async (t) => {
          await api.deleteTask(t.id);
          refresh();
        }}
      />
    </div>
  );
}
