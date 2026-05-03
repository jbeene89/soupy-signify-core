/**
 * Server functions exposing SACE router + build-off results to the UI.
 * These are safe to import from any component — the Vite plugin replaces
 * the implementation with an RPC stub in the client bundle.
 *
 * @module sace-functions
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  BudgetCapError,
  PublishedBuildOff,
  PublishedBuildOffManifest,
  PublishedBuildOffManifestEntry,
  RouteDecision,
} from "@/lib/sace/contract";
import { callRouterRoute, readSaceEnv } from "./sace-router-bridge";

const PromptInput = z.object({
  prompt: z.string().trim().min(3).max(2000),
  preferences: z.record(z.string().min(1).max(64), z.string().min(1).max(120)).optional(),
});

export type RouteSaceResult =
  | { ok: true; source: "sace"; decision: RouteDecision; receiptsBaseUrl: string }
  | { ok: false; source: "sace"; kind: "budget_cap"; error: BudgetCapError }
  | { ok: false; source: "sace"; kind: "transport"; status: number; message: string }
  | { ok: false; source: "fallback"; reason: "missing_env" };

/**
 * Try to route a prompt through the external SACE router.
 * Returns `{ source: "fallback", reason: "missing_env" }` when env vars
 * are not present — caller should then run the local heuristic.
 */
export const routeSacePrompt = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PromptInput.parse(input))
  .handler(async ({ data }): Promise<RouteSaceResult> => {
    const env = readSaceEnv();
    if (!env) return { ok: false, source: "fallback", reason: "missing_env" };

    const result = await callRouterRoute(env, { prompt: data.prompt, preferences: data.preferences });
    if (result.ok) {
      return {
        ok: true,
        source: "sace",
        decision: result.decision,
        receiptsBaseUrl: env.receiptsBaseUrl,
      };
    }
    if (result.kind === "budget_cap") {
      return { ok: false, source: "sace", kind: "budget_cap", error: result.error };
    }
    return {
      ok: false,
      source: "sace",
      kind: "transport",
      status: result.status,
      message: result.message,
    };
  });

/** Lightweight env probe so the UI can show a "live" vs "sample" badge. */
export const getSaceConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    routerEnabled: boolean;
    completeEnabled: boolean;
    receiptsBaseUrl: string | null;
    buildOffResultsBaseUrl: string | null;
  }> => {
    const env = readSaceEnv();
    if (!env) {
      return {
        routerEnabled: false,
        completeEnabled: false,
        receiptsBaseUrl: null,
        buildOffResultsBaseUrl: null,
      };
    }
    return {
      routerEnabled: true,
      // Streaming completion is opt-in — flip when the external service is live.
      completeEnabled: process.env.SACE_COMPLETE_ENABLED === "1",
      receiptsBaseUrl: env.receiptsBaseUrl,
      buildOffResultsBaseUrl: env.buildOffResultsBaseUrl,
    };
  },
);

/**
 * Fetch a published build-off result JSON from the external results bucket.
 * Returns null when env is missing or the file isn't published yet — the
 * UI then falls back to the in-repo SAMPLE data.
 *
 * Convention: results are stored at `${base}/build-off/${id}.json`.
 */
export const fetchPublishedBuildOff = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data }): Promise<{ result: PublishedBuildOff | null; reason?: string }> => {
    const env = readSaceEnv();
    if (!env) return { result: null, reason: "missing_env" };

    const url = `${env.buildOffResultsBaseUrl}/build-off/${encodeURIComponent(data.id)}.json`;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status === 404) return { result: null, reason: "not_published" };
      if (!res.ok) return { result: null, reason: `http_${res.status}` };
      const json = (await res.json()) as PublishedBuildOff;
      return { result: { ...json, source_url: url } };
    } catch (err) {
      return {
        result: null,
        reason: err instanceof Error ? `fetch_failed:${err.message}` : "fetch_failed",
      };
    }
  });

/**
 * Fetch the published build-off manifest from `${base}/build-off/manifest.json`.
 * Returns an empty list when env is missing, the file 404s, or the network fails.
 * Never throws into the UI — caller treats empty list as "fall back to SAMPLE".
 */
export const listPublishedBuildOffs = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ entries: PublishedBuildOffManifestEntry[]; reason?: string }> => {
    const env = readSaceEnv();
    if (!env) return { entries: [], reason: "missing_env" };

    const url = `${env.buildOffResultsBaseUrl}/build-off/manifest.json`;
    try {
      const res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status === 404) return { entries: [], reason: "not_published" };
      if (!res.ok) return { entries: [], reason: `http_${res.status}` };
      const json = (await res.json()) as PublishedBuildOffManifest;
      const entries = Array.isArray(json?.buildOffs) ? json.buildOffs : [];
      return { entries };
    } catch (err) {
      return {
        entries: [],
        reason: err instanceof Error ? `fetch_failed:${err.message}` : "fetch_failed",
      };
    }
  },
);
