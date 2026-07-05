import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ScoreBadge } from "@/components/ui/score-badge";
import { Tabs } from "@/components/ui/tabs";
import { Tag } from "@/components/ui/tag";

export const dynamic = "force-static";

function Bar({ children }: { children: React.ReactNode }) {
  return (
    <div className="ds-bar">
      <span className="ds-bar-swatch" />
      <h2 className="ds-h2">{children}</h2>
    </div>
  );
}

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
        deck="OJDS (ADR 0063) tokens + the shared React primitives. Build on these — never hardcode hex."
      />

      <section className="mb-10">
        <Bar>Button</Bar>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Publish brief</Button>
          <Button variant="secondary">New source</Button>
          <Button variant="ghost" size="sm">Dismiss</Button>
          <Button variant="urgent">Spike story</Button>
          <Button variant="link">Open</Button>
        </div>
      </section>

      <section className="mb-10">
        <Bar>Card</Bar>
        <div className="grid gap-4 md:grid-cols-2">
          <Card eyebrow="Source Monitor" title="Reuters — Politics" action={<Button variant="ghost" size="sm">Open</Button>}>
            12 new items matched your beat in the last hour.
          </Card>
          <Card accent eyebrow="Breaking" title="Cabinet reshuffle" footer={<span className="ds-meta">updated 18:30 IST</span>}>
            Vermilion top rule marks the lead story.
          </Card>
        </div>
      </section>

      <section className="mb-10">
        <Bar>Tag &amp; Badge</Bar>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Tag>Politics</Tag>
          <Tag interactive>Climate</Tag>
          <Tag removable>Embargoed</Tag>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="critical" dot>Breaking</Badge>
          <Badge tone="positive">Ready to file</Badge>
          <Badge tone="warning">At risk</Badge>
          <Badge tone="info">Classified</Badge>
          <Badge tone="neutral">Draft</Badge>
          <Badge tone="ink" solid>Live</Badge>
        </div>
      </section>

      <section className="mb-10">
        <Bar>Tabs</Bar>
        <Tabs
          tabs={[
            { value: "briefs", label: "Briefs", count: 12 },
            { value: "sources", label: "Sources" },
            { value: "calendar", label: "Calendar", count: 3 },
          ]}
        />
      </section>

      <section className="mb-10">
        <Bar>Banner</Bar>
        <div className="flex flex-col gap-3">
          <Banner tone="warning" title="Embargo active">Holds until 06:00 IST tomorrow.</Banner>
          <Banner tone="critical" title="Fact-check failed">Two claims need a second source.</Banner>
          <Banner tone="positive" title="Filed">Brief delivered to the desk.</Banner>
        </div>
      </section>

      <section className="mb-10">
        <Bar>Input</Bar>
        <div className="grid max-w-md gap-3">
          <Input label="Newsroom email" placeholder="you@newsroom.com" />
          <Input label="Headline" error="Headline is required" />
        </div>
      </section>

      <section className="mb-10">
        <Bar>ScoreBadge</Bar>
        <div className="flex flex-wrap items-center gap-3">
          <ScoreBadge score={90} />
          <ScoreBadge score={74} />
          <ScoreBadge score={42} />
          <ScoreBadge score={57} size="sm" />
        </div>
      </section>

      <section>
        <Bar>.ds-* reference</Bar>
        <div className="ds-frame flex flex-wrap items-center gap-3 p-4">
          <span className="ds-chip">filter chip</span>
          <span className="ds-chip ds-chip-on">active</span>
          <span className="ds-stat">1,120</span>
        </div>
      </section>
    </main>
  );
}
