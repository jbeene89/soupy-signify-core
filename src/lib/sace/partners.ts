/**
 * Marketing-side re-export of the SACE partner roster.
 *
 * Single source of truth lives in `external/packages/classifier`. This file
 * exists so existing imports across the marketing app keep working without
 * a sweeping rename.
 */

export {
  PARTNERS,
  estimateCosts,
  estimateEtaSeconds,
  estimateOutputTokens,
  extractFeatures,
  routePartners,
  tierFromComplexity,
  FEATURE_KEYWORDS,
} from "@soupy-together/classifier";
export type { Partner, PartnerId, PromptFeatures } from "@soupy-together/classifier";
