export interface RateLimitConfig {
  requestsPerMinute: number;
}

export interface RateLimitState {
  hitsByApiKey: Map<string, number[]>;
}

export class RateLimitError extends Error {
  readonly statusCode = 429;
  readonly code = "rate_limited";
}

export function assertRateLimit(
  config: RateLimitConfig,
  state: RateLimitState,
  apiKey: string,
  nowMs = Date.now()
): void {
  const windowStart = nowMs - 60_000;
  const hits = (state.hitsByApiKey.get(apiKey) ?? []).filter((hit) => hit >= windowStart);

  if (hits.length >= config.requestsPerMinute) {
    throw new RateLimitError("Rate limit exceeded.");
  }

  hits.push(nowMs);
  state.hitsByApiKey.set(apiKey, hits);
}

