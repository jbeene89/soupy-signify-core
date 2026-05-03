/**
 * Build-Off categories — public, home-page-only competition.
 *
 * Each category is a single skill we benchmark across every integrated AI
 * coding tool. The category in the home-page spotlight rotates over time;
 * the `current` flag picks which one is featured on /. Brands earn badges
 * (1st / 2nd / 3rd / honorable mention) per category and may embed them.
 *
 * SAMPLE DATA — replace ranks with verified results from soupy-sace-services
 * after the first published run. Numbers here are plausible defaults so the
 * UI ships fully rendered today.
 */

import type { PartnerId } from "@/lib/sace/partners";

export type CategoryId =
  | "frontend-fidelity"
  | "backend-correctness"
  | "refactor-reliability"
  | "data-and-sql"
  | "honesty-under-uncertainty"
  | "cost-per-output";

export interface Category {
  id: CategoryId;
  /** What user-visible feature category this maps to in the picker. */
  label: string;
  /** One-sentence description for the picker UI. */
  description: string;
  /** Skill being measured in the build-off. */
  skill: string;
  /**
   * Each category maps to one or more SACE partner ids — those are the
   * tools the router can hand the work to when a user picks this
   * category's winner as their preferred tool.
   */
  partnerHint: PartnerId[];
}

export const CATEGORIES: Category[] = [
  {
    id: "frontend-fidelity",
    label: "Frontend & visual fidelity",
    description: "Pixel-accurate UI, layout, responsive design.",
    skill: "Building a polished landing page from a brief.",
    partnerHint: ["claude-haiku", "gemini-flash"],
  },
  {
    id: "backend-correctness",
    label: "Backend correctness",
    description: "API routes, auth, database wiring that actually runs.",
    skill: "Email-auth todo CRUD with per-user RLS.",
    partnerHint: ["claude-sonnet", "gpt5-mini"],
  },
  {
    id: "refactor-reliability",
    label: "Refactor reliability",
    description: "Multi-file changes that don't break what worked.",
    skill: "Rename + restructure across 12 files, all tests still green.",
    partnerHint: ["claude-sonnet", "gpt5"],
  },
  {
    id: "data-and-sql",
    label: "Data & SQL",
    description: "Schemas, queries, aggregations, dashboards.",
    skill: "Build a 6-table schema and an aggregate report query.",
    partnerHint: ["gpt5-mini", "gemini-pro"],
  },
  {
    id: "honesty-under-uncertainty",
    label: "Honesty under uncertainty",
    description: "Asks instead of confabulating on ambiguous prompts.",
    skill: "Ambiguous brief — does the tool ask, or guess confidently?",
    partnerHint: ["claude-sonnet", "claude-haiku"],
  },
  {
    id: "cost-per-output",
    label: "Cost per output",
    description: "Cheapest tool that still ships a working result.",
    skill: "Same shipped feature, measured in dollars.",
    partnerHint: ["local-sace", "gpt5-mini"],
  },
];

export interface RankEntry {
  tool: string;
  /** Marketing one-liner — why they took this rank in this category. */
  note: string;
}

export interface CategoryRanks {
  categoryId: CategoryId;
  /** Round number for this category's most recent published competition. */
  round: number;
  /** ISO date of the result. */
  date: string;
  /** "sample" until the first verified harness run lands. */
  status: "sample" | "verified";
  podium: [RankEntry, RankEntry, RankEntry];
  honorableMentions?: RankEntry[];
}

export const CATEGORY_RANKS: Record<CategoryId, CategoryRanks> = {
  "frontend-fidelity": {
    categoryId: "frontend-fidelity",
    round: 3,
    date: "2026-05-01",
    status: "sample",
    podium: [
      { tool: "v0 by Vercel", note: "Three rounds straight — spec-faithful layout, cleanest markup." },
      { tool: "Lovable Pro", note: "Closed the gap on R3. Strong design system, fastest edit loop." },
      { tool: "Bolt", note: "Quick first preview, regressed slightly on responsive breakpoints." },
    ],
    honorableMentions: [
      { tool: "Soupy Together", note: "Daily-driver routing — picks v0 when fidelity is the goal." },
    ],
  },
  "backend-correctness": {
    categoryId: "backend-correctness",
    round: 3,
    date: "2026-05-01",
    status: "sample",
    podium: [
      { tool: "Claude Code", note: "Three-peat. Correct RLS first try across all rounds." },
      { tool: "Cursor", note: "Reliable when developer-driven, weaker autonomous." },
      { tool: "Lovable Pro", note: "Up from 4th — auth wiring caught up this round." },
    ],
  },
  "refactor-reliability": {
    categoryId: "refactor-reliability",
    round: 3,
    date: "2026-05-01",
    status: "sample",
    podium: [
      { tool: "Cursor", note: "Still the king of multi-file diffs. Tests stayed green R1–R3." },
      { tool: "Claude Code", note: "Conservative, asks before risky moves. Zero regressions." },
      { tool: "Replit Agent", note: "New entrant on the podium — held up on a 14-file rename." },
    ],
  },
  "data-and-sql": {
    categoryId: "data-and-sql",
    round: 3,
    date: "2026-05-01",
    status: "sample",
    podium: [
      { tool: "Claude Code", note: "Schema + aggregate query correct first pass, three rounds running." },
      { tool: "Soupy Together", note: "Up from 3rd — routes data work to GPT-5 mini at a fraction of cost." },
      { tool: "Cursor", note: "Ships cleanly when the developer drives the schema design." },
    ],
  },
  "honesty-under-uncertainty": {
    categoryId: "honesty-under-uncertainty",
    round: 3,
    date: "2026-05-01",
    status: "sample",
    podium: [
      { tool: "Claude Code", note: "Asked clarifying questions on every ambiguous brief. No confabulation." },
      { tool: "Soupy Together", note: "Returns labeled estimates with uncertainty bands by default." },
      { tool: "Cursor", note: "Surfaces ambiguity in plan mode — better than autonomous mode." },
    ],
    honorableMentions: [
      { tool: "v0 by Vercel", note: "Improved R2→R3 — now flags missing brand context instead of guessing." },
    ],
  },
  "cost-per-output": {
    categoryId: "cost-per-output",
    round: 3,
    date: "2026-05-01",
    status: "sample",
    podium: [
      { tool: "Soupy Together", note: "Tier 0/1 absorbs ~90% of work. Cheapest by an order of magnitude." },
      { tool: "Bolt", note: "Cheap on small tasks, capped quickly on bigger ones." },
      { tool: "v0 by Vercel", note: "Reasonable per-output cost on UI-only work." },
    ],
  },
};

/** All categories, in featured-rotation order. */
const ROTATION: CategoryId[] = [
  "frontend-fidelity",
  "backend-correctness",
  "refactor-reliability",
  "data-and-sql",
  "honesty-under-uncertainty",
  "cost-per-output",
];

/** Days between rotations of the home-page featured category. */
const ROTATION_DAYS = 3;

/** Deterministic day-bucket so SSR and client agree. */
function dayBucket(now: Date = new Date()): number {
  const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Featured category rotates every ROTATION_DAYS days, deterministically. */
export function getFeaturedCategoryId(now: Date = new Date()): CategoryId {
  const idx = Math.floor(dayBucket(now) / ROTATION_DAYS) % ROTATION.length;
  return ROTATION[idx];
}

/** Backwards-compatible static export — resolves to today's featured category. */
export const FEATURED_CATEGORY_ID: CategoryId = getFeaturedCategoryId();

export function getCategory(id: CategoryId): Category {
  const c = CATEGORIES.find((c) => c.id === id);
  if (!c) throw new Error(`unknown category: ${id}`);
  return c;
}

export function slugifyTool(tool: string): string {
  return tool.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
