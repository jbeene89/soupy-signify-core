import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingHttpHeaders } from "node:http";

export interface HmacAuthResult {
  apiKey: string;
}

export class HmacAuthError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function signRequestBody(body: string, timestamp: string, hmacKey: string): string {
  return createHmac("sha256", hmacKey).update(`${timestamp}.${body}`).digest("base64");
}

export function verifyHmacHeaders(
  headers: IncomingHttpHeaders,
  body: string,
  hmacKey: string,
  nowMs = Date.now()
): HmacAuthResult {
  if (hmacKey.length === 0) {
    throw new HmacAuthError(500, "missing_router_hmac_key", "ROUTER_HMAC_KEY is required.");
  }

  const apiKey = headerValue(headers["x-soupy-api-key"]);
  const timestamp = headerValue(headers["x-soupy-timestamp"]);
  const signature = headerValue(headers["x-soupy-signature"]);

  if (apiKey === undefined || timestamp === undefined || signature === undefined) {
    throw new HmacAuthError(401, "missing_hmac_headers", "Missing Soupy HMAC headers.");
  }

  const timestampMs = Number(timestamp) * 1000;

  if (!Number.isFinite(timestampMs) || Math.abs(nowMs - timestampMs) > 5 * 60 * 1000) {
    throw new HmacAuthError(401, "stale_hmac_timestamp", "HMAC timestamp is outside tolerance.");
  }

  const expected = Buffer.from(signRequestBody(body, timestamp, hmacKey));
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new HmacAuthError(401, "invalid_hmac_signature", "Invalid HMAC signature.");
  }

  return { apiKey };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

