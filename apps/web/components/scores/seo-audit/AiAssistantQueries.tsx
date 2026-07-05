import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches ai_queries.py `reader_questions()` return:
//   { available: true,  questions: string[], search_angles: string[],
//     by_intent: Record<string, string[]> }
//   { available: false, reason?: string,     questions: [], search_angles: [] }

export interface AiQueriesData {
  available: boolean;
  questions?: string[];
  search_angles?: string[];
  reason?: string;
}

export interface AiAssistantQueriesProps {
  ai_queries: AiQueriesData;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AiAssistantQueries({ ai_queries }: AiAssistantQueriesProps) {
  if (!ai_queries.available) return null;

  const questions = ai_queries.questions ?? [];
  const angles = ai_queries.search_angles ?? [];
  if (questions.length === 0 && angles.length === 0) return null;

  const hasTwo = questions.length > 0 && angles.length > 0;

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          What People Ask AI Assistants
        </h2>
      </div>

      <div className="ds-panel px-4 py-4 flex flex-col gap-4">
        {/* Explainer */}
        <p
          className="text-xs"
          style={{ color: "var(--color-fg-secondary)", fontFamily: "var(--font-ui)" }}
        >
          Real queries readers type into Claude, ChatGPT, and Perplexity about
          this topic — surfaced via Google Suggest question-word prefixes.
        </p>

        {/* Two-column layout when both lists are present; single-column otherwise */}
        <div
          className={hasTwo ? "grid gap-4" : "flex flex-col gap-4"}
          style={hasTwo ? { gridTemplateColumns: "1fr 1fr" } : undefined}
        >
          {/* What readers ask */}
          {questions.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-fg-tertiary)" }}
              >
                What readers ask
              </p>
              <ol className="flex flex-col gap-1">
                {questions.map((q, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs"
                    style={{ color: "var(--color-fg-primary)" }}
                  >
                    <span
                      className="font-bold tabular-nums shrink-0"
                      style={{
                        color: "var(--color-fg-tertiary)",
                        fontFamily: "var(--font-mono)",
                        minWidth: "1.25rem",
                      }}
                    >
                      {i + 1}.
                    </span>
                    <span>{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Search angles to cover */}
          {angles.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--color-fg-tertiary)" }}
              >
                Search angles to cover
              </p>
              <ul className="flex flex-wrap gap-2">
                {angles.map((a, i) => (
                  <li
                    key={i}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold"
                    style={{
                      background: "var(--color-brand-bg)",
                      border: "1px solid var(--color-brand)",
                      color: "var(--color-brand-dark)",
                      fontFamily: "var(--font-ui)",
                    }}
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
