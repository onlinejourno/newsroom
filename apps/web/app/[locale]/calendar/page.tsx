import CalendarApp, { type CalEvent, type Beat } from "@/components/calendar/CalendarApp";
import CalendarHeader, { type NextDue } from "@/components/calendar/CalendarHeader";
import { istToday, toCalendarDate, classify, deadlineCountdown, calendarSummary } from "@/lib/calendar";
import { fetchCalendarEvents, tenantCity } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { assertWritable, getAccount } from "@/lib/auth";
import { assignableReporters, commissionFromCalendarEvent } from "@/lib/workflow";

export const dynamic = "force-dynamic";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(value: Date | string | null): string | null {
  if (!value) return null;
  const d = toCalendarDate(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hostOf(url: string | null): string {
  if (!url) return "source";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

// Map a topic to a beat id + a stable colour from the design palette.
// Beat → a stable colour from the OJDS harmonized categorical palette.
const BEAT_COLORS: Record<string, string> = {
  politics: "#2b5fb0",
  courts: "#9a6a14",
  legal: "#9a6a14",
  economy: "#2e7d46",
  business: "#d97f0c",
  markets: "#2e7d46",
  infrastructure: "#d97f0c",
  infra: "#d97f0c",
  health: "#c0392b",
  technology: "#8e2c8c",
  science: "#8e2c8c",
  education: "#0e8a7e",
  sport: "#2e7d46",
  governance: "#6f6757",
  defence: "#6f6757",
  environment: "#0e8a7e",
  national: "#2b5fb0",
};
const PALETTE = [
  "#2e7d46", "#2b5fb0", "#c0392b", "#8e2c8c", "#9a6a14", "#0e8a7e", "#6f6757", "#d97f0c",
];

function SetupNotice() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <p className="ds-label">Database is not seeded.</p>
    </main>
  );
}

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await currentTenantId();
  if (!tenantId) return <SetupNotice />;

  const me = await getAccount();
  const canCommission = !!me && ["admin", "editor", "desk"].includes(me.role);

  async function commissionEvent(formData: FormData) {
    "use server";
    const tid = await currentTenantId();
    const who = await getAccount();
    assertWritable(who);
    if (!tid) return;
    // assigneeId is supplied by the T2 reporter selector; null when not chosen.
    const assigneeId = String(formData.get("assigneeId") ?? "").trim() || null;
    await commissionFromCalendarEvent(tid, who, String(formData.get("eventId")), assigneeId);
    redirect(`/${locale}/newslist` as Route);
  }

  const todayISO = ymd(istToday())!;
  const [rows, reporters] = await Promise.all([
    fetchCalendarEvents(tenantId),
    canCommission ? assignableReporters(tenantId) : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const today = istToday();
  const summary = calendarSummary(rows, today);
  const city = await tenantCity(tenantId);
  const nextDue: NextDue[] = rows
    .filter((r) => r.outcome === null && r.target_date !== null)
    .slice(0, 3)
    .map((r) => {
      const t = toCalendarDate(r.target_date!);
      return {
        what: r.what,
        who: r.who ?? "",
        countdown: deadlineCountdown(r.precision, t, today),
        overdue: classify(t, today).status === "past_due",
      };
    });
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date());

  const events: CalEvent[] = rows.map((r) => ({
    id: r.id,
    who: r.who ?? "",
    what: r.what,
    deadline: ymd(r.target_date),
    dateClaimed: ymd(r.date_claimed),
    sourceName: hostOf(r.source_link),
    sourceUrl: r.source_link,
    originalText: r.original_claim_text,
    confidence: typeof r.confidence === "number" ? r.confidence : 0,
    beat: (r.topic ?? "general").toLowerCase().trim(),
    beatLabel: r.topic ?? "General",
    location: null,
    outcome: r.outcome as CalEvent["outcome"],
    leadId: r.lead_id,
    pitchWeight: r.pitch_weight ?? null,
    pitchWhy: r.pitch_why ?? null,
  }));

  // Beats present in the data, each with a colour — drives the beat dropdown.
  const beatMap = new Map<string, Beat>();
  for (const e of events) {
    if (!beatMap.has(e.beat)) {
      beatMap.set(e.beat, {
        id: e.beat,
        label: e.beatLabel,
        color: BEAT_COLORS[e.beat] ?? PALETTE[beatMap.size % PALETTE.length],
      });
    }
  }

  return (
    <main className="min-h-screen max-w-6xl mx-auto p-6 md:p-10">
      <CalendarHeader summary={summary} nextDue={nextDue} dateLabel={dateLabel} city={city} />
      <CalendarApp
        events={events}
        beats={[...beatMap.values()]}
        todayISO={todayISO}
        locale={locale}
        canCommission={canCommission}
        commission={commissionEvent}
        reporters={reporters}
      />
    </main>
  );
}
