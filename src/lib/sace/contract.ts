/**
 * Shared types matching the external SACE services contract.
 *
 * Source of truth is the external soupy-sace-services repo. Update the
 * canonical signing string + types here when that repo's PR finalizes.
 *
 * IMPORTANT: this file is safe for client bundles — no secrets, no
 * server-only imports.
 */

export type Tier = 0 | 1 | 2 | 3;

/** POST /v1/route request body */
export interface RouteRequest {
  prompt: string;
  /**
   * Optional per-category tool preferences from the home-page picker.
   * Keys are CategoryId strings, values are tool display names.
   * The router treats these as hints — budget and availability win.
   */
  preferences?: Record<string, string>;
}

/** POST /v1/route 200 response body */
export interface RouteDecision {
  tier: Tier;
  partners: string[];
  est_cost_cents: number;
  baseline_gpt5_cents: number;
  router_version: string;
  estimate: true;
}

/** POST /v1/complete request body */
export interface CompleteRequest {
  prompt: string;
  session_id?: string;
}

/** Streaming chunks from /v1/complete (newline-delimited JSON). */
export type CompleteChunk =
  | { type: "delta"; text: string }
  | { type: "receipt"; receipt_id: string; receipt_date: string }
  | { type: "done" }
  | { type: "error"; error: string; message: string };

/** HTTP 402 body returned by the router when a budget cap fires. */
export interface BudgetCapError {
  error: "budget_cap_exceeded";
  cap: "request" | "session";
  max_cents: number;
  estimated_cents: number;
  upgrade_url: string;
}

/** Receipt log / proof link helper. */
export function receiptProofUrl(
  receiptsBaseUrl: string,
  receiptDate: string,
  receiptId: string,
): string {
  const base = receiptsBaseUrl.replace(/\/+$/, "");
  return `${base}/v1/receipts/${receiptDate}/proof/${receiptId}`;
}

// ============================================================
// Build-off published result JSON (consumed by /build-off)
// ============================================================

export interface PublishedToolRun {
  tool: string;
  raw: {
    cost: number;
    time: number;
    fidelity: number;
    correctness: number;
    refactor: number;
    honesty: number;
    bundle: number;
  };
  /**
   * Optional latency telemetry from the external harness.
   * - ttft_ms: time-to-first-token from the model API (when the tool exposes it)
   * - time_to_green_s: wall-clock from prompt → preview reachable AND tests green
   * Only populated by harness-driven runs. UI hides columns when absent.
   */
  ttft_ms?: number;
  time_to_green_s?: number;
  notes?: string;
  /**
   * Run mode:
   * - "harness": automated harness-driven run
   * - "manual": run entered by hand by a human operator
   * - "withdrawn": tool declined to participate this round; doesn't block launch
   */
  mode?: "manual" | "harness" | "withdrawn";
  /**
   * Visual challenge fields (Tier I/II/III build-offs).
   * previewUrl: iframe src — either the tool's native deploy URL or a harness-served path.
   * previewHarnessServed: true when the harness built and served the output rather than
   *   the tool deploying it natively (flagged visually so viewers know the difference).
   */
  previewUrl?: string;
  previewHarnessServed?: boolean;
  /**
   * Operator confirmation gate. When false (or undefined), the showcase tile shows
   * a soft "make sure this is your best work" reminder. The operator flips this to
   * true once they've reviewed the submission and it's the final entry.
   */
  confirmed?: boolean;
}

export interface PublishedBuildOffManifestEntry {
  id: string;
  /** Path relative to results base, e.g. "build-off/001-todo-auth.json". */
  latest: string;
  runId?: string;
  sourceResultPath?: string;
}

export interface PublishedBuildOffManifest {
  buildOffs: PublishedBuildOffManifestEntry[];
}

export interface PublishedBuildOff {
  id: string;
  number: number;
  title: string;
  prompt: string;
  brief: string;
  status: "verified";
  date: string;
  runs: PublishedToolRun[];
  source_url?: string;
  /** Build-off tier (1 = single-file HTML, 2 = component, 3 = deployed app). */
  tier?: 1 | 2 | 3;
  /**
   * True once all participating tools have submitted (or been marked unavailable).
   * Controls whether the visual rankings section unlocks on the page.
   */
  showcaseComplete?: boolean;
}
