import { generateKeyPairSync } from "node:crypto";
import type { Server } from "node:http";
import type { Adapter, BuildBrief, RunArtifact } from "@soupy-together/shared-types";
import { createReceiptsServer } from "receipts";
import { createRouterServer, signRequestBody } from "router";
import { writeTextArtifact } from "../artifacts.js";

export const soupyAdapter: Adapter = {
  id: "soupy",
  mode: "automated",
  version: "0.2.0-router-backed",
  async run(brief: BuildBrief): Promise<RunArtifact> {
    const startedAt = new Date().toISOString();
    const runId = process.env.HARNESS_RUN_ID ?? "local";
    const runtime = await resolveRouterRuntime(runId);

    try {
      const completion = await callRouterComplete(runtime.routerUrl, runtime.hmacKey, {
        prompt: brief.prompt,
        session_id: `harness-${runId}`
      });
      const completionArtifact = await writeTextArtifact(
        runId,
        "soupy",
        "completion.ndjson",
        completion.raw
      );
      const proofArtifact =
        completion.receipt === undefined
          ? undefined
          : await writeReceiptProofArtifact(runId, runtime, completion.receipt);
      const producedRepo = await writeTextArtifact(
        runId,
        "soupy",
        "repo/README.md",
        renderRouterBackedReadme(brief, completion.text, completion.receipt)
      );
      const previewScreenshot = await writeTextArtifact(
        runId,
        "soupy",
        "preview.txt",
        `${completion.text}\n`
      );
      const completedAt = new Date().toISOString();

      return {
        completedAt,
        durationMs: Date.parse(completedAt) - Date.parse(startedAt),
        mode: "automated",
        previewScreenshot,
        producedRepo,
        rawMetadata: {
          bundleKb: 0,
          completionPath: completionArtifact.path,
          correctness: 40,
          costUsd: 0,
          fidelity: 35,
          honesty: 98,
          notes:
            "Soupy adapter called router /v1/complete, captured streamed output, and wrote receipt proof evidence. The router still returns a local completion stub rather than a generated app.",
          receiptDate: completion.receipt?.receipt_date,
          receiptId: completion.receipt?.receipt_id,
          receiptProofPath: proofArtifact?.path,
          refactor: 60,
          routerUrl: runtime.routerUrl,
          runtimeMode: runtime.mode
        },
        startedAt,
        status: "completed",
        tokenUsage: {
          inTokens: Math.ceil(brief.prompt.length / 4),
          outTokens: Math.ceil(completion.text.length / 4),
          totalTokens: Math.ceil((brief.prompt.length + completion.text.length) / 4)
        },
        toolId: "soupy"
      };
    } finally {
      await runtime.close();
    }
  }
};

interface RouterRuntime {
  close(): Promise<void>;
  hmacKey: string;
  mode: "external" | "ephemeral-local";
  receiptsUrl?: string;
  routerUrl: string;
}

interface CompletionReceipt {
  receipt_date: string;
  receipt_id: string;
}

interface CompletionResult {
  raw: string;
  receipt?: CompletionReceipt;
  text: string;
}

async function resolveRouterRuntime(runId: string): Promise<RouterRuntime> {
  const externalRouterUrl = process.env.SOUPY_ROUTER_URL ?? process.env.ROUTER_PUBLIC_BASE_URL;
  const externalHmacKey = process.env.ROUTER_HMAC_KEY;

  if (externalRouterUrl !== undefined && externalHmacKey !== undefined) {
    const runtime: RouterRuntime = {
      async close() {
        return;
      },
      hmacKey: externalHmacKey,
      mode: "external",
      routerUrl: externalRouterUrl
    };

    if (process.env.RECEIPTS_PUBLIC_BASE_URL !== undefined) {
      runtime.receiptsUrl = process.env.RECEIPTS_PUBLIC_BASE_URL;
    }

    return runtime;
  }

  const signingKeyBase64 = generateSigningKey();
  const hmacKey = "local-harness-router-key";
  const receiptsServer = createReceiptsServer({
    dataDir: `data/harness-receipts/${runId}`,
    signingKeyBase64
  });
  const receiptsUrl = await listen(receiptsServer);
  const routerServer = createRouterServer({
    hmacKey,
    receiptsSigningKeyBase64: signingKeyBase64,
    receiptsUrl
  });
  const routerUrl = await listen(routerServer);

  return {
    async close() {
      await close(routerServer);
      await close(receiptsServer);
    },
    hmacKey,
    mode: "ephemeral-local",
    receiptsUrl,
    routerUrl
  };
}

async function callRouterComplete(
  routerUrl: string,
  hmacKey: string,
  body: { prompt: string; session_id: string }
): Promise<CompletionResult> {
  const rawBody = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const response = await fetch(`${routerUrl}/v1/complete`, {
    body: rawBody,
    headers: {
      "content-type": "application/json",
      "x-soupy-api-key": "harness",
      "x-soupy-signature": signRequestBody(rawBody, timestamp, hmacKey),
      "x-soupy-timestamp": timestamp
    },
    method: "POST"
  });
  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`Router /v1/complete failed with HTTP ${response.status}: ${raw}`);
  }

  const chunks = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, string>);
  const text = chunks
    .filter((chunk) => chunk.type === "delta")
    .map((chunk) => chunk.text)
    .join("");
  const receiptChunk = chunks.find((chunk) => chunk.type === "receipt");

  const result: CompletionResult = { raw, text };

  if (receiptChunk?.receipt_date !== undefined && receiptChunk.receipt_id !== undefined) {
    result.receipt = {
      receipt_date: receiptChunk.receipt_date,
      receipt_id: receiptChunk.receipt_id
    };
  }

  return result;
}

async function writeReceiptProofArtifact(
  runId: string,
  runtime: RouterRuntime,
  receipt: CompletionReceipt
) {
  if (runtime.receiptsUrl === undefined) {
    return writeTextArtifact(
      runId,
      "soupy",
      "receipt-proof.json",
      JSON.stringify(
        {
          note: "No receipts URL was available for proof lookup.",
          receipt
        },
        null,
        2
      )
    );
  }

  const proofUrl = `${runtime.receiptsUrl}/v1/receipts/${receipt.receipt_date}/proof/${receipt.receipt_id}`;
  const response = await fetch(proofUrl);
  const proof = await response.text();

  return writeTextArtifact(
    runId,
    "soupy",
    "receipt-proof.json",
    JSON.stringify(
      {
        note:
          runtime.mode === "ephemeral-local"
            ? "Proof was fetched during the run from an ephemeral local receipts service. The proof data below is the durable artifact."
            : "Proof was fetched from the configured receipts service.",
        proof: JSON.parse(proof) as unknown,
        proofUrl,
        routerUrl: runtime.routerUrl
      },
      null,
      2
    )
  );
}

function renderRouterBackedReadme(
  brief: BuildBrief,
  completionText: string,
  receipt?: CompletionReceipt
): string {
  return [
    `# ${brief.title}`,
    "",
    "This artifact was generated by the Soupy Together harness through the router API.",
    "",
    `Brief ID: ${brief.id}`,
    `Prompt SHA-256: ${brief.promptSha256}`,
    "",
    "## Router Completion",
    "",
    completionText,
    "",
    "## Receipt",
    "",
    receipt === undefined
      ? "No receipt chunk was returned."
      : `Receipt ${receipt.receipt_id} for ${receipt.receipt_date}.`,
    ""
  ].join("\n");
}

function generateSigningKey(): string {
  const { privateKey } = generateKeyPairSync("ed25519");
  return privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
}

function listen(server: Server): Promise<string> {
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (address === null || typeof address === "string") {
        reject(new Error("Expected TCP server address."));
        return;
      }

      resolve(`http://127.0.0.1:${address.port}`);
    });
  });
}

function close(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error !== undefined) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
