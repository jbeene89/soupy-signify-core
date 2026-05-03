/**
 * Server-only SACE router client.
 *
 * - Reads SACE_* env vars at call time (never at module scope).
 * - Signs every outbound request with HMAC headers:
 *     x-soupy-api-key, x-soupy-timestamp, x-soupy-signature
 * - NEVER imported from client code (file is named *.server.ts so the
 *   Vite import-protection plugin blocks accidental client imports).
 *
 * The canonical signing string is isolated in `canonicalSigningString()`
 * so we can update it in one place when the external router PR finalizes
 * the exact format.
 */

import { createHmac } from "crypto";
import type {
  BudgetCapError,
  CompleteRequest,
  RouteDecision,
  RouteRequest,
} from "@/lib/sace/contract";

export interface SaceEnv {
  routerBaseUrl: string;
  receiptsBaseUrl: string;
  buildOffResultsBaseUrl: string;
  hmacKey: string;
  apiKeyId: string;
}

/**
 * Read SACE env. Returns null if any required var is missing — callers
 * should treat null as "use local fallback".
 */
export function readSaceEnv(): SaceEnv | null {
  const routerBaseUrl = process.env.SACE_ROUTER_BASE_URL;
  const receiptsBaseUrl = process.env.SACE_RECEIPTS_BASE_URL;
  const buildOffResultsBaseUrl = process.env.SACE_BUILD_OFF_RESULTS_BASE_URL;
  const hmacKey = process.env.SACE_ROUTER_HMAC_KEY;
  // Optional: an API key id that the router uses to look up the HMAC secret.
  // Falls back to a stable identifier so single-tenant deployments still work.
  const apiKeyId = process.env.SACE_ROUTER_API_KEY_ID ?? "soupy-together-site";

  if (!routerBaseUrl || !receiptsBaseUrl || !buildOffResultsBaseUrl || !hmacKey) {
    return null;
  }
  return {
    routerBaseUrl: routerBaseUrl.replace(/\/+$/, ""),
    receiptsBaseUrl: receiptsBaseUrl.replace(/\/+$/, ""),
    buildOffResultsBaseUrl: buildOffResultsBaseUrl.replace(/\/+$/, ""),
    hmacKey,
    apiKeyId,
  };
}

/**
 * Canonical signing string per external SACE spec:
 *   `${timestamp}.${rawBody}`
 * - timestamp: same value sent in `x-soupy-timestamp` (unix seconds, string)
 * - rawBody: exact JSON string sent over the wire
 * - signature: base64(hmac_sha256(SACE_ROUTER_HMAC_KEY, canonical))
 */
function canonicalSigningString(timestamp: string, bodyText: string): string {
  return `${timestamp}.${bodyText}`;
}

function signHeaders(
  env: SaceEnv,
  bodyText: string,
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const canonical = canonicalSigningString(timestamp, bodyText);
  const signature = createHmac("sha256", env.hmacKey)
    .update(canonical)
    .digest("base64");
  return {
    "x-soupy-api-key": env.apiKeyId,
    "x-soupy-timestamp": timestamp,
    "x-soupy-signature": signature,
  };
}

export type RouteResult =
  | { ok: true; decision: RouteDecision }
  | { ok: false; kind: "budget_cap"; error: BudgetCapError }
  | { ok: false; kind: "transport"; status: number; message: string };

export async function callRouterRoute(
  env: SaceEnv,
  body: RouteRequest,
): Promise<RouteResult> {
  const path = "/v1/route";
  const url = `${env.routerBaseUrl}${path}`;
  const bodyText = JSON.stringify(body);
  const headers = {
    "content-type": "application/json",
    accept: "application/json",
    ...signHeaders(env, bodyText),
  };

  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers, body: bodyText });
  } catch (err) {
    return {
      ok: false,
      kind: "transport",
      status: 0,
      message: err instanceof Error ? err.message : "router unreachable",
    };
  }

  if (res.status === 402) {
    try {
      const j = (await res.json()) as BudgetCapError;
      return { ok: false, kind: "budget_cap", error: j };
    } catch {
      return {
        ok: false,
        kind: "transport",
        status: 402,
        message: "budget cap response malformed",
      };
    }
  }

  if (!res.ok) {
    let message = `router ${res.status}`;
    try {
      const txt = await res.text();
      if (txt) message = txt.slice(0, 200);
    } catch {
      /* ignore */
    }
    return { ok: false, kind: "transport", status: res.status, message };
  }

  try {
    const decision = (await res.json()) as RouteDecision;
    return { ok: true, decision };
  } catch {
    return {
      ok: false,
      kind: "transport",
      status: 200,
      message: "router returned invalid JSON",
    };
  }
}

/**
 * Open a streaming connection to /v1/complete. Returns the raw Response so
 * the caller (a server route) can pipe the body back to the browser.
 */
export async function openCompleteStream(
  env: SaceEnv,
  body: CompleteRequest,
): Promise<Response> {
  const path = "/v1/complete";
  const url = `${env.routerBaseUrl}${path}`;
  const bodyText = JSON.stringify(body);
  const headers = {
    "content-type": "application/json",
    accept: "application/x-ndjson",
    ...signHeaders(env, bodyText),
  };
  return fetch(url, { method: "POST", headers, body: bodyText });
}
