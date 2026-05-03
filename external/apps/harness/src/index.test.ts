import { describe, expect, it } from "vitest";
import { adapters, harnessHealth } from "./index.js";

describe("harness scaffold", () => {
  it("registers every v1 adapter", () => {
    expect(adapters.map((adapter) => adapter.id)).toEqual([
      "soupy",
      "lovable",
      "bolt",
      "v0",
      "cursor",
      "replit",
      "claude-code"
    ]);
  });

  it("exposes a health response", () => {
    expect(harnessHealth()).toMatchObject({ ok: true, service: "harness" });
  });
});

