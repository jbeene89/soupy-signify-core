import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@soupy-together/classifier": fileURLToPath(new URL(
        "./packages/classifier/src/index.ts",
        import.meta.url
      )),
      "@soupy-together/shared-types": fileURLToPath(new URL(
        "./packages/shared-types/src/index.ts",
        import.meta.url
      )),
      "receipts": fileURLToPath(new URL("./apps/receipts/src/index.ts", import.meta.url)),
      "router": fileURLToPath(new URL("./apps/router/src/index.ts", import.meta.url))
    }
  },
  test: {
    environment: "node",
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"]
  }
});
