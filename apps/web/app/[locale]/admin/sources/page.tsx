import { listSources } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import { deleteSourceAction, toggleSourceAction } from "./actions";
import SourceForm from "./SourceForm";
import ResponsiveTable from "@/components/ui/ResponsiveTable";

export const dynamic = "force-dynamic";

export default async function SourcesAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await currentTenantId();
  const sources = tenantId ? await listSources(tenantId) : [];

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Admin</p>
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Data sources
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--color-fg-secondary)" }}
        >
          {sources.length} source{sources.length === 1 ? "" : "s"} · add a feed,
          API, MCP pipeline, scrape target, or social handle. Secrets are stored
          as an env reference, never the raw key.
        </p>
      </header>

      {/* ── list ── */}
      <section className="ds-frame mb-10 overflow-x-auto">
        <ResponsiveTable><table className="w-full text-sm">
          <thead>
            <tr
              className="text-left"
              style={{ color: "var(--color-fg-tertiary)" }}
            >
              {["Name", "Family", "Tier", "Type", "Sections", "Status", ""].map(
                (h) => (
                  <th key={h} className="px-3 py-2 font-semibold text-xs">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-3 py-6 text-center"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  No sources yet. Add one below.
                </td>
              </tr>
            )}
            {sources.map((s) => (
              <tr
                key={s.id}
                className="border-t"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2" style={{ color: "var(--color-fg-secondary)" }}>
                  {s.family ?? "—"}
                </td>
                <td className="px-3 py-2">{s.tier ? `T${s.tier}` : "—"}</td>
                <td className="px-3 py-2">
                  <code className="text-xs">{s.kind}</code>
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: "var(--color-fg-secondary)" }}>
                  {s.sections_fed.length ? s.sections_fed.join(", ") : "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className="text-xs font-semibold"
                    style={{
                      color: s.enabled
                        ? "var(--color-ioj-green-600)"
                        : "var(--color-fg-tertiary)",
                    }}
                  >
                    {s.enabled ? "enabled" : "disabled"}
                  </span>
                  {s.consecutive_failures > 0 && (
                    <span
                      className="ml-2 text-xs"
                      style={{ color: "var(--color-amber-600)" }}
                    >
                      ⚠ {s.consecutive_failures}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <form action={toggleSourceAction} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <input
                      type="hidden"
                      name="enabled"
                      value={(!s.enabled).toString()}
                    />
                    <button
                      type="submit"
                      className="text-xs underline mr-3"
                      style={{ color: "var(--color-link)" }}
                    >
                      {s.enabled ? "disable" : "enable"}
                    </button>
                  </form>
                  <form action={deleteSourceAction} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <button
                      type="submit"
                      className="text-xs underline"
                      style={{ color: "var(--color-brand)" }}
                    >
                      delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table></ResponsiveTable>
      </section>

      {/* ── add ── */}
      <section className="ds-frame p-5">
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Add a source
        </h2>
        <SourceForm locale={locale} />
      </section>
    </main>
  );
}
