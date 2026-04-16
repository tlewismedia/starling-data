import type { QueryResponse } from "../../shared/types";

// ── constants ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "cc:history:v1";
const MAX_ENTRIES = 50;

// ── types ─────────────────────────────────────────────────────────────────

export interface HistoryEntry {
  readonly id: string;
  readonly askedAt: string;
  readonly query: string;
  readonly response: QueryResponse;
}

// ── internals ─────────────────────────────────────────────────────────────

function hasLocalStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function readRaw(): HistoryEntry[] {
  if (!hasLocalStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeRaw(entries: readonly HistoryEntry[]): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // swallow quota / serialization errors — history is best-effort
  }
}

function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ── public API ────────────────────────────────────────────────────────────

export function loadHistory(): HistoryEntry[] {
  return readRaw();
}

export function appendHistory(entry: Omit<HistoryEntry, "id">): void {
  if (!hasLocalStorage()) return;
  const existing = readRaw();
  const mostRecent = existing[0];
  if (mostRecent && mostRecent.query.trim() === entry.query.trim()) {
    return;
  }
  const next: HistoryEntry[] = [
    { ...entry, id: makeId() },
    ...existing,
  ].slice(0, MAX_ENTRIES);
  writeRaw(next);
}

export function clearHistory(): void {
  if (!hasLocalStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // swallow
  }
}
