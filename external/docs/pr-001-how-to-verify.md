# PR #1 How To Verify

Run:

```bash
corepack pnpm install
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm --filter harness run build-off 001-todo-auth
python C:\Users\jbeen\.codex\skills\soupy-together-external\scripts\check_soupy_repo.py .
```

Expected:

- Lint exits 0.
- Typecheck exits 0.
- Tests pass.
- Build emits TypeScript output under package `dist/` directories.
- Build-off writes a JSON file under `results/001-todo-auth/`.
- The scaffold validator prints `Soupy scaffold check: OK`.

Notes:

- Docker services are still pending the infra PR.
- Router and receipts now run locally without Docker.
- The harness build-off is mechanically working but still uses a deterministic Soupy smoke adapter rather than a real vendor run.
- The real GitHub org/repo is still needed before opening the remote PR.
