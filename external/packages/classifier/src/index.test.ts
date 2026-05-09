import { describe, expect, it } from "vitest";
import { classifyPrompt, CLASSIFIER_VERSION } from "./index.js";

describe("classifier", () => {
  it("returns the bumped version", () => {
    expect(CLASSIFIER_VERSION).toBe("0.1.0");
    expect(classifyPrompt("hello").router_version).toBe("0.1.0");
  });

  it("absorbs trivial prompts at tier 0 with zero cost", () => {
    const decision = classifyPrompt("rename variable foo to bar");
    expect(decision.tier).toBe(0);
    expect(decision.partners).toEqual(["local-sace"]);
    expect(decision.est_cost_cents).toBe(0);
    expect(decision.baseline_gpt5_cents).toBeGreaterThan(0);
  });

  it("empty prompts default to tier 0", () => {
    expect(classifyPrompt("").tier).toBe(0);
    expect(classifyPrompt("   ").tier).toBe(0);
  });

  it("routes a single-specialist build at tier 1 to Claude Haiku", () => {
    const decision = classifyPrompt("build a login form with email and password");
    expect(decision.tier).toBe(1);
    expect(decision.partners).toContain("claude-haiku");
    expect(decision.est_cost_cents).toBeGreaterThan(0);
  });

  it("escalates a complex multi-feature build to tier 2 or 3", () => {
    const decision = classifyPrompt(
      "Build a multi-tenant SaaS billing dashboard with Stripe webhooks, per-org analytics, RLS, dark mode, and Postgres aggregate reports across 12 tables."
    );
    expect(decision.tier).toBeGreaterThanOrEqual(2);
    expect(decision.partners.length).toBeGreaterThan(0);
    expect(decision.est_cost_cents).toBeGreaterThan(0);
  });

  it("baseline cost is always at least the soupy cost", () => {
    const decision = classifyPrompt("build a login form with email and password");
    expect(decision.baseline_gpt5_cents).toBeGreaterThanOrEqual(decision.est_cost_cents);
  });
});
