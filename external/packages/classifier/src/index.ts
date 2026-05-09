import type { RouteDecision } from "@soupy-together/shared-types";
import { extractFeatures } from "./features.js";
import { tierFromComplexity } from "./tiers.js";
import {
  routePartners,
  estimateOutputTokens,
  estimateCosts
} from "./partners.js";

export const CLASSIFIER_VERSION = "0.1.0";

export { extractFeatures, FEATURE_KEYWORDS } from "./features.js";
export type { PromptFeatures } from "./features.js";
export { tierFromComplexity } from "./tiers.js";
export {
  PARTNERS,
  routePartners,
  estimateOutputTokens,
  estimateCosts,
  estimateEtaSeconds
} from "./partners.js";
export type { Partner, PartnerId } from "./partners.js";

export function classifyPrompt(prompt: string): RouteDecision {
  const features = extractFeatures(prompt);
  const tier = tierFromComplexity(features.complexity);
  const partners = routePartners(tier, features);
  const outTokens = estimateOutputTokens(tier, features);
  const { baselineCents, soupyCents } = estimateCosts(tier, partners, outTokens);

  return {
    tier,
    partners,
    est_cost_cents: soupyCents,
    baseline_gpt5_cents: baselineCents,
    router_version: CLASSIFIER_VERSION,
    estimate: true
  };
}
