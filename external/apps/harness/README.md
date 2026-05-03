# Harness App

PR #1 registers empty v1 adapters and the shared adapter interface. Later PRs will add reproducible build-off execution, artifact capture, screenshots, grading, and result publishing.

Marketing integration details live in `../../docs/lovable-integration.md`.

The Lovable `/build-off` page should treat checked-in or published result JSON as the source of truth once real runs exist. Manual adapters must remain marked as `mode: "manual"`.

## Run A Build-Off

```bash
corepack pnpm build
corepack pnpm --filter harness run build-off 001-todo-auth
```

The command writes `results/001-todo-auth/<run-id>.json`. The Soupy adapter calls the router `/v1/complete` endpoint and records receipt evidence. PR #4 still needs to replace the router completion stub with real generated application output.
