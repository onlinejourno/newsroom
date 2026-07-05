import { redirect } from "next/navigation";
import type { Route } from "next";

import { getAccount } from "@/lib/auth";
import { enabledSurfaceKeys } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import { getOrRunSeoAudit } from "@/lib/seoAudit";
import { AuditView } from "@/components/scores/seo-audit/AuditView";

export const dynamic = "force-dynamic";

const DEFAULT_SURFACES = ["discover", "google_news", "google_search"];

const USER_NEEDS: { value: string; label: string }[] = [
  { value: "update_me",          label: "Update me — keep me current on a topic" },
  { value: "keep_me_on_trend",   label: "Keep me on trend — what's big right now" },
  { value: "give_me_perspective", label: "Give me perspective — analysis / opinion" },
  { value: "educate_me",         label: "Educate me — explainer / deep dive" },
  { value: "divert_me",          label: "Divert me — lighter / entertainment" },
  { value: "inspire_me",         label: "Inspire me — human interest / uplifting" },
];

export default async function StoryAnalyserPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ url?: string; need?: string }>;
}) {
  const { locale } = await params;
  const me = await getAccount();
  if (!me) redirect(`/${locale}/login` as Route);

  const { url, need } = await searchParams;

  const tenantId = await currentTenantId();

  // Run the audit when a URL is present.
  let audit = null;
  if (url && tenantId) {
    const surfaceKeys = await enabledSurfaceKeys(tenantId);
    const surfaces = surfaceKeys.length ? surfaceKeys : DEFAULT_SURFACES;
    audit = await getOrRunSeoAudit(tenantId, url, {
      surfaces,
      need: need || undefined,
    });
  }

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Story Analyser</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Story Analyser
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Paste any published story URL to run the full SEO + E-E-A-T audit:
          channel scores (Discover, Google News, Search, AIO), SQEG quality
          signals, the SEJ periodic table, recirculation, and Core Web Vitals.
          Use the user-need filter to see how the story performs for a specific
          reader intent — useful for digital journalists rethinking angles or
          headline optimisation.
        </p>
      </header>

      {/* ── Audit form (plain GET — simplest; page runs the audit on load) ── */}
      <form
        method="get"
        className="ds-frame p-5 mb-8"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Paste a story URL to audit</span>
            <input
              type="url"
              name="url"
              defaultValue={url ?? ""}
              placeholder="https://example.com/your-article"
              required
              className="border px-3 py-2 text-sm w-full"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-bg)",
                fontFamily: "var(--font-ui)",
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ds-label">User need (optional)</span>
            <select
              name="need"
              defaultValue={need ?? ""}
              className="border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-bg)",
              }}
            >
              <option value="">— any need —</option>
              {USER_NEEDS.map((n) => (
                <option key={n.value} value={n.value}>
                  {n.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3 items-center flex-wrap">
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold"
              style={{ background: "var(--color-brand)", color: "white" }}
            >
              Run audit
            </button>
            {url && (
              <a
                href="?"
                className="text-sm underline"
                style={{ color: "var(--color-fg-tertiary)" }}
              >
                Clear
              </a>
            )}
          </div>
        </div>
      </form>

      {/* ── Audit result ── */}
      {audit && <AuditView audit={audit} />}
    </main>
  );
}
