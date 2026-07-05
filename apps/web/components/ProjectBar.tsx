import { PROJECT_NAV, SITE } from "@/lib/site-nav";

/**
 * The uniform cross-property project bar — identical markup + tokens to the one
 * on tools/portal/optimiser, so every .com property shares one header. The
 * platform's own lifecycle nav (Masthead) renders directly below this.
 */
export default function ProjectBar({ current }: { current?: string }) {
  return (
    <>
    <div style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-card)" }}>
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "9px 28px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <a href={SITE.portal} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="" width={22} height={19} />
          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--color-fg-primary)" }}>
            OnlineJourno<span style={{ color: "var(--color-urgent)" }}>.</span>
          </span>
        </a>
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap", marginLeft: "auto", fontFamily: "var(--font-ui)", fontSize: 13 }}>
          {PROJECT_NAV.map((p) => {
            const isCurrent = p.label === current;
            return (
              <a
                key={p.href}
                href={p.href}
                aria-current={isCurrent ? "page" : undefined}
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontWeight: p.highlight || isCurrent ? 700 : 500,
                  color: p.highlight
                    ? "var(--color-red-700)"
                    : isCurrent
                      ? "var(--color-fg-primary)"
                      : "var(--color-fg-secondary)",
                }}
              >
                {p.highlight && (
                  <span aria-hidden="true" style={{ fontSize: 9, lineHeight: 1 }}>
                    ●
                  </span>
                )}
                {p.label}
              </a>
            );
          })}
        </nav>
      </div>
    </div>
    {/* OJDS prism band — the canonical 6px gradient header rule shared across
        every property (Galley, Daybook, Frontmatter, Tools). */}
    <div style={{ height: 6, background: "var(--brand-gradient)" }} />
    </>
  );
}
