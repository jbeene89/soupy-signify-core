/**
 * UI-facing wrapper around the canonical SACE classifier.
 *
 * The router/contract lives in `@soupy-together/classifier` and emits the
 * RouteDecision shape. This module re-shapes that decision into the richer
 * ClassifierResult the marketing /demo page renders (tier label, reasoning,
 * partner labels, mock output, etc.) without diverging on tier, partners,
 * or cost numbers.
 */

import {
  classifyPrompt as routerClassify,
  extractFeatures,
  estimateOutputTokens,
  estimateEtaSeconds,
  PARTNERS,
  type PartnerId,
  type PromptFeatures,
} from "@soupy-together/classifier";

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
  const partnerName = partners.length ? PARTNERS[partners[0]].label : "Local SACE";
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
  const decision = routerClassify(prompt);
  const features = extractFeatures(prompt);
  const partners = decision.partners as PartnerId[];
  const tier = decision.tier;
  const estOutputTokens = estimateOutputTokens(tier, features);
  const etaSeconds = estimateEtaSeconds(partners, estOutputTokens);

  return {
    tier,
    tierLabel: TIER_LABELS[tier],
    reasoning: buildReasoning(tier, features),
    features,
    partners,
    partnerLabels: partners.map((id) => ({
      id,
      label: PARTNERS[id]?.label ?? id,
      vendor: PARTNERS[id]?.vendor ?? "SACE-routed",
    })),
    estOutputTokens,
    baselineCostCents: decision.baseline_gpt5_cents,
    soupyCostCents: decision.est_cost_cents,
    savedCents: Math.max(0, decision.baseline_gpt5_cents - decision.est_cost_cents),
    etaSeconds,
    mockOutput: buildMockOutput(prompt, tier, partners),
  };
}
