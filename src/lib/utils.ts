import { clsx } from "clsx";
import type { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" });
const day = new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeZone: "Asia/Jakarta" });
const time = new Intl.DateTimeFormat("id-ID", { timeStyle: "short", timeZone: "Asia/Jakarta" });

/** A UTC ISO timestamp as a clinic date, such as "9 Sep 2026". */
export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}

/** A UTC ISO timestamp as a clinic time, such as "09.00". */
export function formatTime(iso: string): string {
  return time.format(new Date(iso));
}

/** A UTC ISO timestamp as a clinic day, such as "Senin, 09 November 2026". */
export function formatDay(iso: string): string {
  return day.format(new Date(iso));
}
