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
    round: 1,
    date: "2026-04-15",
    status: "sample",
    podium: [
      { tool: "v0 by Vercel", note: "Best-looking UI on first pass. Spec-faithful layout." },
      { tool: "Lovable Pro", note: "Strong design system, quick edit loop." },
      { tool: "Bolt", note: "Fast first preview, slightly noisier markup." },
    ],
    honorableMentions: [
      { tool: "Soupy Together", note: "Daily-driver routing — picks v0 when fidelity is the goal." },
    ],
  },
  "backend-correctness": {
    categoryId: "backend-correctness",
    round: 1,
    date: "2026-04-15",
    status: "sample",
    podium: [
      { tool: "Claude Code", note: "Cleanest auth wiring, correct RLS first try." },
      { tool: "Cursor", note: "Driven correctly, ships solid backend code." },
      { tool: "Replit Agent", note: "End-to-end working, slower." },
    ],
  },
  "refactor-reliability": {
    categoryId: "refactor-reliability",
    round: 1,
    date: "2026-04-15",
    status: "sample",
    podium: [
      { tool: "Cursor", note: "Multi-file diffs preserve correctness across edits." },
      { tool: "Claude Code", note: "Conservative, asks before risky moves." },
      { tool: "Lovable Pro", note: "Holds up on small refactors, slips on large ones." },
    ],
  },
  "data-and-sql": {
    categoryId: "data-and-sql",
    round: 1,
    date: "2026-04-15",
    status: "sample",
    podium: [
      { tool: "Claude Code", note: "Schema + query both correct on first pass." },
      { tool: "Cursor", note: "Ships when developer drives the design." },
      { tool: "Soupy Together", note: "Routes data work to GPT-5 mini cheaply." },
    ],
  },
  "honesty-under-uncertainty": {
    categoryId: "honesty-under-uncertainty",
    round: 1,
    date: "2026-04-15",
    status: "sample",
    podium: [
      { tool: "Claude Code", note: "Asks clarifying questions instead of guessing." },
      { tool: "Soupy Together", note: "Returns a labeled estimate with uncertainty bands." },
      { tool: "Cursor", note: "Surfaces ambiguity in plan mode." },
    ],
  },
  "cost-per-output": {
    categoryId: "cost-per-output",
    round: 1,
    date: "2026-04-15",
    status: "sample",
    podium: [
      { tool: "Soupy Together", note: "Tier 0/1 absorbs ~90% of work for cents." },
      { tool: "Bolt", note: "Cheap on small tasks, capped quickly." },
      { tool: "v0 by Vercel", note: "Reasonable per-output cost on UI-only work." },
    ],
  },
};

/** Which category is featured in the home-page spotlight right now. */
export const FEATURED_CATEGORY_ID: CategoryId = "frontend-fidelity";

export function getCategory(id: CategoryId): Category {
  const c = CATEGORIES.find((c) => c.id === id);
  if (!c) throw new Error(`unknown category: ${id}`);
  return c;
}

export function slugifyTool(tool: string): string {
  return tool.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
