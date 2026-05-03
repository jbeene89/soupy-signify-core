import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { soupyAdapter } from "./soupy.js";

const originalCwd = process.cwd();

describe("soupy adapter", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "soupy-adapter-"));
    await writeFile(join(tempDir, "pnpm-workspace.yaml"), "packages: []\n");
    await mkdir(join(tempDir, "briefs"));
    process.chdir(tempDir);
    process.env.HARNESS_RUN_ID = "test-run";
  });

  afterEach(() => {
    delete process.env.HARNESS_RUN_ID;
    process.chdir(originalCwd);
  });

  it("calls the router path and records receipt evidence", async () => {
    const artifact = await soupyAdapter.run({
      id: "001-test",
      prompt: "# Test\n\nBuild a small test app.",
      promptSha256: "a".repeat(64),
      title: "Test"
    });

    expect(artifact.status).toBe("completed");
    expect(artifact.rawMetadata.receiptId).toEqual(expect.any(String));
    expect(artifact.rawMetadata.receiptDate).toEqual(expect.any(String));
    expect(artifact.rawMetadata.receiptProofPath).toBe("artifacts/test-run/soupy/receipt-proof.json");
  });
});

