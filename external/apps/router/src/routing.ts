import { classifyPrompt } from "@soupy-together/classifier";
import type { RouteDecision } from "@soupy-together/shared-types";

/**
 * Decide a route for a prompt. The classifier package is now the source of
 * truth for tier, partners, and cost numbers. This wrapper only adds a test
 * override (FORCE_EXPENSIVE_REQUEST) that lets the budget-cap test reliably
 * trip the request cap without being sensitive to classifier tuning.
 */
export function decideRoute(prompt: string): RouteDecision {
  const decision = classifyPrompt(prompt);

  if (prompt.includes("FORCE_EXPENSIVE_REQUEST")) {
    return {
      ...decision,
      tier: 3,
      est_cost_cents: Math.max(decision.est_cost_cents, 26),
      baseline_gpt5_cents: Math.max(decision.baseline_gpt5_cents, 31)
    };
  }

  return decision;
}
