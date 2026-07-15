import { listSurfaces } from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import { deleteSurfaceAction, toggleSurfaceAction } from "./actions";
import SurfaceForm from "./SurfaceForm";
import ResponsiveTable from "@/components/ui/ResponsiveTable";

export const dynamic = "force-dynamic";

export default async function SurfacesAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await currentTenantId();
  const surfaces = tenantId ? await listSurfaces(tenantId) : [];

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Admin</p>
        <h1
          className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Optimization surfaces
        </h1>
        <p className="text-sm" style={{ color: "var(--color-fg-secondary)" }}>
          {surfaces.length} surface{surfaces.length === 1 ? "" : "s"} the platform
          scores stories for — Discover, Search, News, AI Overviews + generative-AI
          search, Subscription, Direct. Add your own, disable any you don&rsquo;t
          chase. The scorer reads the enabled set (ADR 0043).
        </p>
      </header>

      <section className="ds-frame mb-10 overflow-x-auto">
        <ResponsiveTable><table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={{ color: "var(--color-fg-tertiary)" }}>
              {["Surface", "Category", "Origin", "Status", ""].map((h) => (
                <th key={h} className="px-3 py-2 font-semibold text-xs">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {surfaces.map((s) => (
              <tr
                key={s.id}
                className="border-t"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">
                  <code
                    className="text-xs"
                    style={{
                      color:
                        s.category === "ai"
                          ? "var(--color-brand)"
                          : "var(--color-fg-secondary)",
                    }}
                  >
                    {s.category}
                  </code>
                </td>
                <td className="px-3 py-2 text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
                  {s.built_in ? "built-in" : "custom"}
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
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <form action={toggleSurfaceAction} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="enabled" value={(!s.enabled).toString()} />
                    <button
                      type="submit"
                      className="text-xs underline mr-3"
                      style={{ color: "var(--color-link)" }}
                    >
                      {s.enabled ? "disable" : "enable"}
                    </button>
                  </form>
                  <form action={deleteSurfaceAction} className="inline">
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

      <section className="ds-frame p-5">
        <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
          Add a surface
        </h2>
        <SurfaceForm locale={locale} />
      </section>
    </main>
  );
}
