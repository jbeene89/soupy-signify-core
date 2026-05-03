import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  signReceipt,
  sha256Hex,
  type CompleteRequest,
  type CompleteStreamChunk,
  type Receipt,
  type RouteRequest,
  type UnsignedReceipt
} from "@soupy-together/shared-types";
import { HmacAuthError, verifyHmacHeaders } from "./auth.js";
import { assertBudget, BudgetError, recordSpend, type BudgetState } from "./budget.js";
import { RateLimitError, assertRateLimit, type RateLimitState } from "./rate-limit.js";
import { decideRoute } from "./routing.js";

export interface RouterServerOptions {
  hmacKey?: string;
  maxRequestCents?: number;
  maxSessionCents?: number;
  port?: number;
  rateLimitPerMinute?: number;
  receiptsSigningKeyBase64?: string;
  receiptsUrl?: string;
}

export function createRouterServer(options: RouterServerOptions = {}) {
  const config = resolveConfig(options);
  const budgetState: BudgetState = { sessionSpend: new Map() };
  const rateLimitState: RateLimitState = { hitsByApiKey: new Map() };

  return createServer(async (request, response) => {
    try {
      await routeRequest(config, budgetState, rateLimitState, request, response);
    } catch (error) {
      writeError(response, error);
    }
  });
}

export function routerConfigFromEnv(): Required<RouterServerOptions> {
  return {
    hmacKey: process.env.ROUTER_HMAC_KEY ?? "",
    maxRequestCents: Number(process.env.MAX_REQUEST_CENTS ?? 25),
    maxSessionCents: Number(process.env.MAX_SESSION_CENTS ?? 200),
    port: Number(process.env.ROUTER_PORT ?? 8080),
    rateLimitPerMinute: Number(process.env.ROUTER_RATE_LIMIT_PER_MINUTE ?? 60),
    receiptsSigningKeyBase64: process.env.RECEIPTS_SIGNING_KEY ?? "",
    receiptsUrl: process.env.RECEIPTS_PUBLIC_BASE_URL ?? "http://localhost:8081"
  };
}

async function routeRequest(
  config: Required<RouterServerOptions>,
  budgetState: BudgetState,
  rateLimitState: RateLimitState,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, { ok: true, service: "router", version: "0.1.0" });
    return;
  }

  if (request.method !== "POST" || !["/v1/route", "/v1/complete"].includes(url.pathname)) {
    writeJson(response, 404, { error: "not_found" });
    return;
  }

  const rawBody = await readBody(request);
  const auth = verifyHmacHeaders(request.headers, rawBody, config.hmacKey);
  assertRateLimit({ requestsPerMinute: config.rateLimitPerMinute }, rateLimitState, auth.apiKey);

  if (url.pathname === "/v1/route") {
    const body = JSON.parse(rawBody) as RouteRequest;
    const decision = decideRoute(body.prompt);
    assertBudget(config, budgetState, auth.apiKey, decision);
    writeJson(response, 200, decision);
    return;
  }

  const body = JSON.parse(rawBody) as CompleteRequest;
  const decision = decideRoute(body.prompt);
  const sessionId = body.session_id ?? auth.apiKey;
  assertBudget(config, budgetState, sessionId, decision);
  recordSpend(budgetState, sessionId, decision.est_cost_cents);
  await streamCompletion(config, body, decision, response);
}

async function streamCompletion(
  config: Required<RouterServerOptions>,
  body: CompleteRequest,
  decision: ReturnType<typeof decideRoute>,
  response: ServerResponse
): Promise<void> {
  response.writeHead(200, {
    "cache-control": "no-store",
    "content-type": "application/x-ndjson"
  });

  const text = `Soupy local completion: routed tier ${decision.tier} to ${decision.partners.join(", ")}.`;
  writeChunk(response, { text, type: "delta" });

  const receipt = await emitReceipt(config, body.prompt, text, decision);
  writeChunk(response, {
    receipt_date: receipt.ts.slice(0, 10),
    receipt_id: receipt.id,
    type: "receipt"
  });
  writeChunk(response, { type: "done" });
  response.end();
}

async function emitReceipt(
  config: Required<RouterServerOptions>,
  prompt: string,
  completion: string,
  decision: ReturnType<typeof decideRoute>
): Promise<Receipt> {
  if (config.receiptsSigningKeyBase64.length === 0) {
    throw new Error("RECEIPTS_SIGNING_KEY is required to sign receipts.");
  }

  const unsignedReceipt: UnsignedReceipt = {
    baseline_gpt5_cents: decision.baseline_gpt5_cents,
    id: randomUUID(),
    out_tokens: Math.ceil(completion.length / 4),
    partners: decision.partners,
    prompt_sha256: sha256Hex(prompt),
    router_version: decision.router_version,
    saved_cents: Math.max(0, decision.baseline_gpt5_cents - decision.est_cost_cents),
    soupy_cents: decision.est_cost_cents,
    tier: decision.tier,
    ts: new Date().toISOString()
  };
  const receipt = signReceipt(unsignedReceipt, config.receiptsSigningKeyBase64);
  const response = await fetch(`${config.receiptsUrl}/v1/receipts`, {
    body: JSON.stringify(receipt),
    headers: { "content-type": "application/json" },
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Receipts service rejected receipt with HTTP ${response.status}.`);
  }

  return receipt;
}

function resolveConfig(options: RouterServerOptions): Required<RouterServerOptions> {
  const env = routerConfigFromEnv();

  return {
    hmacKey: options.hmacKey ?? env.hmacKey,
    maxRequestCents: options.maxRequestCents ?? env.maxRequestCents,
    maxSessionCents: options.maxSessionCents ?? env.maxSessionCents,
    port: options.port ?? env.port,
    rateLimitPerMinute: options.rateLimitPerMinute ?? env.rateLimitPerMinute,
    receiptsSigningKeyBase64: options.receiptsSigningKeyBase64 ?? env.receiptsSigningKeyBase64,
    receiptsUrl: options.receiptsUrl ?? env.receiptsUrl
  };
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function writeChunk(response: ServerResponse, chunk: CompleteStreamChunk): void {
  response.write(`${JSON.stringify(chunk)}\n`);
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(`${JSON.stringify(body)}\n`);
}

function writeError(response: ServerResponse, error: unknown): void {
  if (error instanceof BudgetError) {
    writeJson(response, 402, {
      cap: error.cap,
      error: "budget_cap_exceeded",
      estimated_cents: error.estimatedCents,
      max_cents: error.maxCents,
      upgrade_url: "/partners"
    });
    return;
  }

  if (error instanceof HmacAuthError) {
    writeJson(response, error.statusCode, { error: error.code, message: error.message });
    return;
  }

  if (error instanceof RateLimitError) {
    writeJson(response, error.statusCode, { error: error.code, message: error.message });
    return;
  }

  writeJson(response, 500, {
    error: "internal_error",
    message: error instanceof Error ? error.message : String(error)
  });
}

