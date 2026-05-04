import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BUILD_OFFS } from "@/data/build-off";
import { runBuildOffEntry } from "@/functions/build-off-runner.functions";
import type { RunResult } from "@/functions/build-off-runner.functions";

export const Route = createFileRoute("/build-off/operator")({
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
  const tieredRounds = BUILD_OFFS.filter((b) => b.tier);
  const [buildOffId, setBuildOffId] = useState<string>(tieredRounds[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [logLine, setLogLine] = useState<string>("");

  const round = BUILD_OFFS.find((b) => b.id === buildOffId);

  async function handleGenerate() {
    if (!round) return;
    setBusy(true);
    setResult(null);
    setLogLine("Calling AI gateway → uploading to S3…");
    try {
      const r = await run({ data: { buildOffId: round.id, prompt: round.prompt, tool: "soupy" } });
      setResult(r);
      setLogLine(r.ok ? `Done in ${(r.durationMs / 1000).toFixed(1)}s` : `Failed: ${r.reason}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ ok: false, reason: msg });
      setLogLine(`Error: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-cream px-6 py-12 max-w-5xl mx-auto">
      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-cyan-accent mb-2">
        § Operator console
      </div>
      <h1 className="font-serif text-4xl mb-2">Run a build-off entry</h1>
      <p className="font-serif italic text-cream/60 mb-10 max-w-2xl">
        Generates a single self-contained <code>index.html</code> via Lovable AI Gateway and uploads it to
        S3. The signed URL below is what gets dropped into the round JSON's <code>previewUrl</code>.
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
            <summary className="cursor-pointer text-cream/80">Prompt ({round.prompt.length} chars)</summary>
            <pre className="mt-2 whitespace-pre-wrap text-cream/55">{round.prompt}</pre>
          </details>
        )}

        <button
          onClick={handleGenerate}
          disabled={busy || !round}
          className="px-5 py-2.5 bg-cyan-accent text-background font-mono text-[11px] uppercase tracking-[0.14em] disabled:opacity-40"
        >
          {busy ? "Generating…" : "Generate Soupy entry"}
        </button>

        {logLine && (
          <div className="font-mono text-[11px] text-cream/55">{logLine}</div>
        )}
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
            <div>model: {result.model}</div>
            <div>bytes: {result.bytes.toLocaleString()}</div>
            <div className="break-all">key: {result.objectKey}</div>
            <div className="break-all">
              <a href={result.previewUrl} target="_blank" rel="noreferrer" className="text-cyan-accent underline">
                open signed URL ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {result && !result.ok && (
        <div className="mt-10 border border-red-400/40 bg-red-400/5 p-4 font-mono text-[12px] text-red-200">
          {result.reason}
        </div>
      )}
    </div>
  );
}
