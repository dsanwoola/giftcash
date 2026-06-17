import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes with conditional logic, de-duping conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Human "time ago / time left" used on walls, dashboards and expiry. */
export function relativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const past = diff < 0;
  const units: [number, string][] = [
    [60_000, "minute"],
    [3_600_000, "hour"],
    [86_400_000, "day"],
    [604_800_000, "week"],
  ];
  if (abs < 60_000) return past ? "just now" : "in a moment";
  let value = 1;
  let label = "minute";
  for (const [ms, name] of units) {
    if (abs >= ms) {
      value = Math.round(abs / ms);
      label = name;
    }
  }
  const plural = value === 1 ? label : `${label}s`;
  return past ? `${value} ${plural} ago` : `in ${value} ${plural}`;
}
