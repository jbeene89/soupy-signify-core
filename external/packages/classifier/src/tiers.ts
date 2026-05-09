/** Map composite complexity to SACE tier (matches engine.ts thresholds). */
export function tierFromComplexity(complexity: number): 0 | 1 | 2 | 3 {
  if (complexity < 0.25) return 0;
  if (complexity < 0.5) return 1;
  if (complexity < 0.75) return 2;
  return 3;
}
