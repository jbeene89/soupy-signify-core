# External Services Merge Guide

This folder contains the SACE external services for Soupy Together. It is intentionally nested under `external/` so the Lovable-managed marketing app at the repository root remains authoritative.

## Ownership

- Root `src/`, `supabase/`, Vite/TanStack/Lovable config: marketing app.
- `external/apps/router`: SACE router service.
- `external/apps/receipts`: prompt-free receipt log service.
- `external/apps/harness`: build-off harness and adapters.
- `external/packages`: shared contracts and classifier package.
- `external/public/build-off`: published build-off JSON consumed by Lovable.

Do not merge `external/package.json`, `external/tsconfig.json`, or `external/pnpm-workspace.yaml` into the repository root. They are for the external services workspace only.

## Lovable Integration

Lovable expects published build-off JSON at:

```text
${SACE_BUILDOFF_RESULTS_BASE_URL}/build-off/<id>.json
```

This folder currently publishes:

```text
external/public/build-off/001-todo-auth.json
external/public/build-off/manifest.json
```

If the marketing app needs to serve these directly from its own static output, copy or sync `external/public/build-off/` into the marketing app's public/static directory as a deploy step. Otherwise, host `external/public/` on R2/S3/static hosting and point `SACE_BUILDOFF_RESULTS_BASE_URL` at that origin.

## Local Commands

Run from `external/`:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm --filter harness run build-off 001-todo-auth
corepack pnpm publish:build-off 001-todo-auth
```

## Current Limitation

The Soupy build-off row proves the router/receipt evidence path. It still uses a local router completion stub, not a real generated app or vendor model run.

