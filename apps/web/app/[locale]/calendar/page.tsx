import CalendarApp, { type CalEvent, type Beat } from "@/components/calendar/CalendarApp";
import CalendarHeader, { type NextDue } from "@/components/calendar/CalendarHeader";
import { istToday, toCalendarDate, classify, deadlineCountdown, calendarSummary } from "@/lib/calendar";
import { fetchCalendarEvents, tenantCity } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";

import type { Route } from "next";
import { redirect } from "next/navigation";

import { getAccount } from "@/lib/auth";
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
const BEAT_COLORS: Record<string, string> = {
  politics: "#2B3D8F",
  courts: "#7a4f00",
  legal: "#7a4f00",
  economy: "#2D7A4F",
  business: "#7a4f00",
  markets: "#2D7A4F",
  infrastructure: "#b35d00",
  infra: "#b35d00",
  health: "#b01e1e",
  technology: "#3a3a8a",
  science: "#3a3a8a",
  education: "#5a4b9a",
  sport: "#2a6e2a",
  governance: "#3a3a8a",
  defence: "#4d4d4d",
  environment: "#2a6e2a",
  national: "#2B3D8F",
};
const PALETTE = [
  "#2B3D8F", "#2D7A4F", "#b35d00", "#b01e1e", "#5a4b9a", "#3a3a8a", "#2a6e2a", "#7a4f00",
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
    if (!tid || !who) return;
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
