// Canonical letter grade — TS mirror of the single A–F band table.
// Python source of truth: packages/agents-py/src/onlinejourno_agents/grades.py
// (and onlinejourno_scoring/grades.py, vendored per product). Pinned by the shared
// cases in grades.test.ts. Everything that turns a 0–100 score into a letter
// (Galley, The Audit, Frontmatter, Newsroom) uses these bands — don't fork them.

// (threshold, letter) high→low. The one source of truth.
export const GRADE_BANDS: ReadonlyArray<readonly [number, string]> = [
  [80, "A"],
  [65, "B"],
  [50, "C"],
  [35, "D"],
];

// 0–100 score → A/B/C/D/F. null/undefined → "F" (no signal). MUST match
// grades.py::letter_grade.
export function letterGrade(score: number | null | undefined): string {
  if (score == null) return "F";
  for (const [threshold, letter] of GRADE_BANDS) {
    if (score >= threshold) return letter;
  }
  return "F";
}
