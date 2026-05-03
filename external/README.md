# Soupy Together External Services

This repository contains external services for Soupy Together, product codename SACE. The marketing site and in-browser demo are maintained separately in Lovable. This repository does not own the public UI, Lovable Cloud data, user accounts, or billing.

The purpose of this codebase is to provide infrastructure that cannot run inside the Lovable sandbox:

- a reproducible build-off harness,
- a prompt-free public receipts log,
- a router API stub for route and completion calls,
- shared contracts used by the services and marketing integration,
- deployment and operations scaffolding.

The current implementation is local-first. It is suitable for development, contract testing, and early integration work. It is not yet a production deployment.

## Repository Layout

```text
apps/
  harness/              Build-off runner and tool adapters
  receipts/             Receipt log HTTP service
  router/               Router and completion HTTP service
packages/
  classifier/           Deterministic routing classifier placeholder
  shared-types/         Shared TypeScript contracts and crypto helpers
briefs/                 Build-off prompt briefs
results/                Build-off result JSON
public/build-off/       Latest published build-off JSON for static hosting
artifacts/              Generated local run artifacts, gitignored
docs/                   Integration and verification notes
infra/
  docker/               Docker placeholders
  terraform/            Terraform placeholders
scripts/                Local development helpers
```

There are unrelated local files in this workspace that predate this project. They are not part of the Soupy external services unless they are under the paths above.

## Current Status

Implemented:

- TypeScript monorepo with pnpm workspaces.
- Shared types for receipts, router responses, budget errors, completion streams, and build-off results.
- File-backed receipts service with ed25519 receipt verification, daily logs, Merkle roots, and inclusion proofs.
- Router service with HMAC request authentication, per-key rate limiting, request/session budget guards, streamed NDJSON completion, receipt signing, and receipt emission.
- Build-off runner for `001-todo-auth` with brief loading, prompt hashing, adapter execution, artifact writing, result JSON output, and explicit statuses.
- Router-backed Soupy adapter that can use either configured external services or ephemeral local router/receipts services.
- Manual statuses for browser-hosted tools that are not automated yet.
- Claude Code availability detection.
- Integration tests for router-to-receipts flow.

Not implemented yet:

- Postgres-backed receipts persistence.
- S3/R2 publication of Merkle roots and artifacts.
- Production Docker Compose and Terraform deployment.
- Real vendor adapters for Lovable, Bolt, v0, Replit, Cursor, and Claude Code.
- Router calls to live Anthropic, Google, OpenAI, or internal Frontier Cortex models.
- The final port of the Lovable classifier source.

## Requirements

- Node 20 or newer.
- Corepack with pnpm support.

This workspace currently runs on Node 24 through Corepack. Commands below use `corepack pnpm` so a global pnpm install is not required.

## Install And Verify

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Run the current build-off:

```bash
corepack pnpm --filter harness run build-off 001-todo-auth
corepack pnpm publish:build-off 001-todo-auth
```

The command writes:

```text
results/001-todo-auth/<run-id>.json
public/build-off/001-todo-auth.json
artifacts/<run-id>/soupy/
```

Current build-off output should be interpreted as an integration run, not a vendor benchmark. The Soupy row calls the router API and records receipt evidence, but the router still returns a local completion stub rather than a generated app. Manual and unavailable tools are intentionally not scored.

## Environment

Copy `.env.example` to `.env` for local services and fill only the values needed for the service being run.

Required for router auth:

```text
ROUTER_HMAC_KEY
```

Required for receipt signing and verification:

```text
RECEIPTS_SIGNING_KEY
```

Generate a local development ed25519 signing key:

```bash
node scripts/generate-dev-signing-key.mjs
```

The script prints a private signing key and public verification key. Use the private key only for local development unless the operator explicitly approves key generation for production.

## Run Local Services

Terminal 1:

```bash
$env:RECEIPTS_SIGNING_KEY="<base64-pkcs8-private-key>"
corepack pnpm --filter receipts run dev
```

Terminal 2:

```bash
$env:ROUTER_HMAC_KEY="local-router-secret"
$env:RECEIPTS_SIGNING_KEY="<same-base64-pkcs8-private-key>"
$env:RECEIPTS_PUBLIC_BASE_URL="http://localhost:8081"
corepack pnpm --filter router run dev
```

Health checks:

```bash
curl http://localhost:8081/health
curl http://localhost:8080/health
```

## Router API

The router accepts only HMAC-signed POST requests.

Canonical signing string:

```text
<x-soupy-timestamp>.<raw-json-request-body>
```

Signature:

```text
base64(hmac_sha256(ROUTER_HMAC_KEY, canonical signing string))
```

Required headers:

```text
x-soupy-api-key
x-soupy-timestamp
x-soupy-signature
```

Create headers for a local request:

```bash
node scripts/sign-router-request.mjs "local-router-secret" '{"prompt":"hello"}'
```

Route estimate:

```bash
curl -X POST http://localhost:8080/v1/route \
  -H "content-type: application/json" \
  -H "x-soupy-api-key: local-dev" \
  -H "x-soupy-timestamp: <timestamp>" \
  -H "x-soupy-signature: <signature>" \
  -d '{"prompt":"hello"}'
```

Completion:

```bash
curl -N -X POST http://localhost:8080/v1/complete \
  -H "content-type: application/json" \
  -H "x-soupy-api-key: local-dev" \
  -H "x-soupy-timestamp: <timestamp>" \
  -H "x-soupy-signature: <signature>" \
  -d '{"prompt":"hello","session_id":"demo"}'
```

`/v1/complete` streams newline-delimited JSON:

```json
{"type":"delta","text":"..."}
{"type":"receipt","receipt_id":"uuid","receipt_date":"YYYY-MM-DD"}
{"type":"done"}
```

Budget refusal returns HTTP 402:

```json
{
  "error": "budget_cap_exceeded",
  "cap": "request",
  "max_cents": 25,
  "estimated_cents": 26,
  "upgrade_url": "/partners"
}
```

The router does not silently downgrade or substitute partners when a budget cap fires.

## Receipts API

The receipts service stores prompt-free receipts. It does not store prompt text.

Append receipt:

```text
POST /v1/receipts
```

Read a daily log:

```text
GET /v1/receipts/YYYY-MM-DD
```

Read an inclusion proof:

```text
GET /v1/receipts/YYYY-MM-DD/proof/<receipt-id>
```

Receipt fields:

```json
{
  "id": "uuid",
  "ts": "ISO-8601",
  "prompt_sha256": "hex",
  "tier": 0,
  "partners": ["local-tier-0"],
  "out_tokens": 0,
  "soupy_cents": 0,
  "baseline_gpt5_cents": 0,
  "saved_cents": 0,
  "router_version": "semver",
  "sig": "base64"
}
```

The local implementation stores logs under `data/receipts`. That directory is runtime data and should not be committed.

## Build-Off Harness

Briefs live in `briefs/*.md`.

Run:

```bash
corepack pnpm --filter harness run build-off 001-todo-auth
```

Each run records:

- build-off ID,
- run ID,
- prompt SHA-256,
- harness git SHA when available,
- adapter versions,
- model versions when available,
- per-tool run status,
- measured or null scoring fields,
- artifact and screenshot paths when available.

Tool statuses:

- `completed`: adapter ran and produced measurable output or integration evidence.
- `manual`: adapter requires a human-run procedure.
- `unavailable`: dependency or CLI is missing.
- `failed`: adapter attempted execution and failed.

The harness must not invent missing values. Missing cost, score, timing, or bundle values are `null`.

## Lovable Marketing Integration

Lovable should consume this repository through public or server-side integration surfaces only.

- `/demo` should call a Lovable server-side route/action that signs router requests. The browser must not receive `ROUTER_HMAC_KEY`.
- `/build-off` should read published build-off JSON once real runs exist. Until then, sample data must remain labeled.
- Receipt links should point to the public receipts service by date and receipt ID.
- HTTP 402 from the router should display the cap that fired and link to `/partners`.

The detailed handoff is in `docs/lovable-integration.md`.

The stable local/public build-off URL convention is:

```text
<base>/build-off/<build-off-id>.json
```

For `001-todo-auth`, the publish command writes:

```text
public/build-off/001-todo-auth.json
```

## Security Model

- No prompt text in receipts.
- No PII in receipts.
- No secrets in repository files.
- HMAC protects router requests.
- Ed25519 signatures protect receipt authenticity.
- Budget caps reject expensive requests explicitly.
- Partner ranking must not depend on commercial relationships.

`SECURITY.md` tracks public-key publication status and reporting guidance.

## Development Notes

This repository currently includes local development implementations intended to stabilize contracts before production infrastructure is added. Future work should preserve the external HTTP contracts unless there is a documented migration.

Recommended next steps:

1. Replace file-backed receipts with Postgres while keeping the same endpoints.
2. Publish daily Merkle roots and artifacts to S3/R2.
3. Replace the Soupy smoke adapter with a router-backed adapter.
4. Add the Claude Code adapter with sandboxed CLI execution.
5. Add manual runbook output ingestion for Lovable, Bolt, v0, Replit, and Cursor.
6. Add Docker Compose and Terraform deployment.
