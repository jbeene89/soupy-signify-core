/**
 * Heuristic SACE classifier — turns a build prompt into a full demo result.
 *
 * Pure function. No I/O. The server function persists the result; the UI
 * renders it. Swap this module for an LLM-backed implementation later
 * without touching the call sites.
 */

import {
  extractFeatures,
  tierFromComplexity,
  routePartners,
  estimateOutputTokens,
  estimateCosts,
  estimateEtaSeconds,
  PARTNERS,
  type PartnerId,
  type PromptFeatures,
} from "./partners";

export interface ClassifierResult {
  tier: 0 | 1 | 2 | 3;
  tierLabel: string;
  reasoning: string;
  features: PromptFeatures;
  partners: PartnerId[];
  partnerLabels: Array<{ id: PartnerId; label: string; vendor: string }>;
  estOutputTokens: number;
  baselineCostCents: number;
  soupyCostCents: number;
  savedCents: number;
  etaSeconds: number;
  mockOutput: string;
}

const TIER_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: "TIER 0 — Local absorption",
  1: "TIER 1 — Single specialist",
  2: "TIER 2 — Composed team",
  3: "TIER 3 — Frontier cortex",
};

function buildReasoning(tier: 0 | 1 | 2 | 3, f: PromptFeatures): string {
  const tops = (Object.entries({
    ui: f.ui, code: f.code, data: f.data, reasoning: f.reasoning,
    multimodal: f.multimodal, creative: f.creative, safety: f.safety,
  }) as Array<[string, number]>)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => k);

  const featureLine = tops.length
    ? `Dominant features: ${tops.join(" + ")}.`
    : "No strong feature signal — generic build.";

  const tierLine = {
    0: "Composite below 0.25. Pattern is well-known and absorbed locally — no external model call needed.",
    1: "Composite 0.25–0.50. One specialist partner can answer this end-to-end.",
    2: "Composite 0.50–0.75. Multiple feature axes triggered — composed team handles different aspects in parallel.",
    3: "Composite ≥ 0.75. High complexity, multi-step reasoning — frontier cortex required.",
  }[tier];

  return `${featureLine} Composite complexity ${f.complexity.toFixed(2)}. ${tierLine}`;
}

function buildMockOutput(prompt: string, tier: 0 | 1 | 2 | 3, partners: PartnerId[]): string {
  const partnerName = partners.length
    ? PARTNERS[partners[0]].label
    : "Local SACE";
  if (tier === 0) {
    return `[${partnerName}]\n\n✓ Recognized common pattern. Returning cached scaffold.\n\n— No external call. Cost: $0.00. Latency: ~120ms.`;
  }
  if (tier === 1) {
    return `[${partnerName}]\n\nHere's a focused implementation for: "${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}"\n\n• Single-pass solution\n• Self-contained, no additional context needed\n• Routed to one specialist for cost and latency`;
  }
  if (tier === 2) {
    const team = partners.map((p) => PARTNERS[p].label).join(" + ");
    return `[Composed: ${team}]\n\nDecomposed "${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}" into parallel subtasks:\n\n1. Architecture pass\n2. Implementation pass\n3. Validation pass\n\nMerged into one coherent response.`;
  }
  return `[Frontier Cortex]\n\nMulti-step reasoning over: "${prompt.slice(0, 80)}${prompt.length > 80 ? "…" : ""}"\n\n• Long-context planning\n• Cross-model consensus\n• Highest-fidelity synthesis\n\nReserved for the hardest 5% of requests.`;
}

export function classifyPrompt(rawPrompt: string): ClassifierResult {
  const prompt = rawPrompt.trim();
  const features = extractFeatures(prompt);
  const tier = tierFromComplexity(features.complexity);
  const partners = routePartners(tier, features);
  const estOutputTokens = estimateOutputTokens(tier, features);
  const { baselineCents, soupyCents } = estimateCosts(tier, partners, estOutputTokens);
  const etaSeconds = estimateEtaSeconds(partners, estOutputTokens);

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    reasoning: buildReasoning(tier, features),
    features,
    partners,
    partnerLabels: partners.map((id) => ({
      id,
      label: PARTNERS[id].label,
      vendor: PARTNERS[id].vendor,
    })),
    estOutputTokens,
    baselineCostCents: baselineCents,
    soupyCostCents: soupyCents,
    savedCents: Math.max(0, baselineCents - soupyCents),
    etaSeconds,
    mockOutput: buildMockOutput(prompt, tier, partners),
  };
}
