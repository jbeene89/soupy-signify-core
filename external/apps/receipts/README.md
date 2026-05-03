# Receipts App

The receipts app exposes a prompt-free append-only receipt log with Merkle roots and inclusion proofs. This local implementation is file-backed; the later infra/database PR can swap persistence behind the same HTTP contract.

Marketing integration details live in `../../docs/lovable-integration.md`.

Endpoints:

- `POST /v1/receipts`
- `GET /v1/receipts/:date`
- `GET /v1/receipts/:date/proof/:id`

Receipts must never contain prompt text or PII.

## Local Run

Generate a development ed25519 key:

```bash
node scripts/generate-dev-signing-key.mjs
```

Set `RECEIPTS_SIGNING_KEY`, then run:

```bash
corepack pnpm --filter receipts run dev
```
