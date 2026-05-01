/**
 * Build-Off data
 *
 * SAMPLE DATA — not yet from a verified live run.
 * Numbers below are plausible estimates based on public pricing and
 * widely-reported behavior of each tool as of April 2026. Replace with
 * real measurements after the first published run.
 *
 * Scoring: each measure is normalized 0–100 (higher = better) with a
 * documented rubric. Composite is a weighted mean.
 */

export type MeasureKey =
  | "cost"
  | "time"
  | "fidelity"
  | "correctness"
  | "refactor"
  | "honesty"
  | "bundle";

export interface Measure {
  key: MeasureKey;
  label: string;
  unit: string;
  description: string;
  /** Higher raw value is better? If false, lower raw is better. */
  higherBetter: boolean;
  weight: number;
}

export const MEASURES: Measure[] = [
  { key: "cost",        label: "Cost per output",        unit: "USD",     description: "Dollars to ship the same feature, end to end.",           higherBetter: false, weight: 0.22 },
  { key: "time",        label: "Time to first preview",  unit: "seconds", description: "Seconds from prompt submitted to a running preview.",     higherBetter: false, weight: 0.12 },
  { key: "fidelity",    label: "Visual fidelity",        unit: "score",   description: "Design quality of the generated UI vs. the spec brief.",  higherBetter: true,  weight: 0.16 },
  { key: "correctness", label: "Code correctness",       unit: "score",   description: "Runtime errors, type safety, test outcomes.",             higherBetter: true,  weight: 0.20 },
  { key: "refactor",    label: "Refactor reliability",   unit: "score",   description: "Preservation of correctness across follow-up changes.",   higherBetter: true,  weight: 0.14 },
  { key: "honesty",     label: "Honesty under uncertainty", unit: "score", description: "Rate of confabulation on ambiguous input. Higher = honest.", higherBetter: true, weight: 0.10 },
  { key: "bundle",      label: "Bundle size",            unit: "kB",      description: "Bytes shipped per equivalent output, gzipped.",           higherBetter: false, weight: 0.06 },
];

export interface ToolRun {
  tool: string;
  raw: Record<MeasureKey, number>;
  notes?: string;
}

export interface BuildOff {
  id: string;
  number: number;
  title: string;
  prompt: string;
  brief: string;
  status: "sample" | "verified";
  date: string;
  runs: ToolRun[];
}

export const BUILD_OFFS: BuildOff[] = [
  {
    id: "001-todo-auth",
    number: 1,
    title: "Todo app with email auth",
    prompt:
      'Build a todo list web app. Users sign up with email + password. Each user sees only their own todos. Mark complete, delete, edit inline. Persist across reload. Mobile-friendly. Ship a working preview.',
    brief:
      "Standard CRUD with auth and per-user isolation. Tests baseline competence: scaffolding a database-backed app, wiring auth, and rendering a usable UI from a single prompt.",
    status: "sample",
    date: "2026-04-15",
    runs: [
      { tool: "Soupy Together", raw: { cost: 0.41, time: 38, fidelity: 84, correctness: 92, refactor: 88, honesty: 91, bundle: 142 }, notes: "Routed scaffolding to Tier 0/1, escalated auth wiring to Tier 2. No frontier call needed." },
      { tool: "Lovable Pro",    raw: { cost: 1.10, time: 47, fidelity: 88, correctness: 86, refactor: 78, honesty: 72, bundle: 168 }, notes: "Strong UI, occasional confident-but-wrong RLS guesses on edits." },
      { tool: "Bolt",           raw: { cost: 1.45, time: 41, fidelity: 79, correctness: 78, refactor: 64, honesty: 65, bundle: 184 }, notes: "Fast first preview, follow-up edits regressed auth twice." },
      { tool: "v0 by Vercel",   raw: { cost: 0.95, time: 32, fidelity: 91, correctness: 71, refactor: 68, honesty: 70, bundle: 156 }, notes: "Best-looking UI, no real backend wiring on first pass." },
      { tool: "Cursor",         raw: { cost: 1.80, time: 96, fidelity: 70, correctness: 90, refactor: 86, honesty: 84, bundle: 138 }, notes: "Required developer-in-the-loop. Cleanest code once driven." },
      { tool: "Replit Agent",   raw: { cost: 2.10, time: 88, fidelity: 74, correctness: 80, refactor: 70, honesty: 68, bundle: 172 }, notes: "Worked end to end, slowest and most expensive." },
      { tool: "Claude Code",    raw: { cost: 1.55, time: 72, fidelity: 68, correctness: 91, refactor: 89, honesty: 88, bundle: 134 }, notes: "Backend-strong, UI plain. Honest about ambiguity in prompt." },
    ],
  },
];

// =============================
// Scoring helpers
// =============================
function minMax(values: number[]) {
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** Normalize a single raw value to 0–100 given the column's direction. */
export function normalize(
  raw: number,
  measure: Measure,
  column: number[],
): number {
  const { min, max } = minMax(column);
  if (max === min) return 100;
  const t = (raw - min) / (max - min);
  return Math.round(((measure.higherBetter ? t : 1 - t) * 100));
}

export interface ScoredRun extends ToolRun {
  scores: Record<MeasureKey, number>;
  composite: number;
}

export function scoreBuildOff(b: BuildOff): ScoredRun[] {
  const columns = Object.fromEntries(
    MEASURES.map((m) => [m.key, b.runs.map((r) => r.raw[m.key])]),
  ) as Record<MeasureKey, number[]>;

  const scored: ScoredRun[] = b.runs.map((r) => {
    const scores = Object.fromEntries(
      MEASURES.map((m) => [m.key, normalize(r.raw[m.key], m, columns[m.key])]),
    ) as Record<MeasureKey, number>;
    const composite = MEASURES.reduce((acc, m) => acc + scores[m.key] * m.weight, 0);
    return { ...r, scores, composite: Math.round(composite) };
  });

  return scored.sort((a, b) => b.composite - a.composite);
}

export function formatRaw(value: number, measure: Measure): string {
  if (measure.unit === "USD") return `$${value.toFixed(2)}`;
  if (measure.unit === "seconds") return `${Math.round(value)}s`;
  if (measure.unit === "kB") return `${Math.round(value)} kB`;
  return `${Math.round(value)}`;
}
