import { createFileRoute, Link } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { SectionMarker } from "@/components/site/SectionMarker";
import { FadeIn } from "@/components/site/FadeIn";
import {
  BUILD_OFFS,
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
import { fetchPublishedBuildOff } from "@/server/sace.functions";
import type { PublishedBuildOff } from "@/lib/sace/contract";

export const Route = createFileRoute("/build-off")({
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
  loader: async () => {
    const sample = BUILD_OFFS[0];
    const published = await fetchPublishedBuildOff({ data: { id: sample.id } });
    return { sample, published: published.result };
  },
  component: BuildOffPage,
});

interface MergedBuildOff extends BuildOff {
  manualByTool: Record<string, boolean>;
  sourceUrl?: string;
}

function mergePublished(sample: BuildOff, pub: PublishedBuildOff): MergedBuildOff {
  const runs: ToolRun[] = pub.runs.map((r) => ({
    tool: r.tool,
    raw: r.raw,
    notes: r.notes,
  }));
  const manualByTool: Record<string, boolean> = {};
  for (const r of pub.runs) manualByTool[r.tool] = r.mode === "manual";
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
    sourceUrl: pub.source_url,
  };
}

function BuildOffPage() {
  const { sample, published } = Route.useLoaderData();
  const merged: MergedBuildOff = published
    ? mergePublished(sample, published)
    : { ...sample, manualByTool: {} };
  const current = merged;
  const manualByTool = merged.manualByTool;
  const scored = scoreBuildOff(current);


  return (
    <div id="top" className="min-h-screen text-cream">
      <Nav />

      <main className="max-w-[1200px] mx-auto px-6 md:px-10 pt-32 md:pt-40 pb-32">
        {/* HEADER */}
        <FadeIn>
          <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground mb-8">
            § BUILD-OFF · ROUND {String(current.number).padStart(3, "0")}
          </div>
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

        {/* LEADERBOARD */}
        <FadeIn>
          <SectionMarker>§ LEADERBOARD</SectionMarker>
          <h2 className="font-serif text-3xl md:text-4xl">Composite ranking</h2>
          <p className="font-serif italic text-lg text-cream/75 mt-2 max-w-3xl">
            Each measure normalized 0–100 within this round, then weighted. See methodology below.
          </p>

          <div className="mt-10 border border-rule overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead>
                <tr className="border-b border-rule">
                  <th className="text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6 w-12">#</th>
                  <th className="text-left font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Tool</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Composite</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Cost</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Time</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Correct</th>
                  <th className="text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground py-4 px-6">Honest</th>
                </tr>
              </thead>
              <tbody>
                {scored.map((r, i) => {
                  const isWinner = i === 0;
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
