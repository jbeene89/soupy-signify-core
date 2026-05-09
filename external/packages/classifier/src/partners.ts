/**
 * Real partner roster for SACE routing.
 *
 * Costs are USD per 1M output tokens (rough public list prices, mid-2025).
 * Latency is a "typical end-to-end" tokens/sec estimate for short tasks.
 */

import type { PromptFeatures } from "./features.js";

export type PartnerId =
  | "local-sace"
  | "claude-haiku"
  | "claude-sonnet"
  | "gemini-flash"
  | "gemini-pro"
  | "gpt5-mini"
  | "gpt5"
  | "frontier-cortex";

export interface Partner {
  id: PartnerId;
  label: string;
  vendor: string;
  costPerMTokens: number;
  tokensPerSec: number;
  strengths: Array<"ui" | "code" | "reasoning" | "data" | "multimodal" | "creative" | "safety">;
}

export const PARTNERS: Record<PartnerId, Partner> = {
  "local-sace": {
    id: "local-sace",
    label: "Local SACE",
    vendor: "Soupy Together",
    costPerMTokens: 0,
    tokensPerSec: 220,
    strengths: ["code", "ui"]
  },
  "claude-haiku": {
    id: "claude-haiku",
    label: "Claude Haiku 4.5",
    vendor: "Anthropic",
    costPerMTokens: 4,
    tokensPerSec: 140,
    strengths: ["code", "ui", "safety"]
  },
  "claude-sonnet": {
    id: "claude-sonnet",
    label: "Claude Sonnet 4.5",
    vendor: "Anthropic",
    costPerMTokens: 15,
    tokensPerSec: 80,
    strengths: ["code", "reasoning", "safety"]
  },
  "gemini-flash": {
    id: "gemini-flash",
    label: "Gemini 3 Flash",
    vendor: "Google",
    costPerMTokens: 2.5,
    tokensPerSec: 180,
    strengths: ["multimodal", "data", "ui"]
  },
  "gemini-pro": {
    id: "gemini-pro",
    label: "Gemini 3.1 Pro",
    vendor: "Google",
    costPerMTokens: 10,
    tokensPerSec: 90,
    strengths: ["multimodal", "reasoning", "data"]
  },
  "gpt5-mini": {
    id: "gpt5-mini",
    label: "GPT-5 mini",
    vendor: "OpenAI",
    costPerMTokens: 2,
    tokensPerSec: 160,
    strengths: ["code", "data"]
  },
  "gpt5": {
    id: "gpt5",
    label: "GPT-5",
    vendor: "OpenAI",
    costPerMTokens: 30,
    tokensPerSec: 60,
    strengths: ["reasoning", "code", "creative"]
  },
  "frontier-cortex": {
    id: "frontier-cortex",
    label: "Frontier Cortex (composed)",
    vendor: "GPT-5 + Sonnet + Pro",
    costPerMTokens: 55,
    tokensPerSec: 45,
    strengths: ["reasoning", "code", "creative", "safety"]
  }
};

export function routePartners(tier: 0 | 1 | 2 | 3, f: PromptFeatures): PartnerId[] {
  if (tier === 0) return ["local-sace"];

  const dominant = (Object.entries({
    ui: f.ui, code: f.code, data: f.data, reasoning: f.reasoning,
    multimodal: f.multimodal, creative: f.creative, safety: f.safety
  }) as Array<[keyof Omit<PromptFeatures, "complexity">, number]>)
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v > 0)
    .map(([k]) => k);

  if (tier === 1) {
    const top = dominant[0];
    if (top === "ui" || top === "code") return ["claude-haiku"];
    if (top === "data") return ["gpt5-mini"];
    if (top === "multimodal") return ["gemini-flash"];
    if (top === "creative") return ["gpt5-mini"];
    return ["gemini-flash"];
  }

  if (tier === 2) {
    const team: PartnerId[] = [];
    if (dominant.includes("ui") || dominant.includes("code")) team.push("claude-sonnet");
    if (dominant.includes("data") || dominant.includes("reasoning")) team.push("gpt5-mini");
    if (dominant.includes("multimodal")) team.push("gemini-pro");
    if (dominant.includes("safety")) team.push("claude-sonnet");
    if (team.length === 0) team.push("claude-sonnet", "gemini-flash");
    return Array.from(new Set(team)).slice(0, 3);
  }

  return ["frontier-cortex"];
}

export function estimateOutputTokens(tier: 0 | 1 | 2 | 3, f: PromptFeatures): number {
  const base = [180, 600, 1800, 4500][tier];
  return Math.round(base * (0.6 + f.complexity * 0.8));
}

export function estimateCosts(
  _tier: 0 | 1 | 2 | 3,
  partners: PartnerId[],
  outTokens: number
): { baselineCents: number; soupyCents: number } {
  const baselineUsd = (outTokens / 1_000_000) * PARTNERS["gpt5"].costPerMTokens;
  const soupyUsd = partners.reduce(
    (acc, p) => acc + (outTokens / 1_000_000) * PARTNERS[p].costPerMTokens,
    0
  );
  return {
    baselineCents: Math.max(1, Math.round(baselineUsd * 100)),
    soupyCents: Math.max(0, Math.round(soupyUsd * 100))
  };
}

export function estimateEtaSeconds(partners: PartnerId[], outTokens: number): number {
  if (partners.length === 0) return 0;
  const speeds = partners.map((p) => PARTNERS[p].tokensPerSec);
  const slowest = Math.min(...speeds);
  const avg = speeds.reduce((a, b) => a + b, 0) / speeds.length;
  const effective = slowest * 0.7 + avg * 0.3;
  return Number((outTokens / effective).toFixed(1));
}
