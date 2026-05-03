import { describe, expect, it } from "vitest";
import { previewRoute, routerHealth } from "./index.js";

describe("router scaffold", () => {
  it("exposes a health response", () => {
    expect(routerHealth()).toMatchObject({ ok: true, service: "router" });
  });

  it("can call the placeholder classifier", () => {
    expect(previewRoute("hello")).toMatchObject({ estimate: true, tier: 0 });
  });
});

