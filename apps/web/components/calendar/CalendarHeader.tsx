import LiveClock from "./LiveClock";
import { URGENCY_COLOR } from "@/lib/calendar";
import type { CalSummary } from "@/lib/calendar";

export type NextDue = {
  what: string;
  who: string;
  countdown: string;
  overdue: boolean;
};

/** Editorial header for PLAN·Calendar: "Promises ahead." lead, promise-health
 * summary, and the live now-block of the next due promises. Server-rendered;
 * only the clock is client-side. */
export default function CalendarHeader({
  summary,
  nextDue,
  dateLabel,
  city,
}: {
  summary: CalSummary;
  nextDue: NextDue[];
  dateLabel: string;
  city: string;
}) {
  return (
    <header className="mb-8">
      <p className="ds-label mb-2" style={{ color: "var(--color-brand)" }}>
        Calendar · The planning spine
      </p>
      <h1 className="ds-lead mb-3">Promises ahead.</h1>
      <p className="ds-deck">
        {summary.promisesThisWeek} promises this week
        {" · "}
        <span style={{ color: URGENCY_COLOR.high }}>{summary.atRisk} at risk</span>
        {" · "}
        <span>{summary.unassigned} unassigned</span>
        {" · "}
        <span style={{ color: URGENCY_COLOR.elevated }}>{summary.readyToFile} ready to file</span>
      </p>

      <section
        className="mt-6 p-5"
        style={{ background: "var(--color-frame)", color: "var(--color-paper)" }}
      >
        <div className="flex items-baseline gap-3" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="text-3xl font-bold tabular-nums">
            <LiveClock />
          </span>
          <span style={{ opacity: 0.7 }}>IST</span>
          <span style={{ opacity: 0.7 }}>
            · {dateLabel}{city ? ` · ${city}` : ""}
          </span>
        </div>

        {nextDue.length === 0 ? (
          <p className="mt-4" style={{ opacity: 0.7 }}>No open promises due.</p>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {nextDue.map((p, i) => (
              <div key={i}>
                <p className="ds-label" style={{ opacity: 0.6 }}>
                  {i === 0 ? "Next due" : "Then"}
                </p>
                <p className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {p.what}
                </p>
                {p.who && <p className="text-sm" style={{ opacity: 0.7 }}>{p.who}</p>}
                <span
                  className="inline-block mt-1 text-sm font-semibold"
                  style={{ color: p.overdue ? URGENCY_COLOR.overdue : "var(--color-paper)" }}
                >
                  {p.countdown}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </header>
  );
}
