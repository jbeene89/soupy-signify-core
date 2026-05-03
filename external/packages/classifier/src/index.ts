import type { RouteDecision } from "@soupy-together/shared-types";

export const CLASSIFIER_VERSION = "0.0.0-placeholder";

export function classifyPrompt(_prompt: string): RouteDecision {
  return {
    baseline_gpt5_cents: 0,
    est_cost_cents: 0,
    estimate: true,
    partners: ["local-tier-0"],
    router_version: CLASSIFIER_VERSION,
    tier: 0
  };
}

