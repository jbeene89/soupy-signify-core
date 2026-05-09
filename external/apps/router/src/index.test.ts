import { describe, expect, it } from "vitest";
import { previewRoute, routerHealth } from "./index.js";

describe("router scaffold", () => {
  it("exposes a health response", () => {
    expect(routerHealth()).toMatchObject({ ok: true, service: "router" });
  });

  it("classifies trivial prompts as tier 0 with the local partner", () => {
    const decision = previewRoute("hello");
    expect(decision).toMatchObject({ estimate: true, tier: 0 });
    expect(decision.partners).toEqual(["local-sace"]);
    expect(decision.router_version).toBe("0.1.0");
  });

  it("returns a real cost for a tier-1 build prompt", () => {
    const decision = previewRoute(
      "Build a responsive React login form component with email validation, password input, and OAuth sign-in buttons"
    );
    expect(decision.tier).toBe(1);
    expect(decision.est_cost_cents).toBeGreaterThan(0);
    expect(decision.partners).toContain("claude-haiku");
  });
});
