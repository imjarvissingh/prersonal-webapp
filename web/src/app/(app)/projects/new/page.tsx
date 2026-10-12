"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Level, Plan } from "@/lib/types";
import { formatMinutes } from "@/lib/dates";
import { Button, Card, EnergyTag, Field, PriorityTag, cx, inputClass } from "@/components/ui";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6"];
const EXAMPLES = [
  "Build a SaaS landing page with Stripe checkout and a waitlist",
  "Migrate my Express API from JavaScript to TypeScript with tests",
  "Ship a Flutter habit tracker to the App Store",
];
const levels: Level[] = ["low", "medium", "high"];

export default function NewProjectPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [prompt, setPrompt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Manual form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  async function generate(e?: React.FormEvent) {
    e?.preventDefault();
    setGenerating(true);
    setError(null);
    try {
      const res = await api.generatePlan({ prompt, deadline: deadline || undefined });
      setPlan(res.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate a plan");
    } finally {
      setGenerating(false);
    }
  }

  async function savePlan() {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const res = await api.createFromPlan({ plan, prompt, deadline: deadline || undefined, color });
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project");
      setSaving(false);
    }
  }

  async function createManual(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await api.createProject({ title, description, color, dueDate: deadline || undefined });
      router.push(`/projects/${res.project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project");
      setSaving(false);
    }
  }

  // Plan editing helpers
  const updatePlan = (fn: (p: Plan) => Plan) => setPlan((p) => (p ? fn(structuredClone(p)) : p));
  const totalTasks = plan?.milestones.reduce((s, m) => s + m.tasks.length, 0) ?? 0;
  const totalMinutes = plan?.milestones.reduce((s, m) => s + m.tasks.reduce((a, t) => a + t.estimateMinutes, 0), 0) ?? 0;

  const colorPicker = (
    <Field label="Color">
      <div className="flex gap-2">
        {COLORS.map((c) => (
          <button
            type="button"
            key={c}
            aria-label={`Color ${c}`}
            onClick={() => setColor(c)}
            className={cx("h-7 w-7 rounded-full ring-offset-2 dark:ring-offset-slate-900", color === c && "ring-2 ring-slate-400")}
            style={{ background: c }}
          />
        ))}
      </div>
    </Field>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">New project</h1>
        <p className="text-sm text-slate-500">Describe the outcome and Gemini drafts milestones and tasks you can edit before saving.</p>
      </header>

      <div className="flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {(["ai", "manual"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cx(
              "flex-1 rounded-md px-3 py-1.5 text-sm font-medium",
              mode === m ? "bg-white shadow-sm dark:bg-slate-900" : "text-slate-500",
            )}
          >
            {m === "ai" ? "✨ Scaffold with AI" : "Start blank"}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}

      {mode === "manual" ? (
        <Card>
          <form onSubmit={createManual} className="space-y-4">
            <Field label="Title">
              <input required maxLength={140} className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Description">
              <textarea rows={3} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Due date">
              <input type="date" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </Field>
            {colorPicker}
            <Button type="submit" loading={saving}>
              Create project
            </Button>
          </form>
        </Card>
      ) : (
        <>
          <Card>
            <form onSubmit={generate} className="space-y-4">
              <Field label="What do you want to build?">
                <textarea
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={4}
                  className={inputClass}
                  placeholder="A personal finance dashboard that imports bank CSVs, categorises spending and shows monthly trends…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((ex) => (
                  <button
                    type="button"
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Deadline (optional)">
                  <input type="date" className={inputClass} value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                </Field>
                {colorPicker}
              </div>
              <Button type="submit" loading={generating} disabled={prompt.trim().length < 10}>
                {plan ? "Regenerate plan" : "Generate plan"}
              </Button>
            </form>
          </Card>

          {generating && !plan && (
            <p className="text-center text-sm text-slate-500">Gemini is breaking your idea into milestones…</p>
          )}

          {plan && (
            <div className="space-y-4">
              <Card className="space-y-3">
                <input
                  className="w-full bg-transparent text-xl font-semibold focus:outline-none"
                  value={plan.title}
                  onChange={(e) => updatePlan((p) => ({ ...p, title: e.target.value }))}
                  aria-label="Project title"
                />
                <textarea
                  className="w-full resize-none bg-transparent text-sm text-slate-600 focus:outline-none dark:text-slate-400"
                  rows={2}
                  value={plan.description}
                  onChange={(e) => updatePlan((p) => ({ ...p, description: e.target.value }))}
                  aria-label="Project description"
                />
                <p className="text-xs text-slate-500">
                  {plan.milestones.length} milestones · {totalTasks} tasks · ~{formatMinutes(totalMinutes)} of work
                </p>
              </Card>

              {plan.milestones.map((m, mi) => (
                <Card key={mi} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {mi + 1}
                    </span>
                    <div className="flex-1 space-y-1">
                      <input
                        className="w-full bg-transparent font-semibold focus:outline-none"
                        value={m.title}
                        onChange={(e) =>
                          updatePlan((p) => {
                            p.milestones[mi].title = e.target.value;
                            return p;
                          })
                        }
                        aria-label="Milestone title"
                      />
                      {m.description && <p className="text-sm text-slate-500">{m.description}</p>}
                    </div>
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      <input
                        type="number"
                        min={1}
                        max={365}
                        className="w-14 rounded border border-slate-300 bg-transparent px-1 py-0.5 text-right dark:border-slate-700"
                        value={m.durationDays}
                        onChange={(e) =>
                          updatePlan((p) => {
                            p.milestones[mi].durationDays = Math.max(1, Number(e.target.value) || 1);
                            return p;
                          })
                        }
                      />
                      days
                    </label>
                    {plan.milestones.length > 1 && (
                      <button
                        className="text-slate-400 hover:text-red-500"
                        aria-label="Remove milestone"
                        onClick={() =>
                          updatePlan((p) => {
                            p.milestones.splice(mi, 1);
                            return p;
                          })
                        }
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <ul className="space-y-2 pl-9">
                    {m.tasks.map((t, ti) => (
                      <li key={ti} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                        <input
                          className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
                          value={t.title}
                          onChange={(e) =>
                            updatePlan((p) => {
                              p.milestones[mi].tasks[ti].title = e.target.value;
                              return p;
                            })
                          }
                          aria-label="Task title"
                        />
                        <select
                          className="rounded bg-transparent text-xs"
                          value={t.energy}
                          aria-label="Energy"
                          onChange={(e) =>
                            updatePlan((p) => {
                              p.milestones[mi].tasks[ti].energy = e.target.value as Level;
                              return p;
                            })
                          }
                        >
                          {levels.map((l) => (
                            <option key={l} value={l}>
                              ⚡ {l}
                            </option>
                          ))}
                        </select>
                        <span className="hidden sm:inline">
                          <PriorityTag priority={t.priority} />
                        </span>
                        <span className="hidden sm:inline">
                          <EnergyTag energy={t.energy} />
                        </span>
                        <span className="w-12 text-right text-xs text-slate-500">{formatMinutes(t.estimateMinutes)}</span>
                        {m.tasks.length > 1 && (
                          <button
                            className="text-xs text-slate-400 hover:text-red-500"
                            aria-label="Remove task"
                            onClick={() =>
                              updatePlan((p) => {
                                p.milestones[mi].tasks.splice(ti, 1);
                                return p;
                              })
                            }
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPlan(null)}>
                  Discard
                </Button>
                <Button onClick={savePlan} loading={saving}>
                  Create project
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
