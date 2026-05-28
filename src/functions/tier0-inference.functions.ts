/**
 * Tier 0 inference proxy + stats.
 *
 * This is the "middle person" between the SACE router and the AMD-hosted
 * SLM endpoint. Until AMD is live, calls return { configured: false } so
 * the router can fall back to a higher tier gracefully.
 *
 * Flow when live:
 *   router  -->  tier0InferRoute (server fn)  -->  AMD endpoint
 *                                |
 *                                +--> logs row in tier0_runs
 *                                +--> returns { text, tokens_out, cost_micros, latency_ms }
 *
 * Env vars (read inside handler — NEVER at module scope):
 *   AMD_INFERENCE_URL   — base URL of the vLLM/text-gen-inference server
 *   AMD_INFERENCE_KEY   — bearer token for that endpoint
 */

import { createServerFn } from "@tanstack/react-start";
import { createHash } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// GPT-5 baseline used to compute "saved" — keep in sync with classifier.
const BASELINE_GPT5_USD_PER_MTOKEN = 30;

const InferInput = z.object({
  prompt: z.string().min(1).max(8000),
  max_tokens: z.number().int().min(1).max(2048).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type Tier0InferResult =
  | {
      ok: true;
      configured: true;
      text: string;
      tokens_in: number;
      tokens_out: number;
      latency_ms: number;
      ttft_ms: number | null;
      cost_micros: number;
      baseline_gpt5_micros: number;
      checkpoint_name: string;
      run_id: string;
    }
  | { ok: false; configured: false; reason: "missing_env" | "no_active_checkpoint" }
  | { ok: false; configured: true; reason: "upstream_error"; status: number; message: string };

function hashPrompt(p: string): string {
  return createHash("sha256").update(p).digest("hex").slice(0, 32);
}

function microsFromUsd(usd: number): number {
  return Math.round(usd * 1_000_000);
}

export const tier0InferRoute = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InferInput.parse(input))
  .handler(async ({ data }): Promise<Tier0InferResult> => {
    const endpoint = process.env.AMD_INFERENCE_URL;
    const apiKey = process.env.AMD_INFERENCE_KEY;
    if (!endpoint || !apiKey) {
      return { ok: false, configured: false, reason: "missing_env" };
    }

    // Look up the active checkpoint (for logging + cost basis).
    const { data: checkpoint } = await supabaseAdmin
      .from("tier0_checkpoints")
      .select("id, name, measured_cost_per_mtoken_micros")
      .eq("is_active", true)
      .maybeSingle();

    if (!checkpoint) {
      return { ok: false, configured: false, reason: "no_active_checkpoint" };
    }

    const started = Date.now();
    let ttftMs: number | null = null;
    let res: Response;
    try {
      res = await fetch(`${endpoint.replace(/\/+$/, "")}/v1/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: data.prompt,
          max_tokens: data.max_tokens ?? 512,
          temperature: data.temperature ?? 0.2,
        }),
      });
      ttftMs = Date.now() - started;
    } catch (err) {
      return {
        ok: false,
        configured: true,
        reason: "upstream_error",
        status: 0,
        message: err instanceof Error ? err.message : "AMD endpoint unreachable",
      };
    }

    if (!res.ok) {
      const message = await res.text().then((t) => t.slice(0, 200)).catch(() => `status ${res.status}`);
      // Log the failure too so the dashboard surfaces error rate.
      await supabaseAdmin.from("tier0_runs").insert({
        checkpoint_id: checkpoint.id,
        prompt_hash: hashPrompt(data.prompt),
        prompt_length: data.prompt.length,
        tokens_in: 0,
        tokens_out: 0,
        latency_ms: Date.now() - started,
        ttft_ms: ttftMs,
        cost_micros: 0,
        baseline_gpt5_micros: 0,
        status: "error",
        error_message: message,
      });
      return { ok: false, configured: true, reason: "upstream_error", status: res.status, message };
    }

    const body = (await res.json()) as {
      choices?: Array<{ text?: string }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    const text = body.choices?.[0]?.text ?? "";
    const tokensIn = body.usage?.prompt_tokens ?? Math.ceil(data.prompt.length / 4);
    const tokensOut = body.usage?.completion_tokens ?? Math.ceil(text.length / 4);
    const latency = Date.now() - started;

    const costPerMtokenMicros = Number(checkpoint.measured_cost_per_mtoken_micros ?? 0);
    const costMicros = Math.round((tokensOut * costPerMtokenMicros) / 1_000_000);
    const baselineMicros = Math.round((tokensOut * microsFromUsd(BASELINE_GPT5_USD_PER_MTOKEN)) / 1_000_000);

    const { data: inserted } = await supabaseAdmin
      .from("tier0_runs")
      .insert({
        checkpoint_id: checkpoint.id,
        prompt_hash: hashPrompt(data.prompt),
        prompt_length: data.prompt.length,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        latency_ms: latency,
        ttft_ms: ttftMs,
        cost_micros: costMicros,
        baseline_gpt5_micros: baselineMicros,
        status: "ok",
      })
      .select("id")
      .single();

    return {
      ok: true,
      configured: true,
      text,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      latency_ms: latency,
      ttft_ms: ttftMs,
      cost_micros: costMicros,
      baseline_gpt5_micros: baselineMicros,
      checkpoint_name: checkpoint.name,
      run_id: inserted?.id ?? "",
    };
  });

/**
 * Dashboard read: active checkpoint + 24h stats + recent training metrics.
 * Safe to call from the browser via useServerFn — no secrets returned.
 */
export const getTier0Dashboard = createServerFn({ method: "GET" }).handler(async () => {
  const [checkpointRes, statsRes, recentRunsRes, trainingRes] = await Promise.all([
    supabaseAdmin
      .from("tier0_checkpoints")
      .select("id, name, model_family, is_active, measured_cost_per_mtoken_micros, measured_tokens_per_sec, trained_on_samples, eval_pass_rate, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabaseAdmin.rpc("get_tier0_live_stats"),
    supabaseAdmin
      .from("tier0_runs")
      .select("id, latency_ms, tokens_out, cost_micros, baseline_gpt5_micros, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseAdmin
      .from("tier0_training_metrics")
      .select("step, loss, eval_score, samples_per_sec, created_at, checkpoint_id")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  return {
    checkpoints: checkpointRes.data ?? [],
    liveStats: statsRes.data?.[0] ?? null,
    recentRuns: recentRunsRes.data ?? [],
    trainingMetrics: trainingRes.data ?? [],
    configured: Boolean(process.env.AMD_INFERENCE_URL && process.env.AMD_INFERENCE_KEY),
  };
});
