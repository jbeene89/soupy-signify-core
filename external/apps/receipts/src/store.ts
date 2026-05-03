import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { verifyReceipt, type Receipt } from "@soupy-together/shared-types";
import { merkleProof, merkleRoot, type MerkleProofStep } from "./merkle.js";

export interface ReceiptStoreConfig {
  dataDir: string;
  signingKeyBase64: string;
}

export interface ReceiptLogResponse {
  date: string;
  merkle_root: string;
  receipts: Receipt[];
}

export interface ReceiptProofResponse {
  date: string;
  id: string;
  merkle_root: string;
  proof: MerkleProofStep[];
}

export async function appendReceipt(
  config: ReceiptStoreConfig,
  receipt: Receipt
): Promise<ReceiptLogResponse> {
  if (!verifyReceipt(receipt, config.signingKeyBase64)) {
    throw new ReceiptStoreError(400, "invalid_signature", "Receipt signature verification failed.");
  }

  const date = receipt.ts.slice(0, 10);
  const receipts = await readReceipts(config, date);

  if (receipts.some((existing) => existing.id === receipt.id)) {
    throw new ReceiptStoreError(409, "duplicate_receipt", "Receipt id already exists.");
  }

  const nextReceipts = [...receipts, receipt];
  await writeReceipts(config, date, nextReceipts);

  return toLogResponse(date, nextReceipts);
}

export async function getReceiptLog(
  config: Pick<ReceiptStoreConfig, "dataDir">,
  date: string
): Promise<ReceiptLogResponse> {
  return toLogResponse(date, await readReceipts(config, date));
}

export async function getReceiptProof(
  config: Pick<ReceiptStoreConfig, "dataDir">,
  date: string,
  id: string
): Promise<ReceiptProofResponse> {
  const receipts = await readReceipts(config, date);
  const proof = merkleProof(receipts, id);

  if (proof === undefined) {
    throw new ReceiptStoreError(404, "receipt_not_found", "Receipt id was not found.");
  }

  return {
    date,
    id,
    merkle_root: merkleRoot(receipts),
    proof
  };
}

export class ReceiptStoreError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

async function readReceipts(
  config: Pick<ReceiptStoreConfig, "dataDir">,
  date: string
): Promise<Receipt[]> {
  try {
    const raw = await readFile(logPath(config, date), "utf8");
    const parsed = JSON.parse(raw) as { receipts?: Receipt[] };
    return parsed.receipts ?? [];
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeReceipts(
  config: Pick<ReceiptStoreConfig, "dataDir">,
  date: string,
  receipts: Receipt[]
): Promise<void> {
  const path = logPath(config, date);
  await mkdir(resolve(config.dataDir), { recursive: true });
  await writeFile(path, `${JSON.stringify({ date, receipts }, null, 2)}\n`, "utf8");
}

function toLogResponse(date: string, receipts: Receipt[]): ReceiptLogResponse {
  return {
    date,
    merkle_root: merkleRoot(receipts),
    receipts
  };
}

function logPath(config: Pick<ReceiptStoreConfig, "dataDir">, date: string): string {
  return join(resolve(config.dataDir), `${date}.json`);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

