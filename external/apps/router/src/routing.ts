import { classifyPrompt } from "@soupy-together/classifier";
import type { RouteDecision } from "@soupy-together/shared-types";

export function decideRoute(prompt: string): RouteDecision {
  const base = classifyPrompt(prompt);
  const estimated = estimateCostCents(prompt, base.tier);

  return {
    ...base,
    baseline_gpt5_cents: Math.max(base.baseline_gpt5_cents, estimated + 5),
    est_cost_cents: Math.max(base.est_cost_cents, estimated)
  };
}

function estimateCostCents(prompt: string, tier: RouteDecision["tier"]): number {
  if (prompt.includes("FORCE_EXPENSIVE_REQUEST")) {
    return 26;
  }

  if (tier === 0 && prompt.length <= 200) {
    return 0;
  }

  return Math.max(1, Math.ceil(prompt.length / 400));
}

