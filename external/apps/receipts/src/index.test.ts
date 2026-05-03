import { describe, expect, it } from "vitest";
import { receiptsHealth } from "./index.js";

describe("receipts scaffold", () => {
  it("exposes a health response", () => {
    expect(receiptsHealth()).toEqual({
      ok: true,
      service: "receipts",
      version: "0.0.0"
    });
  });
});

