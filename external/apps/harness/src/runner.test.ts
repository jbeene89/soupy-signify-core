import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import type { Adapter, BuildBrief, RunArtifact } from "@soupy-together/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runBuildOff } from "./runner.js";

const originalCwd = process.cwd();

describe("build-off runner", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "soupy-harness-"));
    process.chdir(tempDir);
    await writeFile(join(tempDir, "pnpm-workspace.yaml"), "packages: []\n");
    await mkdir(join(tempDir, "briefs"));
    await writeFile(join(tempDir, "briefs", "001-test.md"), "# Test Brief\n\nBuild a test app.\n");
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("writes a build-off result JSON", async () => {
    const adapter: Adapter = {
      id: "soupy",
      mode: "automated",
      version: "test",
      async run(brief: BuildBrief): Promise<RunArtifact> {
        return {
          completedAt: "2026-05-02T00:00:01.000Z",
          durationMs: 1000,
          mode: "automated",
          rawMetadata: {
            bundleKb: 1,
            correctness: 2,
            costUsd: 0,
            fidelity: 3,
            honesty: 4,
            refactor: 5
          },
          startedAt: "2026-05-02T00:00:00.000Z",
          status: "completed",
          toolId: brief.id === "001-test" ? "soupy" : "claude-code"
        };
      }
    };

    const result = await runBuildOff({
      adapters: [adapter],
      buildOffId: "001-test",
      runId: "test-run"
    });
    const resultFile = await readFile(
      join(tempDir, "results", "001-test", "test-run.json"),
      "utf8"
    );

    expect(result.runs).toHaveLength(1);
    expect(JSON.parse(resultFile)).toMatchObject({
      buildOffId: "001-test",
      runId: "test-run"
    });
  });
});
