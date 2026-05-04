/**
 * Server-only S3 helpers (signed read/write URLs through the connector gateway).
 */

const S3_GATEWAY_URL = "https://connector-gateway.lovable.dev";

function authHeaders() {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const s3Key = process.env.AWS_S3_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");
  if (!s3Key) throw new Error("AWS_S3_API_KEY not configured (link AWS S3 connector)");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": s3Key,
    "Content-Type": "application/json",
  };
}

export async function getSignedReadUrl(objectKey: string): Promise<string> {
  const res = await fetch(
    `${S3_GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=read`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ object_path: objectKey }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sign read HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { url: string };
  return json.url;
}

export async function getSignedWriteUrl(objectKey: string): Promise<string> {
  const res = await fetch(
    `${S3_GATEWAY_URL}/api/v1/sign_storage_url?provider=aws_s3&mode=write`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ object_path: objectKey }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Sign write HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { url: string };
  return json.url;
}
