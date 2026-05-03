import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Adapter, BuildBrief, RunArtifact } from "@soupy-together/shared-types";

const execFileAsync = promisify(execFile);

export const claudeCodeAdapter: Adapter = {
  id: "claude-code",
  mode: "automated",
  version: "0.1.0-cli-detect",
  async run(_brief: BuildBrief): Promise<RunArtifact> {
    const startedAt = new Date().toISOString();
    const detected = await detectClaudeCli();
    const completedAt = new Date().toISOString();

    return {
      completedAt,
      durationMs: Date.parse(completedAt) - Date.parse(startedAt),
      mode: "automated",
      rawMetadata: {
        reason: detected
          ? "Claude CLI detected, but execution is intentionally disabled until PR #4 adds sandboxed invocation."
          : "Claude CLI not found on PATH."
      },
      startedAt,
      status: "unavailable",
      toolId: "claude-code"
    };
  }
};

async function detectClaudeCli(): Promise<boolean> {
  try {
    await execFileAsync("claude", ["--version"], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
