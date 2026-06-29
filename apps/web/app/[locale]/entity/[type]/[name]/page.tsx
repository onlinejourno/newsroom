import type { Route } from "next";
import { redirect } from "next/navigation";

import { WeightBadge } from "@/components/WeightBadge";
import { getAccount } from "@/lib/auth";
import { entityCoverage, pitchesForEntities } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null): string {
  if (!d) return "unknown";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date(d));
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ locale: string; type: string; name: string }>;
}) {
  const { locale, type, name } = await params;
  const entityType = decodeURIComponent(type);
  const entityName = decodeURIComponent(name);

  const tenantId = await currentTenantId();
  const me = await getAccount();
  if (!tenantId || !me) redirect(`/${locale}/login` as Route);

  const [cov, pitches] = await Promise.all([
    entityCoverage(tenantId!, entityName),
    pitchesForEntities(tenantId!, [entityName]),
  ]);

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2" style={{ fontFamily: "var(--font-ui)" }}>
          OnlineJourno · Entity
        </p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {entityName}
        </h1>
        <p
          className="text-sm uppercase tracking-wide font-semibold"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-tertiary)" }}
        >
          {entityType}
        </p>
      </header>

      {/* Coverage history */}
      <section className="mb-8">
        <h2
          className="text-lg font-bold mb-3"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-secondary)" }}
        >
          Coverage history
        </h2>
        <div className="ds-panel p-4">
          {cov ? (
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
            >
              Covered{" "}
              <strong style={{ color: "var(--color-fg-primary)" }}>
                {cov.appearance_count} {cov.appearance_count === 1 ? "time" : "times"}
              </strong>{" "}
              · last seen{" "}
              <strong style={{ color: "var(--color-fg-primary)" }}>
                {fmtDate(cov.last_seen)}
              </strong>
            </p>
          ) : (
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-tertiary)" }}
            >
              No prior coverage of this entity.
            </p>
          )}
        </div>
      </section>

      {/* Open pitches touching this entity */}
      <section>
        <h2
          className="text-lg font-bold mb-3"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-secondary)" }}
        >
          Reporters pitched on this
        </h2>
        {pitches.length === 0 ? (
          <div className="ds-panel p-4">
            <p
              className="text-sm"
              style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-tertiary)" }}
            >
              No open pitches.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pitches.map((p) => (
              <li key={p.id} className="ds-panel p-4">
                <div
                  className="flex items-start justify-between gap-3"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {p.title}
                  </p>
                  <WeightBadge value={p.pitch_weight} />
                </div>
                {p.pitcher ? (
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-fg-tertiary)" }}
                  >
                    pitched by{" "}
                    <strong style={{ color: "var(--color-fg-secondary)" }}>
                      {p.pitcher}
                    </strong>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
