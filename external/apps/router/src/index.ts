import { fileURLToPath } from "node:url";
import { classifyPrompt } from "@soupy-together/classifier";
import type { HealthResponse, RouteDecision } from "@soupy-together/shared-types";
import { createRouterServer, routerConfigFromEnv } from "./server.js";

export { signRequestBody } from "./auth.js";
export { createRouterServer };

export function routerHealth(): HealthResponse {
  return {
    ok: true,
    service: "router",
    version: "0.0.0"
  };
}

export function previewRoute(prompt: string): RouteDecision {
  return classifyPrompt(prompt);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = routerConfigFromEnv();
  const server = createRouterServer(config);

  server.listen(config.port, () => {
    console.log(JSON.stringify({ ...routerHealth(), port: config.port }));
  });
}
