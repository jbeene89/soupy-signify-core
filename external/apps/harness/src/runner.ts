import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Adapter, BuildOffResult, RunArtifact, ToolId } from "@soupy-together/shared-types";
import { adapters as defaultAdapters } from "./adapters/index.js";
import { loadBrief } from "./briefs.js";
import { currentGitSha } from "./git.js";
import { gradeArtifact } from "./grader/index.js";
import { workspaceRoot } from "./paths.js";

export interface BuildOffOptions {
  buildOffId: string;
  runId?: string;
  adapters?: Adapter[];
}

export async function runBuildOff(options: BuildOffOptions): Promise<BuildOffResult> {
  const selectedAdapters = options.adapters ?? defaultAdapters;
  const startedAt = new Date().toISOString();
  const runId = options.runId ?? makeRunId(startedAt);
  const brief = await loadBrief(options.buildOffId);
  const artifacts: RunArtifact[] = [];
  const previousRunId = process.env.HARNESS_RUN_ID;
  process.env.HARNESS_RUN_ID = runId;

  try {
    for (const adapter of selectedAdapters) {
      artifacts.push(await runAdapter(adapter, brief));
    }
  } finally {
    if (previousRunId === undefined) {
      delete process.env.HARNESS_RUN_ID;
    } else {
      process.env.HARNESS_RUN_ID = previousRunId;
    }
  }

  const completedAt = new Date().toISOString();
  const result: BuildOffResult = {
    adapterVersions: adapterVersions(selectedAdapters),
    buildOffId: options.buildOffId,
    completedAt,
    harnessGitSha: await currentGitSha(),
    modelVersions: {},
    promptSha256: brief.promptSha256,
    runId,
    runs: artifacts.map(gradeArtifact),
    startedAt
  };

  await writeResult(result);
  return result;
}

async function runAdapter(
  adapter: Adapter,
  brief: Awaited<ReturnType<typeof loadBrief>>
): Promise<RunArtifact> {
  const startedAt = new Date().toISOString();

  if (adapter.mode === "manual") {
    return {
      mode: adapter.mode,
      rawMetadata: {
        reason: "Manual adapter. See manual runbook when this tool is enabled."
      },
      startedAt,
      status: "manual",
      toolId: adapter.id
    };
  }

  try {
    return await adapter.run(brief);
  } catch (error) {
    return {
      completedAt: new Date().toISOString(),
      mode: adapter.mode,
      rawMetadata: {
        error: error instanceof Error ? error.message : String(error)
      },
      startedAt,
      status: "failed",
      toolId: adapter.id
    };
  }
}

function adapterVersions(adapters: Adapter[]): Record<ToolId, string> {
  return Object.fromEntries(adapters.map((adapter) => [adapter.id, adapter.version])) as Record<
    ToolId,
    string
  >;
}

async function writeResult(result: BuildOffResult): Promise<void> {
  const outDir = resolve(workspaceRoot(), "results", result.buildOffId);
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, `${result.runId}.json`), `${JSON.stringify(result, null, 2)}\n`);
}

function makeRunId(isoTimestamp: string): string {
  return isoTimestamp.replaceAll(":", "").replaceAll(".", "").replace("T", "-").replace("Z", "Z");
}
