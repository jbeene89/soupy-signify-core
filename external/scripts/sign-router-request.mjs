import { createHmac } from "node:crypto";

const [, , hmacKey, rawBody] = process.argv;

if (!hmacKey || !rawBody) {
  console.error('Usage: node scripts/sign-router-request.mjs "<hmac-key>" \'{"prompt":"hello"}\'');
  process.exit(1);
}

const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = createHmac("sha256", hmacKey)
  .update(`${timestamp}.${rawBody}`)
  .digest("base64");

console.log(
  JSON.stringify(
    {
      body: rawBody,
      headers: {
        "content-type": "application/json",
        "x-soupy-api-key": "local-dev",
        "x-soupy-signature": signature,
        "x-soupy-timestamp": timestamp
      }
    },
    null,
    2
  )
);

