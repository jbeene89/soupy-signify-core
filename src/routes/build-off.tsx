import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Nav } from "@/components/site/Nav";
import { SectionMarker } from "@/components/site/SectionMarker";
import { FadeIn } from "@/components/site/FadeIn";
import {
  BUILD_OFFS,
  FEATURED_BUILD_OFF_ID,
  MEASURES,
  scoreBuildOff,
  formatRaw,
  type BuildOff,
  type ScoredRun,
  type ToolRun,
} from "@/data/build-off";
import {
  CompositeBarChart,
  ScoreHeatmap,
  RadarChart,
  CostCorrectnessScatter,
} from "@/components/site/BuildOffVisuals";
import { VisualShowcase } from "@/components/site/VisualShowcase";
import { fetchPublishedBuildOff, listPublishedBuildOffs } from "@/functions/sace.functions";
import { getPublishedRunsForRound, type PublishedRun } from "@/functions/build-off-runner.functions";
import type { PublishedBuildOff, PublishedBuildOffManifestEntry, PublishedToolRun } from "@/lib/sace/contract";

const SearchSchema = z.object({ id: z.string().min(1).max(64).optional() });

export const Route = createFileRoute("/build-off")({
  validateSearch: (search) => SearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Build-Off — Soupy Together" },
      {
        name: "description",
        content:
          "A public, side-by-side benchmark of every integrated AI coding tool building the same thing. Same prompt, same evaluation criteria, published receipts.",
      },
      { property: "og:title", content: "Build-Off — Soupy Together" },
      {
        property: "og:description",
        content:
          "Same prompt through every AI coding tool. Cost, time, fidelity, correctness — all measured in public.",
      },
    ],
  }),
  loaderDeps: ({ search }) => ({ id: search.id }),
  loader: async ({ deps }) => {
    const manifest = await listPublishedBuildOffs();
    const entries = manifest.entries;
    const defaultId = entries[0]?.id ?? FEATURED_BUILD_OFF_ID;
    const selectedId = deps.id ?? defaultId;
    const sample = BUILD_OFFS.find((b) => b.id === selectedId) ?? BUILD_OFFS[0];
    const [published, dbRuns] = await Promise.all([
      fetchPublishedBuildOff({ data: { id: selectedId } }),
      getPublishedRunsForRound({ data: { buildOffId: selectedId } }).catch(() => [] as PublishedRun[]),
    ]);
    return { sample, published: published.result, entries, selectedId, dbRuns };
  },
  component: BuildOffPage,
});

interface MergedBuildOff extends BuildOff {
  manualByTool: Record<string, boolean>;
  /** Per-tool harness telemetry (only present when published). */
  telemetryByTool: Record<string, { ttft_ms?: number; time_to_green_s?: number }>;
  sourceUrl?: string;
  /** Full published run data — needed for the visual showcase iframe/previewUrl fields. */
  publishedRuns?: PublishedToolRun[];
  showcaseComplete?: boolean;
}

function mergePublished(sample: BuildOff, pub: PublishedBuildOff): MergedBuildOff {
  const runs: ToolRun[] = pub.runs.map((r) => ({
    tool: r.tool,
    raw: r.raw,
    notes: r.notes,
  }));
  const manualByTool: Record<string, boolean> = {};
  const telemetryByTool: Record<string, { ttft_ms?: number; time_to_green_s?: number }> = {};
  for (const r of pub.runs) {
    manualByTool[r.tool] = r.mode === "manual";
    if (r.ttft_ms != null || r.time_to_green_s != null) {
      telemetryByTool[r.tool] = { ttft_ms: r.ttft_ms, time_to_green_s: r.time_to_green_s };
    }
  }
  return {
    ...sample,
    id: pub.id,
    number: pub.number,
    title: pub.title,
    prompt: pub.prompt,
    brief: pub.brief,
    status: "verified",
    date: pub.date,
    runs,
    manualByTool,
    telemetryByTool,
    sourceUrl: pub.source_url,
    tier: pub.tier,
    publishedRuns: pub.runs,
    showcaseComplete: pub.showcaseComplete,
  };
}

function BuildOffPage() {
  const { sample, published, entries, selectedId } = Route.useLoaderData();
  const navigate = useNavigate({ from: "/build-off" });
  const merged: MergedBuildOff = published
    ? mergePublished(sample, published)
    : { ...sample, manualByTool: {}, telemetryByTool: {} };
  const current = merged;
  const manualByTool = merged.manualByTool;
  const telemetryByTool = merged.telemetryByTool;
  const hasAnyTtft = Object.values(telemetryByTool).some((t) => t.ttft_ms != null);
  const hasAnyGreen = Object.values(telemetryByTool).some((t) => t.time_to_green_s != null);
  const scored = scoreBuildOff(current);


  return (
    <div id="top" className="min-h-screen text-cream">
      <Nav />

      <main className="max-w-[1200px] mx-auto px-6 md:px-10 pt-32 md:pt-40 pb-32">
        {/* HEADER */}
        <FadeIn>
          <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
                § BUILD-OFF · ROUND {String(current.number).padStart(3, "0")}
              </div>
              {current.tier && (
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] border border-cyan-accent/35 text-cyan-accent/80 px-2.5 py-1">
                  TIER {{ 1: "I", 2: "II", 3: "III" }[current.tier]}
                </div>
              )}
            </div>
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em]">
              <span
                className={`inline-block w-1.5 h-1.5 ${
                  published ? "bg-cyan-accent" : "bg-cream/40"
                }`}
              />
              <span className={published ? "text-cyan-accent" : "text-cream/55"}>
                {published ? "LIVE · PUBLISHED RESULTS" : "SAMPLE · IN-REPO FALLBACK"}
              </span>
            </div>
          </div>
          {(() => {
            const pickerEntries: { id: string; label: string }[] =
              entries.length > 0
                ? entries.map((e: PublishedBuildOffManifestEntry) => ({
                    id: e.id,
                    label: e.runId ? `${e.id} · ${e.runId}` : e.id,
                  }))
                : BUILD_OFFS.map((b) => ({
                    id: b.id,
                    label: `${b.id}${b.tier ? ` · TIER ${{ 1: "I", 2: "II", 3: "III" }[b.tier]}` : ""}`,
                  }));
            return (
              <div className="mb-8 flex items-center gap-3 flex-wrap">
                <label
                  htmlFor="buildoff-picker"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  § ROUND
                </label>
                <select
                  id="buildoff-picker"
                  value={selectedId}
                  onChange={(e) =>
                    navigate({ search: { id: e.target.value }, replace: true })
                  }
                  className="bg-transparent border border-rule px-3 py-2 font-mono text-[12px] text-cream hover:border-cyan-accent focus:border-cyan-accent focus:outline-none"
                >
                  {pickerEntries.map((entry) => (
                    <option key={entry.id} value={entry.id} className="bg-background text-cream">
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })()}
          <h1 className="font-serif text-[44px] sm:text-[64px] md:text-[80px] leading-[1.02] tracking-tight">
            {current.title}
          </h1>
          <p className="mt-8 font-serif italic text-xl md:text-2xl text-cream/90 max-w-3xl leading-snug">
            Same prompt. Every tool. Cost in dollars, time in seconds, output in receipts. We're not trying to win — we're showing what each tool is best at, then routing your job to it.
          </p>
          {current.status === "sample" ? (
            <div className="mt-10 border-l-4 border-cyan-accent pl-5 py-3 max-w-3xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
                § SAMPLE DATA — NOT YET A LIVE VERIFIED RUN
              </div>
              <p className="font-body text-[15px] text-cream/80 mt-2 leading-relaxed">
                Numbers below are plausible estimates from public pricing and reported behavior, shown to demonstrate the methodology. The first verified Build-Off — same prompt run live through every tool, with screen captures and token receipts — drops shortly. Get notified at the bottom of the page.
              </p>
            </div>
          ) : (
            <div className="mt-10 border-l-4 border-cyan-accent pl-5 py-3 max-w-3xl">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
                § VERIFIED RUN · PUBLISHED RECEIPTS
              </div>
              <p className="font-body text-[15px] text-cream/80 mt-2 leading-relaxed">
                Same prompt was run through every tool below. Manual runs are flagged
                inline. {merged.sourceUrl && (
                  <a
                    href={merged.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline decoration-cyan-accent/60 hover:text-cream"
                  >
                    Source JSON ↗
                  </a>
                )}
              </p>
            </div>
          )}
        </FadeIn>

        <hr className="border-rule my-20" />

        {/* PROMPT */}
        <FadeIn>
          <SectionMarker>§ THE PROMPT</SectionMarker>
          <div className="grid md:grid-cols-[1fr_2fr] gap-10">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
                BRIEF
              </div>
              <p className="font-body text-[16px] leading-[1.7] text-cream/85">{current.brief}</p>
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mt-6 mb-2">
                DATE · {current.date.toUpperCase()}
              </div>
            </div>
            <div className="border border-rule p-6 md:p-8 bg-foreground/[0.02]">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-3">
                PROMPT (VERBATIM)
              </div>
              <p className="font-mono text-[14px] leading-[1.7] text-cream whitespace-pre-wrap">
                {current.prompt}
              </p>
            </div>
          </div>
        </FadeIn>

        <hr className="border-rule my-20" />

        {/* VISUAL SHOWCASE — only for tiered build-offs */}
        {current.tier && (
          <>
            <FadeIn>
              <SectionMarker>§ VISUAL SHOWCASE</SectionMarker>
              <h2 className="font-serif text-3xl md:text-4xl">What each tool built.</h2>
              <p className="font-serif italic text-lg text-cream/75 mt-2 max-w-3xl">
                Same prompt. Same constraints. Submissions appear as tools complete — rankings unlock once everyone is in.
              </p>

              <div className="mt-10">
                <VisualShowcase
                  tier={current.tier}
                  runs={
                    current.publishedRuns ??
                    current.runs.map((r) => ({
                      tool: r.tool,
                      raw: r.raw,
                      notes: r.notes,
                      mode: r.mode ?? ("harness" as const),
                      previewUrl: r.previewUrl,
                      previewHarnessServed: r.previewHarnessServed,
                      confirmed: r.confirmed,
                    }))
                  }
                  scored={scored}
                  showcaseComplete={current.showcaseComplete}
                />
              </div>
            </FadeIn>

            <hr className="border-rule my-20" />
          </>
        )}

        {/* LEADERBOARD */}
        <FadeIn>
          <SectionMarker>§ LEADERBOARD</SectionMarker>
          <h2 className="font-serif text-3xl md:text-4xl">Composite ranking</h2>
          <p className="font-serif italic text-lg text-cream/75 mt-2 max-w-3xl">
            Each measure normalized 0–100 within this round, then weighted. See methodology below.
          </p>

          <div className="mt-6 border-l-4 border-cyan-accent/70 pl-5 py-3 max-w-3xl bg-foreground/[0.02]">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
              § HOW TO READ THIS
            </div>
            <p className="font-body text-[15px] text-cream/85 mt-2 leading-relaxed">
              Soupy Together is the daily driver, not the top scorer. v0 will out-design us on visuals. Cursor and Claude Code will out-correct us on hairy refactors. That's fine — when your job needs one of those, we route to it and you pay for that call. The rest of the time, the cheapest tool that can finish the job finishes the job. Look at the <span className="text-cyan-accent">Cost</span> column, then look at <span className="text-cyan-accent">Composite</span>.
            </p>
          </div>

          <div className="mt-10 border border-rule overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6 w-12">#</th>
                  <th className="text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Tool</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Composite</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Cost</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">TTFP</th>
                  {hasAnyTtft && (
                    <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">TTFT</th>
                  )}
                  {hasAnyGreen && (
                    <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Time→Green</th>
                  )}
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Correct</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Honest</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((r, i) => {
                  const isWinner = i === 0;
                  const tel = telemetryByTool[r.tool];
                  return (
                    <tr
                      key={r.tool}
                      className={`border-b border-rule last:border-b-0 ${
                        isWinner ? "bg-cyan-accent/[0.04]" : ""
                      }`}
                    >
                      <td className={`font-mono text-[12px] py-5 px-6 tabular-nums ${isWinner ? "text-cyan-accent" : "text-muted-foreground"}`}>
                        {String(i + 1).padStart(2, "0")}
                      </td>
                      <td className="font-serif text-lg py-5 px-6 text-cream">
                        <a href={`#${slug(r.tool)}`} className="hover:text-cyan-accent transition-colors">
                          {r.tool}
                        </a>
                      </td>
                      <td className="font-serif text-2xl py-5 px-6 text-right text-cream tabular-nums">
                        {r.composite}
                      </td>
                      <td className="font-mono text-[13px] py-5 px-6 text-right text-cream/80 tabular-nums">
                        {formatRaw(r.raw.cost, MEASURES[0])}
                      </td>
                      <td className="font-mono text-[13px] py-5 px-6 text-right text-cream/80 tabular-nums">
                        {formatRaw(r.raw.time, MEASURES[1])}
                      </td>
                      {hasAnyTtft && (
                        <td className="font-mono text-[13px] py-5 px-6 text-right text-cream/80 tabular-nums">
                          {tel?.ttft_ms != null ? `${Math.round(tel.ttft_ms)}ms` : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      {hasAnyGreen && (
                        <td className="font-mono text-[13px] py-5 px-6 text-right text-cream/80 tabular-nums">
                          {tel?.time_to_green_s != null ? `${Math.round(tel.time_to_green_s)}s` : <span className="text-muted-foreground">—</span>}
                        </td>
                      )}
                      <td className="font-mono text-[13px] py-5 px-6 text-right text-cream/80 tabular-nums">
                        {r.raw.correctness}
                      </td>
                      <td className="font-mono text-[13px] py-5 px-6 text-right text-cream/80 tabular-nums">
                        {r.raw.honesty}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-3 max-w-3xl leading-relaxed">
            TTFP = time-to-first-preview (wall-clock, prompt → reachable preview). TTFT = time-to-first-token from the model API, shown when the tool exposes it; not weighted in composite. Time→Green = wall-clock until preview reachable AND tests green. TTFT and Time→Green are populated only by harness-driven runs.
          </p>
        </FadeIn>

        <hr className="border-rule my-20" />

        {/* VISUALS */}
        <FadeIn>
          <SectionMarker>§ VISUALS</SectionMarker>
          <h2 className="font-serif text-3xl md:text-4xl">The shape of the round.</h2>
          <p className="font-serif italic text-lg text-cream/75 mt-2 max-w-3xl">
            Three views of the same data: composite ranking, every normalized score
            in one matrix, and the cost-vs-correctness frontier.
          </p>

          <div className="mt-10 space-y-8">
            <CompositeBarChart runs={scored} />
            <ScoreHeatmap runs={scored} />
            <CostCorrectnessScatter runs={scored} />
          </div>
        </FadeIn>

        <hr className="border-rule my-20" />

        {/* PER-TOOL CARDS */}
        <FadeIn>
          <SectionMarker>§ FULL RESULTS</SectionMarker>
          <h2 className="font-serif text-3xl md:text-4xl">Per-tool breakdown</h2>

          <div className="mt-12 space-y-6">
            {scored.map((r, i) => (
              <ToolCard key={r.tool} run={r} rank={i + 1} manual={!!manualByTool[r.tool]} />
            ))}
          </div>
        </FadeIn>

        <hr className="border-rule my-20" />

        {/* METHODOLOGY */}
        <FadeIn>
          <SectionMarker>§ METHODOLOGY</SectionMarker>
          <h2 className="font-serif text-3xl md:text-4xl">How we measure.</h2>

          <div className="mt-10 grid md:grid-cols-2 gap-x-12 gap-y-8">
            {MEASURES.map((m) => (
              <div key={m.key} className="border-l-2 border-rule pl-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
                  {m.label} · WEIGHT {Math.round(m.weight * 100)}%
                </div>
                <p className="font-body text-[15px] text-cream/85 mt-2 leading-relaxed">
                  {m.description}
                </p>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-2">
                  Unit: {m.unit} · {m.higherBetter ? "Higher is better" : "Lower is better"}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 border border-rule p-8">
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-3">
              § EDITORIAL NEUTRALITY
            </div>
            <p className="font-serif italic text-lg leading-snug text-cream max-w-3xl">
              No tool can pay for placement. Soupy Together is itself in every Build-Off and competes on the same terms. We publish the prompts, the raw outputs, the screen captures, and the receipts. If we lose, we publish that too.
            </p>
          </div>
        </FadeIn>

        <hr className="border-rule my-20" />

        {/* CTA BACK */}
        <FadeIn>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <Link
              to="/"
              hash="access"
              className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 bg-cyan-accent text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Get notified when round 002 drops
            </Link>
            <Link
              to="/"
              className="font-mono text-[12px] uppercase tracking-[0.14em] px-6 py-3 border border-cream/40 text-cream hover:border-cyan-accent hover:text-cyan-accent transition-colors"
            >
              ← Back to Soupy Together
            </Link>
          </div>
        </FadeIn>
      </main>
    </div>
  );
}

function ToolCard({ run, rank, manual }: { run: ScoredRun; rank: number; manual?: boolean }) {
  const isWinner = rank === 1;
  return (
    <article
      id={slug(run.tool)}
      className={`border ${isWinner ? "border-cyan-accent" : "border-rule"} ${manual ? "border-dashed" : ""} p-6 md:p-8 scroll-mt-24`}
    >
      <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-start">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums">
          RANK {String(rank).padStart(2, "0")}
          {manual && (
            <div className="text-amber-300 mt-1">· MANUAL</div>
          )}
        </div>
        <div>
          <h3 className="font-serif text-2xl md:text-3xl text-cream">{run.tool}</h3>
          {run.notes && (
            <p className="font-serif italic text-[16px] text-cream/80 mt-2 leading-snug">
              {run.notes}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">COMPOSITE</div>
          <div className={`font-serif text-5xl tabular-nums ${isWinner ? "text-cyan-accent" : "text-cream"}`}>
            {run.composite}
          </div>
        </div>
      </div>

      <div className="mt-8 grid md:grid-cols-[1fr_240px] gap-8 items-start">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MEASURES.map((m) => {
            const score = run.scores[m.key];
            const raw = run.raw[m.key];
            return (
              <div key={m.key} className="border-t border-rule pt-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground truncate">
                  {m.label}
                </div>
                <div className="font-serif text-xl text-cream tabular-nums mt-1">
                  {formatRaw(raw, m)}
                </div>
                <div className="mt-2 h-1 bg-cream/10 relative">
                  <div
                    className="absolute inset-y-0 left-0 bg-cyan-accent/70"
                    style={{ width: `${score}%` }}
                  />
                </div>
                <div className="font-mono text-[10px] text-muted-foreground tabular-nums mt-1">
                  {score}/100
                </div>
              </div>
            );
          })}
        </div>
        <div className="border-l border-rule pl-6 md:pl-8">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
            PROFILE
          </div>
          <RadarChart run={run} highlight={isWinner} />
        </div>
      </div>
    </article>
  );
}

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
