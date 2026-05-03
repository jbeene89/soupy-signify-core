import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

console.log(
  JSON.stringify(
    {
      RECEIPTS_PUBLIC_KEY_BASE64: publicKey
        .export({ format: "der", type: "spki" })
        .toString("base64"),
      RECEIPTS_SIGNING_KEY: privateKey
        .export({ format: "der", type: "pkcs8" })
        .toString("base64")
    },
    null,
    2
  )
);

