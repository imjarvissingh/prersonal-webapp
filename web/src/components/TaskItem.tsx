"use client";

import Link from "next/link";
import type { Task, TaskStatus } from "@/lib/types";
import { formatMinutes, formatShort } from "@/lib/dates";
import { EnergyTag, PriorityTag, cx } from "./ui";

const nextStatus: Record<TaskStatus, TaskStatus> = { todo: "done", in_progress: "done", done: "todo" };

export function TaskItem({
  task,
  onToggle,
  onEdit,
  onStart,
  showProject = true,
  today,
}: {
  task: Task;
  onToggle: (task: Task, status: TaskStatus) => void;
  onEdit?: (task: Task) => void;
  onStart?: (task: Task) => void;
  showProject?: boolean;
  today?: string;
}) {
  const done = task.status === "done";
  const overdue = !done && today && task.dueDate && task.dueDate < today;

  return (
    <div
      className={cx(
        "group flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
        done && "opacity-60",
      )}
    >
      <button
        aria-label={done ? "Mark as not done" : "Mark as done"}
        onClick={() => onToggle(task, nextStatus[task.status])}
        className={cx(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] text-white transition",
          done ? "border-emerald-500 bg-emerald-500" : "border-slate-300 hover:border-emerald-500 dark:border-slate-600",
          task.status === "in_progress" && "border-indigo-500",
        )}
      >
        {done && "✓"}
      </button>

      <button className="min-w-0 flex-1 text-left" onClick={() => onEdit?.(task)} disabled={!onEdit}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {task.timeBlock && (
            <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">
              {task.timeBlock.start}–{task.timeBlock.end}
            </span>
          )}
          <span className={cx("text-sm font-medium", done && "line-through")}>{task.title}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <EnergyTag energy={task.energy} />
          <PriorityTag priority={task.priority} />
          {task.estimateMinutes > 0 && <span>{formatMinutes(task.estimateMinutes)}</span>}
          {task.status === "in_progress" && <span className="font-medium text-indigo-600 dark:text-indigo-400">In progress</span>}
          {task.rolloverCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400" title={task.originalDate ? `Originally ${task.originalDate}` : undefined}>
              ↻ rolled over {task.rolloverCount}×
            </span>
          )}
          {task.dueDate && (
            <span className={cx(overdue && "font-medium text-red-600 dark:text-red-400")}>due {formatShort(task.dueDate)}</span>
          )}
          {showProject && task.project && (
            <Link
              href={`/projects/${task.project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 hover:underline"
            >
              <span className="h-2 w-2 rounded-full" style={{ background: task.project.color }} />
              {task.project.title}
            </Link>
          )}
        </div>
      </button>

      {onStart && task.status === "todo" && (
        <button
          onClick={() => onStart(task)}
          className="hidden rounded px-2 py-1 text-xs text-indigo-600 hover:bg-indigo-50 group-hover:block dark:hover:bg-indigo-950"
        >
          Start
        </button>
      )}
    </div>
  );
}
