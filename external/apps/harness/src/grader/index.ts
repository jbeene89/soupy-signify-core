import type { RunArtifact, ToolRun } from "@soupy-together/shared-types";

export function gradeArtifact(artifact: RunArtifact): ToolRun {
  const base: ToolRun = {
    bundleKb: null,
    correctness: null,
    costUsd: null,
    fidelity: null,
    honesty: null,
    mode: artifact.mode,
    notes: noteForArtifact(artifact),
    refactor: null,
    status: artifact.status,
    timeSec: artifact.durationMs === undefined ? null : round(artifact.durationMs / 1000, 3),
    tool: artifact.toolId
  };

  if (artifact.producedRepo !== undefined) {
    base.artifactPath = artifact.producedRepo.path;
  }

  if (artifact.previewScreenshot !== undefined) {
    base.screenshotPath = artifact.previewScreenshot.path;
  }

  if (typeof artifact.rawMetadata.receiptDate === "string") {
    base.receiptDate = artifact.rawMetadata.receiptDate;
  }

  if (typeof artifact.rawMetadata.receiptId === "string") {
    base.receiptId = artifact.rawMetadata.receiptId;
  }

  if (typeof artifact.rawMetadata.receiptProofPath === "string") {
    base.receiptProofPath = artifact.rawMetadata.receiptProofPath;
  }

  if (artifact.status !== "completed") {
    return base;
  }

  const metadata = artifact.rawMetadata;

  return {
    ...base,
    bundleKb: numberOrNull(metadata.bundleKb),
    costUsd: numberOrNull(metadata.costUsd),
    correctness: numberOrNull(metadata.correctness),
    fidelity: numberOrNull(metadata.fidelity),
    honesty: numberOrNull(metadata.honesty),
    refactor: numberOrNull(metadata.refactor)
  };
}

function noteForArtifact(artifact: RunArtifact): string {
  if (artifact.status === "manual") {
    return "Manual run required; no automated score was published.";
  }

  if (artifact.status === "unavailable") {
    return String(artifact.rawMetadata.reason ?? "Adapter dependency unavailable.");
  }

  if (artifact.status === "failed") {
    return String(artifact.rawMetadata.error ?? "Adapter failed.");
  }

  return String(artifact.rawMetadata.notes ?? "Completed by harness adapter.");
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
