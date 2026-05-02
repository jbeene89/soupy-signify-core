import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_RANKS,
  FEATURED_CATEGORY_ID,
  slugifyTool,
  type CategoryId,
} from "@/data/build-off-categories";
import { readPicks, setPick, clearPick, subscribe, type Picks } from "@/lib/picks";

const RANK_LABEL: Record<1 | 2 | 3, string> = {
  1: "1ST",
  2: "2ND",
  3: "3RD",
};
const RANK_TONE: Record<1 | 2 | 3, string> = {
  1: "text-cyan-accent border-cyan-accent",
  2: "text-cream/85 border-cream/40",
  3: "text-amber-300 border-amber-300/60",
};

function originOrEmpty(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function badgeUrl(category: CategoryId, rank: 1 | 2 | 3, tool: string): string {
  return `${originOrEmpty()}/api/badge/${category}/${rank}/${slugifyTool(tool)}.svg`;
}

function embedSnippet(category: CategoryId, rank: 1 | 2 | 3, tool: string, categoryLabel: string): string {
  const url = badgeUrl(category, rank, tool);
  const alt = `Soupy Together Build-Off · ${RANK_LABEL[rank]} Place · ${categoryLabel}`;
  return `<a href="${originOrEmpty()}/#build-off">
  <img src="${url}" alt="${alt}" width="320" height="120" />
</a>`;
}

export function HomeBuildOff() {
  const [activeId, setActiveId] = useState<CategoryId>(FEATURED_CATEGORY_ID);
  const [picks, setPicks] = useState<Picks>({});
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setPicks(readPicks());
    const off = subscribe(() => setPicks(readPicks()));
    return off;
  }, []);

  const active = useMemo(
    () => CATEGORIES.find((c) => c.id === activeId)!,
    [activeId],
  );
  const ranks = CATEGORY_RANKS[activeId];

  function pickFor(cat: CategoryId, tool: string) {
    if (picks[cat] === tool) {
      setPicks(clearPick(cat));
    } else {
      setPicks(setPick(cat, tool));
    }
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      {/* CATEGORY TABS */}
      <div
        role="tablist"
        aria-label="Build-Off categories"
        className="mt-10 flex flex-wrap gap-2 border-b border-rule pb-3"
      >
        {CATEGORIES.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveId(c.id)}
              className={`font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-2 border transition-colors ${
                isActive
                  ? "bg-cyan-accent text-primary-foreground border-cyan-accent"
                  : "border-rule text-cream/70 hover:text-cream hover:border-cream/40"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ACTIVE CATEGORY HEADER */}
      <div className="mt-8 grid md:grid-cols-[2fr_1fr] gap-8 items-start">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
            § ROUND {String(ranks.round).padStart(3, "0")} ·{" "}
            {ranks.status === "verified" ? "VERIFIED" : "SAMPLE"} · {ranks.date}
          </div>
          <h3 className="font-serif text-2xl md:text-3xl text-cream mt-2">
            {active.label}
          </h3>
          <p className="font-serif italic text-cream/80 text-[16px] mt-2 max-w-2xl leading-snug">
            {active.skill} {active.description}
          </p>
        </div>
        <div className="border border-rule p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            YOUR PICK FOR THIS CATEGORY
          </div>
          <div className="font-serif text-lg text-cream mt-2">
            {picks[activeId] ?? <span className="text-cream/40 italic">— not chosen —</span>}
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-3">
            saved locally · used as a routing hint on /demo
          </p>
        </div>
      </div>

      {/* PODIUM */}
      <div className="mt-8 grid md:grid-cols-3 gap-4">
        {ranks.podium.map((entry, i) => {
          const rank = (i + 1) as 1 | 2 | 3;
          const url = badgeUrl(activeId, rank, entry.tool);
          const snippet = embedSnippet(activeId, rank, entry.tool, active.label);
          const isPicked = picks[activeId] === entry.tool;
          return (
            <article
              key={entry.tool}
              className={`border ${RANK_TONE[rank]} p-5 flex flex-col gap-3`}
            >
              <div className="flex items-baseline justify-between">
                <span className={`font-mono text-[11px] uppercase tracking-[0.14em] ${RANK_TONE[rank].split(" ")[0]}`}>
                  {RANK_LABEL[rank]} PLACE
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  RANK {rank}
                </span>
              </div>
              <h4 className="font-serif text-xl text-cream">{entry.tool}</h4>
              <p className="font-serif italic text-[14px] text-cream/75 leading-snug">
                {entry.note}
              </p>

              {/* BADGE PREVIEW */}
              <div className="border border-rule bg-foreground/[0.02] p-2">
                <img
                  src={url}
                  alt={`Soupy Together Build-Off ${RANK_LABEL[rank]} Place — ${active.label} — ${entry.tool}`}
                  width={320}
                  height={120}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(snippet, `${entry.tool}-embed`)}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border border-rule text-cream/80 hover:text-cream hover:border-cream/40 transition-colors"
                >
                  {copied === `${entry.tool}-embed` ? "Copied ✓" : "Copy embed"}
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border border-rule text-cream/80 hover:text-cream hover:border-cream/40 transition-colors"
                >
                  Badge SVG ↗
                </a>
                <button
                  type="button"
                  onClick={() => pickFor(activeId, entry.tool)}
                  className={`font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border transition-colors ${
                    isPicked
                      ? "bg-cyan-accent text-primary-foreground border-cyan-accent"
                      : "border-cyan-accent/60 text-cyan-accent hover:bg-cyan-accent/10"
                  }`}
                >
                  {isPicked ? "✓ My pick" : "Pick this tool"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* HONORABLE MENTIONS */}
      {ranks.honorableMentions && ranks.honorableMentions.length > 0 && (
        <div className="mt-6 border border-rule border-dashed p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-2">
            HONORABLE MENTIONS
          </div>
          <ul className="grid sm:grid-cols-2 gap-3">
            {ranks.honorableMentions.map((hm) => (
              <li key={hm.tool} className="flex items-baseline gap-2">
                <span className="font-serif text-cream">{hm.tool}</span>
                <span className="font-serif italic text-cream/60 text-[14px]">
                  {hm.note}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PICKS SUMMARY */}
      <div className="mt-10 border-t border-rule pt-6">
        <div className="flex items-baseline justify-between flex-wrap gap-3">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
              § YOUR ROUTING PREFERENCES
            </div>
            <p className="font-serif italic text-cream/75 text-[15px] mt-1 max-w-2xl">
              Your picks travel with you to the demo. The router uses them as
              hints — budget and availability still get the final word.
            </p>
          </div>
          {Object.keys(picks).length > 0 && (
            <button
              type="button"
              onClick={() => {
                CATEGORIES.forEach((c) => clearPick(c.id));
                setPicks({});
              }}
              className="font-mono text-[10px] uppercase tracking-[0.12em] px-3 py-2 border border-rule text-cream/70 hover:text-cream hover:border-cream/40"
            >
              Clear all picks
            </button>
          )}
        </div>

        <ul className="mt-4 grid sm:grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <li
              key={c.id}
              className="flex items-baseline justify-between gap-3 border-b border-rule/60 py-2"
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                {c.label}
              </span>
              <span className="font-serif text-cream text-[15px]">
                {picks[c.id] ?? <span className="text-cream/30 italic">—</span>}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
