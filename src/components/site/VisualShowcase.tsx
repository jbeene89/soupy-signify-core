import { useEffect, useRef, useState } from "react";
import type { PublishedToolRun } from "@/lib/sace/contract";
import { getBuildOffTier, type ScoredRun } from "@/data/build-off";

// ── Per-tool color palette — stays within the dark cream/cyan design language ──
const TOOL_ACCENT: Record<string, string> = {
  "soupy together": "var(--cyan-accent)",
  "lovable pro":    "var(--sace-blue)",
  "bolt":           "var(--sace-yellow)",
  "v0 by vercel":   "#a78bfa",
  "cursor":         "var(--sace-green)",
  "replit agent":   "var(--sace-orange)",
  "claude code":    "var(--sace-red)",
};

function accentFor(tool: string): string {
  return TOOL_ACCENT[tool.toLowerCase()] ?? "var(--cream)";
}

function initialsFor(tool: string): string {
  return tool
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

function PendingTile({ launched }: { launched: boolean }) {
  if (launched) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center gap-2 bg-foreground/[0.02] border-t border-rule/40">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/25">
          No submission
        </div>
        <div className="font-serif italic text-[11px] text-cream/30">
          Did not submit before launch
        </div>
      </div>
    );
  }
  return (
    <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-foreground/[0.02] border-dashed border-t border-rule/40">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-cream/20 animate-pulse"
            style={{ animationDelay: `${i * 220}ms` }}
          />
        ))}
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/30">
        Awaiting submission
      </span>
    </div>
  );
}

function WithdrawnTile() {
  return (
    <div className="aspect-video flex flex-col items-center justify-center gap-2 bg-foreground/[0.02] border-t border-rule/40 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--cream) 0 1px, transparent 1px 8px)",
        }}
      />
      <div className="relative font-mono text-[10px] uppercase tracking-[0.14em] text-cream/30">
        Withdrew
      </div>
      <div className="relative font-serif italic text-[11px] text-cream/30">
        Declined this round
      </div>
    </div>
  );
}

function UnavailableTile() {
  return (
    <div className="aspect-video flex items-center justify-center bg-foreground/[0.02] border-t border-rule/40">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/20">
        Not entered · this tier
      </span>
    </div>
  );
}

function PreviewFrame({ url, tool }: { url: string; tool: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden border-t border-rule/40 bg-foreground/[0.03]">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full border border-t-cream/60 border-cream/20 animate-spin" />
        </div>
      )}
      <iframe
        src={url}
        title={`${tool} visual submission`}
        className={`w-full h-full border-0 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        sandbox="allow-scripts"
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Tile — one tool's card in the grid
// ────────────────────────────────────────────────────────────────────────────

function ShowcaseTile({
  run,
  scored,
  launched,
  showScores,
  animDelay,
}: {
  run: PublishedToolRun;
  scored: ScoredRun | undefined;
  /** True once the round has been launched (rankings visible / final state). */
  launched: boolean;
  /** Whether to display the composite score in the header. */
  showScores: boolean;
  animDelay: number;
}) {
  const accent = accentFor(run.tool);
  const hasPreview = !!run.previewUrl;
  const isWithdrawn = run.mode === "withdrawn";
  const isUnavailable = !hasPreview && !isWithdrawn && run.mode === "manual";
  const needsConfirmation = hasPreview && run.confirmed === false;

  return (
    <div
      className={`border flex flex-col ${needsConfirmation ? "border-amber-400/60" : "border-rule"}`}
      style={{
        opacity: 0,
        animation: "tile-reveal 0.5s ease forwards",
        animationDelay: `${animDelay}ms`,
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-mono text-[10px] font-bold"
          style={{
            background: `color-mix(in oklab, ${accent} 12%, var(--background))`,
            color: accent,
            outline: `1px solid color-mix(in oklab, ${accent} 30%, transparent)`,
          }}
        >
          {initialsFor(run.tool)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="font-serif text-[15px] text-cream leading-tight truncate">
            {run.tool}
          </div>
          {run.previewHarnessServed && (
            <div className="font-mono text-[9px] uppercase tracking-[0.12em] text-cream/35">
              harness-served
            </div>
          )}
        </div>

        {showScores && scored && hasPreview && (
          <div
            className="font-serif text-xl tabular-nums flex-shrink-0"
            style={{ color: accent }}
          >
            {scored.composite}
          </div>
        )}
      </div>

      {/* Preview area */}
      {hasPreview ? (
        <PreviewFrame url={run.previewUrl!} tool={run.tool} />
      ) : isWithdrawn ? (
        <WithdrawnTile />
      ) : isUnavailable ? (
        <UnavailableTile />
      ) : (
        <PendingTile launched={launched} />
      )}

      {/* Operator confirmation reminder — soft prompt before going live */}
      {needsConfirmation && (
        <div className="px-4 py-2.5 border-t border-amber-400/30 bg-amber-400/[0.04]">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300 mb-0.5">
            Confirm submission
          </div>
          <p className="font-serif italic text-[12px] text-amber-100/70 leading-snug">
            Did you enter your submission? Make sure it's as good as you can do.
          </p>
        </div>
      )}

      {/* Notes — revealed once the round is launched */}
      {launched && run.notes && (
        <div className="px-4 py-3 border-t border-rule/60">
          <p className="font-serif italic text-[13px] text-cream/60 leading-snug">
            {run.notes}
          </p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Rankings podium — appears once all tiles have revealed
// ────────────────────────────────────────────────────────────────────────────

const RANK_LABEL = ["01", "02", "03"] as const;
const RANK_SUFFIX = ["ST", "ND", "RD"] as const;

function RankingsPodium({
  scored,
  visible,
}: {
  scored: ScoredRun[];
  visible: boolean;
}) {
  const top3 = scored.slice(0, 3);

  return (
    <div
      className="mt-14"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : "translateY(12px)",
        transition: "opacity 0.7s ease, transform 0.7s ease",
      }}
    >
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-1">
        § Visual challenge rankings
      </div>
      <p className="font-serif italic text-lg text-cream/70 mb-8">
        Fidelity leads the weighting in this tier.
      </p>

      <div className="flex flex-col sm:flex-row gap-4">
        {top3.map((r, i) => {
          const accent = accentFor(r.tool);
          const isFirst = i === 0;
          return (
            <div
              key={r.tool}
              className={`flex-1 border p-5 flex items-start gap-4 ${isFirst ? "border-cyan-accent" : "border-rule"}`}
              style={{
                opacity: 0,
                animation: visible ? "medal-pop 0.4s ease forwards" : "none",
                animationDelay: `${i * 140}ms`,
              }}
            >
              <div className="flex-shrink-0 text-right">
                <div
                  className="font-mono text-[28px] leading-none tabular-nums"
                  style={{ color: isFirst ? "var(--cyan-accent)" : "var(--cream)" }}
                >
                  {RANK_LABEL[i]}
                </div>
                <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                  {RANK_SUFFIX[i]}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="font-serif text-lg leading-tight"
                  style={{ color: accent }}
                >
                  {r.tool}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mt-0.5">
                  Composite {r.composite}
                </div>
                {r.notes && (
                  <p className="font-serif italic text-[13px] text-cream/60 mt-2 leading-snug">
                    {r.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────────────────

interface VisualShowcaseProps {
  tier: 1 | 2 | 3;
  runs: PublishedToolRun[];
  scored: ScoredRun[];
  /**
   * Operator-controlled "launched" flag from the published manifest.
   * - undefined: derived from run states (auto-launch when every tool has acted)
   * - true: force-launched even if some tools haven't submitted (the missing ones
   *   are then displayed as "did not submit")
   * - false: held back, even if everything looks ready
   */
  showcaseComplete?: boolean;
}

export function VisualShowcase({ tier, runs, scored, showcaseComplete }: VisualShowcaseProps) {
  const [rankingsVisible, setRankingsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tierDef = getBuildOffTier(tier);

  // A run is "settled" when it's either submitted-and-confirmed or has explicitly
  // withdrawn. Pending tools (no previewUrl, no withdrawal) hold the launch.
  const settled = (r: PublishedToolRun) =>
    (!!r.previewUrl && r.confirmed !== false) || r.mode === "withdrawn";

  const allSettled = runs.every(settled);
  const launched = showcaseComplete ?? allSettled;

  // Delay rankings until after all tiles have finished their staggered reveal
  useEffect(() => {
    if (!launched) return;
    timerRef.current = setTimeout(
      () => setRankingsVisible(true),
      runs.length * 300 + 900,
    );
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [launched, runs.length]);

  const scoreByTool = new Map(scored.map((r) => [r.tool.toLowerCase(), r]));

  // Tally counts for the status indicator
  const submittedCount = runs.filter((r) => !!r.previewUrl).length;
  const withdrawnCount = runs.filter((r) => r.mode === "withdrawn").length;
  const pendingConfirmCount = runs.filter((r) => r.previewUrl && r.confirmed === false).length;

  // Rankings exclude tools that didn't submit
  const rankedScored = scored.filter((r) => {
    const run = runs.find((x) => x.tool.toLowerCase() === r.tool.toLowerCase());
    return run && !!run.previewUrl;
  });

  return (
    <div>
      {/* Tier badge + constraint */}
      <div className="mb-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] border border-cyan-accent/40 text-cyan-accent px-3 py-1.5 mb-3">
            <span className="inline-block w-1.5 h-1.5 bg-cyan-accent" />
            {tierDef.label}
          </div>
          <p className="font-mono text-[12px] text-cream/55 leading-relaxed max-w-md">
            {tierDef.constraint}
          </p>
        </div>

        <div className="text-right space-y-1">
          {launched ? (
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-accent/70">
              <span className="inline-block w-1.5 h-1.5 bg-cyan-accent/70" />
              Round launched · {submittedCount} entered
              {withdrawnCount > 0 && ` · ${withdrawnCount} withdrew`}
            </div>
          ) : (
            <>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/35">
                {submittedCount} submitted · {withdrawnCount} withdrew · {runs.length - submittedCount - withdrawnCount} pending
              </div>
              {pendingConfirmCount > 0 && (
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-amber-300/80">
                  {pendingConfirmCount} awaiting confirmation
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Tile grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {runs.map((run, i) => (
          <ShowcaseTile
            key={run.tool}
            run={run}
            scored={scoreByTool.get(run.tool.toLowerCase())}
            launched={launched}
            showScores={launched}
            animDelay={i * 280}
          />
        ))}
      </div>

      {/* Rankings — locked until launched */}
      {launched ? (
        <RankingsPodium scored={rankedScored} visible={rankingsVisible} />
      ) : (
        <div className="mt-10 border-l-2 border-rule/40 pl-5 py-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/30">
            Rankings unlock when the round launches. Operators can launch early
            if a tool won't submit — missing tools appear as "did not submit."
          </p>
        </div>
      )}
    </div>
  );
}
