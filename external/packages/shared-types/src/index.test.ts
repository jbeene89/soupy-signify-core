import { describe, expect, it } from "vitest";
import type {
  BudgetCapExceeded,
  CompleteStreamChunk,
  HmacRequestHeaders,
  Receipt,
  ToolId
} from "./index.js";
import { canonicalJson, signReceipt, verifyReceipt } from "./index.js";
import { generateKeyPairSync } from "node:crypto";

describe("shared types", () => {
  it("allows known harness tool ids", () => {
    const tools: ToolId[] = [
      "soupy",
      "lovable",
      "bolt",
      "v0",
      "cursor",
      "replit",
      "claude-code"
    ];

    expect(tools).toHaveLength(7);
  });

  it("keeps receipts prompt-content free", () => {
    const receipt: Receipt = {
      id: "00000000-0000-4000-8000-000000000000",
      ts: "2026-05-02T00:00:00.000Z",
      prompt_sha256: "a".repeat(64),
      tier: 0,
      partners: ["local-tier-0"],
      out_tokens: 0,
      soupy_cents: 0,
      baseline_gpt5_cents: 0,
      saved_cents: 0,
      router_version: "0.0.0",
      sig: ""
    };

    expect(Object.keys(receipt)).not.toContain("prompt");
  });

  it("models Lovable-safe server-side router auth headers", () => {
    const headers: HmacRequestHeaders = {
      "x-soupy-api-key": "lovable-site",
      "x-soupy-signature": "base64",
      "x-soupy-timestamp": "1777694400"
    };

    expect(Object.keys(headers)).not.toContain("router_hmac_key");
  });

  it("models budget refusals as explicit partner upgrade responses", () => {
    const refusal: BudgetCapExceeded = {
      cap: "request",
      error: "budget_cap_exceeded",
      estimated_cents: 31,
      max_cents: 25,
      upgrade_url: "/partners"
    };

    expect(refusal).toMatchObject({ error: "budget_cap_exceeded", upgrade_url: "/partners" });
  });

  it("models completion streams with receipt evidence", () => {
    const chunks: CompleteStreamChunk[] = [
      { type: "delta", text: "Hello" },
      {
        receipt_date: "2026-05-02",
        receipt_id: "00000000-0000-4000-8000-000000000000",
        type: "receipt"
      },
      { type: "done" }
    ];

    expect(chunks.map((chunk) => chunk.type)).toEqual(["delta", "receipt", "done"]);
  });

  it("canonicalizes object keys before signing receipts", () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}');
  });

  it("signs and verifies receipts with ed25519", () => {
    const { privateKey } = generateKeyPairSync("ed25519");
    const privateKeyBase64 = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
    const receipt = signReceipt(
      {
        baseline_gpt5_cents: 1,
        id: "00000000-0000-4000-8000-000000000000",
        out_tokens: 1,
        partners: ["local-tier-0"],
        prompt_sha256: "a".repeat(64),
        router_version: "0.0.0",
        saved_cents: 1,
        soupy_cents: 0,
        tier: 0,
        ts: "2026-05-02T00:00:00.000Z"
      },
      privateKeyBase64
    );

    expect(verifyReceipt(receipt, privateKeyBase64)).toBe(true);
  });
});
