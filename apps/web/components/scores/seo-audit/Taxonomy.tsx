import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TaxonomyData {
  section_path: string;
  topic: string;
  tags: string[];
}

export interface TaxonomyProps {
  taxonomy: TaxonomyData;
}

// ── Main component ────────────────────────────────────────────────────────────

export function Taxonomy({ taxonomy }: TaxonomyProps) {
  const { section_path, topic, tags } = taxonomy;

  // Skip gracefully if all empty
  const hasContent = section_path || topic || tags.length > 0;
  if (!hasContent) return null;

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-3">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Taxonomy
        </h2>
      </div>

      <div
        className="ds-panel px-4 py-3 flex flex-col gap-2"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {/* Section path */}
        {section_path && (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--color-fg-tertiary)", whiteSpace: "nowrap" }}
            >
              Section path
            </span>
            <span
              className="text-sm font-mono"
              style={{ color: "var(--color-fg-primary)", fontFamily: "var(--font-mono)" }}
            >
              {section_path}
            </span>
          </div>
        )}

        {/* Topic */}
        {topic && (
          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "var(--color-fg-tertiary)", whiteSpace: "nowrap" }}
            >
              Topic
            </span>
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-fg-primary)" }}
            >
              {topic}
            </span>
          </div>
        )}

        {/* Tags — pill strip */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tags.map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="inline-flex items-center px-2 py-0.5 text-xs font-semibold"
                style={{
                  background: "var(--color-border)",
                  color: "var(--color-fg-secondary)",
                  fontFamily: "var(--font-ui)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
