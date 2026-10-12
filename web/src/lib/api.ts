import type {
  Dashboard,
  Milestone,
  Plan,
  Project,
  ProjectDetail,
  ProjectStatus,
  Task,
  TaskInput,
  User,
} from "./types";

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const TOKEN_KEY = "devtracker.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();
export function onUnauthorized(fn: Listener) {
  unauthorizedListeners.add(fn);
  return () => {
    unauthorizedListeners.delete(fn);
  };
}

async function request<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the server. Check your connection and try again.");
  }

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) unauthorizedListeners.forEach((fn) => fn());
    throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

const qs = (params: Record<string, string | boolean | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") search.set(k, String(v));
  });
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const api = {
  // Auth
  register: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/register", { method: "POST", body }),
  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: User }>("/api/auth/login", { method: "POST", body }),
  me: () => request<{ user: User }>("/api/auth/me"),
  updateMe: (body: Partial<Pick<User, "name" | "dayStart" | "dayEnd">> & { currentPassword?: string; newPassword?: string }) =>
    request<{ user: User }>("/api/auth/me", { method: "PATCH", body }),

  // Dashboard
  dashboard: () => request<Dashboard>("/api/dashboard"),

  // Projects
  projects: (status?: ProjectStatus | "all") => request<{ projects: Project[] }>(`/api/projects${qs({ status })}`),
  project: (id: string) => request<ProjectDetail>(`/api/projects/${id}`),
  createProject: (body: Partial<Pick<Project, "title" | "description" | "color" | "startDate" | "dueDate">>) =>
    request<{ project: Project }>("/api/projects", { method: "POST", body }),
  updateProject: (id: string, body: Partial<Pick<Project, "title" | "description" | "status" | "color" | "startDate" | "dueDate">>) =>
    request<{ project: Project }>(`/api/projects/${id}`, { method: "PATCH", body }),
  deleteProject: (id: string) => request<void>(`/api/projects/${id}`, { method: "DELETE" }),

  // Milestones
  createMilestone: (projectId: string, body: { title: string; description?: string; dueDate?: string | null }) =>
    request<{ milestone: Milestone }>(`/api/projects/${projectId}/milestones`, { method: "POST", body }),
  updateMilestone: (id: string, body: { title?: string; description?: string; dueDate?: string | null }) =>
    request<{ milestone: Milestone }>(`/api/milestones/${id}`, { method: "PATCH", body }),
  deleteMilestone: (id: string) => request<void>(`/api/milestones/${id}`, { method: "DELETE" }),

  // Tasks
  tasks: (params: { date?: string; project?: string; backlog?: boolean; overdue?: boolean }) =>
    request<{ tasks: Task[]; today: string }>(`/api/tasks${qs(params)}`),
  createTask: (body: TaskInput & { title: string }) => request<{ task: Task }>("/api/tasks", { method: "POST", body }),
  updateTask: (id: string, body: TaskInput) => request<{ task: Task }>(`/api/tasks/${id}`, { method: "PATCH", body }),
  deleteTask: (id: string) => request<void>(`/api/tasks/${id}`, { method: "DELETE" }),
  rollover: () => request<{ today: string; rolledOver: number }>("/api/tasks/rollover", { method: "POST" }),
  autoSchedule: (date: string) =>
    request<{ date: string; placed: number; unplaced: string[]; tasks: Task[] }>("/api/tasks/auto-schedule", {
      method: "POST",
      body: { date },
    }),

  // AI
  generatePlan: (body: { prompt: string; deadline?: string }) =>
    request<{ plan: Plan }>("/api/ai/plan", { method: "POST", body }),
  createFromPlan: (body: { plan: Plan; prompt?: string; deadline?: string; color?: string }) =>
    request<{ project: Project }>("/api/ai/projects", { method: "POST", body }),
};
