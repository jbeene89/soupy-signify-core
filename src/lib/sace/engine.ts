/**
 * SACE — Significance-Aware Cognitive Engine (in-browser demo build)
 *
 * Self-contained, deterministic simulation of the engine described in the
 * SACE whitepaper. No DB, no LLM call. Ports the cortex synthesis logic
 * from the reference implementation so the §03 demo behaves like the real
 * engine: ring-buffer observations, polychromatic decay, consensus check,
 * threshold-driven cortex escalation.
 */

export type Modality = "vision" | "voice" | "speech" | "text" | "system";
export type Axis = "red" | "blue" | "yellow" | "green" | "orange";
export type Tier = "TIER 0" | "TIER 1" | "TIER 2" | "TIER 3";

export const AXES: Axis[] = ["red", "blue", "yellow", "green", "orange"];

export const AXIS_META: Record<Axis, { label: string; meaning: string }> = {
  red:    { label: "Red",    meaning: "Threat / urgency" },
  blue:   { label: "Blue",   meaning: "Truth / reliability" },
  yellow: { label: "Yellow", meaning: "Novelty / surprise" },
  green:  { label: "Green",  meaning: "Reward / preference" },
  orange: { label: "Orange", meaning: "Social / affiliation" },
};

export interface Observation {
  id: string;
  modality: Modality;
  payload: string;
  salience: number; // 0..1
  capturedAt: number; // ms epoch
  ttlMs: number;
  expired: boolean;
  promoted: boolean;
}

export interface ChromaticAxis { w: number; h: number; f: number }
export type ChromaticVector = Record<Axis, ChromaticAxis>;

export interface Memory {
  id: string;
  summary: string;
  tier: Tier;
  chromatic: ChromaticVector;
  composite: number;
  createdAt: number;
  sourceCount: number;
}

const MODALITY_AXIS_BIAS: Record<Modality, Partial<Record<Axis, number>>> = {
  vision: { red: 0.7, yellow: 0.6, orange: 0.4 },
  voice:  { orange: 0.8, green: 0.4, blue: 0.3 },
  speech: { blue: 0.7, green: 0.4, yellow: 0.3 },
  text:   { blue: 0.6, green: 0.5, yellow: 0.3 },
  system: { blue: 0.5, red: 0.4 },
};

const KEYWORD_BUMPS: Array<{ axis: Axis; words: string[] }> = [
  { axis: "red",    words: ["alarm", "fire", "danger", "warning", "stop", "panic", "loud", "error", "fail", "crash"] },
  { axis: "blue",   words: ["confirm", "verified", "true", "exact", "data", "sensor", "log", "build", "passed"] },
  { axis: "yellow", words: ["new", "first", "unknown", "strange", "novel", "weird", "unexpected"] },
  { axis: "green",  words: ["good", "win", "reward", "thanks", "love", "yes", "preferred", "ship", "deploy"] },
  { axis: "orange", words: ["mom", "friend", "we", "us", "team", "family", "they", "user", "customer"] },
];

export function defaultChromatic(): ChromaticVector {
  return {
    red:    { w: 0, h: 3600, f: 0.05 },
    blue:   { w: 0, h: 7200, f: 0.05 },
    yellow: { w: 0, h: 1800, f: 0.05 },
    green:  { w: 0, h: 86400, f: 0.1 },
    orange: { w: 0, h: 600,  f: 0.02 },
  };
}

function keywordScore(axis: Axis, text: string): number {
  const t = text.toLowerCase();
  const bump = KEYWORD_BUMPS.find((k) => k.axis === axis);
  if (!bump) return 0;
  let s = 0;
  for (const w of bump.words) if (t.includes(w)) s += 0.18;
  return Math.min(s, 0.6);
}

export interface CortexResult {
  summary: string;
  chromatic: ChromaticVector;
  composite: number;
  tier: Tier;
}

/** Run the deterministic mock cortex over a window of observations. */
export function runCortex(obs: Observation[]): CortexResult {
  const chromatic = defaultChromatic();
  // consensus per modality: fraction of observations of that modality
  const counts: Partial<Record<Modality, number>> = {};
  for (const o of obs) counts[o.modality] = (counts[o.modality] ?? 0) + 1;
  const total = obs.length || 1;
  const consensus: Partial<Record<Modality, number>> = {};
  for (const m of Object.keys(counts) as Modality[]) {
    consensus[m] = (counts[m] ?? 0) / total;
  }

  for (const axis of AXES) {
    let w = 0;
    for (const o of obs) {
      const bias = MODALITY_AXIS_BIAS[o.modality]?.[axis] ?? 0.1;
      const cons = consensus[o.modality] ?? 0;
      const kw = keywordScore(axis, o.payload);
      w += bias * 0.4 + cons * 0.4 + kw + o.salience * 0.2;
    }
    const final = Math.max(0, Math.min(1, w / Math.max(obs.length, 1)));
    chromatic[axis].w = Number(final.toFixed(4));
  }

  const composite = AXES.reduce((a, x) => a + chromatic[x].w, 0) / AXES.length;

  // Tier classification — composite score determines escalation depth
  let tier: Tier;
  if (composite < 0.25) tier = "TIER 0";
  else if (composite < 0.5) tier = "TIER 1";
  else if (composite < 0.75) tier = "TIER 2";
  else tier = "TIER 3";

  const top = AXES.map((a) => ({ a, w: chromatic[a].w }))
    .sort((x, y) => y.w - x.w)
    .slice(0, 2)
    .map((x) => x.a);

  const mods = Array.from(new Set(obs.map((o) => o.modality)));
  const summary = `[${top.join("+")}] ${mods.join("/")} — ${obs.length} obs`;

  return { summary, chromatic, composite: Number(composite.toFixed(4)), tier };
}

/** Apply chromatic decay over elapsed seconds — w → max(f, w * 0.5^(dt/h)). */
export function decay(c: ChromaticVector, dtSec: number): ChromaticVector {
  const out = { ...c } as ChromaticVector;
  for (const a of AXES) {
    const ax = c[a];
    const decayed = ax.w * Math.pow(0.5, dtSec / ax.h);
    out[a] = { ...ax, w: Math.max(ax.f, Number(decayed.toFixed(4))) };
  }
  return out;
}

export const PROMOTE_THRESHOLD = 0.45;

let idCounter = 0;
export function makeId(prefix = "o"): string {
  idCounter += 1;
  return `${prefix}_${idCounter.toString(36)}`;
}
