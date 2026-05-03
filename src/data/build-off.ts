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

// =============================
// Tiered build-off definitions
// =============================

export interface BuildOffTier {
  tier: 1 | 2 | 3;
  label: string;
  /** One-line constraint shown in the UI badge. */
  constraint: string;
  description: string;
}

export const BUILD_OFF_TIERS: BuildOffTier[] = [
  {
    tier: 1,
    label: "Tier I — Single file",
    constraint: "One index.html · CDN deps only · no build step",
    description:
      "The level playing field. Every tool participates. The prompt must produce a single self-contained file that runs in any browser without a build step.",
  },
  {
    tier: 2,
    label: "Tier II — Component",
    constraint: "React/Vue component · no backend required",
    description:
      "Framework-native output. Tools that scaffold components naturally. No auto-deploy required — the harness builds and serves.",
  },
  {
    tier: 3,
    label: "Tier III — Deployed app",
    constraint: "Full app · live URL required",
    description:
      "Tools with native hosting: the output must be a reachable URL, not just files. Harness-served entries are flagged distinctly.",
  },
];

export function getBuildOffTier(tier: 1 | 2 | 3): BuildOffTier {
  return BUILD_OFF_TIERS.find((t) => t.tier === tier)!;
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
  /** Present when the round is a tiered visual challenge. */
  tier?: 1 | 2 | 3;
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
      { tool: "Soupy Together", raw: { cost: 0.38, time: 52, fidelity: 76, correctness: 84, refactor: 82, honesty: 90, bundle: 150 }, notes: "Daily driver. Routed scaffolding to Tier 0/1, escalated only auth wiring to Tier 2. No frontier call needed. Doesn't top any single column — that's the point." },
      { tool: "Lovable Pro",    raw: { cost: 1.10, time: 47, fidelity: 88, correctness: 86, refactor: 78, honesty: 72, bundle: 168 }, notes: "Strong UI, occasional confident-but-wrong RLS guesses on edits." },
      { tool: "Bolt",           raw: { cost: 1.45, time: 41, fidelity: 79, correctness: 78, refactor: 64, honesty: 65, bundle: 184 }, notes: "Fast first preview, follow-up edits regressed auth twice." },
      { tool: "v0 by Vercel",   raw: { cost: 0.95, time: 32, fidelity: 91, correctness: 71, refactor: 68, honesty: 70, bundle: 156 }, notes: "Best-looking UI, no real backend wiring on first pass." },
      { tool: "Cursor",         raw: { cost: 1.80, time: 96, fidelity: 70, correctness: 90, refactor: 86, honesty: 84, bundle: 138 }, notes: "Required developer-in-the-loop. Cleanest code once driven." },
      { tool: "Replit Agent",   raw: { cost: 2.10, time: 88, fidelity: 74, correctness: 80, refactor: 70, honesty: 68, bundle: 172 }, notes: "Worked end to end, slowest and most expensive." },
      { tool: "Claude Code",    raw: { cost: 1.55, time: 72, fidelity: 68, correctness: 91, refactor: 89, honesty: 88, bundle: 134 }, notes: "Backend-strong, UI plain. Honest about ambiguity in prompt." },
    ],
  },
  {
    id: "002-crm-dashboard",
    number: 2,
    title: "CRM dashboard with charts",
    prompt:
      'Build an internal CRM dashboard. Show a sortable table of contacts (name, company, status, last touched). Above it, three KPI cards (total contacts, active deals, won this month) and a line chart of deals/week for the last 12 weeks. Filter by status. Seed with 50 fake contacts. Mobile-friendly.',
    brief:
      "Tests data-dense UI: tables, KPIs, charts, and filter state. Stresses layout discipline and chart-library wiring more than backend.",
    status: "sample",
    date: "2026-04-22",
    runs: [
      { tool: "Soupy Together", raw: { cost: 0.52, time: 61, fidelity: 78, correctness: 82, refactor: 80, honesty: 88, bundle: 172 }, notes: "Routed table + KPIs to Tier 1, escalated chart wiring to Tier 2." },
      { tool: "Lovable Pro",    raw: { cost: 1.25, time: 54, fidelity: 90, correctness: 84, refactor: 76, honesty: 70, bundle: 188 }, notes: "Polished cards and chart, occasional invented column." },
      { tool: "Bolt",           raw: { cost: 1.60, time: 48, fidelity: 80, correctness: 74, refactor: 60, honesty: 62, bundle: 204 }, notes: "Filter state regressed when chart was added." },
      { tool: "v0 by Vercel",   raw: { cost: 1.05, time: 38, fidelity: 93, correctness: 70, refactor: 66, honesty: 68, bundle: 168 }, notes: "Best-looking dashboard, no real filter logic on first pass." },
      { tool: "Cursor",         raw: { cost: 2.00, time: 110, fidelity: 72, correctness: 89, refactor: 84, honesty: 82, bundle: 154 }, notes: "Required dev-in-the-loop. Cleanest sort/filter code." },
      { tool: "Replit Agent",   raw: { cost: 2.30, time: 102, fidelity: 76, correctness: 78, refactor: 68, honesty: 66, bundle: 192 }, notes: "End-to-end, slowest." },
      { tool: "Claude Code",    raw: { cost: 1.70, time: 84, fidelity: 70, correctness: 90, refactor: 88, honesty: 87, bundle: 148 }, notes: "Strong logic, plain visuals." },
    ],
  },
  {
    id: "003-chat-widget",
    number: 3,
    title: "Embeddable chat widget",
    prompt:
      'Build an embeddable chat widget. A floating button bottom-right opens a panel with a streaming AI assistant. Persist conversation in localStorage. Provide a single <script> tag a customer can drop into any site. Mobile-friendly. No backend assumed beyond a /chat streaming endpoint.',
    brief:
      "Tests streaming UI, embed/iframe boundaries, and packaging discipline. Reveals which tools understand build output for distribution vs. just app rendering.",
    status: "sample",
    date: "2026-04-29",
    runs: [
      { tool: "Soupy Together", raw: { cost: 0.46, time: 58, fidelity: 74, correctness: 83, refactor: 81, honesty: 89, bundle: 96 }, notes: "Tier 1 scaffold, Tier 2 only for streaming SSE wiring. Smallest bundle." },
      { tool: "Lovable Pro",    raw: { cost: 1.18, time: 51, fidelity: 86, correctness: 82, refactor: 75, honesty: 71, bundle: 142 }, notes: "Pretty panel, embed script needed manual fixes." },
      { tool: "Bolt",           raw: { cost: 1.50, time: 44, fidelity: 78, correctness: 76, refactor: 62, honesty: 63, bundle: 168 }, notes: "Fast preview, streaming broke after a refactor." },
      { tool: "v0 by Vercel",   raw: { cost: 0.98, time: 35, fidelity: 90, correctness: 68, refactor: 65, honesty: 69, bundle: 124 }, notes: "Beautiful UI, no real embed packaging." },
      { tool: "Cursor",         raw: { cost: 1.85, time: 99, fidelity: 70, correctness: 90, refactor: 86, honesty: 84, bundle: 102 }, notes: "Cleanest streaming + embed bundle, slow." },
      { tool: "Replit Agent",   raw: { cost: 2.20, time: 94, fidelity: 72, correctness: 79, refactor: 70, honesty: 67, bundle: 158 }, notes: "Worked end-to-end, expensive." },
      { tool: "Claude Code",    raw: { cost: 1.60, time: 76, fidelity: 66, correctness: 92, refactor: 89, honesty: 88, bundle: 110 }, notes: "Strong streaming logic. UI minimal." },
    ],
  },
  {
    id: "005-rotating-planet",
    number: 5,
    tier: 1,
    title: "3D rotating planet",
    prompt:
      "Produce a single index.html with no build step. Load Three.js r165 from the jsDelivr CDN. Render a 3D sphere with a realistic surface: use MeshStandardMaterial with a roughness map procedurally generated from canvas noise — no external texture files. Add a soft atmospheric rim-glow using an additive backface sphere. Rotate the planet on its axis continuously. Support click-and-drag orbit. Background: deep space with at least 300 randomly placed stars rendered as Points. The result must look impressive at 600×400. No frameworks, no bundlers, no npm.",
    brief:
      "Tier I visual proficiency challenge. One HTML file, Three.js from CDN, no build step. Tests whether each tool can produce something genuinely impressive under tight, portable constraints — the lowest common denominator that every participant can hit.",
    status: "sample",
    date: "2026-05-10",
    runs: [
      { tool: "Soupy Together", raw: { cost: 0.09, time: 18,  fidelity: 72, correctness: 90, refactor: 40, honesty: 88, bundle: 12  }, notes: "Tier 0/1 handled the Three.js boilerplate cheaply. Atmosphere glow present, surface noise functional." },
      { tool: "Lovable Pro",    raw: { cost: 0.28, time: 22,  fidelity: 86, correctness: 84, refactor: 35, honesty: 70, bundle: 12  }, notes: "Strong visual output. Attempted to scaffold React — needed a prompt nudge to stay single-file." },
      { tool: "Bolt",           raw: { cost: 0.32, time: 19,  fidelity: 80, correctness: 78, refactor: 30, honesty: 62, bundle: 12  }, notes: "Fast. Surface detail thinner, glow present." },
      { tool: "v0 by Vercel",   raw: { cost: 0.22, time: 14,  fidelity: 91, correctness: 76, refactor: 28, honesty: 66, bundle: 12  }, notes: "Best-looking sphere. Surface texture richest of the set. Drag orbit slightly jumpy." },
      { tool: "Cursor",         raw: { cost: 0.45, time: 54,  fidelity: 70, correctness: 92, refactor: 45, honesty: 82, bundle: 12  }, notes: "Cleanest Three.js code. Visually plain — prioritized correctness over impressiveness." },
      { tool: "Replit Agent",   raw: { cost: 0.55, time: 48,  fidelity: 74, correctness: 80, refactor: 32, honesty: 65, bundle: 12  }, notes: "Ran end-to-end. Stars sparse, atmosphere thin." },
      { tool: "Claude Code",    raw: { cost: 0.38, time: 38,  fidelity: 68, correctness: 93, refactor: 48, honesty: 86, bundle: 12  }, notes: "Error-free, structured geometry code. Visuals minimal — no rim glow, basic star field." },
    ],
  },
  {
    id: "004-landing-page",
    number: 4,
    title: "Marketing landing page",
    prompt:
      'Build a marketing landing page for a fictional B2B SaaS. Hero with headline + CTA, three feature cards, a customer logo strip, a pricing table with three tiers, and a footer with email signup. SEO-clean (title, description, OG, semantic HTML). Mobile-friendly. No backend beyond the email signup posting to /subscribe.',
    brief:
      "Tests pure design + SEO craft. Composition, typography hierarchy, semantic HTML, and OG metadata — the place where visual-first tools should shine.",
    status: "sample",
    date: "2026-05-02",
    runs: [
      { tool: "Soupy Together", raw: { cost: 0.34, time: 49, fidelity: 80, correctness: 86, refactor: 83, honesty: 90, bundle: 118 }, notes: "Routed almost entirely to Tier 0/1. Cheap and clean." },
      { tool: "Lovable Pro",    raw: { cost: 1.05, time: 44, fidelity: 92, correctness: 87, refactor: 79, honesty: 73, bundle: 146 }, notes: "Strong type hierarchy, occasional invented social proof." },
      { tool: "Bolt",           raw: { cost: 1.40, time: 39, fidelity: 82, correctness: 78, refactor: 65, honesty: 66, bundle: 162 }, notes: "Fast, generic AI-aesthetic gradients." },
      { tool: "v0 by Vercel",   raw: { cost: 0.92, time: 30, fidelity: 96, correctness: 74, refactor: 70, honesty: 71, bundle: 132 }, notes: "Best visual fidelity in the round. SEO meta partial." },
      { tool: "Cursor",         raw: { cost: 1.75, time: 92, fidelity: 68, correctness: 91, refactor: 87, honesty: 85, bundle: 108 }, notes: "Cleanest semantic HTML, plainest design." },
      { tool: "Replit Agent",   raw: { cost: 2.05, time: 86, fidelity: 74, correctness: 80, refactor: 71, honesty: 68, bundle: 156 }, notes: "Worked end-to-end." },
      { tool: "Claude Code",    raw: { cost: 1.50, time: 70, fidelity: 66, correctness: 92, refactor: 90, honesty: 89, bundle: 114 }, notes: "Strong semantics + OG. Visuals plain." },
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
