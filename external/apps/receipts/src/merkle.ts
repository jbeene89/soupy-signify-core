import { sha256Hex, canonicalJson, type Receipt } from "@soupy-together/shared-types";

export interface MerkleProofStep {
  position: "left" | "right";
  hash: string;
}

export function receiptLeaf(receipt: Receipt): string {
  return sha256Hex(canonicalJson(receipt));
}

export function merkleRoot(receipts: Receipt[]): string {
  const leaves = receipts.map(receiptLeaf);

  if (leaves.length === 0) {
    return sha256Hex("");
  }

  return buildLevels(leaves).at(-1)?.[0] ?? sha256Hex("");
}

export function merkleProof(receipts: Receipt[], id: string): MerkleProofStep[] | undefined {
  let index = receipts.findIndex((receipt) => receipt.id === id);

  if (index === -1) {
    return undefined;
  }

  const proof: MerkleProofStep[] = [];
  const levels = buildLevels(receipts.map(receiptLeaf));

  for (const level of levels.slice(0, -1)) {
    const isRight = index % 2 === 1;
    const siblingIndex = isRight ? index - 1 : index + 1;
    const sibling = level[siblingIndex] ?? level[index];

    if (sibling !== undefined) {
      proof.push({
        hash: sibling,
        position: isRight ? "left" : "right"
      });
    }

    index = Math.floor(index / 2);
  }

  return proof;
}

function buildLevels(leaves: string[]): string[][] {
  const levels = [leaves];
  let current = leaves;

  while (current.length > 1) {
    const next: string[] = [];

    for (let index = 0; index < current.length; index += 2) {
      const left = current[index];
      const right = current[index + 1] ?? left;

      if (left !== undefined && right !== undefined) {
        next.push(sha256Hex(`${left}${right}`));
      }
    }

    current = next;
    levels.push(current);
  }

  return levels;
}

