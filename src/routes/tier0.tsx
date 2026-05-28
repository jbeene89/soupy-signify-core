import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTier0Dashboard } from "@/functions/tier0-inference.functions";

const tier0QueryOptions = queryOptions({
  queryKey: ["tier0-dashboard"],
  queryFn: () => getTier0Dashboard(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/tier0")({
  head: () => ({
    meta: [
      { title: "Tier 0 control plane — Soupy Together" },
      { name: "description", content: "Live status of the locally-absorbed Tier 0 SLM: active checkpoint, requests absorbed, cost saved, training progress." },
      { property: "og:title", content: "Tier 0 control plane — Soupy Together" },
      { property: "og:description", content: "Live status of the locally-absorbed Tier 0 SLM." },
      { property: "og:url", content: "https://soupytogether.com/tier0" },
    ],
    links: [{ rel: "canonical", href: "https://soupytogether.com/tier0" }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tier0QueryOptions),
  component: Tier0Page,
});

function microsToCents(m: number | null | undefined): string {
  if (!m) return "$0.00";
  const cents = m / 10_000;
  return `$${(cents / 100).toFixed(cents < 100 ? 4 : 2)}`;
}

function Tier0Page() {
  const { data, refetch } = useSuspenseQuery(tier0QueryOptions);
  const refresh = useServerFn(getTier0Dashboard);

  const active = data.checkpoints.find((c) => c.is_active);
  const stats = data.liveStats;
  const trainingForActive = active
    ? data.trainingMetrics
        .filter((m) => m.checkpoint_id === active.id)
        .sort((a, b) => a.step - b.step)
    : [];

  const errorRate =
    data.recentRuns.length > 0
      ? (data.recentRuns.filter((r) => r.status !== "ok").length / data.recentRuns.length) * 100
      : 0;

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Tier 0 control plane</p>
            <h1 className="mt-2 font-serif text-4xl">The local absorption layer</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Every request the SLM handles is a request that doesn't hit a frontier model.
              This page shows what's actually live, what training is doing right now, and how much we've saved.
            </p>
          </div>
          <button
            onClick={() => {
              void refresh().then(() => refetch());
            }}
            className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
          >
            Refresh
          </button>
        </header>

        {!data.configured && (
          <div className="mb-8 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            <p className="font-medium text-amber-200">Inference endpoint not yet configured.</p>
            <p className="mt-1 text-amber-200/80">
              Set <code className="font-mono">AMD_INFERENCE_URL</code> and{" "}
              <code className="font-mono">AMD_INFERENCE_KEY</code> in project secrets. Training
              metrics ingest is independent and only needs{" "}
              <code className="font-mono">TIER0_METRICS_HMAC_SECRET</code>.
            </p>
          </div>
        )}

        {/* Active checkpoint card */}
        <section className="mb-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Active checkpoint
          </h2>
          {active ? (
            <div className="mt-3 grid grid-cols-2 gap-6 md:grid-cols-4">
              <Stat label="Name" value={active.name} />
              <Stat label="Family" value={active.model_family} />
              <Stat
                label="Trained on"
                value={`${active.trained_on_samples.toLocaleString()} samples`}
              />
              <Stat
                label="Eval pass rate"
                value={active.eval_pass_rate != null ? `${(Number(active.eval_pass_rate) * 100).toFixed(1)}%` : "—"}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No active checkpoint yet. Mark one active with{" "}
              <code className="font-mono">UPDATE tier0_checkpoints SET is_active = true</code>{" "}
              once training is good enough.
            </p>
          )}
        </section>

        {/* 24h stats */}
        <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card label="Requests absorbed (24h)" value={stats?.total_runs?.toLocaleString() ?? "0"} />
          <Card
            label="Saved vs GPT-5 (24h)"
            value={microsToCents(stats?.total_saved_micros ? Number(stats.total_saved_micros) : 0)}
          />
          <Card
            label="Avg latency"
            value={stats?.avg_latency_ms ? `${Math.round(Number(stats.avg_latency_ms))} ms` : "—"}
          />
          <Card
            label="Avg tokens/sec"
            value={stats?.avg_tokens_per_sec ? Number(stats.avg_tokens_per_sec).toFixed(0) : "—"}
          />
        </section>

        {/* Training curve */}
        <section className="mb-10 rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Training loss (active checkpoint)
          </h2>
          {trainingForActive.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No training metrics yet. POST to <code className="font-mono">/api/public/tier0-metrics</code>{" "}
              from your AMD instance to populate this chart.
            </p>
          ) : (
            <MiniSparkline
              points={trainingForActive
                .filter((m) => m.loss != null)
                .map((m) => ({ x: m.step, y: Number(m.loss) }))}
            />
          )}
        </section>

        {/* Recent runs */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Recent runs ({data.recentRuns.length})
            </h2>
            <span className="text-xs text-muted-foreground">
              Error rate: {errorRate.toFixed(1)}%
            </span>
          </div>
          {data.recentRuns.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing absorbed yet. The first call to <code className="font-mono">tier0InferRoute</code>{" "}
              that succeeds will show up here.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2">When</th>
                    <th>Status</th>
                    <th>Latency</th>
                    <th>Tokens out</th>
                    <th>Cost</th>
                    <th>Baseline</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {data.recentRuns.slice(0, 20).map((r) => (
                    <tr key={r.id} className="border-t border-border/60">
                      <td className="py-2">{new Date(r.created_at).toLocaleTimeString()}</td>
                      <td className={r.status === "ok" ? "text-emerald-400" : "text-rose-400"}>{r.status}</td>
                      <td>{r.latency_ms} ms</td>
                      <td>{r.tokens_out}</td>
                      <td>{microsToCents(r.cost_micros)}</td>
                      <td className="text-muted-foreground">{microsToCents(r.baseline_gpt5_micros)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          <Link to="/build-off" className="underline-offset-2 hover:underline">
            ← back to build-offs
          </Link>
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm">{value}</p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl">{value}</p>
    </div>
  );
}

function MiniSparkline({ points }: { points: Array<{ x: number; y: number }> }) {
  if (points.length < 2) {
    return <p className="mt-3 text-sm text-muted-foreground">Need at least 2 data points.</p>;
  }
  const W = 800;
  const H = 180;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;
  const path = points
    .map((p, i) => {
      const x = ((p.x - xMin) / xRange) * W;
      const y = H - ((p.y - yMin) / yRange) * H;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full">
        <path d={path} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>step {xMin}</span>
        <span>
          loss {yMin.toFixed(3)} → {yMax.toFixed(3)}
        </span>
        <span>step {xMax}</span>
      </div>
    </div>
  );
}
