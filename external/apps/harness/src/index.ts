import { fileURLToPath } from "node:url";
import type { HealthResponse } from "@soupy-together/shared-types";
import { adapters } from "./adapters/index.js";
import { runBuildOff } from "./runner.js";

export { adapters };
export { runBuildOff };

export function harnessHealth(): HealthResponse {
  return {
    ok: true,
    service: "harness",
    version: "0.0.0"
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const buildOffId = process.argv[2];

  if (buildOffId === undefined) {
    console.log(JSON.stringify({ ...harnessHealth(), adapters: adapters.map((adapter) => adapter.id) }));
  } else {
    const result = await runBuildOff({ buildOffId });
    console.log(
      JSON.stringify({
        buildOffId: result.buildOffId,
        runId: result.runId,
        runs: result.runs.length
      })
    );
  }
}
