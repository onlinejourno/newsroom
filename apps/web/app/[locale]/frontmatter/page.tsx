import { storiesWithScores } from "@/lib/db";
import { assess, signalsFromStory } from "@/lib/frontmatter";
import { currentTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

// Deserving-but-failing thresholds (tunable). merit floor so we champion work
// that is genuinely meritorious; gap floor so reach visibly lags merit.
const MERIT_FLOOR = 55;
const GAP_FLOOR = 12;

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <span
      className="inline-block h-2 rounded-full align-middle"
      style={{ width: 120, background: "var(--color-rule)" }}
    >
      <span
        className="block h-2 rounded-full"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }}
      />
    </span>
  );
}

export default async function FrontmatterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await currentTenantId();
  if (!tenantId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="ds-label">Database is not seeded.</p>
      </main>
    );
  }

  const stories = await storiesWithScores(tenantId, 300);
  const ranked = stories
    .map((st) => ({ st, a: assess(signalsFromStory(st)) }))
    .filter(({ a }) => a.merit >= MERIT_FLOOR && a.gap >= GAP_FLOOR)
    .sort((x, y) => y.a.gap - x.a.gap);
  const shown = ranked.slice(0, 25); // ranked by widest gap; cap the champion list

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Frontmatter</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Merit should travel.
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-secondary)" }}
        >
          Your own strong work that <strong>isn&rsquo;t reaching</strong> — ranked by
          the gap between how good it is (merit: depth + authority) and how far it
          travels (reach: surface-readiness + placement). Each one says why it&rsquo;s
          stuck and what fixes it. {ranked.length} deserving stor
          {ranked.length === 1 ? "y" : "ies"} under-reaching.
          {ranked.length > shown.length ? ` Showing the ${shown.length} widest gaps.` : ""}
        </p>
      </header>

      {ranked.length === 0 ? (
        <p
          className="text-base"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-secondary)" }}
        >
          Nothing flagged: either every strong story is already travelling, or the
          audit hasn&rsquo;t scored enough published work yet. Run the Story Scores
          audit, then check back.
        </p>
      ) : (
        <ol className="space-y-4 list-none">
          {shown.map(({ st, a }) => (
            <li key={st.id} className="ds-frame p-4">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="ds-meta">
                  {[st.section, st.beat].filter(Boolean).join(" · ") || "—"}
                </p>
                <span className="ds-meta" style={{ color: "var(--color-urgent)" }}>
                  gap +{a.gap}
                </span>
              </div>
              <a
                href={st.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xl font-bold leading-snug mt-1"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}
              >
                {st.headline ?? st.url}
              </a>

              {/* merit vs reach */}
              <div
                className="mt-3 grid gap-x-4 gap-y-1 text-sm items-center"
                style={{ gridTemplateColumns: "auto 1fr auto", fontFamily: "var(--font-ui)" }}
              >
                <span style={{ color: "var(--color-fg-secondary)" }}>Merit</span>
                <Bar value={a.merit} color="var(--color-ioj-green-600)" />
                <span className="font-semibold">{a.merit}</span>
                <span style={{ color: "var(--color-fg-secondary)" }}>Reach</span>
                <Bar value={a.reach} color="var(--color-ink-400)" />
                <span className="font-semibold">{a.reach}</span>
              </div>
              <p className="mt-1 text-xs" style={{ color: "var(--color-fg-tertiary)", fontFamily: "var(--font-ui)" }}>
                merit = depth {a.meritParts.depth ?? "—"} · authority {a.meritParts.authority ?? "—"} ·
                reach = surface-readiness {a.reachParts.readiness} · placement {a.reachParts.placement}
              </p>

              {/* why + fix — ground-up */}
              {a.whies.length > 0 ? (
                <div className="mt-3 ds-panel p-3 text-sm" style={{ fontFamily: "var(--font-ui)" }}>
                  <p className="ds-meta mb-1">Why it isn&rsquo;t travelling — and the fix</p>
                  <ul className="space-y-1.5">
                    {a.whies.map((why, i) => (
                      <li key={why}>
                        <span style={{ color: "var(--color-fg-primary)" }}>{why}</span>{" "}
                        <span style={{ color: "var(--color-fg-secondary)" }}>→ {a.fixes[i]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-3 text-xs flex flex-wrap gap-4" style={{ fontFamily: "var(--font-ui)" }}>
                {st.url ? (
                  <a className="underline" href={st.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-fg-tertiary)" }}>
                    read ↗
                  </a>
                ) : null}
                {st.url ? (
                  <a
                    className="underline"
                    href={`/${locale}/scores?url=${encodeURIComponent(st.url)}&probity=1`}
                    style={{ color: "var(--color-brand)" }}
                  >
                    audit + fix ↗
                  </a>
                ) : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
