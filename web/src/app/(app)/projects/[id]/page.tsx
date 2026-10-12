"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { formatShort, localDateKey } from "@/lib/dates";
import type { Milestone, ProjectStatus, Task, TaskInput, TaskStatus } from "@/lib/types";
import { TaskItem } from "@/components/TaskItem";
import { TaskEditor } from "@/components/TaskEditor";
import { Button, Card, ErrorBanner, Field, HealthBadge, Modal, PageLoader, ProgressBar, inputClass } from "@/components/ui";

const statuses: { value: ProjectStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On hold" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload, setData } = useAsync(() => api.project(id), [id]);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskMilestone, setNewTaskMilestone] = useState<string | null | undefined>(undefined);
  const [milestoneModal, setMilestoneModal] = useState<Milestone | "new" | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [showDone, setShowDone] = useState(true);

  if (!data && loading) return <PageLoader />;
  if (!data) return <ErrorBanner message={error || "Project not found"} onRetry={reload} />;

  const { project, milestones, tasks } = data;
  const { stats } = project;
  const today = localDateKey();
  const visible = showDone ? tasks : tasks.filter((t) => t.status !== "done");
  const ungrouped = visible.filter((t) => !t.milestone || !milestones.some((m) => m.id === t.milestone));

  async function toggle(task: Task, status: TaskStatus) {
    if (data) setData({ ...data, tasks: data.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)) });
    try {
      await api.updateTask(task.id, { status });
    } finally {
      reload();
    }
  }

  async function saveTask(input: TaskInput & { title: string }) {
    if (editingTask) await api.updateTask(editingTask.id, input);
    else await api.createTask({ ...input, project: project.id });
    reload();
  }

  async function changeStatus(status: ProjectStatus) {
    await api.updateProject(project.id, { status });
    reload();
  }

  async function scheduleToday(task: Task) {
    await api.updateTask(task.id, { scheduledDate: today });
    reload();
  }

  const taskRow = (task: Task) => (
    <div key={task.id} className="flex items-center gap-2">
      <div className="flex-1">
        <TaskItem task={task} onToggle={toggle} onEdit={setEditingTask} showProject={false} today={today} />
      </div>
      {task.status !== "done" && !task.scheduledDate && (
        <button
          onClick={() => scheduleToday(task)}
          title="Plan for today"
          className="shrink-0 rounded-md px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950"
        >
          + Today
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <Link href="/projects" className="text-sm text-slate-500 hover:underline">
        ← Projects
      </Link>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: project.color }} />
              <h1 className="text-2xl font-semibold">{project.title}</h1>
            </div>
            {project.description && <p className="max-w-2xl text-sm text-slate-500">{project.description}</p>}
            <p className="text-xs text-slate-500">
              {project.startDate && `Started ${formatShort(project.startDate)}`}
              {project.dueDate && ` · Due ${formatShort(project.dueDate)}`}
              {project.aiGenerated && " · ✨ Planned with Gemini"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={project.status}
              onChange={(e) => changeStatus(e.target.value as ProjectStatus)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
              aria-label="Project status"
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={() => setProjectModal(true)}>
              Edit
            </Button>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <HealthBadge health={stats.health} />
              <span className="text-xs text-slate-500">{stats.reasons.join(" · ")}</span>
            </div>
            <span className="font-semibold">{stats.progress}%</span>
          </div>
          <ProgressBar value={stats.progress} health={stats.health} expected={stats.expectedProgress} className="h-3" />
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>
              {stats.done}/{stats.total} done
            </span>
            <span>{stats.inProgress} in progress</span>
            {stats.overdue > 0 && <span className="text-red-600 dark:text-red-400">{stats.overdue} overdue</span>}
            {stats.expectedProgress != null && <span>Expected by today: {stats.expectedProgress}%</span>}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Milestones</h2>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-slate-500">
            <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
            Show completed
          </label>
          <Button variant="secondary" onClick={() => setMilestoneModal("new")}>
            + Milestone
          </Button>
          <Button onClick={() => setNewTaskMilestone(null)}>+ Task</Button>
        </div>
      </div>

      <div className="space-y-4">
        {milestones.map((m, i) => {
          const own = visible.filter((t) => t.milestone === m.id);
          const health = m.stats.overdue > 0 ? "red" : m.stats.progress === 100 && m.stats.total > 0 ? "green" : undefined;
          return (
            <Card key={m.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {i + 1}
                  </span>
                  <div>
                    <button className="text-left font-semibold hover:underline" onClick={() => setMilestoneModal(m)}>
                      {m.title}
                    </button>
                    {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  {m.dueDate && (
                    <p className={m.dueDate < today && m.stats.progress < 100 ? "font-medium text-red-600 dark:text-red-400" : undefined}>
                      Due {formatShort(m.dueDate)}
                    </p>
                  )}
                  <p>
                    {m.stats.done}/{m.stats.total} · {m.stats.progress}%
                  </p>
                </div>
              </div>
              <ProgressBar value={m.stats.progress} health={health} />
              <div className="space-y-2">
                {own.map(taskRow)}
                <button onClick={() => setNewTaskMilestone(m.id)} className="text-sm text-slate-500 hover:text-indigo-600">
                  + Add task
                </button>
              </div>
            </Card>
          );
        })}

        {(ungrouped.length > 0 || milestones.length === 0) && (
          <Card className="space-y-3">
            <h3 className="font-semibold">{milestones.length ? "Other tasks" : "Tasks"}</h3>
            {ungrouped.length === 0 ? <p className="text-sm text-slate-500">No tasks yet.</p> : ungrouped.map(taskRow)}
          </Card>
        )}
      </div>

      <TaskEditor
        open={editingTask !== null || newTaskMilestone !== undefined}
        task={editingTask}
        defaults={{ project: project.id, milestone: newTaskMilestone ?? "" }}
        projects={[project]}
        milestones={milestones}
        onClose={() => {
          setEditingTask(null);
          setNewTaskMilestone(undefined);
        }}
        onSave={saveTask}
        onDelete={async (t) => {
          await api.deleteTask(t.id);
          reload();
        }}
      />

      <MilestoneModal
        milestone={milestoneModal}
        projectId={project.id}
        onClose={() => setMilestoneModal(null)}
        onSaved={reload}
      />

      <ProjectModal
        open={projectModal}
        project={project}
        onClose={() => setProjectModal(false)}
        onSaved={reload}
        onDeleted={() => router.push("/projects")}
      />
    </div>
  );
}

function MilestoneModal({
  milestone,
  projectId,
  onClose,
  onSaved,
}: {
  milestone: Milestone | "new" | null;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = milestone && milestone !== "new" ? milestone : null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastKey, setLastKey] = useState<string | null>(null);

  // Reset the form whenever a different milestone is opened.
  const key = milestone === null ? null : existing ? existing.id : "new";
  if (key !== lastKey) {
    setLastKey(key);
    setTitle(existing?.title ?? "");
    setDescription(existing?.description ?? "");
    setDueDate(existing?.dueDate ?? "");
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = { title, description, dueDate: dueDate || null };
      if (existing) await api.updateMilestone(existing.id, body);
      else await api.createMilestone(projectId, body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={milestone !== null} onClose={onClose} title={existing ? "Edit milestone" : "New milestone"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input required autoFocus className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea rows={2} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Due date">
          <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              className="text-red-600"
              onClick={async () => {
                if (!confirm("Delete this milestone? Its tasks stay in the project.")) return;
                await api.deleteMilestone(existing.id);
                onSaved();
                onClose();
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectModal({
  open,
  project,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  project: { id: string; title: string; description: string; dueDate?: string | null; startDate?: string | null };
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [startDate, setStartDate] = useState(project.startDate ?? "");
  const [dueDate, setDueDate] = useState(project.dueDate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(project.title);
      setDescription(project.description);
      setStartDate(project.startDate ?? "");
      setDueDate(project.dueDate ?? "");
      setError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateProject(project.id, { title, description, startDate: startDate || null, dueDate: dueDate || null });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit project">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input required className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <textarea rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Due date">
            <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600"
            onClick={async () => {
              if (!confirm("Delete this project and all of its milestones and tasks?")) return;
              await api.deleteProject(project.id);
              onDeleted();
            }}
          >
            Delete project
          </Button>
          <Button type="submit" loading={saving}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
