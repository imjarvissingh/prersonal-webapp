export type Level = "low" | "medium" | "high";
export type TaskStatus = "todo" | "in_progress" | "done";
export type ProjectStatus = "active" | "on_hold" | "completed" | "archived";
export type Health = "green" | "yellow" | "red";

export interface User {
  id: string;
  name: string;
  email: string;
  dayStart: string;
  dayEnd: string;
  createdAt: string;
}

export interface TimeBlock {
  start: string;
  end: string;
}

export interface ProjectRef {
  id: string;
  title: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: Level;
  energy: Level;
  estimateMinutes: number;
  scheduledDate: string | null;
  timeBlock: TimeBlock | null;
  dueDate: string | null;
  project: ProjectRef | null;
  milestone: string | null;
  order: number;
  completedAt: string | null;
  rolloverCount: number;
  originalDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  stalled: number;
  progress: number;
  expectedProgress: number | null;
  health: Health;
  reasons: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  color: string;
  startDate?: string | null;
  dueDate?: string | null;
  aiGenerated: boolean;
  aiPrompt?: string;
  createdAt: string;
  updatedAt: string;
  stats: ProjectStats;
}

export interface TaskSummary {
  total: number;
  done: number;
  inProgress: number;
  overdue: number;
  stalled: number;
  progress: number;
}

export interface Milestone {
  id: string;
  project: string;
  title: string;
  description: string;
  order: number;
  dueDate?: string | null;
  stats: TaskSummary;
}

export interface ProjectDetail {
  project: Project;
  milestones: Milestone[];
  tasks: Task[];
}

export interface Dashboard {
  today: string;
  timezone: string;
  overall: {
    activeProjects: number;
    progress: number;
    totalTasks: number;
    doneTasks: number;
    overdueTasks: number;
    backlogTasks: number;
    completedThisWeek: number;
    healthCounts: Record<Health, number>;
  };
  todaySummary: TaskSummary & {
    plannedMinutes: number;
    doneMinutes: number;
    rolledOver: number;
    energy: Record<Level, { total: number; done: number }>;
  };
  todayTasks: Task[];
  activity: { date: string; completed: number }[];
  projects: Project[];
}

export interface PlanTask {
  title: string;
  notes: string;
  priority: Level;
  energy: Level;
  estimateMinutes: number;
}

export interface PlanMilestone {
  title: string;
  description: string;
  durationDays: number;
  tasks: PlanTask[];
}

export interface Plan {
  title: string;
  description: string;
  milestones: PlanMilestone[];
}

export interface TaskInput {
  title?: string;
  notes?: string;
  status?: TaskStatus;
  priority?: Level;
  energy?: Level;
  estimateMinutes?: number;
  scheduledDate?: string | null;
  timeBlock?: TimeBlock | null;
  dueDate?: string | null;
  project?: string | null;
  milestone?: string | null;
}
