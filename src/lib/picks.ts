/**
 * User per-category tool preferences, persisted to localStorage.
 *
 * These act as routing hints — the SACE proxy on /demo will read them and
 * forward as a `preferences` field to the external router. The server still
 * has final say on budget and availability.
 */

import type { CategoryId } from "@/data/build-off-categories";

const KEY = "soupy.picks.v1";

export type Picks = Partial<Record<CategoryId, string>>;

export function readPicks(): Picks {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object") return parsed as Picks;
    return {};
  } catch {
    return {};
  }
}

export function writePicks(p: Picks): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(p));
    window.dispatchEvent(new CustomEvent("soupy.picks.changed"));
  } catch {
    /* quota or disabled storage — silently ignore */
  }
}

export function setPick(cat: CategoryId, tool: string): Picks {
  const next = { ...readPicks(), [cat]: tool };
  writePicks(next);
  return next;
}

export function clearPick(cat: CategoryId): Picks {
  const next = { ...readPicks() };
  delete next[cat];
  writePicks(next);
  return next;
}

export function subscribe(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => fn();
  window.addEventListener("soupy.picks.changed", handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener("soupy.picks.changed", handler);
    window.removeEventListener("storage", handler);
  };
}
