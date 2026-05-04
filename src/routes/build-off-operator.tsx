import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BUILD_OFFS } from "@/data/build-off";
import {
  runBuildOffEntry,
  listBuildOffRuns,
  publishBuildOffRun,
  scoreBuildOffRun,
} from "@/functions/build-off-runner.functions";
import type {
  RunResult,
  RunListItem,
} from "@/functions/build-off-runner.functions";

export const Route = createFileRoute("/build-off-operator")({
  component: OperatorPage,
  head: () => ({
    meta: [
      { title: "Build-off operator · Soupy Together" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function OperatorPage() {
  const run = useServerFn(runBuildOffEntry);
  const list = useServerFn(listBuildOffRuns);
  const publish = useServerFn(publishBuildOffRun);
  const score = useServerFn(scoreBuildOffRun);

  const tieredRounds = BUILD_OFFS.filter((b) => b.tier);
  const [buildOffId, setBuildOffId] = useState<string>(tieredRounds[0]?.id ?? "");
  const [autoPublish, setAutoPublish] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [logLine, setLogLine] = useState<string>("");
  const [runs, setRuns] = useState<RunListItem[]>([]);

  const round = BUILD_OFFS.find((b) => b.id === buildOffId);

  const refreshRuns = useCallback(async () => {
    if (!round) return;
    try {
      const r = await list({ data: { buildOffId: round.id, limit: 10 } });
      setRuns(r);
    } catch {
      /* ignore */
    }
  }, [list, round]);

  useEffect(() => {
    refreshRuns();
  }, [refreshRuns]);

  async function handleGenerate() {
    if (!round) return;
    setBusy(true);
    setResult(null);
    setLogLine("Calling AI gateway → uploading to S3 → persisting…");
    try {
      const r = await run({
        data: {
          buildOffId: round.id,
          prompt: round.prompt,
          tool: "soupy",
          publish: autoPublish,
        },
      });
      setResult(r);
      setLogLine(
        r.ok
          ? `Done in ${(r.durationMs / 1000).toFixed(1)}s · ${r.published ? "published" : "saved (not published)"}`
          : `Failed: ${r.reason}`,
      );
      refreshRuns();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ ok: false, reason: msg });
      setLogLine(`Error: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  async function handlePublish(runId: string) {
    setLogLine(`Publishing ${runId.slice(0, 8)}…`);
    const r = await publish({ data: { runId } });
    setLogLine(r.ok ? "Published." : `Publish failed: ${r.reason}`);
    refreshRuns();
  }

  const stableUrl = round
    ? `/api/public/build-off/preview/${round.id}/soupy`
    : "";

  return (
    <div className="min-h-screen bg-background text-cream px-6 py-12 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent">
          § Operator console
        </div>
        <Link
          to="/build-off"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-cream/60 hover:text-cyan-accent border border-rule px-3 py-1.5"
        >
          ← Back to result board
        </Link>
      </div>
      <h1 className="font-serif text-4xl mb-2">Run a build-off entry</h1>
      <p className="font-serif italic text-cream/60 mb-10 max-w-2xl">
        Generates a single self-contained <code>index.html</code>, uploads to S3, and
        records the run in the database. Published runs are served via a stable
        re-signing URL so the showcase iframe never expires.
      </p>

      <div className="border border-rule p-6 space-y-5">
        <label className="block">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-cream/55 mb-2">
            Round
          </div>
          <select
            value={buildOffId}
            onChange={(e) => setBuildOffId(e.target.value)}
            className="w-full bg-foreground/5 border border-rule px-3 py-2 font-mono text-sm"
          >
            {tieredRounds.map((b) => (
              <option key={b.id} value={b.id}>
                Tier {b.tier} · {b.title}
              </option>
            ))}
          </select>
        </label>

        {round && (
          <details className="font-mono text-[12px] text-cream/60">
            <summary className="cursor-pointer text-cream/80">
              Prompt ({round.prompt.length} chars)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-cream/55">{round.prompt}</pre>
          </details>
        )}

        <label className="flex items-center gap-2 font-mono text-[11px] text-cream/70">
          <input
            type="checkbox"
            checked={autoPublish}
            onChange={(e) => setAutoPublish(e.target.checked)}
          />
          Publish on success (replaces current published entry)
        </label>

        <button
          onClick={handleGenerate}
          disabled={busy || !round}
          className="px-5 py-2.5 bg-cyan-accent text-background font-mono text-[11px] uppercase tracking-[0.14em] disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate Soupy entry"}
        </button>

        {logLine && <div className="font-mono text-[11px] text-cream/55">{logLine}</div>}
      </div>

      {result?.ok && (
        <div className="mt-10">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-accent mb-2">
            § Live preview
          </div>
          <div className="border border-rule">
            <iframe
              src={result.previewUrl}
              title="Generated entry"
              sandbox="allow-scripts"
              className="w-full aspect-video bg-foreground/5"
            />
          </div>
          <div className="mt-4 font-mono text-[11px] text-cream/55 space-y-1">
            <div>run: {result.runId}</div>
            <div>model: {result.model}</div>
            <div>bytes: {result.bytes.toLocaleString()}</div>
            <div className="break-all">key: {result.objectKey}</div>
          </div>
        </div>
      )}

      {result && !result.ok && (
        <div className="mt-10 border border-red-400/40 bg-red-400/5 p-4 font-mono text-[12px] text-red-200">
          {result.reason}
        </div>
      )}

      <div className="mt-12">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-accent">
              § Recent runs
            </div>
            <div className="font-mono text-[11px] text-cream/55">{round?.id}</div>
          </div>
          {round && (
            <a
              href={stableUrl}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-[11px] text-cyan-accent underline"
            >
              stable preview URL ↗
            </a>
          )}
        </div>
        <div className="border border-rule divide-y divide-rule">
          {runs.length === 0 && (
            <div className="p-4 font-mono text-[11px] text-cream/45">No runs yet.</div>
          )}
          {runs.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-4 p-3 font-mono text-[11px]"
            >
              <div className="flex-1 min-w-0">
                <div className="text-cream/85">
                  {r.tool} · {r.model} · {(r.durationMs / 1000).toFixed(1)}s · {r.bytes.toLocaleString()}b
                </div>
                <div className="text-cream/45 truncate">{r.objectKey}</div>
                <div className="text-cream/35">{new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-3">
                {r.isPublished ? (
                  <span className="text-cyan-accent uppercase tracking-[0.14em] text-[10px]">
                    ● published
                  </span>
                ) : (
                  <button
                    onClick={() => handlePublish(r.id)}
                    className="text-[10px] uppercase tracking-[0.14em] text-cream/70 hover:text-cyan-accent"
                  >
                    publish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
