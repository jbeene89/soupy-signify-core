/**
 * Public preview redirect: re-signs the S3 URL for the currently published
 * build-off entry on demand. Use this as a stable URL anywhere
 * (iframes, share links) — no expiry headaches.
 *
 * GET /api/public/build-off/preview/:id/:tool → 302 to fresh signed URL.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSignedReadUrl } from "@/server/s3.server";

export const Route = createFileRoute("/api/public/build-off/preview/$id/$tool")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { data: row, error } = await supabaseAdmin
          .from("build_off_runs")
          .select("object_key")
          .eq("build_off_id", params.id)
          .eq("tool", params.tool)
          .eq("is_published", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          return new Response(`DB error: ${error.message}`, { status: 500 });
        }
        if (!row) {
          return new Response("No published entry for this round/tool", { status: 404 });
        }

        try {
          const url = await getSignedReadUrl(row.object_key);
          return new Response(null, {
            status: 302,
            headers: {
              Location: url,
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          return new Response(`Sign error: ${msg}`, { status: 500 });
        }
      },
    },
  },
});
