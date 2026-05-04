/**
 * Live build-off runner.
 *
 * 1. Call Lovable AI Gateway with the round's prompt.
 * 2. Extract HTML, upload to S3.
 * 3. Persist a row in `build_off_runs` (DB is source of truth).
 * 4. Return the run id + a freshly signed preview URL.
 *
 * Showcase reads runs from DB and re-signs URLs on demand
 * via /api/public/build-off/preview/$id/$tool.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getSignedReadUrl, getSignedWriteUrl } from "@/server/s3.server";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const RunInput = z.object({
  buildOffId: z.string().min(1).max(64),
  prompt: z.string().min(10).max(8000),
  tool: z.enum(["soupy"]),
  model: z.string().min(1).max(64).optional(),
  publish: z.boolean().optional(),
});

export type RunResult =
  | {
      ok: true;
      runId: string;
      previewUrl: string;
      objectKey: string;
      bytes: number;
      durationMs: number;
      model: string;
      published: boolean;
    }
  | { ok: false; reason: string };

function extractHtml(text: string): string | null {
  const fenced = text.match(/```html\s*([\s\S]*?)```/i) ?? text.match(/```\s*(<!doctype[\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const docIdx = text.search(/<!doctype html/i);
  if (docIdx >= 0) return text.slice(docIdx).trim();
  const htmlIdx = text.search(/<html[\s>]/i);
  if (htmlIdx >= 0) return text.slice(htmlIdx).trim();
  return null;
}

export const runBuildOffEntry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RunInput.parse(input))
  .handler(async ({ data }): Promise<RunResult> => {
    const startedAt = Date.now();
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) return { ok: false, reason: "LOVABLE_API_KEY not configured" };

    const model = data.model ?? "google/gemini-2.5-flash";

    // 1. Generate
    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You produce a SINGLE self-contained index.html file. No build step, no npm, no external files beyond CDN <script> tags. Reply with ONLY the HTML — start with <!DOCTYPE html>. No prose, no markdown fences.",
          },
          { role: "user", content: data.prompt },
        ],
      }),
    });
    if (!aiRes.ok) {
      const body = await aiRes.text().catch(() => "");
      return { ok: false, reason: `AI gateway HTTP ${aiRes.status}: ${body.slice(0, 300)}` };
    }
    const aiJson = (await aiRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = aiJson.choices?.[0]?.message?.content ?? "";
    const html = extractHtml(raw);
    if (!html) return { ok: false, reason: "Could not extract HTML from AI response" };

    // 2. Upload
    const objectKey = `build-off/${data.buildOffId}/${data.tool}/${Date.now()}.html`;
    let putUrl: string;
    try {
      putUrl = await getSignedWriteUrl(objectKey);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: html,
    });
    if (!putRes.ok) {
      const body = await putRes.text().catch(() => "");
      return { ok: false, reason: `S3 PUT HTTP ${putRes.status}: ${body.slice(0, 300)}` };
    }

    const bytes = new TextEncoder().encode(html).length;
    const durationMs = Date.now() - startedAt;

    // 3. Persist
    const { data: row, error: insertErr } = await supabaseAdmin
      .from("build_off_runs")
      .insert({
        build_off_id: data.buildOffId,
        tool: data.tool,
        object_key: objectKey,
        bytes,
        model,
        duration_ms: durationMs,
      })
      .select("id")
      .single();
    if (insertErr || !row) {
      return { ok: false, reason: `DB insert failed: ${insertErr?.message ?? "unknown"}` };
    }

    // 3b. Optionally publish (atomic: unmark prior, mark this one)
    let published = false;
    if (data.publish) {
      const { error: clearErr } = await supabaseAdmin
        .from("build_off_runs")
        .update({ is_published: false })
        .eq("build_off_id", data.buildOffId)
        .eq("tool", data.tool)
        .eq("is_published", true);
      if (!clearErr) {
        const { error: pubErr } = await supabaseAdmin
          .from("build_off_runs")
          .update({ is_published: true })
          .eq("id", row.id);
        published = !pubErr;
      }
    }

    // 4. Sign preview
    let previewUrl: string;
    try {
      previewUrl = await getSignedReadUrl(objectKey);
    } catch (err) {
      return { ok: false, reason: err instanceof Error ? err.message : String(err) };
    }

    return {
      ok: true,
      runId: row.id,
      previewUrl,
      objectKey,
      bytes,
      durationMs,
      model,
      published,
    };
  });

// ── List recent runs (for operator console) ──────────────────────────
const ListInput = z.object({
  buildOffId: z.string().min(1).max(64),
  limit: z.number().int().min(1).max(50).optional(),
});

export type RunListItem = {
  id: string;
  tool: string;
  objectKey: string;
  bytes: number;
  model: string;
  durationMs: number;
  isPublished: boolean;
  createdAt: string;
};

export const listBuildOffRuns = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ListInput.parse(input))
  .handler(async ({ data }): Promise<RunListItem[]> => {
    const { data: rows, error } = await supabaseAdmin
      .from("build_off_runs")
      .select("id, tool, object_key, bytes, model, duration_ms, is_published, created_at")
      .eq("build_off_id", data.buildOffId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 10);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      tool: r.tool,
      objectKey: r.object_key,
      bytes: r.bytes,
      model: r.model,
      durationMs: r.duration_ms,
      isPublished: r.is_published,
      createdAt: r.created_at,
    }));
  });

// ── Publish / unpublish a specific run ───────────────────────────────
const PublishInput = z.object({
  runId: z.string().uuid(),
});

export const publishBuildOffRun = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PublishInput.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; reason: string }> => {
    const { data: run, error: fetchErr } = await supabaseAdmin
      .from("build_off_runs")
      .select("build_off_id, tool")
      .eq("id", data.runId)
      .single();
    if (fetchErr || !run) return { ok: false, reason: fetchErr?.message ?? "run not found" };

    const { error: clearErr } = await supabaseAdmin
      .from("build_off_runs")
      .update({ is_published: false })
      .eq("build_off_id", run.build_off_id)
      .eq("tool", run.tool)
      .eq("is_published", true);
    if (clearErr) return { ok: false, reason: clearErr.message };

    const { error: pubErr } = await supabaseAdmin
      .from("build_off_runs")
      .update({ is_published: true })
      .eq("id", data.runId);
    if (pubErr) return { ok: false, reason: pubErr.message };
    return { ok: true };
  });
