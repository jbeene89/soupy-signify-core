import type { RouteDecision } from "@soupy-together/shared-types";

export interface BudgetConfig {
  maxRequestCents: number;
  maxSessionCents: number;
}

export interface BudgetState {
  sessionSpend: Map<string, number>;
}

export class BudgetError extends Error {
  constructor(
    readonly cap: "request" | "session",
    readonly maxCents: number,
    readonly estimatedCents: number
  ) {
    super(`${cap} budget cap exceeded.`);
  }
}

export function assertBudget(
  config: BudgetConfig,
  state: BudgetState,
  sessionId: string,
  decision: RouteDecision
): void {
  if (decision.est_cost_cents > config.maxRequestCents) {
    throw new BudgetError("request", config.maxRequestCents, decision.est_cost_cents);
  }

  const currentSessionSpend = state.sessionSpend.get(sessionId) ?? 0;
  const nextSessionSpend = currentSessionSpend + decision.est_cost_cents;

  if (nextSessionSpend > config.maxSessionCents) {
    throw new BudgetError("session", config.maxSessionCents, nextSessionSpend);
  }
}

export function recordSpend(state: BudgetState, sessionId: string, cents: number): void {
  state.sessionSpend.set(sessionId, (state.sessionSpend.get(sessionId) ?? 0) + cents);
}

