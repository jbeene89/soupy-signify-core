import { describe, expect, it } from "vitest";
import { classifyPrompt } from "./index.js";

describe("classifier placeholder", () => {
  it("routes locally until the marketing classifier is ported", () => {
    expect(classifyPrompt("hello")).toMatchObject({
      estimate: true,
      partners: ["local-tier-0"],
      tier: 0
    });
  });
});

