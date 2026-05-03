# Security

Soupy Together receipts must never include PII or prompt content. Receipts store only prompt SHA-256 values, routing metadata, token counts, costs, and signatures.

## Secrets

Do not commit credentials, API keys, signing keys, `.env` files, database URLs, S3 secrets, or vendor tokens. Use `.env.example` for required variable names only.

## Receipt Signing

The receipts service will verify canonical JSON receipts signed with ed25519. The production public verification key is not committed yet because the signing key source is still unresolved. Once the operator confirms whether Codex should generate the keypair or receive one, commit only the public key here.

```text
RECEIPTS_ED25519_PUBLIC_KEY_BASE64=TO_BE_PROVIDED
```

## Reporting

Until the real GitHub repo and contact are confirmed, report security issues to the project operator directly. The placeholder operational contact from the product brief is `ops@soupytogether.com`.

