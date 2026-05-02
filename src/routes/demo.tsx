import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import {
  classifyDemo,
  getTier0SavingsThisWeek,
} from "@/server/demo.functions";
import { routeSacePrompt, getSaceConfig } from "@/server/sace.functions";
import { classifyPrompt, type ClassifierResult } from "@/lib/sace/classifier";
import type { BudgetCapError, RouteDecision } from "@/lib/sace/contract";
import { readPicks, subscribe } from "@/lib/picks";

export const Route = createFileRoute("/demo")({
  head: () => ({
    meta: [
      { title: "Try SACE — Soupy Together Demo" },
      {
        name: "description",
        content:
          "Drop a build prompt in. Watch SACE classify the tier, route partners, and quote a real cost vs. always-frontier baseline.",
      },
      { property: "og:title", content: "Try SACE — Soupy Together Demo" },
      {
        property: "og:description",
        content:
          "Live tier classification, partner routing, and cost breakdown for any build request.",
      },
    ],
  }),
  loader: async () => {
    const [savings, sace] = await Promise.all([
      getTier0SavingsThisWeek(),
      getSaceConfig(),
    ]);
    return { initialSavedCents: savings.savedCents, sace };
  },
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen bg-background text-cream flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-2xl mb-3">Demo unavailable</h1>
        <p className="text-cream/70 mb-4 text-sm">{error.message}</p>
        <button
          onClick={reset}
          className="font-mono text-[11px] uppercase tracking-[0.14em] px-4 py-2 bg-cyan-accent text-primary-foreground"
        >
          Retry
        </button>
      </div>
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background text-cream flex items-center justify-center">
      <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.14em] underline">
        ← Home
      </Link>
    </div>
  ),
  component: DemoPage,
});

const EXAMPLES = [
  "Login form with email and password",
  "Dark mode toggle for my app",
  "To-do list with local storage",
  "Multi-tenant SaaS billing dashboard with Stripe webhooks and per-org analytics",
];

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

type DemoOutcome =
  | { kind: "sace"; result: ClassifierResult; routerVersion: string }
  | { kind: "fallback"; result: ClassifierResult; reason: string }
  | { kind: "budget_cap"; error: BudgetCapError };

/**
 * Merge a real router decision into a ClassifierResult shape so the existing
 * UI panel can render it unchanged. Local heuristics still drive the "mock
 * output" preview and feature breakdown — only the cost/tier/partners are
 * replaced with router-authoritative values.
 */
function mergeDecision(
  prompt: string,
  decision: RouteDecision,
): ClassifierResult {
  const local = classifyPrompt(prompt);
  return {
    ...local,
    tier: decision.tier,
    tierLabel:
      decision.tier === 0 ? "TIER 0 — Local absorption"
      : decision.tier === 1 ? "TIER 1 — Single specialist"
      : decision.tier === 2 ? "TIER 2 — Composed team"
      : "TIER 3 — Frontier cortex",
    partners: local.partners, // keep typed PartnerId[]; router strings shown separately
    partnerLabels: decision.partners.map((p) => ({
      id: p as never,
      label: p,
      vendor: "SACE-routed",
    })),
    baselineCostCents: decision.baseline_gpt5_cents,
    soupyCostCents: decision.est_cost_cents,
    savedCents: Math.max(0, decision.baseline_gpt5_cents - decision.est_cost_cents),
  };
}

function DemoPage() {
  const { initialSavedCents, sace } = Route.useLoaderData();
  const classify = useServerFn(classifyDemo);
  const routeViaSace = useServerFn(routeSacePrompt);
  const fetchSavings = useServerFn(getTier0SavingsThisWeek);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [outcome, setOutcome] = useState<DemoOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCents, setSavedCents] = useState<number>(initialSavedCents);
  const [displayCents, setDisplayCents] = useState<number>(initialSavedCents);
  const [picks, setPicks] = useState<Record<string, string>>({});

  useEffect(() => {
    setPicks(readPicks() as Record<string, string>);
    return subscribe(() => setPicks(readPicks() as Record<string, string>));
  }, []);

  useEffect(() => {
    if (displayCents === savedCents) return;
    const start = displayCents;
    const diff = savedCents - start;
    const startedAt = performance.now();
    const duration = 900;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - startedAt) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplayCents(Math.round(start + diff * eased));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [savedCents]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runLocalFallback(reason: string): Promise<DemoOutcome> {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
    const res = await classify({ data: { prompt, user_agent: ua } });
    return { kind: "fallback", result: res.result, reason };
  }

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    setOutcome(null);
    try {
      let next: DemoOutcome;
      if (sace.routerEnabled) {
        const prefs = Object.keys(picks).length > 0 ? picks : undefined;
        const r = await routeViaSace({ data: { prompt, preferences: prefs } });
        if (r.ok) {
          next = {
            kind: "sace",
            result: mergeDecision(prompt, r.decision),
            routerVersion: r.decision.router_version,
          };
        } else if (r.source === "sace" && r.kind === "budget_cap") {
          next = { kind: "budget_cap", error: r.error };
        } else if (r.source === "sace") {
          next = await runLocalFallback(`router_${r.kind}_${"status" in r ? r.status : ""}`);
        } else {
          next = await runLocalFallback(r.reason);
        }
      } else {
        next = await runLocalFallback("missing_env");
      }

      setOutcome(next);

      // Tier 0 savings counter still tracks the local submissions table.
      if (next.kind !== "budget_cap" && next.result.tier === 0) {
        const updated = await fetchSavings();
        setSavedCents(updated.savedCents);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-cream">
      <Nav />
      <main className="max-w-[1100px] mx-auto px-6 md:px-10 pt-28 pb-24">
        <header className="mb-10">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-accent">
            § TRY IT NOW
          </div>
          <h1 className="font-serif text-4xl md:text-5xl mt-3 leading-tight">
            What do you want to build?
          </h1>
          <p className="font-serif italic text-cream/70 mt-3 max-w-2xl text-[17px]">
            SACE classifies your prompt, routes the right partners, and quotes a real cost
            against an always-frontier baseline. No signup. No call to your wallet.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span
              className={`inline-block w-1.5 h-1.5 ${
                sace.routerEnabled ? "bg-cyan-accent" : "bg-cream/40"
              }`}
            />
            <span className={sace.routerEnabled ? "text-cyan-accent" : "text-cream/50"}>
              {sace.routerEnabled
                ? "LIVE · ROUTING THROUGH SACE SERVICES"
                : "LOCAL ESTIMATE · SACE SERVICES NOT YET CONNECTED"}
            </span>
          </div>
          {Object.keys(picks).length > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-accent">
              <span className="inline-block w-1.5 h-1.5 bg-cyan-accent" />
              <span>
                {Object.keys(picks).length} ROUTING HINT
                {Object.keys(picks).length === 1 ? "" : "S"} FROM YOUR BUILD-OFF PICKS
              </span>
            </div>
          )}
        </header>

        <form onSubmit={onSubmit} className="border border-rule">
          <div className="p-5 border-b border-rule">
            <label htmlFor="prompt" className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              PROMPT
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
              placeholder="e.g. Build a login form with email and password…"
              rows={3}
              className="mt-2 w-full bg-transparent border-0 outline-none resize-none font-body text-[17px] text-cream placeholder:text-cream/30"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {prompt.length}/2000
              </span>
            </div>
          </div>

          <div className="p-5 border-b border-rule flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setPrompt(ex)}
                className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border border-rule text-cream/70 hover:text-cream hover:border-cream/40 transition-colors"
              >
                {ex.length > 40 ? ex.slice(0, 38) + "…" : ex}
              </button>
            ))}
          </div>

          <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
            {error ? (
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-red-400">
                ! {error}
              </span>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {sace.routerEnabled
                  ? "§ SACE ROUTER · LOCAL HEURISTIC ON FAILURE"
                  : "§ HEURISTIC CLASSIFIER · ROUTER PROXY READY ON DEPLOY"}
              </span>
            )}
            <button
              type="submit"
              disabled={!prompt.trim() || loading}
              className="font-mono text-[11px] uppercase tracking-[0.14em] px-5 py-2.5 bg-cyan-accent text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              {loading ? "Analyzing…" : "Analyze with SACE"}
            </button>
          </div>
        </form>

        {loading && !outcome && (
          <div className="border border-rule mt-8 p-10 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent animate-pulse">
              § SACE CLASSIFYING
            </div>
            <div className="font-serif italic text-cream/60 mt-3">
              Extracting features · scoring axes · routing partners…
            </div>
          </div>
        )}

        {outcome?.kind === "budget_cap" && <BudgetCapPanel error={outcome.error} />}
        {outcome && outcome.kind !== "budget_cap" && (
          <ResultPanel
            result={outcome.result}
            badge={
              outcome.kind === "sace"
                ? { tone: "live", text: `SACE ROUTER · ${outcome.routerVersion}` }
                : { tone: "fallback", text: `LOCAL ESTIMATE · ${outcome.reason}` }
            }
          />
        )}

        <div className="mt-12 border-t border-rule pt-6 flex items-baseline justify-between flex-wrap gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            TIER 0 SAVINGS THIS WEEK
          </div>
          <div className="font-serif text-3xl md:text-4xl text-cyan-accent tabular-nums">
            {formatUsd(displayCents)}
          </div>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
          § AGGREGATE OF EVERY TIER 0 SUBMISSION IN THE LAST 7 DAYS · BASELINE = ALWAYS GPT-5
        </p>
      </main>
    </div>
  );
}

function BudgetCapPanel({ error }: { error: BudgetCapError }) {
  return (
    <div className="border border-amber-300/60 mt-8">
      <div className="p-5 border-b border-amber-300/30">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300">
          § BUDGET CAP HIT · {error.cap.toUpperCase()}
        </div>
        <div className="font-serif text-2xl mt-1 text-cream">
          This request would cost more than your current cap allows.
        </div>
        <p className="font-serif italic text-cream/75 mt-3 max-w-2xl text-[15px]">
          We did not silently downgrade the model or change partners. The cap fired,
          and we stopped. You decide whether to raise it.
        </p>
      </div>
      <div className="grid grid-cols-2 border-b border-amber-300/30">
        <div className="p-5 border-r border-amber-300/30">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ESTIMATED</div>
          <div className="font-serif text-2xl text-cream tabular-nums mt-1">
            {formatUsd(error.estimated_cents)}
          </div>
        </div>
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">YOUR CAP</div>
          <div className="font-serif text-2xl text-amber-300 tabular-nums mt-1">
            {formatUsd(error.max_cents)}
          </div>
        </div>
      </div>
      <div className="p-5">
        <Link
          to="/partners"
          className="inline-block font-mono text-[11px] uppercase tracking-[0.14em] px-5 py-2.5 bg-amber-300 text-primary-foreground hover:opacity-90 transition-opacity"
        >
          See plans & partners →
        </Link>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  badge,
}: {
  result: ClassifierResult;
  badge: { tone: "live" | "fallback"; text: string };
}) {
  const tierColor =
    result.tier === 0 ? "text-cyan-accent"
    : result.tier === 1 ? "text-cream"
    : result.tier === 2 ? "text-amber-300"
    : "text-red-300";

  return (
    <div className="border border-rule mt-8">
      <div className="px-5 pt-3 pb-2 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
            badge.tone === "live" ? "text-cyan-accent" : "text-cream/55"
          }`}
        >
          § {badge.text}
        </span>
      </div>

      <div className="p-5 border-b border-rule flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            CLASSIFICATION
          </div>
          <div className={`font-serif text-2xl mt-1 ${tierColor}`}>
            {result.tierLabel}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            COMPLEXITY
          </div>
          <div className="font-serif text-2xl text-cream tabular-nums">
            {result.features.complexity.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="p-5 border-b border-rule">
        <p className="font-serif italic text-cream/85 text-[15px] leading-relaxed">
          {result.reasoning}
        </p>
      </div>

      <div className="grid grid-cols-3 border-b border-rule">
        <div className="p-5 border-r border-rule">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">BASELINE</div>
          <div className="font-serif text-2xl text-cream/70 tabular-nums mt-1 line-through decoration-cream/30">
            {formatUsd(result.baselineCostCents)}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">ALWAYS GPT-5</div>
        </div>
        <div className="p-5 border-r border-rule">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">SOUPY TOGETHER</div>
          <div className="font-serif text-2xl text-cyan-accent tabular-nums mt-1">
            {formatUsd(result.soupyCostCents)}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">ROUTED</div>
        </div>
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">SAVED</div>
          <div className="font-serif text-2xl text-cream tabular-nums mt-1">
            {formatUsd(result.savedCents)}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
            {result.baselineCostCents > 0
              ? `${Math.round((result.savedCents / result.baselineCostCents) * 100)}%`
              : "—"}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 border-b border-rule">
        <div className="p-5 border-b md:border-b-0 md:border-r border-rule">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">PARTNER ROUTING</div>
          <div className="flex flex-wrap gap-2 mt-3">
            {result.partnerLabels.map((p) => (
              <span
                key={String(p.id)}
                className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-1.5 border border-cyan-accent/40 text-cream"
              >
                {p.label}
                <span className="text-muted-foreground ml-2">· {p.vendor}</span>
              </span>
            ))}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-3">
            ~{result.estOutputTokens.toLocaleString()} OUT TOKENS
          </div>
        </div>
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">ESTIMATED COMPLETION</div>
          <div className="font-serif text-2xl text-cream tabular-nums mt-1">
            {result.etaSeconds < 1 ? "<1" : result.etaSeconds.toFixed(1)}s
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">BASED ON PARTNER TOKENS/SEC</div>
        </div>
      </div>

      <div className="p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
          {badge.tone === "live" ? "ROUTER DECISION (PREVIEW)" : "WINNING TOOL OUTPUT (PREVIEW)"}
        </div>
        <pre className="font-mono text-[12px] leading-relaxed text-cream/85 whitespace-pre-wrap bg-cream/[0.04] p-4 border-l-2 border-cyan-accent/60">
{result.mockOutput}
        </pre>
      </div>
    </div>
  );
}
