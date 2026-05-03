import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { ArtifactLocation, ToolId } from "@soupy-together/shared-types";
import { workspaceRoot } from "./paths.js";

export function artifactDir(runId: string, toolId: ToolId): string {
  return resolve(workspaceRoot(), "artifacts", runId, toolId);
}

export async function writeTextArtifact(
  runId: string,
  toolId: ToolId,
  relativePath: string,
  content: string
): Promise<ArtifactLocation> {
  const path = join(artifactDir(runId, toolId), relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");

  return {
    path: relativePathFromRepo(path),
    sha256: createHash("sha256").update(content).digest("hex")
  };
}

export function relativePathFromRepo(path: string): string {
  return path.replace(`${workspaceRoot()}\\`, "").replaceAll("\\", "/");
}
