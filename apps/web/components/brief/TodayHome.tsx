import Sparkline from "./Sparkline";
import FramingFingerprintStub from "./FramingFingerprintStub";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { type LeadCard, type NowStat, TONE_COLOR } from "@/lib/brief-today";

const SEV_LABEL = { high: "high", med: "medium", low: "low" } as const;
const ACTION_LABEL = { compose: "✎ Compose brief", analyse: "Open analysis", audit: "Review & re-optimise" } as const;

export default function TodayHome({
  firstName,
  dateLabel,
  city,
  cards,
  stats,
  windowLabel,
  published7d,
}: {
  firstName: string;
  dateLabel: string;
  city: string | null;
  cards: LeadCard[];
  stats: NowStat[];
  windowLabel: string;
  published7d: number[];
}) {
  const high = cards.filter((c) => c.severity === "high").length;
  const pot = cards.filter((c) => c.potential).length;
  return (
    <main className="min-h-screen max-w-5xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">Today · {dateLabel}{city ? ` · ${city}` : ""}</p>
        <h1 className="ds-lead mb-3">Good morning, {firstName}.</h1>
        <p className="ds-deck">
          {high} {high === 1 ? "lead needs" : "leads need"} a decision this morning · {pot} carry strong story potential.
        </p>
      </header>

      <div className="today-grid">
        <section className="leads-col">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="ds-h2">What to chase</h2>
            <span className="ds-meta">ranked by severity &amp; first-mover window</span>
          </div>
          {cards.map((c, i) => (
            <article className="lead-card" key={i}>
              <div className={`lead-card__sev lead-card__sev--${c.severity}`} aria-hidden />
              <div className="lead-card__body">
                <div className="lead-card__top">
                  <span className="lead-card__time">{c.ts}</span>
                  <Tag>{c.beat}</Tag>
                  {c.need && <Tag>{c.need}</Tag>}
                  {c.potential && <Badge tone="critical" dot>Story potential</Badge>}
                </div>
                <h3 className="lead-card__hl">{c.headline}</h3>
                {c.why && <p className="lead-card__why">{c.why}</p>}
                <div className="lead-card__actions">
                  <span className="act-btn act-btn--primary">{ACTION_LABEL[c.action]}</span>
                  <span className="lead-card__src">{c.sources} {c.sources === 1 ? "source" : "sources"} in · severity {SEV_LABEL[c.severity]}</span>
                </div>
              </div>
            </article>
          ))}
          {cards.length === 0 && <p className="empty-note">No open leads — inflow is quiet.</p>}
        </section>

        <aside className="today-side">
          <Card eyebrow="The newsroom now" action={<span className="ds-meta">{windowLabel}</span>} className="mb-4">
            <div className="now-stats">
              {stats.map((s) => (
                <div className="now-stat" key={s.key}>
                  <span className="now-stat__label">
                    <span className="now-stat__dot" style={{ background: TONE_COLOR[s.tone] }} />
                    {s.label}
                  </span>
                  <span className="now-stat__n">{s.n}</span>
                </div>
              ))}
            </div>
            <div className="now-foot">
              <span className="ds-meta">Stories · last 7 days</span>
              <Sparkline data={published7d} />
            </div>
          </Card>
          <FramingFingerprintStub />
        </aside>
      </div>
    </main>
  );
}
