import { entityWindows, storiesWithScores, tenantIdForSlug } from "@/lib/db";
import { topicMomentum, type TopicTrend } from "@/lib/trends";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const TREND_WINDOW_HOURS = 48;

// A hidden gem (prototype tab 6): a published story aligned with a moving
// topic whose audit says it is not yet built for its chance — high momentum,
// low composite = unrealised potential.
type Gem = {
  id: string;
  headline: string | null;
  url: string | null;
  section: string | null;
  composite: number;
  topic: string;
  momentum: number;
  gemScore: number;
  label: "💎 HIGH" | "✨ MEDIUM" | "📄 LOW";
  action: "promote" | "optimise";
  fixes: string[];
};

function composite(scores: Record<string, { score: number }>): number {
  const vals = Object.values(scores).map((s) => s.score);
  return vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 0;
}

function labelFor(score: number): Gem["label"] {
  if (score >= 45) return "💎 HIGH";
  if (score >= 20) return "✨ MEDIUM";
  return "📄 LOW";
}

export default async function GemsPage() {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return null;

  const [stories, recent, prior] = await Promise.all([
    storiesWithScores(tenantId),
    entityWindows(tenantId, TREND_WINDOW_HOURS, 0),
    entityWindows(tenantId, TREND_WINDOW_HOURS * 2, TREND_WINDOW_HOURS),
  ]);
  const topics = topicMomentum(recent, prior).slice(0, 60);

  const gems: Gem[] = [];
  for (const story of stories) {
    const text = (story.headline ?? "").toLowerCase();
    if (!text) continue;
    let best: TopicTrend | null = null;
    for (const t of topics) {
      if (t.topic.length < 3) continue;
      if (text.includes(t.topic.toLowerCase())) {
        if (!best || t.momentum > best.momentum) best = t;
      }
    }
    if (!best) continue;
    const comp = composite(story.scores);
    const gemScore = Math.round((best.momentum * (100 - comp)) / 100);
    gems.push({
      id: story.id,
      headline: story.headline,
      url: story.url,
      section: story.section,
      composite: comp,
      topic: best.topic,
      momentum: best.momentum,
      gemScore,
      label: labelFor(gemScore),
      action: comp >= 65 ? "promote" : "optimise",
      fixes: Object.values(story.scores)
        .map((s) => s.top_fix)
        .filter((f): f is string => Boolean(f))
        .slice(0, 3),
    });
  }
  gems.sort((a, b) => b.gemScore - a.gemScore);

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Hidden Gems</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Hidden gems
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Published stories aligned with a topic that is moving in the signal
          inflow, whose audit says they are not yet built for their chance —
          unrealised potential, with the fix list. Trend window: last{" "}
          {TREND_WINDOW_HOURS}h.
        </p>
      </header>

      {gems.length === 0 ? (
        <p style={{ color: "var(--color-fg-secondary)" }}>
          No gems right now — no scored story overlaps a moving topic in the
          window. Pull more own stories (<code>cms-pull</code>) or widen the
          trend window.
        </p>
      ) : (
        <ol className="space-y-4 list-none">
          {gems.map((g) => (
            <li
              key={g.id}
              className="rounded-sm border p-4"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg-card)",
              }}
            >
              <div
                className="flex items-baseline justify-between gap-3 flex-wrap"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                <span className="text-sm font-bold">{g.label}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-sm font-bold uppercase"
                  style={{
                    background:
                      g.action === "promote" ? "#16a34a22" : "#b4530922",
                    color: g.action === "promote" ? "#16a34a" : "#b45309",
                  }}
                >
                  {g.action}
                </span>
              </div>
              <a
                href={g.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-lg leading-snug block mt-1"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {g.headline}
              </a>
              <p
                className="text-xs mt-1"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--color-fg-secondary)",
                }}
              >
                {g.section ? `${g.section} · ` : ""}gem {g.gemScore} · topic{" "}
                <strong>{g.topic}</strong> (momentum {g.momentum}) · audit
                composite {g.composite}
              </p>
              {g.action === "optimise" && g.fixes.length > 0 ? (
                <ul
                  className="mt-2 text-xs space-y-0.5"
                  style={{
                    fontFamily: "var(--font-ui)",
                    color: "var(--color-fg-secondary)",
                  }}
                >
                  {g.fixes.map((f) => (
                    <li key={f}>· {f}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
