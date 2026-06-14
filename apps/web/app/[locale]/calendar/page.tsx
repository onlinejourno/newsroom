import CalendarApp, { type CalEvent, type Beat } from "@/components/calendar/CalendarApp";
import { istToday, toCalendarDate } from "@/lib/calendar";
import { fetchCalendarEvents, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

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
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return <SetupNotice />;

  const todayISO = ymd(istToday())!;
  const rows = await fetchCalendarEvents(tenantId);

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
    <CalendarApp
      events={events}
      beats={[...beatMap.values()]}
      todayISO={todayISO}
      locale={locale}
    />
  );
}
