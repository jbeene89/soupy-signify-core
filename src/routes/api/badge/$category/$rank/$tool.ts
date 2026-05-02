/**
 * Embeddable badge SVG.
 *
 * URL: /api/badge/:category/:rank/:tool.svg
 *  - :category = CategoryId (slug)
 *  - :rank = 1 | 2 | 3 | hm
 *  - :tool = slugified tool name (used for display only; we re-look-up
 *            the canonical name from CATEGORY_RANKS to prevent forgery)
 *
 * Brands embed with:
 *   <a href="https://soupytogether.com/build-off">
 *     <img src="https://soupytogether.com/api/badge/frontend-fidelity/1/v0-by-vercel.svg"
 *          alt="Soupy Together Build-Off · 1st Place · Frontend & visual fidelity"
 *          width="320" height="120" />
 *   </a>
 *
 * The badge is generated server-side as static SVG (no auth, cache-friendly).
 */

import { createFileRoute } from "@tanstack/react-router";
import {
  CATEGORIES,
  CATEGORY_RANKS,
  slugifyTool,
  type CategoryId,
} from "@/data/build-off-categories";

type RankSlug = "1" | "2" | "3" | "hm";

const RANK_LABELS: Record<RankSlug, string> = {
  "1": "1ST PLACE",
  "2": "2ND PLACE",
  "3": "3RD PLACE",
  "hm": "HONORABLE MENTION",
};

const RANK_ACCENT: Record<RankSlug, string> = {
  "1": "#22d3ee", // cyan
  "2": "#cbd5e1", // silver
  "3": "#d97706", // bronze
  "hm": "#94a3b8",
};

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" :
    c === ">" ? "&gt;" :
    c === "&" ? "&amp;" :
    c === "'" ? "&apos;" :
    "&quot;",
  );
}

function renderSvg(opts: {
  category: string;
  rank: RankSlug;
  tool: string;
  round: number;
  date: string;
  status: "sample" | "verified";
}): string {
  const accent = RANK_ACCENT[opts.rank];
  const rankLabel = RANK_LABELS[opts.rank];
  const verified = opts.status === "verified";
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120" role="img" aria-label="Soupy Together Build-Off ${escapeXml(rankLabel)} ${escapeXml(opts.category)} ${escapeXml(opts.tool)}">
  <rect width="320" height="120" fill="#0b0b0d"/>
  <rect x="0" y="0" width="6" height="120" fill="${accent}"/>
  <g font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" fill="#f5f1e8">
    <text x="22" y="26" font-size="9" letter-spacing="1.4" fill="#9ca3af">SOUPY · TOGETHER · BUILD-OFF</text>
    <text x="22" y="52" font-size="20" font-weight="600" fill="${accent}">${escapeXml(rankLabel)}</text>
    <text x="22" y="74" font-size="13" fill="#f5f1e8">${escapeXml(opts.tool)}</text>
    <text x="22" y="92" font-size="9" letter-spacing="1.2" fill="#9ca3af">${escapeXml(opts.category.toUpperCase())}</text>
    <text x="22" y="108" font-size="8" letter-spacing="1.2" fill="#6b7280">ROUND ${String(opts.round).padStart(3, "0")} · ${escapeXml(opts.date)} · ${verified ? "VERIFIED" : "SAMPLE"}</text>
  </g>
</svg>`;
}

function badRequest(message: string): Response {
  return new Response(
    `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120"><rect width="320" height="120" fill="#0b0b0d"/><text x="22" y="64" fill="#ef4444" font-family="monospace" font-size="12">${escapeXml(message)}</text></svg>`,
    { status: 400, headers: { "content-type": "image/svg+xml; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/badge/$category/$rank/$tool")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const rawTool = params.tool.replace(/\.svg$/i, "");
        const rankSlug = params.rank as RankSlug;
        if (!(rankSlug in RANK_LABELS)) return badRequest("invalid rank");

        const category = CATEGORIES.find((c) => c.id === params.category);
        if (!category) return badRequest("invalid category");

        const ranks = CATEGORY_RANKS[category.id as CategoryId];
        let tool: string | null = null;
        if (rankSlug === "hm") {
          const hm = ranks.honorableMentions ?? [];
          const found = hm.find((e) => slugifyTool(e.tool) === rawTool);
          tool = found?.tool ?? null;
        } else {
          const idx = Number(rankSlug) - 1;
          const entry = ranks.podium[idx];
          if (entry && slugifyTool(entry.tool) === rawTool) tool = entry.tool;
        }
        if (!tool) return badRequest("tool not at this rank");

        const svg = renderSvg({
          category: category.label,
          rank: rankSlug,
          tool,
          round: ranks.round,
          date: ranks.date,
          status: ranks.status,
        });

        return new Response(svg, {
          status: 200,
          headers: {
            "content-type": "image/svg+xml; charset=utf-8",
            // 1 hour CDN cache, allow stale-while-revalidate for a day
            "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
