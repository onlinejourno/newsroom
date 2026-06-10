import { SignalChips } from "@/components/SignalChips";
import {
  journalistBySlug,
  signalsForJournalist,
  tenantIdForSlug,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const SINCE_HOURS = 100000; // test corpus is sparse; tighten when collect runs on a schedule
const LIMIT = 30;

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function FeedPage({
  params,
}: {
  params: Promise<{ locale: string; journalist: string }>;
}) {
  const { journalist: slug } = await params;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const journalist = tenantId ? await journalistBySlug(tenantId, slug) : null;

  if (!tenantId || !journalist) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <p className="ds-label mb-2">Not found</p>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            No journalist “{slug}”.
          </h1>
        </div>
      </main>
    );
  }

  const signals = await signalsForJournalist(
    tenantId,
    journalist.id,
    SINCE_HOURS,
    LIMIT,
  );

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-10">
        <p className="ds-label mb-2">OnlineJourno · Reporter inflow</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {journalist.name}
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          {[journalist.bureau, journalist.region].filter(Boolean).join(" · ")}
          {journalist.beats?.length
            ? ` · beats: ${journalist.beats.join(", ")}`
            : ""}
          <br />
          {signals.length} signal{signals.length === 1 ? "" : "s"} routed to
          her — matched on beat or place by the Analyse layer.
        </p>
      </header>

      <hr className="ds-rule mb-10" />

      {signals.length === 0 ? (
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Nothing routed yet — collect + enrich more signals, or widen her
          beats/region.
        </p>
      ) : (
        <ol className="space-y-8 list-none">
          {signals.map((signal) => (
            <li key={signal.id}>
              <p className="ds-label mb-1">
                {signal.source_name ?? "Unknown source"} ·{" "}
                {formatDate(signal.published_at)}
              </p>
              <a
                href={signal.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xl md:text-2xl font-bold leading-snug"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--color-fg-primary)",
                }}
              >
                {signal.headline ?? signal.url}
              </a>
              <SignalChips signal={signal} />
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
