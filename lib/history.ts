import type { HistoryEntry } from "./types";

const STORAGE_KEY = "calorie-camera-history";

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addHistoryEntry(entry: HistoryEntry) {
  const entries = loadHistory();
  const next = [entry, ...entries].slice(0, 20);
  saveHistory(next);
  return next;
}
