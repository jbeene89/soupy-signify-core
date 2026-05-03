import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import type { Receipt } from "@soupy-together/shared-types";
import {
  appendReceipt,
  getReceiptLog,
  getReceiptProof,
  ReceiptStoreError,
  type ReceiptStoreConfig
} from "./store.js";

export interface ReceiptsServerOptions {
  dataDir?: string;
  port?: number;
  signingKeyBase64?: string;
}

export function createReceiptsServer(options: ReceiptsServerOptions = {}) {
  const config = resolveConfig(options);

  return createServer(async (request, response) => {
    try {
      await routeRequest(config, request, response);
    } catch (error) {
      writeError(response, error);
    }
  });
}

export function receiptsConfigFromEnv(): Required<ReceiptsServerOptions> {
  return {
    dataDir: process.env.RECEIPTS_DATA_DIR ?? "data/receipts",
    port: Number(process.env.RECEIPTS_PORT ?? 8081),
    signingKeyBase64: process.env.RECEIPTS_SIGNING_KEY ?? ""
  };
}

async function routeRequest(
  config: ReceiptStoreConfig,
  request: IncomingMessage,
  response: ServerResponse
): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  if (request.method === "GET" && url.pathname === "/health") {
    writeJson(response, 200, { ok: true, service: "receipts", version: "0.1.0" });
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/receipts") {
    if (config.signingKeyBase64.length === 0) {
      writeJson(response, 500, {
        error: "missing_receipts_signing_key",
        message: "RECEIPTS_SIGNING_KEY is required to verify receipts."
      });
      return;
    }

    const receipt = (await readJson(request)) as Receipt;
    writeJson(response, 201, await appendReceipt(config, receipt));
    return;
  }

  const logMatch = url.pathname.match(/^\/v1\/receipts\/(\d{4}-\d{2}-\d{2})$/);

  if (request.method === "GET" && logMatch?.[1] !== undefined) {
    writeJson(response, 200, await getReceiptLog(config, logMatch[1]));
    return;
  }

  const proofMatch = url.pathname.match(
    /^\/v1\/receipts\/(\d{4}-\d{2}-\d{2})\/proof\/([^/]+)$/
  );

  if (request.method === "GET" && proofMatch?.[1] !== undefined && proofMatch[2] !== undefined) {
    writeJson(response, 200, await getReceiptProof(config, proofMatch[1], proofMatch[2]));
    return;
  }

  writeJson(response, 404, { error: "not_found" });
}

function resolveConfig(options: ReceiptsServerOptions): ReceiptStoreConfig {
  return {
    dataDir: resolve(options.dataDir ?? receiptsConfigFromEnv().dataDir),
    signingKeyBase64: options.signingKeyBase64 ?? receiptsConfigFromEnv().signingKeyBase64
  };
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(`${JSON.stringify(body)}\n`);
}

function writeError(response: ServerResponse, error: unknown): void {
  if (error instanceof ReceiptStoreError) {
    writeJson(response, error.statusCode, { error: error.code, message: error.message });
    return;
  }

  writeJson(response, 500, {
    error: "internal_error",
    message: error instanceof Error ? error.message : String(error)
  });
}

