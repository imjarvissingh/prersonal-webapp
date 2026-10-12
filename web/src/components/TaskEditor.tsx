"use client";

import { useState } from "react";
import type { Level, Milestone, Project, Task, TaskInput, TaskStatus } from "@/lib/types";
import { Button, Field, Modal, inputClass } from "./ui";

const levels: Level[] = ["low", "medium", "high"];

interface FormState {
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Level;
  energy: Level;
  estimateMinutes: string;
  scheduledDate: string;
  start: string;
  end: string;
  dueDate: string;
  project: string;
  milestone: string;
}

function toForm(task: Partial<Task> | null, defaults: Partial<FormState>): FormState {
  return {
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    status: task?.status ?? "todo",
    priority: task?.priority ?? "medium",
    energy: task?.energy ?? "medium",
    estimateMinutes: String(task?.estimateMinutes ?? 30),
    scheduledDate: task?.scheduledDate ?? defaults.scheduledDate ?? "",
    start: task?.timeBlock?.start ?? "",
    end: task?.timeBlock?.end ?? "",
    dueDate: task?.dueDate ?? "",
    project: task?.project?.id ?? defaults.project ?? "",
    milestone: task?.milestone ?? defaults.milestone ?? "",
  };
}

export function TaskEditor({
  open,
  task,
  defaults = {},
  projects = [],
  milestones = [],
  onClose,
  onSave,
  onDelete,
}: {
  open: boolean;
  task: Task | null;
  defaults?: Partial<FormState>;
  projects?: Project[];
  milestones?: Milestone[];
  onClose: () => void;
  onSave: (input: TaskInput & { title: string }) => Promise<void>;
  onDelete?: (task: Task) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(() => toForm(task, defaults));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset the form whenever the dialog opens or switches to another task.
  const formKey = open ? (task?.id ?? "new") : null;
  const [lastKey, setLastKey] = useState(formKey);
  if (formKey !== lastKey) {
    setLastKey(formKey);
    if (formKey) {
      setForm(toForm(task, defaults));
      setError(null);
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const projectMilestones = milestones.filter((m) => m.project === form.project);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if ((form.start && !form.end) || (!form.start && form.end)) {
      setError("Set both a start and end time, or neither");
      return;
    }
    if (form.start && form.end && form.start >= form.end) {
      setError("End time must be after start time");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: form.title.trim(),
        notes: form.notes.trim(),
        status: form.status,
        priority: form.priority,
        energy: form.energy,
        estimateMinutes: Math.max(0, Number(form.estimateMinutes) || 0),
        scheduledDate: form.scheduledDate || null,
        timeBlock: form.start && form.end && form.scheduledDate ? { start: form.start, end: form.end } : null,
        dueDate: form.dueDate || null,
        project: form.project || null,
        milestone: form.milestone || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? "Edit task" : "New task"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <input
            autoFocus
            required
            maxLength={200}
            className={inputClass}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Write the API docs"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Energy">
            <select className={inputClass} value={form.energy} onChange={(e) => set("energy", e.target.value as Level)}>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className={inputClass} value={form.priority} onChange={(e) => set("priority", e.target.value as Level)}>
              {levels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estimate (min)">
            <input
              type="number"
              min={0}
              max={1440}
              step={5}
              className={inputClass}
              value={form.estimateMinutes}
              onChange={(e) => set("estimateMinutes", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Day">
            <input type="date" className={inputClass} value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} />
          </Field>
          <Field label="Start">
            <input
              type="time"
              className={inputClass}
              value={form.start}
              disabled={!form.scheduledDate}
              onChange={(e) => set("start", e.target.value)}
            />
          </Field>
          <Field label="End">
            <input
              type="time"
              className={inputClass}
              value={form.end}
              disabled={!form.scheduledDate}
              onChange={(e) => set("end", e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => set("status", e.target.value as TaskStatus)}>
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" className={inputClass} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </Field>
        </div>

        {projects.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project">
              <select
                className={inputClass}
                value={form.project}
                onChange={(e) => setForm((f) => ({ ...f, project: e.target.value, milestone: "" }))}
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </Field>
            {projectMilestones.length > 0 && (
              <Field label="Milestone">
                <select className={inputClass} value={form.milestone} onChange={(e) => set("milestone", e.target.value)}>
                  <option value="">None</option>
                  {projectMilestones.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        )}

        <Field label="Notes">
          <textarea rows={3} maxLength={4000} className={inputClass} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          {task && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              className="text-red-600"
              onClick={async () => {
                if (!confirm("Delete this task?")) return;
                await onDelete(task);
                onClose();
              }}
            >
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {task ? "Save" : "Add task"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
