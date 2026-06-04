import { fetchLatestSignals, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const LIMIT = 20;

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function SignalsPage() {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);

  if (!tenantId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <p className="ds-label mb-2">Setup required</p>
          <h1
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Database is not seeded.
          </h1>
          <p
            className="text-base"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-fg-secondary)",
            }}
          >
            Apply migrations under <code>infra/migrations/</code> and rerun the
            ingest CLI to populate the <code>signals</code> table.
          </p>
        </div>
      </main>
    );
  }

  const signals = await fetchLatestSignals(tenantId, LIMIT);

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-10">
        <p className="ds-label mb-2">OnlineJourno · Signals</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Latest signals
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Tenant: <code>{TENANT_SLUG}</code> · Showing {signals.length} most
          recent items.
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
          No signals yet. Run{" "}
          <code>onlinejourno-ingest collect --tenant self</code> to ingest the
          first ones.
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
              {signal.body_text ? (
                <p
                  className="mt-2 text-base"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-fg-secondary)",
                  }}
                >
                  {signal.body_text.length > 280
                    ? `${signal.body_text.slice(0, 280)}…`
                    : signal.body_text}
                </p>
              ) : null}
              <p
                className="mt-3 text-xs"
                style={{
                  fontFamily: "var(--font-ui)",
                  color: "var(--color-fg-tertiary)",
                }}
              >
                Fetched {formatDate(signal.fetched_at)} · {signal.language}
              </p>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
