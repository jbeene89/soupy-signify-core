/**
 * Server route proxying the SACE /v1/complete streaming endpoint.
 *
 * The browser POSTs `{ prompt, session_id? }` here; this handler signs the
 * request server-side and pipes the newline-delimited JSON stream back.
 * SACE_ROUTER_HMAC_KEY never crosses the network to the client.
 *
 * Disabled (returns 503) unless SACE_COMPLETE_ENABLED=1.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { openCompleteStream, readSaceEnv } from "@/functions/sace-router-internal";

const Body = z.object({
  prompt: z.string().trim().min(3).max(2000),
  session_id: z.string().min(1).max(128).optional(),
});

export const Route = createFileRoute("/api/sace/complete")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = readSaceEnv();
        if (!env || process.env.SACE_COMPLETE_ENABLED !== "1") {
          return new Response(
            JSON.stringify({ error: "sace_complete_disabled" }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }

        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch (err) {
          return new Response(
            JSON.stringify({
              error: "bad_request",
              message: err instanceof Error ? err.message : "invalid body",
            }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        }

        const upstream = await openCompleteStream(env, parsed);

        // 402 budget cap — surface as JSON, not a stream, so the client can
        // render the upgrade CTA without parsing NDJSON.
        if (upstream.status === 402) {
          const text = await upstream.text();
          return new Response(text, {
            status: 402,
            headers: { "content-type": "application/json" },
          });
        }

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(
            JSON.stringify({
              error: "upstream_error",
              status: upstream.status,
              message: text.slice(0, 300),
            }),
            { status: 502, headers: { "content-type": "application/json" } },
          );
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "application/x-ndjson",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
