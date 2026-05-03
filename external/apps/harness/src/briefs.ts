import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import type { BuildBrief } from "@soupy-together/shared-types";
import { workspaceRoot } from "./paths.js";

export async function loadBrief(buildOffId: string): Promise<BuildBrief> {
  const sourcePath = join(workspaceRoot(), "briefs", `${buildOffId}.md`);
  const raw = await readFile(sourcePath, "utf8");
  const title = extractTitle(raw) ?? basename(sourcePath, ".md");
  const prompt = raw.trim();

  return {
    id: buildOffId,
    prompt,
    promptSha256: sha256(prompt),
    sourcePath,
    title
  };
}

function extractTitle(markdown: string): string | undefined {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match?.[1]?.trim();
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
