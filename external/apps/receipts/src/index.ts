import { fileURLToPath } from "node:url";
import type { HealthResponse } from "@soupy-together/shared-types";
import { createReceiptsServer, receiptsConfigFromEnv } from "./server.js";

export { appendReceipt, getReceiptLog, getReceiptProof } from "./store.js";
export { createReceiptsServer };

export function receiptsHealth(): HealthResponse {
  return {
    ok: true,
    service: "receipts",
    version: "0.0.0"
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const config = receiptsConfigFromEnv();
  const server = createReceiptsServer(config);

  server.listen(config.port, () => {
    console.log(JSON.stringify({ ...receiptsHealth(), port: config.port }));
  });
}
