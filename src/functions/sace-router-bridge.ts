/**
 * Bridge module: re-exports server-only SACE router helpers so that
 * .functions.ts files can import them without the splitter mangling
 * the path to a .server.ts file.
 */
export { callRouterRoute, readSaceEnv, openCompleteStream } from "@/server/sace-router.server";