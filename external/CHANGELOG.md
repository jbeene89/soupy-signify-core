# Changelog

## Unreleased

- Scaffold the Soupy Together external monorepo for PR #1.
- Add shared TypeScript contracts, placeholder app modules, empty harness adapters, CI, and baseline documentation.
- Add a working build-off runner for `001-todo-auth` with brief loading, adapter execution, artifact capture, grading, result JSON output, and manual/unavailable statuses.
- Add local HTTP router and receipts services with HMAC auth, budget refusal, streamed completion stub, ed25519 receipt signing, file-backed receipt log, Merkle root, and inclusion proof.
- Replace the Soupy build-off smoke adapter with a router-backed adapter that records streamed completion and receipt proof artifacts.
- Add a local build-off publisher for Lovable's stable `/build-off/<id>.json` convention.
