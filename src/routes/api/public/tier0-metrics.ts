/**
 * Public ingest endpoint for the AMD training loop.
 *
 * Your training script POSTs JSON like:
 *   { "checkpoint_name": "qwen-coder-soupy-v1",
 *     "step": 1500, "loss": 0.842, "eval_score": 0.71,
 *     "samples_per_sec": 18.3, "gpu_util_pct": 94 }
 *
 * Authentication: HMAC-SHA256 of the raw request body, signed with the
 * shared secret TIER0_METRICS_HMAC_SECRET. The header is `x-tier0-signature`.
 *
 * Why a /api/public route and not a server fn:
 * - Called from outside the app (your AMD instance has no browser session).
 * - Needs a stable URL that doesn't change between deploys.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MetricSchema = z.object({
  checkpoint_name: z.string().min(1).max(120),
  step: z.number().int().min(0).max(10_000_000),
  loss: z.number().min(0).max(1000).optional(),
  eval_score: z.number().min(0).max(1).optional(),
  samples_per_sec: z.number().min(0).max(100_000).optional(),
  gpu_util_pct: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

function verifySignature(secret: string, body: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(signatureHeader, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/tier0-metrics")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.TIER0_METRICS_HMAC_SECRET;
        if (!secret) {
          return new Response("metrics endpoint not configured", { status: 503 });
        }

        const body = await request.text();
        if (body.length > 8192) {
          return new Response("payload too large", { status: 413 });
        }

        if (!verifySignature(secret, body, request.headers.get("x-tier0-signature"))) {
          return new Response("invalid signature", { status: 401 });
        }

        let parsed: z.infer<typeof MetricSchema>;
        try {
          parsed = MetricSchema.parse(JSON.parse(body));
        } catch (err) {
          return new Response(
            `validation failed: ${err instanceof Error ? err.message : "bad json"}`,
            { status: 400 },
          );
        }

        // Find-or-create the checkpoint row by name.
        let checkpointId: string | null = null;
        const { data: existing } = await supabaseAdmin
          .from("tier0_checkpoints")
          .select("id")
          .eq("name", parsed.checkpoint_name)
          .maybeSingle();

        if (existing) {
          checkpointId = existing.id;
        } else {
          const { data: created, error: createErr } = await supabaseAdmin
            .from("tier0_checkpoints")
            .insert({
              name: parsed.checkpoint_name,
              model_family: parsed.checkpoint_name.split("-")[0] ?? "unknown",
              is_active: false,
            })
            .select("id")
            .single();
          if (createErr || !created) {
            return new Response(`checkpoint create failed: ${createErr?.message ?? "?"}`, { status: 500 });
          }
          checkpointId = created.id;
        }

        const { error: insertErr } = await supabaseAdmin.from("tier0_training_metrics").insert({
          checkpoint_id: checkpointId,
          step: parsed.step,
          loss: parsed.loss ?? null,
          eval_score: parsed.eval_score ?? null,
          samples_per_sec: parsed.samples_per_sec ?? null,
          gpu_util_pct: parsed.gpu_util_pct ?? null,
          notes: parsed.notes ?? null,
        });

        if (insertErr) {
          return new Response(`insert failed: ${insertErr.message}`, { status: 500 });
        }

        return Response.json({ ok: true, checkpoint_id: checkpointId });
      },
    },
  },
});
