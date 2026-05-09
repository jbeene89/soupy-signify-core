import { createHash, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

export type PartnerId =
  | "local-tier-0"
  | "local-sace"
  | "claude-haiku"
  | "claude-sonnet"
  | "gemini-flash"
  | "gemini-pro"
  | "gpt-5-mini"
  | "gpt-5"
  | "gpt5-mini"
  | "gpt5"
  | "frontier-cortex";

export type ToolId =
  | "soupy"
  | "lovable"
  | "bolt"
  | "v0"
  | "cursor"
  | "replit"
  | "claude-code";

export type AdapterMode = "automated" | "manual";

export type RunStatus = "completed" | "manual" | "unavailable" | "failed";

export interface BuildBrief {
  id: string;
  title: string;
  prompt: string;
  promptSha256: string;
  sourcePath?: string;
}

export interface TokenUsage {
  inTokens?: number;
  outTokens?: number;
  totalTokens?: number;
}

export interface ArtifactLocation {
  path: string;
  sha256?: string;
}

export interface RunArtifact {
  toolId: ToolId;
  mode: AdapterMode;
  status: RunStatus;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  tokenUsage?: TokenUsage;
  producedRepo?: ArtifactLocation;
  previewScreenshot?: ArtifactLocation;
  rawMetadata: Record<string, unknown>;
}

export interface Adapter {
  id: ToolId;
  mode: AdapterMode;
  version: string;
  run(brief: BuildBrief): Promise<RunArtifact>;
}

export interface ToolRun {
  tool: ToolId;
  mode: AdapterMode;
  status: RunStatus;
  costUsd: number | null;
  timeSec: number | null;
  fidelity: number | null;
  correctness: number | null;
  refactor: number | null;
  honesty: number | null;
  bundleKb: number | null;
  artifactPath?: string;
  screenshotPath?: string;
  receiptDate?: string;
  receiptId?: string;
  receiptProofPath?: string;
  notes?: string;
}

export interface BuildOffResult {
  buildOffId: string;
  runId: string;
  promptSha256: string;
  harnessGitSha: string;
  adapterVersions: Record<ToolId, string>;
  modelVersions: Record<string, string>;
  startedAt: string;
  completedAt?: string;
  runs: ToolRun[];
}

export interface Receipt {
  id: string;
  ts: string;
  prompt_sha256: string;
  tier: 0 | 1 | 2 | 3;
  partners: PartnerId[];
  out_tokens: number;
  soupy_cents: number;
  baseline_gpt5_cents: number;
  saved_cents: number;
  router_version: string;
  sig: string;
}

export type UnsignedReceipt = Omit<Receipt, "sig">;

export interface RouteRequest {
  prompt: string;
}

export interface CompleteRequest {
  prompt: string;
  session_id?: string;
}

export interface RouteDecision {
  tier: 0 | 1 | 2 | 3;
  partners: PartnerId[];
  est_cost_cents: number;
  baseline_gpt5_cents: number;
  router_version: string;
  estimate: true;
}

export interface HmacRequestHeaders {
  "x-soupy-api-key": string;
  "x-soupy-timestamp": string;
  "x-soupy-signature": string;
}

export type CompleteStreamChunk =
  | {
      type: "delta";
      text: string;
    }
  | {
      type: "receipt";
      receipt_id: string;
      receipt_date: string;
    }
  | {
      type: "error";
      error: string;
      message: string;
    }
  | {
      type: "done";
    };

export interface BudgetCapExceeded {
  error: "budget_cap_exceeded";
  cap: "request" | "session";
  max_cents: number;
  estimated_cents: number;
  upgrade_url: "/partners";
}

export interface ReceiptLog {
  date: string;
  merkle_root: string;
  receipts: Receipt[];
}

export interface ReceiptProof {
  id: string;
  date: string;
  merkle_root: string;
  proof: Array<{
    position: "left" | "right";
    hash: string;
  }>;
}

export interface MarketingRuntimeConfig {
  routerBaseUrl: string;
  receiptsBaseUrl: string;
  buildOffResultsBaseUrl: string;
}

export interface HealthResponse {
  service: "harness" | "receipts" | "router";
  ok: true;
  version: string;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortForCanonicalJson(value));
}

export function receiptSigningPayload(receipt: UnsignedReceipt): string {
  return canonicalJson(receipt);
}

export function signReceipt(receipt: UnsignedReceipt, privateKeyBase64: string): Receipt {
  const privateKey = createPrivateKey({
    format: "der",
    key: Buffer.from(privateKeyBase64, "base64"),
    type: "pkcs8"
  });
  const sig = sign(null, Buffer.from(receiptSigningPayload(receipt)), privateKey).toString("base64");

  return {
    ...receipt,
    sig
  };
}

export function verifyReceipt(receipt: Receipt, privateKeyBase64: string): boolean {
  const privateKey = createPrivateKey({
    format: "der",
    key: Buffer.from(privateKeyBase64, "base64"),
    type: "pkcs8"
  });
  const publicKey = createPublicKey(privateKey);
  const { sig, ...unsignedReceipt } = receipt;

  return verify(
    null,
    Buffer.from(receiptSigningPayload(unsignedReceipt)),
    publicKey,
    Buffer.from(sig, "base64")
  );
}

function sortForCanonicalJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForCanonicalJson);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, sortForCanonicalJson(entryValue)])
    );
  }

  return value;
}
