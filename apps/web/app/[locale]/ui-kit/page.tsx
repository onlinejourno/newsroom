import { PageHeader } from "@/components/ui/page-header";
import { ScoreBadge } from "@/components/ui/score-badge";

export const dynamic = "force-static";

export default async function UiKitPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await params;
  return (
    <main className="ds-page-narrow">
      <PageHeader
        eyebrow="OnlineJourno · UI Kit"
        title="Design primitives"
        deck="Canonical tokens, .ds-* utilities, and the shared React primitives. Build on these — never hardcode hex."
      />

      <section className="mb-10">
        <div className="ds-bar">
          <span className="ds-bar-swatch" />
          <h2 className="ds-h2">ScoreBadge</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge score={90} />
          <ScoreBadge score={74} />
          <ScoreBadge score={42} />
          <ScoreBadge score={57} size="sm" />
          <ScoreBadge score={75} size="sm" showLabel={false} />
        </div>
      </section>

      <section>
        <div className="ds-bar">
          <span className="ds-bar-swatch" />
          <h2 className="ds-h2">.ds-* reference</h2>
        </div>
        <div className="ds-frame flex flex-wrap items-center gap-3 p-4">
          <span className="ds-chip">filter chip</span>
          <span className="ds-chip ds-chip-on">active</span>
          <span className="ds-stat">1,120</span>
        </div>
      </section>
    </main>
  );
}
