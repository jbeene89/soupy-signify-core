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
    const decision = classifyPrompt(
      "Build a responsive React login form component with email validation, password input, and OAuth sign-in buttons"
    );
    expect(decision.tier).toBe(1);
    expect(decision.partners).toContain("claude-haiku");
    // Cost may round to 0 cents at tier 1 with cheap specialists; baseline must
    // still be non-zero so the savings story renders.
    expect(decision.baseline_gpt5_cents).toBeGreaterThan(0);
  });

  it("escalates a complex multi-feature build to tier 2 or 3", () => {
    const decision = classifyPrompt(
      "Plan and architect a multi-tenant SaaS billing dashboard with Stripe webhooks, per-org analytics, role-based permissions, RLS, dark mode toggle, responsive layout, Postgres schema with 12 tables, aggregate report queries, refactor of existing auth module, and a complex multi-step migration strategy across services with security tradeoff analysis."
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
