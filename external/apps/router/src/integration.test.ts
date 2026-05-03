import { generateKeyPairSync } from "node:crypto";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createReceiptsServer } from "receipts";
import { signRequestBody } from "./auth.js";
import { createRouterServer } from "./server.js";

describe("router and receipts integration", () => {
  let receiptsServer: Server;
  let routerServer: Server;
  let receiptsUrl: string;
  let routerUrl: string;
  let hmacKey: string;
  let signingKeyBase64: string;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "soupy-router-"));
    hmacKey = "test-hmac-key";
    signingKeyBase64 = generateSigningKey();
    receiptsServer = createReceiptsServer({
      dataDir: join(tempDir, "receipts"),
      signingKeyBase64
    });
    receiptsUrl = await listen(receiptsServer);
    routerServer = createRouterServer({
      hmacKey,
      maxRequestCents: 25,
      maxSessionCents: 200,
      receiptsSigningKeyBase64: signingKeyBase64,
      receiptsUrl
    });
    routerUrl = await listen(routerServer);
  });

  afterEach(async () => {
    await close(routerServer);
    await close(receiptsServer);
  });

  it("streams a completion and appends a verifiable receipt", async () => {
    const completeResponse = await signedPost(`${routerUrl}/v1/complete`, {
      prompt: "hello",
      session_id: "session-a"
    });
    const chunks = (await completeResponse.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, string>);
    const receiptChunk = chunks.find((chunk) => chunk.type === "receipt");

    expect(completeResponse.status).toBe(200);
    expect(chunks.map((chunk) => chunk.type)).toEqual(["delta", "receipt", "done"]);
    expect(receiptChunk?.receipt_id).toBeDefined();

    const logResponse = await fetch(`${receiptsUrl}/v1/receipts/${receiptChunk?.receipt_date}`);
    const log = (await logResponse.json()) as { receipts: Array<{ id: string }>; merkle_root: string };

    expect(log.receipts).toHaveLength(1);
    expect(log.receipts[0]?.id).toBe(receiptChunk?.receipt_id);
    expect(log.merkle_root).toHaveLength(64);

    const proofResponse = await fetch(
      `${receiptsUrl}/v1/receipts/${receiptChunk?.receipt_date}/proof/${receiptChunk?.receipt_id}`
    );

    expect(proofResponse.status).toBe(200);
  });

  it("refuses over-budget requests with HTTP 402", async () => {
    const response = await signedPost(`${routerUrl}/v1/route`, {
      prompt: "FORCE_EXPENSIVE_REQUEST"
    });
    const body = (await response.json()) as { error: string; cap: string; upgrade_url: string };

    expect(response.status).toBe(402);
    expect(body).toMatchObject({
      cap: "request",
      error: "budget_cap_exceeded",
      upgrade_url: "/partners"
    });
  });

  async function signedPost(url: string, body: unknown): Promise<Response> {
    const rawBody = JSON.stringify(body);
    const timestamp = Math.floor(Date.now() / 1000).toString();

    return fetch(url, {
      body: rawBody,
      headers: {
        "content-type": "application/json",
        "x-soupy-api-key": "test-api-key",
        "x-soupy-signature": signRequestBody(rawBody, timestamp, hmacKey),
        "x-soupy-timestamp": timestamp
      },
      method: "POST"
    });
  }
});

function generateSigningKey(): string {
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
}

async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();

  if (address === null || typeof address === "string") {
    throw new Error("Expected TCP server address.");
  }

  return `http://127.0.0.1:${address.port}`;
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
