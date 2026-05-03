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
  /** "manual" runs are visually distinct from harness-driven runs. */
  mode?: "manual" | "harness";
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
}
