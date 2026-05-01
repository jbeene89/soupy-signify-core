import { MEASURES, type MeasureKey, type ScoredRun } from "@/data/build-off";

/* ──────────────────────────────────────────────────────────────
   1. COMPOSITE BAR CHART
   ────────────────────────────────────────────────────────────── */
export function CompositeBarChart({ runs }: { runs: ScoredRun[] }) {
  const max = Math.max(...runs.map((r) => r.composite), 100);
  const rowH = 44;
  const labelW = 180;
  const barAreaW = 720;
  const padX = 16;
  const width = labelW + barAreaW + padX * 2;
  const height = runs.length * rowH + 56;

  return (
    <div className="border border-rule p-6 md:p-8 overflow-x-auto bg-foreground/[0.02]">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-4">
        FIG. 01 — COMPOSITE SCORE, ALL TOOLS
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        role="img"
        aria-label="Composite score bar chart"
      >
        {/* gridlines */}
        {[0, 25, 50, 75, 100].map((g) => {
          const x = padX + labelW + (g / max) * barAreaW;
          return (
            <g key={g}>
              <line
                x1={x}
                x2={x}
                y1={20}
                y2={height - 20}
                stroke="var(--rule)"
                strokeDasharray={g === 0 || g === 100 ? "" : "2 4"}
              />
              <text
                x={x}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ font: "10px var(--font-mono)", letterSpacing: "0.14em" }}
              >
                {g}
              </text>
            </g>
          );
        })}

        {runs.map((r, i) => {
          const y = 28 + i * rowH;
          const w = (r.composite / max) * barAreaW;
          const isWinner = i === 0;
          return (
            <g key={r.tool}>
              <text
                x={padX + labelW - 12}
                y={y + rowH / 2 + 2}
                textAnchor="end"
                className="fill-cream"
                style={{ font: "14px var(--font-serif)" }}
              >
                {r.tool}
              </text>
              <rect
                x={padX + labelW}
                y={y + 8}
                width={barAreaW}
                height={rowH - 20}
                fill="var(--cream)"
                opacity={0.05}
              />
              <rect
                x={padX + labelW}
                y={y + 8}
                width={w}
                height={rowH - 20}
                fill={isWinner ? "var(--cyan-accent)" : "var(--cream)"}
                opacity={isWinner ? 0.95 : 0.35}
              />
              <text
                x={padX + labelW + w + 8}
                y={y + rowH / 2 + 3}
                className={isWinner ? "fill-cyan-accent" : "fill-cream"}
                style={{ font: "13px var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
              >
                {r.composite}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   2. NORMALIZED SCORE HEATMAP
   ────────────────────────────────────────────────────────────── */
export function ScoreHeatmap({ runs }: { runs: ScoredRun[] }) {
  const cellW = 96;
  const cellH = 44;
  const labelW = 180;
  const headH = 64;
  const padX = 16;
  const width = labelW + MEASURES.length * cellW + padX * 2;
  const height = headH + runs.length * cellH + 24;

  const colorFor = (score: number) => {
    // 0 → muted cream, 100 → cyan accent
    const t = score / 100;
    return `color-mix(in oklab, var(--cyan-accent) ${Math.round(t * 90)}%, var(--background))`;
  };

  return (
    <div className="border border-rule p-6 md:p-8 overflow-x-auto bg-foreground/[0.02]">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-4">
        FIG. 02 — NORMALIZED SCORE MATRIX (0–100, PER MEASURE)
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img">
        {/* Column headers */}
        {MEASURES.map((m, i) => {
          const x = padX + labelW + i * cellW + cellW / 2;
          return (
            <g key={m.key}>
              <text
                x={x}
                y={headH - 26}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ font: "10px var(--font-mono)", letterSpacing: "0.14em", textTransform: "uppercase" }}
              >
                {m.label.split(" ")[0].toUpperCase()}
              </text>
              <text
                x={x}
                y={headH - 12}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ font: "9px var(--font-mono)", letterSpacing: "0.12em" }}
              >
                w {Math.round(m.weight * 100)}%
              </text>
            </g>
          );
        })}

        {runs.map((r, ri) => {
          const y = headH + ri * cellH;
          return (
            <g key={r.tool}>
              <text
                x={padX + labelW - 12}
                y={y + cellH / 2 + 4}
                textAnchor="end"
                className="fill-cream"
                style={{ font: "13px var(--font-serif)" }}
              >
                {r.tool}
              </text>
              {MEASURES.map((m, ci) => {
                const score = r.scores[m.key as MeasureKey];
                const x = padX + labelW + ci * cellW;
                return (
                  <g key={m.key}>
                    <rect
                      x={x + 2}
                      y={y + 2}
                      width={cellW - 4}
                      height={cellH - 4}
                      fill={colorFor(score)}
                      stroke="var(--rule)"
                    />
                    <text
                      x={x + cellW / 2}
                      y={y + cellH / 2 + 5}
                      textAnchor="middle"
                      className={score > 55 ? "fill-[color:var(--primary-foreground)]" : "fill-cream"}
                      style={{ font: "13px var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
                    >
                      {score}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="mt-5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        <span>0</span>
        <div className="h-2 flex-1 max-w-[280px]" style={{
          background: "linear-gradient(to right, color-mix(in oklab, var(--cyan-accent) 0%, var(--background)), var(--cyan-accent))"
        }} />
        <span>100</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   3. RADAR CHART (per tool, used inside ToolCard)
   ────────────────────────────────────────────────────────────── */
export function RadarChart({
  run,
  size = 220,
  highlight = false,
}: {
  run: ScoredRun;
  size?: number;
  highlight?: boolean;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = MEASURES.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return [cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist] as const;
  };

  const polygon = MEASURES.map((m, i) => {
    const [x, y] = point(i, run.scores[m.key as MeasureKey]);
    return `${x},${y}`;
  }).join(" ");

  const rings = [25, 50, 75, 100];

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto" role="img" aria-label={`${run.tool} radar`}>
      {/* concentric rings */}
      {rings.map((pct) => {
        const pts = MEASURES.map((_, i) => {
          const [x, y] = point(i, pct);
          return `${x},${y}`;
        }).join(" ");
        return (
          <polygon
            key={pct}
            points={pts}
            fill="none"
            stroke="var(--rule)"
            strokeDasharray={pct === 100 ? "" : "2 3"}
            opacity={pct === 100 ? 0.8 : 0.4}
          />
        );
      })}
      {/* axes */}
      {MEASURES.map((m, i) => {
        const [x, y] = point(i, 100);
        return (
          <line
            key={m.key}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="var(--rule)"
            opacity={0.5}
          />
        );
      })}
      {/* data polygon */}
      <polygon
        points={polygon}
        fill={highlight ? "var(--cyan-accent)" : "var(--cream)"}
        fillOpacity={highlight ? 0.25 : 0.12}
        stroke={highlight ? "var(--cyan-accent)" : "var(--cream)"}
        strokeWidth={1.5}
      />
      {/* data points */}
      {MEASURES.map((m, i) => {
        const [x, y] = point(i, run.scores[m.key as MeasureKey]);
        return (
          <circle
            key={m.key}
            cx={x}
            cy={y}
            r={2.5}
            fill={highlight ? "var(--cyan-accent)" : "var(--cream)"}
          />
        );
      })}
      {/* axis labels */}
      {MEASURES.map((m, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const lx = cx + Math.cos(angle) * (r + 16);
        const ly = cy + Math.sin(angle) * (r + 16);
        const anchor =
          Math.abs(Math.cos(angle)) < 0.2 ? "middle" : Math.cos(angle) > 0 ? "start" : "end";
        return (
          <text
            key={m.key}
            x={lx}
            y={ly + 3}
            textAnchor={anchor}
            className="fill-muted-foreground"
            style={{ font: "9px var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase" }}
          >
            {m.label.split(" ")[0]}
          </text>
        );
      })}
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────────
   4. COST × CORRECTNESS SCATTER
   ────────────────────────────────────────────────────────────── */
export function CostCorrectnessScatter({ runs }: { runs: ScoredRun[] }) {
  const W = 720;
  const H = 360;
  const padL = 64;
  const padR = 24;
  const padT = 28;
  const padB = 56;

  const costs = runs.map((r) => r.raw.cost);
  const minC = Math.min(...costs);
  const maxC = Math.max(...costs);
  const xFor = (c: number) =>
    padL + ((c - minC) / Math.max(maxC - minC, 0.001)) * (W - padL - padR);
  const yFor = (corr: number) => padT + (1 - corr / 100) * (H - padT - padB);

  return (
    <div className="border border-rule p-6 md:p-8 overflow-x-auto bg-foreground/[0.02]">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-4">
        FIG. 03 — COST vs. CORRECTNESS · BUBBLE = COMPOSITE
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="var(--rule)" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--rule)" />

        {/* y gridlines */}
        {[0, 25, 50, 75, 100].map((g) => {
          const y = yFor(g);
          return (
            <g key={g}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="var(--rule)"
                strokeDasharray="2 4"
                opacity={0.5}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-muted-foreground"
                style={{ font: "10px var(--font-mono)" }}
              >
                {g}
              </text>
            </g>
          );
        })}

        {/* x ticks */}
        {[minC, (minC + maxC) / 2, maxC].map((c, i) => {
          const x = xFor(c);
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={H - padB} y2={H - padB + 4} stroke="var(--rule)" />
              <text
                x={x}
                y={H - padB + 16}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ font: "10px var(--font-mono)" }}
              >
                ${c.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* axis labels */}
        <text
          x={(W + padL - padR) / 2}
          y={H - 12}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ font: "10px var(--font-mono)", letterSpacing: "0.14em" }}
        >
          COST PER OUTPUT (USD) →
        </text>
        <text
          transform={`translate(16 ${(H + padT - padB) / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-muted-foreground"
          style={{ font: "10px var(--font-mono)", letterSpacing: "0.14em" }}
        >
          ↑ CORRECTNESS (0–100)
        </text>

        {/* points */}
        {runs.map((r, i) => {
          const cx = xFor(r.raw.cost);
          const cy = yFor(r.raw.correctness);
          const radius = 6 + (r.composite / 100) * 18;
          const isWinner = i === 0;
          return (
            <g key={r.tool}>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill={isWinner ? "var(--cyan-accent)" : "var(--cream)"}
                fillOpacity={isWinner ? 0.35 : 0.12}
                stroke={isWinner ? "var(--cyan-accent)" : "var(--cream)"}
                strokeWidth={1.2}
              />
              <circle cx={cx} cy={cy} r={2.5} fill={isWinner ? "var(--cyan-accent)" : "var(--cream)"} />
              <text
                x={cx + radius + 6}
                y={cy + 3}
                className="fill-cream"
                style={{ font: "11px var(--font-serif)" }}
              >
                {r.tool}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
