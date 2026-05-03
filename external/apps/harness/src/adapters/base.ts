import type { Adapter, BuildBrief, RunArtifact, ToolId } from "@soupy-together/shared-types";

export function createEmptyAdapter(id: ToolId, mode: Adapter["mode"] = "automated"): Adapter {
  return {
    id,
    mode,
    version: "0.0.0-empty",
    async run(_brief: BuildBrief): Promise<RunArtifact> {
      throw new Error(`Adapter '${id}' is not implemented in PR #1.`);
    }
  };
}

