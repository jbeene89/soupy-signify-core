/**
 * Live build-off runner.
 *
 * Tier I = single self-contained index.html. We:
 *  1. Call Lovable AI Gateway with the round's prompt.
 *  2. Extract the HTML from the response.
 *  3. Upload to S3 via the AWS S3 connector signed-write URL.
 *  4. Return a public S3 URL the showcase iframe can render.
 *
 * Other tools stay manual for now — operator pastes a URL via a different fn.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const S3_GATEWAY_URL = "https://connector-gateway.lovable.dev";

const RunInput = z.object({
  buildOffId: z.string().min(1).max(64),
  prompt: z.string().min(10).max(8000),
  tool: z.enum(["soupy"]),
  model: z.string().min(1).max(64).optional(),
});

export type RunResult =
  | { ok: true; previewUrl: string; objectKey: string; bytes: number; durationMs: number; model: string }
  | { ok: false; reason: string };

function extractHtml(text: string): string | null {
  // Prefer ```html fenced block
  const fenced = text.match(/```html\s*([\s\S]*?)```/i) ?? text.match(/```\s*(<!doctype[\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  // Else: full doc starts at <!doctype
  const docIdx = text.search(/<!doctype html/i);
  if (docIdx >= 0) return text.slice(docIdx).trim();
  // Else: starts with <html
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

    const s3Key = process.env.AWS_S3_API_KEY;
    if (!s3Key) return { ok: false, reason: "AWS_S3_API_KEY not configured (link AWS S3 connector)" };

    const model = data.model ?? "google/gemini-2.5-pro";

    // ── 1. Generate ────────────────────────────────────────────────────
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
    const aiJson = (await aiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = aiJson.choices?.[0]?.message?.content ?? "";
    const html = extractHtml(raw);
    if (!html) return { ok: false, reason: "Could not extract HTML from AI response" };

    // ── 2. Get signed PUT URL ──────────────────────────────────────────
    const objectKey = `build-off/${data.buildOffId}/${data.tool}/${Date.now()}.html`;
    const signRes = await fetch(
      `${S3_GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=write`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": s3Key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ object_path: objectKey }),
      },
    );
    if (!signRes.ok) {
      const body = await signRes.text().catch(() => "");
      return { ok: false, reason: `Sign URL HTTP ${signRes.status}: ${body.slice(0, 300)}` };
    }
    const signJson = (await signRes.json()) as { url: string };

    // ── 3. Upload ──────────────────────────────────────────────────────
    const putRes = await fetch(signJson.url, {
      method: "PUT",
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: html,
    });
    if (!putRes.ok) {
      const body = await putRes.text().catch(() => "");
      return { ok: false, reason: `S3 PUT HTTP ${putRes.status}: ${body.slice(0, 300)}` };
    }

    // ── 4. Get a signed READ URL for preview (works without bucket-public ACL) ──
    const readRes = await fetch(
      `${S3_GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": s3Key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ object_path: objectKey }),
      },
    );
    if (!readRes.ok) {
      const body = await readRes.text().catch(() => "");
      return { ok: false, reason: `Sign read HTTP ${readRes.status}: ${body.slice(0, 300)}` };
    }
    const readJson = (await readRes.json()) as { url: string };

    return {
      ok: true,
      previewUrl: readJson.url,
      objectKey,
      bytes: new TextEncoder().encode(html).length,
      durationMs: Date.now() - startedAt,
      model,
    };
  });
