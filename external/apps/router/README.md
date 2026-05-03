# Router App

The router exposes the hosted API consumed by the Lovable `/demo` page.

Marketing integration details live in `../../docs/lovable-integration.md`.

Endpoints:

- `POST /v1/route`
- `POST /v1/complete`

Both require server-side HMAC signing. Do not call them from browser code with `ROUTER_HMAC_KEY`.

## HMAC

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

## Local Run

Generate a development ed25519 key:

```bash
node scripts/generate-dev-signing-key.mjs
```

Set `ROUTER_HMAC_KEY`, `RECEIPTS_SIGNING_KEY`, and `RECEIPTS_PUBLIC_BASE_URL`, then run:

```bash
corepack pnpm --filter receipts run dev
corepack pnpm --filter router run dev
```
