/**
 * Feature extraction for the SACE classifier.
 * Pure: prompt string → keyword density + complexity score.
 */

export interface PromptFeatures {
  ui: number;
  code: number;
  data: number;
  reasoning: number;
  multimodal: number;
  creative: number;
  safety: number;
  /** Composite 0..1 from prompt length + feature density. */
  complexity: number;
}

export const FEATURE_KEYWORDS: Record<keyof Omit<PromptFeatures, "complexity">, string[]> = {
  ui: [
    "button", "form", "page", "ui", "layout", "color", "dark mode", "theme", "modal",
    "navbar", "menu", "responsive", "design", "css", "tailwind", "component",
    "dropdown", "card", "hero", "landing"
  ],
  code: [
    "function", "api", "endpoint", "refactor", "bug", "test", "typescript", "react",
    "hook", "state", "fetch", "async", "implement", "build", "create", "add",
    "to-do", "todo", "todo list", "list"
  ],
  data: [
    "database", "table", "query", "csv", "json", "schema", "rls", "supabase",
    "postgres", "sql", "aggregate", "report", "chart", "dashboard", "analytics",
    "metric", "count"
  ],
  reasoning: [
    "plan", "compare", "decide", "tradeoff", "trade-off", "architecture", "design doc",
    "strategy", "evaluate", "analyze", "why", "should i", "explain", "reasoning",
    "optimize", "complex", "multi-step"
  ],
  multimodal: [
    "image", "photo", "video", "screenshot", "transcribe", "ocr", "pdf", "vision",
    "audio", "speech", "voice"
  ],
  creative: [
    "story", "poem", "rewrite", "tone", "creative", "marketing", "copy", "headline",
    "tagline", "brand", "name"
  ],
  safety: [
    "auth", "login", "password", "secret", "token", "permission", "role", "rls",
    "security", "encrypt", "sign in", "sign-up", "signup", "user", "session"
  ]
};

export function extractFeatures(prompt: string): PromptFeatures {
  const t = prompt.toLowerCase();
  const score = (kws: string[]): number => {
    let s = 0;
    for (const kw of kws) if (t.includes(kw)) s += 1;
    return Math.min(s / 4, 1);
  };

  const ui = score(FEATURE_KEYWORDS.ui);
  const code = score(FEATURE_KEYWORDS.code);
  const data = score(FEATURE_KEYWORDS.data);
  const reasoning = score(FEATURE_KEYWORDS.reasoning);
  const multimodal = score(FEATURE_KEYWORDS.multimodal);
  const creative = score(FEATURE_KEYWORDS.creative);
  const safety = score(FEATURE_KEYWORDS.safety);

  const lengthFactor = Math.min(prompt.trim().length / 280, 1);
  const featureDensity = (ui + code + data + reasoning + multimodal + creative + safety) / 7;
  const complexity = Number(
    Math.min(1, lengthFactor * 0.55 + featureDensity * 0.45 + reasoning * 0.2).toFixed(3)
  );

  return { ui, code, data, reasoning, multimodal, creative, safety, complexity };
}
