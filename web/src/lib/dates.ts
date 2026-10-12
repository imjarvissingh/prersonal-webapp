// Calendar helpers that work on YYYY-MM-DD keys, matching the API.

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parse(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parse(key);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function formatDay(key: string, today?: string): string {
  if (today) {
    if (key === today) return "Today";
    if (key === addDays(today, 1)) return "Tomorrow";
    if (key === addDays(today, -1)) return "Yesterday";
  }
  return parse(key).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function formatShort(key: string): string {
  return parse(key).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function weekdayLetter(key: string): string {
  return parse(key).toLocaleDateString(undefined, { weekday: "narrow" });
}

export function formatMinutes(total: number): string {
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
