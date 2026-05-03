# Lovable Integration Contract

This repo does not modify the Lovable marketing site. It defines the public contracts that `soupytogether.com` can consume once the external services are deployed.

## Boundaries

- Lovable owns UI pages, Lovable Cloud user/session data, and marketing copy.
- This repo owns router, receipts, benchmark harness, published build-off JSON, artifacts, and deployment.
- The Lovable app must never connect directly to this repo's Postgres database.
- Browser code must never contain `ROUTER_HMAC_KEY`, vendor API keys, or receipt signing keys.

## Marketing Pages

### `/demo`

Current state: in-browser heuristic classifier.

Target state:

1. The browser posts `{ prompt }` to a Lovable server action or edge function.
2. That server-side function signs the exact JSON request with `ROUTER_HMAC_KEY`.
3. It forwards to `POST <ROUTER_PUBLIC_BASE_URL>/v1/route` for estimates or `POST <ROUTER_PUBLIC_BASE_URL>/v1/complete` for streamed completion.
4. The UI displays `estimate: true` values as estimates.
5. If router returns HTTP 402, the UI shows the cap that fired and links to `/partners`.

Do not call the router directly from the browser unless PR #3 explicitly adds a browser-safe unauthenticated route.

### `/build-off`

Current state: sample comparison table.

Target state:

1. Keep sample data clearly labeled until real run JSON exists.
2. Fetch published result JSON from `BUILD_OFF_RESULTS_PUBLIC_BASE_URL` or a static import updated by PRs.
3. Render each `ToolRun` from `packages/shared-types`.
4. Link every public result to its brief SHA-256, run ID, artifact root, and receipt/log evidence when available.
5. Keep manual adapters visually distinct with `mode: "manual"`.

### `/partners`

Target state:

- Use it as the upgrade destination for router 402 responses.
- Do not imply partners can buy build-off rank.
- Explain that ranking changes only when measured rubric scores change.

## Router API

### `POST /v1/route`

Request:

```json
{ "prompt": "Build a todo app with email auth" }
```

Response shape:

```json
{
  "tier": 2,
  "partners": ["claude-sonnet"],
  "est_cost_cents": 12,
  "baseline_gpt5_cents": 31,
  "router_version": "0.1.0",
  "estimate": true
}
```

### `POST /v1/complete`

Request:

```json
{ "prompt": "hello", "session_id": "optional-session-id" }
```

Streams newline-delimited JSON chunks:

```json
{ "type": "delta", "text": "Hello" }
{ "type": "receipt", "receipt_id": "uuid", "receipt_date": "2026-05-02" }
{ "type": "done" }
```

HTTP 402 response:

```json
{
  "error": "budget_cap_exceeded",
  "cap": "request",
  "max_cents": 25,
  "estimated_cents": 31,
  "upgrade_url": "/partners"
}
```

## Auth Headers

Lovable server-side code should send:

```text
x-soupy-api-key: <site-or-user-api-key>
x-soupy-timestamp: <unix-seconds>
x-soupy-signature: <base64-hmac-sha256>
```

Canonical signing string:

```text
<x-soupy-timestamp>.<raw-json-request-body>
```

Signature:

```text
base64(hmac_sha256(SACE_ROUTER_HMAC_KEY, canonical signing string))
```

## Public Receipts

Receipts are public and prompt-free:

- `GET <RECEIPTS_PUBLIC_BASE_URL>/v1/receipts/YYYY-MM-DD`
- `GET <RECEIPTS_PUBLIC_BASE_URL>/v1/receipts/YYYY-MM-DD/proof/<receipt-id>`

The UI may link to the day's log or proof, but should never try to display prompt content because no prompt content exists in the receipt log.

## Required Lovable Environment

```text
SACE_ROUTER_BASE_URL=
SACE_RECEIPTS_BASE_URL=
SACE_BUILD_OFF_RESULTS_BASE_URL=
SACE_ROUTER_HMAC_KEY=
```

`SACE_ROUTER_HMAC_KEY` must be server-only.

## Issue To Open In Marketing Repo

Title: Wire Soupy Together demo and build-off pages to external SACE services

Body:

```markdown
The external SACE repo defines the router, receipts, and build-off result contracts.

Needed in the Lovable marketing repo:

- Add a server-side route/action that HMAC-signs requests to the external router.
- Update `/demo` to call the server-side route/action instead of only the in-browser heuristic when env vars are present.
- Preserve the heuristic as a fallback and label fallback outputs clearly.
- Update `/build-off` to optionally fetch public result JSON and keep sample data labeled when no real result exists.
- Link receipt logs/proofs when completion receipts are available.
- Handle router HTTP 402 by showing the cap and linking to `/partners`.
- Keep all secrets server-only.

External contract reference: docs/lovable-integration.md in the external repo.
```
