import { useEffect, useRef, useState } from "react";
import {
  AXES,
  AXIS_META,
  type Axis,
  type Modality,
  type Observation,
  type Memory,
  PROMOTE_THRESHOLD,
  decay,
  defaultChromatic,
  makeId,
  runCortex,
} from "@/lib/sace/engine";

type ScenarioId = "ambient" | "build" | "incident";

interface Scenario {
  id: ScenarioId;
  label: string;
  blurb: string;
  events: Array<{ modality: Modality; payload: string; salience: number }>;
}

const SCENARIOS: Scenario[] = [
  {
    id: "ambient",
    label: "Ambient",
    blurb: "Background chatter. Mostly trivial — should never wake the cortex.",
    events: [
      { modality: "system", payload: "heartbeat ok", salience: 0.05 },
      { modality: "text", payload: "renamed variable foo to bar", salience: 0.1 },
      { modality: "vision", payload: "cursor moved", salience: 0.05 },
      { modality: "system", payload: "cache hit", salience: 0.05 },
      { modality: "text", payload: "added comment to function", salience: 0.08 },
      { modality: "system", payload: "build passed", salience: 0.15 },
    ],
  },
  {
    id: "build",
    label: "Build task",
    blurb: "User asks for a real feature. Consensus rises across modalities.",
    events: [
      { modality: "text", payload: "user wants new auth flow", salience: 0.4 },
      { modality: "speech", payload: "we need verified login data", salience: 0.5 },
      { modality: "system", payload: "build passed for branch", salience: 0.3 },
      { modality: "text", payload: "team prefers passwordless", salience: 0.55 },
      { modality: "voice", payload: "our users are confused", salience: 0.6 },
    ],
  },
  {
    id: "incident",
    label: "Incident",
    blurb: "Something is on fire. Threat axis spikes — cortex must escalate.",
    events: [
      { modality: "system", payload: "error: service crash detected", salience: 0.8 },
      { modality: "system", payload: "alarm fired on db pool", salience: 0.9 },
      { modality: "text", payload: "danger: customers seeing failure", salience: 0.85 },
      { modality: "voice", payload: "team panic on call", salience: 0.75 },
      { modality: "vision", payload: "dashboard red across regions", salience: 0.9 },
    ],
  },
];

const MODALITY_LABEL: Record<Modality, string> = {
  vision: "VIS",
  voice: "VOX",
  speech: "SPK",
  text: "TXT",
  system: "SYS",
};

const TIER_DESC: Record<string, string> = {
  "TIER 0": "Local absorption — no external call",
  "TIER 1": "Routed to a single specialist partner",
  "TIER 2": "Composed across multiple partners",
  "TIER 3": "Frontier cortex escalation",
};

const AXIS_VAR: Record<Axis, string> = {
  red: "var(--sace-red)",
  blue: "var(--sace-blue)",
  yellow: "var(--sace-yellow)",
  green: "var(--sace-green)",
  orange: "var(--sace-orange)",
};

const RING_CAPACITY = 8;
const TICK_MS = 700;

export function SaceEngineDemo() {
  const [scenario, setScenario] = useState<ScenarioId>("build");
  const [running, setRunning] = useState(false);
  const [ring, setRing] = useState<Observation[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [chromatic, setChromatic] = useState(defaultChromatic());
  const [composite, setComposite] = useState(0);
  const [tier, setTier] = useState<string>("TIER 0");
  const [interrupts, setInterrupts] = useState(0);
  const [observed, setObserved] = useState(0);
  const [tierCrossings, setTierCrossings] = useState<Record<string, number>>({
    "TIER 0": 0,
    "TIER 1": 0,
    "TIER 2": 0,
    "TIER 3": 0,
  });
  const [tierPromotions, setTierPromotions] = useState<Record<string, number>>({
    "TIER 0": 0,
    "TIER 1": 0,
    "TIER 2": 0,
    "TIER 3": 0,
  });
  const [lastCrossing, setLastCrossing] = useState<{
    from: string;
    to: string;
    direction: "up" | "down";
    composite: number;
  } | null>(null);
  const prevTier = useRef<string>("TIER 0");

  const cursor = useRef(0);
  const lastTick = useRef<number>(Date.now());

  const current = SCENARIOS.find((s) => s.id === scenario)!;

  // reset on scenario change
  useEffect(() => {
    setRing([]);
    setMemories([]);
    setChromatic(defaultChromatic());
    setComposite(0);
    setTier("TIER 0");
    setInterrupts(0);
    setObserved(0);
    setTierCrossings({ "TIER 0": 0, "TIER 1": 0, "TIER 2": 0, "TIER 3": 0 });
    setTierPromotions({ "TIER 0": 0, "TIER 1": 0, "TIER 2": 0, "TIER 3": 0 });
    setLastCrossing(null);
    prevTier.current = "TIER 0";
    cursor.current = 0;
    lastTick.current = Date.now();
  }, [scenario]);

  useEffect(() => {
    if (!running) return;
    const iv = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;

      // 1. ingest one event from scenario (looping)
      const event = current.events[cursor.current % current.events.length];
      cursor.current += 1;
      const obs: Observation = {
        id: makeId(),
        modality: event.modality,
        payload: event.payload,
        salience: event.salience,
        capturedAt: now,
        ttlMs: 4000,
        expired: false,
        promoted: false,
      };

      setObserved((n) => n + 1);

      // 2. update ring buffer (cap, drop oldest expired)
      setRing((prev) => {
        const fresh = [...prev, obs]
          .map((o) => ({ ...o, expired: now - o.capturedAt > o.ttlMs }))
          .slice(-RING_CAPACITY);

        // 3. run cortex on the live (non-expired) window
        const live = fresh.filter((o) => !o.expired);
        if (live.length >= 2) {
          const result = runCortex(live);
          setChromatic((prevC) => {
            const decayed = decay(prevC, dt);
            // blend: max(decayed, new) per axis — interrupts spike, decay relaxes
            const merged = { ...decayed };
            for (const a of AXES) {
              merged[a] = {
                ...decayed[a],
                w: Math.max(decayed[a].w, result.chromatic[a].w),
              };
            }
            const comp =
              AXES.reduce((acc, a) => acc + merged[a].w, 0) / AXES.length;
            setComposite(Number(comp.toFixed(3)));
            // tier from blended composite
            let t: string;
            if (comp < 0.25) t = "TIER 0";
            else if (comp < 0.5) t = "TIER 1";
            else if (comp < 0.75) t = "TIER 2";
            else t = "TIER 3";
            setTier(t);
            return merged;
          });

          // 4. promote on threshold breach → cortex interrupt
          if (result.composite >= PROMOTE_THRESHOLD) {
            setInterrupts((n) => n + 1);
            setMemories((prev) =>
              [
                {
                  id: makeId("m"),
                  summary: result.summary,
                  tier: result.tier,
                  chromatic: result.chromatic,
                  composite: result.composite,
                  createdAt: now,
                  sourceCount: live.length,
                },
                ...prev,
              ].slice(0, 5),
            );
          }
        }

        return fresh;
      });
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [running, current]);

  const promotionRate = observed > 0 ? (interrupts / observed) * 100 : 0;

  return (
    <div className="border border-rule">
      {/* HEADER */}
      <div className="border-b border-rule p-5 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-2 border transition-colors ${
                scenario === s.id
                  ? "border-cyan-accent text-cyan-accent"
                  : "border-rule text-cream/70 hover:text-cream"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setRunning((r) => !r)}
          className={`font-mono text-[11px] uppercase tracking-[0.14em] px-4 py-2 transition-opacity ${
            running
              ? "border border-cream/40 text-cream hover:opacity-80"
              : "bg-cyan-accent text-primary-foreground hover:opacity-90"
          }`}
        >
          {running ? "Pause" : "Start engine"}
        </button>
      </div>

      <div className="p-5 border-b border-rule">
        <p className="font-serif italic text-[15px] text-cream/80">{current.blurb}</p>
      </div>

      {/* TELEMETRY STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-b border-rule">
        {[
          { label: "OBSERVED", value: String(observed) },
          { label: "INTERRUPTS", value: String(interrupts) },
          { label: "PROMOTION", value: `${promotionRate.toFixed(1)}%` },
          { label: "CURRENT TIER", value: tier },
        ].map((t, i) => (
          <div
            key={t.label}
            className={`p-5 ${i < 3 ? "border-r border-rule" : ""} ${i < 2 ? "border-b md:border-b-0 border-rule" : ""}`}
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              {t.label}
            </div>
            <div className="font-serif text-2xl text-cream tabular-nums mt-1">
              {t.value}
            </div>
          </div>
        ))}
      </div>

      {/* CHROMATIC VECTOR */}
      <div className="p-5 border-b border-rule">
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-4">
          CHROMATIC VECTOR · COMPOSITE {composite.toFixed(3)} · THRESHOLD {PROMOTE_THRESHOLD}
        </div>
        <div className="space-y-3">
          {AXES.map((a) => (
            <div key={a} className="grid grid-cols-[80px_1fr_50px] gap-3 items-center">
              <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-cream/80">
                {AXIS_META[a].label}
              </div>
              <div className="h-2 bg-cream/[0.06] relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 transition-all duration-500"
                  style={{
                    width: `${chromatic[a].w * 100}%`,
                    backgroundColor: AXIS_VAR[a],
                  }}
                />
                <div
                  className="absolute inset-y-0 w-px bg-cyan-accent/60"
                  style={{ left: `${PROMOTE_THRESHOLD * 100}%` }}
                />
              </div>
              <div className="font-mono text-[11px] text-cream/80 tabular-nums text-right">
                {chromatic[a].w.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {TIER_DESC[tier]}
        </div>
      </div>

      {/* RING BUFFER + MEMORIES */}
      <div className="grid md:grid-cols-2">
        <div className="p-5 border-b md:border-b-0 md:border-r border-rule">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-4">
            RING BUFFER · TTL 4s
          </div>
          {ring.length === 0 ? (
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
              § AWAITING OBSERVATIONS
            </div>
          ) : (
            <ul className="space-y-2">
              {ring.slice().reverse().map((o) => (
                <li
                  key={o.id}
                  className={`grid grid-cols-[44px_1fr_auto] gap-3 items-baseline border-l-2 pl-3 py-1 ${
                    o.expired ? "border-rule opacity-40" : "border-cyan-accent/60"
                  }`}
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-cream/70">
                    {MODALITY_LABEL[o.modality]}
                  </span>
                  <span className="font-body text-[14px] text-cream/90 truncate">
                    {o.payload}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                    s{o.salience.toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground mb-4">
            PROMOTED MEMORIES
          </div>
          {memories.length === 0 ? (
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60">
              § NO PROMOTIONS YET — MOST OBSERVATIONS EXPIRE UNREAD
            </div>
          ) : (
            <ul className="space-y-3">
              {memories.map((m) => (
                <li key={m.id} className="border border-rule p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-cyan-accent">
                      {m.tier}
                    </span>
                    <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                      composite {m.composite.toFixed(2)}
                    </span>
                  </div>
                  <div className="font-body text-[14px] text-cream/90 mt-2">
                    {m.summary}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground mt-1">
                    {TIER_DESC[m.tier]}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
