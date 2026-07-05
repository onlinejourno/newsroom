import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches youtube.py `search_queries()` return:
//   { available: true,  queries: string[], angles: string[] }
//   { available: false, reason?: string,   queries: [], angles: [] }

export interface YouTubeQueriesData {
  available: boolean;
  queries?: string[];
  angles?: string[];
  reason?: string;
}

export interface YouTubeQueriesProps {
  youtube: YouTubeQueriesData;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function YouTubeQueries({ youtube }: YouTubeQueriesProps) {
  if (!youtube.available) return null;

  const queries = youtube.queries ?? [];
  const angles = youtube.angles ?? [];
  if (queries.length === 0 && angles.length === 0) return null;

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          YouTube Search Queries
        </h2>
      </div>

      <div className="ds-panel px-4 py-4 flex flex-col gap-4">
        {/* Search queries list */}
        {queries.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-fg-tertiary)" }}
            >
              What viewers search on YouTube
            </p>
            <ul className="flex flex-wrap gap-2">
              {queries.map((q, i) => (
                <li
                  key={i}
                  className="inline-flex items-center px-3 py-1 text-xs"
                  style={{
                    background: "var(--color-bg-subtle, var(--color-bg))",
                    border: "1px solid var(--color-border)",
                    color: "var(--color-fg-primary)",
                    fontFamily: "var(--font-ui)",
                  }}
                >
                  {q}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content angle tags */}
        {angles.length > 0 && (
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--color-fg-tertiary)" }}
            >
              Content angles trending on YouTube
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
    </section>
  );
}
