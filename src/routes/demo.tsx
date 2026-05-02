import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import {
  classifyDemo,
  getTier0SavingsThisWeek,
} from "@/server/demo.functions";
import type { ClassifierResult } from "@/lib/sace/classifier";

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
    const initial = await getTier0SavingsThisWeek();
    return { initialSavedCents: initial.savedCents };
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

function DemoPage() {
  const { initialSavedCents } = Route.useLoaderData();
  const classify = useServerFn(classifyDemo);
  const fetchSavings = useServerFn(getTier0SavingsThisWeek);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifierResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedCents, setSavedCents] = useState<number>(initialSavedCents);
  const [displayCents, setDisplayCents] = useState<number>(initialSavedCents);

  // animate counter to target
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

  async function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const ua = typeof navigator !== "undefined" ? navigator.userAgent : undefined;
      const res = await classify({ data: { prompt, user_agent: ua } });
      setResult(res.result);
      // Refresh savings after a successful Tier 0 (others don't count)
      if (res.result.tier === 0) {
        const next = await fetchSavings();
        setSavedCents(next.savedCents);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-cream">
      <Nav />
      <main className="max-w-[1100px] mx-auto px-6 md:px-10 pt-28 pb-24">
        {/* HEADER */}
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
        </header>

        {/* INPUT */}
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
                § HEURISTIC CLASSIFIER · LLM SWAP COMING
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

        {/* RESULTS */}
        {loading && !result && (
          <div className="border border-rule mt-8 p-10 text-center">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent animate-pulse">
              § SACE CLASSIFYING
            </div>
            <div className="font-serif italic text-cream/60 mt-3">
              Extracting features · scoring axes · routing partners…
            </div>
          </div>
        )}

        {result && <ResultPanel result={result} />}

        {/* SAVINGS COUNTER */}
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

function ResultPanel({ result }: { result: ClassifierResult }) {
  const tierColor =
    result.tier === 0 ? "text-cyan-accent"
    : result.tier === 1 ? "text-cream"
    : result.tier === 2 ? "text-amber-300"
    : "text-red-300";

  return (
    <div className="border border-rule mt-8">
      {/* TIER HEADER */}
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

      {/* COST BREAKDOWN */}
      <div className="grid grid-cols-3 border-b border-rule">
        <div className="p-5 border-r border-rule">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            BASELINE
          </div>
          <div className="font-serif text-2xl text-cream/70 tabular-nums mt-1 line-through decoration-cream/30">
            {formatUsd(result.baselineCostCents)}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
            ALWAYS GPT-5
          </div>
        </div>
        <div className="p-5 border-r border-rule">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            SOUPY TOGETHER
          </div>
          <div className="font-serif text-2xl text-cyan-accent tabular-nums mt-1">
            {formatUsd(result.soupyCostCents)}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
            ROUTED
          </div>
        </div>
        <div className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            SAVED
          </div>
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

      {/* ROUTING + ETA */}
      <div className="grid md:grid-cols-2 border-b border-rule">
        <div className="p-5 border-b md:border-b-0 md:border-r border-rule">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            PARTNER ROUTING
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {result.partnerLabels.map((p) => (
              <span
                key={p.id}
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
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            ESTIMATED COMPLETION
          </div>
          <div className="font-serif text-2xl text-cream tabular-nums mt-1">
            {result.etaSeconds < 1 ? "<1" : result.etaSeconds.toFixed(1)}s
          </div>
          <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
            BASED ON PARTNER TOKENS/SEC
          </div>
        </div>
      </div>

      {/* MOCK OUTPUT */}
      <div className="p-5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
          WINNING TOOL OUTPUT (PREVIEW)
        </div>
        <pre className="font-mono text-[12px] leading-relaxed text-cream/85 whitespace-pre-wrap bg-cream/[0.04] p-4 border-l-2 border-cyan-accent/60">
{result.mockOutput}
        </pre>
      </div>
    </div>
  );
}
