import Link from "next/link";

import { listJournalists, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

export default async function JournalistsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const journalists = tenantId ? await listJournalists(tenantId) : [];

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Newsroom</p>
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Journalist directory
        </h1>
        <p className="text-sm" style={{ color: "var(--color-fg-secondary)" }}>
          {journalists.length} correspondent{journalists.length === 1 ? "" : "s"} ·
          who covers what, and where. Signals route to the reporter on the beat.
          (Synthetic test data.)
        </p>
      </header>

      {journalists.length === 0 ? (
        <p style={{ color: "var(--color-fg-tertiary)" }}>
          No journalists yet. Run <code>infra/seeds/seed_test_data.py</code>.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {journalists.map((j) => (
            <div
              key={j.id}
              className="rounded-sm border p-4"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg-card)",
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/${locale}/feed/${j.slug}`}
                  className="text-base font-bold hover:underline"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {j.name}
                </Link>
                <span className="text-xs uppercase tracking-wide" style={{ color: "var(--color-fg-tertiary)" }}>
                  {j.role ?? "reporter"}
                </span>
              </div>
              <div className="text-sm mt-1" style={{ color: "var(--color-fg-secondary)" }}>
                {[j.bureau, j.region].filter(Boolean).join(" · ") || "—"}
              </div>
              {j.beats && j.beats.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {j.beats.map((b) => (
                    <span
                      key={b}
                      className="text-xs px-2 py-0.5 rounded-sm"
                      style={{
                        background: "var(--color-brand-bg)",
                        color: "var(--color-brand)",
                      }}
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
