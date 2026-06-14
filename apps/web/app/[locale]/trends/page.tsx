import {
  distinctSignalRegions,
  entityWindows,
  signalsMentioning,
  tenantIdForSlug,
  topicDomains,
} from "@/lib/db";
import { momentumLabel, topicMomentum } from "@/lib/trends";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const TOP = 12;

const LABEL_COLOR: Record<string, string> = {
  "🔥": "#dc2626",
  "↑": "#ea580c",
  "→": "#2563eb",
  "~": "#6b7280",
  "↓": "#0d9488",
};

function labelColor(label: string): string {
  return LABEL_COLOR[label.slice(0, 2).trim()] ?? "#6b7280";
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; region?: string }>;
}) {
  const { window: w, region } = await searchParams;
  const windowHours = Math.max(1, Number(w) || 24);
  const regionPick = region || null;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return null;

  const [recent, prior, regions] = await Promise.all([
    entityWindows(tenantId, windowHours, 0, regionPick),
    entityWindows(tenantId, windowHours * 2, windowHours, regionPick),
    distinctSignalRegions(tenantId),
  ]);
  const topics = topicMomentum(recent, prior).slice(0, TOP);
  const [drill, owners] = await Promise.all([
    Promise.all(
      topics.map((t) => signalsMentioning(tenantId, t.topic, windowHours, 3)),
    ),
    Promise.all(
      topics.map((t) => topicDomains(tenantId, t.topic, windowHours, 4)),
    ),
  ]);

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Trending Topics</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Trending topics
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Cross-source convergence over the enriched inflow — the same entity
          surfacing across signals is the trend. Recent {windowHours}h vs the
          prior {windowHours}h; the momentum bands are the proven
          discover-dashboard ones.
        </p>
      </header>

      <form
        method="get"
        className="mb-8 flex items-center gap-2 text-sm"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <label>
          Window:{" "}
          <select
            name="window"
            defaultValue={String(windowHours)}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            {[6, 12, 24, 48, 168].map((h) => (
              <option key={h} value={h}>
                Last {h} hours
              </option>
            ))}
          </select>
        </label>
        <label>
          Local pulse:{" "}
          <select
            name="region"
            defaultValue={regionPick ?? ""}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            <option value="">everywhere</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="px-3 py-1 border font-semibold"
          style={{ borderColor: "var(--color-rule)" }}
        >
          Apply
        </button>
      </form>

      {topics.length === 0 ? (
        <p style={{ color: "var(--color-fg-secondary)" }}>
          No enriched signals in this window — run collect + enrich, or widen
          the window.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {topics.map((t, i) => {
            const label = momentumLabel(t.momentum);
            const color = labelColor(label);
            return (
              <div
                key={t.topic}
                className="ds-panel p-4"
                style={{
                  borderLeft: `4px solid ${color}`,
                }}
              >
                <p
                  className="text-lg font-bold"
                  style={{ fontFamily: "var(--font-display)", color }}
                >
                  {label}
                </p>
                <p
                  className="text-base font-semibold"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  {t.topic}
                </p>
                <p
                  className="text-xs mt-1"
                  style={{
                    fontFamily: "var(--font-ui)",
                    color: "var(--color-fg-secondary)",
                  }}
                >
                  momentum {t.momentum} · ×{t.recent} recent vs ×{t.prior}{" "}
                  prior · {t.trajectory}
                </p>
                {owners[i].length > 0 ? (
                  <p
                    className="text-xs mt-1"
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "var(--color-fg-tertiary)",
                    }}
                    title="Which sources own coverage of this topic in the inflow (Topic → Domains)"
                  >
                    coverage:{" "}
                    {owners[i]
                      .map((o) => `${o.host} ×${o.n}`)
                      .join(" · ")}
                  </p>
                ) : null}
                {drill[i].length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {drill[i].map((s) => (
                      <li key={s.id} className="text-xs leading-snug">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "var(--color-fg-secondary)" }}
                          className="hover:underline"
                        >
                          {s.headline ?? s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
